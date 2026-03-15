import type { Dispatch, SetStateAction } from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { TreeNode } from '@/hooks/useImageStore';
import { useImageRename } from '@/hooks/useImageRename';

function createTree(): TreeNode[] {
  return [
    {
      id: 'file-1',
      name: 'alpha one.png',
      type: 'file',
      image: {
        id: 'img-1',
        name: 'alpha one.png',
        originalName: 'alpha one.png',
        originalFolderPath: '',
        currentFolderPath: '',
        url: 'blob:1',
        size: 10,
        type: 'image/png',
        lastModified: 1,
        applyRootId: null,
        fileHandle: null,
        applyReady: false,
      },
    },
    {
      id: 'folder-1',
      name: 'folder',
      type: 'folder',
      children: [
        {
          id: 'file-2',
          name: 'beta_two.webp',
          type: 'file',
          image: {
            id: 'img-2',
            name: 'beta_two.webp',
            originalName: 'beta_two.webp',
            originalFolderPath: 'folder',
            currentFolderPath: 'folder',
            url: 'blob:2',
            size: 20,
            type: 'image/webp',
            lastModified: 2,
            applyRootId: null,
            fileHandle: null,
            applyReady: false,
          },
        },
      ],
      expanded: true,
      relativePath: 'folder',
      applyRootId: null,
      isRoot: false,
    },
  ];
}

function runTreeUpdate(
  action: (setTree: Dispatch<SetStateAction<TreeNode[]>>) => void,
  initialTree = createTree()
) {
  let nextTree = initialTree;
  const setTree = vi.fn((updater: SetStateAction<TreeNode[]>) => {
    nextTree = typeof updater === 'function' ? updater(nextTree) : updater;
  });

  action(setTree);
  return { nextTree, setTree };
}

describe('useImageRename', () => {
  it('renames one image and preserves the original extension when omitted', () => {
    const { nextTree } = runTreeUpdate((setTree) => {
      const { result } = renderHook(() => useImageRename(setTree, new Set()));
      result.current.renameImage('img-1', 'hero');
    });

    const file = nextTree[0];
    expect(file.type).toBe('file');
    if (file.type === 'file') {
      expect(file.image.name).toBe('hero.png');
      expect(file.name).toBe('hero.png');
    }
  });

  it('applies sequential rename in the current tree order', () => {
    const { nextTree } = runTreeUpdate((setTree) => {
      const { result } = renderHook(() => useImageRename(setTree, new Set()));
      const changed = result.current.applySequentialRename({
        prefix: 'shot_',
        suffix: '',
        start: 7,
        padding: 3,
        markedOnly: false,
      });
      expect(changed).toBe(2);
    });

    const first = nextTree[0];
    const second = nextTree[1];
    expect(first.type).toBe('file');
    expect(second.type).toBe('folder');
    if (first.type === 'file') {
      expect(first.image.name).toBe('shot_007.png');
    }
    if (second.type === 'folder') {
      const child = second.children[0];
      expect(child.type).toBe('file');
      if (child.type === 'file') {
        expect(child.image.name).toBe('shot_008.webp');
      }
    }
  });

  it('resets all names back to their original values after a preset rename', () => {
    let nextTree = createTree();
    const setTree = vi.fn((updater: SetStateAction<TreeNode[]>) => {
      nextTree = typeof updater === 'function' ? updater(nextTree) : updater;
    });
    const { result } = renderHook(() => useImageRename(setTree, new Set()));

    result.current.applyRenamePreset('spaces_to_underscores', false);
    result.current.resetAllNames();

    const rootFile = nextTree[0];
    const nestedFile = nextTree[1];
    expect(rootFile.type).toBe('file');
    expect(nestedFile.type).toBe('folder');
    if (rootFile.type === 'file') {
      expect(rootFile.image.name).toBe('alpha one.png');
    }
    if (nestedFile.type === 'folder') {
      const child = nestedFile.children[0];
      expect(child.type).toBe('file');
      if (child.type === 'file') {
        expect(child.image.name).toBe('beta_two.webp');
      }
    }
  });
});
