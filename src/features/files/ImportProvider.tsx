import { useCallback, useMemo, useState, type ReactNode } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { newId } from "@/lib/id"
import { FileFormatError, parseDataFile } from "@/lib/sociometry/schema"
import type { Survey } from "@/lib/sociometry/types"
import { pickTextFile } from "@/lib/storage/exportFiles"
import { useHashRoute } from "@/hooks/useHashRoute"
import { useWorkspace } from "@/state/context"
import { cloneSurvey } from "@/state/reducer"
import { ImportContext } from "./importContext"

interface Pending {
  fresh: Survey[]
  conflicts: Survey[]
}

export function ImportProvider({ children }: { children: ReactNode }) {
  const { surveys, dispatch } = useWorkspace()
  const [, navigate] = useHashRoute()
  const [pending, setPending] = useState<Pending | null>(null)

  const finish = useCallback(
    (list: Survey[]) => {
      if (!list.length) return
      dispatch({ type: "upsertSurveys", surveys: list })
      if (list.length === 1) {
        toast.success(`Опрос «${list[0].className}» открыт`)
        navigate({ name: "survey", id: list[0].id, tab: "students" })
      } else {
        toast.success(`Добавлено опросов: ${list.length}`)
      }
    },
    [dispatch, navigate],
  )

  const importFile = useCallback(async () => {
    let picked: { name: string; text: string } | null
    try {
      picked = await pickTextFile()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось открыть файл.")
      return
    }
    if (!picked) return
    let incoming: Survey[]
    try {
      const parsed = parseDataFile(picked.text)
      incoming = parsed.kind === "workspace" ? parsed.data.surveys : [parsed.data.survey]
    } catch (e) {
      toast.error(e instanceof FileFormatError ? e.message : "Не удалось прочитать файл.")
      return
    }
    if (!incoming.length) {
      toast("В файле нет опросов.")
      return
    }
    const existing = new Map(surveys.map((s) => [s.id, s]))
    const fresh: Survey[] = []
    const conflicts: Survey[] = []
    for (const s of incoming) {
      const mine = existing.get(s.id)
      if (!mine) fresh.push(s)
      else if (JSON.stringify(mine) !== JSON.stringify(s)) conflicts.push(s)
    }
    if (!fresh.length && !conflicts.length) {
      toast("Эти опросы уже есть.")
      if (incoming.length === 1) navigate({ name: "survey", id: incoming[0].id, tab: "students" })
      return
    }
    if (!conflicts.length) finish(fresh)
    else setPending({ fresh, conflicts })
  }, [surveys, finish, navigate])

  const replace = () => {
    if (!pending) return
    finish([...pending.fresh, ...pending.conflicts])
    setPending(null)
  }

  const addCopies = () => {
    if (!pending) return
    const at = new Date().toISOString()
    const copies = pending.conflicts.map((s) =>
      cloneSurvey(s, { id: newId(), makeId: newId, at, className: `${s.className} (копия)`, withAnswers: true }),
    )
    finish([...pending.fresh, ...copies])
    setPending(null)
  }

  const value = useMemo(() => ({ importFile }), [importFile])

  return (
    <ImportContext.Provider value={value}>
      {children}
      <Dialog open={!!pending} onOpenChange={(open) => !open && setPending(null)}>
        <DialogContent className="gap-5 p-6 sm:max-w-md" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              {pending && pending.conflicts.length === 1 ? "Этот опрос уже есть" : "Эти опросы уже есть"}
            </DialogTitle>
            <DialogDescription>
              {pending?.conflicts.map((s) => `«${s.className}»`).join(", ")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="-mx-6 -mb-6 bg-transparent px-6 pt-4 pb-6">
            <Button variant="ghost" onClick={() => setPending(null)}>
              Отмена
            </Button>
            <Button variant="outline" onClick={addCopies}>
              Добавить копией
            </Button>
            <Button onClick={replace}>Заменить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ImportContext.Provider>
  )
}
