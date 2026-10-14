import { MAX_MAX_CHOICES, MAX_THRESHOLD, MIN_MAX_CHOICES } from "@/lib/sociometry/defaults"
import { cleanName } from "@/lib/sociometry/names"
import type { Answer, ChoiceKind, Student, Survey, Thresholds } from "@/lib/sociometry/types"

export interface WorkspaceState {
  surveys: Survey[]
}

export type SurveySettings = Pick<
  Survey,
  "className" | "date" | "questionPos" | "questionNeg" | "useNeg" | "maxChoices" | "thresholds"
>

export type Action =
  | { type: "load"; surveys: Survey[] }
  | { type: "createSurvey"; survey: Survey }
  | { type: "upsertSurveys"; surveys: Survey[] }
  | { type: "updateSettings"; surveyId: string; patch: Partial<SurveySettings> }
  | { type: "deleteSurvey"; surveyId: string }
  | { type: "addStudents"; surveyId: string; students: Student[] }
  | { type: "renameStudent"; surveyId: string; studentId: string; name: string }
  | { type: "deleteStudent"; surveyId: string; studentId: string }
  | { type: "moveStudent"; surveyId: string; studentId: string; toIndex: number }
  | { type: "toggleChoice"; surveyId: string; studentId: string; targetId: string; kind: ChoiceKind }
  | { type: "setAbsent"; surveyId: string; studentId: string; absent: boolean }
  | { type: "clearAnswer"; surveyId: string; studentId: string }

/** Every action carries the time it happened so the reducer stays pure. */
export type TimedAction = Action & { at: string }

const EMPTY_ANSWER: Answer = { pos: [], neg: [], absent: false }

/** The largest number of choices any form already uses in either question. */
export function maxChoicesUsed(s: Survey): number {
  let m = 0
  for (const a of Object.values(s.answers)) m = Math.max(m, a.pos.length, a.neg.length)
  return m
}

export function validThresholds(t: Thresholds): boolean {
  return (
    Number.isInteger(t.acc) &&
    Number.isInteger(t.pref) &&
    Number.isInteger(t.star) &&
    t.acc >= 1 &&
    t.acc < t.pref &&
    t.pref < t.star &&
    t.star <= MAX_THRESHOLD
  )
}

function applySettings(s: Survey, patch: Partial<SurveySettings>): Survey | null {
  const next: Survey = { ...s }
  let changed = false
  if (patch.className !== undefined) {
    const v = patch.className.replace(/\s+/g, " ").trim()
    if (v && v !== s.className) {
      next.className = v
      changed = true
    }
  }
  if (patch.date !== undefined && /^\d{4}-\d{2}-\d{2}$/.test(patch.date) && patch.date !== s.date) {
    next.date = patch.date
    changed = true
  }
  if (patch.questionPos !== undefined && patch.questionPos !== s.questionPos) {
    next.questionPos = patch.questionPos
    changed = true
  }
  if (patch.questionNeg !== undefined && patch.questionNeg !== s.questionNeg) {
    next.questionNeg = patch.questionNeg
    changed = true
  }
  if (patch.useNeg !== undefined && patch.useNeg !== s.useNeg) {
    next.useNeg = patch.useNeg
    changed = true
  }
  if (patch.maxChoices !== undefined && patch.maxChoices !== s.maxChoices) {
    const v = patch.maxChoices
    if (Number.isInteger(v) && v >= Math.max(MIN_MAX_CHOICES, maxChoicesUsed(s)) && v <= MAX_MAX_CHOICES) {
      next.maxChoices = v
      changed = true
    }
  }
  if (patch.thresholds !== undefined && validThresholds(patch.thresholds)) {
    const t = patch.thresholds
    if (t.star !== s.thresholds.star || t.pref !== s.thresholds.pref || t.acc !== s.thresholds.acc) {
      next.thresholds = { ...t }
      changed = true
    }
  }
  return changed ? next : null
}

function updateSurvey(
  state: WorkspaceState,
  id: string,
  at: string,
  fn: (s: Survey) => Survey | null,
): WorkspaceState {
  let changed = false
  const surveys = state.surveys.map((s) => {
    if (s.id !== id) return s
    const next = fn(s)
    if (!next) return s
    changed = true
    return { ...next, updatedAt: at }
  })
  return changed ? { surveys } : state
}

function setAnswer(s: Survey, studentId: string, answer: Answer): Survey {
  return { ...s, answers: { ...s.answers, [studentId]: answer } }
}

