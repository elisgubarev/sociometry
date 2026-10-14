import { useCallback } from "react"
import { toast } from "sonner"
import { downloadAll } from "@/lib/storage/exportFiles"
import { useWorkspace } from "@/state/context"

function errorText(e: unknown, fallback: string): string {
  return e instanceof Error && e.message ? e.message : fallback
}

/** The save button and the survey folder (Chrome, Edge); downloads in other browsers. */
export function useFileActions() {
  const { surveys, replaceAll, saver } = useWorkspace()

  const save = useCallback(async () => {
    if (!saver.getStatus().folderSupported) {
      downloadAll(surveys)
      saver.markExported()
      return
    }
    try {
      const { saved, surveys: merged } = await saver.save()
      if (merged) replaceAll(merged)
      if (saved) toast.success(`Сохранено в /${saver.getStatus().folderName}`)
      else if (saver.getStatus().folderState === "error") toast.error("Не удалось сохранить в папку.")
    } catch (e) {
      toast.error(errorText(e, "Не удалось сохранить."))
    }
  }, [saver, surveys, replaceAll])

  const chooseFolder = useCallback(async () => {
    try {
      const { saved, surveys: merged } = await saver.chooseFolder()
      if (merged) replaceAll(merged)
      if (saved) toast.success(`Сохранено в /${saver.getStatus().folderName}`)
    } catch (e) {
      toast.error(errorText(e, "Не удалось открыть папку."))
    }
  }, [saver, replaceAll])

  const regainAccess = useCallback(async () => {
    try {
      const merged = await saver.regainAccess()
      if (merged) replaceAll(merged)
    } catch (e) {
      toast.error(errorText(e, "Нет доступа к папке."))
    }
  }, [saver, replaceAll])

  return { save, chooseFolder, regainAccess }
}
