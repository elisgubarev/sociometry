import { describe, expect, it } from "vitest"
import { makeSampleSurvey } from "@/lib/sociometry/sample"
import type { Survey } from "@/lib/sociometry/types"
import { cloneSurvey, reducer, type Action, type WorkspaceState } from "./reducer"

const at = "2026-02-02T00:00:00.000Z"
const run = (state: WorkspaceState, action: Action) => reducer(state, { ...action, at } as Parameters<typeof reducer>[1])
const start = (): { state: WorkspaceState; s: Survey } => {
  const s = makeSampleSurvey("x", "2026-01-01T00:00:00.000Z")
  return { state: { surveys: [s] }, s }
}
const id = (s: Survey, i: number) => s.students[i].id

describe("toggleChoice", () => {
  it("adds and removes a choice and bumps updatedAt", () => {
    const { state, s } = start()
    const timur = id(s, 13)
    let next = run(state, { type: "toggleChoice", surveyId: "x", studentId: timur, targetId: id(s, 0), kind: "pos" })
    expect(next.surveys[0].answers[timur].pos).toEqual([id(s, 0)])
    expect(next.surveys[0].updatedAt).toBe(at)
    next = run(next, { type: "toggleChoice", surveyId: "x", studentId: timur, targetId: id(s, 0), kind: "pos" })
    expect(next.surveys[0].answers[timur].pos).toEqual([])
  })

  it("refuses over the limit, on self, and when already in the other list", () => {
    const { state, s } = start()
    const anna = id(s, 0) // already has 3 positive choices and Павел as negative
    expect(run(state, { type: "toggleChoice", surveyId: "x", studentId: anna, targetId: id(s, 13), kind: "pos" })).toBe(state)
    expect(run(state, { type: "toggleChoice", surveyId: "x", studentId: anna, targetId: anna, kind: "neg" })).toBe(state)
    expect(run(state, { type: "toggleChoice", surveyId: "x", studentId: anna, targetId: id(s, 11), kind: "pos" })).toBe(state)
  })
})

describe("students", () => {
  it("deleting a student removes them from everyone's answers", () => {
    const { state, s } = start()
    const maria = id(s, 8)
    const next = run(state, { type: "deleteStudent", surveyId: "x", studentId: maria }).surveys[0]
    expect(next.students).toHaveLength(13)
    expect(next.answers[maria]).toBeUndefined()
    for (const a of Object.values(next.answers)) {
      expect(a.pos).not.toContain(maria)
      expect(a.neg).not.toContain(maria)
    }
  })

  it("renames with cleanup and ignores blank names", () => {
    const { state, s } = start()
    const next = run(state, { type: "renameStudent", surveyId: "x", studentId: id(s, 0), name: "  Анна   Белая " })
    expect(next.surveys[0].students[0].name).toBe("Анна Белая")
    expect(run(state, { type: "renameStudent", surveyId: "x", studentId: id(s, 0), name: "  " })).toBe(state)
  })

  it("adds students", () => {
    const { state } = start()
    const next = run(state, { type: "addStudents", surveyId: "x", students: [{ id: "new", name: "Новый Ученик" }] })
    expect(next.surveys[0].students.at(-1)).toEqual({ id: "new", name: "Новый Ученик" })
  })
})

describe("settings", () => {
  it("does not lower the choice limit below what forms already use", () => {
    const { state } = start()
    expect(run(state, { type: "updateSettings", surveyId: "x", patch: { maxChoices: 2 } })).toBe(state)
    expect(run(state, { type: "updateSettings", surveyId: "x", patch: { maxChoices: 4 } }).surveys[0].maxChoices).toBe(4)
  })

  it("keeps thresholds ordered", () => {
    const { state } = start()
    expect(run(state, { type: "updateSettings", surveyId: "x", patch: { thresholds: { star: 3, pref: 3, acc: 1 } } })).toBe(state)
    const ok = run(state, { type: "updateSettings", surveyId: "x", patch: { thresholds: { star: 5, pref: 3, acc: 1 } } })
    expect(ok.surveys[0].thresholds.star).toBe(5)
  })

  it("absent keeps the choices", () => {
    const { state, s } = start()
    const anna = id(s, 0)
    const next = run(state, { type: "setAbsent", surveyId: "x", studentId: anna, absent: true })
    expect(next.surveys[0].answers[anna].absent).toBe(true)
    expect(next.surveys[0].answers[anna].pos).toHaveLength(3)
  })
})

describe("cloneSurvey", () => {
  it("remaps ids consistently", () => {
    const { s } = start()
    let n = 0
    const c = cloneSurvey(s, { id: "y", makeId: () => `n${n++}`, at, withAnswers: true })
    expect(c.students.map((st) => st.name)).toEqual(s.students.map((st) => st.name))
    const ids = new Set(c.students.map((st) => st.id))
    for (const [k, a] of Object.entries(c.answers)) {
      expect(ids.has(k)).toBe(true)
      for (const x of [...a.pos, ...a.neg]) expect(ids.has(x)).toBe(true)
    }
    expect(Object.keys(c.answers)).toHaveLength(13)
    expect(Object.keys(cloneSurvey(s, { id: "z", makeId: () => `m${n++}`, at, withAnswers: false }).answers)).toHaveLength(0)
  })
})

describe("moveStudent", () => {
  it("moves a student to a new position and keeps the answers", () => {
    const { state, s } = start()
    const anna = id(s, 0)
    const next = run(state, { type: "moveStudent", surveyId: "x", studentId: anna, toIndex: 2 }).surveys[0]
    expect(next.students.map((st) => st.id).slice(0, 3)).toEqual([id(s, 1), id(s, 2), anna])
    expect(next.answers).toBe(s.answers)
    expect(run(state, { type: "moveStudent", surveyId: "x", studentId: anna, toIndex: 0 })).toBe(state)
  })
})
