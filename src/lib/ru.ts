/** Russian plural form: plural(5, "ученик", "ученика", "учеников") → "учеников". */
export function plural(n: number, one: string, few: string, many: string): string {
  const a = Math.abs(n) % 100
  const b = a % 10
  if (a > 10 && a < 20) return many
  if (b > 1 && b < 5) return few
  if (b === 1) return one
  return many
}

export function countLabel(n: number, one: string, few: string, many: string): string {
  return `${n} ${plural(n, one, few, many)}`
}

export const studentsLabel = (n: number) => countLabel(n, "ученик", "ученика", "учеников")
export const choicesWord = (n: number) => plural(n, "выбор", "выбора", "выборов")

/** "до 3 выборов" / "до 1 выбора" */
export const maxChoicesLabel = (n: number) => `до ${n} ${n === 1 ? "выбора" : "выборов"}`

const longDate = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" })
const shortDate = new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" })

function fromIso(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return null
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

/** "15 сентября 2026 г." without the trailing "г." */
export function formatDateLong(iso: string): string {
  const d = fromIso(iso)
  return d ? longDate.format(d).replace(/\s*г\.$/, "") : iso
}

export function formatDateShort(iso: string): string {
  const d = fromIso(iso)
  return d ? shortDate.format(d) : iso
}

export function todayIso(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
