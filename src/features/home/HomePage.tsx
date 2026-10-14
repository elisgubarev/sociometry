import { useState } from "react"
import { PlusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useWorkspace } from "@/state/context"
import { NewSurveyDialog } from "./NewSurveyDialog"
import { SurveyCard } from "./SurveyCard"

const dashed =
  "h-auto min-h-36 flex-col gap-3 rounded-2xl border-dashed border-neutral-300 bg-transparent p-6 text-[15px] font-medium whitespace-normal text-neutral-600 hover:border-neutral-400 hover:bg-white hover:text-neutral-950"

export function HomePage() {
  const { surveys } = useWorkspace()
  const [creating, setCreating] = useState(false)

  return (
    <main className="mx-auto flex w-full max-w-290 flex-col gap-4 px-4 pt-8 pb-24 sm:px-8 sm:pt-12">
      <h1 className="sr-only">Опросы</h1>

      <div className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {surveys.map((s) => (
            <SurveyCard key={s.id} survey={s} />
          ))}
          <Button variant="outline" className={dashed} onClick={() => setCreating(true)}>
            <span className="inline-flex size-10 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-950">
              <PlusIcon className="size-4.5" />
            </span>
            Новый опрос
          </Button>
        </div>
      </div>

      <NewSurveyDialog open={creating} onOpenChange={setCreating} />
    </main>
  )
}
