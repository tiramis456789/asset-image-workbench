import { ApplySummary, PendingMove, PendingRename } from '@/hooks/useImageStore';
import { useState } from 'react';

interface ApplyPreviewDialogProps {
  isOpen: boolean;
  summary: ApplySummary;
  pendingRenames: PendingRename[];
  pendingMoves: PendingMove[];
  onClose: () => void;
  onApply: () => Promise<{ ok: boolean; message: string }>;
}

export default function ApplyPreviewDialog({
  isOpen,
  summary,
  pendingRenames,
  pendingMoves,
  onClose,
  onApply,
}: ApplyPreviewDialogProps) {
  const [status, setStatus] = useState('');
  const [applying, setApplying] = useState(false);

  if (!isOpen) return null;

  const handleApply = async () => {
    setApplying(true);
    const result = await onApply();
    setStatus(result.message);
    setApplying(false);
  };

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/55">
      <div className="max-h-[80vh] w-[min(760px,92vw)] overflow-hidden rounded-lg border border-border bg-popover shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <h2 className="font-display text-base text-foreground">{'\uC801\uC6A9 \uC804 \uD655\uC778'}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{summary.message}</p>
          </div>
          <button onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground">
            {'\uB2EB\uAE30'}
          </button>
        </div>

        <div className="grid grid-cols-4 gap-3 border-b border-border px-5 py-4 text-xs">
          <Card label={'\uCD1D \uBCC0\uACBD'} value={summary.total} />
          <Card label={'\uC774\uB984 \uBCC0\uACBD'} value={summary.renameCount} />
          <Card label={'\uC704\uCE58 \uBCC0\uACBD'} value={summary.moveCount} />
          <Card label={'\uCC28\uB2E8 \uD56D\uBAA9'} value={summary.blockedCount} />
        </div>

        <div className="scrollbar-thin max-h-[48vh] space-y-5 overflow-y-auto px-5 py-4 text-xs">
          {pendingRenames.length > 0 && (
            <section className="space-y-2">
              <h3 className="font-display text-foreground">{'\uC774\uB984 \uBCC0\uACBD \uC608\uC815'}</h3>
              {pendingRenames.map((item) => (
                <div key={item.id} className="rounded-sm border border-border bg-background/30 p-3">
                  <p className="break-all text-muted-foreground line-through">{item.originalName}</p>
                  <p className={`mt-1 break-all ${item.hasConflict ? 'text-destructive' : 'text-foreground'}`}>
                    {item.nextName}
                  </p>
                </div>
              ))}
            </section>
          )}

          {pendingMoves.length > 0 && (
            <section className="space-y-2">
              <h3 className="font-display text-foreground">{'\uC704\uCE58 \uBCC0\uACBD \uC608\uC815'}</h3>
              {pendingMoves.map((item) => (
                <div key={item.id} className="rounded-sm border border-border bg-background/30 p-3">
                  <p className="break-all text-foreground">{item.name}</p>
                  <p className="mt-1 text-muted-foreground">
                    {item.from} {'->'} {item.to}
                  </p>
                </div>
              ))}
            </section>
          )}

          {summary.total === 0 && <p className="text-muted-foreground">{'\uD604\uC7AC \uAC80\uD1A0\uD560 \uAC00\uC0C1 \uBCC0\uACBD\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.'}</p>}
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-border px-5 py-4">
          <p className="text-[11px] text-muted-foreground">
            {status || '\uC2E4\uC81C \uC801\uC6A9\uC740 \uB9C8\uC9C0\uB9C9 \uBC84\uD2BC\uB9CC \uC2E4\uD589\uD558\uC138\uC694.'}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-sm border border-border px-3 py-1.5 text-xs text-foreground hover:border-primary/50"
            >
              {'\uB2EB\uAE30'}
            </button>
            <button
              onClick={handleApply}
              disabled={!summary.ready || applying}
              className="rounded-sm bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {applying ? '\uC801\uC6A9 \uC911...' : '\uC2E4\uC81C \uC801\uC6A9'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Card({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-background/40 p-3">
      <p className="text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-lg text-foreground">{value}</p>
    </div>
  );
}
