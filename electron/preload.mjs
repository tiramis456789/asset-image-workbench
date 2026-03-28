import { contextBridge, ipcRenderer, webUtils } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';

const IMAGE_MIME_BY_EXT = {
  '.apng': 'image/apng',
  '.avif': 'image/avif',
  '.bmp': 'image/bmp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.tif': 'image/tiff',
  '.tiff': 'image/tiff',
  '.webp': 'image/webp',
};

function getMimeType(filePath) {
  return IMAGE_MIME_BY_EXT[path.extname(filePath).toLowerCase()] ?? '';
}

async function readDirectory(dirPath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  return entries.map((entry) => ({
    name: entry.name,
    kind: entry.isDirectory() ? 'directory' : 'file',
    path: path.join(dirPath, entry.name),
    type: entry.isFile() ? getMimeType(entry.name) : undefined,
  }));
}

async function readFile(filePath) {
  const [buffer, stats] = await Promise.all([fs.readFile(filePath), fs.stat(filePath)]);
  return {
    name: path.basename(filePath),
    type: getMimeType(filePath),
    lastModified: stats.mtimeMs,
    size: stats.size,
    buffer: buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
  };
}

async function inspectPaths(paths) {
  return Promise.all(
    paths.map(async (targetPath) => {
      try {
        const stats = await fs.stat(targetPath);
        return {
          path: targetPath,
          kind: stats.isDirectory() ? 'directory' : 'file',
          type: stats.isFile() ? getMimeType(targetPath) : undefined,
        };
      } catch {
        return {
          path: targetPath,
          kind: 'missing',
        };
      }
    })
  );
}

contextBridge.exposeInMainWorld('assetImageWorkbench', {
  openDirectoryDialog: () => ipcRenderer.invoke('aiw:open-directory-dialog'),
  getPathForFile: (file) => webUtils.getPathForFile(file),
  readDirectory,
  readFile,
  inspectPaths,
  ensureDirectory: async (dirPath) => {
    await fs.mkdir(dirPath, { recursive: true });
  },
  writeFile: async (filePath, data) => {
    if (typeof data === 'string') {
      await fs.writeFile(filePath, data, 'utf8');
      return;
    }

    await fs.writeFile(filePath, Buffer.from(data));
  },
  removeEntry: async (targetPath, options) => {
    await fs.rm(targetPath, { recursive: options?.recursive ?? false, force: true });
  },
  fileExists: async (filePath) => {
    try {
      const stats = await fs.stat(filePath);
      return stats.isFile();
    } catch {
      return false;
    }
  },
});
