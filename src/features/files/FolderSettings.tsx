import { FileInputIcon, FolderOpenIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSaveStatus } from "@/state/context"
import { useImport } from "./importContext"
import { useFileActions } from "./useFileActions"

/** Bottom of «Параметры»: where «Сохранить» writes (Chrome, Edge), or opening a file (other browsers). */
export function FolderSettings() {
  const status = useSaveStatus()
  const actions = useFileActions()
  const { importFile } = useImport()

  if (!status.folderSupported) {
    return (
      <section className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 pt-5">
        <h3 className="text-[14.5px] font-medium">Файлы</h3>
        <Button type="button" variant="outline" size="sm" onClick={() => void importFile()}>
          <FileInputIcon />
          Открыть файл
        </Button>
      </section>
    )
  }

  const needsAccess = status.folderName && status.folderState === "needs-permission"
  return (
    <section className="flex flex-col gap-3 border-t border-neutral-100 pt-5">
      <h3 className="text-[14.5px] font-medium">Папка для сохранения</h3>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className={status.folderName ? "truncate text-[14px] text-neutral-800" : "text-[14px] text-neutral-400"}>
          {status.folderName ? `/${status.folderName}` : "Не выбрана"}
        </span>
        <div className="flex gap-2">
          {needsAccess && (
            <Button type="button" size="sm" className="bg-amber-100 text-amber-900 hover:bg-amber-200" onClick={() => void actions.regainAccess()}>
              Разрешить доступ
            </Button>
          )}
          <Button type="button" variant="outline" size="sm" onClick={() => void actions.chooseFolder()}>
            <FolderOpenIcon />
            {status.folderName ? "Сменить папку" : "Выбрать папку"}
          </Button>
        </div>
      </div>
    </section>
  )
}
