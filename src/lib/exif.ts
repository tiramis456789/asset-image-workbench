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

  let changed = true;
  while (changed && value.length > 1) {
    changed = false;
    for (const [open, close] of WRAPPING_PAIRS) {
      if (value.startsWith(open) && value.endsWith(close)) {
        value = value.slice(1, -1).trim();
        changed = true;
      }
    }
  }

  value = value.replace(/^[()[\]{}]+/, '').replace(/[()[\]{}]+$/, '').trim();

  return value.trim();
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

function parsePngTextChunks(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const metadata: Record<string, string> = {};

  if (!PNG_SIGNATURE.every((value, index) => bytes[index] === value)) {
    return metadata;
  }

  let offset = PNG_SIGNATURE.length;
  while (offset + 8 <= bytes.length) {
    const length = new DataView(buffer, offset, 4).getUint32(0);
    const type = decodeText(bytes.slice(offset + 4, offset + 8));
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (dataEnd > bytes.length) break;

    const chunk = bytes.slice(dataStart, dataEnd);
    if (type === 'tEXt') {
      const separator = chunk.indexOf(0);
      if (separator > 0) {
        const key = decodeText(chunk.slice(0, separator));
        const value = decodeText(chunk.slice(separator + 1));
        metadata[key] = value;
      }
    }

    if (type === 'iTXt') {
      const keyEnd = chunk.indexOf(0);
      if (keyEnd > 0) {
        const key = decodeText(chunk.slice(0, keyEnd));
        let cursor = keyEnd + 1;
        const compressionFlag = chunk[cursor];
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

    offset = dataEnd + 4;
    if (type === 'IEND') break;
  }

  return metadata;
}

async function loadImageData(file: File) {
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('이미지를 읽을 수 없습니다.'));
      img.src = url;
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

async function extractStealthInfo(file: File) {
  const pixels = await loadImageData(file);
  if (!pixels) return null;

  let binaryData = '';
  let bufferA = '';
  let bufferRgb = '';
  let indexA = 0;
  let indexRgb = 0;
  let compressed = false;
  let mode: 'alpha' | 'rgb' | null = null;
  let signatureConfirmed = false;
  let confirmingSignature = true;
  let readingParamLength = false;
  let readingParam = false;
  let readEnd = false;
  let paramLength = 0;

  for (let index = 0; index < pixels.length; index += 4) {
    const r = pixels[index];
    const g = pixels[index + 1];
    const b = pixels[index + 2];
    const a = pixels[index + 3];

    bufferA += String(a & 1);
    indexA += 1;

    bufferRgb += String(r & 1);
    bufferRgb += String(g & 1);
    bufferRgb += String(b & 1);
    indexRgb += 3;

    if (confirmingSignature) {
      if (indexA === 'stealth_pnginfo'.length * 8) {
        const decoded = decodeBinary(bufferA);
        if (decoded === 'stealth_pnginfo' || decoded === 'stealth_pngcomp') {
          confirmingSignature = false;
          signatureConfirmed = true;
          readingParamLength = true;
          mode = 'alpha';
          compressed = decoded === 'stealth_pngcomp';
          bufferA = '';
          indexA = 0;
        }
      }

      if (confirmingSignature && indexRgb === 'stealth_pnginfo'.length * 8) {
        const decoded = decodeBinary(bufferRgb);
        if (decoded === 'stealth_rgbinfo' || decoded === 'stealth_rgbcomp') {
          confirmingSignature = false;
          signatureConfirmed = true;
          readingParamLength = true;
          mode = 'rgb';
          compressed = decoded === 'stealth_rgbcomp';
          bufferRgb = '';
          indexRgb = 0;
        } else {
          readEnd = true;
        }
      }
    } else if (readingParamLength) {
      if (mode === 'alpha' && indexA === 32) {
        paramLength = Number.parseInt(bufferA, 2);
        readingParamLength = false;
        readingParam = true;
        bufferA = '';
        indexA = 0;
      }

      if (mode === 'rgb' && indexRgb === 33) {
        const carry = bufferRgb.at(-1) ?? '';
        paramLength = Number.parseInt(bufferRgb.slice(0, -1), 2);
        readingParamLength = false;
        readingParam = true;
        bufferRgb = carry;
        indexRgb = carry ? 1 : 0;
      }
    } else if (readingParam) {
      if (mode === 'alpha' && indexA === paramLength) {
        binaryData = bufferA;
        readEnd = true;
      }

      if (mode === 'rgb' && indexRgb >= paramLength) {
        binaryData = bufferRgb.slice(0, paramLength);
        readEnd = true;
      }
    }

    if (readEnd) break;
  }

  if (!signatureConfirmed || !binaryData) return null;

  const byteArray = new Uint8Array(binaryData.match(/.{1,8}/g)?.map((chunk) => Number.parseInt(chunk, 2)) ?? []);

  try {
    if (compressed && 'DecompressionStream' in window) {
      const stream = new Response(new Blob([byteArray]).stream().pipeThrough(new DecompressionStream('gzip')));
      return await stream.text();
    }

    return decodeText(byteArray);
  } catch {
    return decodeText(byteArray);
  }
}

function decodeBinary(binary: string) {
  const bytes = binary.match(/.{1,8}/g)?.map((chunk) => Number.parseInt(chunk, 2)) ?? [];
  return decodeText(new Uint8Array(bytes));
}

function extractCharacterPrompts(input: Record<string, unknown>) {
  const results: string[] = [];
  const collect = (value: unknown) => {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) {
      value.forEach(collect);
      return;
    }

    if ('char_caption' in value && typeof (value as { char_caption?: unknown }).char_caption === 'string') {
      const caption = normalizePromptText((value as { char_caption: string }).char_caption || '');
      if (caption) results.push(caption);
    }

    Object.values(value).forEach(collect);
  };

  collect(input.v4_prompt);
  collect(input.v4_negative_prompt);
  return Array.from(new Set(results));
}

function normalizePayload(input: Record<string, unknown>, source: string, rawComment?: string): ParsedExifPayload {
  const prompt = normalizePromptText(String(input.prompt ?? ''));
  const negativePrompt = normalizePromptText(String(input.uc ?? input.negative_prompt ?? ''));
  const characterPrompts = extractCharacterPrompts(input);
  const option: Record<string, string | number> = {};
  const etc: Record<string, string | number> = {};

  for (const [rawKey, rawValue] of Object.entries(input)) {
    if (rawValue == null || rawKey === 'prompt' || rawKey === 'uc' || rawKey === 'negative_prompt') continue;
    const key = OPTION_KEY_MAPPING[rawKey] ?? rawKey;
    if (TARGET_OPTION_KEYS.has(rawKey.toLowerCase()) || TARGET_OPTION_KEYS.has(key.toLowerCase())) {
      option[key] = normalizeScalar(rawValue);
    } else {
      etc[key] = normalizeScalar(rawValue);
    }
  }

  return { prompt, negativePrompt, characterPrompts, option, etc, source, rawComment };
}

function normalizeScalar(value: unknown) {
  if (typeof value === 'number' || typeof value === 'string') return value;
  return JSON.stringify(value);
}

function parseWebUiParameters(parameters: string) {
  const lines = parameters.split(/\r?\n/);
  if (lines.length === 0) return null;

  const negativeIndex = lines.findIndex((line) => line.trim().startsWith('Negative prompt:'));
  const prompt = negativeIndex > 0 ? lines.slice(0, negativeIndex).join('\n').trim() : lines.join('\n').trim();
  const negativePrompt = negativeIndex >= 0 ? lines[negativeIndex].replace(/^Negative prompt:\s*/i, '').trim() : '';
  const optionLines = negativeIndex >= 0 ? lines.slice(negativeIndex + 1) : [];
  const payload: Record<string, unknown> = {
    prompt,
    negative_prompt: negativePrompt,
  };

  for (const line of optionLines) {
    for (const part of line.split(',')) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      if (!trimmed.includes(':')) {
        payload[trimmed] = '';
        continue;
      }

      const [rawKey, ...rest] = trimmed.split(':');
      const key = rawKey.trim();
      const rawValue = rest.join(':').trim();
      payload[key] = parseScalar(rawValue);
    }
  }

  return normalizePayload(payload, 'WebUI parameters');
}

