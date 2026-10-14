import { createStore, del, get, set, type UseStore } from "idb-keyval"

const WORKSPACE_KEY = "workspace"
const FOLDER_KEY = "folderHandle"
const INDEX_KEY = "folderIndex"
const OLD_FILE_KEY = "fileHandle"
const LS_FALLBACK_KEY = "sociometry:workspace"

let store: UseStore | null = null
function getStore(): UseStore | null {
  if (store) return store
  try {
    if (typeof indexedDB === "undefined") return null
    store = createStore("sociometry", "kv")
    return store
  } catch {
    return null
  }
}

/** Reads the browser copy (IndexedDB, falling back to localStorage). */
export async function readBrowserCopy(): Promise<string | undefined> {
  const s = getStore()
  if (s) {
    try {
      const v = await get<string>(WORKSPACE_KEY, s)
      if (typeof v === "string") return v
    } catch {
      /* fall through */
    }
  }
  try {
    return localStorage.getItem(LS_FALLBACK_KEY) ?? undefined
  } catch {
    return undefined
  }
}

/** Writes the browser copy. Returns false when no browser storage is available. */
export async function writeBrowserCopy(text: string): Promise<boolean> {
  const s = getStore()
  if (s) {
    try {
      await set(WORKSPACE_KEY, text, s)
      return true
    } catch {
      /* fall through */
    }
  }
  try {
    localStorage.setItem(LS_FALLBACK_KEY, text)
    return true
  } catch {
    return false
  }
}

export async function readFolderHandle(): Promise<FileSystemDirectoryHandle | undefined> {
  const s = getStore()
  if (!s) return undefined
  try {
    return (await get<FileSystemDirectoryHandle>(FOLDER_KEY, s)) ?? undefined
  } catch {
    return undefined
  }
}

/** Remembers the chosen folder. Also forgets the single data file used by earlier versions. */
export async function writeFolderHandle(handle: FileSystemDirectoryHandle | undefined): Promise<void> {
  const s = getStore()
  if (!s) return
  try {
    if (handle) await set(FOLDER_KEY, handle, s)
    else await del(FOLDER_KEY, s)
    await del(OLD_FILE_KEY, s)
  } catch {
    /* the folder is a convenience; the data is still in the browser copy */
  }
}

export type FolderIndex = Record<string, { updatedAt: string; name: string }>

/** What the folder held at the last read or save: survey id → version and file name. */
export async function readFolderIndex(): Promise<FolderIndex> {
  const s = getStore()
  if (!s) return {}
  try {
    const v = await get<FolderIndex>(INDEX_KEY, s)
    return v && typeof v === "object" && !Array.isArray(v) ? v : {}
  } catch {
    return {}
  }
}

export async function writeFolderIndex(index: FolderIndex): Promise<void> {
  const s = getStore()
  if (!s) return
  try {
    await set(INDEX_KEY, index, s)
  } catch {
    /* ignore */
  }
}
