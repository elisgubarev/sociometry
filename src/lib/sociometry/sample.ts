import { DEFAULT_QUESTION_NEG, DEFAULT_QUESTION_POS, DEFAULT_THRESHOLDS } from "./defaults"
import type { Answer, Survey } from "./types"

const NAMES = [
  "Анна Белова",
  "Артём Волков",
  "Виктория Громова",
  "Даниил Егоров",
  "Ева Жукова",
  "Иван Зайцев",
  "Кира Ильина",
  "Лев Котов",
  "Мария Лебедева",
  "Никита Морозов",
  "Олеся Новикова",
  "Павел Орлов",
  "София Петрова",
  "Тимур Рахимов",
]

// Indexes into NAMES. The last student's form has not been entered.
const POS: (number[] | null)[] = [
  [8, 4, 2], [3, 5, 9], [0, 8, 4], [1, 5, 7], [8, 0, 12], [1, 3, 7], [12, 8, 10],
  [1, 3, 9], [4, 0, 12], [1, 7, 6], [8, 6, 2], [1, 8, 10], [8, 4, 1], null,
]
const NEG: (number[] | null)[] = [
  [11], [11], [11, 9], [], [11], [2], [11], [], [11], [2], [11], [3], [11], null,
]

/** The demo class shown in the approved mockup: 14 students, 13 forms entered. */
export function makeSampleSurvey(id: string, now = new Date().toISOString()): Survey {
  const sid = (i: number) => `${id}-s${i}`
  const answers: Record<string, Answer> = {}
  NAMES.forEach((_, i) => {
    const p = POS[i]
    const q = NEG[i]
    if (p && q) answers[sid(i)] = { pos: p.map(sid), neg: q.map(sid), absent: false }
  })
  return {
    id,
    className: "Пример: 7 «Б»",
    date: "2026-09-15",
    questionPos: DEFAULT_QUESTION_POS,
    questionNeg: DEFAULT_QUESTION_NEG,
    useNeg: true,
    maxChoices: 3,
    thresholds: { ...DEFAULT_THRESHOLDS },
    students: NAMES.map((name, i) => ({ id: sid(i), name })),
    answers,
    createdAt: now,
    updatedAt: now,
  }
}
