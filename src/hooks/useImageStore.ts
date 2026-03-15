import { useCallback, useMemo, useState } from 'react';

import { getPathKey } from '@/lib/rename';
import { applyImageChanges } from '@/hooks/useImageApply';
import { useImageRename } from '@/hooks/useImageRename';
import {
  addNodesToFolder,
  buildTreeFromEntries,
  buildTreeFromHandle,
  findFolderNode,
  findTreeNode,
  flatImages,
  folderOptionsOf,
  imageFromFile,
  rebaseTreeNode,
  removeTreeNode as removeTreeNodeFromList,
  toggleFolderNode,
  updateTreeFiles,
} from '@/hooks/useImageTree';
import { useViewerState } from '@/hooks/useViewerState';

type FsFileHandle = FileSystemFileHandle;
type FsDirectoryHandle = FileSystemDirectoryHandle;

export interface ImageFile {
  id: string;
  name: string;
  originalName: string;
  originalFolderPath: string;
  currentFolderPath: string;
  url: string;
  size: number;
  type: string;
  width?: number;
  height?: number;
  lastModified: number;
  applyRootId: string | null;
  fileHandle: FsFileHandle | null;
  applyReady: boolean;
}

export interface FolderNode {
  id: string;
  name: string;
  type: 'folder';
  children: TreeNode[];
  expanded: boolean;
  relativePath: string;
  applyRootId: string | null;
  isRoot: boolean;
}

export interface FileNode {
  id: string;
  name: string;
  type: 'file';
  image: ImageFile;
}

export interface PendingRename {
  id: string;
  originalName: string;
  nextName: string;
  hasConflict: boolean;
}

export interface PendingMove {
  id: string;
  name: string;
  from: string;
  to: string;
}

export interface FolderOption {
  id: string;
  name: string;
  path: string;
  applyRootId: string | null;
}

export interface ApplySummary {
  total: number;
  renameCount: number;
  moveCount: number;
  unappliableCount: number;
  blockedCount: number;
  ready: boolean;
  message: string;
}

interface SourceRoot {
  id: string;
  name: string;
  handle: FsDirectoryHandle;
}

export type TreeNode = FolderNode | FileNode;

const rootLabel = (path: string) => path || '(\uB8E8\uD2B8)';

