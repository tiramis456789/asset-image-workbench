import { TreeNode, FolderNode, ImageFile } from '@/hooks/useImageStore';
import { cn } from '@/lib/utils';
import { ChevronRight, ChevronDown, Folder, FolderOpen, Image, FolderPlus, Pin, X } from 'lucide-react';
import { useState, useCallback } from 'react';

interface FileExplorerProps {
  tree: TreeNode[];
  images: ImageFile[];
  currentIndex: number;
  onSelectImage: (imageId: string) => void;
  onOpenExifMenu: (imageId: string, position: { x: number; y: number }) => void;
  onToggleMarker: (imageId: string) => void;
  onToggleFolder: (folderId: string) => void;
  onRemoveNode: (nodeId: string) => void;
  onCreateFolder: (name: string, parentId?: string) => void;
  isMarked: (imageId: string) => boolean;
  isVisible: boolean;
}

function TreeItem({
  node,
  depth,
  images,
  currentIndex,
  onSelectImage,
  onOpenExifMenu,
  onToggleMarker,
  onToggleFolder,
  onRemoveNode,
  onCreateFolder,
  isMarked,
}: {
  node: TreeNode;
  depth: number;
  images: ImageFile[];
  currentIndex: number;
  onSelectImage: (imageId: string) => void;
  onOpenExifMenu: (imageId: string, position: { x: number; y: number }) => void;
  onToggleMarker: (imageId: string) => void;
  onToggleFolder: (folderId: string) => void;
  onRemoveNode: (nodeId: string) => void;
  onCreateFolder: (name: string, parentId?: string) => void;
  isMarked: (imageId: string) => boolean;
}) {
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const handleCreateFolder = useCallback(() => {
    const name = newFolderName.trim();
    if (!name) return;

    onCreateFolder(name, node.type === 'folder' ? node.id : undefined);
    setNewFolderName('');
    setShowNewFolder(false);
  }, [newFolderName, onCreateFolder, node]);

  if (node.type === 'file') {
    const isActive = currentIndex >= 0 && images[currentIndex]?.id === node.image.id;
    const marked = isMarked(node.image.id);

    return (
      <div
        className={cn(
          'group flex cursor-pointer items-center gap-1.5 rounded-sm px-1.5 py-0.5 text-[11px] transition-colors',
          isActive
            ? 'bg-primary/20 text-primary'
            : marked
              ? 'bg-primary/5 text-foreground hover:bg-muted/50'
              : 'text-foreground/80 hover:bg-muted/50 hover:text-foreground'
        )}
        style={{ paddingLeft: `${depth * 14 + 6}px` }}
        onClick={() => onSelectImage(node.image.id)}
        onContextMenu={(event) => {
          event.preventDefault();
          onSelectImage(node.image.id);
          onOpenExifMenu(node.image.id, { x: event.clientX, y: event.clientY });
        }}
      >
        <span className="relative flex h-3.5 w-3.5 shrink-0 items-center justify-center">
          {marked && <Pin size={9} className="absolute -left-2 text-primary" />}
          <Image size={12} className={cn('shrink-0', marked ? 'text-primary' : 'text-muted-foreground')} />
        </span>
        <span className="flex-1 truncate font-display">{node.name}</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemoveNode(node.id);
          }}
          className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
          title={'\uD56D\uBAA9 \uC81C\uAC70'}
        >
          <X size={10} />
        </button>
      </div>
    );
  }

  const folder = node as FolderNode;
  const fileCount = countFiles(folder);

  return (
    <div>
      <div
        className="group flex cursor-pointer items-center gap-1 rounded-sm px-1.5 py-0.5 text-[11px] text-foreground/80 transition-colors hover:bg-muted/50 hover:text-foreground"
        style={{ paddingLeft: `${depth * 14 + 2}px` }}
        onClick={() => onToggleFolder(folder.id)}
      >
        {folder.expanded ? <ChevronDown size={12} className="shrink-0" /> : <ChevronRight size={12} className="shrink-0" />}
        {folder.expanded ? <FolderOpen size={12} className="shrink-0 text-primary/80" /> : <Folder size={12} className="shrink-0 text-primary/80" />}
        <span className="flex-1 truncate font-display font-medium">{folder.name}</span>
        <span className="mr-1 text-[9px] text-muted-foreground">{fileCount}</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowNewFolder((v) => !v);
          }}
          className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 hover:text-primary"
          title={'\uD558\uC704 \uD3F4\uB354 \uB9CC\uB4E4\uAE30'}
        >
          <FolderPlus size={10} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemoveNode(folder.id);
          }}
          className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
          title={'\uD3F4\uB354 \uC81C\uAC70'}
        >
          <X size={10} />
        </button>
      </div>

      {showNewFolder && (
        <div className="flex items-center gap-1 py-0.5" style={{ paddingLeft: `${(depth + 1) * 14 + 6}px` }}>
          <input
            autoFocus
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateFolder();
              if (e.key === 'Escape') setShowNewFolder(false);
            }}
            placeholder={'\uD3F4\uB354 \uC774\uB984'}
            className="flex-1 rounded-sm border border-border bg-muted/50 px-1.5 py-0.5 font-display text-[11px] text-foreground outline-none focus:border-primary/50"
          />
        </div>
      )}

      {folder.expanded &&
        folder.children.map((child) => (
          <TreeItem
            key={child.id}
            node={child}
            depth={depth + 1}
            images={images}
            currentIndex={currentIndex}
            onSelectImage={onSelectImage}
            onOpenExifMenu={onOpenExifMenu}
            onToggleMarker={onToggleMarker}
            onToggleFolder={onToggleFolder}
            onRemoveNode={onRemoveNode}
            onCreateFolder={onCreateFolder}
            isMarked={isMarked}
          />
        ))}
    </div>
  );
}

