import { makeSurveyFile, makeWorkspace, parseDataFile } from "@/lib/sociometry/schema"
import type { Survey, Workspace } from "@/lib/sociometry/types"
import {
  folderAccessSupported,
  hasPermission,
  pickFolder,
  readFolder,
  removeFolderFile,
  requestPermission,
  writeFolderFile,
} from "./fileAccess"
import { fileNameFor, parseFolder, reconcile } from "./folderSync"
import {
  readBrowserCopy,
  readFolderHandle,
  readFolderIndex,
  writeBrowserCopy,
  writeFolderHandle,
  writeFolderIndex,
} from "./idb"

export type FolderState = "none" | "saving" | "saved" | "needs-permission" | "error"

export interface SaveStatus {
  ready: boolean
  /** The browser can keep a folder of survey files (Chrome, Edge). */
  folderSupported: boolean
  folderName: string | null
  folderState: FolderState
  /** Changes not yet saved to a file: the save button is enabled and closing the tab asks first. */
  dirty: boolean
  /** The browser copy could not be written (storage blocked or full). */
  browserError: boolean
}

type Listener = () => void
type ExternalLoad = (surveys: Survey[]) => void

const BROWSER_DELAY = 300
const REFRESH_GAP = 3000
const EXPORTED_KEY = "sociometry:exportedAt"
const CHANNEL = "sociometry"

function readExportedAt(): string {
  try {
    return localStorage.getItem(EXPORTED_KEY) ?? ""
  } catch {
    return ""
  }
}

function parseWorkspace(text: string | undefined): Workspace | null {
  if (!text) return null
  try {
    const parsed = parseDataFile(text)
    return parsed.kind === "workspace" ? parsed.data : null
  } catch {
    return null
  }
}

function errorName(e: unknown): string {
  return e instanceof DOMException ? e.name : ""
}

const lower = (name: string) => name.toLowerCase()

/**
 * Keeps the data safe. Every change goes to a browser copy straight away; the
 * save button writes it to files — in Chrome/Edge one file per survey in a
 * folder the teacher chose, in other browsers a download.
 */
export class Saver {
  private status: SaveStatus = {
    ready: false,
    folderSupported: folderAccessSupported,
    folderName: null,
    folderState: "none",
    dirty: false,
    browserError: false,
  }
  private listeners = new Set<Listener>()
  private dir: FileSystemDirectoryHandle | null = null
  private latest: Survey[] = []
  private savedAt = ""
  private exportedAt = readExportedAt()
  /** What the folder holds: survey id → version and file name. Kept in the browser between visits. */
  private written = new Map<string, { updatedAt: string; name: string }>()
  /** Lower-cased names of every .json file in the folder. */
  private taken = new Set<string>()
  private chain: Promise<unknown> = Promise.resolve()
  private ops = 0
  private failed = false
  private browserTimer: ReturnType<typeof setTimeout> | undefined
  private lastRefresh = 0
  private initPromise: Promise<Survey[]> | null = null
  private channel: BroadcastChannel | null = null
  private readonly tabId = Math.random().toString(36).slice(2)
  private onExternal: ExternalLoad | null = null

  subscribe = (l: Listener) => {
    this.listeners.add(l)
    return () => {
      this.listeners.delete(l)
    }
  }

  getStatus = () => this.status

  private set(patch: Partial<SaveStatus>) {
    this.status = { ...this.status, ...patch }
    this.listeners.forEach((l) => l())
  }

  /** Called when another tab saved, or the folder had newer data. */
  setExternalLoadHandler(fn: ExternalLoad | null) {
    this.onExternal = fn
  }

  /** Loads the newest data. Safe to call more than once. */
  init(): Promise<Survey[]> {
    if (!this.initPromise) this.initPromise = this.doInit()
    return this.initPromise
  }

  private async doInit(): Promise<Survey[]> {
    const browser = parseWorkspace(await readBrowserCopy())
    this.latest = browser?.surveys ?? []
    this.savedAt = browser?.savedAt ?? ""
    if (folderAccessSupported) {
      const dir = await readFolderHandle()
      if (dir) {
        this.dir = dir
        await this.loadIndex()
        this.set({ folderName: dir.name })
        if (await hasPermission(dir)) await this.enqueue(() => this.sync())
        else this.set({ folderState: "needs-permission" })
      }
    }
    this.updateDirty()
    this.set({ ready: true })
    this.listenToOtherTabs()
    return this.latest
  }

