import { choicesWord } from "@/lib/ru"
import type { CategoryKey, Thresholds } from "./types"

export interface CategoryMeta {
  key: CategoryKey
  label: string
  plural: string
  /** Tailwind classes: badge background + text, the dot, and the share-bar segment. */
  badge: string
  dot: string
}

export const CATEGORIES: CategoryMeta[] = [
  {
    key: "star",
    label: "Звезда",
    plural: "Звёзды",
    badge: "bg-amber-100 text-amber-800",
    dot: "bg-amber-500",
  },
  {
    key: "pref",
    label: "Предпочитаемый",
    plural: "Предпочитаемые",
    badge: "bg-violet-100 text-violet-700",
    dot: "bg-violet-500",
  },
  {
    key: "acc",
    label: "Принятый",
    plural: "Принятые",
    badge: "bg-sky-100 text-sky-800",
    dot: "bg-sky-500",
  },
  {
    key: "iso",
    label: "Изолированный",
    plural: "Изолированные",
    badge: "bg-neutral-100 text-neutral-600",
    dot: "bg-neutral-400",
  },
  {
    key: "rej",
    label: "Отверженный",
    plural: "Отверженные",
    badge: "bg-rose-100 text-rose-700",
    dot: "bg-rose-500",
  },
]

export const CATEGORY_BY_KEY = Object.fromEntries(CATEGORIES.map((c) => [c.key, c])) as Record<
  CategoryKey,
  CategoryMeta
>

function range(from: number, to: number): string {
  return from === to ? `${from} ${choicesWord(from)}` : `${from}–${to} ${choicesWord(to)}`
}

/** "6 и более выборов", "3–5 выборов", "1–2 выбора"… */
export function categoryRange(key: CategoryKey, t: Thresholds, useNeg: boolean): string {
  switch (key) {
    case "star":
      return `${t.star} и более выборов`
    case "pref":
      return range(t.pref, t.star - 1)
    case "acc":
      return range(t.acc, t.pref - 1)
    case "iso":
      return "Ни одного выбора"
    case "rej":
      return useNeg ? "Только отрицательные выборы" : "Не определяется без отрицательного вопроса"
  }
}
