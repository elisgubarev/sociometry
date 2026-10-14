import { Component, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { readBrowserCopy } from "@/lib/storage/idb"
import { downloadBlob } from "@/lib/storage/exportFiles"

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error) {
    console.error(error)
  }

  private async downloadBackup() {
    const text = await readBrowserCopy()
    if (text) downloadBlob("Социометрия — резервная копия.json", new Blob([text], { type: "application/json" }))
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="flex min-h-svh items-center justify-center bg-neutral-50 p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-xl">Что-то пошло не так</CardTitle>
            <CardDescription>Данные сохранены. Перезагрузите страницу.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button onClick={() => window.location.reload()}>Перезагрузить</Button>
            <Button variant="outline" onClick={() => void this.downloadBackup()}>
              Скачать резервную копию
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }
}
