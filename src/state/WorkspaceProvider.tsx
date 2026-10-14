import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from "react"
import { toast } from "sonner"
import type { Survey } from "@/lib/sociometry/types"
import { Saver } from "@/lib/storage/persistence"
import { WorkspaceContext, type WorkspaceContextValue } from "./context"
import { reducer, type Action } from "./reducer"

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [saver] = useState(() => new Saver())
  const [state, rawDispatch] = useReducer(reducer, { surveys: [] })
  const [ready, setReady] = useState(false)
  // Data that came from storage must not be written straight back.
  const loadedRef = useRef<Survey[] | null>(null)

  const replaceAll = useCallback((surveys: Survey[]) => {
    loadedRef.current = surveys
    rawDispatch({ type: "load", surveys, at: new Date().toISOString() })
  }, [])

  const dispatch = useCallback((action: Action) => {
    rawDispatch({ ...action, at: new Date().toISOString() } as Parameters<typeof reducer>[1])
  }, [])

  useEffect(() => {
    let alive = true
    saver.setExternalLoadHandler((surveys) => {
      replaceAll(surveys)
    })
    saver.init().then(
      (surveys) => {
        if (!alive) return
        replaceAll(surveys)
        setReady(true)
      },
      () => {
        if (!alive) return
        setReady(true)
        toast.error("Не удалось прочитать сохранённые данные.")
      },
    )
    return () => {
      alive = false
      saver.setExternalLoadHandler(null)
    }
  }, [saver, replaceAll])

  useEffect(() => {
    if (!ready || state.surveys === loadedRef.current) return
    saver.schedule(state.surveys)
  }, [state.surveys, ready, saver])

  useEffect(() => {
    // Back to the window: pick up files changed in the folder meanwhile.
    const onFocus = () => {
      void saver.refresh().then((surveys) => surveys && replaceAll(surveys))
    }
    const onHide = () => {
      if (document.visibilityState === "hidden") saver.flush()
      else onFocus()
    }
    const onUnload = (e: BeforeUnloadEvent) => {
      saver.flush()
      // Unsaved changes: the browser shows its own "leave the site?" message.
      if (saver.hasUnsaved()) {
        e.preventDefault()
        e.returnValue = ""
      }
    }
    document.addEventListener("visibilitychange", onHide)
    window.addEventListener("beforeunload", onUnload)
    window.addEventListener("focus", onFocus)
    return () => {
      window.removeEventListener("focus", onFocus)
      document.removeEventListener("visibilitychange", onHide)
      window.removeEventListener("beforeunload", onUnload)
    }
  }, [saver, replaceAll])

  const value = useMemo<WorkspaceContextValue>(
    () => ({ surveys: state.surveys, ready, dispatch, replaceAll, saver }),
    [state.surveys, ready, dispatch, replaceAll, saver],
  )

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}
