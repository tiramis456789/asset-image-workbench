import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react';
import { RefObject } from 'react';

import { NameSeparator, S, TemplateBlock, presetBlocks } from './shared';

interface LegoTemplateDialogProps {
  isOpen: boolean;
  importInputRef: RefObject<HTMLInputElement>;
  templateName: string;
  onTemplateNameChange: (value: string) => void;
  onClose: () => void;
  onAddBlock: () => void;
  onSave: () => void;
  onOpenLoad: () => void;
  onImportFile: (file: File) => Promise<void>;
  blocks: TemplateBlock[];
  legoPreview: string;
  separator: NameSeparator;
  onSeparatorChange: (value: NameSeparator) => void;
  onAddPresetBlock: (label: string) => void;
  onOpenTagList: (key: string, label: string) => void;
  onMoveBlock: (blockId: string, direction: 'up' | 'down') => void;
  onRemoveBlock: (blockId: string) => void;
  onDraftValueChange: (blockId: string, value: string) => void;
  onAddBlockValue: (blockId: string) => void;
  onSelectBlockValue: (blockId: string, value: string) => void;
  onRemoveBlockValue: (blockId: string, value: string) => void;
  isBatchApply: boolean;
  onBatchApplyChange: (value: boolean) => void;
  isContinuousApply: boolean;
  onContinuousApplyChange: (value: boolean) => void;
  batchTargetCount: number;
  hasCurrentImage: boolean;
  onApply: () => void;
}

