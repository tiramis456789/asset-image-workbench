import { useRef, useState, useCallback, useEffect } from 'react';
import { ImagePlus, Image, Pin } from 'lucide-react';

import { cn } from '@/lib/utils';
import { ImageFile } from '@/hooks/useImageStore';

interface ImageCanvasProps {
  image: ImageFile | null;
  zoom: number;
  rotation: number;
  panOffset: { x: number; y: number };
  onPanChange: (offset: { x: number; y: number }) => void;
  onZoomChange: (zoom: number) => void;
  onAddImages: (files: File[]) => void;
  onAddEntriesAsTree: (entries: FileSystemEntry[]) => Promise<void>;
  onAddWritableFoldersFromPaths: (paths: string[]) => Promise<void>;
  onNext: () => void;
  onPrev: () => void;
  gridConfig: { rows: number; cols: number };
  images: ImageFile[];
  currentIndex: number;
  gridAnchorIndex: number;
  onSelectImage: (index: number) => void;
  onToggleMarker: (imageId: string) => void;
  isMarked: (imageId: string) => boolean;
  onHoverImage: (imageId: string | null) => void;
}

export default function ImageCanvas({
  image,
  zoom,
  rotation,
  panOffset,
  onPanChange,
  onZoomChange,
  onAddImages,
  onAddEntriesAsTree,
  onAddWritableFoldersFromPaths,
  onNext,
  onPrev,
  gridConfig,
  images,
  currentIndex,
  gridAnchorIndex,
  onSelectImage,
  onToggleMarker,
  isMarked,
  onHoverImage,
}: ImageCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragOver, setDragOver] = useState(false);

  const isGridMode = gridConfig.rows > 1 || gridConfig.cols > 1;
  const gridCellCount = gridConfig.rows * gridConfig.cols;

  const addDroppedFiles = useCallback(
    (files: File[]) => {
      const imageFiles = files.filter((file) => file.type.startsWith('image/'));
      if (imageFiles.length > 0) {
        onAddImages(imageFiles);
      }
    },
    [onAddImages]
  );

  const resolveDroppedPath = useCallback(
    (file: File) => file.path ?? window.assetImageWorkbench?.getPathForFile(file) ?? null,
    []
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (isGridMode) return;

      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      onZoomChange(Math.min(Math.max(zoom * factor, 0.1), 10));
    },
    [zoom, onZoomChange, isGridMode]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (isGridMode || e.button !== 0) return;

      setDragging(true);
      setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    },
    [panOffset, isGridMode]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging) return;
      onPanChange({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    },
    [dragging, dragStart, onPanChange]
  );

  const handleMouseUp = useCallback(() => {
    setDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);

      const droppedFiles = Array.from(e.dataTransfer.files);
      const droppedPaths = droppedFiles.map((file) => resolveDroppedPath(file)).filter((value): value is string => Boolean(value));
      if (window.assetImageWorkbench && droppedPaths.length > 0) {
        const inspected = await window.assetImageWorkbench.inspectPaths(droppedPaths);
        const directoryPaths = inspected.filter((entry) => entry.kind === 'directory').map((entry) => entry.path);
        if (directoryPaths.length > 0) {
          await onAddWritableFoldersFromPaths(Array.from(new Set(directoryPaths)));

          const imageFiles = droppedFiles.filter((file) => file.type.startsWith('image/'));
          if (imageFiles.length > 0) addDroppedFiles(imageFiles);
          return;
        }
      }

      const imageFiles = droppedFiles.filter((file) => file.type.startsWith('image/'));
      if (imageFiles.length > 0) {
        addDroppedFiles(imageFiles);
        return;
      }

      const items = Array.from(e.dataTransfer.items);
      const entries = items.map((item) => item.webkitGetAsEntry()).filter(Boolean) as FileSystemEntry[];
      if (entries.length === 0) return;

      const hasDirectories = entries.some((entry) => entry.isDirectory);
      if (hasDirectories) {
        await onAddEntriesAsTree(entries);
        return;
      }

      const files = items.map((item) => item.getAsFile()).filter(Boolean) as File[];
      addDroppedFiles(files);
    },
    [addDroppedFiles, onAddEntriesAsTree, onAddWritableFoldersFromPaths, resolveDroppedPath]
  );

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const target = e.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return;
      }

      if (e.key === 'ArrowRight') onNext();
      else if (e.key === 'ArrowLeft') onPrev();
      else if (e.key === '+' || e.key === '=') onZoomChange(Math.min(zoom * 1.25, 10));
      else if (e.key === '-') onZoomChange(Math.max(zoom / 1.25, 0.1));
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onNext, onPrev, zoom, onZoomChange]);

  const getGridImages = () => {
    const result: (ImageFile | null)[] = [];
    for (let i = 0; i < gridCellCount; i += 1) {
      const imgIndex = gridAnchorIndex + i;
      result.push(imgIndex < images.length ? images[imgIndex] : null);
    }
    return result;
  };

  if (!image && images.length === 0) {
    return (
      <div
        className="flex-1 flex items-center justify-center bg-viewer-bg"
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
      >
        <div
          className={cn(
            'flex flex-col items-center gap-4 rounded-lg border-2 border-dashed p-12 transition-colors',
            dragOver ? 'border-primary bg-primary/5' : 'border-border'
          )}
        >
          <ImagePlus size={48} className="text-muted-foreground" />
          <div className="text-center">
            <p className="font-display text-sm text-foreground">폴더를 열거나 이미지를 드래그해 주세요</p>
            <p className="mt-1 text-xs text-muted-foreground">
              상단 버튼은 폴더를 열고, 이미지는 드래그로 바로 추가할 수 있습니다
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isGridMode) {
    const gridImages = getGridImages();

    return (
      <div
        ref={containerRef}
        className="relative flex-1 overflow-hidden bg-viewer-bg"
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
      >
        {dragOver && (
          <div className="absolute inset-0 z-10 flex items-center justify-center border-2 border-dashed border-primary bg-primary/10">
            <p className="font-display text-sm text-primary">이미지 추가하기</p>
          </div>
        )}

        <div
          className="grid h-full w-full gap-1 p-1"
          style={{
            gridTemplateRows: `repeat(${gridConfig.rows}, 1fr)`,
            gridTemplateColumns: `repeat(${gridConfig.cols}, 1fr)`,
          }}
        >
          {gridImages.map((img, idx) => {
            const actualIndex = gridAnchorIndex + idx;
            const marked = img ? isMarked(img.id) : false;
            const isSelected = actualIndex === currentIndex;

            return (
              <div
                key={idx}
                className={cn(
                  'group relative cursor-pointer overflow-hidden rounded-sm border transition-all',
                  img
                    ? isSelected
                      ? 'border-thumbnail-active shadow-[0_0_0_1px_hsl(var(--thumbnail-active)),0_0_10px_hsl(var(--thumbnail-active)/0.35)]'
                      : 'border-border hover:border-primary/50'
                    : 'border-border/30 bg-muted/10'
                )}
                onClick={() => img && onSelectImage(actualIndex)}
                onMouseEnter={() => onHoverImage(img?.id ?? null)}
                onMouseLeave={() => onHoverImage(null)}
              >
                {img ? (
                  <>
                    <img
                      src={img.url}
                      alt={img.name}
                      draggable={false}
                      className="h-full w-full select-none object-contain"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleMarker(img.id);
                      }}
                      className={cn(
                        'absolute left-1 top-1 z-10 flex h-5 w-5 items-center justify-center rounded-sm transition-all',
                        marked
                          ? 'bg-primary/20 text-primary'
                          : 'bg-overlay-bg/50 text-foreground/50 opacity-0 group-hover:opacity-100'
                      )}
                      title={marked ? '핀 해제' : '핀 추가'}
                    >
                      <Pin size={12} className={marked ? 'fill-primary' : ''} />
                    </button>
                    <div className="absolute bottom-1 left-1 rounded bg-overlay-bg/70 px-1.5 py-0.5 text-[10px] font-display text-foreground">
                      {actualIndex + 1}
                    </div>
                  </>
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Image size={24} className="text-muted-foreground/30" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative flex-1 overflow-hidden bg-viewer-bg cursor-grab active:cursor-grabbing"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDrop={handleDrop}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
    >
      {dragOver && (
        <div className="absolute inset-0 z-10 flex items-center justify-center border-2 border-dashed border-primary bg-primary/10">
          <p className="font-display text-sm text-primary">이미지 추가하기</p>
        </div>
      )}

      <div className="flex h-full w-full items-center justify-center">
        <img
          src={image!.url}
          alt={image!.name}
          draggable={false}
          className="max-w-none select-none"
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom}) rotate(${rotation}deg)`,
            transition: dragging ? 'none' : 'transform 0.15s ease-out',
          }}
        />
      </div>
    </div>
  );
}