function countFiles(folder: FolderNode): number {
  let count = 0;
  for (const child of folder.children) {
    if (child.type === 'file') count += 1;
    else count += countFiles(child);
  }
  return count;
}

export default function FileExplorer({
  tree,
  images,
  currentIndex,
  onSelectImage,
  onOpenExifMenu,
  onToggleMarker,
  onToggleFolder,
  onRemoveNode,
  onCreateFolder,
  isMarked,
  isVisible,
}: FileExplorerProps) {
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const handleCreateRootFolder = useCallback(() => {
    const name = newFolderName.trim();
    if (!name) return;

    onCreateFolder(name);
    setNewFolderName('');
    setShowNewFolder(false);
  }, [newFolderName, onCreateFolder]);

  if (tree.length === 0) return null;

  return (
    <div
      className={cn(
        'flex flex-col overflow-hidden border-r border-border bg-panel-bg transition-all duration-300 ease-in-out',
        isVisible ? 'w-52' : 'w-0 border-r-0'
      )}
    >
      <div
        className={cn(
          'flex items-center justify-between whitespace-nowrap border-b border-border px-3 py-2 text-xs font-display tracking-wide text-muted-foreground',
          !isVisible && 'opacity-0'
        )}
      >
        <span>{'\uD30C\uC77C \uD0D0\uC0C9\uAE30'}</span>
        <button
          onClick={() => setShowNewFolder((v) => !v)}
          className="transition-colors hover:text-primary"
          title={'\uB8E8\uD2B8 \uD3F4\uB354 \uB9CC\uB4E4\uAE30'}
        >
          <FolderPlus size={12} />
        </button>
      </div>

      <div className={cn('scrollbar-thin flex-1 overflow-y-auto py-1', !isVisible && 'opacity-0')}>
        {showNewFolder && (
          <div className="mb-1 flex items-center gap-1 px-2 py-0.5">
            <Folder size={12} className="shrink-0 text-primary/80" />
            <input
              autoFocus
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateRootFolder();
                if (e.key === 'Escape') setShowNewFolder(false);
              }}
              placeholder={'\uD3F4\uB354 \uC774\uB984'}
              className="flex-1 rounded-sm border border-border bg-muted/50 px-1.5 py-0.5 font-display text-[11px] text-foreground outline-none focus:border-primary/50"
            />
          </div>
        )}

        {tree.map((node) => (
          <TreeItem
            key={node.id}
            node={node}
            depth={0}
            images={images}
            currentIndex={currentIndex}
            onSelectImage={onSelectImage}
            onOpenExifMenu={onOpenExifMenu}
            onToggleMarker={onToggleMarker}
            onToggleFolder={onToggleFolder}
            onRemoveNode={onRemoveNode}
            onCreateFolder={onCreateFolder}
            isMarked={isMarked}
          />
        ))}
      </div>
    </div>
  );
}
