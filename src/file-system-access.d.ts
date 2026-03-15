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
}
