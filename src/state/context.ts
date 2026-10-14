import { createContext, useContext, useMemo, useSyncExternalStore } from "react"
import { computeResults, type SurveyResults } from "@/lib/sociometry/compute"
import type { Survey } from "@/lib/sociometry/types"
import type { Saver, SaveStatus } from "@/lib/storage/persistence"
import type { Action } from "./reducer"

export interface WorkspaceContextValue {
  surveys: Survey[]
  ready: boolean
  dispatch: (action: Action) => void
  /** Replace everything with data coming from outside (a file, another tab). */
  replaceAll: (surveys: Survey[]) => void
  saver: Saver
}

export const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error("useWorkspace must be used inside WorkspaceProvider")
  return ctx
}

export function useSurvey(id: string | undefined): Survey | undefined {
  const { surveys } = useWorkspace()
  return useMemo(() => surveys.find((s) => s.id === id), [surveys, id])
}

export function useResults(survey: Survey): SurveyResults {
  return useMemo(() => computeResults(survey), [survey])
}

export function useSaveStatus(): SaveStatus {
  const { saver } = useWorkspace()
  return useSyncExternalStore(saver.subscribe, saver.getStatus)
}
