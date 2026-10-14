import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useHashRoute } from "@/hooks/useHashRoute"
import { newId } from "@/lib/id"
import { todayIso } from "@/lib/ru"
import {
  DEFAULT_MAX_CHOICES,
  DEFAULT_QUESTION_NEG,
  DEFAULT_QUESTION_POS,
  DEFAULT_THRESHOLDS,
} from "@/lib/sociometry/defaults"
import type { Survey, Thresholds } from "@/lib/sociometry/types"
import { useWorkspace } from "@/state/context"
import { SurveyFields, type FieldValues } from "@/features/survey/SurveyFields"
import { ThresholdsFields } from "@/features/survey/ThresholdsFields"
import { FieldGroup } from "@/components/ui/field"

const initial = (): FieldValues => ({
  className: "",
  date: todayIso(),
  questionPos: DEFAULT_QUESTION_POS,
  questionNeg: DEFAULT_QUESTION_NEG,
  useNeg: true,
  maxChoices: DEFAULT_MAX_CHOICES,
})

export function NewSurveyDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { dispatch } = useWorkspace()
  const [, navigate] = useHashRoute()
  const [values, setValues] = useState(initial)
  const [thresholds, setThresholds] = useState<Thresholds>({ ...DEFAULT_THRESHOLDS })
  const [submitted, setSubmitted] = useState(false)

  const classError = submitted && !values.className.trim() ? "Укажите класс" : undefined

  const reset = () => {
    setValues(initial())
    setThresholds({ ...DEFAULT_THRESHOLDS })
    setSubmitted(false)
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    if (!values.className.trim()) return
    const at = new Date().toISOString()
    const survey: Survey = {
      id: newId(),
      ...values,
      className: values.className.replace(/\s+/g, " ").trim(),
      thresholds,
      students: [],
      answers: {},
      createdAt: at,
      updatedAt: at,
    }
    dispatch({ type: "createSurvey", survey })
    onOpenChange(false)
    reset()
    navigate({ name: "survey", id: survey.id, tab: "students" })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o)
        if (!o) reset()
      }}
    >
      <DialogContent className="max-h-[calc(100svh-2rem)] gap-0 overflow-y-auto p-0 sm:max-w-145">
        <form onSubmit={submit} noValidate>
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle className="text-xl font-semibold tracking-tight">Новый опрос</DialogTitle>
          </DialogHeader>
          <FieldGroup className="px-6 py-4">
            <SurveyFields
              value={values}
              onChange={(patch) => setValues((v) => ({ ...v, ...patch }))}
              classError={classError}
            />
            <ThresholdsFields value={thresholds} useNeg={values.useNeg} onChange={setThresholds} />
          </FieldGroup>
          <div className="flex flex-col-reverse gap-2 px-6 pt-2 pb-6 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit">Создать опрос</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
