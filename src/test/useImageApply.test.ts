import { describe, expect, it, vi } from 'vitest';

import { applyImageChanges } from '@/hooks/useImageApply';

type MockWritable = {
  write: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
};

type MockFileHandle = {
  getFile: () => Promise<Blob>;
  createWritable: () => Promise<MockWritable>;
};

type MockDirectoryHandle = {
  name: string;
  requestPermission: ReturnType<typeof vi.fn>;
  getDirectoryHandle: (name: string, options: { create: boolean }) => Promise<MockDirectoryHandle>;
  getFileHandle: (name: string, options: { create: boolean }) => Promise<MockFileHandle>;
  removeEntry: ReturnType<typeof vi.fn>;
  readFileText: (name: string) => string;
  hasFile: (name: string) => boolean;
};

function createMockDirectory(name: string, initialFiles: string[] = []): MockDirectoryHandle {
  const childDirs = new Map<string, MockDirectoryHandle>();
  const files = new Map<string, string>(initialFiles.map((fileName) => [fileName, '']));

  return {
    name,
    requestPermission: vi.fn().mockResolvedValue('granted'),
    async getDirectoryHandle(childName: string, options: { create: boolean }) {
      const existing = childDirs.get(childName);
      if (existing) return existing;
      if (!options.create) throw new Error(`missing dir: ${childName}`);

      const next = createMockDirectory(childName);
      childDirs.set(childName, next);
      return next;
    },
    async getFileHandle(fileName: string, options: { create: boolean }) {
      const exists = files.has(fileName);
      if (!exists && !options.create) throw new Error(`missing file: ${fileName}`);
      if (!exists) files.set(fileName, '');

      return {
        getFile: async () => new Blob([files.get(fileName) ?? 'image']),
        createWritable: async () => {
          let buffer = files.get(fileName) ?? '';
          return {
            write: vi.fn().mockImplementation(async (value: Blob | string) => {
              if (typeof value === 'string') {
                buffer = value;
                return;
              }

              if (value && typeof (value as Blob).text === 'function') {
                buffer = await (value as Blob).text();
                return;
              }

              if (value && typeof (value as Blob).arrayBuffer === 'function') {
                const bytes = await (value as Blob).arrayBuffer();
                buffer = new TextDecoder().decode(bytes);
                return;
              }

              buffer = String(value);
            }),
            close: vi.fn().mockImplementation(async () => {
              files.set(fileName, buffer);
            }),
          };
        },
      };
    },
    removeEntry: vi.fn(async (fileName: string) => {
      if (!files.has(fileName)) throw new Error(`missing file: ${fileName}`);
      files.delete(fileName);
    }),
    readFileText: (fileName: string) => files.get(fileName) ?? '',
    hasFile: (fileName: string) => files.has(fileName),
  };
}

function createSourceRoot(name = 'root', initialFiles: string[] = []) {
  const handle = createMockDirectory(name, initialFiles);
  return {
    id: 'root-1',
    name,
    handle: handle as unknown as FileSystemDirectoryHandle,
    rawHandle: handle,
  };
}

function createImage(overrides: Partial<Parameters<typeof applyImageChanges>[0][number]> = {}) {
  return {
    id: 'img-1',
    name: 'renamed.png',
    originalName: 'original.png',
    originalFolderPath: '',
    currentFolderPath: '',
    applyRootId: 'root-1',
    fileHandle: {
      getFile: async () => new Blob(['image']),
    } as FileSystemFileHandle,
    ...overrides,
  };
}

