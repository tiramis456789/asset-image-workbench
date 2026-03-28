import { FolderOption, ImageFile, PendingMove, PendingRename } from '@/hooks/useImageStore';
import { Puzzle } from 'lucide-react';
import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';

import LegoTemplateDialog from './rename-workbench/LegoTemplateDialog';
import TagListDialog from './rename-workbench/TagListDialog';
import { S } from './rename-workbench/shared';
import { useLegoTemplate } from './rename-workbench/useLegoTemplate';
import { useTagListEditor } from './rename-workbench/useTagListEditor';
import { RenameTargetMode, useRenameWorkbenchActions } from './rename-workbench/useRenameWorkbenchActions';

interface RenameWorkbenchProps {
  currentImage: ImageFile | null;
  allImages: ImageFile[];
  markedImageIds: string[];
  markedCount: number;
  filteredImageIds?: string[];
  filteredCount?: number;
  pendingRenames: PendingRename[];
  pendingMoves: PendingMove[];
  renameConflicts: Set<string>;
  folderOptions: FolderOption[];
  isVisible: boolean;
  filterSummary?: string;
  onRenameImage: (imageId: string, nextName: string) => void;
  onResetImageName: (imageId: string) => void;
  onResetAllNames: () => void;
  onCreateFolder: (name: string, parentId?: string) => string;
  onMoveImages: (imageIds: string[], targetFolderId?: string) => { movedCount: number; error?: string };
}

