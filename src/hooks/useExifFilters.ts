import { useCallback, useMemo, useState } from 'react';

import { ImageFile } from '@/hooks/useImageStore';
import { ExifInspectionResult, inspectImageExif, normalizePromptTags } from '@/lib/exif';

export type FilterMode = 'name' | 'pin' | 'exif';
export type PinFilterMode = 'all' | 'marked' | 'unmarked';

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

function collectExifTags(result: ExifInspectionResult) {
  if (!result.parsed) return [];

  return Array.from(
    new Set([
      ...normalizePromptTags(result.parsed.prompt ?? ''),
      ...result.parsed.characterPrompts.flatMap((prompt) => normalizePromptTags(prompt)),
    ])
  );
}

export function useExifFilters(images: ImageFile[], isMarked: (imageId: string) => boolean) {
  const [filterMode, setFilterMode] = useState<FilterMode>('name');
  const [nameQuery, setNameQuery] = useState('');
  const [pinFilterMode, setPinFilterMode] = useState<PinFilterMode>('all');
  const [exifQuery, setExifQuery] = useState('');
  const [exifTagCache, setExifTagCache] = useState<Record<string, string[]>>({});
  const [exifTagLoading, setExifTagLoading] = useState(false);

  const activeFilters = useMemo(
    () => ({
      hasName: nameQuery.trim().length > 0,
      hasPin: pinFilterMode !== 'all',
      hasExif: exifQuery.trim().length > 0,
    }),
    [exifQuery, nameQuery, pinFilterMode]
  );

  const filteredImages = useMemo(() => {
    const loweredName = nameQuery.trim().toLocaleLowerCase();
    const loweredExif = exifQuery.trim().toLocaleLowerCase();

    return images.filter((image) => {
      if (activeFilters.hasName && !image.name.toLocaleLowerCase().includes(loweredName)) {
        return false;
      }

      if (pinFilterMode === 'marked' && !isMarked(image.id)) {
        return false;
      }

      if (pinFilterMode === 'unmarked' && isMarked(image.id)) {
        return false;
      }

      if (activeFilters.hasExif) {
        const tags = exifTagCache[image.id] ?? [];
        if (!tags.some((tag) => tag.toLocaleLowerCase().includes(loweredExif))) {
          return false;
        }
      }

      return true;
    });
  }, [activeFilters.hasExif, activeFilters.hasName, exifQuery, exifTagCache, images, isMarked, nameQuery, pinFilterMode]);

  const knownExifTags = useMemo(
    () =>
      Array.from(
        new Set(
          Object.entries(exifTagCache)
            .filter(([id]) => images.some((image) => image.id === id))
            .flatMap(([, tags]) => tags)
        )
      ).sort((a, b) => a.localeCompare(b)),
    [exifTagCache, images]
  );

  const exifIndexedCount = useMemo(
    () => images.filter((image) => (exifTagCache[image.id] ?? []).length > 0).length,
    [exifTagCache, images]
  );

  const filterSummary = activeFilters.hasName || activeFilters.hasPin || activeFilters.hasExif ? `${filteredImages.length} / ${images.length}개` : '';

  const loadExifTagsForFilter = useCallback(async () => {
    if (images.length === 0) return;

    setExifTagLoading(true);
    try {
      const entries = await Promise.all(
        images.map(async (image) => {
          try {
            const file = await buildFileFromImage(image);
            const result = await inspectImageExif(file);
            return [image.id, collectExifTags(result)] as const;
          } catch {
            return [image.id, []] as const;
          }
        })
      );

      setExifTagCache((prev) => ({
        ...prev,
        ...Object.fromEntries(entries),
      }));
    } finally {
      setExifTagLoading(false);
    }
  }, [images]);

  const resetFilters = useCallback(() => {
    setNameQuery('');
    setPinFilterMode('all');
    setExifQuery('');
    setFilterMode('name');
  }, []);

  return {
    filterMode,
    nameQuery,
    pinFilterMode,
    exifQuery,
    exifTagLoading,
    filteredImages,
    knownExifTags,
    exifIndexedCount,
    filterSummary,
    setFilterMode,
    setNameQuery,
    setPinFilterMode,
    setExifQuery,
    loadExifTagsForFilter,
    resetFilters,
  };
}
