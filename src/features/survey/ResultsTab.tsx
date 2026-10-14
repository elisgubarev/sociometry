import { useState } from "react"
import { CircleAlertIcon, FileSpreadsheetIcon, PrinterIcon } from "lucide-react"
import { toast } from "sonner"
import { CategoryBadge } from "@/components/CategoryBadge"
import { Alert, AlertAction, AlertDescription } from "@/components/ui/alert"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { routeHref } from "@/hooks/useHashRoute"
import { CATEGORIES, categoryRange } from "@/lib/sociometry/categories"
import { sortByStatus, type SurveyResults } from "@/lib/sociometry/compute"
import type { Survey } from "@/lib/sociometry/types"
import { exportXlsx } from "@/lib/storage/exportFiles"
import { cn } from "@/lib/utils"
import { NoStudents } from "./EntryTab"

export function ResultsTab({ survey, results }: { survey: Survey; results: SurveyResults }) {
  const [exporting, setExporting] = useState(false)
  const n = survey.students.length
  const useNeg = survey.useNeg

  if (!n) return <NoStudents />

  const rows = sortByStatus(results.students)
  const missing = n - results.filledCount
  const firstMissing = results.students.find((s) => !s.filled)

  const toExcel = async () => {
    setExporting(true)
    try {
      await exportXlsx(survey, results)
    } catch {
      toast.error("Не удалось создать файл Excel.")
    } finally {
      setExporting(false)
    }
  }

  const kpis = [
    { value: results.mutualPairs, label: "Взаимных", dot: "bg-emerald-600" },
    { value: results.totalPos, label: "Сделано выборов", dot: "bg-neutral-800" },
    { value: results.categoryCounts.iso, label: "Изолированных", dot: "bg-neutral-400" },
    { value: useNeg ? results.categoryCounts.rej : "—", label: "Отверженных", dot: "bg-rose-500" },
  ]

  return (
    <div className="flex flex-col gap-5">
      {missing > 0 && (
        <Alert
          role="status"
          className="items-center rounded-xl border-amber-200 bg-amber-50 py-3 pl-4 text-amber-800 has-data-[slot=alert-action]:pr-4 sm:has-data-[slot=alert-action]:pr-48"
        >
          <CircleAlertIcon />
          <AlertDescription className="text-[14px] text-amber-800">
            Внесено {results.filledCount} из {n} анкет — результаты пока предварительные.
          </AlertDescription>
          <AlertAction className="static col-start-2 mt-2 sm:absolute sm:top-1/2 sm:right-3 sm:mt-0 sm:-translate-y-1/2">
            <a
              href={routeHref({ name: "survey", id: survey.id, tab: "entry", student: firstMissing?.id })}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "border-amber-200")}
            >
              Внести оставшиеся
            </a>
          </AlertAction>
        </Alert>
      )}

      <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[22px] font-semibold tracking-tight">Результаты</h2>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            <PrinterIcon />
            Распечатать отчёт
          </Button>
          <Button variant="outline" onClick={() => void toExcel()} disabled={exporting}>
            <FileSpreadsheetIcon />
            Скачать для Excel
          </Button>
        </div>
      </div>

      <Card className="grid grid-cols-2 gap-px bg-neutral-200 py-0 sm:py-0 md:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="flex flex-col gap-1.5 bg-white px-5 pt-5 pb-5.5 sm:px-6">
            <span className="text-[34px] leading-none font-medium tracking-tight tabular-nums">{k.value}</span>
            <span className="inline-flex items-center gap-2 text-[13.5px] text-neutral-500">
              <span className={cn("size-1.5 shrink-0 rounded-full", k.dot)} />
              {k.label}
            </span>
          </div>
        ))}
      </Card>

      <Card>
        <CardHeader className="gap-4.5">
          <CardTitle>Категории</CardTitle>
          <div className="flex h-1.5 gap-0.75 overflow-hidden rounded-full" aria-hidden>
            {CATEGORIES.map((c) =>
              results.categoryCounts[c.key] ? (
                <div key={c.key} className={cn("h-full rounded-full", c.dot)} style={{ width: `${(results.categoryCounts[c.key] / n) * 100}%` }} />
              ) : null,
            )}
          </div>
        </CardHeader>
        <CardContent className="-mt-2">
          {CATEGORIES.map((c) => {
            const members = results.students.filter((s) => s.category === c.key)
            return (
              <div key={c.key} className="flex flex-col gap-3 border-b border-neutral-100 py-4.5 last:border-0 last:pb-0 md:flex-row md:items-start md:gap-6">
                <div className="flex items-start justify-between gap-4 md:w-72 md:shrink-0 md:flex-col md:justify-start md:gap-1">
                  <div className="flex flex-col items-start gap-1.5">
                    <CategoryBadge category={c.key} />
                    <span className="text-[13.5px] text-neutral-700">{categoryRange(c.key, survey.thresholds, useNeg)}</span>
                  </div>
                  <span className="text-[22px] leading-none font-medium tracking-tight tabular-nums md:hidden">{members.length}</span>
                </div>
                <div className="flex min-h-7.5 flex-1 flex-wrap content-start items-center gap-1.5">
                  {members.length ? (
                    members.map((m) => (
                      <span key={m.id} className="inline-flex h-7.5 items-center rounded-lg border border-neutral-200 px-2.5 text-[14px] text-neutral-800">
                        {m.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-[13.5px] text-neutral-400">Нет учеников</span>
                  )}
                </div>
                <span className="hidden w-10 shrink-0 text-right text-[22px] leading-none font-medium tracking-tight tabular-nums md:block">
                  {members.length}
                </span>
              </div>
            )
          })}
        </CardContent>
      </Card>

      <Card className="gap-3 sm:gap-3">
        <CardHeader>
          <CardTitle>Показатели по ученикам</CardTitle>
        </CardHeader>
        <CardContent>
          <Table className="min-w-190 text-[14px]">
            <TableHeader>
              <TableRow className="align-bottom text-[12.5px] leading-snug hover:bg-transparent">
                <TableHead className="h-auto w-11 py-3 pr-2.5 pl-0 text-right font-medium whitespace-normal text-neutral-500">№</TableHead>
                <TableHead className="h-auto px-2.5 py-3 font-medium whitespace-normal text-neutral-500">Ученик</TableHead>
                <TableHead className="h-auto w-44 px-2.5 py-3 font-medium whitespace-normal text-neutral-500">Категория</TableHead>
                <TableHead className="h-auto w-28 px-2.5 py-3 text-right font-medium whitespace-normal text-neutral-500">
                  Соц. статус
                  <br />
                  (получено +)
                </TableHead>
                <TableHead className="h-auto w-28 px-2.5 py-3 text-right font-medium whitespace-normal text-neutral-500">
                  Получено
                  <br />
                  отрицательных
                </TableHead>
                <TableHead className="h-auto w-24 px-2.5 py-3 text-right font-medium whitespace-normal text-neutral-500">
                  Сделано
                  <br />
                  выборов
                </TableHead>
                <TableHead className="h-auto w-24 py-3 pr-0 pl-2.5 text-right font-medium whitespace-normal text-neutral-500">
                  Взаимных
                  <br />
                  выборов
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((s) => (
                <TableRow key={s.id} className="border-neutral-100 hover:bg-neutral-50/60">
                  <TableCell className="py-3 pr-2.5 pl-0 text-right text-neutral-400 tabular-nums">{s.num}</TableCell>
                  <TableCell className="px-2.5 py-3 font-medium whitespace-normal">
                    {s.name}
                    {(!s.filled || s.absent) && (
                      <span className="block text-[12.5px] font-normal text-neutral-400">
                        {s.absent ? "отсутствовал(а) на опросе" : "анкета ещё не внесена"}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="px-2.5 py-3">
                    <CategoryBadge category={s.category} />
                  </TableCell>
                  <TableCell className="px-2.5 py-3 text-right text-base font-semibold tabular-nums">{s.recvPos}</TableCell>
                  <TableCell className="px-2.5 py-3 text-right tabular-nums">{useNeg ? s.recvNeg : "—"}</TableCell>
                  <TableCell className="px-2.5 py-3 text-right tabular-nums">{s.filled && !s.absent ? s.madePos : "—"}</TableCell>
                  <TableCell className="py-3 pr-0 pl-2.5 text-right tabular-nums">{s.mutPos}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
