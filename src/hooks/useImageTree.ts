import type { FileNode, FolderNode, FolderOption, ImageFile, TreeNode } from './useImageStore';

type FsFileHandle = FileSystemFileHandle;
type FsDirectoryHandle = FileSystemDirectoryHandle;

function isFileHandle(handle: FileSystemHandle): handle is FsFileHandle {
  return handle.kind === 'file';
}

function isDirectoryHandle(handle: FileSystemHandle): handle is FsDirectoryHandle {
  return handle.kind === 'directory';
}

export const flatImages = (nodes: TreeNode[]): ImageFile[] =>
  nodes.flatMap((node) => (node.type === 'file' ? [node.image] : flatImages(node.children)));

export const findTreeNode = (nodes: TreeNode[], id: string): TreeNode | null => {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.type === 'folder') {
      const found = findTreeNode(node.children, id);
      if (found) return found;
    }
  }

  return null;
};

export const findFolderNode = (nodes: TreeNode[], id: string) => {
  const node = findTreeNode(nodes, id);
  return node && node.type === 'folder' ? node : null;
};

export const removeTreeNode = (nodes: TreeNode[], id: string): TreeNode[] =>
  nodes
    .filter((node) => node.id !== id)
    .map((node) => (node.type === 'folder' ? { ...node, children: removeTreeNode(node.children, id) } : node));

export const addNodesToFolder = (nodes: TreeNode[], folderId: string, newNodes: TreeNode[]): TreeNode[] =>
  nodes.map((node) => {
    if (node.id === folderId && node.type === 'folder') {
      return { ...node, children: [...node.children, ...newNodes] };
    }

    return node.type === 'folder' ? { ...node, children: addNodesToFolder(node.children, folderId, newNodes) } : node;
  });

export const toggleFolderNode = (nodes: TreeNode[], folderId: string): TreeNode[] =>
  nodes.map((node) => {
    if (node.id === folderId && node.type === 'folder') {
      return { ...node, expanded: !node.expanded };
    }

    return node.type === 'folder' ? { ...node, children: toggleFolderNode(node.children, folderId) } : node;
  });

export const updateTreeFiles = (nodes: TreeNode[], fn: (node: FileNode) => FileNode): TreeNode[] =>
  nodes.map((node) => (node.type === 'file' ? fn(node) : { ...node, children: updateTreeFiles(node.children, fn) }));

export function imageFromFile(
  file: File,
  folderPath = '',
  extra?: { applyRootId?: string | null; fileHandle?: FsFileHandle | null; applyReady?: boolean }
): ImageFile {
  return {
    id: crypto.randomUUID(),
    name: file.name,
    originalName: file.name,
    originalFolderPath: folderPath,
    currentFolderPath: folderPath,
    url: URL.createObjectURL(file),
    size: file.size,
    type: file.type,
    lastModified: file.lastModified,
    applyRootId: extra?.applyRootId ?? null,
    fileHandle: extra?.fileHandle ?? null,
    applyReady: extra?.applyReady ?? false,
  };
}

export async function buildTreeFromEntries(entries: FileSystemEntry[], parentParts: string[] = []): Promise<TreeNode[]> {
  const nodes: TreeNode[] = [];

  for (const entry of entries) {
    if (entry.isFile) {
      const file = await new Promise<File>((resolve, reject) => (entry as FileSystemFileEntry).file(resolve, reject)).catch(() => null);
      if (file && file.type.startsWith('image/')) {
        const image = imageFromFile(file, parentParts.join('/'));
        nodes.push({ id: image.id, name: image.name, type: 'file', image });
      }
      continue;
    }

    const dirReader = (entry as FileSystemDirectoryEntry).createReader();
    const childEntries = await new Promise<FileSystemEntry[]>((resolve) => {
      const all: FileSystemEntry[] = [];
      const readBatch = () =>
        dirReader.readEntries(
          (batch) => {
            if (batch.length === 0) {
              resolve(all);
              return;
            }
            all.push(...batch);
            readBatch();
          },
          () => resolve(all)
        );
      readBatch();
    });

    const nextParts = [...parentParts, entry.name];
    const children = await buildTreeFromEntries(childEntries, nextParts);
    if (children.length > 0) {
      nodes.push({
        id: crypto.randomUUID(),
        name: entry.name,
        type: 'folder',
        children,
        expanded: true,
        relativePath: nextParts.join('/'),
        applyRootId: null,
        isRoot: false,
      });
    }
  }

  return nodes;
}

export async function buildTreeFromHandle(
  handle: FsDirectoryHandle,
  applyRootId: string,
  relativePath = '',
  isRoot = false
): Promise<FolderNode> {
  const children: TreeNode[] = [];
  const values = handle.values;
  if (!values) throw new Error('directory handle iteration is not supported');

  for await (const child of values.call(handle)) {
    if (isFileHandle(child)) {
      const file = await child.getFile();
      if (!file.type.startsWith('image/')) continue;

      const image = imageFromFile(file, relativePath, { applyRootId, fileHandle: child, applyReady: true });
      children.push({ id: image.id, name: image.name, type: 'file', image });
      continue;
    }

    if (!isDirectoryHandle(child)) continue;
    const childPath = relativePath ? `${relativePath}/${child.name}` : child.name;
    children.push(await buildTreeFromHandle(child, applyRootId, childPath));
  }

  return {
    id: crypto.randomUUID(),
    name: handle.name,
    type: 'folder',
    children,
    expanded: true,
    relativePath: isRoot ? '' : relativePath,
    applyRootId,
    isRoot,
  };
}

export function folderOptionsOf(nodes: TreeNode[]): FolderOption[] {
  const result: FolderOption[] = [];

  const walk = (items: TreeNode[]) => {
    for (const node of items) {
      if (node.type !== 'folder') continue;

      result.push({
        id: node.id,
        name: node.name,
        path: node.isRoot ? node.name : node.relativePath,
        applyRootId: node.applyRootId,
      });
      walk(node.children);
    }
  };

  walk(nodes);
  return result;
}

export function rebaseTreeNode(node: TreeNode, parentPath: string, applyRootId: string | null): TreeNode {
  if (node.type === 'file') {
    return {
      ...node,
      image: {
        ...node.image,
        currentFolderPath: parentPath,
        applyRootId,
      },
    };
  }

  const relativePath = node.isRoot ? '' : parentPath ? `${parentPath}/${node.name}` : node.name;
  return {
    ...node,
    relativePath,
    applyRootId,
    children: node.children.map((child) => rebaseTreeNode(child, relativePath, applyRootId)),
  };
}
