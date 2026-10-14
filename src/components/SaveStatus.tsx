import { useState } from "react"
import { ConfirmDialog } from "@/components/ConfirmDialog"
import { Button } from "@/components/ui/button"
import { useFileActions } from "@/features/files/useFileActions"
import { useSaveStatus } from "@/state/context"

/** Header, right side: the save button. The folder itself is chosen in «Параметры». */
export function SaveStatus() {
  const status = useSaveStatus()
  const actions = useFileActions()
  const [askFolder, setAskFolder] = useState(false)
  if (!status.ready) return null

  const noFolder = status.folderSupported && !status.folderName
  // After a browser restart the click also asks for access to the folder.
  const needsAccess = !!status.folderName && status.folderState === "needs-permission"

  return (
    <>
      <Button
        size="sm"
        className="px-4"
        disabled={!(status.dirty || needsAccess) || status.folderState === "saving"}
        onClick={() => (noFolder ? setAskFolder(true) : void actions.save())}
      >
        Сохранить
      </Button>
      <ConfirmDialog
        open={askFolder}
        onOpenChange={setAskFolder}
        title="Выберите папку для сохранения"
        confirmLabel="Выбрать папку"
        onConfirm={() => void actions.save()}
      />
    </>
  )
}
