import { useState } from "react"
import { CopyIcon, EllipsisIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/ConfirmDialog"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { routeHref, useHashRoute } from "@/hooks/useHashRoute"
import { newId } from "@/lib/id"
import { maxChoicesLabel, studentsLabel, todayIso } from "@/lib/ru"
import type { Survey } from "@/lib/sociometry/types"
import { useResults, useWorkspace } from "@/state/context"
import { cloneSurvey } from "@/state/reducer"

export function SurveyCard({ survey }: { survey: Survey }) {
  const { dispatch } = useWorkspace()
  const [, navigate] = useHashRoute()
  const r = useResults(survey)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const n = survey.students.length
  const pct = n ? Math.round((r.filledCount / n) * 100) : 0

  const repeat = () => {
    const at = new Date().toISOString()
    const copy = cloneSurvey(survey, { id: newId(), makeId: newId, at, withAnswers: false, date: todayIso() })
    dispatch({ type: "createSurvey", survey: copy })
    navigate({ name: "survey", id: copy.id, tab: "students" })
    toast.success("Создан повторный опрос")
  }

  return (
    <Card className="relative gap-6 px-6 py-6 hover:ring-neutral-400 has-[a:focus-visible]:ring-3 has-[a:focus-visible]:ring-ring/50 sm:px-6 sm:py-6">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <a
            href={routeHref({ name: "survey", id: survey.id, tab: "students" })}
            className="block text-[28px] leading-tight font-semibold tracking-tight break-words outline-none after:absolute after:inset-0 after:rounded-2xl"
          >
            {survey.className}
          </a>
          <p className="mt-1 text-[13.5px] text-neutral-500">
            {studentsLabel(n)} · {maxChoicesLabel(survey.maxChoices)}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon-sm" className="relative z-10 -mt-1 -mr-2" aria-label={`Действия: ${survey.className}`} />
            }
          >
            <EllipsisIcon className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 p-1.5">
            <DropdownMenuItem className="h-9" onClick={repeat}>
              <CopyIcon />
              Повторный опрос
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="h-9" variant="destructive" onClick={() => setConfirmDelete(true)}>
              <Trash2Icon />
              Удалить
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Progress
        value={pct}
        aria-label={`Внесено анкет: ${r.filledCount} из ${n}`}
        className="mt-auto [&_[data-slot=progress-indicator]]:bg-emerald-600"
      />

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Удалить «${survey.className}»?`}
        description="Опрос и все внесённые анкеты будут удалены."
        confirmLabel="Удалить"
        destructive
        onConfirm={() => {
          dispatch({ type: "deleteSurvey", surveyId: survey.id })
          toast("Опрос удалён")
        }}
      />
    </Card>
  )
}
