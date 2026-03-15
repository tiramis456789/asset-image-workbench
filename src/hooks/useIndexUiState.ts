import { useCallback, useEffect, useRef, useState } from 'react';

import { ImageFile } from '@/hooks/useImageStore';
import { ExifInspectionResult, inspectImageExif } from '@/lib/exif';

type ThemeMode = 'system' | 'light' | 'dark';

type ExifMenuState = {
  imageId: string;
  x: number;
  y: number;
} | null;

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

export function useIndexUiState(params: {
  currentIndex: number;
  currentImageId: string | null;
  imageCount: number;
  gridRows: number;
  gridCols: number;
  allImages: ImageFile[];
  toggleMarker: (imageId: string) => void;
}) {
  const { currentIndex, currentImageId, imageCount, gridRows, gridCols, allImages, toggleMarker } = params;
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const saved = window.localStorage.getItem('asset-image-workbench-theme');
    return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system';
  });
  const [showInfo, setShowInfo] = useState(false);
  const [showPanel, setShowPanel] = useState(true);
  const [showFilmstrip, setShowFilmstrip] = useState(true);
  const [showRename, setShowRename] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [showApplyPreview, setShowApplyPreview] = useState(false);
  const [gridAnchorIndex, setGridAnchorIndex] = useState(0);
  const [hoveredImageId, setHoveredImageId] = useState<string | null>(null);
  const [exifMenu, setExifMenu] = useState<ExifMenuState>(null);
  const [showExifDialog, setShowExifDialog] = useState(false);
  const [exifTargetName, setExifTargetName] = useState('');
  const [exifLoading, setExifLoading] = useState(false);
  const [exifResult, setExifResult] = useState<ExifInspectionResult | null>(null);
  const [exifError, setExifError] = useState('');
  const wasGridModeRef = useRef(false);

  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const syncTheme = () => {
      const useDark = themeMode === 'dark' || (themeMode === 'system' && media.matches);
      root.classList.toggle('dark', useDark);
    };

    syncTheme();
    window.localStorage.setItem('asset-image-workbench-theme', themeMode);
    media.addEventListener('change', syncTheme);

    return () => media.removeEventListener('change', syncTheme);
  }, [themeMode]);

  useEffect(() => {
    const isGridMode = gridRows > 1 || gridCols > 1;
    const wasGridMode = wasGridModeRef.current;
    wasGridModeRef.current = isGridMode;

    if (!isGridMode) {
      setGridAnchorIndex(currentIndex >= 0 ? currentIndex : 0);
      return;
    }

    setGridAnchorIndex((prev) => {
      const cellCount = gridRows * gridCols;
      const maxAnchor = Math.max(0, imageCount - cellCount);
      if (!wasGridMode) {
        return currentIndex < 0 ? 0 : Math.min(currentIndex, maxAnchor);
      }
      return Math.min(prev, maxAnchor);
    });
  }, [currentIndex, gridCols, gridRows, imageCount]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return;
      }

      if (event.key.toLowerCase() !== 'q') return;

      const targetId = hoveredImageId ?? currentImageId;
      if (!targetId) return;

      event.preventDefault();
      toggleMarker(targetId);
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [currentImageId, hoveredImageId, toggleMarker]);

  useEffect(() => {
    if (!exifMenu) return;

    const closeMenu = () => setExifMenu(null);
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExifMenu(null);
    };

    window.addEventListener('click', closeMenu);
    window.addEventListener('keydown', closeOnEscape);

    return () => {
      window.removeEventListener('click', closeMenu);
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [exifMenu]);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen();
  }, []);

  const openExifDialog = useCallback(
    async (imageId: string) => {
      const image = allImages.find((item) => item.id === imageId);
      if (!image) return;

      setExifMenu(null);
      setExifTargetName(image.name);
      setExifResult(null);
      setExifError('');
      setExifLoading(true);
      setShowExifDialog(true);

      try {
        const file = await buildFileFromImage(image);
        const result = await inspectImageExif(file);
        setExifResult(result);
      } catch (error) {
        setExifError(error instanceof Error ? error.message : '메타데이터를 읽지 못했습니다.');
      } finally {
        setExifLoading(false);
      }
    },
    [allImages]
  );

  return {
    themeMode,
    showInfo,
    showPanel,
    showFilmstrip,
    showRename,
    showSearch,
    showApplyPreview,
    gridAnchorIndex,
    hoveredImageId,
    exifMenu,
    showExifDialog,
    exifTargetName,
    exifLoading,
    exifResult,
    exifError,
    setThemeMode,
    setShowInfo,
    setShowPanel,
    setShowFilmstrip,
    setShowRename,
    setShowSearch,
    setShowApplyPreview,
    setHoveredImageId,
    setExifMenu,
    setShowExifDialog,
    toggleFullscreen,
    openExifDialog,
  };
}
