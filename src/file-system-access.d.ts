interface FileSystemHandlePermissionDescriptor {
  mode?: 'read' | 'readwrite';
}

interface FileSystemBaseHandle {
  name: string;
}

interface FileSystemFileHandle extends FileSystemBaseHandle {
  kind: 'file';
  getFile(): Promise<File>;
  createWritable(): Promise<{
    write(data: Blob | BufferSource | string): Promise<void>;
    close(): Promise<void>;
  }>;
}

interface FileSystemDirectoryHandle extends FileSystemBaseHandle {
  kind: 'directory';
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<FileSystemDirectoryHandle>;
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandle>;
  removeEntry(name: string, options?: { recursive?: boolean }): Promise<void>;
  requestPermission?(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
  values?(): AsyncIterable<FileSystemHandle>;
}

type FileSystemHandle = FileSystemFileHandle | FileSystemDirectoryHandle;

interface Window {
  showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>;
  assetImageWorkbench?: {
    openDirectoryDialog: () => Promise<string | null>;
    getPathForFile: (file: File) => string;
    readDirectory: (dirPath: string) => Promise<Array<{ name: string; kind: 'file' | 'directory'; path: string; type?: string }>>;
    readFile: (
      filePath: string
    ) => Promise<{ name: string; type: string; lastModified: number; size: number; buffer: ArrayBuffer }>;
    inspectPaths: (
      paths: string[]
    ) => Promise<Array<{ path: string; kind: 'file' | 'directory' | 'missing'; type?: string }>>;
    ensureDirectory: (dirPath: string) => Promise<void>;
    writeFile: (filePath: string, data: ArrayBuffer | string) => Promise<void>;
    removeEntry: (targetPath: string, options?: { recursive?: boolean }) => Promise<void>;
    fileExists: (filePath: string) => Promise<boolean>;
  };
}

interface File {
  path?: string;
}