  private async loadIndex() {
    this.written = new Map(Object.entries(await readFolderIndex()))
  }

  private saveIndex() {
    return writeFolderIndex(Object.fromEntries(this.written))
  }

  private listenToOtherTabs() {
    if (typeof BroadcastChannel === "undefined" || this.channel) return
    this.channel = new BroadcastChannel(CHANNEL)
    this.channel.onmessage = async (e: MessageEvent<{ tab: string }>) => {
      if (e.data?.tab === this.tabId) return
      // Another tab saved to the folder or changed something.
      if (this.dir) await this.loadIndex()
      this.exportedAt = readExportedAt()
      const ws = parseWorkspace(await readBrowserCopy())
      if (ws && ws.savedAt > this.savedAt) {
        this.latest = ws.surveys
        this.savedAt = ws.savedAt
        this.onExternal?.(ws.surveys)
      }
      this.updateDirty()
    }
  }

  private notifyOtherTabs() {
    this.channel?.postMessage({ tab: this.tabId })
  }

  private folderUsable(): boolean {
    return !!this.dir && this.status.folderState !== "needs-permission"
  }

  private isDirty(): boolean {
    if (!folderAccessSupported) return this.latest.length > 0 && this.savedAt > this.exportedAt
    if (!this.dir) return this.latest.length > 0
    const ids = new Set(this.latest.map((s) => s.id))
    if (this.latest.some((s) => this.written.get(s.id)?.updatedAt !== s.updatedAt)) return true
    return [...this.written.keys()].some((id) => !ids.has(id))
  }

  private updateDirty() {
    const dirty = this.isDirty()
    if (dirty !== this.status.dirty) this.set({ dirty })
  }

  /** Called after every change made in this tab. */
  schedule(surveys: Survey[]) {
    this.latest = surveys
    this.savedAt = new Date().toISOString()
    clearTimeout(this.browserTimer)
    this.browserTimer = setTimeout(() => void this.writeBrowser(), BROWSER_DELAY)
    this.updateDirty()
  }

  private async writeBrowser() {
    this.browserTimer = undefined
    const ok = await writeBrowserCopy(JSON.stringify({ ...makeWorkspace(this.latest), savedAt: this.savedAt || new Date().toISOString() }))
    if (ok !== !this.status.browserError) this.set({ browserError: !ok })
    if (ok) this.notifyOtherTabs()
  }

  /** Runs folder work one step at a time and keeps the status in step with it. */
  private enqueue<T>(fn: () => Promise<T>): Promise<T | null> {
    this.ops++
    this.set({ folderState: "saving" })
    const run = this.chain.then(async () => {
      this.failed = false
      try {
        return await fn()
      } catch (e) {
        this.fail(e)
        return null
      }
    })
    this.chain = run
    return run.finally(() => {
      this.ops--
      if (this.ops === 0 && !this.failed && this.dir) this.set({ folderState: "saved" })
    })
  }

  private fail(e: unknown) {
    this.failed = true
    this.set({ folderState: errorName(e) === "NotAllowedError" ? "needs-permission" : "error" })
  }

  /**
   * Reads the folder and merges it into the surveys here (nothing is written).
   * Returns the new list when it changed.
   */
  private async sync(): Promise<Survey[] | null> {
    const dir = this.dir
    if (!dir) return null
    const known = new Set(this.written.keys())
    const { files, failed } = await readFolder(dir)
    const scan = parseFolder(files, failed)
    if (this.dir !== dir) return null

    // Merged with the latest list, so anything typed during the read is kept.
    const r = reconcile(this.latest, scan, known)
    this.taken = new Set([...scan.names].map(lower))
    this.written = new Map([...scan.entries].map(([id, e]) => [id, { updatedAt: e.survey.updatedAt, name: e.name }]))
    await this.saveIndex()
    if (r.changed) {
      this.latest = r.surveys
      this.savedAt = new Date().toISOString()
      void this.writeBrowser()
    }
    this.updateDirty()
    return r.changed ? r.surveys : null
  }

