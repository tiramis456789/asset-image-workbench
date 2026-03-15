import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ImageFile } from '@/hooks/useImageStore';
import { useTagListEditor } from '@/components/viewer/rename-workbench/useTagListEditor';
import type { TemplateBlock } from '@/components/viewer/rename-workbench/shared';

const inspectImageExifMock = vi.fn();

vi.mock('@/lib/exif', () => ({
  inspectImageExif: (...args: unknown[]) => inspectImageExifMock(...args),
}));

function createImage(): ImageFile {
  return {
    id: 'img-1',
    name: 'sample.png',
    originalName: 'sample.png',
    originalFolderPath: '',
    currentFolderPath: '',
    url: 'blob:sample',
    size: 10,
    type: 'image/png',
    lastModified: 1,
    applyRootId: null,
    fileHandle: {
      getFile: async () => new File(['image'], 'sample.png', { type: 'image/png' }),
    } as FileSystemFileHandle,
    applyReady: false,
  };
}

function createBlocks(): TemplateBlock[] {
  return [
    {
      id: 'block-1',
      label: 'character',
      values: ['alice'],
      selectedValue: '',
      draftValue: '',
    },
    {
      id: 'block-2',
      label: 'emotion',
      values: [],
      selectedValue: '',
      draftValue: '',
    },
  ];
}

describe('useTagListEditor', () => {
  it('loads EXIF prompt tags into the active editor bucket', async () => {
    inspectImageExifMock.mockResolvedValue({
      parsed: {
        prompt: 'alice, armor',
        characterPrompts: ['smile, alice'],
      },
    });
    const setStatus = vi.fn();
    const updateBlock = vi.fn();
    const removeBlockValue = vi.fn();

    const { result } = renderHook(() =>
      useTagListEditor({
        currentImage: createImage(),
        blocks: createBlocks(),
        updateBlock,
        removeBlockValue,
        setStatus,
      })
    );

    act(() => {
      result.current.setTagListEditor({ key: 'character', label: 'character' });
    });

    await act(async () => {
      await result.current.loadExifTagsIntoEditor();
    });

    expect(result.current.activePreviewTags).toEqual(['alice', 'armor', 'smile']);
    expect(setStatus).toHaveBeenLastCalledWith('EXIF 태그 3개를 불러왔습니다.');
  });

  it('merges manual tags uniquely and clears the active input', () => {
    const setStatus = vi.fn();
    const updateBlock = vi.fn();
    const removeBlockValue = vi.fn();

    const { result } = renderHook(() =>
      useTagListEditor({
        currentImage: createImage(),
        blocks: createBlocks(),
        updateBlock,
        removeBlockValue,
        setStatus,
      })
    );

    act(() => {
      result.current.setTagListEditor({ key: 'character', label: 'character' });
    });
    act(() => {
      result.current.setActiveTagInput('alice, hero, hero');
    });
    act(() => {
      result.current.applyManualTagsToEditor();
    });

    expect(result.current.activePreviewTags).toEqual(['alice', 'hero']);
    expect(result.current.activeTagInput).toBe('');
    expect(setStatus).toHaveBeenLastCalledWith('수동 입력 태그를 후보에 추가했습니다.');
  });

  it('adds a preview tag into the matching block and can remove it again', () => {
    let blocks = createBlocks();
    const setStatus = vi.fn();
    const updateBlock = vi.fn((blockId: string, updater: (block: TemplateBlock) => TemplateBlock) => {
      blocks = blocks.map((block) => (block.id === blockId ? updater(block) : block));
    });
    const removeBlockValue = vi.fn((blockId: string, value: string) => {
      blocks = blocks.map((block) =>
        block.id === blockId
          ? {
              ...block,
              values: block.values.filter((item) => item !== value),
              selectedValue: block.selectedValue === value ? '' : block.selectedValue,
            }
          : block
      );
    });

    const { result, rerender } = renderHook(
      ({ currentBlocks }) =>
        useTagListEditor({
          currentImage: createImage(),
          blocks: currentBlocks,
          updateBlock,
          removeBlockValue,
          setStatus,
        }),
      {
        initialProps: { currentBlocks: blocks },
      }
    );

    act(() => {
      result.current.setTagListEditor({ key: 'emotion', label: 'emotion' });
    });
    act(() => {
      result.current.setActiveTagInput('happy');
    });
    act(() => {
      result.current.applyManualTagsToEditor();
    });
    act(() => {
      result.current.applyPreviewTagToBlock('happy');
    });
    rerender({ currentBlocks: blocks });

    expect(blocks[1].values).toEqual(['happy']);
    expect(result.current.activeBlockValues).toEqual(['happy']);
    expect(setStatus).toHaveBeenLastCalledWith('"happy" 태그를 emotion 블록에 추가했습니다.');

    act(() => {
      result.current.removeBlockTagFromEditor('happy');
    });
    rerender({ currentBlocks: blocks });

    expect(blocks[1].values).toEqual([]);
    expect(removeBlockValue).toHaveBeenCalledWith('block-2', 'happy');
    expect(setStatus).toHaveBeenLastCalledWith('"happy" 태그를 emotion 블록에서 제거했습니다.');
  });
});