describe('applyImageChanges', () => {
  it('stops when readwrite permission is denied', async () => {
    const root = createSourceRoot();
    root.rawHandle.requestPermission.mockResolvedValue('denied');

    const result = await applyImageChanges([createImage()], [root]);

    expect(result.ok).toBe(false);
    expect(result.message).toContain('\uAD8C\uD55C');
  });

  it('aborts before writing when the target file already exists', async () => {
    const root = createSourceRoot();
    root.rawHandle.getFileHandle = vi.fn(async (fileName: string, options: { create: boolean }) => {
      if (fileName === 'renamed.png' && !options.create) {
        return {
          getFile: async () => new Blob(['existing']),
          createWritable: async () => ({
            write: vi.fn().mockResolvedValue(undefined),
            close: vi.fn().mockResolvedValue(undefined),
          }),
        };
      }

      if (!options.create) throw new Error(`missing file: ${fileName}`);

      return {
        getFile: async () => new Blob(['new']),
        createWritable: async () => ({
          write: vi.fn().mockResolvedValue(undefined),
          close: vi.fn().mockResolvedValue(undefined),
        }),
      };
    });

    const result = await applyImageChanges([createImage()], [root]);

    expect(result.ok).toBe(false);
    expect(result.message).toContain('\uB36E\uC5B4\uC4F0\uAE30');
    expect(root.rawHandle.removeEntry).not.toHaveBeenCalled();
  });

  it('keeps successful updates when one of multiple changes fails', async () => {
    const root = createSourceRoot('root', ['ok-old.png', 'broken.png']);
    const originalRemoveEntry = root.rawHandle.removeEntry;
    root.rawHandle.removeEntry = vi.fn(async (fileName: string) => {
      if (fileName === 'broken.png') throw new Error('disk locked');
      return originalRemoveEntry(fileName);
    });

    const result = await applyImageChanges(
      [
        createImage({
          id: 'img-ok',
          name: 'ok.png',
          originalName: 'ok-old.png',
          fileHandle: {
            getFile: async () => new Blob(['ok']),
          } as FileSystemFileHandle,
        }),
        createImage({
          id: 'img-fail',
          name: 'broken-next.png',
          originalName: 'broken.png',
          fileHandle: {
            getFile: async () => new Blob(['broken']),
          } as FileSystemFileHandle,
        }),
      ],
      [root]
    );
    expect(result.ok).toBe(false);
    expect(result.message).toContain('1');
    expect(result.message).toContain('log.txt');
    expect(result.updates?.size).toBe(1);
    expect(result.updates?.get('img-ok')?.originalName).toBe('ok.png');
    expect(result.updates?.has('img-fail')).toBe(false);
  });

  it('cleans up temp and final files when original deletion fails', async () => {
    const root = createSourceRoot('root', ['source.png']);
    const originalRemoveEntry = root.rawHandle.removeEntry;
    root.rawHandle.removeEntry = vi.fn(async (fileName: string) => {
      if (fileName === 'source.png') throw new Error('locked source');
      return originalRemoveEntry(fileName);
    });

    const result = await applyImageChanges(
      [
        createImage({
          id: 'img-cleanup',
          name: 'target.png',
          originalName: 'source.png',
          fileHandle: {
            getFile: async () => new Blob(['source']),
          } as FileSystemFileHandle,
        }),
      ],
      [root]
    );

    expect(result.ok).toBe(false);
    expect(root.rawHandle.hasFile('source.png')).toBe(true);
    expect(root.rawHandle.hasFile('target.png')).toBe(false);
    expect(root.rawHandle.hasFile('.target.png.aiw-img-cleanup.tmp')).toBe(false);
    expect(root.rawHandle.readFileText('log.txt')).toContain('locked source');
  });

  it('returns updates and writes a success log when all changes succeed', async () => {
    const root = createSourceRoot('root', ['before.png']);

    const result = await applyImageChanges(
      [
        createImage({
          id: 'img-ok',
          name: 'done.png',
          originalName: 'before.png',
          currentFolderPath: 'next',
          fileHandle: {
            getFile: async () => new Blob(['ok']),
          } as FileSystemFileHandle,
        }),
      ],
      [root]
    );
    expect(result.ok).toBe(true);
    expect(result.message).toContain('1');
    expect(result.updates?.get('img-ok')?.originalName).toBe('done.png');
    expect(result.updates?.get('img-ok')?.originalFolderPath).toBe('next');
    expect(root.rawHandle.readFileText('log.txt')).toContain('OK');
    expect(root.rawHandle.readFileText('log.txt')).toContain('FROM before.png');
    expect(root.rawHandle.readFileText('log.txt')).toContain('TO   next/done.png');
  });

  it('allows case-only renames on desktop paths without treating the source file as a collision', async () => {
    const writeFile = vi.fn().mockResolvedValue(undefined);
    const removeEntry = vi.fn().mockResolvedValue(undefined);
    const fileExists = vi.fn(async (targetPath: string) => targetPath.endsWith('SMILING PROFESSOR_ADMIRING.webp'));
    const readFile = vi.fn(async () => ({
      name: 'smiling professor_admiring.webp',
      type: 'image/webp',
      lastModified: 1,
      size: 10,
      buffer: new TextEncoder().encode('image').buffer,
    }));

    window.assetImageWorkbench = {
      openDirectoryDialog: vi.fn(),
      getPathForFile: vi.fn(),
      readDirectory: vi.fn(),
      readFile,
      inspectPaths: vi.fn(),
      ensureDirectory: vi.fn().mockResolvedValue(undefined),
      writeFile,
      removeEntry,
      fileExists,
    };

    const result = await applyImageChanges(
      [
        createImage({
          name: 'SMILING PROFESSOR_ADMIRING.webp',
          originalName: 'smiling professor_admiring.webp',
          fileHandle: null,
          filePath: 'C:/root/smiling professor_admiring.webp',
        }),
      ],
      [{ id: 'root-1', name: 'root', path: 'C:/root' }]
    );

    expect(result.ok).toBe(true);
    expect(removeEntry).toHaveBeenCalledWith('C:/root/smiling professor_admiring.webp');
    expect(writeFile.mock.calls.some(([targetPath]) => targetPath === 'C:/root/SMILING PROFESSOR_ADMIRING.webp')).toBe(true);
  });

  it('writes separate log entries per apply root', async () => {
    const rootA = createSourceRoot('root-a', ['a.png']);
    const rootB = {
      ...createSourceRoot('root-b', ['b.png']),
      id: 'root-2',
    };

    const result = await applyImageChanges(
      [
        createImage({
          id: 'img-a',
          name: 'a-next.png',
          originalName: 'a.png',
          applyRootId: 'root-1',
        }),
        createImage({
          id: 'img-b',
          name: 'b-next.png',
          originalName: 'b.png',
          applyRootId: 'root-2',
        }),
      ],
      [rootA, rootB]
    );
    expect(result.ok).toBe(true);
    expect(rootA.rawHandle.readFileText('log.txt')).toContain('FROM a.png');
    expect(rootA.rawHandle.readFileText('log.txt')).not.toContain('FROM b.png');
    expect(rootB.rawHandle.readFileText('log.txt')).toContain('FROM b.png');
    expect(rootB.rawHandle.readFileText('log.txt')).not.toContain('FROM a.png');
  });
});
