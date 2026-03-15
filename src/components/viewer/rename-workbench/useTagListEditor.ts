import { Dispatch, SetStateAction, useCallback, useMemo, useState } from 'react';

import { ImageFile } from '@/hooks/useImageStore';
import { inspectImageExif } from '@/lib/exif';

import { TagInputMap, TagListEditorState, TagPreviewMap, TemplateBlock, splitPromptTags } from './shared';

type SetStatus = Dispatch<SetStateAction<string>>;

async function buildFileFromImage(image: ImageFile) {
  if (image.fileHandle != null) {
    return image.fileHandle.getFile();
  }

  const blob = await fetch(image.url).then((response) => response.blob());
  return new File([blob], image.name, {
    type: image.type,
    lastModified: image.lastModified,
  });
}

type UseTagListEditorParams = {
  currentImage: ImageFile | null;
  blocks: TemplateBlock[];
  updateBlock: (blockId: string, updater: (block: TemplateBlock) => TemplateBlock) => void;
  removeBlockValue: (blockId: string, value: string) => void;
  setStatus: SetStatus;
};

export function useTagListEditor({ currentImage, blocks, updateBlock, removeBlockValue, setStatus }: UseTagListEditorParams) {
  const [tagListEditor, setTagListEditor] = useState<TagListEditorState>(null);
  const [tagPreviewMap, setTagPreviewMap] = useState<TagPreviewMap>({});
  const [tagInputMap, setTagInputMap] = useState<TagInputMap>({});
  const [tagPreviewLoading, setTagPreviewLoading] = useState(false);

  const activePreviewTags = useMemo(
    () => (tagListEditor ? tagPreviewMap[tagListEditor.key] ?? [] : []),
    [tagListEditor, tagPreviewMap]
  );
  const activeTagInput = useMemo(
    () => (tagListEditor ? tagInputMap[tagListEditor.key] ?? '' : ''),
    [tagInputMap, tagListEditor]
  );
  const activeBlockValues = useMemo(
    () => (tagListEditor ? blocks.find((block) => block.label === tagListEditor.label)?.values ?? [] : []),
    [blocks, tagListEditor]
  );

  const loadExifTagsIntoEditor = useCallback(async () => {
    if (!tagListEditor) return;
    if (!currentImage) return setStatus('\uBA3C\uC800 \uC774\uBBF8\uC9C0\uB97C \uC120\uD0DD\uD574 \uC8FC\uC138\uC694.');
    setTagPreviewLoading(true);
    try {
      const file = await buildFileFromImage(currentImage);
      const result = await inspectImageExif(file);
      const nextTags = Array.from(
        new Set([
          ...splitPromptTags(result.parsed?.prompt ?? ''),
          ...(result.parsed?.characterPrompts ?? []).flatMap(splitPromptTags),
        ])
      );
      setTagPreviewMap((prev) => ({ ...prev, [tagListEditor.key]: nextTags }));
      setStatus(
        nextTags.length > 0
          ? `EXIF \uD0DC\uADF8 ${nextTags.length}\uAC1C\uB97C \uBD88\uB7EC\uC654\uC2B5\uB2C8\uB2E4.`
          : '\uBD88\uB7EC\uC62C EXIF \uD0DC\uADF8\uB97C \uCC3E\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.'
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'EXIF \uD0DC\uADF8\uB97C \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.');
    } finally {
      setTagPreviewLoading(false);
    }
  }, [currentImage, setStatus, tagListEditor]);

  const applyManualTagsToEditor = useCallback(() => {
    if (!tagListEditor) return;
    const manualTags = splitPromptTags(activeTagInput);
    const nextTags = Array.from(new Set([...activePreviewTags, ...manualTags]));
    setTagPreviewMap((prev) => ({ ...prev, [tagListEditor.key]: nextTags }));
    setTagInputMap((prev) => ({ ...prev, [tagListEditor.key]: '' }));
    setStatus(
      nextTags.length > activePreviewTags.length
        ? '\uC218\uB3D9 \uC785\uB825 \uD0DC\uADF8\uB97C \uD6C4\uBCF4\uC5D0 \uCD94\uAC00\uD588\uC2B5\uB2C8\uB2E4.'
        : '\uCD94\uAC00\uD560 \uC0C8 \uD0DC\uADF8\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.'
    );
  }, [activePreviewTags, activeTagInput, setStatus, tagListEditor]);

  const removePreviewTag = useCallback(
    (tag: string) => {
      if (!tagListEditor) return;
      const nextTags = activePreviewTags.filter((item) => item !== tag);
      setTagPreviewMap((prev) => ({ ...prev, [tagListEditor.key]: nextTags }));
      setStatus(`"${tag}" \uD0DC\uADF8\uB97C \uD6C4\uBCF4\uC5D0\uC11C \uC81C\uAC70\uD588\uC2B5\uB2C8\uB2E4.`);
    },
    [activePreviewTags, setStatus, tagListEditor]
  );

  const applyPreviewTagToBlock = useCallback(
    (tag: string) => {
      if (!tagListEditor) return;
      const targetBlock = blocks.find((block) => block.label === tagListEditor.label);
      if (!targetBlock) {
        setStatus('\uC5F0\uACB0\uD560 \uBE14\uB85D\uC744 \uCC3E\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.');
        return;
      }

      updateBlock(targetBlock.id, (block) => {
        if (block.values.includes(tag)) {
          return { ...block, selectedValue: tag };
        }
        return {
          ...block,
          values: [...block.values, tag],
          selectedValue: tag,
        };
      });
      setStatus(`"${tag}" \uD0DC\uADF8\uB97C ${tagListEditor.label} \uBE14\uB85D\uC5D0 \uCD94\uAC00\uD588\uC2B5\uB2C8\uB2E4.`);
    },
    [blocks, setStatus, tagListEditor, updateBlock]
  );

  const removeBlockTagFromEditor = useCallback(
    (tag: string) => {
      if (!tagListEditor) return;
      const targetBlock = blocks.find((block) => block.label === tagListEditor.label);
      if (!targetBlock) {
        setStatus('\uC5F0\uACB0\uD560 \uBE14\uB85D\uC744 \uCC3E\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.');
        return;
      }

      removeBlockValue(targetBlock.id, tag);
      setStatus(`"${tag}" \uD0DC\uADF8\uB97C ${tagListEditor.label} \uBE14\uB85D\uC5D0\uC11C \uC81C\uAC70\uD588\uC2B5\uB2C8\uB2E4.`);
    },
    [blocks, removeBlockValue, setStatus, tagListEditor]
  );

  const setActiveTagInput = useCallback(
    (value: string) => {
      if (!tagListEditor) return;
      setTagInputMap((prev) => ({ ...prev, [tagListEditor.key]: value }));
    },
    [tagListEditor]
  );

  return {
    tagListEditor,
    tagPreviewLoading,
    activePreviewTags,
    activeTagInput,
    activeBlockValues,
    setTagListEditor,
    setActiveTagInput,
    loadExifTagsIntoEditor,
    applyManualTagsToEditor,
    removePreviewTag,
    applyPreviewTagToBlock,
    removeBlockTagFromEditor,
  };
}
