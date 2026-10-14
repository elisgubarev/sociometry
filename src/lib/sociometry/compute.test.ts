import { describe, expect, it } from "vitest"
import { categorize, computeResults, sortByStatus } from "./compute"
import { makeSampleSurvey } from "./sample"
import type { Survey } from "./types"

const sample = () => makeSampleSurvey("t", "2026-01-01T00:00:00.000Z")
const byName = (s: Survey, name: string) => s.students.find((st) => st.name === name)!.id

describe("computeResults on the sample class", () => {
  const survey = sample()
  const r = computeResults(survey)
  const get = (name: string) => r.byId[byName(survey, name)]

  it("counts the group indices", () => {
    expect(r.mutualPairs).toBe(13)
    expect(r.mutualNegPairs).toBe(1)
    expect(r.totalPos).toBe(39)
    expect(r.totalNeg).toBe(12)
    expect(r.filledCount).toBe(13)
  })

  it("assigns categories", () => {
    expect(r.categoryCounts).toEqual({ star: 2, pref: 5, acc: 5, iso: 1, rej: 1 })
    expect(get("Мария Лебедева").category).toBe("star")
    expect(get("Артём Волков").category).toBe("star")
    expect(get("Тимур Рахимов").category).toBe("iso")
    expect(get("Павел Орлов").category).toBe("rej")
  })

  it("computes per-student indices", () => {
    const m = get("Мария Лебедева")
    expect([m.recvPos, m.recvNeg, m.madePos, m.mutPos]).toEqual([7, 0, 3, 3])
    const p = get("Павел Орлов")
    expect([p.recvPos, p.recvNeg, p.madePos, p.madeNeg]).toEqual([0, 8, 3, 1])
    expect(get("Тимур Рахимов").filled).toBe(false)
  })

  it("builds the matrix with mutual marks", () => {
    const i = survey.students.findIndex((s) => s.name === "Анна Белова")
    const j = survey.students.findIndex((s) => s.name === "Мария Лебедева")
    const k = survey.students.findIndex((s) => s.name === "Павел Орлов")
    expect(r.matrix[i][i]).toBe("self")
    expect(r.matrix[i][j]).toBe("pos-mutual")
    expect(r.matrix[i][k]).toBe("neg")
    const v = survey.students.findIndex((s) => s.name === "Виктория Громова")
    const n = survey.students.findIndex((s) => s.name === "Никита Морозов")
    expect(r.matrix[v][n]).toBe("neg-mutual")
  })

  it("sorts by status", () => {
    const order = sortByStatus(r.students).map((s) => s.name)
    expect(order.slice(0, 3)).toEqual(["Мария Лебедева", "Артём Волков", "Ева Жукова"])
    expect(order.at(-1)).toBe("Павел Орлов")
  })
})

describe("rules", () => {
  it("ignores negative choices when the negative question is off", () => {
    const s = { ...sample(), useNeg: false }
    const r = computeResults(s)
    expect(r.totalNeg).toBe(0)
    expect(r.categoryCounts.rej).toBe(0)
    expect(r.byId[byName(s, "Павел Орлов")].category).toBe("iso")
  })

  it("ignores the choices of an absent student but still counts them as entered", () => {
    const s = sample()
    const anna = byName(s, "Анна Белова")
    s.answers[anna] = { ...s.answers[anna], absent: true }
    const r = computeResults(s)
    expect(r.byId[anna].madePos).toBe(0)
    expect(r.byId[anna].filled).toBe(true)
    expect(r.totalPos).toBe(36)
    expect(r.byId[byName(s, "Мария Лебедева")].recvPos).toBe(6)
  })

  it("categorizes on threshold edges", () => {
    const t = { star: 6, pref: 3, acc: 1 }
    expect(categorize(6, 0, t)).toBe("star")
    expect(categorize(5, 0, t)).toBe("pref")
    expect(categorize(3, 4, t)).toBe("pref")
    expect(categorize(2, 0, t)).toBe("acc")
    expect(categorize(1, 3, t)).toBe("acc")
    expect(categorize(0, 1, t)).toBe("rej")
    expect(categorize(0, 0, t)).toBe("iso")
  })

  it("handles an empty class", () => {
    const s = { ...sample(), students: [], answers: {} }
    const r = computeResults(s)
    expect(r.students).toEqual([])
    expect(r.mutualPairs).toBe(0)
  })
})
