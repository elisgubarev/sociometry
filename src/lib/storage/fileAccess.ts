/**
 * File System Access API (Chrome, Edge): the teacher picks a folder once and
 * every survey is kept there as its own file. Other browsers use downloads.
 */
export const folderAccessSupported = typeof window !== "undefined" && "showDirectoryPicker" in window

const MAX_FILE_SIZE = 20 * 1024 * 1024

function isAbort(e: unknown): boolean {
  return e instanceof DOMException && e.name === "AbortError"
}

function isNotFound(e: unknown): boolean {
  return e instanceof DOMException && e.name === "NotFoundError"
}

/** Opens the folder window. Resolves null when the user cancels. */
export async function pickFolder(): Promise<FileSystemDirectoryHandle | null> {
  try {
    return await window.showDirectoryPicker({ id: "sociometry", mode: "readwrite", startIn: "documents" })
  } catch (e) {
    if (isAbort(e)) return null
    throw e
  }
}

export async function hasPermission(handle: FileSystemHandle): Promise<boolean> {
  try {
    return (await handle.queryPermission({ mode: "readwrite" })) === "granted"
  } catch {
    return false
  }
}

/** Must run inside a click handler. */
export async function requestPermission(handle: FileSystemHandle): Promise<boolean> {
  try {
    if (await hasPermission(handle)) return true
    return (await handle.requestPermission({ mode: "readwrite" })) === "granted"
  } catch {
    return false
  }
}

export interface FolderFile {
  name: string
  text: string
}

/**
 * Reads every `.json` file in the folder (not subfolders). `failed` lists the
 * files that exist but could not be read.
 */
export async function readFolder(dir: FileSystemDirectoryHandle): Promise<{ files: FolderFile[]; failed: string[] }> {
  const files: FolderFile[] = []
  const failed: string[] = []
  for await (const [name, handle] of dir.entries()) {
    if (handle.kind !== "file" || name.startsWith(".") || !name.toLowerCase().endsWith(".json")) continue
    try {
      const file = await handle.getFile()
      if (file.size > MAX_FILE_SIZE) {
        failed.push(name)
        continue
      }
      files.push({ name, text: await file.text() })
    } catch {
      failed.push(name)
    }
  }
  return { files, failed }
}

export async function writeFolderFile(dir: FileSystemDirectoryHandle, name: string, text: string): Promise<void> {
  const handle = await dir.getFileHandle(name, { create: true })
  const w = await handle.createWritable()
  try {
    await w.write(text)
    await w.close()
  } catch (e) {
    await w.abort().catch(() => {})
    throw e
  }
}

/** Deletes a file; a file that is already gone is not an error. */
export async function removeFolderFile(dir: FileSystemDirectoryHandle, name: string): Promise<void> {
  try {
    await dir.removeEntry(name)
  } catch (e) {
    if (!isNotFound(e)) throw e
  }
}
