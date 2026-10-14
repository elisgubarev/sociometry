import type { CategoryKey, Survey, Thresholds } from "./types"

export interface StudentStats {
  id: string
  name: string
  /** 1-based position in the class list. */
  num: number
  /** Sociometric status: positive choices received. */
  recvPos: number
  recvNeg: number
  madePos: number
  madeNeg: number
  mutPos: number
  mutNeg: number
  /** The form has been entered (choices made or marked absent). */
  filled: boolean
  absent: boolean
  category: CategoryKey
}

export type CellKind = "self" | "empty" | "pos" | "pos-mutual" | "neg" | "neg-mutual"

export interface SurveyResults {
  students: StudentStats[]
  byId: Record<string, StudentStats>
  /** matrix[row][col]: what the row student did to the column student. */
  matrix: CellKind[][]
  mutualPairs: number
  mutualNegPairs: number
  totalPos: number
  totalNeg: number
  filledCount: number
  categoryCounts: Record<CategoryKey, number>
}

export function categorize(recvPos: number, recvNeg: number, t: Thresholds): CategoryKey {
  if (recvPos >= t.star) return "star"
  if (recvPos >= t.pref) return "pref"
  if (recvPos >= t.acc) return "acc"
  if (recvNeg > 0) return "rej"
  return "iso"
}

export function computeResults(survey: Survey): SurveyResults {
  const { students, answers, useNeg, thresholds } = survey
  const n = students.length
  const index = new Map(students.map((s, i) => [s.id, i]))

  // Adjacency matrices of who chose whom (absent students make no choices).
  const pos: boolean[][] = students.map(() => new Array<boolean>(n).fill(false))
  const neg: boolean[][] = students.map(() => new Array<boolean>(n).fill(false))
  students.forEach((s, i) => {
    const a = answers[s.id]
    if (!a || a.absent) return
    for (const id of a.pos) {
      const j = index.get(id)
      if (j !== undefined && j !== i) pos[i][j] = true
    }
    if (useNeg) {
      for (const id of a.neg) {
        const j = index.get(id)
        if (j !== undefined && j !== i && !pos[i][j]) neg[i][j] = true
      }
    }
  })

  const stats: StudentStats[] = students.map((s, i) => {
    let recvPos = 0
    let recvNeg = 0
    let madePos = 0
    let madeNeg = 0
    let mutPos = 0
    let mutNeg = 0
    for (let j = 0; j < n; j++) {
      if (j === i) continue
      if (pos[j][i]) recvPos++
      if (neg[j][i]) recvNeg++
      if (pos[i][j]) madePos++
      if (neg[i][j]) madeNeg++
      if (pos[i][j] && pos[j][i]) mutPos++
      if (neg[i][j] && neg[j][i]) mutNeg++
    }
    const a = answers[s.id]
    const absent = !!a?.absent
    const filled = !!a && (absent || a.pos.length > 0 || a.neg.length > 0)
    return {
      id: s.id,
      name: s.name,
      num: i + 1,
      recvPos,
      recvNeg,
      madePos,
      madeNeg,
      mutPos,
      mutNeg,
      filled,
      absent,
      category: categorize(recvPos, recvNeg, thresholds),
    }
  })

  const matrix: CellKind[][] = students.map((_, i) =>
    students.map((__, j): CellKind => {
      if (i === j) return "self"
      if (pos[i][j]) return pos[j][i] ? "pos-mutual" : "pos"
      if (neg[i][j]) return neg[j][i] ? "neg-mutual" : "neg"
      return "empty"
    }),
  )

  const categoryCounts: Record<CategoryKey, number> = { star: 0, pref: 0, acc: 0, iso: 0, rej: 0 }
  let totalPos = 0
  let totalNeg = 0
  let mutPosSum = 0
  let mutNegSum = 0
  let filledCount = 0
  for (const s of stats) {
    categoryCounts[s.category]++
    totalPos += s.madePos
    totalNeg += s.madeNeg
    mutPosSum += s.mutPos
    mutNegSum += s.mutNeg
    if (s.filled) filledCount++
  }

  return {
    students: stats,
    byId: Object.fromEntries(stats.map((s) => [s.id, s])),
    matrix,
    mutualPairs: mutPosSum / 2,
    mutualNegPairs: mutNegSum / 2,
    totalPos,
    totalNeg,
    filledCount,
    categoryCounts,
  }
}

/** Students ordered for the results table: highest status first. */
export function sortByStatus(list: StudentStats[]): StudentStats[] {
  return [...list].sort((a, b) => b.recvPos - a.recvPos || a.recvNeg - b.recvNeg || a.num - b.num)
}
