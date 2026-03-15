import { useCallback, useEffect, useState } from 'react';

export function useViewerState() {
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [gridConfig, setGridConfig] = useState({ rows: 1, cols: 1 });
  const [markedIds, setMarkedIds] = useState<Set<string>>(new Set());
  const [showMarkedOnly, setShowMarkedOnly] = useState(false);

  useEffect(() => {
    if (showMarkedOnly && markedIds.size === 0) {
      setShowMarkedOnly(false);
      setCurrentIndex((value) => (value >= 0 ? 0 : -1));
    }
  }, [markedIds, showMarkedOnly]);

  const resetViewport = useCallback(() => {
    setZoom(1);
    setRotation(0);
    setPanOffset({ x: 0, y: 0 });
  }, []);

  const selectImage = useCallback(
    (index: number, totalCount: number) => {
      if (totalCount === 0) {
        setCurrentIndex(-1);
        return;
      }

      const clamped = Math.max(0, Math.min(index, totalCount - 1));
      setCurrentIndex(clamped);
      resetViewport();
    },
    [resetViewport]
  );

  const selectImageById = useCallback(
    <T extends { id: string }>(imageId: string, visibleImages: T[]) => {
      const idx = visibleImages.findIndex((image) => image.id === imageId);
      if (idx < 0) return;
      setCurrentIndex(idx);
      resetViewport();
    },
    [resetViewport]
  );

  const moveSelection = useCallback(
    (delta: number, totalCount: number) => {
      if (totalCount === 0) return;
      selectImage(currentIndex + delta, totalCount);
    },
    [currentIndex, selectImage]
  );

  const clampCurrentIndex = useCallback((totalCount: number) => {
    if (totalCount === 0) {
      setCurrentIndex(-1);
      return;
    }

    setCurrentIndex((value) => Math.min(Math.max(value, 0), totalCount - 1));
  }, []);

  const setFirstImageOnAdd = useCallback((hadImages: boolean, addedCount: number) => {
    if (!hadImages && addedCount > 0) setCurrentIndex(0);
  }, []);

  const removeImageAt = useCallback(
    (index: number, totalCount: number) => {
      if (totalCount <= 1) {
        setCurrentIndex(-1);
        return;
      }

      if (index <= currentIndex) {
        setCurrentIndex(Math.max(0, currentIndex - 1));
      }
    },
    [currentIndex]
  );

  const toggleMarker = useCallback((imageId: string) => {
    setMarkedIds((prev) => {
      const next = new Set(prev);
      if (next.has(imageId)) next.delete(imageId);
      else next.add(imageId);
      return next;
    });
  }, []);

  const toggleCurrentMarker = useCallback(
    (imageId: string | null) => {
      if (imageId) toggleMarker(imageId);
    },
    [toggleMarker]
  );

  const toggleShowMarkedOnly = useCallback(() => {
    setShowMarkedOnly((value) => !value);
    setCurrentIndex((value) => (value >= 0 ? 0 : -1));
  }, []);

  const clearSelectionState = useCallback(() => {
    setMarkedIds(new Set());
    setCurrentIndex(-1);
  }, []);

  const isMarked = useCallback((imageId: string) => markedIds.has(imageId), [markedIds]);
  const zoomIn = useCallback(() => setZoom((value) => Math.min(value * 1.25, 10)), []);
  const zoomOut = useCallback(() => setZoom((value) => Math.max(value / 1.25, 0.1)), []);
  const fitToScreen = useCallback(() => {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
  }, []);
  const rotateRight = useCallback(() => setRotation((value) => (value + 90) % 360), []);
  const rotateLeft = useCallback(() => setRotation((value) => (value - 90 + 360) % 360), []);

  return {
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
    resetViewport,
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
  };
}
