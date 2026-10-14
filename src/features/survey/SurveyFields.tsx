import { useId } from "react"
import { Stepper } from "@/components/Stepper"
import { Field, FieldError, FieldGroup, FieldLabel, FieldTitle } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { MAX_MAX_CHOICES, MIN_MAX_CHOICES } from "@/lib/sociometry/defaults"
import type { SurveySettings } from "@/state/reducer"

export type FieldValues = Pick<SurveySettings, "className" | "date" | "questionPos" | "questionNeg" | "useNeg" | "maxChoices">

interface Props {
  value: FieldValues
  onChange: (patch: Partial<FieldValues>) => void
  /** Lowest allowed choice limit (forms already entered may use more). */
  minChoices?: number
  classError?: string
}

const fieldLabel = "text-[14.5px]"

export function SurveyFields({ value, onChange, minChoices = MIN_MAX_CHOICES, classError }: Props) {
  const id = useId()
  return (
    <FieldGroup>
      <div className="grid gap-5 sm:grid-cols-2 sm:gap-4">
        <Field data-invalid={!!classError || undefined}>
          <FieldLabel htmlFor={`${id}-class`} className={fieldLabel}>
            Класс
          </FieldLabel>
          <Input
            id={`${id}-class`}
            value={value.className}
            onChange={(e) => onChange({ className: e.target.value })}
            placeholder="Например, 7 «Б»"
            maxLength={60}
            aria-invalid={!!classError}
            autoComplete="off"
          />
          <FieldError>{classError}</FieldError>
        </Field>
        <Field>
          <FieldLabel htmlFor={`${id}-date`} className={fieldLabel}>
            Дата опроса
          </FieldLabel>
          <Input
            id={`${id}-date`}
            type="date"
            value={value.date}
            // A typed 5-digit year is a valid date to the browser but not to the file format.
            max="9999-12-31"
            onChange={(e) => /^\d{4}-\d{2}-\d{2}$/.test(e.target.value) && onChange({ date: e.target.value })}
            required
          />
        </Field>
      </div>

      <Field>
        <FieldLabel htmlFor={`${id}-qpos`} className={fieldLabel}>
          Положительный вопрос
        </FieldLabel>
        <Input
          id={`${id}-qpos`}
          value={value.questionPos}
          onChange={(e) => onChange({ questionPos: e.target.value })}
          maxLength={200}
        />
      </Field>

      <Field>
        <Field orientation="horizontal" className="justify-between">
          <FieldLabel htmlFor={`${id}-useneg`} className={fieldLabel}>
            Отрицательный вопрос
          </FieldLabel>
          <Switch
            id={`${id}-useneg`}
            checked={value.useNeg}
            onCheckedChange={(checked) => onChange({ useNeg: checked })}
          />
        </Field>
        {value.useNeg && (
          <Input
            aria-label="Отрицательный вопрос"
            value={value.questionNeg}
            onChange={(e) => onChange({ questionNeg: e.target.value })}
            maxLength={200}
          />
        )}
      </Field>

      <Field orientation="horizontal" className="justify-between">
        <FieldTitle className={`${fieldLabel} leading-snug`}>Сколько одноклассников можно назвать</FieldTitle>
        <Stepper
          label="Сколько одноклассников можно назвать"
          value={value.maxChoices}
          min={Math.max(MIN_MAX_CHOICES, minChoices)}
          max={MAX_MAX_CHOICES}
          onChange={(maxChoices) => onChange({ maxChoices })}
        />
      </Field>
    </FieldGroup>
  )
}