export default function RenameWorkbench({
  currentImage,
  allImages,
  markedImageIds,
  markedCount,
  filteredImageIds = [],
  filteredCount = 0,
  pendingRenames,
  pendingMoves,
  renameConflicts,
  folderOptions,
  isVisible,
  filterSummary,
  onRenameImage,
  onResetImageName,
  onResetAllNames,
  onCreateFolder,
  onMoveImages,
}: RenameWorkbenchProps) {
  const importInputRef = useRef<HTMLInputElement>(null);
  const [manualName, setManualName] = useState('');
  const [replaceFrom, setReplaceFrom] = useState('');
  const [replaceTo, setReplaceTo] = useState('');
  const [targetMode, setTargetMode] = useState<RenameTargetMode>('current');
  const [moveTarget, setMoveTarget] = useState('__root__');
  const [newFolderName, setNewFolderName] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    setManualName(currentImage?.name ?? '');
  }, [currentImage]);

  const imageMap = useMemo(() => new Map(allImages.map((image) => [image.id, image])), [allImages]);
  const {
    isLegoOpen,
    isBatchApply,
    isContinuousApply,
    templateName,
    blocks,
    separator,
    batchTargetCount,
    legoPreview,
    setIsLegoOpen,
    setIsBatchApply,
    setIsContinuousApply,
    setTemplateName,
    setSeparator,
    updateBlock,
    addBlock,
    addPresetBlock,
    removeBlock,
    moveBlock,
    addBlockValue,
    removeBlockValue,
    selectBlockValue,
    applyLegoTemplate,
    saveTemplate,
    loadTemplate,
    openTemplateImport,
  } = useLegoTemplate({
    currentImage,
    markedImageIds,
    onRenameImage,
    setManualName,
    setStatus,
  });
  const { targetSummary, applyManualRename, applyPreset, applyOneToOneReplace, applyUppercase, applyLowercase, applyTitleCase, autoCleanupConflicts, applyMove } = useRenameWorkbenchActions({
    currentImage,
    allImages,
    markedImageIds,
    markedCount,
    filteredImageIds,
    filteredCount,
    imageMap,
    manualName,
    replaceFrom,
    replaceTo,
    targetMode,
    moveTarget,
    newFolderName,
    onRenameImage,
    onCreateFolder,
    onMoveImages,
    setStatus,
    setNewFolderName,
  });
  const {
    tagListEditor,
    tagPreviewLoading,
    activePreviewTags,
    activeTagInput,
    activeBlockValues,
    setTagListEditor,
    setActiveTagInput,
    loadExifTagsIntoEditor,
    applyManualTagsToEditor,
    removePreviewTag,
    applyPreviewTagToBlock,
    removeBlockTagFromEditor,
  } = useTagListEditor({
    currentImage,
    blocks,
    updateBlock,
    removeBlockValue,
    setStatus,
  });

  return (
    <>
      <aside
        className={`flex flex-col overflow-hidden border-l border-border bg-panel-bg transition-all duration-300 ease-in-out ${
          isVisible ? 'w-80' : 'w-0 border-l-0'
        }`}
      >
        <div className={`flex h-full flex-col ${!isVisible ? 'opacity-0' : ''}`}>
          <div className="border-b border-border px-4 py-3">
            <h2 className="font-display text-sm text-foreground">{S.workbench}</h2>
            <p className="mt-1 text-[11px] text-muted-foreground">{S.virtualHint}</p>
          </div>

          <div className="scrollbar-thin flex-1 space-y-4 overflow-y-auto p-4 text-xs">
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-foreground">{S.currentImage}</h3>
                {currentImage && (
                  <button
                    onClick={() => {
                      onResetImageName(currentImage.id);
                      setStatus('\uD604\uC7AC \uC774\uBBF8\uC9C0 \uC774\uB984\uC744 \uC6D0\uB798\uB300\uB85C \uB3CC\uB838\uC2B5\uB2C8\uB2E4.');
                    }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {S.restore}
                  </button>
                )}
              </div>
              {currentImage ? (
                <>
                  <div className="space-y-1 rounded-sm border border-border bg-background/40 p-2">
                    <p className="text-muted-foreground">{S.originalName}</p>
                    <p className="break-all text-foreground">{currentImage.originalName}</p>
                    <p className="pt-1 text-muted-foreground">{S.currentPath}</p>
                    <p className="break-all text-foreground">{currentImage.currentFolderPath || S.root}</p>
                  </div>
                  <input
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    placeholder={S.newName}
                    className="w-full rounded-sm border border-border bg-background/50 px-2 py-1.5 text-foreground outline-none focus:border-primary/60"
                  />
                  <button onClick={applyManualRename} className="w-full rounded-sm bg-primary/90 py-1.5 text-primary-foreground hover:bg-primary">
                    {S.renameCurrent}
                  </button>
                </>
              ) : (
                <p className="text-muted-foreground">{S.selectImageFirst}</p>
              )}
            </section>

            <section className="space-y-2">
              <h3 className="font-display text-foreground">{S.target}</h3>
              <div className="grid grid-cols-4 gap-1.5">
                <ToggleChip active={targetMode === 'current'} disabled={!currentImage} onClick={() => setTargetMode('current')}>
                  {S.current}
                </ToggleChip>
                <ToggleChip active={targetMode === 'all'} onClick={() => setTargetMode('all')}>
                  {S.all}
                </ToggleChip>
                <ToggleChip active={targetMode === 'marked'} disabled={markedCount === 0} onClick={() => setTargetMode('marked')}>
                  {S.pinnedOnly}
                </ToggleChip>
                <ToggleChip active={targetMode === 'filtered'} disabled={filteredCount === 0} onClick={() => setTargetMode('filtered')}>
                  {S.filtered}
                </ToggleChip>
              </div>
              <p className="text-muted-foreground">
                {S.target}: {targetSummary}
              </p>
            </section>

            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display text-foreground">{S.lego}</h3>
                  <p className="mt-1 text-[11px] text-muted-foreground">{S.legoHelp}</p>
                </div>
                <button onClick={() => setIsLegoOpen(true)} className="flex items-center gap-1 rounded-sm border border-primary/40 bg-primary/10 px-2 py-1.5 text-primary hover:bg-primary/15">
                  <Puzzle size={13} />
                  <span>{S.startLego}</span>
                </button>
              </div>
            </section>

            <section className="space-y-2">
              <h3 className="font-display text-foreground">{S.quickPreset}</h3>
              <div className="grid grid-cols-1 gap-2">
                <div className="space-y-2 rounded-sm border border-border bg-background/30 p-2">
                  <p className="text-muted-foreground">{S.replaceOneToOne}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={replaceFrom}
                      onChange={(e) => setReplaceFrom(e.target.value)}
                      placeholder={S.replaceFrom}
                      className="w-full rounded-sm border border-border bg-background/50 px-2 py-1.5 text-foreground outline-none focus:border-primary/60"
                    />
                    <input
                      value={replaceTo}
                      onChange={(e) => setReplaceTo(e.target.value)}
                      placeholder={S.replaceTo}
                      className="w-full rounded-sm border border-border bg-background/50 px-2 py-1.5 text-foreground outline-none focus:border-primary/60"
                    />
                  </div>
                  <button onClick={applyOneToOneReplace} className="w-full rounded-sm border border-border py-1.5 text-foreground hover:border-primary/50">
                    {S.applyReplace}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={applyUppercase} className="rounded-sm border border-border py-1.5 text-foreground hover:border-primary/50">
                    {S.uppercaseName}
                  </button>
                  <button onClick={applyLowercase} className="rounded-sm border border-border py-1.5 text-foreground hover:border-primary/50">
                    {S.lowercaseName}
                  </button>
                </div>
                <button onClick={applyTitleCase} className="rounded-sm border border-border py-1.5 text-foreground hover:border-primary/50">
                  {S.titleCaseName}
                </button>
                <button onClick={() => applyPreset('spaces_to_underscores')} className="rounded-sm border border-border py-1.5 text-foreground hover:border-primary/50">
                  {S.spacesToUnderscores}
                </button>
              </div>
            </section>

            <section className="space-y-2">
              <h3 className="font-display text-foreground">{S.move}</h3>
              <select value={moveTarget} onChange={(e) => setMoveTarget(e.target.value)} className="w-full rounded-sm border border-border bg-background/50 px-2 py-1.5 text-foreground outline-none focus:border-primary/60">
                <option value="__root__">{S.root}</option>
                {folderOptions.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.path}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => applyMove(false)} className="rounded-sm border border-border py-1.5 text-foreground hover:border-primary/50">
                  {S.moveToFolder}
                </button>
                <input value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} placeholder={S.newFolderName} className="w-full rounded-sm border border-border bg-background/50 px-2 py-1.5 text-foreground outline-none focus:border-primary/60" />
              </div>
              <button onClick={() => applyMove(true)} className="w-full rounded-sm border border-border py-1.5 text-foreground hover:border-primary/50">
                {S.createAndMove}
              </button>
            </section>

            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-foreground">{S.preview}</h3>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={autoCleanupConflicts}
                    className="text-primary hover:text-primary/80"
                  >
                    {S.autoCleanup}
                  </button>
                  <button onClick={onResetAllNames} className="text-muted-foreground hover:text-foreground">
                    {S.resetAll}
                  </button>
                </div>
              </div>
              {pendingRenames.length === 0 && pendingMoves.length === 0 ? (
                <p className="text-muted-foreground">{S.noChanges}</p>
              ) : (
                <div className="space-y-3">
                  {pendingRenames.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-muted-foreground">
                        {S.renameChanges} {pendingRenames.length}
                        {'\uAC74'}
                      </p>
                      {pendingRenames.map((item) => (
                        <div key={item.id} className="space-y-1 rounded-sm border border-border bg-background/30 p-2">
                          <p className="break-all text-muted-foreground line-through">{item.originalName}</p>
                          <p className={`break-all ${item.hasConflict ? 'text-destructive' : 'text-foreground'}`}>{item.nextName}</p>
                          {item.hasConflict && <p className="text-[11px] text-destructive">{S.conflictWarning}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                  {pendingMoves.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-muted-foreground">
                        {S.moveChanges} {pendingMoves.length}
                        {'\uAC74'}
                      </p>
                      {pendingMoves.map((item) => (
                        <div key={item.id} className="space-y-1 rounded-sm border border-border bg-background/30 p-2">
                          <p className="break-all text-foreground">{item.name}</p>
                          <p className="text-muted-foreground">
                            {item.from} {'->'} {item.to}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>

          <div className="min-h-[54px] border-t border-border px-4 py-3 text-[11px] text-muted-foreground">
            <div>{status || `\uC774\uB984 \uCDA9\uB3CC \uACBD\uACE0: ${renameConflicts.size}\uAC74`}</div>
            {filterSummary && <div className="mt-1 text-primary">필터 적용: {filterSummary}</div>}
          </div>
        </div>
      </aside>

      <LegoTemplateDialog
        isOpen={isLegoOpen}
        importInputRef={importInputRef}
        templateName={templateName}
        onTemplateNameChange={setTemplateName}
        onClose={() => setIsLegoOpen(false)}
        onAddBlock={addBlock}
        onSave={saveTemplate}
        onOpenLoad={() => openTemplateImport(importInputRef)}
        onImportFile={loadTemplate}
        blocks={blocks}
        legoPreview={legoPreview}
        separator={separator}
        onSeparatorChange={setSeparator}
        onAddPresetBlock={addPresetBlock}
        onOpenTagList={(key, label) => setTagListEditor({ key, label })}
        onMoveBlock={moveBlock}
        onRemoveBlock={removeBlock}
        onDraftValueChange={(blockId, value) => updateBlock(blockId, (block) => ({ ...block, draftValue: value }))}
        onAddBlockValue={addBlockValue}
        onSelectBlockValue={selectBlockValue}
        onRemoveBlockValue={removeBlockValue}
        isBatchApply={isBatchApply}
        onBatchApplyChange={setIsBatchApply}
        isContinuousApply={isContinuousApply}
        onContinuousApplyChange={setIsContinuousApply}
        batchTargetCount={batchTargetCount}
        hasCurrentImage={Boolean(currentImage)}
        onApply={applyLegoTemplate}
      />

      <TagListDialog
        editor={tagListEditor}
        activePreviewTags={activePreviewTags}
        addedTags={activeBlockValues}
        activeTagInput={activeTagInput}
        onClose={() => setTagListEditor(null)}
        onTagInputChange={setActiveTagInput}
        onTagInputKeyDown={(event) => {
          if (event.key !== 'Enter') return;
          event.preventDefault();
          applyManualTagsToEditor();
        }}
        onLoadExif={() => void loadExifTagsIntoEditor()}
        tagPreviewLoading={tagPreviewLoading}
        hasCurrentImage={Boolean(currentImage)}
        onApplyManualTags={applyManualTagsToEditor}
        onRemoveTag={removePreviewTag}
        onApplyTagToBlock={applyPreviewTagToBlock}
        onRemoveAddedTag={removeBlockTagFromEditor}
      />
    </>
  );
}

function ToggleChip({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-sm border px-2 py-1.5 disabled:opacity-40 ${
        active ? 'border-primary bg-primary/15 text-primary' : 'border-border text-muted-foreground hover:text-foreground'
      }`}
    >
      {children}
    </button>
  );
}