function parseScalar(value: string) {
  if (/^-?\d+$/.test(value)) return Number.parseInt(value, 10);
  if (/^-?\d+\.\d+$/.test(value)) return Number.parseFloat(value);
  return value;
}

function parseCandidate(value: string, source: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    if (typeof parsed.Comment === 'string') {
      try {
        return normalizePayload(JSON.parse(parsed.Comment) as Record<string, unknown>, `${source} / Comment`, parsed.Comment);
      } catch {
        return null;
      }
    }

    if (typeof parsed.parameters === 'string') {
      return parseWebUiParameters(parsed.parameters);
    }

    if ('prompt' in parsed || 'uc' in parsed || 'negative_prompt' in parsed) {
      return normalizePayload(parsed, source);
    }
  } catch {
    return parseWebUiParameters(trimmed);
  }

  return null;
}

export async function inspectImageExif(file: File): Promise<ExifInspectionResult> {
  const buffer = await file.arrayBuffer();
  const metadata = file.type === 'image/png' ? parsePngTextChunks(buffer) : {};
  const rawSources: Array<{ label: string; value: string }> = [];

  const preferredMetadataKeys = ['Comment', 'Description', 'Source', 'Title', 'Software', 'Generation_time'];
  for (const key of preferredMetadataKeys) {
    const value = metadata[key];
    if (typeof value === 'string' && value.length > 0) {
      rawSources.push({ label: `PNG ${key}`, value });
    }
  }

  for (const [key, value] of Object.entries(metadata)) {
    if (preferredMetadataKeys.includes(key)) continue;
    rawSources.push({ label: `PNG ${key}`, value });
  }

  const stealth = await extractStealthInfo(file);
  if (stealth) {
    rawSources.unshift({ label: 'Stealth metadata', value: stealth });
  }

  const parsed =
    rawSources
      .map((entry) => parseCandidate(entry.value, entry.label))
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

function inferFormat(name: string) {
  const extension = name.split('.').pop()?.toLowerCase();
  return extension ? `image/${extension}` : 'unknown';
}
