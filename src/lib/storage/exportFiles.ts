import { CATEGORY_BY_KEY } from "@/lib/sociometry/categories"
import { sortByStatus, type CellKind, type SurveyResults } from "@/lib/sociometry/compute"
import { makeSurveyFile, makeWorkspace } from "@/lib/sociometry/schema"
import type { Survey } from "@/lib/sociometry/types"
import { formatDateShort, todayIso } from "@/lib/ru"

/** Makes a string safe to use as a file name on Windows and macOS. */
export function safeFileName(s: string): string {
  return s.replace(/[\\/:*?"<>|«»]+/g, "").replace(/\s+/g, " ").trim().slice(0, 80) || "Социометрия"
}

export function downloadBlob(fileName: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = fileName
  a.rel = "noopener"
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

function downloadJson(fileName: string, data: unknown) {
  downloadBlob(fileName, new Blob([JSON.stringify(data, null, 1)], { type: "application/json" }))
}

export function downloadSurvey(survey: Survey) {
  downloadJson(`Социометрия ${safeFileName(survey.className)}.json`, makeSurveyFile(survey))
}

export function downloadAll(surveys: Survey[]) {
  downloadJson(`Социометрия ${formatDateShort(todayIso())}.json`, makeWorkspace(surveys))
}

/** Lets the user choose a file. Resolves null when the window is closed without a choice. */
export function pickTextFile(accept = ".json,application/json"): Promise<{ name: string; text: string } | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = accept
    input.style.display = "none"
    let settled = false
    const done = (v: { name: string; text: string } | null) => {
      if (settled) return
      settled = true
      input.remove()
      resolve(v)
    }
    input.addEventListener("change", () => {
      const file = input.files?.[0]
      if (!file) return done(null)
      if (file.size > 20 * 1024 * 1024) {
        settled = true
        input.remove()
        reject(new Error("Файл слишком большой."))
        return
      }
      file.text().then((text) => done({ name: file.name, text }), reject)
    })
    input.addEventListener("cancel", () => done(null))
    document.body.appendChild(input)
    input.click()
  })
}

const CELL_TEXT: Record<CellKind, string> = {
  self: "",
  empty: "",
  pos: "+",
  "pos-mutual": "+",
  neg: "−",
  "neg-mutual": "−",
}

/** Excel workbook with two sheets: per-student indices and the socio-matrix. */
export async function exportXlsx(survey: Survey, r: SurveyResults) {
  const { default: writeXlsxFile } = await import("write-excel-file/browser")
  const bold = { fontWeight: "bold" as const }
  const head = (value: string) => ({ value, ...bold, wrap: true })

  const indices = [
    [
      head("№"),
      head("Ученик"),
      head("Категория"),
      head("Социометрический статус (получено +)"),
      head("Получено отрицательных"),
      head("Сделано выборов"),
      head("Сделано отрицательных"),
      head("Взаимных выборов"),
      head("Анкета"),
    ],
    ...sortByStatus(r.students).map((s) => [
      s.num,
      s.name,
      CATEGORY_BY_KEY[s.category].label,
      s.recvPos,
      survey.useNeg ? s.recvNeg : null,
      s.filled ? s.madePos : null,
      survey.useNeg && s.filled ? s.madeNeg : null,
      s.mutPos,
      s.absent ? "отсутствовал(а)" : s.filled ? "внесена" : "не внесена",
    ]),
    [],
    [head("Взаимных положительных связей"), r.mutualPairs],
    [head("Сделано выборов"), r.totalPos],
    ...(survey.useNeg ? [[head("Сделано отрицательных"), r.totalNeg]] : []),
    [head("Изолированных"), r.categoryCounts.iso],
    ...(survey.useNeg ? [[head("Отверженных"), r.categoryCounts.rej]] : []),
  ]

  const n = survey.students.length
  const matrix = [
    [head("Кто выбирает ↓ / кого →"), ...r.students.map((s) => head(`${s.num}. ${s.name}`)), head("Сделано +"), head("Сделано −")],
    ...r.students.map((s, i) => [
      `${s.num}. ${s.name}`,
      ...r.matrix[i].map((c) => ({
        value: CELL_TEXT[c],
        align: "center" as const,
        ...(c === "self" ? { backgroundColor: "#e5e5e5" } : {}),
        ...(c === "pos-mutual" ? { backgroundColor: "#d1fae5" } : {}),
        ...(c === "neg-mutual" ? { backgroundColor: "#ffedd5" } : {}),
      })),
      s.filled ? s.madePos : null,
      survey.useNeg && s.filled ? s.madeNeg : null,
    ]),
    [head("Получено +"), ...r.students.map((s) => s.recvPos)],
    ...(survey.useNeg ? [[head("Получено −"), ...r.students.map((s) => s.recvNeg)]] : []),
    [head("Взаимных"), ...r.students.map((s) => s.mutPos)],
  ]

  await writeXlsxFile([
    {
      sheet: "Показатели",
      data: indices,
      columns: [{ width: 5 }, { width: 28 }, { width: 18 }, { width: 16 }, { width: 14 }, { width: 12 }, { width: 14 }, { width: 12 }, { width: 16 }],
      stickyRowsCount: 1,
    },
    {
      sheet: "Социоматрица",
      data: matrix,
      columns: [{ width: 28 }, ...Array.from({ length: n }, () => ({ width: 6 })), { width: 11 }, { width: 11 }],
      stickyRowsCount: 1,
      stickyColumnsCount: 1,
    },
  ]).toFile(`Социометрия ${safeFileName(survey.className)}.xlsx`)
}
