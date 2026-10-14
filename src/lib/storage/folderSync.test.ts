import { describe, expect, it } from "vitest"
import { makeSampleSurvey } from "@/lib/sociometry/sample"
import { makeSurveyFile } from "@/lib/sociometry/schema"
import type { Survey } from "@/lib/sociometry/types"
import { fileNameFor, parseFolder, reconcile } from "./folderSync"

function survey(id: string, updatedAt = "2026-01-01T00:00:00.000Z", className = "7 «Б»"): Survey {
  return { ...makeSampleSurvey(id, "2026-01-01T00:00:00.000Z"), className, date: "2026-10-14", updatedAt }
}

const file = (s: Survey, name = `${s.id}.json`) => ({ name, text: JSON.stringify(makeSurveyFile(s)) })
const ids = (list: Survey[]) => list.map((s) => s.id).sort()

describe("parseFolder", () => {
  it("reads survey files and ignores other JSON", () => {
    const scan = parseFolder([file(survey("a")), { name: "other.json", text: '{"x":1}' }], [])
    expect([...scan.entries.keys()]).toEqual(["a"])
    expect(scan.names.has("other.json")).toBe(true)
    expect(scan.complete).toBe(true)
  })

  it("keeps the newer of two copies of one survey", () => {
    const scan = parseFolder([file(survey("a", "2026-01-02"), "new.json"), file(survey("a"), "old.json")], [])
    expect(scan.entries.get("a")?.name).toBe("new.json")
  })

  it("is incomplete when a survey file is broken or unreadable", () => {
    const broken = { name: "b.json", text: JSON.stringify({ app: "sociometry", kind: "survey", version: 1, survey: {} }) }
    expect(parseFolder([broken], []).complete).toBe(false)
    expect(parseFolder([], ["x.json"]).complete).toBe(false)
  })
})

describe("reconcile", () => {
  it("first sync: union of both sides", () => {
    const r = reconcile([survey("a")], parseFolder([file(survey("b"))], []), new Set())
    expect(ids(r.surveys)).toEqual(["a", "b"])
    expect(r.changed).toBe(true)
    expect(r.deleteNames).toEqual([])
  })

  it("the newer version wins", () => {
    const newer = survey("a", "2026-02-01")
    const r1 = reconcile([survey("a")], parseFolder([file(newer)], []), new Set(["a"]))
    expect(r1.surveys[0].updatedAt).toBe("2026-02-01")
    expect(r1.changed).toBe(true)
    const r2 = reconcile([newer], parseFolder([file(survey("a"))], []), new Set(["a"]))
    expect(r2.surveys[0]).toBe(newer)
    expect(r2.changed).toBe(false)
  })

  it("deleted here while the folder was out of reach: its file is removed", () => {
    const r = reconcile([], parseFolder([file(survey("a"), "a.json")], []), new Set(["a"]))
    expect(r.surveys).toEqual([])
    expect(r.deleteNames).toEqual(["a.json"])
  })

  it("file deleted elsewhere: the survey is dropped, unless the folder could not be fully read", () => {
    expect(reconcile([survey("a")], parseFolder([], []), new Set(["a"])).surveys).toEqual([])
    expect(ids(reconcile([survey("a")], parseFolder([], ["x.json"]), new Set(["a"])).surveys)).toEqual(["a"])
  })

  it("a survey created here is kept", () => {
    const r = reconcile([survey("a")], parseFolder([], []), new Set())
    expect(ids(r.surveys)).toEqual(["a"])
    expect(r.changed).toBe(false)
  })
})

describe("fileNameFor", () => {
  const none = () => false
  it("uses class and date", () => {
    expect(fileNameFor(survey("a"), undefined, none)).toBe("7 Б 14.10.2026.json")
  })
  it("adds a number on a clash", () => {
    expect(fileNameFor(survey("a"), undefined, (n) => n === "7 Б 14.10.2026.json")).toBe("7 Б 14.10.2026 (2).json")
  })
  it("keeps the current name while it still fits, renames when the class changes", () => {
    expect(fileNameFor(survey("a"), "7 Б 14.10.2026 (2).json", () => true)).toBe("7 Б 14.10.2026 (2).json")
    expect(fileNameFor(survey("a", undefined, "8 А"), "7 Б 14.10.2026.json", none)).toBe("8 А 14.10.2026.json")
  })
})
