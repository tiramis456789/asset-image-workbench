import { useState } from 'react';

interface GridSelectorProps {
  onSelect: (rows: number, cols: number) => void;
  currentRows: number;
  currentCols: number;
}

export default function GridSelector({ onSelect, currentRows, currentCols }: GridSelectorProps) {
  const [hoverRow, setHoverRow] = useState(0);
  const [hoverCol, setHoverCol] = useState(0);
  const maxSize = 10;

  return (
    <div className="p-2 bg-popover border border-border rounded-md shadow-lg">
      <div className="grid gap-[2px]" style={{ gridTemplateColumns: `repeat(${maxSize}, 1fr)` }}>
        {Array.from({ length: maxSize * maxSize }, (_, i) => {
          const row = Math.floor(i / maxSize);
          const col = i % maxSize;
          const isHighlighted = row < hoverRow && col < hoverCol;
          const isActive = row < currentRows && col < currentCols && hoverRow === 0 && hoverCol === 0;

          return (
            <div
              key={i}
              className={`w-4 h-4 border rounded-[2px] cursor-pointer transition-colors ${
                isHighlighted
                  ? 'bg-primary border-primary'
                  : isActive
                    ? 'bg-primary/40 border-primary/60'
                    : 'bg-muted/30 border-border hover:border-muted-foreground/50'
              }`}
              onMouseEnter={() => {
                setHoverRow(row + 1);
                setHoverCol(col + 1);
              }}
              onClick={() => onSelect(row + 1, col + 1)}
            />
          );
        })}
      </div>
      <div
        className="text-center mt-2 text-xs font-display text-muted-foreground"
        onMouseEnter={() => {
          setHoverRow(0);
          setHoverCol(0);
        }}
      >
        {hoverRow > 0 && hoverCol > 0 ? `${hoverRow} x ${hoverCol}` : `${currentRows} x ${currentCols}`}
      </div>
    </div>
  );
}
