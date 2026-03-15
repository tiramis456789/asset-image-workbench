import { X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { ImageFile } from '@/hooks/useImageStore';

interface ThumbnailPanelProps {
  images: ImageFile[];
  currentIndex: number;
  onSelect: (index: number) => void;
  onRemove: (index: number) => void;
  isVisible: boolean;
}

export default function ThumbnailPanel({
  images,
  currentIndex,
  onSelect,
  onRemove,
  isVisible,
}: ThumbnailPanelProps) {
  if (images.length === 0) return null;

  return (
    <div
      className={cn(
        'flex flex-col overflow-hidden border-r border-border bg-panel-bg transition-all duration-300 ease-in-out',
        isVisible ? 'w-48' : 'w-0 border-r-0'
      )}
    >
      <div
        className={cn(
          'whitespace-nowrap border-b border-border px-3 py-2 text-xs font-display tracking-wide text-muted-foreground',
          !isVisible && 'opacity-0'
        )}
      >
        파일 ({images.length})
      </div>

      <div className={cn('scrollbar-thin flex-1 space-y-1 overflow-y-auto p-1.5', !isVisible && 'opacity-0')}>
        {images.map((img, i) => (
          <div
            key={img.id}
            onClick={() => onSelect(i)}
            className={cn(
              'group relative cursor-pointer overflow-hidden rounded-sm border-2 transition-all',
              i === currentIndex
                ? 'border-thumbnail-active shadow-[0_0_8px_hsl(var(--thumbnail-active)/0.4)]'
                : 'border-transparent hover:border-thumbnail-border'
            )}
          >
            <img src={img.url} alt={img.name} className="h-24 w-full object-cover" loading="lazy" />

            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-1.5 py-1">
              <p className="truncate text-[10px] text-foreground">{img.name}</p>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove(i);
              }}
              className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-destructive"
              title="썸네일 제거"
            >
              <X size={10} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
