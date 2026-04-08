export interface ParsedExifPayload {
  prompt: string;
  negativePrompt: string;
  characterPrompts: string[];
  option: Record<string, string | number>;
  etc: Record<string, string | number>;
  source: string;
  rawComment?: string;
}

export interface ExifInspectionResult {
  format: string;
  metadata: Record<string, string>;
  rawSources: Array<{
    label: string;
    value: string;
  }>;
  parsed: ParsedExifPayload | null;
  message: string;
}

const PNG_SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
const METADATA_PRIORITY = ['Comment', 'Description', 'Source', 'Title', 'Software', 'Generation_time'];
const STEALTH_TEXT_HEADERS = new Map<string, { mode: 'alpha' | 'rgb'; compressed: boolean }>([
  ['stealth_pnginfo', { mode: 'alpha', compressed: false }],
  ['stealth_pngcomp', { mode: 'alpha', compressed: true }],
  ['stealth_rgbinfo', { mode: 'rgb', compressed: false }],
  ['stealth_rgbcomp', { mode: 'rgb', compressed: true }],
]);
const TARGET_OPTION_KEYS = new Set(
  [
    'steps',
    'height',
    'width',
    'scale',
    'seed',
    'sampler',
    'n_samples',
    'sm',
    'sm_dyn',
    'cfg scale',
    'cfg_scale',
    'clip skip',
    'clip_skip',
    'schedule type',
    'schedule_type',
    'size',
    'model',
    'model hash',
    'model_hash',
    'denoising strength',
    'denoising_strength',
  ].map((key) => key.toLowerCase())
);
const OPTION_KEY_MAPPING: Record<string, string> = {
  'cfg scale': 'scale',
  cfg_scale: 'scale',
  'clip skip': 'clip_skip',
  clip_skip: 'clip_skip',
  'schedule type': 'schedule_type',
  schedule_type: 'schedule_type',
  'model hash': 'model_hash',
  model_hash: 'model_hash',
  'denoising strength': 'denoising_strength',
  denoising_strength: 'denoising_strength',
};
const WRAPPING_PAIRS: Array<[string, string]> = [
  ['[', ']'],
  ['{', '}'],
  ['(', ')'],
];

export function normalizePromptTag(tag: string) {
  let value = tag.trim();
  if (!value) return '';

  value = value.replace(/^\|\|[\s\S]*?\|\|\s*::\s*([\s\S]*?)\s*::$/, '$1').trim();
  value = value.replace(/^\|\|[\s\S]*?\|\|\s*::\s*([\s\S]+)$/, '$1').trim();
  value = value.replace(/^\|\|[\s\S]*?\|\|\s*:\s*([\s\S]*?)\s*::$/, '$1').trim();
  value = value.replace(/^[+-]?\d+(?:\.\d+)?::\s*/, '').trim();
  value = value.replace(/^::/, '').replace(/::$/, '').trim();

  let shouldUnwrap = true;
  while (shouldUnwrap && value.length > 1) {
    shouldUnwrap = false;
    for (const [open, close] of WRAPPING_PAIRS) {
      if (value.startsWith(open) && value.endsWith(close)) {
        value = value.slice(1, -1).trim();
        shouldUnwrap = true;
      }
    }
  }

  return value.replace(/^[()[\]{}]+/, '').replace(/[()[\]{}]+$/, '').trim();
}

export function normalizePromptTags(input: string) {
  return input
    .split(',')
    .map((tag) => normalizePromptTag(tag))
    .filter(Boolean);
}

export function normalizePromptText(input: string) {
  return normalizePromptTags(input).join(', ');
}

function decodeText(bytes: Uint8Array) {
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
}

function encodeBytesToText(binary: string) {
  const chunks = binary.match(/.{1,8}/g) ?? [];
  return decodeText(new Uint8Array(chunks.map((chunk) => Number.parseInt(chunk, 2))));
}

function readUint32(binary: string) {
  return Number.parseInt(binary, 2);
}

function normalizeScalar(value: unknown) {
  if (typeof value === 'number' || typeof value === 'string') return value;
  return JSON.stringify(value);
}

function parseScalar(value: string) {
  if (/^-?\d+$/.test(value)) return Number.parseInt(value, 10);
  if (/^-?\d+\.\d+$/.test(value)) return Number.parseFloat(value);
  return value;
}

