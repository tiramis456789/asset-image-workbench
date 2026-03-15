import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ImageFile } from '@/hooks/useImageStore';
import { useExifFilters } from '@/hooks/useExifFilters';

const inspectImageExifMock = vi.fn();

vi.mock('@/lib/exif', async () => {
  const actual = await vi.importActual<typeof import('@/lib/exif')>('@/lib/exif');
  return {
    ...actual,
    inspectImageExif: (...args: unknown[]) => inspectImageExifMock(...args),
  };
});

function createImage(id: string, name: string): ImageFile {
  return {
    id,
    name,
    originalName: name,
    originalFolderPath: '',
    currentFolderPath: '',
    url: `blob:${id}`,
    size: 10,
    type: 'image/png',
    lastModified: 1,
    applyRootId: null,
    fileHandle: {
      getFile: async () => new File(['image'], name, { type: 'image/png' }),
    } as FileSystemFileHandle,
    applyReady: false,
  };
}

describe('useExifFilters', () => {
  it('loads and normalizes EXIF tags for filtering', async () => {
    inspectImageExifMock
      .mockResolvedValueOnce({
        parsed: {
          prompt: 'alice, (smile)',
          characterPrompts: ['armor, alice'],
        },
      })
      .mockResolvedValueOnce({
        parsed: {
          prompt: 'forest, sunset',
          characterPrompts: [],
        },
      });

    const images = [createImage('img-1', 'alpha.png'), createImage('img-2', 'beta.png')];
    const { result } = renderHook(() => useExifFilters(images, () => false));

    await act(async () => {
      await result.current.loadExifTagsForFilter();
    });

    expect(result.current.exifIndexedCount).toBe(2);
    expect(result.current.knownExifTags).toEqual(['alice', 'armor', 'forest', 'smile', 'sunset']);
  });

  it('combines name, pin, and EXIF filters correctly', async () => {
    inspectImageExifMock
      .mockResolvedValueOnce({
        parsed: {
          prompt: 'alice, armor',
          characterPrompts: [],
        },
      })
      .mockResolvedValueOnce({
        parsed: {
          prompt: 'forest, sunset',
          characterPrompts: [],
        },
      });

    const images = [createImage('img-1', 'alpha-shot.png'), createImage('img-2', 'beta-shot.png')];
    const isMarked = (imageId: string) => imageId === 'img-1';
    const { result } = renderHook(() => useExifFilters(images, isMarked));

    await act(async () => {
      await result.current.loadExifTagsForFilter();
    });

    act(() => {
      result.current.setNameQuery('shot');
      result.current.setPinFilterMode('marked');
      result.current.setExifQuery('armor');
    });

    expect(result.current.filteredImages.map((image) => image.id)).toEqual(['img-1']);
    expect(result.current.filterSummary).toBe('1 / 2개');
  });

  it('resets all filter controls back to their defaults', () => {
    const images = [createImage('img-1', 'alpha.png')];
    const { result } = renderHook(() => useExifFilters(images, () => true));

    act(() => {
      result.current.setFilterMode('exif');
      result.current.setNameQuery('alpha');
      result.current.setPinFilterMode('marked');
      result.current.setExifQuery('hero');
    });

    act(() => {
      result.current.resetFilters();
    });

    expect(result.current.filterMode).toBe('name');
    expect(result.current.nameQuery).toBe('');
    expect(result.current.pinFilterMode).toBe('all');
    expect(result.current.exifQuery).toBe('');
    expect(result.current.filterSummary).toBe('');
  });
});
