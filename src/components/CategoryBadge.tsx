import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { CATEGORY_BY_KEY } from "@/lib/sociometry/categories"
import type { CategoryKey } from "@/lib/sociometry/types"

/** Soft colored pill with a dot: category labels, survey status, counters. */
export function DotBadge({ dot, className, children }: { dot?: string; className: string; children: React.ReactNode }) {
  return (
    <Badge className={cn("h-6.5 gap-1.5 px-2.5 text-[13px]", dot && "pl-2", className)}>
      {dot && <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", dot)} />}
      {children}
    </Badge>
  )
}

export function CategoryBadge({ category, className }: { category: CategoryKey; className?: string }) {
  const meta = CATEGORY_BY_KEY[category]
  return (
    <DotBadge dot={meta.dot} className={cn(meta.badge, className)}>
      {meta.label}
    </DotBadge>
  )
}
