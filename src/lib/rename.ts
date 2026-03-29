export type RenamePreset = 'spaces_to_underscores' | 'name_outfit_emotion' | 'name_emotion';
export type BulkReplaceRule = { from: string; to: string };

export function getPathKey(folderPath: string, name: string) {
  return `${folderPath.toLocaleLowerCase()}/${name.toLocaleLowerCase()}`;
}

export function splitNameParts(name: string) {
  const dot = name.lastIndexOf('.');
  return dot <= 0 || dot === name.length - 1
    ? { base: name, extension: '' }
    : { base: name.slice(0, dot), extension: name.slice(dot) };
}

export function normalizeImageName(input: string, fallback: string) {
  const trimmed = input.trim();
  if (!trimmed) return fallback;

  const fallbackParts = splitNameParts(fallback);
  const nextParts = splitNameParts(trimmed);
  return !nextParts.extension && fallbackParts.extension ? `${trimmed}${fallbackParts.extension}` : trimmed;
}

export function applyRenamePresetToName(name: string, preset: RenamePreset, separator = '_') {
  const { base, extension } = splitNameParts(name);
  const words = base
    .trim()
    .split(/[\s_]+/)
    .map((word) => word.trim())
    .filter(Boolean);

  if (preset === 'spaces_to_underscores') {
    if (!words.length) return name;

    const hasUnderscore = base.includes('_');
    const hasWhitespace = /\s/.test(base);
    const nextSeparator = hasUnderscore && !hasWhitespace ? ' ' : '_';
    return `${words.join(nextSeparator)}${extension}`;
  }

  if (preset === 'name_outfit_emotion') {
    if (words.length < 3) return name;
    return `${words.slice(0, -2).join(separator)}${separator}${words.at(-2)!}${separator}${words.at(-1)!}${extension}`;
  }

  if (words.length < 2) return name;
  return `${words.slice(0, -1).join(separator)}${separator}${words.at(-1)!}${extension}`;
}

export function parseBulkReplaceRules(input: string) {
  const rules: BulkReplaceRule[] = [];
  const invalidLines: number[] = [];

  input.split(/\r?\n/).forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    const match = trimmed.match(/^(.*?)\s*(->|→)\s*(.*?)$/);
    if (!match) {
      invalidLines.push(index + 1);
      return;
    }

    const from = match[1].trim();
    const to = match[3].trim();
    if (!from) {
      invalidLines.push(index + 1);
      return;
    }

    rules.push({ from, to });
  });

  return { rules, invalidLines };
}

export function applyBulkReplaceRules(name: string, rules: BulkReplaceRule[]) {
  return rules.reduce((currentName, rule) => currentName.split(rule.from).join(rule.to), name);
}
