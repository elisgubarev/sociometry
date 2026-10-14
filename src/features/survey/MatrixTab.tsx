import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { CellKind, SurveyResults } from "@/lib/sociometry/compute"
import { NoStudents } from "./EntryTab"
import { splitName } from "@/lib/sociometry/names"
import type { Survey } from "@/lib/sociometry/types"
import { cn } from "@/lib/utils"

const CELL: Record<CellKind, { text: string; cls: string; tip: string }> = {
  self: { text: "", cls: "bg-neutral-100", tip: "" },
  empty: { text: "", cls: "", tip: "" },
  pos: { text: "+", cls: "text-emerald-700", tip: "выбор" },
  "pos-mutual": { text: "+", cls: "bg-emerald-100 text-emerald-700", tip: "взаимный выбор" },
  neg: { text: "−", cls: "text-orange-700", tip: "отрицательный выбор" },
  "neg-mutual": { text: "−", cls: "bg-orange-100 text-orange-700", tip: "взаимный отрицательный выбор" },
}

// Fixed column sizes keep every row aligned; the names column stays pinned while scrolling.
const nameCol = "sticky left-0 z-10 w-36 min-w-36 shrink-0 border-r border-neutral-200 bg-white group-data-scrolled/matrix:shadow-[6px_0_8px_-6px_rgba(0,0,0,0.1)] md:w-60 md:min-w-60"
const cellCol = "flex h-11.5 w-23 min-w-23 shrink-0 items-center justify-center border-r border-neutral-100 tabular-nums"

export function MatrixTab({ survey, results }: { survey: Survey; results: SurveyResults }) {
  const { students, matrix } = results
  const useNeg = survey.useNeg
  // The names column casts a shadow only while columns are scrolled under it.
  const [scrolled, setScrolled] = useState(false)

  if (!students.length) return <NoStudents />

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-4">
        <CardTitle>Социоматрица</CardTitle>
        <ul className="flex flex-wrap gap-x-5 gap-y-2 text-[13.5px] text-neutral-600">
          <Legend className="text-emerald-700" sign="+" label="выбор" />
          {useNeg && <Legend className="text-orange-700" sign="−" label="отрицательный" />}
          <Legend className="border-emerald-100 bg-emerald-100 text-emerald-700" sign="+" label="взаимный" />
          {useNeg && <Legend className="border-orange-100 bg-orange-100 text-orange-700" sign="−" label="взаимно отрицательный" />}
        </ul>
      </CardHeader>

      <CardContent>
        <div
          data-scrolled={scrolled || undefined}
          onScroll={(e) => setScrolled(e.currentTarget.scrollLeft > 0)}
          className="group/matrix w-fit max-w-full overflow-x-auto rounded-xl border border-neutral-200 bg-white focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          tabIndex={0}
          aria-label="Социоматрица, прокрутка вправо"
        >
          <div role="table" aria-label="Социоматрица" className="w-max text-sm [&_[role=row]>*:last-child]:border-r-0">
            {/* Header */}
            <div role="row" className="flex border-b border-neutral-200">
              <div role="columnheader" className={cn(nameCol, "flex flex-col justify-end gap-1 px-3 pb-3 text-right text-[12.5px] font-medium text-neutral-500 md:px-4")}>
                <span>Кого выбирают →</span>
                <span className="text-left">Кто выбирает ↓</span>
              </div>
              {students.map((s) => {
                const { first, rest } = splitName(s.name)
                return (
                  <div key={s.id} role="columnheader" title={s.name} className={cn(cellCol, "h-auto min-h-21 items-end px-1.5 pt-2.5 pb-3")}>
                    <span className="block w-full text-center text-[13.5px] leading-snug font-medium text-neutral-700">
                      <span className="mb-1 block text-xs text-neutral-400">{s.num}</span>
                      <span className="block truncate">{first}</span>
                      {rest && <span className="block truncate">{rest}</span>}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Rows */}
            {students.map((s, i) => (
              <div key={s.id} role="row" className={cn("flex border-b border-neutral-100 last:border-b-0", !s.filled && "text-neutral-400")}>
                <div role="rowheader" className={cn(nameCol, "flex h-11.5 items-center gap-2 px-3 text-[14.5px] font-medium md:px-4", s.filled ? "text-neutral-800" : "text-neutral-400")}>
                  <span className="w-5 shrink-0 text-[13px] font-normal text-neutral-400 tabular-nums">{s.num}</span>
                  <span className="truncate" title={s.name}>{s.name}</span>
                </div>
                {matrix[i].map((kind, j) => {
                  const c = CELL[kind]
                  const target = students[j]
                  return (
                    <div
                      key={target.id}
                      role="cell"
                      title={kind === "self" ? undefined : `${s.name} → ${target.name}${c.tip ? `: ${c.tip}` : ""}`}
                      className={cn(cellCol, "text-[19px] font-semibold", c.cls)}
                    >
                      {c.text}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function Legend({ sign, label, className }: { sign: string; label: string; className: string }) {
  return (
    <li className="inline-flex items-center gap-2">
      <span className={cn("inline-flex size-5.5 items-center justify-center rounded-md border border-neutral-200 text-[14px] font-semibold", className)}>
        {sign}
      </span>
      {label}
    </li>
  )
}
