import { describe, expect, it } from "vitest"
import { FileFormatError, makeSurveyFile, makeWorkspace, parseDataFile } from "./schema"
import { makeSampleSurvey } from "./sample"

const sample = () => makeSampleSurvey("t", "2026-01-01T00:00:00.000Z")

describe("parseDataFile", () => {
  it("round-trips a workspace", () => {
    const ws = makeWorkspace([sample()])
    const r = parseDataFile(JSON.stringify(ws))
    expect(r.kind).toBe("workspace")
    if (r.kind === "workspace") expect(r.data.surveys[0]).toEqual(sample())
  })

  it("round-trips a single survey file", () => {
    const r = parseDataFile(JSON.stringify(makeSurveyFile(sample())))
    expect(r.kind).toBe("survey")
  })

  it("cleans illegal answers", () => {
    const s = sample()
    const a = s.students[0].id
    const b = s.students[1].id
    s.answers[a] = { pos: [b, b, a, "ghost"], neg: [b], absent: false }
    s.answers.ghost = { pos: [a], neg: [], absent: false }
    const r = parseDataFile(JSON.stringify(makeSurveyFile(s)))
    if (r.kind !== "survey") throw new Error("kind")
    expect(r.data.survey.answers[a]).toEqual({ pos: [b], neg: [], absent: false })
    expect(r.data.survey.answers.ghost).toBeUndefined()
  })

  it.each([
    ["not json", "{oops"],
    ["foreign json", JSON.stringify({ hello: 1 })],
    ["broken survey", JSON.stringify({ ...makeSurveyFile(sample()), survey: { id: 1 } })],
    ["bad thresholds", JSON.stringify(makeSurveyFile({ ...sample(), thresholds: { star: 2, pref: 3, acc: 1 } }))],
    ["newer version", JSON.stringify({ ...makeWorkspace([]), version: 2 })],
  ])("rejects %s", (_, text) => {
    expect(() => parseDataFile(text)).toThrow(FileFormatError)
  })
})
