export type TemplateBlock = {
  id: string;
  label: string;
  values: string[];
  selectedValue: string;
  draftValue: string;
};

export type SavedTemplate = {
  name: string;
  blocks: Array<{ label: string; values: string[] }>;
};

export type TagListEditorState = { key: string; label: string } | null;
export type TagPreviewMap = Record<string, string[]>;
export type TagInputMap = Record<string, string>;
export type NameSeparator = 'underscore' | 'space';

export const S = {
  character: '\uCE90\uB9AD\uD130',
  outfit: '\uBCF5\uC7A5',
  emotion: '\uAC10\uC815',
  defaultTemplate: '\uAE30\uBCF8 \uD15C\uD50C\uB9BF',
  workbench: '\uC774\uB984\uBCC0\uACBD \uC791\uC5C5\uB300',
  virtualHint: '\uC2E4\uC81C \uD30C\uC77C\uC740 \uC544\uC9C1 \uBC14\uB00C\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4. \uC9C0\uAE08 \uBCF4\uC774\uB294 \uC774\uB984\uACFC \uC704\uCE58\uB294 \uAC00\uC0C1 \uC791\uC5C5 \uACB0\uACFC\uC785\uB2C8\uB2E4.',
  currentImage: '\uD604\uC7AC \uC774\uBBF8\uC9C0',
  restore: '\uC6D0\uB798\uB300\uB85C',
  originalName: '\uC6D0\uB798 \uC774\uB984',
  currentPath: '\uD604\uC7AC \uC704\uCE58',
  newName: '\uC0C8 \uC774\uB984',
  renameCurrent: '\uD604\uC7AC \uC774\uBBF8\uC9C0 \uC774\uB984 \uBCC0\uACBD',
  selectImageFirst: '\uC774\uBBF8\uC9C0\uB97C \uC120\uD0DD\uD558\uBA74 \uAC1C\uBCC4 \uC774\uB984\uBCC0\uACBD\uC744 \uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.',
  target: '\uC774\uB984\uBCC0\uACBD \uC801\uC6A9 \uB300\uC0C1',
  current: '\uD604\uC7AC',
  all: '\uC804\uCCB4',
  pinnedOnly: '\uD540\uB9CC',
  filtered: '\uD544\uD130',
  lego: '\uB808\uACE0\uC2DD \uD15C\uD50C\uB9BF',
  legoHelp: '\uD074\uB9AD\uD558\uBA74 \uC911\uC559 \uD31D\uC5C5\uC5D0\uC11C \uBE14\uB85D\uC744 \uC870\uD569\uD574 \uC774\uB984\uC744 \uB9CC\uB4E4 \uC218 \uC788\uC2B5\uB2C8\uB2E4.',
  startLego: '\uB808\uACE0 \uC791\uC5C5 \uC2DC\uC791',
  quickPreset: '\uBE60\uB978 \uAD6C\uC870 \uD504\uB9AC\uC14B',
  replaceOneToOne: '1:1 \uCE58\uD658',
  replaceFrom: '\uAE30\uC874 \uB2E8\uC5B4',
  replaceTo: '\uBC14\uAFC0 \uB2E8\uC5B4',
  applyReplace: '\uCE58\uD658 \uC801\uC6A9',
  uppercaseName: '\uB300\uBB38\uC790',
  lowercaseName: '\uC18C\uBB38\uC790',
  titleCaseName: '\uB2E8\uC5B4\uBCC4 \uCCAB \uAE00\uC790 \uB300\uBB38\uC790',
  spacesToUnderscores: '\uACF5\uBC31/\uC5B8\uB354\uBC14 \uBCC0\uD658',
  move: '\uAC00\uC0C1 \uD3F4\uB354 \uC774\uB3D9',
  root: '(\uB8E8\uD2B8)',
  moveToFolder: '\uC120\uD0DD \uD3F4\uB354\uB85C \uC774\uB3D9',
  newFolderName: '\uC0C8 \uD3F4\uB354\uBA85',
  createAndMove: '\uC0C8 \uD3F4\uB354 \uB9CC\uB4E4\uACE0 \uC774\uB3D9',
  preview: '\uBCC0\uACBD \uBBF8\uB9AC\uBCF4\uAE30',
  autoCleanup: '\uC790\uB3D9 \uC815\uB9AC',
  resetAll: '\uC774\uB984 \uC804\uCCB4 \uB418\uB3CC\uB9AC\uAE30',
  noChanges: '\uC544\uC9C1 \uAC00\uC0C1 \uBCC0\uACBD \uC791\uC5C5\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.',
  renameChanges: '\uC774\uB984 \uBCC0\uACBD',
  moveChanges: '\uC704\uCE58 \uBCC0\uACBD',
  conflictWarning: '\uAC19\uC740 \uC774\uB984 \uCDA9\uB3CC \uAC00\uB2A5\uC131\uC774 \uC788\uC2B5\uB2C8\uB2E4.',
  close: '\uB2EB\uAE30',
  templateName: '\uD15C\uD50C\uB9BF \uC774\uB984',
  addBlock: '\uBCC0\uC218 \uBE14\uB85D \uCD94\uAC00',
  save: '\uC800\uC7A5',
  load: '\uBD88\uB7EC\uC624\uAE30',
  tagPreset: '\uD0DC\uADF8 \uD504\uB9AC\uC14B',
  exists: '\uC788\uC74C',
  add: '\uCD94\uAC00',
  tagListMgmt: '\uD0DC\uADF8 \uB9AC\uC2A4\uD2B8 \uAD00\uB9AC',
  currentPreview: '\uD604\uC7AC \uBBF8\uB9AC\uBCF4\uAE30',
  previewHint: '\uAC12\uC744 \uACE0\uB974\uBA74 \uC5EC\uAE30\uC5D0\uC11C \uC774\uB984\uC774 \uB9CC\uB4E4\uC5B4\uC9D1\uB2C8\uB2E4.',
  separator: '\uAD6C\uBD84\uC790',
  underscore: '\uC5B8\uB354\uBC14 (_)',
  space: '\uACF5\uBC31 (space)',
  valueExample: '\uAC12 \uCD94\uAC00 \uC608: angry',
  remove: '\uC81C\uAC70',
  removeValue: '\uAC12 \uC81C\uAC70',
  moveUp: '\uC704\uB85C \uC774\uB3D9',
  moveDown: '\uC544\uB798\uB85C \uC774\uB3D9',
  noBlockValues: '\uC774 \uBE14\uB85D\uC5D0\uB294 \uC544\uC9C1 \uAC12\uC774 \uC5C6\uC2B5\uB2C8\uB2E4. \uC9C1\uC811 \uCD94\uAC00\uD574 \uC8FC\uC138\uC694.',
  batchApply: '\uB2E4\uC911\uC801\uC6A9',
  continuousApply: '\uC5F0\uC18D\uC801\uC6A9',
  applyPinned: '\uD540\uB41C \uC774\uBBF8\uC9C0\uC5D0 \uC801\uC6A9',
  applyCurrent: '\uD604\uC7AC \uC774\uBBF8\uC9C0\uC5D0 \uC801\uC6A9',
  tagList: '\uD0DC\uADF8 \uB9AC\uC2A4\uD2B8',
  tagListHelp: '\uCC28\uD6C4 EXIF \uCD94\uCD9C\uACFC \uC218\uB3D9 \uC815\uB9AC\uB97C \uD569\uCE60 \uBCC4\uB3C4 \uC791\uC5C5 \uD654\uBA74\uC785\uB2C8\uB2E4.',
  topArea: '\uC0C1\uB2E8 \uC601\uC5ED',
  collectCandidates: '\uD6C4\uBCF4 \uC218\uC9D1',
  manualInput: '\uC218\uB3D9 \uC785\uB825',
  manualPlaceholder: '\uC27C\uD45C\uB85C \uAD6C\uBD84\uD574 \uD0DC\uADF8\uB97C \uC785\uB825\uD558\uC138\uC694',
  loadExif: 'EXIF \uBD88\uB7EC\uC624\uAE30',
  loading: '\uBD88\uB7EC\uC624\uB294 \uC911',
  topAreaHint: '\uC774 \uC0C1\uB2E8 \uC601\uC5ED\uC740 \uB098\uC911\uC5D0 EXIF \uACB0\uACFC, \uAC80\uC0C9, \uD544\uD130, \uC815\uB9AC \uADDC\uCE59\uC744 \uB2F4\uB294 \uC790\uB9AC\uC785\uB2C8\uB2E4.',
  summary: '\uC694\uC57D',
  targetBlock: '\uB300\uC0C1 \uBE14\uB85D',
  linkedExifTags: '\uC5F0\uACB0\uB41C EXIF \uD0DC\uADF8',
  noneYet: '\uC544\uC9C1 \uC5C6\uC74C',
  manualEditAvailable: '\uC218\uB3D9 \uD6C4\uBCF4 \uD3B8\uC9D1: \uC0AC\uC6A9 \uAC00\uB2A5',
  bottomAreaA: '\uD558\uB2E8 \uC601\uC5ED A',
  bottomAreaB: '\uD558\uB2E8 \uC601\uC5ED B',
  candidateList: '\uD0DC\uADF8 \uD6C4\uBCF4 \uBAA9\uB85D',
  editorWorkbench: '\uC120\uD0DD/\uD3B8\uC9D1 \uC791\uC5C5\uB300',
  noCandidateYet: '\uC544\uC9C1 \uB4F1\uB85D\uB41C \uD6C4\uBCF4\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.',
  bottomHint: '\uC5EC\uAE30\uB294 \uC120\uD0DD \uD6C4\uBCF4, \uC218\uB3D9 \uD3B8\uC9D1, \uC77C\uAD04 \uC815\uB9AC \uBC84\uD2BC\uC774 \uB4E4\uC5B4\uC62C \uC790\uB9AC\uC785\uB2C8\uB2E4.',
  manualInputPlanned: '\uC218\uB3D9 \uC785\uB825\uCE78 \uC608\uC815',
  selectedTag: '\uC120\uD0DD\uB41C \uD0DC\uADF8',
  addedTags: '\uCD94\uAC00\uB41C \uD0DC\uADF8',
  noAddedTags: '\uC544\uC9C1 \uCD94\uAC00\uB41C \uD0DC\uADF8\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.',
} as const;

export const presetBlocks = [
  { key: 'character', label: S.character },
  { key: 'outfit', label: S.outfit },
  { key: 'emotion', label: S.emotion },
] as const;

export const makeBlock = (label = ''): TemplateBlock => ({
  id: crypto.randomUUID(),
  label,
  values: [],
  selectedValue: '',
  draftValue: '',
});

export const getExtension = (name: string) => {
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot) : '';
};

export const splitPromptTags = (input: string) =>
  input
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