export default function LegoTemplateDialog({
  isOpen,
  importInputRef,
  templateName,
  onTemplateNameChange,
  onClose,
  onAddBlock,
  onSave,
  onOpenLoad,
  onImportFile,
  blocks,
  legoPreview,
  separator,
  onSeparatorChange,
  onAddPresetBlock,
  onOpenTagList,
  onMoveBlock,
  onRemoveBlock,
  onDraftValueChange,
  onAddBlockValue,
  onSelectBlockValue,
  onRemoveBlockValue,
  isBatchApply,
  onBatchApplyChange,
  isContinuousApply,
  onContinuousApplyChange,
  batchTargetCount,
  hasCurrentImage,
  onApply,
}: LegoTemplateDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-black/35">
      <input
        ref={importInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) await onImportFile(file);
          e.target.value = '';
        }}
      />

      <div className="pointer-events-auto max-h-[82vh] w-[min(920px,94vw)] overflow-hidden rounded-lg border border-border bg-popover shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <h2 className="font-display text-base text-foreground">{S.lego}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {'\uBE14\uB85D\uC744 \uCD94\uAC00\uD558\uACE0 \uAC12\uC744 \uACE8\uB77C \uD604\uC7AC \uC774\uBBF8\uC9C0 \uC774\uB984\uC744 \uB9CC\uB4E4 \uC218 \uC788\uC2B5\uB2C8\uB2E4.'}
            </p>
          </div>
          <button onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground">
            {S.close}
          </button>
        </div>

        <div className="grid gap-4 border-b border-border px-5 py-4 md:grid-cols-[220px_minmax(0,1fr)]">
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="block text-[11px] text-muted-foreground">{S.templateName}</label>
              <input
                value={templateName}
                onChange={(e) => onTemplateNameChange(e.target.value)}
                className="w-full rounded-sm border border-border bg-background/50 px-2 py-1.5 text-sm text-foreground outline-none focus:border-primary/60"
              />
            </div>

            <button
              onClick={onAddBlock}
              className="flex w-full items-center justify-center gap-1 rounded-sm border border-border py-1.5 text-foreground hover:border-primary/50"
            >
              <Plus size={13} />
              <span>{S.addBlock}</span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button onClick={onSave} className="rounded-sm border border-border py-1.5 text-[11px] text-foreground hover:border-primary/50">
                {S.save}
              </button>
              <button onClick={onOpenLoad} className="rounded-sm border border-border py-1.5 text-[11px] text-foreground hover:border-primary/50">
                {S.load}
              </button>
            </div>

            <div className="rounded-sm border border-border bg-background/40 p-3">
              <p className="text-[11px] text-muted-foreground">{S.tagPreset}</p>
              <div className="mt-2 space-y-2">
                {presetBlocks.map((preset) => {
                  const exists = blocks.some((block) => block.label === preset.label);
                  return (
                    <button
                      key={preset.key}
                      onClick={() => onAddPresetBlock(preset.label)}
                      className="flex w-full items-center justify-between rounded-sm border border-border/70 bg-background/60 px-2 py-1.5 text-[11px] text-foreground hover:border-primary/50"
                    >
                      <span>{preset.label}</span>
                      <span className="text-muted-foreground">{exists ? S.exists : S.add}</span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 border-t border-border pt-3">
                <p className="text-[11px] text-muted-foreground">{S.tagListMgmt}</p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {presetBlocks.map((preset) => (
                    <button
                      key={`${preset.key}-tag-list`}
                      onClick={() => onOpenTagList(preset.key, preset.label)}
                      className="rounded-sm border border-border py-1.5 text-[11px] text-foreground hover:border-primary/50"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-sm border border-border bg-background/40 p-3">
              <p className="text-[11px] text-muted-foreground">{S.currentPreview}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-muted-foreground">{S.separator}</span>
                <button
                  onClick={() => onSeparatorChange('underscore')}
                  className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
                    separator === 'underscore' ? 'border-primary bg-primary/15 text-primary' : 'border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {S.underscore}
                </button>
                <button
                  onClick={() => onSeparatorChange('space')}
                  className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
                    separator === 'space' ? 'border-primary bg-primary/15 text-primary' : 'border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {S.space}
                </button>
              </div>
              <p className="mt-2 break-all font-display text-base leading-tight text-foreground">
                {legoPreview || S.previewHint}
              </p>
            </div>
          </div>

          <div className="scrollbar-thin max-h-[52vh] space-y-3 overflow-y-auto pr-1">
            {blocks.map((block, index) => (
              <section key={block.id} className="space-y-3 rounded-md border border-border bg-background/30 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-display text-sm text-foreground">{block.label}</p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onMoveBlock(block.id, 'up')}
                      disabled={index === 0}
                      className="rounded-sm border border-border px-2 py-1.5 text-[11px] text-muted-foreground hover:text-foreground disabled:opacity-40"
                      title={S.moveUp}
                    >
                      <ArrowUp size={12} />
                    </button>
                    <button
                      onClick={() => onMoveBlock(block.id, 'down')}
                      disabled={index === blocks.length - 1}
                      className="rounded-sm border border-border px-2 py-1.5 text-[11px] text-muted-foreground hover:text-foreground disabled:opacity-40"
                      title={S.moveDown}
                    >
                      <ArrowDown size={12} />
                    </button>
                    <button
                      onClick={() => onRemoveBlock(block.id)}
                      disabled={blocks.length === 1}
                      className="rounded-sm border border-border px-2 py-1.5 text-[11px] text-muted-foreground hover:text-foreground disabled:opacity-40"
                    >
                      {S.remove}
                    </button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <input
                    value={block.draftValue}
                    onChange={(e) => onDraftValueChange(block.id, e.target.value)}
                    placeholder={S.valueExample}
                    className="flex-1 rounded-sm border border-border bg-background/50 px-2 py-1.5 text-sm text-foreground outline-none focus:border-primary/60"
                  />
                  <button
                    onClick={() => onAddBlockValue(block.id)}
                    className="rounded-sm border border-border px-3 py-1.5 text-sm text-foreground hover:border-primary/50"
                  >
                    {S.add}
                  </button>
                </div>

                <div className="flex min-h-9 flex-wrap gap-2">
                  {block.values.length > 0 ? (
                    block.values.map((value) => (
                      <div
                        key={value}
                        className={`flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] transition-colors ${
                          block.selectedValue === value ? 'border-primary bg-primary/15 text-primary' : 'border-border text-muted-foreground'
                        }`}
                      >
                        <button onClick={() => onSelectBlockValue(block.id, value)} className="hover:text-foreground">
                          {value}
                        </button>
                        <button
                          onClick={() => onRemoveBlockValue(block.id, value)}
                          className="rounded-full p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          title={S.removeValue}
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-[11px] text-muted-foreground">{S.noBlockValues}</p>
                  )}
                </div>
              </section>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 px-5 py-4">
          <div className="space-y-2 text-[11px] text-muted-foreground">
            <p>{templateName || '\uC774\uB984 \uC5C6\uB294 \uD15C\uD50C\uB9BF'}</p>
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-foreground">
                <input
                  type="checkbox"
                  checked={isBatchApply}
                  onChange={(e) => onBatchApplyChange(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-border bg-background"
                />
                <span>{S.batchApply}</span>
              </label>
              <label className="flex items-center gap-2 text-foreground">
                <input
                  type="checkbox"
                  checked={isContinuousApply}
                  onChange={(e) => onContinuousApplyChange(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-border bg-background"
                />
                <span>{S.continuousApply}</span>
              </label>
            </div>
            <p>
              {isBatchApply
                ? `\uD604\uC7AC \uD540\uB41C \uC774\uBBF8\uC9C0 ${batchTargetCount}\uAC1C\uC5D0 \uAC19\uC740 \uC774\uB984\uC744 \uC801\uC6A9\uD569\uB2C8\uB2E4.`
                : '\uD604\uC7AC \uC120\uD0DD\uB41C \uC774\uBBF8\uC9C0 1\uAC1C\uC5D0 \uC801\uC6A9\uD569\uB2C8\uB2E4.'}
            </p>
            <p>
              {isContinuousApply
                ? '\uC801\uC6A9 \uD6C4\uC5D0\uB3C4 \uD15C\uD50C\uB9BF \uCC3D\uC774 \uB2EB\uD788\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.'
                : '\uC801\uC6A9 \uD6C4 \uD15C\uD50C\uB9BF \uCC3D\uC774 \uB2EB\uD799\uB2C8\uB2E4.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={onClose} className="rounded-sm border border-border px-3 py-1.5 text-xs text-foreground hover:border-primary/50">
              {S.close}
            </button>
            <button
              onClick={onApply}
              disabled={(!hasCurrentImage && !isBatchApply) || !legoPreview || (isBatchApply && batchTargetCount === 0)}
              className="rounded-sm bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isBatchApply ? S.applyPinned : S.applyCurrent}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
