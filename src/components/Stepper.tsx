import { MinusIcon, PlusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface StepperProps {
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  label: string
  className?: string
}

const step = "rounded-full text-neutral-500 hover:bg-neutral-100 hover:text-neutral-950 disabled:opacity-35"

export function Stepper({ value, onChange, min, max, label, className }: StepperProps) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn("inline-flex h-9 shrink-0 items-center rounded-full border border-neutral-200 bg-white p-0.5", className)}
    >
      <Button variant="ghost" size="icon-xs" className={step} onClick={() => onChange(value - 1)} disabled={value <= min} aria-label="Меньше">
        <MinusIcon />
      </Button>
      <span aria-live="polite" className="w-8 text-center text-[14px] font-medium tabular-nums">
        {value}
      </span>
      <Button variant="ghost" size="icon-xs" className={step} onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="Больше">
        <PlusIcon />
      </Button>
    </div>
  )
}
