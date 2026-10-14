import { MAX_NAME_LENGTH } from "./defaults"

export interface ParsedNames {
  names: string[]
  duplicates: string[]
}

/** Cleans one name: collapses spaces, strips list numbering ("1.", "2)", "3 -"). */
export function cleanName(raw: string): string {
  return raw
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\d{1,3}\s*[.)\-–—:]?\s+/, "")
    .replace(/^\d{1,3}[.)]\s*/, "")
    .trim()
    .slice(0, MAX_NAME_LENGTH)
}

const nameKey = (s: string) => s.toLocaleLowerCase("ru-RU").replace(/ё/g, "е")

export function sameName(a: string, b: string): boolean {
  return nameKey(a) === nameKey(b)
}

/**
 * Parses a pasted list of students: one per line. Pasted spreadsheet rows
 * ("1<TAB>Белова<TAB>Анна") become "Белова Анна"; pure-number cells are dropped.
 */
export function parseNameList(text: string): ParsedNames {
  const names: string[] = []
  const duplicates: string[] = []
  const seen = new Set<string>()
  for (const line of text.split(/\r?\n/)) {
    const cells = line
      .split("\t")
      .map((c) => c.trim())
      .filter((c) => c && !/^\d+[.)]?$/.test(c))
    const name = cleanName(cells.join(" "))
    if (!name) continue
    const key = nameKey(name)
    if (seen.has(key)) {
      duplicates.push(name)
      continue
    }
    seen.add(key)
    names.push(name)
  }
  return { names, duplicates }
}

/** "Анна Белова" → { first: "Анна", rest: "Белова" } for two-line column headers. */
export function splitName(name: string): { first: string; rest: string } {
  const i = name.indexOf(" ")
  return i < 0 ? { first: name, rest: "" } : { first: name.slice(0, i), rest: name.slice(i + 1) }
}
