import { useRef, useState, type CSSProperties } from "react"
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core"
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers"
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVerticalIcon, PlusIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/ConfirmDialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { newId } from "@/lib/id"
import { studentsLabel } from "@/lib/ru"
import { MAX_NAME_LENGTH, MAX_STUDENTS } from "@/lib/sociometry/defaults"
import { cleanName, parseNameList, sameName } from "@/lib/sociometry/names"
import type { Student, Survey } from "@/lib/sociometry/types"
import { cn } from "@/lib/utils"
import { useWorkspace } from "@/state/context"

export function StudentsTab({ survey }: { survey: Survey }) {
  const { dispatch } = useWorkspace()
  const [newName, setNewName] = useState("")
  const [toDelete, setToDelete] = useState<Student | null>(null)
  const n = survey.students.length
  const full = n >= MAX_STUDENTS

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const ids = survey.students.map((s) => s.id)
  const nameOf = (id: UniqueIdentifier) => survey.students.find((s) => s.id === id)?.name ?? ""
  const placeOf = (id: UniqueIdentifier) => ids.indexOf(String(id)) + 1
  const announcements: Announcements = {
    onDragStart: ({ active }) => `${nameOf(active.id)}: место ${placeOf(active.id)} из ${n}`,
    onDragOver: ({ active, over }) => (over ? `${nameOf(active.id)}: место ${placeOf(over.id)} из ${n}` : undefined),
    onDragEnd: ({ active, over }) => (over ? `${nameOf(active.id)} теперь на месте ${placeOf(over.id)}` : undefined),
    onDragCancel: ({ active }) => `${nameOf(active.id)}: перемещение отменено`,
  }

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    dispatch({ type: "moveStudent", surveyId: survey.id, studentId: String(active.id), toIndex: ids.indexOf(String(over.id)) })
  }

  const exists = (name: string) => survey.students.some((s) => sameName(s.name, name))

  const add = () => {
    const name = cleanName(newName)
    if (!name || full) return
    if (exists(name)) {
      toast.error(`«${name}» уже есть в списке`)
      return
    }
    dispatch({ type: "addStudents", surveyId: survey.id, students: [{ id: newId(), name }] })
    setNewName("")
  }

  // A list pasted from Excel or a document: every line becomes a student.
  const pasteList = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text")
    if (!/[\r\n]/.test(text.trim())) return
    e.preventDefault()
    const names = parseNameList(text).names.filter((name) => !exists(name)).slice(0, MAX_STUDENTS - n)
    if (!names.length) return
    dispatch({ type: "addStudents", surveyId: survey.id, students: names.map((name) => ({ id: newId(), name })) })
    toast.success(`Добавлено: ${studentsLabel(names.length)}`)
  }

  return (
    <div>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Список учеников</CardTitle>
          <CardDescription className="text-[13.5px]">
            {studentsLabel(n)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="mb-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              add()
            }}
          >
            <Input
              aria-label="Фамилия и имя ученика"
              placeholder="Фамилия и имя"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onPaste={pasteList}
              maxLength={MAX_NAME_LENGTH}
              disabled={full}
              autoComplete="off"
            />
            <Button type="submit" variant="outline" disabled={!cleanName(newName) || full} aria-label="Добавить">
              <PlusIcon />
              <span className="hidden sm:inline">Добавить</span>
            </Button>
          </form>

          {n === 0 ? (
            <Empty className="border border-neutral-300">
              <EmptyHeader>
                <EmptyTitle className="text-[15px]">Список пуст</EmptyTitle>
              </EmptyHeader>
            </Empty>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              modifiers={[restrictToVerticalAxis, restrictToParentElement]}
              onDragEnd={onDragEnd}
              accessibility={{
                announcements,
                screenReaderInstructions: {
                  draggable: "Пробел — взять ученика, стрелки вверх и вниз — переместить, пробел — поставить, Escape — отменить.",
                },
              }}
            >
              <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                <ul>
                  {survey.students.map((st, i) => (
                    <StudentRow
                      key={st.id}
                      student={st}
                      num={i + 1}
                      survey={survey}
                      sortable={n > 1}
                      onDelete={() => setToDelete(st)}
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Удалить ${toDelete?.name ?? ""}?`}
        description="Ученик будет удалён из списка, его анкеты и из анкет одноклассников."
        confirmLabel="Удалить"
        destructive
        onConfirm={() => {
          if (toDelete) dispatch({ type: "deleteStudent", surveyId: survey.id, studentId: toDelete.id })
        }}
      />
    </div>
  )
}

function StudentRow({
  student,
  num,
  survey,
  sortable,
  onDelete,
}: {
  student: Student
  num: number
  survey: Survey
  sortable: boolean
  onDelete: () => void
}) {
  const { dispatch } = useWorkspace()
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: student.id,
    disabled: !sortable,
    transition: { duration: 200, easing: "cubic-bezier(0.25, 1, 0.5, 1)" },
  })
  // The app has no motion except here: index.css lets [data-sortable] use this transition.
  const style = { transform: CSS.Translate.toString(transform), "--sortable-transition": transition ?? "none" } as CSSProperties
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(student.name)
  const cancelled = useRef(false)

  const commit = () => {
    setEditing(false)
    if (cancelled.current) {
      cancelled.current = false
      return
    }
    const name = cleanName(draft)
    if (!name || name === student.name) return
    if (survey.students.some((s) => s.id !== student.id && sameName(s.name, name))) {
      toast.error(`«${name}» уже есть в списке`)
      return
    }
    dispatch({ type: "renameStudent", surveyId: survey.id, studentId: student.id, name })
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      data-sortable
      className={cn(
        "flex min-h-14 items-center gap-2 border-b border-neutral-100 bg-white py-1.5 last:border-0",
        isDragging && "relative z-10 -mx-2 rounded-xl border-transparent px-2 shadow-lg ring-1 ring-neutral-200",
      )}
    >
      {sortable && (
        <Button
          ref={setActivatorNodeRef}
          variant="ghost"
          size="icon-xs"
          aria-label={`Переместить: ${student.name}`}
          className="-ml-2 shrink-0 cursor-grab touch-none text-neutral-300 hover:bg-transparent hover:text-neutral-600 active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVerticalIcon className="size-4" />
        </Button>
      )}
      <span className="w-6 shrink-0 text-[13px] text-neutral-400 tabular-nums">{num}</span>
      {editing ? (
        <Input
          autoFocus
          aria-label="Фамилия и имя"
          value={draft}
          maxLength={MAX_NAME_LENGTH}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={(e) => e.currentTarget.select()}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur()
            if (e.key === "Escape") {
              cancelled.current = true
              e.currentTarget.blur()
            }
          }}
          className="h-9 flex-1"
        />
      ) : (
        <Button
          variant="ghost"
          title="Изменить имя"
          onClick={() => {
            setDraft(student.name)
            setEditing(true)
          }}
          className="h-9 min-w-0 flex-1 justify-start truncate px-0 text-[15px] font-normal hover:bg-transparent hover:underline hover:decoration-neutral-300 hover:underline-offset-4"
        >
          <span className="truncate">{student.name}</span>
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon-sm"
        className="shrink-0 text-neutral-400 hover:text-rose-700"
        aria-label={`Удалить ${student.name}`}
        title="Удалить из списка"
        onClick={onDelete}
      >
        <Trash2Icon className="size-4" />
      </Button>
    </li>
  )
}
