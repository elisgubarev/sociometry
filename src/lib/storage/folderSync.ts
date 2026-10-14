import { formatDateShort } from "@/lib/ru"
import { parseDataFile } from "@/lib/sociometry/schema"
import type { Survey } from "@/lib/sociometry/types"
import { safeFileName } from "./exportFiles"
import type { FolderFile } from "./fileAccess"

export interface FolderEntry {
  survey: Survey
  name: string
}

export interface FolderScan {
  /** Survey files by survey id. */
  entries: Map<string, FolderEntry>
  /** Every .json name in the folder, ours or not: never overwritten by another survey. */
  names: Set<string>
  /** False when a survey file could not be read: nothing is dropped on such a sync. */
  complete: boolean
}

function looksLikeSurveyFile(text: string): boolean {
  try {
    const raw = JSON.parse(text) as { app?: unknown; kind?: unknown } | null
    return raw?.app === "sociometry" && raw.kind === "survey"
  } catch {
    return false
  }
}

/** Parses the folder's files. Other JSON files and old whole-workspace files are left alone. */
export function parseFolder(files: FolderFile[], failed: string[]): FolderScan {
  const entries = new Map<string, FolderEntry>()
  const names = new Set<string>([...files.map((f) => f.name), ...failed])
  let complete = failed.length === 0
  for (const f of files) {
    try {
      const parsed = parseDataFile(f.text)
      if (parsed.kind !== "survey") continue
      const survey = parsed.data.survey
      const prev = entries.get(survey.id)
      // The same survey twice (a copied file): the newer one is used.
      if (!prev || survey.updatedAt > prev.survey.updatedAt) entries.set(survey.id, { survey, name: f.name })
    } catch {
      if (looksLikeSurveyFile(f.text)) complete = false
    }
  }
  return { entries, names, complete }
}

export interface Reconciled {
  surveys: Survey[]
  /** The list differs from `current`. */
  changed: boolean
  /** Files of surveys deleted in this browser while the folder was out of reach. */
  deleteNames: string[]
}

/**
 * Merges the surveys in this browser with the files in the folder.
 * `known` holds the ids that had a file at the last sync, which tells
 * "deleted on one side" apart from "new on the other side":
 * - in both: the more recently changed version wins;
 * - only in the folder: new from elsewhere → added; known → deleted here → its file is removed;
 * - only in the browser: new here → kept (and written); known → deleted elsewhere → dropped.
 */
export function reconcile(current: Survey[], scan: FolderScan, known: Set<string>): Reconciled {
  const result = new Map<string, Survey>()
  const deleteNames: string[] = []
  let changed = false
  const mine = new Map(current.map((s) => [s.id, s]))

  for (const s of current) {
    const entry = scan.entries.get(s.id)
    if (entry) {
      if (entry.survey.updatedAt > s.updatedAt) {
        result.set(s.id, entry.survey)
        changed = true
      } else {
        result.set(s.id, s)
      }
    } else if (known.has(s.id) && scan.complete) {
      changed = true
    } else {
      result.set(s.id, s)
    }
  }
  for (const [id, entry] of scan.entries) {
    if (mine.has(id)) continue
    if (known.has(id)) {
      deleteNames.push(entry.name)
    } else {
      result.set(id, entry.survey)
      changed = true
    }
  }

  const surveys = [...result.values()].sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0))
  return { surveys, changed, deleteNames }
}

/** "7 Б 14.10.2026.json": readable in the folder. The survey's id is inside the file. */
export function baseFileName(survey: Survey): string {
  return `${safeFileName(survey.className)} ${formatDateShort(survey.date)}`
}

/**
 * The file name for a survey. Keeps `current` while it still matches the class
 * and date; otherwise picks the first free name ("… (2).json" on a clash).
 */
export function fileNameFor(survey: Survey, current: string | undefined, taken: (name: string) => boolean): string {
  const base = baseFileName(survey)
  if (current && (current === `${base}.json` || new RegExp(`^${escapeRegExp(base)} \\(\\d+\\)\\.json$`).test(current))) {
    return current
  }
  for (let i = 1; ; i++) {
    const name = i === 1 ? `${base}.json` : `${base} (${i}).json`
    if (name === current || !taken(name)) return name
  }
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
