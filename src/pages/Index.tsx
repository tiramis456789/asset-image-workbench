import { useCallback, useMemo } from 'react';

import ApplyPreviewDialog from '@/components/viewer/ApplyPreviewDialog';
import ExifViewerDialog from '@/components/viewer/ExifViewerDialog';
import FileExplorer from '@/components/viewer/FileExplorer';
import Filmstrip from '@/components/viewer/Filmstrip';
import ImageCanvas from '@/components/viewer/ImageCanvas';
import ImageInfo from '@/components/viewer/ImageInfo';
import RenameWorkbench from '@/components/viewer/RenameWorkbench';
import SearchFilterDialog from '@/components/viewer/SearchFilterDialog';
import Toolbar from '@/components/viewer/Toolbar';
import { TreeNode, useImageStore } from '@/hooks/useImageStore';
import { useExifFilters } from '@/hooks/useExifFilters';
import { useIndexUiState } from '@/hooks/useIndexUiState';

function filterTree(nodes: TreeNode[], allowedIds: Set<string>): TreeNode[] {
  return nodes.flatMap<TreeNode>((node) => {
    if (node.type === 'file') {
      return allowedIds.has(node.image.id) ? [node] : [];
    }

    const children = filterTree(node.children, allowedIds);
    if (children.length === 0) return [];

    return [{ ...node, children }];
  });
}

