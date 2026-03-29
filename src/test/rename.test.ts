import { describe, expect, it } from 'vitest';

import { applyBulkReplaceRules, applyRenamePresetToName, getPathKey, normalizeImageName, parseBulkReplaceRules, splitNameParts } from '@/lib/rename';

describe('rename utilities', () => {
  describe('splitNameParts', () => {
    it('splits a normal file name into base and extension', () => {
      expect(splitNameParts('sample-image.png')).toEqual({
        base: 'sample-image',
        extension: '.png',
      });
    });

    it('keeps extension empty when the name has no usable suffix', () => {
      expect(splitNameParts('README')).toEqual({
        base: 'README',
        extension: '',
      });
      expect(splitNameParts('archive.')).toEqual({
        base: 'archive.',
        extension: '',
      });
    });
  });

  describe('normalizeImageName', () => {
    it('restores the original extension when the next name omits it', () => {
      expect(normalizeImageName('renamed-file', 'origin.webp')).toBe('renamed-file.webp');
    });

    it('returns the fallback when the input is blank', () => {
      expect(normalizeImageName('   ', 'origin.webp')).toBe('origin.webp');
    });

    it('keeps an explicitly provided extension', () => {
      expect(normalizeImageName('renamed.jpg', 'origin.webp')).toBe('renamed.jpg');
    });
  });

  describe('applyRenamePresetToName', () => {
    it('converts spaces to underscores', () => {
      expect(applyRenamePresetToName('Alice blue dress.png', 'spaces_to_underscores')).toBe('Alice_blue_dress.png');
    });

    it('toggles underscores back to spaces when there is no whitespace', () => {
      expect(applyRenamePresetToName('Alice_blue_dress.png', 'spaces_to_underscores')).toBe('Alice blue dress.png');
    });

    it('builds name_outfit_emotion with a custom separator', () => {
      expect(applyRenamePresetToName('Alice armor angry.png', 'name_outfit_emotion', '-')).toBe('Alice-armor-angry.png');
    });

    it('builds name_emotion and preserves short names', () => {
      expect(applyRenamePresetToName('Alice angry.png', 'name_emotion')).toBe('Alice_angry.png');
      expect(applyRenamePresetToName('Alice.png', 'name_emotion')).toBe('Alice.png');
    });
  });

  describe('getPathKey', () => {
    it('normalizes folder path and file name for conflict checks', () => {
      expect(getPathKey('Folder/Sub', 'Image.PNG')).toBe('folder/sub/image.png');
    });
  });

  describe('bulk replace rules', () => {
    it('parses arrow-based rules and skips blank lines', () => {
      expect(parseBulkReplaceRules('acting coy -> coy\n\nhappy smile -> happysmile')).toEqual({
        rules: [
          { from: 'acting coy', to: 'coy' },
          { from: 'happy smile', to: 'happysmile' },
        ],
        invalidLines: [],
      });
    });

    it('accepts unicode arrows used in pasted rule lists', () => {
      expect(parseBulkReplaceRules('acting coy → coy\nhappy smile → happysmile')).toEqual({
        rules: [
          { from: 'acting coy', to: 'coy' },
          { from: 'happy smile', to: 'happysmile' },
        ],
        invalidLines: [],
      });
    });

    it('reports invalid lines and applies rules in order', () => {
      const parsed = parseBulkReplaceRules('acting coy => coy\nacting coy -> coy\ncoy smile -> coysmile');
      expect(parsed.invalidLines).toEqual([1]);
      expect(applyBulkReplaceRules('hero acting coy smile.png', parsed.rules)).toBe('hero coysmile.png');
    });
  });
});
