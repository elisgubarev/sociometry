import { describe, expect, it } from "vitest"
import { cleanName, parseNameList, sameName, splitName } from "./names"

describe("parseNameList", () => {
  it("parses one name per line and skips blanks", () => {
    expect(parseNameList("Белова Анна\n\n  Волков   Артём \r\nГромова Виктория\n").names).toEqual([
      "Белова Анна",
      "Волков Артём",
      "Громова Виктория",
    ])
  })

  it("strips list numbering", () => {
    expect(parseNameList("1. Белова Анна\n2) Волков Артём\n3 Громова Вика\n10 - Егоров Даниил").names).toEqual([
      "Белова Анна",
      "Волков Артём",
      "Громова Вика",
      "Егоров Даниил",
    ])
  })

  it("joins spreadsheet cells and drops number cells", () => {
    expect(parseNameList("1\tБелова\tАнна\n2\tВолков\tАртём").names).toEqual(["Белова Анна", "Волков Артём"])
  })

  it("reports duplicates, treating ё as е and ignoring case", () => {
    const r = parseNameList("Пётр Орлов\nПетр орлов\nАнна Белова")
    expect(r.names).toEqual(["Пётр Орлов", "Анна Белова"])
    expect(r.duplicates).toEqual(["Петр орлов"])
  })
})

describe("helpers", () => {
  it("cleanName keeps names that start with letters", () => {
    expect(cleanName("  Анна   Белова ")).toBe("Анна Белова")
  })
  it("sameName", () => {
    expect(sameName("Алёна", "алена")).toBe(true)
  })
  it("splitName", () => {
    expect(splitName("Анна Мария Белова")).toEqual({ first: "Анна", rest: "Мария Белова" })
    expect(splitName("Анна")).toEqual({ first: "Анна", rest: "" })
  })
})
