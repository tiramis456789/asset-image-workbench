import { useCallback, useMemo } from 'react';

import { FolderOption, ImageFile } from '@/hooks/useImageStore';
import { applyBulkReplaceRules, applyRenamePresetToName, getPathKey, parseBulkReplaceRules, RenamePreset, splitNameParts } from '@/lib/rename';
import { S } from './shared';

export type RenameTargetMode = 'all' | 'marked' | 'current' | 'filtered';

type RenameWorkbenchActionParams = {
  currentImage: ImageFile | null;
  allImages: ImageFile[];
  markedImageIds: string[];
  markedCount: number;
  filteredImageIds: string[];
  filteredCount: number;
  imageMap: Map<string, ImageFile>;
  manualName: string;
  replaceFrom: string;
  replaceTo: string;
  bulkReplaceText: string;
  targetMode: RenameTargetMode;
  moveTarget: string;
  newFolderName: string;
  onRenameImage: (imageId: string, nextName: string) => void;
  onCreateFolder: (name: string, parentId?: string) => string;
  onMoveImages: (imageIds: string[], targetFolderId?: string) => { movedCount: number; error?: string };
  setStatus: (value: string) => void;
  setNewFolderName: (value: string) => void;
};

export function useRenameWorkbenchActions({
  currentImage,
  allImages,
  markedImageIds,
  markedCount,
  filteredImageIds,
  filteredCount,
  imageMap,
  manualName,
  replaceFrom,
  replaceTo,
  bulkReplaceText,
  targetMode,
  moveTarget,
  newFolderName,
  onRenameImage,
  onCreateFolder,
  onMoveImages,
  setStatus,
  setNewFolderName,
}: RenameWorkbenchActionParams) {
  const quickPresetSeparator = '_';

  const targetSummary = useMemo(
    () =>
      targetMode === 'current'
        ? currentImage
          ? `${S.currentImage} 1\uAC1C`
          : '\uD604\uC7AC \uC774\uBBF8\uC9C0 \uC5C6\uC74C'
        : targetMode === 'marked'
          ? `\uD540\uB41C \uC774\uBBF8\uC9C0 ${markedCount}\uAC1C`
          : targetMode === 'filtered'
            ? `\uD544\uD130 \uACB0\uACFC ${filteredCount}\uAC1C`
            : `\uC804\uCCB4 \uC774\uBBF8\uC9C0 ${allImages.length}\uAC1C`,
    [allImages.length, currentImage, filteredCount, markedCount, targetMode]
  );

  const getTargetImageIds = useCallback(
    () =>
      targetMode === 'current'
        ? currentImage
          ? [currentImage.id]
          : []
        : targetMode === 'marked'
          ? markedImageIds
          : targetMode === 'filtered'
            ? filteredImageIds
            : allImages.map((image) => image.id),
    [allImages, currentImage, filteredImageIds, markedImageIds, targetMode]
  );

  const renameTargetImages = useCallback(
    (transform: (image: ImageFile) => string, emptyStatus?: string) => {
      const imageIds = getTargetImageIds();
      if (!imageIds.length) {
        setStatus(emptyStatus ?? '\uBCC0\uACBD\uD560 \uB300\uC0C1\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.');
        return 0;
      }

      let changedCount = 0;
      imageIds.forEach((imageId) => {
        const image = imageMap.get(imageId);
        if (!image) return;
        const nextName = transform(image);
        if (nextName === image.name) return;
        onRenameImage(imageId, nextName);
        changedCount += 1;
      });

      return changedCount;
    },
    [getTargetImageIds, imageMap, onRenameImage, setStatus]
  );

  const applyManualRename = useCallback(() => {
    if (!currentImage) return;
    onRenameImage(currentImage.id, manualName);
    setStatus('\uD604\uC7AC \uC774\uBBF8\uC9C0 \uC774\uB984\uC744 \uAC00\uC0C1\uC73C\uB85C \uBCC0\uACBD\uD588\uC2B5\uB2C8\uB2E4.');
  }, [currentImage, manualName, onRenameImage, setStatus]);

  const applyPreset = useCallback(
    (preset: RenamePreset) => {
      const changedCount = renameTargetImages((image) => applyRenamePresetToName(image.name, preset, quickPresetSeparator));
      const label =
        preset === 'spaces_to_underscores'
          ? S.spacesToUnderscores
          : preset === 'name_outfit_emotion'
            ? '\uC774\uB984_\uBCF5\uC7A5_\uAC10\uC815'
            : '\uC774\uB984_\uAC10\uC815';
      setStatus(changedCount > 0 ? `${changedCount}\uAC1C \uD56D\uBAA9\uC5D0 ${label} \uD504\uB9AC\uC14B\uC744 \uC801\uC6A9\uD588\uC2B5\uB2C8\uB2E4.` : '\uBCC0\uACBD\uB41C \uD56D\uBAA9\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.');
    },
    [quickPresetSeparator, renameTargetImages, setStatus]
  );

  const applyOneToOneReplace = useCallback(() => {
    const from = replaceFrom.trim();
    if (!from) {
      setStatus('\uCE58\uD658\uD560 \uAE30\uC874 \uB2E8\uC5B4\uB97C \uC785\uB825\uD574 \uC8FC\uC138\uC694.');
      return;
    }

    const changedCount = renameTargetImages((image) => image.name.split(from).join(replaceTo));
    setStatus(
      changedCount > 0
        ? `${changedCount}\uAC1C \uD56D\uBAA9\uC5D0 1:1 \uCE58\uD658\uC744 \uC801\uC6A9\uD588\uC2B5\uB2C8\uB2E4.`
        : '\uBCC0\uACBD\uB41C \uD56D\uBAA9\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.'
    );
  }, [renameTargetImages, replaceFrom, replaceTo, setStatus]);

  const applyBulkReplace = useCallback(() => {
    const { rules, invalidLines } = parseBulkReplaceRules(bulkReplaceText);
    if (!rules.length) {
      setStatus(
        invalidLines.length > 0
          ? `\uB2E4\uC911 \uCE58\uD658 \uADDC\uCE59\uC744 \uD574\uC11D\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4. \uC904 ${invalidLines.join(', ')}\uC744 \uD655\uC778\uD574 \uC8FC\uC138\uC694.`
          : '\uD55C \uC904\uC529 "A -> B" \uD615\uC2DD\uC73C\uB85C \uCE58\uD658 \uADDC\uCE59\uC744 \uC785\uB825\uD574 \uC8FC\uC138\uC694.'
      );
      return;
    }

    const changedCount = renameTargetImages((image) => applyBulkReplaceRules(image.name, rules));
    if (changedCount > 0) {
      setStatus(
        invalidLines.length > 0
          ? `${changedCount}\uAC1C \uD56D\uBAA9\uC5D0 \uB2E4\uC911 \uCE58\uD658\uC744 \uC801\uC6A9\uD588\uACE0, \uC904 ${invalidLines.join(', ')}\uC740 \uAC74\uB108\uB6F0\uC5C8\uC2B5\uB2C8\uB2E4.`
          : `${changedCount}\uAC1C \uD56D\uBAA9\uC5D0 ${rules.length}\uAC1C \uB2E4\uC911 \uCE58\uD658 \uADDC\uCE59\uC744 \uC801\uC6A9\uD588\uC2B5\uB2C8\uB2E4.`
      );
      return;
    }

    setStatus(
      invalidLines.length > 0
        ? `\uBCC0\uACBD\uB41C \uD56D\uBAA9\uC740 \uC5C6\uACE0, \uC904 ${invalidLines.join(', ')}\uC740 \uADDC\uCE59 \uD615\uC2DD\uC774 \uC544\uB2C8\uC5C8\uC2B5\uB2C8\uB2E4.`
        : '\uBCC0\uACBD\uB41C \uD56D\uBAA9\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.'
    );
  }, [bulkReplaceText, renameTargetImages, setStatus]);

  const applyCaseTransform = useCallback(
    (mode: 'upper' | 'lower') => {
      const changedCount = renameTargetImages((image) => {
        const { base, extension } = splitNameParts(image.name);
        const transformedBase = mode === 'upper' ? base.toUpperCase() : base.toLowerCase();
        return `${transformedBase}${extension}`;
      });

      setStatus(
        changedCount > 0
          ? `${changedCount}\uAC1C \uD56D\uBAA9\uC5D0 ${mode === 'upper' ? '\uB300\uBB38\uC790' : '\uC18C\uBB38\uC790'} \uC804\uD658\uC744 \uC801\uC6A9\uD588\uC2B5\uB2C8\uB2E4.`
          : '\uBCC0\uACBD\uB41C \uD56D\uBAA9\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.'
      );
    },
    [renameTargetImages, setStatus]
  );

  const applyUppercase = useCallback(() => applyCaseTransform('upper'), [applyCaseTransform]);
  const applyLowercase = useCallback(() => applyCaseTransform('lower'), [applyCaseTransform]);
  const applyTitleCase = useCallback(() => {
    const changedCount = renameTargetImages((image) => {
      const { base, extension } = splitNameParts(image.name);
      const transformedBase = base.replace(/[A-Za-z]+/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
      return `${transformedBase}${extension}`;
    });

    setStatus(
      changedCount > 0
        ? `${changedCount}\uAC1C \uD56D\uBAA9\uC5D0 \uB2E8\uC5B4\uBCC4 \uCCAB \uAE00\uC790 \uB300\uBB38\uC790 \uC804\uD658\uC744 \uC801\uC6A9\uD588\uC2B5\uB2C8\uB2E4.`
        : '\uBCC0\uACBD\uB41C \uD56D\uBAA9\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.'
    );
  }, [renameTargetImages, setStatus]);

  const autoCleanupConflicts = useCallback(() => {
    const changedImages = allImages.filter(
      (image) => image.name !== image.originalName || image.currentFolderPath !== image.originalFolderPath
    );

    if (changedImages.length === 0) {
      setStatus('\uC544\uC9C1 \uC790\uB3D9 \uC815\uB9AC\uD560 \uBCC0\uACBD \uD56D\uBAA9\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.');
      return;
    }

    const originalOwners = new Map(allImages.map((image) => [getPathKey(image.originalFolderPath, image.originalName), image.id]));
    const reservedTargets = new Set<string>();
    const resolvedNames = new Map<string, string>();
    let adjustedCount = 0;

    changedImages.forEach((image) => {
      const desiredName = image.name;
      const { base, extension } = splitNameParts(desiredName);

      const isBlocked = (candidateName: string) => {
        const key = getPathKey(image.currentFolderPath, candidateName);
        const owner = originalOwners.get(key);
        return reservedTargets.has(key) || Boolean(owner && owner !== image.id);
      };

      let nextName = desiredName;
      if (isBlocked(nextName)) {
        let index = 1;
        do {
          nextName = `${base}_${index}${extension}`;
          index += 1;
        } while (isBlocked(nextName));
        adjustedCount += 1;
      }

      reservedTargets.add(getPathKey(image.currentFolderPath, nextName));
      resolvedNames.set(image.id, nextName);
    });

    resolvedNames.forEach((nextName, imageId) => {
      const image = imageMap.get(imageId);
      if (!image || image.name === nextName) return;
      onRenameImage(imageId, nextName);
    });

    setStatus(
      adjustedCount > 0
        ? `${adjustedCount}\uAC1C \uCDA9\uB3CC \uC774\uB984\uC744 \uC790\uB3D9 \uC815\uB9AC\uD588\uC2B5\uB2C8\uB2E4.`
        : '\uC790\uB3D9 \uC815\uB9AC\uD560 \uCDA9\uB3CC\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.'
    );
  }, [allImages, imageMap, onRenameImage, setStatus]);

  const applyMove = useCallback(
    (useNewFolder: boolean) => {
      const imageIds = getTargetImageIds();
      if (imageIds.length === 0) return setStatus('\uC774\uB3D9\uD560 \uC774\uBBF8\uC9C0\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.');

      let targetFolderId: string | undefined;
      if (useNewFolder) {
        const trimmed = newFolderName.trim();
        if (!trimmed) return setStatus('\uC0C8 \uD3F4\uB354 \uC774\uB984\uC744 \uC785\uB825\uD574 \uC8FC\uC138\uC694.');
        targetFolderId = onCreateFolder(trimmed, moveTarget === '__root__' ? undefined : moveTarget);
        setNewFolderName('');
      } else if (moveTarget !== '__root__') {
        targetFolderId = moveTarget;
      }

      const result = onMoveImages(imageIds, targetFolderId);
      setStatus(result.error ?? (result.movedCount > 0 ? `${result.movedCount}\uAC1C \uC774\uBBF8\uC9C0\uB97C \uC774\uB3D9\uD588\uC2B5\uB2C8\uB2E4.` : '\uBCC0\uACBD\uB41C \uD56D\uBAA9\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.'));
    },
    [getTargetImageIds, moveTarget, newFolderName, onCreateFolder, onMoveImages, setNewFolderName, setStatus]
  );

  return {
    targetSummary,
    applyManualRename,
    applyPreset,
    applyOneToOneReplace,
    applyBulkReplace,
    applyUppercase,
    applyLowercase,
    applyTitleCase,
    autoCleanupConflicts,
    applyMove,
  };
}