export function reducer(state: WorkspaceState, action: TimedAction): WorkspaceState {
  const { at } = action
  switch (action.type) {
    case "load":
      return { surveys: action.surveys }

    case "createSurvey":
      return { surveys: [action.survey, ...state.surveys] }

    case "upsertSurveys": {
      const incoming = new Map(action.surveys.map((s) => [s.id, s]))
      const kept = state.surveys.map((s) => incoming.get(s.id) ?? s)
      const existing = new Set(state.surveys.map((s) => s.id))
      const added = action.surveys.filter((s) => !existing.has(s.id))
      return { surveys: [...added, ...kept] }
    }

    case "updateSettings":
      return updateSurvey(state, action.surveyId, at, (s) => applySettings(s, action.patch))

    case "deleteSurvey": {
      const surveys = state.surveys.filter((s) => s.id !== action.surveyId)
      return surveys.length === state.surveys.length ? state : { surveys }
    }

    case "addStudents":
      return updateSurvey(state, action.surveyId, at, (s) => {
        const known = new Set(s.students.map((st) => st.id))
        const fresh = action.students
          .map((st) => ({ id: st.id, name: cleanName(st.name) }))
          .filter((st) => st.name && !known.has(st.id))
        return fresh.length ? { ...s, students: [...s.students, ...fresh] } : null
      })

    case "renameStudent":
      return updateSurvey(state, action.surveyId, at, (s) => {
        const name = cleanName(action.name)
        if (!name) return null
        let changed = false
        const students = s.students.map((st) => {
          if (st.id !== action.studentId || st.name === name) return st
          changed = true
          return { ...st, name }
        })
        return changed ? { ...s, students } : null
      })

    case "moveStudent":
      return updateSurvey(state, action.surveyId, at, (s) => {
        const from = s.students.findIndex((st) => st.id === action.studentId)
        const to = Math.max(0, Math.min(action.toIndex, s.students.length - 1))
        if (from < 0 || from === to) return null
        const students = [...s.students]
        const [moved] = students.splice(from, 1)
        students.splice(to, 0, moved)
        return { ...s, students }
      })

    case "deleteStudent":
      return updateSurvey(state, action.surveyId, at, (s) => {
        const id = action.studentId
        if (!s.students.some((st) => st.id === id)) return null
        const answers: Record<string, Answer> = {}
        for (const [k, a] of Object.entries(s.answers)) {
          if (k === id) continue
          answers[k] = { ...a, pos: a.pos.filter((x) => x !== id), neg: a.neg.filter((x) => x !== id) }
        }
        return { ...s, students: s.students.filter((st) => st.id !== id), answers }
      })

    case "toggleChoice":
      return updateSurvey(state, action.surveyId, at, (s) => {
        const { studentId, targetId, kind } = action
        if (studentId === targetId) return null
        const ids = new Set(s.students.map((st) => st.id))
        if (!ids.has(studentId) || !ids.has(targetId)) return null
        const a = s.answers[studentId] ?? EMPTY_ANSWER
        if (a.absent) return null
        const other: ChoiceKind = kind === "pos" ? "neg" : "pos"
        const list = a[kind]
        if (list.includes(targetId)) {
          return setAnswer(s, studentId, { ...a, [kind]: list.filter((x) => x !== targetId) })
        }
        if (a[other].includes(targetId) || list.length >= s.maxChoices) return null
        return setAnswer(s, studentId, { ...a, [kind]: [...list, targetId] })
      })

    case "setAbsent":
      return updateSurvey(state, action.surveyId, at, (s) => {
        if (!s.students.some((st) => st.id === action.studentId)) return null
        const a = s.answers[action.studentId] ?? EMPTY_ANSWER
        if (a.absent === action.absent) return null
        // Choices are kept (a mis-click is undoable) but ignored while absent.
        return setAnswer(s, action.studentId, { ...a, absent: action.absent })
      })

    case "clearAnswer":
      return updateSurvey(state, action.surveyId, at, (s) => {
        if (!s.answers[action.studentId]) return null
        const answers = { ...s.answers }
        delete answers[action.studentId]
        return { ...s, answers }
      })
  }
}

/**
 * Copies a survey under new ids (for "Добавить копией" and "Повторный опрос").
 * `withAnswers: false` keeps the class list and settings but starts with empty forms.
 */
export function cloneSurvey(
  s: Survey,
  opts: { id: string; makeId: () => string; at: string; className?: string; withAnswers: boolean; date?: string },
): Survey {
  const map = new Map(s.students.map((st) => [st.id, opts.makeId()]))
  const remap = (list: string[]) => list.map((x) => map.get(x)).filter((x): x is string => !!x)
  const answers: Record<string, Answer> = {}
  if (opts.withAnswers) {
    for (const [k, a] of Object.entries(s.answers)) {
      const nk = map.get(k)
      if (nk) answers[nk] = { pos: remap(a.pos), neg: remap(a.neg), absent: a.absent }
    }
  }
  return {
    ...s,
    id: opts.id,
    className: opts.className ?? s.className,
    date: opts.date ?? s.date,
    thresholds: { ...s.thresholds },
    students: s.students.map((st) => ({ id: map.get(st.id)!, name: st.name })),
    answers,
    createdAt: opts.at,
    updatedAt: opts.at,
  }
}
