import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { Survey } from "@/lib/sociometry/types"
import { useWorkspace } from "@/state/context"
import { maxChoicesUsed } from "@/state/reducer"
import { SurveyFields, type FieldValues } from "./SurveyFields"
import { ThresholdsFields } from "./ThresholdsFields"
import { FolderSettings } from "@/features/files/FolderSettings"

interface Props {
  survey: Survey
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SurveySettingsDialog({ survey, open, onOpenChange }: Props) {
  const { dispatch } = useWorkspace()
  // The class name is edited as a draft so the field can be cleared while typing.
  const [classDraft, setClassDraft] = useState<string | null>(null)

  const values: FieldValues = {
    className: classDraft ?? survey.className,
    date: survey.date,
    questionPos: survey.questionPos,
    questionNeg: survey.questionNeg,
    useNeg: survey.useNeg,
    maxChoices: survey.maxChoices,
  }

  const onChange = (patch: Partial<FieldValues>) => {
    if (patch.className !== undefined) {
      setClassDraft(patch.className)
      if (patch.className.trim()) dispatch({ type: "updateSettings", surveyId: survey.id, patch: { className: patch.className } })
      return
    }
    dispatch({ type: "updateSettings", surveyId: survey.id, patch })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o)
        if (!o) setClassDraft(null)
      }}
    >
      <DialogContent className="max-h-[calc(100svh-2rem)] gap-0 overflow-y-auto p-0 sm:max-w-145">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-xl font-semibold tracking-tight">Параметры опроса</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-6 px-6 py-4">
          <SurveyFields
            value={values}
            onChange={onChange}
            minChoices={maxChoicesUsed(survey)}
            classError={classDraft !== null && !classDraft.trim() ? "Укажите класс" : undefined}
          />

          <ThresholdsFields
            value={survey.thresholds}
            useNeg={survey.useNeg}
            onChange={(thresholds) => dispatch({ type: "updateSettings", surveyId: survey.id, patch: { thresholds } })}
          />
          <FolderSettings />
        </div>
        <div className="flex justify-end px-6 pt-2 pb-6">
          <Button onClick={() => onOpenChange(false)}>Готово</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