function parsePngTextMetadata(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  if (bytes.length < PNG_SIGNATURE.length || !PNG_SIGNATURE.every((value, index) => bytes[index] === value)) {
    return {};
  }

  const metadata: Record<string, string> = {};
  let offset = PNG_SIGNATURE.length;

  while (offset + 8 <= bytes.length) {
    const view = new DataView(buffer, offset, 4);
    const chunkLength = view.getUint32(0);
    const chunkType = decodeText(bytes.slice(offset + 4, offset + 8));
    const chunkStart = offset + 8;
    const chunkEnd = chunkStart + chunkLength;
    if (chunkEnd > bytes.length) break;

    const chunk = bytes.slice(chunkStart, chunkEnd);
    if (chunkType === 'tEXt') {
      const separatorIndex = chunk.indexOf(0);
      if (separatorIndex > 0) {
        metadata[decodeText(chunk.slice(0, separatorIndex))] = decodeText(chunk.slice(separatorIndex + 1));
      }
    } else if (chunkType === 'iTXt') {
      const separatorIndex = chunk.indexOf(0);
      if (separatorIndex > 0) {
        const key = decodeText(chunk.slice(0, separatorIndex));
        let cursor = separatorIndex + 1;
        const compressionFlag = chunk[cursor] ?? 0;
        cursor += 2;

        while (cursor < chunk.length && chunk[cursor] !== 0) cursor += 1;
        cursor += 1;
        while (cursor < chunk.length && chunk[cursor] !== 0) cursor += 1;
        cursor += 1;

        if (compressionFlag === 0 && cursor <= chunk.length) {
          metadata[key] = decodeText(chunk.slice(cursor));
        }
      }
    }

    offset = chunkEnd + 4;
    if (chunkType === 'IEND') break;
  }

  return metadata;
}

async function readImagePixels(file: File) {
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('이미지를 읽을 수 없습니다.'));
      element.src = url;
    });

    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth || image.width;
    canvas.height = image.naturalHeight || image.height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return null;

    context.drawImage(image, 0, 0);
    return context.getImageData(0, 0, canvas.width, canvas.height).data;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function* alphaLeastSignificantBits(pixels: Uint8ClampedArray) {
  for (let index = 3; index < pixels.length; index += 4) {
    yield String(pixels[index] & 1);
  }
}

function* rgbLeastSignificantBits(pixels: Uint8ClampedArray) {
  for (let index = 0; index < pixels.length; index += 4) {
    yield String(pixels[index] & 1);
    yield String(pixels[index + 1] & 1);
    yield String(pixels[index + 2] & 1);
  }
}

class BitStreamReader {
  private readonly iterator: Generator<string, void, unknown>;
  private pending = '';

  constructor(iterator: Generator<string, void, unknown>) {
    this.iterator = iterator;
  }

  readBits(count: number) {
    while (this.pending.length < count) {
      const next = this.iterator.next();
      if (next.done) return null;
      this.pending += next.value;
    }

    const result = this.pending.slice(0, count);
    this.pending = this.pending.slice(count);
    return result;
  }

  readText(byteLength: number) {
    const binary = this.readBits(byteLength * 8);
    return binary == null ? null : encodeBytesToText(binary);
  }
}

async function inflateGzip(bytes: Uint8Array) {
  if (!('DecompressionStream' in window)) {
    return decodeText(bytes);
  }

  const stream = new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')));
  return stream.text();
}

async function decodeStealthPayload(binary: string, compressed: boolean) {
  const bytes = new Uint8Array((binary.match(/.{1,8}/g) ?? []).map((chunk) => Number.parseInt(chunk, 2)));
  if (!compressed) return decodeText(bytes);

  try {
    return await inflateGzip(bytes);
  } catch {
    return decodeText(bytes);
  }
}

async function extractStealthMetadata(file: File) {
  const pixels = await readImagePixels(file);
  if (!pixels) return null;

  for (const reader of [new BitStreamReader(alphaLeastSignificantBits(pixels)), new BitStreamReader(rgbLeastSignificantBits(pixels))]) {
    const header = reader.readText('stealth_pnginfo'.length);
    if (!header) continue;

    const descriptor = STEALTH_TEXT_HEADERS.get(header);
    if (!descriptor) continue;

    const payloadLengthBits = reader.readBits(32);
    if (!payloadLengthBits) continue;

    const payloadLength = readUint32(payloadLengthBits);
    if (!Number.isFinite(payloadLength) || payloadLength <= 0) continue;

    const payloadBits = reader.readBits(payloadLength);
    if (!payloadBits) continue;

    return decodeStealthPayload(payloadBits, descriptor.compressed);
  }

  return null;
}

function collectRawSources(metadata: Record<string, string>, stealth: string | null) {
  const rawSources: Array<{ label: string; value: string }> = [];

  if (stealth) {
    rawSources.push({ label: 'Stealth metadata', value: stealth });
  }

  for (const key of METADATA_PRIORITY) {
    const value = metadata[key];
    if (typeof value === 'string' && value.length > 0) {
      rawSources.push({ label: `PNG ${key}`, value });
    }
  }

  for (const [key, value] of Object.entries(metadata)) {
    if (METADATA_PRIORITY.includes(key)) continue;
    rawSources.push({ label: `PNG ${key}`, value });
  }

  return rawSources;
}

