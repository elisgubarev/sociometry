import { createContext, useContext } from "react"

export interface ImportContextValue {
  /** Lets the user pick a survey file (e.g. from a colleague) and adds it. */
  importFile: () => Promise<void>
}

export const ImportContext = createContext<ImportContextValue | null>(null)

export function useImport(): ImportContextValue {
  const ctx = useContext(ImportContext)
  if (!ctx) throw new Error("useImport must be used inside ImportProvider")
  return ctx
}
