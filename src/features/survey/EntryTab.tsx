import { useEffect, useRef } from "react"
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Field, FieldLabel } from "@/components/ui/field"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Toggle } from "@/components/ui/toggle"
import { useHashRoute } from "@/hooks/useHashRoute"
import type { SurveyResults } from "@/lib/sociometry/compute"
import type { Answer, ChoiceKind, Student, Survey } from "@/lib/sociometry/types"
import { cn } from "@/lib/utils"
import { useWorkspace } from "@/state/context"

interface Props {
  survey: Survey
  results: SurveyResults
  studentId?: string
}

const EMPTY: Answer = { pos: [], neg: [], absent: false }

export function EntryTab({ survey, results, studentId }: Props) {
  const { dispatch } = useWorkspace()
  const [, navigate] = useHashRoute()
  const formRef = useRef<HTMLDivElement>(null)
  const students = survey.students
  const n = students.length

  const fallback = students.find((s) => !results.byId[s.id]?.filled) ?? students[0]
  const current = students.find((s) => s.id === studentId) ?? fallback
  const index = current ? students.indexOf(current) : -1

  // Keep the address in sync so a reload reopens the same form.
  useEffect(() => {
    if (current && current.id !== studentId) {
      navigate({ name: "survey", id: survey.id, tab: "entry", student: current.id }, { replace: true, keepScroll: true })
    }
  }, [current, studentId, survey.id, navigate])

  if (!current) {
    return <NoStudents />
  }

  const go = (s: Student | undefined) => {
    if (!s) return
    navigate({ name: "survey", id: survey.id, tab: "entry", student: s.id }, { replace: true, keepScroll: true })
    const top = formRef.current?.getBoundingClientRect().top ?? 0
    if (top < 0) formRef.current?.scrollIntoView({ block: "start" })
  }
  const isLast = index === n - 1
  const next = () => go(students[index + 1])
  const prev = () => go(students[index - 1])

  const answer = survey.answers[current.id] ?? EMPTY
  const pct = n ? Math.round((results.filledCount / n) * 100) : 0
  const selectItems = students.map((s, i) => ({
    value: s.id,
    label: `${results.byId[s.id]?.filled ? "✓" : "○"} ${i + 1}. ${s.name}`,
  }))

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
      {/* Desktop: list of forms */}
      <Card className="hidden gap-3 py-6 lg:sticky lg:top-24 lg:flex sm:py-6">
        <CardHeader className="gap-3 px-6 sm:px-6">
          <CardTitle>Анкеты</CardTitle>
          <CardAction className="text-[13.5px] text-neutral-500 tabular-nums">
            {results.filledCount} из {n}
          </CardAction>
          <FormsProgress pct={pct} className="col-span-2" />
        </CardHeader>
        <CardContent className="px-3 sm:px-3">
          <ul className="flex max-h-[calc(100svh-15rem)] flex-col gap-px overflow-y-auto">
            {students.map((s, i) => {
              const active = s.id === current.id
              return (
                <li key={s.id}>
                  <Button
                    variant="ghost"
                    onClick={() => go(s)}
                    aria-current={active ? "true" : undefined}
                    className={cn(
                      "h-11 w-full justify-start gap-2 px-2.5 text-[14.5px] font-normal",
                      active ? "bg-neutral-100 font-medium text-neutral-950 hover:bg-neutral-100" : "text-neutral-800 hover:bg-neutral-50",
                    )}
                  >
                    <span className="w-6 shrink-0 text-left text-[13px] font-normal text-neutral-400 tabular-nums">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate text-left">{s.name}</span>
                    <StatusMark filled={!!results.byId[s.id]?.filled} />
                  </Button>
                </li>
              )
            })}
          </ul>
        </CardContent>
      </Card>

      <Card ref={formRef} className="min-w-0 scroll-mt-24 gap-6 sm:gap-7">
        {/* Mobile: progress + student picker */}
        <div className="-mt-1 flex flex-col gap-3 border-b border-neutral-100 px-5 pb-5 lg:hidden">
          <div className="flex items-center justify-between text-[13.5px] text-neutral-500">
            <span>Анкеты</span>
            <span className="tabular-nums">
              {results.filledCount} из {n}
            </span>
          </div>
          <FormsProgress pct={pct} />
          <Select items={selectItems} value={current.id} onValueChange={(id) => go(students.find((s) => s.id === id))}>
            <SelectTrigger aria-label="Анкета ученика" className="mt-1 h-11 w-full text-[15px] data-[size=default]:h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              {selectItems.map((item) => (
                <SelectItem key={item.value} value={item.value} className="py-2 text-[15px]">
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <CardHeader>
          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-xs font-medium tracking-wider text-neutral-500 uppercase">
              Анкета {index + 1} из {n}
            </span>
            <CardTitle className="text-2xl leading-tight break-words sm:text-[28px]">{current.name}</CardTitle>
          </div>
          <CardAction className="hidden gap-2 lg:flex">
            <Button variant="outline" size="icon" onClick={prev} disabled={index <= 0} aria-label="Предыдущая анкета">
              <ChevronLeftIcon />
            </Button>
            <Button variant="outline" size="icon" onClick={next} disabled={isLast} aria-label="Следующая анкета">
              <ChevronRightIcon />
            </Button>
          </CardAction>
        </CardHeader>

        <CardContent className="flex flex-col gap-8">
          <Field orientation="horizontal" className="rounded-xl border border-neutral-200 px-4 py-3.5">
            <Switch
              id={`absent-${current.id}`}
              checked={answer.absent}
              onCheckedChange={(absent) =>
                dispatch({ type: "setAbsent", surveyId: survey.id, studentId: current.id, absent })
              }
            />
            <FieldLabel htmlFor={`absent-${current.id}`} className="text-[14.5px]">
              Отсутствовал(а) на опросе
            </FieldLabel>
          </Field>

          {answer.absent ? (
            <Empty className="border border-neutral-300">
              <EmptyHeader>
                <EmptyTitle className="text-[15px] font-normal text-neutral-500">
                  Анкеты нет — в социоматрице строка останется пустой.
                </EmptyTitle>
              </EmptyHeader>
            </Empty>
          ) : (
            <>
              <ChoiceSection kind="pos" title="Кого выбрал(а)" question={survey.questionPos} survey={survey} current={current} answer={answer} />
              {survey.useNeg && (
                <ChoiceSection kind="neg" title="Кого не выбрал(а)" question={survey.questionNeg} survey={survey} current={current} answer={answer} />
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Mobile: navigation pinned to the bottom of the screen */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-neutral-200 bg-white/90 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md lg:hidden">
        <div className="mx-auto flex max-w-290 gap-2">
          <Button variant="outline" size="lg" onClick={prev} disabled={index <= 0} aria-label="Предыдущая анкета" className="w-12 px-0">
            <ChevronLeftIcon />
          </Button>
          <Button size="lg" onClick={next} disabled={isLast} className="flex-1">
            Следующая анкета
            <ChevronRightIcon />
          </Button>
        </div>
      </div>
    </div>
  )
}

export function NoStudents() {
  return (
    <Empty className="border border-neutral-300 py-12">
      <EmptyHeader>
        <EmptyTitle className="text-[15px] font-normal text-neutral-500">
          Сначала добавьте учеников на вкладке «Ученики».
        </EmptyTitle>
      </EmptyHeader>
    </Empty>
  )
}

function FormsProgress({ pct, className }: { pct: number; className?: string }) {
  return (
    <Progress
      value={pct}
      aria-label="Внесено анкет"
      className={cn("[&_[data-slot=progress-indicator]]:bg-emerald-600 [&_[data-slot=progress-track]]:bg-neutral-200", className)}
    />
  )
}

function StatusMark({ filled }: { filled: boolean }) {
  return filled ? (
    <span className="ml-auto inline-flex size-4.5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white" title="Анкета внесена">
      <CheckIcon className="size-3" strokeWidth={3} />
    </span>
  ) : (
    <span className="ml-auto size-4.5 shrink-0 rounded-full border-[1.5px] border-neutral-300" title="Ещё не внесена" />
  )
}

function ChoiceSection({
  kind,
  title,
  question,
  survey,
  current,
  answer,
}: {
  kind: ChoiceKind
  title: string
  question: string
  survey: Survey
  current: Student
  answer: Answer
}) {
  const { dispatch } = useWorkspace()
  const list = answer[kind]
  const other = answer[kind === "pos" ? "neg" : "pos"]
  const full = list.length >= survey.maxChoices
  const pos = kind === "pos"

  return (
    <section aria-label={title}>
      <div className="mb-4 flex flex-wrap items-start gap-3.5">
        <span
          aria-hidden
          className={cn(
            "inline-flex size-7 shrink-0 items-center justify-center rounded-lg text-[17px] leading-none font-semibold",
            pos ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700",
          )}
        >
          {pos ? "+" : "−"}
        </span>
        <div className="min-w-55 flex-1">
          <h3 className="text-[14.5px] font-medium">{title}</h3>
          {question && <p className="mt-0.5 text-[14px] text-neutral-500">«{question}»</p>}
        </div>
        <Badge
          className={cn(
            "ml-auto h-6.5 px-2.5 text-[13px] tabular-nums",
            full ? "bg-neutral-950 text-white" : "bg-neutral-100 text-neutral-600",
          )}
        >
          {list.length} из {survey.maxChoices}
        </Badge>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-[repeat(auto-fill,minmax(190px,1fr))]">
        {survey.students
          .filter((s) => s.id !== current.id)
          .map((s) => {
            const on = list.includes(s.id)
            const inOther = other.includes(s.id)
            return (
              <Toggle
                key={s.id}
                variant="outline"
                pressed={on}
                disabled={!on && (inOther || full)}
                title={inOther ? (pos ? "Уже отмечен(а) в отрицательном вопросе" : "Уже отмечен(а) в положительном вопросе") : undefined}
                onPressedChange={() =>
                  dispatch({ type: "toggleChoice", surveyId: survey.id, studentId: current.id, targetId: s.id, kind })
                }
                className={cn(
                  "h-auto min-h-12 justify-start gap-2.5 rounded-xl border-neutral-200 bg-white px-3 py-2 text-left text-[14.5px] font-normal whitespace-normal text-neutral-800 hover:border-neutral-400 hover:bg-white disabled:opacity-35",
                  pos
                    ? "aria-pressed:border-emerald-200 aria-pressed:bg-emerald-50 aria-pressed:font-medium aria-pressed:text-emerald-900 aria-pressed:hover:border-emerald-300"
                    : "aria-pressed:border-orange-200 aria-pressed:bg-orange-50 aria-pressed:font-medium aria-pressed:text-orange-900 aria-pressed:hover:border-orange-300",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "inline-flex size-5 shrink-0 items-center justify-center rounded-md border-[1.5px] text-[15px] leading-none font-semibold",
                    on
                      ? pos
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : "border-orange-600 bg-orange-600 text-white"
                      : "border-neutral-300",
                  )}
                >
                  {on ? (pos ? "+" : "−") : ""}
                </span>
                <span className="min-w-0 break-words">{s.name}</span>
              </Toggle>
            )
          })}
      </div>
    </section>
  )
}
