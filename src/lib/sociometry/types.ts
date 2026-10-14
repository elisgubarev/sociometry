export interface Student {
  id: string
  name: string
}

/** One paper form: whom the student named (classmate ids). */
export interface Answer {
  pos: string[]
  neg: string[]
  absent: boolean
}

/** Minimum number of received positive choices for each category. */
export interface Thresholds {
  star: number
  pref: number
  acc: number
}

export interface Survey {
  id: string
  className: string
  /** YYYY-MM-DD */
  date: string
  questionPos: string
  questionNeg: string
  useNeg: boolean
  maxChoices: number
  thresholds: Thresholds
  students: Student[]
  answers: Record<string, Answer>
  createdAt: string
  updatedAt: string
}

export interface Workspace {
  app: "sociometry"
  kind: "workspace"
  version: 1
  savedAt: string
  surveys: Survey[]
}

export interface SurveyFile {
  app: "sociometry"
  kind: "survey"
  version: 1
  savedAt: string
  survey: Survey
}

export type CategoryKey = "star" | "pref" | "acc" | "iso" | "rej"

export type ChoiceKind = "pos" | "neg"
