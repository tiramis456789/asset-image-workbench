type FsFileHandle = FileSystemFileHandle;
type FsDirectoryHandle = FileSystemDirectoryHandle;

type ApplySourceRoot = {
  id: string;
  name: string;
  handle?: FsDirectoryHandle;
  path?: string;
};

type ApplyImage = {
  id: string;
  name: string;
  originalName: string;
  originalFolderPath: string;
  currentFolderPath: string;
  applyRootId: string | null;
  fileHandle: FsFileHandle | null;
  filePath?: string | null;
};

type ApplyResult = {
  ok: boolean;
  message: string;
  updates?: Map<
    string,
    {
      originalName: string;
      originalFolderPath: string;
      fileHandle: FsFileHandle | null;
      filePath?: string | null;
    }
  >;
};

type ApplyLogEntry = {
  rootId: string;
  status: 'OK' | 'FAIL';
  from: string;
  to: string;
  reason?: string;
};

type ApplyFailureContext = {
  targetDir: FsDirectoryHandle;
  tempName?: string;
  finalName?: string;
  finalWritten?: boolean;
  originalRemoved?: boolean;
};

async function ensureDir(root: FsDirectoryHandle, relativePath: string, create: boolean) {
  let current = root;
  for (const part of relativePath.split('/').filter(Boolean)) {
    current = await current.getDirectoryHandle(part, { create });
  }
  return current;
}

async function fileExists(dir: FsDirectoryHandle, name: string) {
  try {
    await dir.getFileHandle(name, { create: false });
    return true;
  } catch {
    return false;
  }
}

function formatRelativePath(folderPath: string, name: string) {
  return folderPath ? `${folderPath}/${name}` : name;
}

