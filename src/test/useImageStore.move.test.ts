import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { FileNode, FolderNode, ImageFile, TreeNode } from '@/hooks/useImageStore';
import { useImageStore } from '@/hooks/useImageStore';

function createImage(id: string, name: string, folderPath = '', overrides: Partial<ImageFile> = {}): ImageFile {
  return {
    id,
    name,
    originalName: name,
    originalFolderPath: folderPath,
    currentFolderPath: folderPath,
    url: `blob:${id}`,
    size: 10,
    type: 'image/png',
    lastModified: 1,
    applyRootId: null,
    fileHandle: null,
    applyReady: false,
    ...overrides,
  };
}

function createFileNode(image: ImageFile): FileNode {
  return {
    id: image.id,
    name: image.name,
    type: 'file',
    image,
  };
}

function createFolderNode(id: string, name: string, relativePath: string, children: TreeNode[] = [], overrides: Partial<FolderNode> = {}): FolderNode {
  return {
    id,
    name,
    type: 'folder',
    children,
    expanded: true,
    relativePath,
    applyRootId: null,
    isRoot: false,
    ...overrides,
  };
}

describe('useImageStore movement', () => {
  it('moves selected images into a folder and updates their virtual path', () => {
    const { result } = renderHook(() => useImageStore());
    const targetFolder = createFolderNode('folder-1', 'target', 'target');
    const imageA = createFileNode(createImage('img-1', 'alpha.png'));
    const imageB = createFileNode(createImage('img-2', 'beta.png'));

    act(() => {
      result.current.addTreeNodes([imageA, imageB, targetFolder]);
    });

    let moveResult: ReturnType<typeof result.current.moveImages> | undefined;
    act(() => {
      moveResult = result.current.moveImages(['img-1', 'img-2'], 'folder-1');
    });

    expect(moveResult).toEqual({ movedCount: 2, error: undefined });
    expect(result.current.allImages.map((image) => image.currentFolderPath)).toEqual(['target', 'target']);
    expect(result.current.pendingMoves).toHaveLength(2);
  });

  it('moves a nested file node back to root', () => {
    const { result } = renderHook(() => useImageStore());
    const nestedImage = createFileNode(createImage('img-1', 'nested.png', 'target'));
    const targetFolder = createFolderNode('folder-1', 'target', 'target', [nestedImage]);

    act(() => {
      result.current.addTreeNodes([targetFolder]);
    });

    act(() => {
      result.current.moveNodeToRoot('img-1');
    });

    expect(result.current.tree[0].type).toBe('folder');
    expect(result.current.tree[1].type).toBe('file');
    const rootFile = result.current.tree[1];
    if (rootFile.type === 'file') {
      expect(rootFile.image.currentFolderPath).toBe('');
    }
  });

  it('blocks moving writable images across different apply roots', () => {
    const { result } = renderHook(() => useImageStore());
    const sourceImage = createFileNode(
      createImage('img-1', 'writable.png', '', {
        applyReady: true,
        applyRootId: 'root-a',
      })
    );
    const targetFolder = createFolderNode('folder-1', 'other-root', 'other-root', [], {
      applyRootId: 'root-b',
    });

    act(() => {
      result.current.addTreeNodes([sourceImage, targetFolder]);
    });

    let moveResult: ReturnType<typeof result.current.moveImages> | undefined;
    act(() => {
      moveResult = result.current.moveImages(['img-1'], 'folder-1');
    });

    expect(moveResult?.movedCount).toBe(0);
    expect(moveResult?.error).toContain('\uC11C\uB85C \uB2E4\uB978');
    expect(result.current.allImages[0].currentFolderPath).toBe('');
  });
});
