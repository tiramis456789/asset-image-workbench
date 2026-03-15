import { ImageFile } from '@/hooks/useImageStore';
import { cn } from '@/lib/utils';
import { useRef, useEffect } from 'react';
import { Pin } from 'lucide-react';

interface FilmstripProps {
  images: ImageFile[];
  currentIndex: number;
  onSelect: (index: number) => void;
  onToggleMarker: (imageId: string) => void;
  isMarked: (imageId: string) => boolean;
  isVisible: boolean;
  onHoverImage: (imageId: string | null) => void;
}

export default function Filmstrip({ images, currentIndex, onSelect, onToggleMarker, isMarked, isVisible, onHoverImage }: FilmstripProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current && currentIndex >= 0) {
      const thumb = scrollRef.current.children[currentIndex] as HTMLElement;
      thumb?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [currentIndex]);

  if (images.length === 0) return null;

  return (
    <div 
      className={cn(
        "bg-filmstrip-bg border-t border-border flex-shrink-0 transition-all duration-300 ease-in-out overflow-hidden",
        isVisible ? "h-20" : "h-0 border-t-0"
      )}
    >
      <div 
        ref={scrollRef} 
        className={cn(
          "h-full flex items-center gap-1 px-2 overflow-x-auto scrollbar-thin transition-opacity duration-200",
          !isVisible && "opacity-0"
        )}
      >
        {images.map((img, i) => {
          const marked = isMarked(img.id);
          return (
            <div
              key={img.id}
              onClick={() => onSelect(i)}
              onMouseEnter={() => onHoverImage(img.id)}
              onMouseLeave={() => onHoverImage(null)}
              className={cn(
                "group relative flex-shrink-0 h-16 w-20 rounded-sm overflow-hidden cursor-pointer border-2 transition-all hover:brightness-110",
                i === currentIndex
                  ? "border-thumbnail-active shadow-[0_0_6px_hsl(var(--thumbnail-active)/0.5)]"
                  : "border-transparent opacity-60 hover:opacity-100"
              )}
            >
              <img src={img.url} alt={img.name} className="w-full h-full object-cover" loading="lazy" />
              <button
                onClick={(e) => { e.stopPropagation(); onToggleMarker(img.id); }}
                className={cn(
                  "absolute top-0.5 left-0.5 w-4 h-4 flex items-center justify-center rounded-sm transition-all",
                  marked
                    ? "text-primary bg-primary/20"
                    : "text-foreground/40 bg-overlay-bg/40 opacity-0 group-hover:opacity-100 hover:opacity-100"
                )}
                style={{ opacity: marked ? 1 : undefined }}
              >
                <Pin size={10} className={marked ? 'fill-primary' : ''} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
