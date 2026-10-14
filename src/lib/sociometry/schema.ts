import { z } from "zod"
import { DEFAULT_MAX_CHOICES, DEFAULT_THRESHOLDS, MAX_MAX_CHOICES, MAX_THRESHOLD } from "./defaults"
import type { Answer, Survey, SurveyFile, Workspace } from "./types"

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

const studentSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1),
})

const answerSchema = z.object({
  pos: z.array(z.string()).default([]),
  neg: z.array(z.string()).default([]),
  absent: z.boolean().default(false),
})

const thresholdsSchema = z
  .object({
    star: z.number().int().min(3).max(MAX_THRESHOLD),
    pref: z.number().int().min(2),
    acc: z.number().int().min(1),
  })
  .refine((t) => t.acc < t.pref && t.pref < t.star)

const surveySchema = z
  .object({
    id: z.string().min(1),
    className: z.string().trim().min(1),
    date: isoDate,
    questionPos: z.string().default(""),
    questionNeg: z.string().default(""),
    useNeg: z.boolean().default(true),
    maxChoices: z.number().int().min(1).max(MAX_MAX_CHOICES).default(DEFAULT_MAX_CHOICES),
    thresholds: thresholdsSchema.default(DEFAULT_THRESHOLDS),
    students: z.array(studentSchema),
    answers: z.record(z.string(), answerSchema).default({}),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .refine((s) => new Set(s.students.map((st) => st.id)).size === s.students.length)
  .transform((s) => normalizeSurvey(s))

/**
 * Removes anything a form cannot legally contain: unknown classmates, the
 * student themself, duplicates, and a classmate named in both lists.
 */
export function normalizeSurvey(s: Survey): Survey {
  const ids = new Set(s.students.map((st) => st.id))
  const answers: Record<string, Answer> = {}
  for (const [id, a] of Object.entries(s.answers)) {
    if (!ids.has(id)) continue
    const clean = (list: string[]) => [...new Set(list)].filter((x) => x !== id && ids.has(x))
    const pos = clean(a.pos)
    const neg = clean(a.neg).filter((x) => !pos.includes(x))
    answers[id] = { pos, neg, absent: a.absent }
  }
  return { ...s, answers }
}

const workspaceSchema = z.object({
  app: z.literal("sociometry"),
  kind: z.literal("workspace"),
  version: z.literal(1),
  savedAt: z.string(),
  // Checked one by one below: a single unreadable survey must not hide the others.
  surveys: z.array(z.unknown()),
})

const surveyFileSchema = z.object({
  app: z.literal("sociometry"),
  kind: z.literal("survey"),
  version: z.literal(1),
  savedAt: z.string(),
  survey: surveySchema,
})

export class FileFormatError extends Error {}

export type ParsedFile =
  /** `skipped`: surveys in the file that could not be read and were left out. */
  | { kind: "workspace"; data: Workspace; skipped: number }
  | { kind: "survey"; data: SurveyFile }

/** Parses text from a data file or browser storage. Throws FileFormatError with a Russian message. */
export function parseDataFile(text: string): ParsedFile {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new FileFormatError("Файл повреждён или это не файл социометрии.")
  }
  if (!raw || typeof raw !== "object" || (raw as { app?: unknown }).app !== "sociometry") {
    throw new FileFormatError("Это не файл социометрии.")
  }
  const version = (raw as { version?: unknown }).version
  if (typeof version === "number" && version > 1) {
    throw new FileFormatError("Файл создан в более новой версии программы. Обновите страницу.")
  }
  const kind = (raw as { kind?: unknown }).kind
  if (kind === "workspace") {
    const r = workspaceSchema.safeParse(raw)
    if (r.success) {
      const surveys: Survey[] = []
      for (const item of r.data.surveys) {
        const s = surveySchema.safeParse(item)
        if (s.success) surveys.push(s.data)
      }
      return { kind: "workspace", data: { ...r.data, surveys }, skipped: r.data.surveys.length - surveys.length }
    }
  } else if (kind === "survey") {
    const r = surveyFileSchema.safeParse(raw)
    if (r.success) return { kind: "survey", data: r.data }
  }
  throw new FileFormatError("Файл повреждён: данные не удалось прочитать.")
}

export function makeWorkspace(surveys: Survey[]): Workspace {
  return { app: "sociometry", kind: "workspace", version: 1, savedAt: new Date().toISOString(), surveys }
}

export function makeSurveyFile(survey: Survey): SurveyFile {
  return { app: "sociometry", kind: "survey", version: 1, savedAt: new Date().toISOString(), survey }
}
