import { Stepper } from "@/components/Stepper"
import { CategoryBadge } from "@/components/CategoryBadge"
import { Button } from "@/components/ui/button"
import { CATEGORY_BY_KEY, categoryRange } from "@/lib/sociometry/categories"
import { DEFAULT_THRESHOLDS, MAX_THRESHOLD } from "@/lib/sociometry/defaults"
import type { Thresholds } from "@/lib/sociometry/types"

interface Props {
  value: Thresholds
  useNeg: boolean
  onChange: (value: Thresholds) => void
}

/** «Границы категорий»: the three threshold steppers plus the two fixed rules. */
export function ThresholdsFields({ value: t, useNeg, onChange }: Props) {
  const rows: { key: keyof Thresholds; min: number; max: number }[] = [
    { key: "star", min: t.pref + 1, max: MAX_THRESHOLD },
    { key: "pref", min: t.acc + 1, max: t.star - 1 },
    { key: "acc", min: 1, max: t.pref - 1 },
  ]
  const isDefault = t.star === DEFAULT_THRESHOLDS.star && t.pref === DEFAULT_THRESHOLDS.pref && t.acc === DEFAULT_THRESHOLDS.acc

  return (
    <div className="border-t border-neutral-100 pt-5">
      <h3 className="text-[14.5px] font-medium">Границы категорий</h3>
      <div className="mt-2">
        {rows.map((r) => (
          <div key={r.key} className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-neutral-100 py-3">
            <div className="w-40 shrink-0">
              <CategoryBadge category={r.key} />
            </div>
            <span className="min-w-32 flex-1 text-[13.5px] text-neutral-500">{categoryRange(r.key, t, useNeg)}</span>
            <Stepper
              label={`Порог: ${CATEGORY_BY_KEY[r.key].label}`}
              value={t[r.key]}
              min={r.min}
              max={r.max}
              onChange={(v) => onChange({ ...t, [r.key]: v })}
            />
          </div>
        ))}
        {(["iso", "rej"] as const).map((key) => (
          <div key={key} className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-neutral-100 py-3 last:border-0">
            <div className="w-40 shrink-0">
              <CategoryBadge category={key} />
            </div>
            <span className="min-w-32 flex-1 text-[13.5px] text-neutral-500">{categoryRange(key, t, useNeg)}</span>
          </div>
        ))}
      </div>
      {!isDefault && (
        <Button type="button" variant="link" size="inline" onClick={() => onChange({ ...DEFAULT_THRESHOLDS })} className="mt-3">
          Вернуть стандартные границы (по Я. Л. Коломинскому)
        </Button>
      )}
    </div>
  )
}
