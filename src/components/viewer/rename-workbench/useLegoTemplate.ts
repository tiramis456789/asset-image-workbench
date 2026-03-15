import { Dispatch, RefObject, SetStateAction, useCallback, useMemo, useState } from 'react';

import { ImageFile } from '@/hooks/useImageStore';

import { NameSeparator, S, SavedTemplate, TemplateBlock, getExtension, makeBlock } from './shared';

type SetStatus = Dispatch<SetStateAction<string>>;

type UseLegoTemplateParams = {
  currentImage: ImageFile | null;
  markedImageIds: string[];
  onRenameImage: (imageId: string, nextName: string) => void;
  setManualName: (value: string) => void;
  setStatus: SetStatus;
};

export function useLegoTemplate({ currentImage, markedImageIds, onRenameImage, setManualName, setStatus }: UseLegoTemplateParams) {
  const [isLegoOpen, setIsLegoOpen] = useState(false);
  const [isBatchApply, setIsBatchApply] = useState(false);
  const [isContinuousApply, setIsContinuousApply] = useState(false);
  const [templateName, setTemplateName] = useState<string>(S.defaultTemplate);
  const [blocks, setBlocks] = useState<TemplateBlock[]>([makeBlock(S.character), makeBlock(S.outfit), makeBlock(S.emotion)]);
  const [separator, setSeparator] = useState<NameSeparator>('underscore');

  const currentExtension = currentImage ? getExtension(currentImage.originalName) : '';
  const batchTargetCount = markedImageIds.length;
  const separatorValue = separator === 'space' ? ' ' : '_';
  const legoPreview = useMemo(() => {
    const values = blocks.map((block) => block.selectedValue.trim()).filter(Boolean);
    return values.length ? `${values.join(separatorValue)}${currentExtension}` : '';
  }, [blocks, currentExtension, separatorValue]);

  const updateBlock = useCallback((blockId: string, updater: (block: TemplateBlock) => TemplateBlock) => {
    setBlocks((prev) => prev.map((block) => (block.id === blockId ? updater(block) : block)));
  }, []);

  const addBlock = useCallback(() => setBlocks((prev) => [...prev, makeBlock(`slot_${prev.length + 1}`)]), []);
  const addPresetBlock = useCallback((label: string) => setBlocks((prev) => [...prev, makeBlock(label)]), []);
  const removeBlock = useCallback((blockId: string) => setBlocks((prev) => prev.filter((block) => block.id !== blockId)), []);

  const moveBlock = useCallback((blockId: string, direction: 'up' | 'down') => {
    setBlocks((prev) => {
      const index = prev.findIndex((block) => block.id === blockId);
      const nextIndex = direction === 'up' ? index - 1 : index + 1;
      if (index < 0 || nextIndex < 0 || nextIndex >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.splice(nextIndex, 0, item);
      return next;
    });
  }, []);

  const addBlockValue = useCallback(
    (blockId: string) =>
      updateBlock(blockId, (block) => {
        const nextValue = block.draftValue.trim();
        if (!nextValue || block.values.includes(nextValue)) return block;
        return { ...block, values: [...block.values, nextValue], selectedValue: block.selectedValue || nextValue, draftValue: '' };
      }),
    [updateBlock]
  );

  const removeBlockValue = useCallback(
    (blockId: string, value: string) =>
      updateBlock(blockId, (block) => {
        const nextValues = block.values.filter((item) => item !== value);
        return { ...block, values: nextValues, selectedValue: block.selectedValue === value ? nextValues[0] ?? '' : block.selectedValue };
      }),
    [updateBlock]
  );

  const selectBlockValue = useCallback(
    (blockId: string, value: string) =>
      updateBlock(blockId, (block) => ({ ...block, selectedValue: block.selectedValue === value ? '' : value })),
    [updateBlock]
  );

  const applyLegoTemplate = useCallback(() => {
    if (!currentImage && !isBatchApply) return setStatus('\uBA3C\uC800 \uC774\uBBF8\uC9C0\uB97C \uC120\uD0DD\uD574 \uC8FC\uC138\uC694.');
    if (!legoPreview) return setStatus('\uCD5C\uC18C \uD55C \uAC1C \uC774\uC0C1\uC758 \uAC12\uC744 \uACE8\uB77C \uC8FC\uC138\uC694.');

    if (isBatchApply) {
      if (batchTargetCount === 0) return setStatus('\uB2E4\uC911\uC801\uC6A9 \uB300\uC0C1\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.');
      markedImageIds.forEach((id) => onRenameImage(id, legoPreview));
      setStatus(`\uD540\uB41C \uC774\uBBF8\uC9C0 ${batchTargetCount}\uAC1C\uC5D0 "${legoPreview}"\uB97C \uC801\uC6A9\uD588\uC2B5\uB2C8\uB2E4.`);
    } else if (currentImage) {
      onRenameImage(currentImage.id, legoPreview);
      setManualName(legoPreview);
      setStatus(`\uD604\uC7AC \uC774\uBBF8\uC9C0 \uC774\uB984\uC744 "${legoPreview}"\uB85C \uB9CC\uB4E4\uC5C8\uC2B5\uB2C8\uB2E4.`);
    }

    if (!isContinuousApply) setIsLegoOpen(false);
  }, [batchTargetCount, currentImage, isBatchApply, isContinuousApply, legoPreview, markedImageIds, onRenameImage, setManualName, setStatus]);

  const saveTemplate = useCallback(() => {
    const payload: SavedTemplate = {
      name: templateName.trim() || 'template',
      blocks: blocks.map((block) => ({ label: block.label, values: block.values })),
    };
    const fileName = `${payload.name.replace(/[\\/:*?"<>|]+/g, '_') || 'template'}.json`;
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setStatus(`"${fileName}" \uD15C\uD50C\uB9BF\uC744 \uC800\uC7A5\uD588\uC2B5\uB2C8\uB2E4.`);
  }, [blocks, setStatus, templateName]);

  const loadTemplate = useCallback(
    async (file: File) => {
      try {
        const parsed = JSON.parse(await file.text()) as SavedTemplate;
        if (!parsed || typeof parsed.name !== 'string' || !Array.isArray(parsed.blocks)) throw new Error('\uD15C\uD50C\uB9BF \uD615\uC2DD\uC774 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.');
        const nextBlocks = parsed.blocks
          .filter((block) => typeof block.label === 'string' && Array.isArray(block.values))
          .map((block) => ({
            id: crypto.randomUUID(),
            label: block.label,
            values: block.values.filter((value): value is string => typeof value === 'string'),
            selectedValue: '',
            draftValue: '',
          }));
        if (nextBlocks.length === 0) throw new Error('\uBD88\uB7EC\uC62C \uBE14\uB85D\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.');
        setTemplateName(parsed.name);
        setBlocks(nextBlocks);
        setStatus(`"${parsed.name}" \uD15C\uD50C\uB9BF\uC744 \uBD88\uB7EC\uC654\uC2B5\uB2C8\uB2E4.`);
      } catch (error) {
        setStatus(error instanceof Error ? error.message : '\uD15C\uD50C\uB9BF\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.');
      }
    },
    [setStatus]
  );

  const openTemplateImport = useCallback((importInputRef: RefObject<HTMLInputElement | null>) => {
    importInputRef.current?.click();
  }, []);

  return {
    isLegoOpen,
    isBatchApply,
    isContinuousApply,
    templateName,
    blocks,
    separator,
    batchTargetCount,
    legoPreview,
    setIsLegoOpen,
    setIsBatchApply,
    setIsContinuousApply,
    setTemplateName,
    setSeparator,
    updateBlock,
    addBlock,
    addPresetBlock,
    removeBlock,
    moveBlock,
    addBlockValue,
    removeBlockValue,
    selectBlockValue,
    applyLegoTemplate,
    saveTemplate,
    loadTemplate,
    openTemplateImport,
  };
}
