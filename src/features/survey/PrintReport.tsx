import { CATEGORIES, CATEGORY_BY_KEY, categoryRange } from "@/lib/sociometry/categories"
import { sortByStatus, type CellKind, type SurveyResults } from "@/lib/sociometry/compute"
import type { Survey } from "@/lib/sociometry/types"
import { formatDateShort } from "@/lib/ru"
import { cn } from "@/lib/utils"

const MARK: Record<CellKind, string> = { self: "", empty: "", pos: "+", "pos-mutual": "+", neg: "−", "neg-mutual": "−" }
const MARK_CLS: Record<CellKind, string> = {
  self: "bg-neutral-200",
  empty: "",
  pos: "text-emerald-700",
  "pos-mutual": "bg-emerald-100 text-emerald-700",
  neg: "text-orange-700",
  "neg-mutual": "bg-orange-100 text-orange-700",
}

/** Printed report: page 1 (A4 portrait) summary and indices, page 2 (A4 landscape) the socio-matrix. */
export function PrintReport({ survey, results }: { survey: Survey; results: SurveyResults }) {
  const n = survey.students.length
  const useNeg = survey.useNeg
  const rows = sortByStatus(results.students)
  if (!n) return null

  return (
    <div className="hidden text-[10pt] leading-snug text-neutral-950 print:block">
      <section className="print-page">
        <header className="flex items-start justify-between gap-6 border-b-2 border-neutral-950 pb-3">
          <div>
            <div className="text-[8.5pt] font-medium tracking-widest text-neutral-500 uppercase">Социометрическое исследование</div>
            <h1 className="mt-1 text-[20pt] font-semibold tracking-tight">{survey.className}</h1>
            <div className="mt-1 text-neutral-600">
              {survey.questionPos && <div>Положительный вопрос: «{survey.questionPos}»</div>}
              {useNeg && survey.questionNeg && <div>Отрицательный вопрос: «{survey.questionNeg}»</div>}
            </div>
          </div>
          <div className="shrink-0 text-right text-neutral-600">
            <div>
              Дата опроса
              <br />
              <b className="font-semibold text-neutral-950">{formatDateShort(survey.date)}</b>
            </div>
            <div className="mt-1.5">
              Учеников / анкет
              <br />
              <b className="font-semibold text-neutral-950">
                {n} / {results.filledCount}
              </b>
            </div>
          </div>
        </header>

        <div className="mt-4 grid grid-cols-4 gap-2">
          {[
            ["Взаимных положительных связей", results.mutualPairs],
            ["Сделано выборов", useNeg ? `${results.totalPos} + / ${results.totalNeg} −` : results.totalPos],
            ["Изолированных", results.categoryCounts.iso],
            ["Отверженных", useNeg ? results.categoryCounts.rej : "—"],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-md border border-neutral-200 px-2.5 py-2">
              <div className="text-[8pt] text-neutral-500">{label}</div>
              <div className="text-[15pt] font-medium tabular-nums">{value}</div>
            </div>
          ))}
        </div>

        <h2 className="mt-5 mb-1.5 text-[11pt] font-semibold">Распределение по категориям</h2>
        <table className="w-full border-collapse">
          <tbody>
            {CATEGORIES.map((c) => {
              const members = results.students.filter((s) => s.category === c.key)
              return (
                <tr key={c.key} className="border-b border-neutral-100 align-top last:border-0">
                  <td className="w-[34mm] py-1.5">
                    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-px text-[8.5pt] font-medium", c.badge)}>
                      <span className={cn("size-1.5 rounded-full", c.dot)} />
                      {c.plural}
                    </span>
                  </td>
                  <td className="w-[32mm] py-1.5 text-neutral-500">{categoryRange(c.key, survey.thresholds, useNeg)}</td>
                  <td className="py-1.5">{members.map((m) => m.name).join(", ") || "—"}</td>
                  <td className="w-[8mm] py-1.5 text-right font-semibold tabular-nums">{members.length}</td>
                </tr>
              )
            })}
          </tbody>
        </table>

        <h2 className="mt-5 mb-1 text-[11pt] font-semibold">Показатели по ученикам</h2>
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-[1.5px] border-neutral-950 text-left align-bottom text-[8pt] text-neutral-500">
              <th className="w-[7mm] py-1 pr-1 text-right font-medium">№</th>
              <th className="px-2 py-1 font-medium">Ученик</th>
              <th className="w-[32mm] px-1 py-1 font-medium">Категория</th>
              <th className="w-[18mm] px-1 py-1 text-right font-medium">Статус (получено +)</th>
              <th className="w-[17mm] px-1 py-1 text-right font-medium">Получено отриц.</th>
              <th className="w-[16mm] px-1 py-1 text-right font-medium">Сделано выборов</th>
              <th className="w-[16mm] py-1 pl-1 text-right font-medium">Взаимных выборов</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => {
              const meta = CATEGORY_BY_KEY[s.category]
              return (
                <tr key={s.id} className="break-inside-avoid border-b border-neutral-100">
                  <td className="py-1 pr-1 text-right text-neutral-400 tabular-nums">{s.num}</td>
                  <td className="px-2 py-1 font-medium">
                    {s.name}
                    {(!s.filled || s.absent) && (
                      <span className="font-normal text-neutral-500"> · {s.absent ? "отсутствовал(а)" : "анкета не внесена"}</span>
                    )}
                  </td>
                  <td className="px-1 py-1">
                    <span className={cn("rounded-full px-2 py-px text-[8.5pt] font-medium", meta.badge)}>{meta.label}</span>
                  </td>
                  <td className="px-1 py-1 text-right font-semibold tabular-nums">{s.recvPos}</td>
                  <td className="px-1 py-1 text-right tabular-nums">{useNeg ? s.recvNeg : "—"}</td>
                  <td className="px-1 py-1 text-right tabular-nums">{s.filled && !s.absent ? s.madePos : "—"}</td>
                  <td className="py-1 pl-1 text-right tabular-nums">{s.mutPos}</td>
                </tr>
              )
            })}
          </tbody>
        </table>

        <footer className="mt-8 flex justify-between gap-6 border-t border-neutral-200 pt-3 text-[9pt] text-neutral-600">
          <span>Составил(а): ______________________________</span>
          <span>Подпись: ________________</span>
        </footer>
      </section>

      <section className="print-matrix">
        <h2 className="mb-2 text-[12pt] font-semibold">
          Социоматрица · {survey.className} · {formatDateShort(survey.date)}
        </h2>
        <table className="w-full table-fixed border-collapse text-[8pt]">
          <colgroup>
            <col className="w-[44mm]" />
            {results.students.map((s) => (
              <col key={s.id} />
            ))}
            <col className="w-[12mm]" />
            <col className="w-[12mm]" />
          </colgroup>
          <thead>
            <tr className="align-bottom">
              <th className="border border-neutral-300 p-1 text-left font-medium text-neutral-500">Кто выбирает ↓ / кого →</th>
              {results.students.map((s) => (
                <th key={s.id} className="h-[30mm] border border-neutral-300 p-0.5 font-medium">
                  <span className="mx-auto block max-h-[29mm] overflow-hidden text-ellipsis whitespace-nowrap [writing-mode:vertical-rl] rotate-180">
                    {s.num}. {s.name}
                  </span>
                </th>
              ))}
              <th className="border border-neutral-300 p-0.5 font-medium">
                <span className="mx-auto block [writing-mode:vertical-rl] rotate-180">Сделано +</span>
              </th>
              <th className="border border-neutral-300 p-0.5 font-medium">
                <span className="mx-auto block [writing-mode:vertical-rl] rotate-180">Сделано −</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {results.students.map((s, i) => (
              <tr key={s.id}>
                <td className="truncate border border-neutral-300 px-1 py-0.5">
                  {s.num}. {s.name}
                </td>
                {results.matrix[i].map((k, j) => (
                  <td key={j} className={cn("border border-neutral-300 text-center text-[10pt] font-semibold", MARK_CLS[k])}>
                    {MARK[k]}
                  </td>
                ))}
                <td className="border border-neutral-300 text-center tabular-nums">{s.filled && !s.absent ? s.madePos : "—"}</td>
                <td className="border border-neutral-300 text-center tabular-nums">{s.filled && !s.absent && useNeg ? s.madeNeg : "—"}</td>
              </tr>
            ))}
            <SumRow label="Получено +" values={results.students.map((s) => s.recvPos)} />
            {useNeg && <SumRow label="Получено −" values={results.students.map((s) => s.recvNeg)} />}
            <SumRow label="Взаимных" values={results.students.map((s) => s.mutPos)} />
          </tbody>
        </table>
      </section>
    </div>
  )
}

function SumRow({ label, values }: { label: string; values: number[] }) {
  return (
    <tr className="bg-neutral-50 font-semibold">
      <td className="border border-neutral-300 px-1 py-0.5">{label}</td>
      {values.map((v, j) => (
        <td key={j} className="border border-neutral-300 text-center tabular-nums">
          {v}
        </td>
      ))}
      <td className="border border-neutral-300" />
      <td className="border border-neutral-300" />
    </tr>
  )
}
