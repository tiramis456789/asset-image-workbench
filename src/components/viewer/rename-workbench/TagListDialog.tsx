import { X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { S, TagListEditorState } from './shared';

interface TagListDialogProps {
  editor: TagListEditorState;
  activePreviewTags: string[];
  addedTags: string[];
  activeTagInput: string;
  onClose: () => void;
  onTagInputChange: (value: string) => void;
  onTagInputKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  onLoadExif: () => void;
  tagPreviewLoading: boolean;
  hasCurrentImage: boolean;
  onApplyManualTags: () => void;
  onRemoveTag: (tag: string) => void;
  onApplyTagToBlock: (tag: string) => void;
  onRemoveAddedTag: (tag: string) => void;
}

export default function TagListDialog({
  editor,
  activePreviewTags,
  addedTags,
  activeTagInput,
  onClose,
  onTagInputChange,
  onTagInputKeyDown,
  onLoadExif,
  tagPreviewLoading,
  hasCurrentImage,
  onApplyManualTags,
  onRemoveTag,
  onApplyTagToBlock,
  onRemoveAddedTag,
}: TagListDialogProps) {
  const [selectedTag, setSelectedTag] = useState('');

  useEffect(() => {
    if (!activePreviewTags.length) {
      setSelectedTag('');
      return;
    }

    if (!activePreviewTags.includes(selectedTag)) {
      setSelectedTag(activePreviewTags[0]);
    }
  }, [activePreviewTags, selectedTag]);

  if (!editor) return null;

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/50">
      <div className="max-h-[84vh] w-[min(980px,95vw)] overflow-hidden rounded-lg border border-border bg-popover shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <h2 className="font-display text-base text-foreground">
              {editor.label} {S.tagList}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">{S.tagListHelp}</p>
          </div>
          <button onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground">
            {S.close}
          </button>
        </div>

        <div className="grid h-[68vh] grid-rows-[minmax(260px,auto)_minmax(0,1fr)]">
          <section className="min-h-0 border-b border-border bg-background/40 px-5 py-4">
            <div className="grid gap-3 md:grid-cols-[1.35fr_1fr]">
              <div className="space-y-3">
                <div>
                  <p className="text-[11px] text-muted-foreground">{S.topArea}</p>
                  <h3 className="mt-1 font-display text-sm text-foreground">
                    {editor.label} {S.collectCandidates}
                  </h3>
                </div>

                <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_120px_120px]">
                  <input
                    value={activeTagInput}
                    onChange={(event) => onTagInputChange(event.target.value)}
                    onKeyDown={onTagInputKeyDown}
                    placeholder={S.manualPlaceholder}
                    className="w-full rounded-sm border border-border bg-background/70 px-2 py-2 text-sm text-foreground outline-none focus:border-primary/60"
                  />
                  <button
                    onClick={onLoadExif}
                    disabled={!hasCurrentImage || tagPreviewLoading}
                    className="rounded-sm border border-border py-2 text-xs text-foreground hover:border-primary/50 disabled:cursor-not-allowed disabled:text-muted-foreground disabled:opacity-60"
                  >
                    {tagPreviewLoading ? S.loading : S.loadExif}
                  </button>
                  <button onClick={onApplyManualTags} className="rounded-sm border border-border py-2 text-xs text-foreground hover:border-primary/50">
                    {S.manualInput}
                  </button>
                </div>

                <div className="max-h-44 overflow-y-auto rounded-md border border-dashed border-border bg-background/60 p-3 scrollbar-thin">
                  {activePreviewTags.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {activePreviewTags.map((tag) => (
                        <span key={tag} className="rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-[11px] text-primary">
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">{S.topAreaHint}</p>
                  )}
                </div>
              </div>

              <div className="rounded-md border border-border bg-background/70 p-3">
                <p className="text-[11px] text-muted-foreground">{S.summary}</p>
                <div className="mt-3 space-y-2 text-xs">
                  <div className="rounded-sm border border-border bg-background px-2 py-2 text-foreground">
                    {S.targetBlock}: {editor.label}
                  </div>
                  <div className="rounded-sm border border-border bg-background px-2 py-2 text-muted-foreground">
                    {S.linkedExifTags}: {activePreviewTags.length > 0 ? `${activePreviewTags.length}\uAC1C` : S.noneYet}
                  </div>
                  <div className="rounded-sm border border-border bg-background px-2 py-2 text-muted-foreground">{S.manualEditAvailable}</div>
                </div>
              </div>
            </div>
          </section>

          <section className="grid min-h-0 gap-3 px-5 py-4 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
            <div className="flex min-h-0 flex-col rounded-md border border-border bg-background/40">
              <div className="border-b border-border px-4 py-3">
                <p className="text-[11px] text-muted-foreground">{S.bottomAreaA}</p>
                <h3 className="mt-1 font-display text-sm text-foreground">{S.candidateList}</h3>
              </div>
              <div className="scrollbar-thin flex-1 overflow-y-auto px-4 py-3 text-xs">
                {activePreviewTags.length > 0 ? (
                  <div className="space-y-2">
                    {activePreviewTags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => setSelectedTag(tag)}
                        className={`flex w-full items-center justify-between rounded-sm border px-3 py-2 text-left transition-colors ${
                          selectedTag === tag
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-background/50 text-foreground hover:border-primary/40'
                        }`}
                      >
                        <span className="truncate">{tag}</span>
                        <span className="ml-2 text-[10px] text-muted-foreground">
                          {selectedTag === tag ? '\uC120\uD0DD\uB428' : ''}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">{S.noCandidateYet}</p>
                )}
              </div>
            </div>

            <div className="flex min-h-0 flex-col rounded-md border border-border bg-background/40">
              <div className="border-b border-border px-4 py-3">
                <p className="text-[11px] text-muted-foreground">{S.bottomAreaB}</p>
                <h3 className="mt-1 font-display text-sm text-foreground">{S.editorWorkbench}</h3>
              </div>
              <div className="scrollbar-thin flex-1 space-y-3 overflow-y-auto px-4 py-3">
                <div className="rounded-sm border border-dashed border-border bg-background/60 p-3 text-[11px] text-muted-foreground">
                  {selectedTag ? (
                    <>
                      <p className="mb-2">{S.selectedTag}</p>
                      <p className="break-all text-foreground">{selectedTag}</p>
                    </>
                  ) : (
                    S.bottomHint
                  )}
                </div>
                <div className="rounded-sm border border-dashed border-border bg-background/60 p-3 text-[11px] text-muted-foreground">
                  <p className="mb-2">{S.addedTags}</p>
                  {addedTags.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {addedTags.map((tag) => (
                        <span key={tag} className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-[11px] text-primary">
                          <span>{tag}</span>
                          <button
                            onClick={() => onRemoveAddedTag(tag)}
                            className="rounded-full p-0.5 text-primary/80 hover:bg-destructive/10 hover:text-destructive"
                            title={S.removeValue}
                          >
                            <X size={10} />
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p>{S.noAddedTags}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <button
                    onClick={() => selectedTag && onApplyTagToBlock(selectedTag)}
                    disabled={!selectedTag}
                    className="rounded-sm border border-border py-2 text-xs text-foreground hover:border-primary/50 disabled:cursor-not-allowed disabled:text-muted-foreground disabled:opacity-60"
                  >
                    {`\uC120\uD0DD \uD0DC\uADF8\uB97C ${editor.label}\uC5D0 \uCD94\uAC00`}
                  </button>
                  <button
                    onClick={() => selectedTag && onRemoveTag(selectedTag)}
                    disabled={!selectedTag}
                    className="rounded-sm border border-border py-2 text-xs text-foreground hover:border-destructive/40 disabled:cursor-not-allowed disabled:text-muted-foreground disabled:opacity-60"
                  >
                    {'\uC120\uD0DD \uD0DC\uADF8 \uC81C\uAC70'}
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