export function useImageStore() {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [sourceRoots, setSourceRoots] = useState<SourceRoot[]>([]);
  const {
    currentIndex,
    zoom,
    rotation,
    panOffset,
    gridConfig,
    markedIds,
    showMarkedOnly,
    setZoom,
    setPanOffset,
    setGridConfig,
    selectImage,
    selectImageById,
    moveSelection,
    clampCurrentIndex,
    setFirstImageOnAdd,
    removeImageAt,
    toggleMarker,
    toggleCurrentMarker,
    toggleShowMarkedOnly,
    clearSelectionState,
    isMarked,
    zoomIn,
    zoomOut,
    fitToScreen,
    rotateRight,
    rotateLeft,
  } = useViewerState();
  const { renameImage, resetImageName, resetAllNames, applySequentialRename, applyRenamePreset } =
    useImageRename(setTree, markedIds);

  const allImages = useMemo(() => flatImages(tree), [tree]);
  const renameConflicts = useMemo(() => {
    const counts = new Map<string, number>();
    allImages.forEach((image) => {
      const key = getPathKey(image.currentFolderPath, image.name);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return new Set(Array.from(counts.entries()).filter(([, count]) => count > 1).map(([key]) => key));
  }, [allImages]);

  const applyBlockers = useMemo(() => {
    const originalOwners = new Map<string, string>();
    allImages.forEach((image) => originalOwners.set(getPathKey(image.originalFolderPath, image.originalName), image.id));
    return new Set(
      allImages
        .filter((image) => image.name !== image.originalName || image.currentFolderPath !== image.originalFolderPath)
        .filter((image) => {
          const owner = originalOwners.get(getPathKey(image.currentFolderPath, image.name));
          return Boolean(owner && owner !== image.id);
        })
        .map((image) => image.id)
    );
  }, [allImages]);

  const folderOptions = useMemo(() => folderOptionsOf(tree), [tree]);
  const images = useMemo(
    () => (showMarkedOnly ? allImages.filter((image) => markedIds.has(image.id)) : allImages),
    [allImages, markedIds, showMarkedOnly]
  );
  const currentImage = currentIndex >= 0 && currentIndex < images.length ? images[currentIndex] : null;
  const markedCount = useMemo(() => allImages.filter((image) => markedIds.has(image.id)).length, [allImages, markedIds]);

  const pendingRenames = useMemo(
    () =>
      allImages
        .filter((image) => image.name !== image.originalName)
        .map((image) => ({
          id: image.id,
          originalName: image.originalName,
          nextName: image.name,
          hasConflict: renameConflicts.has(getPathKey(image.currentFolderPath, image.name)),
        })),
    [allImages, renameConflicts]
  );

  const pendingMoves = useMemo(
    () =>
      allImages
        .filter((image) => image.currentFolderPath !== image.originalFolderPath)
        .map((image) => ({
          id: image.id,
          name: image.name,
          from: rootLabel(image.originalFolderPath),
          to: rootLabel(image.currentFolderPath),
        })),
    [allImages]
  );

  const pendingChangeCount = pendingRenames.length + pendingMoves.length;
  const applySummary = useMemo<ApplySummary>(() => {
    const unappliableCount = allImages.filter(
      (image) => (image.name !== image.originalName || image.currentFolderPath !== image.originalFolderPath) && !image.applyReady
    ).length;
    const blockedCount = applyBlockers.size + pendingRenames.filter((item) => item.hasConflict).length;

    if (pendingChangeCount === 0) {
      return {
        total: 0,
        renameCount: 0,
        moveCount: 0,
        unappliableCount: 0,
        blockedCount: 0,
        ready: false,
        message: '\uC801\uC6A9\uD560 \uAC00\uC0C1 \uBCC0\uACBD\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.',
      };
    }

    if (unappliableCount > 0) {
      return {
        total: pendingChangeCount,
        renameCount: pendingRenames.length,
        moveCount: pendingMoves.length,
        unappliableCount,
        blockedCount,
        ready: false,
        message: '\uC2E4\uC81C \uC801\uC6A9\uC740 "\uC4F0\uAE30 \uAC00\uB2A5\uD55C \uD3F4\uB354 \uC5F4\uAE30"\uB85C \uBD88\uB7EC\uC628 \uC774\uBBF8\uC9C0\uC5D0\uC11C\uB9CC \uC0AC\uC6A9\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.',
      };
    }

    if (blockedCount > 0) {
      return {
        total: pendingChangeCount,
        renameCount: pendingRenames.length,
        moveCount: pendingMoves.length,
        unappliableCount,
        blockedCount,
        ready: false,
        message: '\uC774\uB984 \uCDA9\uB3CC \uB610\uB294 \uAD50\uCC28 \uC774\uB3D9 \uCDA9\uB3CC\uC774 \uC788\uC5B4 \uC2E4\uC81C \uC801\uC6A9 \uC804\uC5D0 \uC218\uC815\uC774 \uD544\uC694\uD569\uB2C8\uB2E4.',
      };
    }

    return {
      total: pendingChangeCount,
      renameCount: pendingRenames.length,
      moveCount: pendingMoves.length,
      unappliableCount: 0,
      blockedCount: 0,
      ready: true,
      message: '\uC2E4\uC81C \uC801\uC6A9 \uC900\uBE44\uAC00 \uB05D\uB0AC\uC2B5\uB2C8\uB2E4.',
    };
  }, [allImages, applyBlockers, pendingChangeCount, pendingMoves.length, pendingRenames]);

  const addImages = useCallback((files: File[]) => {
    const newNodes: TreeNode[] = files
      .filter((file) => file.type.startsWith('image/'))
      .map((file) => {
        const image = imageFromFile(file);
        return { id: image.id, name: image.name, type: 'file', image };
      });

    setTree((prev) => {
      const updated = [...prev, ...newNodes];
      setFirstImageOnAdd(flatImages(prev).length > 0, newNodes.length);
      return updated;
    });
  }, [setFirstImageOnAdd]);

  const addWritableFolder = useCallback(async () => {
    const showDirectoryPicker = window.showDirectoryPicker;
    if (!showDirectoryPicker) {
      return { ok: false, message: '\uC774 \uBE0C\uB77C\uC6B0\uC800\uC5D0\uC11C\uB294 \uC4F0\uAE30 \uAC00\uB2A5\uD55C \uD3F4\uB354 \uC5F4\uAE30\uB97C \uC9C0\uC6D0\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.' };
    }

    try {
      const handle = await showDirectoryPicker();
      const applyRootId = crypto.randomUUID();
      const rootNode = await buildTreeFromHandle(handle, applyRootId, '', true);

      setSourceRoots((prev) => [...prev, { id: applyRootId, name: handle.name, handle }]);
      setTree((prev) => {
        const updated = [...prev, rootNode];
        setFirstImageOnAdd(flatImages(prev).length > 0, flatImages([rootNode]).length);
        return updated;
      });

      return { ok: true, message: `"${handle.name}" \uD3F4\uB354\uB97C \uC2E4\uC81C \uC801\uC6A9 \uAC00\uB2A5\uD55C \uC0C1\uD0DC\uB85C \uBD88\uB7EC\uC654\uC2B5\uB2C8\uB2E4.`};
    } catch {
      return { ok: false, message: '\uD3F4\uB354 \uC5F4\uAE30\uAC00 \uCDE8\uC18C\uB418\uC5C8\uAC70\uB098 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.' };
    }
  }, [setFirstImageOnAdd]);

  const addTreeNodes = useCallback((nodes: TreeNode[]) => {
    setTree((prev) => {
      const updated = [...prev, ...nodes];
      setFirstImageOnAdd(flatImages(prev).length > 0, flatImages(nodes).length);
      return updated;
    });
  }, [setFirstImageOnAdd]);

  const addEntriesAsTree = useCallback(
    async (entries: FileSystemEntry[]) => {
      const nodes = await buildTreeFromEntries(entries);
      if (nodes.length > 0) addTreeNodes(nodes);
    },
    [addTreeNodes]
  );

  const nextImage = useCallback(() => {
    moveSelection(1, images.length);
  }, [images.length, moveSelection]);

  const prevImage = useCallback(() => {
    moveSelection(-1, images.length);
  }, [images.length, moveSelection]);

  const removeImage = useCallback(
    (index: number) => {
      const image = images[index];
      if (!image) return;

      setTree((prev) => removeTreeNodeFromList(prev, image.id));
      removeImageAt(index, images.length);
    },
    [images, removeImageAt]
  );

  const removeNodeFromTree = useCallback(
    (nodeId: string) => {
      setTree((prev) => {
        const node = findTreeNode(prev, nodeId);
        if (node) {
          if (node.type === 'file') URL.revokeObjectURL(node.image.url);
          else flatImages([node]).forEach((image) => URL.revokeObjectURL(image.url));
        }

        const updated = removeTreeNodeFromList(prev, nodeId);
        const nextImages = showMarkedOnly ? flatImages(updated).filter((image) => markedIds.has(image.id)) : flatImages(updated);
        clampCurrentIndex(nextImages.length);
        return updated;
      });
    },
    [clampCurrentIndex, markedIds, showMarkedOnly]
  );

  const clearAll = useCallback(() => {
    allImages.forEach((image) => URL.revokeObjectURL(image.url));
    setTree([]);
    setSourceRoots([]);
    clearSelectionState();
  }, [allImages, clearSelectionState]);

  const toggleFolder = useCallback((folderId: string) => setTree((prev) => toggleFolderNode(prev, folderId)), []);

  const createFolder = useCallback(
    (name: string, parentId?: string) => {
      const trimmed = name.trim();
      const parent = parentId ? findFolderNode(tree, parentId) : null;
      const relativePath = parent
        ? parent.isRoot
          ? trimmed
          : parent.relativePath
            ? `${parent.relativePath}/${trimmed}`
            : trimmed
        : trimmed;

      const folder: FolderNode = {
        id: crypto.randomUUID(),
        name: trimmed,
        type: 'folder',
        children: [],
        expanded: true,
        relativePath,
        applyRootId: parent?.applyRootId ?? null,
        isRoot: false,
      };

      setTree((prev) => (parentId ? addNodesToFolder(prev, parentId, [folder]) : [...prev, folder]));
      return folder.id;
    },
    [tree]
  );

  const moveNodeToFolder = useCallback((nodeId: string, targetFolderId: string) => {
    setTree((prev) => {
        const node = findTreeNode(prev, nodeId);
        const target = findFolderNode(prev, targetFolderId);
        if (!node || !target || nodeId === targetFolderId || (node.type === 'folder' && node.isRoot)) return prev;
        const moved = rebaseTreeNode(node, target.isRoot ? '' : target.relativePath, target.applyRootId);
        return addNodesToFolder(removeTreeNodeFromList(prev, nodeId), targetFolderId, [moved]);
      });
  }, []);

  const moveNodeToRoot = useCallback((nodeId: string) => {
    setTree((prev) => {
        const node = findTreeNode(prev, nodeId);
        if (!node || (node.type === 'folder' && node.isRoot)) return prev;
        const rootId = node.type === 'file' ? node.image.applyRootId : node.applyRootId;
        return [...removeTreeNodeFromList(prev, nodeId), rebaseTreeNode(node, '', rootId)];
      });
  }, []);

  const moveImages = useCallback((imageIds: string[], targetFolderId?: string) => {
    if (!imageIds.length) return { movedCount: 0, error: '\uC774\uB3D9\uD560 \uC774\uBBF8\uC9C0\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.' };

    const nodes = imageIds
      .map((id) => findTreeNode(tree, id))
      .filter((node): node is FileNode => Boolean(node && node.type === 'file'));

    if (!nodes.length) {
      return { movedCount: 0, error: '\uC774\uB3D9\uD560 \uC774\uBBF8\uC9C0\uB97C \uCC3E\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.' };
    }

    const target = targetFolderId ? findFolderNode(tree, targetFolderId) : null;
    if (target && nodes.some((node) => node.image.applyReady && node.image.applyRootId !== target.applyRootId)) {
      return { movedCount: 0, error: '\uC11C\uB85C \uB2E4\uB978 \uC2E4\uC81C \uD3F4\uB354 \uCD9C\uCC98 \uC0AC\uC774\uC758 \uC774\uB3D9\uC740 \uC544\uC9C1 \uC9C0\uC6D0\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.' };
    }

    const movedNodes = nodes.map((node) => ({
      ...node,
      image: {
        ...node.image,
        currentFolderPath: target ? (target.isRoot ? '' : target.relativePath) : '',
        applyRootId: target ? target.applyRootId : node.image.applyRootId,
      },
    }));

    setTree((prev) => {
      let next = prev;
      nodes.forEach((node) => {
        next = removeTreeNodeFromList(next, node.id);
      });

      return targetFolderId ? addNodesToFolder(next, targetFolderId, movedNodes) : [...next, ...movedNodes];
    });

    return { movedCount: movedNodes.length, error: undefined };
  }, [tree]);

  const applyChanges = useCallback(async () => {
    if (!applySummary.ready) return { ok: false, message: applySummary.message };

    const changed = allImages.filter(
      (image) => image.name !== image.originalName || image.currentFolderPath !== image.originalFolderPath
    );

    try {
      const result = await applyImageChanges(changed, sourceRoots);
      if (!result.updates) return result;

      setTree((prev) =>
        updateTreeFiles(prev, (node) => {
          const update = result.updates?.get(node.image.id);
          if (!update) return node;
          return {
            ...node,
            name: update.originalName,
            image: {
              ...node.image,
              name: update.originalName,
              originalName: update.originalName,
              originalFolderPath: update.originalFolderPath,
              currentFolderPath: update.originalFolderPath,
              fileHandle: update.fileHandle,
            },
          };
        })
      );

      return result;
    } catch {
      return { ok: false, message: '\uC2E4\uC81C \uC801\uC6A9 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4. \uC801\uC6A9 \uC804\uC5D0 \uBCC0\uACBD \uBAA9\uB85D\uACFC log.txt\uB97C \uB2E4\uC2DC \uD655\uC778\uD574 \uC8FC\uC138\uC694.' };
    }
  }, [allImages, applySummary, sourceRoots]);

  return {
    tree,
    images,
    allImages,
    currentImage,
    currentIndex,
    zoom,
    rotation,
    panOffset,
    gridConfig,
    markedIds,
    markedCount,
    showMarkedOnly,
    pendingRenames,
    pendingMoves,
    pendingChangeCount,
    renameConflicts,
    folderOptions,
    applySummary,
    addImages,
    addWritableFolder,
    addTreeNodes,
    addEntriesAsTree,
    selectImage: (index: number) => selectImage(index, images.length),
    selectImageById: (imageId: string) => {
      const visible = showMarkedOnly ? allImages.filter((image) => markedIds.has(image.id)) : allImages;
      selectImageById(imageId, visible);
    },
    nextImage,
    prevImage,
    zoomIn,
    zoomOut,
    fitToScreen,
    setZoom,
    rotateRight,
    rotateLeft,
    setPanOffset,
    removeImage,
    removeNode: removeNodeFromTree,
    clearAll,
    setGridConfig,
    toggleFolder,
    createFolder,
    moveNodeToFolder,
    moveNodeToRoot,
    moveImages,
    renameImage,
    resetImageName,
    resetAllNames,
    applySequentialRename,
    applyRenamePreset,
    applyChanges,
    toggleMarker,
    toggleCurrentMarker: () => toggleCurrentMarker(currentImage?.id ?? null),
    toggleShowMarkedOnly,
    isMarked,
  };
}
