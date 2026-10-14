import { describe, expect, it } from "vitest"
import { formatDateLong, formatDateShort, maxChoicesLabel, plural, studentsLabel } from "./ru"

describe("plural", () => {
  const w = (n: number) => plural(n, "ученик", "ученика", "учеников")
  it.each([
    [1, "ученик"],
    [2, "ученика"],
    [4, "ученика"],
    [5, "учеников"],
    [11, "учеников"],
    [12, "учеников"],
    [14, "учеников"],
    [21, "ученик"],
    [22, "ученика"],
    [25, "учеников"],
    [101, "ученик"],
    [111, "учеников"],
    [0, "учеников"],
  ])("%i → %s", (n, word) => expect(w(n)).toBe(word))

  it("labels", () => {
    expect(studentsLabel(14)).toBe("14 учеников")
    expect(maxChoicesLabel(3)).toBe("до 3 выборов")
    expect(maxChoicesLabel(1)).toBe("до 1 выбора")
  })
})

describe("dates", () => {
  it("formats ISO dates in Russian", () => {
    expect(formatDateLong("2026-09-15")).toBe("15 сентября 2026")
    expect(formatDateShort("2026-09-15")).toBe("15.09.2026")
  })
})
