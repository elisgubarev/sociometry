// Regression: ISSUE-001 / ISSUE-002 — one survey with an unreadable date made the whole
// browser copy fail validation, so every survey disappeared after a reload.
// Found by /qa on 2026-10-14
// Report: .gstack/qa-reports/qa-report-localhost-2026-10-14.md
import { describe, expect, it } from "vitest"
import { makeSampleSurvey } from "./sample"
import { FileFormatError, makeWorkspace, parseDataFile } from "./schema"

const at = "2026-01-01T00:00:00.000Z"

describe("parseDataFile: one bad survey in a workspace", () => {
  it("keeps the readable surveys and counts the skipped one", () => {
    const good = makeSampleSurvey("good", at)
    const bad = { ...makeSampleSurvey("bad", at), date: "20266-10-14" }
    const r = parseDataFile(JSON.stringify(makeWorkspace([good, bad])))
    if (r.kind !== "workspace") throw new Error("kind")
    expect(r.data.surveys.map((s) => s.id)).toEqual(["good"])
    expect(r.skipped).toBe(1)
  })

  it("skips a survey that is not an object at all", () => {
    const ws = { ...makeWorkspace([makeSampleSurvey("good", at)]) }
    const r = parseDataFile(JSON.stringify({ ...ws, surveys: [...ws.surveys, null, "x"] }))
    if (r.kind !== "workspace") throw new Error("kind")
    expect(r.data.surveys).toHaveLength(1)
    expect(r.skipped).toBe(2)
  })

  it("reports nothing skipped for a clean workspace", () => {
    const r = parseDataFile(JSON.stringify(makeWorkspace([makeSampleSurvey("a", at)])))
    expect(r.kind === "workspace" && r.skipped).toBe(0)
  })

  it("still rejects a workspace whose surveys field is not a list", () => {
    expect(() => parseDataFile(JSON.stringify({ ...makeWorkspace([]), surveys: "nope" }))).toThrow(FileFormatError)
  })
})