const Index = () => {
  const store = useImageStore();
  const currentImageId = store.currentImage?.id ?? null;
  const {
    filterMode,
    nameQuery,
    pinFilterMode,
    exifQuery,
    exifTagLoading,
    filteredImages,
    knownExifTags,
    exifIndexedCount,
    filterSummary,
    setFilterMode,
    setNameQuery,
    setPinFilterMode,
    setExifQuery,
    loadExifTagsForFilter,
    resetFilters,
  } = useExifFilters(store.images, store.isMarked);
  const {
    themeMode,
    showInfo,
    showPanel,
    showFilmstrip,
    showRename,
    showSearch,
    showApplyPreview,
    gridAnchorIndex,
    hoveredImageId,
    exifMenu,
    showExifDialog,
    exifTargetName,
    exifLoading,
    exifResult,
    exifError,
    setThemeMode,
    setShowInfo,
    setShowPanel,
    setShowFilmstrip,
    setShowRename,
    setShowSearch,
    setShowApplyPreview,
    setHoveredImageId,
    setExifMenu,
    setShowExifDialog,
    toggleFullscreen,
    openExifDialog,
  } = useIndexUiState({
    currentIndex: store.currentIndex,
    currentImageId,
    imageCount: store.images.length,
    gridRows: store.gridConfig.rows,
    gridCols: store.gridConfig.cols,
    allImages: store.allImages,
    toggleMarker: store.toggleMarker,
  });

  const openFolder = useCallback(async () => {
    const result = await store.addWritableFolder();
    if (!result.ok) console.warn(result.message);
  }, [store]);

  const filteredImageIds = useMemo(() => new Set(filteredImages.map((image) => image.id)), [filteredImages]);
  const filteredTree = useMemo(() => filterTree(store.tree, filteredImageIds), [filteredImageIds, store.tree]);
  const filteredCurrentIndex = useMemo(
    () => filteredImages.findIndex((image) => image.id === store.currentImage?.id),
    [filteredImages, store.currentImage]
  );

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden">
      <Toolbar
        themeMode={themeMode}
        onThemeModeChange={setThemeMode}
        onOpenFolder={openFolder}
        onZoomIn={store.zoomIn}
        onZoomOut={store.zoomOut}
        onFitToScreen={store.fitToScreen}
        onRotateLeft={store.rotateLeft}
        onRotateRight={store.rotateRight}
        onPrev={store.prevImage}
        onNext={store.nextImage}
        onClearAll={store.clearAll}
        onToggleFullscreen={toggleFullscreen}
        onToggleInfo={() => setShowInfo((value) => !value)}
        onGridChange={(rows, cols) => store.setGridConfig({ rows, cols })}
        onTogglePanel={() => setShowPanel((value) => !value)}
        onToggleFilmstrip={() => setShowFilmstrip((value) => !value)}
        onToggleRename={() => setShowRename((value) => !value)}
        onToggleSearch={() => setShowSearch((value) => !value)}
        onOpenApplyPreview={() => setShowApplyPreview(true)}
        onToggleCurrentMarker={store.toggleCurrentMarker}
        onToggleShowMarkedOnly={store.toggleShowMarkedOnly}
        zoom={store.zoom}
        imageCount={store.images.length}
        currentIndex={store.currentIndex}
        canPrev={store.currentIndex > 0}
        canNext={store.currentIndex >= 0 && store.currentIndex < store.images.length - 1}
        gridRows={store.gridConfig.rows}
        gridCols={store.gridConfig.cols}
        showPanel={showPanel}
        showFilmstrip={showFilmstrip}
        showRename={showRename}
        showSearch={showSearch}
        isCurrentMarked={store.currentImage ? store.isMarked(store.currentImage.id) : false}
        markedCount={store.markedCount}
        showMarkedOnly={store.showMarkedOnly}
        pendingChangeCount={store.pendingChangeCount}
      />

      <div className="relative flex flex-1 overflow-hidden">
        <FileExplorer
          tree={filteredTree}
          images={filteredImages}
          currentIndex={filteredCurrentIndex}
          onSelectImage={store.selectImageById}
          onOpenExifMenu={(imageId, position) => setExifMenu({ imageId, x: position.x, y: position.y })}
          onToggleMarker={store.toggleMarker}
          onToggleFolder={store.toggleFolder}
          onRemoveNode={store.removeNode}
          onCreateFolder={store.createFolder}
          isMarked={store.isMarked}
          isVisible={showPanel}
        />

        <ImageCanvas
          image={store.currentImage}
          zoom={store.zoom}
          rotation={store.rotation}
          panOffset={store.panOffset}
          onPanChange={store.setPanOffset}
          onZoomChange={store.setZoom}
          onAddImages={store.addImages}
          onAddEntriesAsTree={store.addEntriesAsTree}
          onNext={store.nextImage}
          onPrev={store.prevImage}
          gridConfig={store.gridConfig}
          images={store.images}
          currentIndex={store.currentIndex}
          gridAnchorIndex={gridAnchorIndex}
          onSelectImage={store.selectImage}
          onToggleMarker={store.toggleMarker}
          isMarked={store.isMarked}
          onHoverImage={setHoveredImageId}
        />

        {showInfo && <ImageInfo image={store.currentImage} zoom={store.zoom} onClose={() => setShowInfo(false)} />}

        <RenameWorkbench
          currentImage={store.currentImage}
          allImages={store.allImages}
          markedImageIds={Array.from(store.markedIds)}
          markedCount={store.markedCount}
          filteredImageIds={filteredImages.map((image) => image.id)}
          filteredCount={filteredImages.length}
          pendingRenames={store.pendingRenames}
          pendingMoves={store.pendingMoves}
          renameConflicts={store.renameConflicts}
          folderOptions={store.folderOptions}
          isVisible={showRename}
          filterSummary={filterSummary}
          onRenameImage={store.renameImage}
          onResetImageName={store.resetImageName}
          onResetAllNames={store.resetAllNames}
          onCreateFolder={store.createFolder}
          onMoveImages={store.moveImages}
        />

        <SearchFilterDialog
          isOpen={showSearch}
          mode={filterMode}
          nameQuery={nameQuery}
          pinMode={pinFilterMode}
          exifQuery={exifQuery}
          knownExifTags={knownExifTags}
          filteredCount={filteredImages.length}
          totalCount={store.images.length}
          exifIndexedCount={exifIndexedCount}
          exifLoading={exifTagLoading}
          onClose={() => setShowSearch(false)}
          onModeChange={setFilterMode}
          onNameQueryChange={setNameQuery}
          onPinModeChange={setPinFilterMode}
          onExifQueryChange={setExifQuery}
          onLoadExifTags={() => void loadExifTagsForFilter()}
          onReset={resetFilters}
        />

        <ApplyPreviewDialog
          isOpen={showApplyPreview}
          summary={store.applySummary}
          pendingRenames={store.pendingRenames}
          pendingMoves={store.pendingMoves}
          onClose={() => setShowApplyPreview(false)}
          onApply={store.applyChanges}
        />

        <ExifViewerDialog
          isOpen={showExifDialog}
          imageName={exifTargetName}
          loading={exifLoading}
          result={exifResult}
          error={exifError}
          onClose={() => setShowExifDialog(false)}
        />

        {exifMenu && (
          <div
            className="absolute z-50 min-w-40 rounded-md border border-border bg-popover p-1 shadow-2xl"
            style={{ left: exifMenu.x, top: exifMenu.y }}
          >
            <button
              onClick={() => {
                store.toggleMarker(exifMenu.imageId);
                setExifMenu(null);
              }}
              className="flex w-full items-center rounded-sm px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
            >
              {store.isMarked(exifMenu.imageId) ? '핀 해제' : '핀 추가'}
            </button>
            <button
              onClick={() => void openExifDialog(exifMenu.imageId)}
              className="flex w-full items-center rounded-sm px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
            >
              EXIF 보기
            </button>
          </div>
        )}
      </div>

      <Filmstrip
        images={filteredImages}
        currentIndex={filteredCurrentIndex}
        onSelect={(index) => {
          const image = filteredImages[index];
          if (image) store.selectImageById(image.id);
        }}
        onToggleMarker={store.toggleMarker}
        isMarked={store.isMarked}
        isVisible={showFilmstrip}
        onHoverImage={setHoveredImageId}
      />

      {store.currentImage && (
        <div className="flex h-6 items-center border-t border-toolbar-border bg-toolbar-bg px-3 text-[10px] font-display text-muted-foreground">
          <span>{store.currentImage.name}</span>
          <span className="mx-2">|</span>
          <span>{store.currentImage.type}</span>
          <span className="mx-2">|</span>
          <span>{Math.round(store.zoom * 100)}%</span>
          {store.rotation !== 0 && (
            <>
              <span className="mx-2">|</span>
              <span>{store.rotation}deg</span>
            </>
          )}
          {store.isMarked(store.currentImage.id) && (
            <>
              <span className="mx-2">|</span>
              <span className="text-primary">핀됨</span>
            </>
          )}
          {filterSummary && (
            <>
              <span className="mx-2">|</span>
              <span className="text-primary">필터 {filterSummary}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Index;