  /** Writes every survey whose file is missing or older, and removes files of deleted surveys. */
  private async writeChanges() {
    const dir = this.dir
    if (!dir) return
    const ids = new Set(this.latest.map((s) => s.id))
    try {
      for (const s of this.latest) {
        const prev = this.written.get(s.id)
        const name = fileNameFor(s, prev?.name, (n) => this.taken.has(lower(n)) && lower(n) !== lower(prev?.name ?? ""))
        if (prev && prev.updatedAt === s.updatedAt && prev.name === name) continue
        await writeFolderFile(dir, name, JSON.stringify(makeSurveyFile(s), null, 1))
        this.taken.add(lower(name))
        // Renamed class: the old file goes. (Only the letter case changed: it is the same file.)
        if (prev && prev.name !== name && lower(prev.name) !== lower(name)) {
          await removeFolderFile(dir, prev.name)
          this.taken.delete(lower(prev.name))
        }
        this.written.set(s.id, { updatedAt: s.updatedAt, name })
      }
      for (const [id, w] of [...this.written]) {
        if (ids.has(id)) continue
        await removeFolderFile(dir, w.name)
        this.taken.delete(lower(w.name))
        this.written.delete(id)
      }
    } finally {
      await this.saveIndex()
      this.updateDirty()
      this.notifyOtherTabs()
    }
  }

  /** Writes the browser copy now (page hidden / closing). */
  flush() {
    if (this.browserTimer) {
      clearTimeout(this.browserTimer)
      void this.writeBrowser()
    }
  }

  /** Closing the tab now would lose something: unsaved changes or a write in progress. */
  hasUnsaved(): boolean {
    return this.status.dirty || !!this.browserTimer || this.ops > 0
  }

  /**
   * Picks up changes made in the folder by someone else (a shared drive, a
   * colleague's file dropped in). Called when the window gets focus.
   */
  async refresh(): Promise<Survey[] | null> {
    if (!this.folderUsable() || Date.now() - this.lastRefresh < REFRESH_GAP) return null
    this.lastRefresh = Date.now()
    return this.enqueue(() => this.sync())
  }

  /**
   * The save button (Chrome, Edge). Asks for a folder the first time and for
   * access again after a browser restart. Returns the new list when the folder
   * had surveys this browser did not. `saved` is false when cancelled or failed.
   */
  async save(): Promise<{ saved: boolean; surveys: Survey[] | null }> {
    if (!this.dir) return this.chooseFolder()
    let surveys: Survey[] | null = null
    if (this.status.folderState === "needs-permission") {
      if (!(await requestPermission(this.dir))) return { saved: false, surveys: null }
      surveys = await this.enqueue(() => this.sync())
    }
    await this.enqueue(() => this.writeChanges())
    return { saved: !this.failed, surveys }
  }

  /** Lets the teacher choose the folder, merges its surveys with the ones here and saves everything there. */
  async chooseFolder(): Promise<{ saved: boolean; surveys: Survey[] | null }> {
    const dir = await pickFolder()
    if (!dir) return { saved: false, surveys: null }
    const same = this.dir ? await this.dir.isSameEntry(dir).catch(() => false) : false
    this.dir = dir
    if (!same) this.written = new Map()
    this.taken = new Set()
    await writeFolderHandle(dir)
    this.set({ folderName: dir.name })
    const surveys = await this.enqueue(() => this.sync())
    await this.enqueue(() => this.writeChanges())
    return { saved: !this.failed, surveys }
  }

  /**
   * Asks the browser again for access to the folder (one click after the
   * browser restarts). Returns the new list when the folder had newer data.
   */
  async regainAccess(): Promise<Survey[] | null> {
    const dir = this.dir
    if (!dir) return null
    if (!(await requestPermission(dir))) {
      this.set({ folderState: "needs-permission" })
      return null
    }
    return this.enqueue(() => this.sync())
  }

  /** After a manual download of everything (browsers without folder access). */
  markExported() {
    this.exportedAt = new Date().toISOString()
    try {
      localStorage.setItem(EXPORTED_KEY, this.exportedAt)
    } catch {
      /* ignore */
    }
    this.updateDirty()
    this.notifyOtherTabs()
  }
}