function collectCharacterPrompts(input: Record<string, unknown>) {
  const prompts = new Set<string>();

  const visit = (value: unknown): void => {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }

    const record = value as Record<string, unknown>;
    if (typeof record.char_caption === 'string') {
      const normalized = normalizePromptText(record.char_caption);
      if (normalized) prompts.add(normalized);
    }

    Object.values(record).forEach(visit);
  };

  visit(input.v4_prompt);
  visit(input.v4_negative_prompt);
  return Array.from(prompts);
}

function splitParsedFields(input: Record<string, unknown>) {
  const option: Record<string, string | number> = {};
  const etc: Record<string, string | number> = {};

  for (const [rawKey, rawValue] of Object.entries(input)) {
    if (rawValue == null || rawKey === 'prompt' || rawKey === 'uc' || rawKey === 'negative_prompt') continue;
    const normalizedKey = OPTION_KEY_MAPPING[rawKey] ?? rawKey;
    const target = TARGET_OPTION_KEYS.has(rawKey.toLowerCase()) || TARGET_OPTION_KEYS.has(normalizedKey.toLowerCase()) ? option : etc;
    target[normalizedKey] = normalizeScalar(rawValue);
  }

  return { option, etc };
}

function buildParsedPayload(input: Record<string, unknown>, source: string, rawComment?: string): ParsedExifPayload {
  const { option, etc } = splitParsedFields(input);
  return {
    prompt: normalizePromptText(String(input.prompt ?? '')),
    negativePrompt: normalizePromptText(String(input.uc ?? input.negative_prompt ?? '')),
    characterPrompts: collectCharacterPrompts(input),
    option,
    etc,
    source,
    rawComment,
  };
}

function parseParametersBlock(parameters: string) {
  const lines = parameters.split(/\r?\n/);
  if (lines.length === 0) return null;

  const negativePromptIndex = lines.findIndex((line) => line.trim().startsWith('Negative prompt:'));
  const promptLines = negativePromptIndex >= 0 ? lines.slice(0, negativePromptIndex) : lines;
  const optionLines = negativePromptIndex >= 0 ? lines.slice(negativePromptIndex + 1) : [];
  const negativePrompt =
    negativePromptIndex >= 0 ? lines[negativePromptIndex].replace(/^Negative prompt:\s*/i, '').trim() : '';

  const payload: Record<string, unknown> = {
    prompt: promptLines.join('\n').trim(),
    negative_prompt: negativePrompt,
  };

  for (const line of optionLines) {
    const segments = line.split(',');
    for (const segment of segments) {
      const trimmed = segment.trim();
      if (!trimmed) continue;
      if (!trimmed.includes(':')) {
        payload[trimmed] = '';
        continue;
      }

      const [key, ...rest] = trimmed.split(':');
      payload[key.trim()] = parseScalar(rest.join(':').trim());
    }
  }

  return buildParsedPayload(payload, 'WebUI parameters');
}

function parseJsonCandidate(parsed: Record<string, unknown>, source: string) {
  if (typeof parsed.Comment === 'string') {
    try {
      return buildParsedPayload(JSON.parse(parsed.Comment) as Record<string, unknown>, `${source} / Comment`, parsed.Comment);
    } catch {
      return null;
    }
  }

  if (typeof parsed.parameters === 'string') {
    return parseParametersBlock(parsed.parameters);
  }

  if ('prompt' in parsed || 'uc' in parsed || 'negative_prompt' in parsed) {
    return buildParsedPayload(parsed, source);
  }

  return null;
}

function parseSourceValue(source: { label: string; value: string }) {
  const trimmed = source.value.trim();
  if (!trimmed) return null;

  try {
    return parseJsonCandidate(JSON.parse(trimmed) as Record<string, unknown>, source.label);
  } catch {
    return parseParametersBlock(trimmed);
  }
}

function inferFormat(name: string) {
  const extension = name.split('.').pop()?.toLowerCase();
  return extension ? `image/${extension}` : 'unknown';
}

export async function inspectImageExif(file: File): Promise<ExifInspectionResult> {
  const buffer = await file.arrayBuffer();
  const metadata = file.type === 'image/png' ? parsePngTextMetadata(buffer) : {};
  const stealth = await extractStealthMetadata(file);
  const rawSources = collectRawSources(metadata, stealth);
  const parsed = rawSources
    .map((source) => parseSourceValue(source))
    .find((entry) => entry !== null && (entry.prompt.length > 0 || entry.characterPrompts.length > 0)) ?? null;

  return {
    format: file.type || inferFormat(file.name),
    metadata,
    rawSources,
    parsed,
    message:
      rawSources.length > 0
        ? '메타데이터를 읽었습니다.'
        : '읽을 수 있는 PNG 텍스트 청크나 스텔스 메타데이터를 찾지 못했습니다.',
  };
}
