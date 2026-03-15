import { useState } from 'react';
import { ExifInspectionResult } from '@/lib/exif';

interface ExifViewerDialogProps {
  isOpen: boolean;
  imageName: string;
  loading: boolean;
  result: ExifInspectionResult | null;
  error: string;
  onClose: () => void;
}

export default function ExifViewerDialog({
  isOpen,
  imageName,
  loading,
  result,
  error,
  onClose,
}: ExifViewerDialogProps) {
  const [showRawComment, setShowRawComment] = useState(false);

  if (!isOpen) return null;

  const rawComment = result?.parsed?.rawComment ?? result?.metadata.Comment ?? '';

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/55">
      <div className="max-h-[82vh] w-[min(920px,94vw)] overflow-hidden rounded-lg border border-border bg-popover shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <h2 className="font-display text-base text-foreground">EXIF 보기</h2>
            <p className="mt-1 text-xs text-muted-foreground">{imageName}</p>
          </div>
          <button onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground">
            {'\uB2EB\uAE30'}
          </button>
        </div>

        <div className="scrollbar-thin max-h-[64vh] overflow-y-auto px-5 py-4">
          {loading && <p className="text-sm text-muted-foreground">{'\uBA54\uD0C0\uB370\uC774\uD130\uB97C \uC77D\uB294 \uC911\uC785\uB2C8\uB2E4...'}</p>}

          {!loading && error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {!loading && !error && result && (
            <div className="space-y-4 text-sm">
              <section className="rounded-md border border-border bg-background/40 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-display text-foreground">{'\uC694\uC57D'}</h3>
                  <span className="text-xs text-muted-foreground">{result.format}</span>
                </div>
                <p className="mt-2 text-muted-foreground">{result.message}</p>
              </section>

              <Panel title={'\uBA54\uC778 \uD504\uB86C\uD504\uD2B8'} value={result.parsed?.prompt || '(\uC5C6\uC74C)'} />

              <Panel
                title={'\uCE90\uB9AD\uD130 \uD504\uB86C\uD504\uD2B8'}
                value={
                  result?.parsed?.characterPrompts && result.parsed.characterPrompts.length > 0
                    ? result.parsed.characterPrompts.join('\n')
                    : '(\uC5C6\uC74C)'
                }
              />

              {rawComment && (
                <section className="rounded-md border border-border bg-background/30 p-4">
                  <button
                    type="button"
                    onClick={() => setShowRawComment((value) => !value)}
                    className="flex w-full items-center justify-between text-left"
                  >
                    <span className="font-display text-foreground">PNG Comment 원문</span>
                    <span className="text-xs text-muted-foreground">
                      {showRawComment ? '\uC811\uAE30' : '\uD3BC\uCE58\uAE30'}
                    </span>
                  </button>

                  {showRawComment && (
                    <pre className="mt-3 whitespace-pre-wrap break-all font-mono text-xs text-foreground">{rawComment}</pre>
                  )}
                </section>
              )}

              {!rawComment && !result.parsed && (
                <section className="rounded-md border border-border bg-background/30 p-4 text-muted-foreground">
                  {'\uC774 \uD30C\uC77C\uC5D0\uC11C\uB294 \uC544\uC9C1 \uC77D\uC744 \uC218 \uC788\uB294 PNG Comment\uB97C \uCC3E\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.'}
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Panel({ title, value }: { title: string; value: string }) {
  return (
    <section className="rounded-md border border-border bg-background/30 p-4">
      <h3 className="font-display text-foreground">{title}</h3>
      <pre className="mt-2 whitespace-pre-wrap break-all font-mono text-xs text-foreground">{value}</pre>
    </section>
  );
}
