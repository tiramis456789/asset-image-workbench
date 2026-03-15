import { ImageFile } from '@/hooks/useImageStore';
import { X } from 'lucide-react';

interface ImageInfoProps {
  image: ImageFile | null;
  zoom: number;
  onClose: () => void;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export default function ImageInfo({ image, zoom, onClose }: ImageInfoProps) {
  if (!image) return null;

  const rows = [
    ['\uD30C\uC77C\uBA85', image.name],
    ['\uD615\uC2DD', image.type],
    ['\uD06C\uAE30', formatSize(image.size)],
    ['\uBC30\uC728', `${Math.round(zoom * 100)}%`],
    ['\uC218\uC815\uC77C', new Date(image.lastModified).toLocaleDateString('ko-KR')],
  ];

  return (
    <div className="absolute bottom-24 right-4 z-20 w-64 rounded-md border border-border bg-popover font-display text-xs shadow-xl">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="font-semibold text-foreground">{'\uC774\uBBF8\uC9C0 \uC815\uBCF4'}</span>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground" title={'\uB2EB\uAE30'}>
          <X size={14} />
        </button>
      </div>
      <div className="space-y-1.5 p-3">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between">
            <span className="text-muted-foreground">{label}</span>
            <span className="ml-2 max-w-[140px] truncate text-foreground">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