function formatLogTimestamp(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(
    date.getMinutes()
  )}:${pad(date.getSeconds())}`;
}

function createTempName(imageId: string, fileName: string) {
  const safeId = imageId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `.${fileName}.aiw-${safeId}.tmp`;
}

async function removeEntryIfExists(dir: FsDirectoryHandle, name: string) {
  try {
    await dir.removeEntry(name);
  } catch {
    return;
  }
}

async function writeFileHandle(fileHandle: FsFileHandle, data: Blob) {
  const writable = await fileHandle.createWritable();
  await writable.write(data);
  await writable.close();
}

async function cleanupFailedApply(context: ApplyFailureContext) {
  const cleanupErrors: string[] = [];

  if (context.finalWritten && !context.originalRemoved && context.finalName) {
    try {
      await context.targetDir.removeEntry(context.finalName);
    } catch (error) {
      cleanupErrors.push(
        `final cleanup failed: ${error instanceof Error ? error.message : '\uC54C \uC218 \uC5C6\uB294 \uC624\uB958'}`
      );
    }
  }

  if (context.tempName) {
    try {
      await context.targetDir.removeEntry(context.tempName);
    } catch (error) {
      cleanupErrors.push(
        `temp cleanup failed: ${error instanceof Error ? error.message : '\uC54C \uC218 \uC5C6\uB294 \uC624\uB958'}`
      );
    }
  }

  return cleanupErrors;
}

async function appendLog(root: FsDirectoryHandle, lines: string[]) {
  const logHandle = await root.getFileHandle('log.txt', { create: true });
  const existingText = await logHandle.getFile().then((file) => file.text()).catch(() => '');
  const writable = await logHandle.createWritable();
  await writable.write(`${existingText}${existingText ? '\n' : ''}${lines.join('\n')}\n`);
  await writable.close();
}

function getDesktopApi() {
  return window.assetImageWorkbench ?? null;
}

function joinPath(...parts: string[]) {
  return parts
    .filter(Boolean)
    .map((part, index) => (index === 0 ? part.replace(/[\\/]+$/, '') : part.replace(/^[\\/]+|[\\/]+$/g, '')))
    .join('/');
}

async function appendDesktopLog(rootPath: string, lines: string[]) {
  const api = getDesktopApi();
  if (!api) throw new Error('desktop file API is not available');

  const logPath = joinPath(rootPath, 'log.txt');
  const existing = (await api.fileExists(logPath)) ? await api.readFile(logPath).then((file) => new TextDecoder().decode(file.buffer)) : '';
  await api.writeFile(logPath, `${existing}${existing ? '\n' : ''}${lines.join('\n')}\n`);
}

export async function applyImageChanges(changed: ApplyImage[], sourceRoots: ApplySourceRoot[]): Promise<ApplyResult> {
  for (const root of sourceRoots) {
    if (!root.handle) continue;
    const permission = root.handle.requestPermission
      ? await root.handle.requestPermission({ mode: 'readwrite' })
      : 'granted';
    if (permission !== 'granted') {
      return { ok: false, message: `"${root.name}" \uD3F4\uB354\uC758 \uC77D\uAE30/\uC4F0\uAE30 \uAD8C\uD55C\uC774 \uD544\uC694\uD569\uB2C8\uB2E4.` };
    }
  }

  const updates = new Map<
    string,
    {
      originalName: string;
      originalFolderPath: string;
      fileHandle: FsFileHandle | null;
      filePath?: string | null;
    }
  >();
  const logEntries: ApplyLogEntry[] = [];

  for (const image of changed) {
    if (!image.applyRootId || (!image.fileHandle && !image.filePath)) {
      return { ok: false, message: '\uC2E4\uC81C \uC801\uC6A9 \uAC00\uB2A5\uD55C \uD30C\uC77C \uC815\uBCF4\uAC00 \uBD80\uC871\uD569\uB2C8\uB2E4.' };
    }

    const root = sourceRoots.find((item) => item.id === image.applyRootId);
    if (!root) {
      return { ok: false, message: '\uC2E4\uC81C \uC801\uC6A9\uC6A9 \uB8E8\uD2B8 \uD3F4\uB354\uB97C \uCC3E\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.' };
    }

    let targetExists = false;
    if (root.handle) {
      const targetDir = await ensureDir(root.handle, image.currentFolderPath, true);
      targetExists = await fileExists(targetDir, image.name);
    } else if (root.path) {
      const api = getDesktopApi();
      if (!api) return { ok: false, message: '\uB370\uC2A4\uD06C\uD0D1 \uD30C\uC77C API\uB97C \uCC3E\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.' };
      await api.ensureDirectory(joinPath(root.path, image.currentFolderPath));
      targetExists = await api.fileExists(joinPath(root.path, image.currentFolderPath, image.name));
    }
    if (targetExists) {
      return {
        ok: false,
        message: `"${formatRelativePath(image.currentFolderPath, image.name)}" \uD30C\uC77C\uC774 \uC774\uBBF8 \uC2E4\uC81C \uD3F4\uB354\uC5D0 \uC874\uC7AC\uD574 \uB36E\uC5B4\uC4F0\uAE30 \uC704\uD5D8\uC73C\uB85C \uC801\uC6A9\uC744 \uC911\uB2E8\uD588\uC2B5\uB2C8\uB2E4.`,
      };
    }
  }

  let successCount = 0;
  let failureCount = 0;

  for (const image of changed) {
    if (!image.applyRootId || (!image.fileHandle && !image.filePath)) {
      return { ok: false, message: '\uC2E4\uC81C \uC801\uC6A9 \uAC00\uB2A5\uD55C \uD30C\uC77C \uC815\uBCF4\uAC00 \uBD80\uC871\uD569\uB2C8\uB2E4.' };
    }

    const root = sourceRoots.find((item) => item.id === image.applyRootId);
    if (!root) {
      return { ok: false, message: '\uC2E4\uC81C \uC801\uC6A9\uC6A9 \uB8E8\uD2B8 \uD3F4\uB354\uB97C \uCC3E\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.' };
    }

    const fromPath = formatRelativePath(image.originalFolderPath, image.originalName);
    const toPath = formatRelativePath(image.currentFolderPath, image.name);
    let targetDir: FsDirectoryHandle | null = null;
    let tempName: string | undefined;
    let finalWritten = false;
    let originalRemoved = false;

    try {
      if (root.path && image.filePath) {
        const api = getDesktopApi();
        if (!api) throw new Error('desktop file API is not available');

        const originalPath = joinPath(root.path, image.originalFolderPath, image.originalName);
        const targetDirPath = joinPath(root.path, image.currentFolderPath);
        const tempPath = joinPath(targetDirPath, createTempName(image.id, image.name));
        const targetPath = joinPath(targetDirPath, image.name);
        const sourceFile = await api.readFile(image.filePath);

        await api.ensureDirectory(targetDirPath);
        await api.writeFile(tempPath, sourceFile.buffer);
        await api.writeFile(targetPath, sourceFile.buffer);
        finalWritten = true;
        await api.removeEntry(tempPath);
        await api.removeEntry(originalPath);
        originalRemoved = true;

        updates.set(image.id, {
          originalName: image.name,
          originalFolderPath: image.currentFolderPath,
          fileHandle: image.fileHandle as FsFileHandle,
          filePath: targetPath,
        });
        logEntries.push({ rootId: root.id, status: 'OK', from: fromPath, to: toPath });
        successCount += 1;
        continue;
      }

      if (!root.handle || !image.fileHandle) {
        throw new Error('apply target is missing writable handle');
      }

      const originalDir = await ensureDir(root.handle, image.originalFolderPath, false);
      targetDir = await ensureDir(root.handle, image.currentFolderPath, true);
      const sourceFile = await image.fileHandle.getFile();
      tempName = createTempName(image.id, image.name);
      const tempHandle = await targetDir.getFileHandle(tempName, { create: true });
      await writeFileHandle(tempHandle, sourceFile);

      const targetHandle = await targetDir.getFileHandle(image.name, { create: true });
      await writeFileHandle(targetHandle, await tempHandle.getFile());
      finalWritten = true;
      await removeEntryIfExists(targetDir, tempName);
      tempName = undefined;
      await originalDir.removeEntry(image.originalName);
      originalRemoved = true;

      updates.set(image.id, {
        originalName: image.name,
        originalFolderPath: image.currentFolderPath,
        fileHandle: targetHandle,
        filePath: image.filePath ?? null,
      });
      logEntries.push({ rootId: root.id, status: 'OK', from: fromPath, to: toPath });
      successCount += 1;
    } catch (error) {
      const cleanupErrors = targetDir
        ? await cleanupFailedApply({
            targetDir,
            tempName,
            finalName: image.name,
            finalWritten,
            originalRemoved,
          })
        : [];
      const reasonBase = error instanceof Error ? error.message : '\uC54C \uC218 \uC5C6\uB294 \uC624\uB958';
      const reason = cleanupErrors.length > 0 ? `${reasonBase} | ${cleanupErrors.join(' | ')}` : reasonBase;
      logEntries.push({ rootId: root.id, status: 'FAIL', from: fromPath, to: toPath, reason });
      failureCount += 1;
    }
  }

  const timestamp = formatLogTimestamp(new Date());
  for (const root of sourceRoots) {
    const entries = logEntries.filter((entry) => entry.rootId === root.id);
    if (entries.length === 0) continue;

    const lines = entries.flatMap((entry) => {
      const base = [`[${timestamp}] ${entry.status}`, `FROM ${entry.from}`, `TO   ${entry.to}`];
      return entry.reason ? [...base, `REASON ${entry.reason}`, ''] : [...base, ''];
    });
    if (root.handle) {
      await appendLog(root.handle, lines);
    } else if (root.path) {
      await appendDesktopLog(root.path, lines);
    }
  }

  if (failureCount > 0) {
    return {
      ok: false,
      message: `${successCount}\uAC1C \uBCC0\uACBD\uC740 \uC801\uC6A9\uB418\uACE0 ${failureCount}\uAC1C\uB294 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4. \uC2E4\uD328 \uD56D\uBAA9\uC740 log.txt\uB97C \uD655\uC778\uD574 \uC8FC\uC138\uC694.`,
      updates,
    };
  }

  return {
    ok: true,
    message: `${updates.size}\uAC1C\uC758 \uBCC0\uACBD\uC744 \uC2E4\uC81C \uD3F4\uB354\uC5D0 \uC801\uC6A9\uD588\uACE0 log.txt\uC5D0 \uAE30\uB85D\uD588\uC2B5\uB2C8\uB2E4.`,
    updates,
  };
}
