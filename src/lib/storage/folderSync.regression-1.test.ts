// Regression: ISSUE-011 — an empty (or swapped) folder made every saved survey look
// "deleted elsewhere", so all surveys vanished from the app and the browser copy.
// Found by /qa on 2026-10-14
// Report: .gstack/qa-reports/qa-report-localhost-2026-10-14.md
import { describe, expect, it } from "vitest"
import { makeSampleSurvey } from "@/lib/sociometry/sample"
import { makeSurveyFile } from "@/lib/sociometry/schema"
import type { Survey } from "@/lib/sociometry/types"
import { parseFolder, reconcile } from "./folderSync"

const survey = (id: string): Survey => makeSampleSurvey(id, "2026-01-01T00:00:00.000Z")
const file = (s: Survey) => ({ name: `${s.id}.json`, text: JSON.stringify(makeSurveyFile(s)) })
const ids = (list: Survey[]) => list.map((s) => s.id).sort()

describe("reconcile: folder that holds none of the known surveys", () => {
  it("drops nothing when the folder is empty", () => {
    const r = reconcile([survey("a"), survey("b")], parseFolder([], []), new Set(["a", "b"]))
    expect(ids(r.surveys)).toEqual(["a", "b"])
    expect(r.changed).toBe(false)
  })

  it("drops nothing when the folder only has unrelated surveys", () => {
    const r = reconcile([survey("a")], parseFolder([file(survey("x"))], []), new Set(["a"]))
    expect(ids(r.surveys)).toEqual(["a", "x"])
  })

  it("still drops a survey deleted elsewhere while other known files are present", () => {
    const r = reconcile([survey("a"), survey("b")], parseFolder([file(survey("a"))], []), new Set(["a", "b"]))
    expect(ids(r.surveys)).toEqual(["a"])
  })
})
