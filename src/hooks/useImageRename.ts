import { Dispatch, SetStateAction, useCallback } from 'react';

import { applyRenamePresetToName, normalizeImageName, RenamePreset, splitNameParts } from '@/lib/rename';
import { flatImages, updateTreeFiles } from '@/hooks/useImageTree';
import type { TreeNode } from '@/hooks/useImageStore';

type RenameTreeState = Dispatch<SetStateAction<TreeNode[]>>;

export function useImageRename(setTree: RenameTreeState, markedIds: Set<string>) {
  const renameImage = useCallback(
    (imageId: string, nextName: string) => {
      setTree((prev) => {
        const image = flatImages(prev).find((item) => item.id === imageId);
        if (!image) return prev;
        const normalized = normalizeImageName(nextName, image.originalName);
        return updateTreeFiles(prev, (node) =>
          node.image.id === imageId
            ? { ...node, name: normalized, image: { ...node.image, name: normalized } }
            : node
        );
      });
    },
    [setTree]
  );

  const resetImageName = useCallback(
    (imageId: string) => {
      setTree((prev) => {
        const image = flatImages(prev).find((item) => item.id === imageId);
        return image
          ? updateTreeFiles(prev, (node) =>
              node.image.id === imageId
                ? { ...node, name: image.originalName, image: { ...node.image, name: image.originalName } }
                : node
            )
          : prev;
      });
    },
    [setTree]
  );

  const resetAllNames = useCallback(() => {
    setTree((prev) =>
      updateTreeFiles(prev, (node) => ({
        ...node,
        name: node.image.originalName,
        image: { ...node.image, name: node.image.originalName },
      }))
    );
  }, [setTree]);

  const applySequentialRename = useCallback(
    ({
      prefix,
      suffix,
      start,
      padding,
      markedOnly,
    }: {
      prefix: string;
      suffix: string;
      start: number;
      padding: number;
      markedOnly: boolean;
    }) => {
      let changedCount = 0;

      setTree((prev) => {
        const targets = markedOnly ? flatImages(prev).filter((image) => markedIds.has(image.id)) : flatImages(prev);
        const names = new Map(
          targets.map((image, index) => {
            const nextName = normalizeImageName(
              `${prefix}${String(start + index).padStart(Math.max(1, padding), '0')}${suffix}${splitNameParts(image.name).extension}`,
              image.originalName
            );
            return [image.id, nextName];
          })
        );

        return updateTreeFiles(prev, (node) => {
          const nextName = names.get(node.image.id);
          if (!nextName || nextName === node.image.name) return node;
          changedCount += 1;
          return { ...node, name: nextName, image: { ...node.image, name: nextName } };
        });
      });

      return changedCount;
    },
    [markedIds, setTree]
  );

  const applyRenamePreset = useCallback(
    (preset: RenamePreset, markedOnly: boolean, separator = '_') => {
      let changedCount = 0;

      setTree((prev) => {
        const targetIds = new Set(
          (markedOnly ? flatImages(prev).filter((image) => markedIds.has(image.id)) : flatImages(prev)).map((image) => image.id)
        );

        return updateTreeFiles(prev, (node) => {
          if (!targetIds.has(node.image.id)) return node;
          const nextName = applyRenamePresetToName(node.image.name, preset, separator);
          if (nextName === node.image.name) return node;
          changedCount += 1;
          return { ...node, name: nextName, image: { ...node.image, name: nextName } };
        });
      });

      return changedCount;
    },
    [markedIds, setTree]
  );

  return {
    renameImage,
    resetImageName,
    resetAllNames,
    applySequentialRename,
    applyRenamePreset,
  };
}
