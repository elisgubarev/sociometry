import { useState } from "react"
import { ArrowLeftIcon, SlidersHorizontalIcon } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { routeHref, SURVEY_TABS, useHashRoute, type SurveyTab } from "@/hooks/useHashRoute"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { formatDateLong, maxChoicesLabel, studentsLabel } from "@/lib/ru"
import type { Survey } from "@/lib/sociometry/types"
import { useResults } from "@/state/context"
import { EntryTab } from "./EntryTab"
import { MatrixTab } from "./MatrixTab"
import { PrintReport } from "./PrintReport"
import { ResultsTab } from "./ResultsTab"
import { StudentsTab } from "./StudentsTab"
import { SurveySettingsDialog } from "./SurveySettingsDialog"

const TAB_LABELS: Record<SurveyTab, string> = {
  students: "Ученики",
  entry: "Ввод ответов",
  matrix: "Социоматрица",
  results: "Результаты",
}

export function SurveyPage({ survey, tab, student }: { survey: Survey; tab: SurveyTab; student?: string }) {
  const results = useResults(survey)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const n = survey.students.length
  const openSettings = () => setSettingsOpen(true)
  const [, navigate] = useHashRoute()
  const complete = n > 0 && results.filledCount === n

  return (
    <>
    <main className="mx-auto flex w-full max-w-290 flex-col gap-6 px-4 pt-5 pb-28 sm:gap-7 sm:px-8 sm:pt-7 lg:pb-24 print:hidden">
      <div className="flex flex-col gap-3">
        <a href={routeHref({ name: "home" })} className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-3 self-start text-neutral-600")}>
          <ArrowLeftIcon />
          Опросы
        </a>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-[28px] leading-tight font-semibold tracking-tight break-words sm:text-[34px]">
              {survey.className}
            </h1>
            <p className="mt-1.5 text-[14.5px] text-neutral-500">
              {formatDateLong(survey.date)} · {studentsLabel(n)} · {maxChoicesLabel(survey.maxChoices)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={openSettings}>
              <SlidersHorizontalIcon />
              Параметры
            </Button>
          </div>
        </div>
      </div>

      <Tabs
        value={tab}
        onValueChange={(value) => navigate({ name: "survey", id: survey.id, tab: value as SurveyTab }, { keepScroll: true })}
        className="gap-6 sm:gap-7"
      >
        <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
          <TabsList
            variant="line"
            aria-label="Разделы опроса"
            className="w-full min-w-max justify-start gap-7 rounded-none border-b border-neutral-200 p-0 group-data-horizontal/tabs:h-auto sm:gap-8"
          >
            {SURVEY_TABS.map((t, i) => (
              <TabsTrigger
                key={t}
                value={t}
                className="group/tab h-12 flex-none px-0 text-[15px] text-neutral-500 group-data-horizontal/tabs:after:-bottom-px hover:text-neutral-950 data-active:text-neutral-950"
              >
                <span className="text-[12.5px] text-neutral-400 tabular-nums group-data-active/tab:text-neutral-500">{i + 1}</span>
                {TAB_LABELS[t]}
                {t === "entry" && n > 0 && (
                  <Badge
                    className={cn(
                      "tabular-nums",
                      complete ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800",
                    )}
                  >
                    {results.filledCount}/{n}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* Only the active tab is mounted: the entry tab keeps the address in sync while it is open. */}
        <TabsContent key={tab} value={tab} className="text-[15px]">
          {tab === "students" && <StudentsTab survey={survey} />}
          {tab === "entry" && <EntryTab survey={survey} results={results} studentId={student} />}
          {tab === "matrix" && <MatrixTab survey={survey} results={results} />}
          {tab === "results" && <ResultsTab survey={survey} results={results} />}
        </TabsContent>
      </Tabs>

      <SurveySettingsDialog survey={survey} open={settingsOpen} onOpenChange={setSettingsOpen} />
    </main>
    <PrintReport survey={survey} results={results} />
    </>
  )
}
