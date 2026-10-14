import { useEffect } from "react"
import { toast } from "sonner"
import { AppHeader } from "@/components/AppHeader"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ImportProvider } from "@/features/files/ImportProvider"
import { HomePage } from "@/features/home/HomePage"
import { SurveyPage } from "@/features/survey/SurveyPage"
import { useHashRoute } from "@/hooks/useHashRoute"
import { useSurvey, useWorkspace } from "@/state/context"
import { WorkspaceProvider } from "@/state/WorkspaceProvider"

function Screens() {
  const { ready } = useWorkspace()
  const [route, navigate] = useHashRoute()
  const surveyId = route.name === "survey" ? route.id : undefined
  const survey = useSurvey(surveyId)
  const missing = ready && surveyId !== undefined && !survey

  useEffect(() => {
    if (missing) {
      toast.error("Опрос не найден")
      navigate({ name: "home" }, { replace: true })
    }
  }, [missing, navigate])

  useEffect(() => {
    document.title = survey ? `${survey.className} — Социометрия` : "Социометрия"
  }, [survey])

  if (!ready) {
    return <AppHeader />
  }

  return (
    <>
      <AppHeader crumb={survey?.className} />
      {route.name === "survey" && survey ? (
        <SurveyPage key={survey.id} survey={survey} tab={route.tab} student={route.student} />
      ) : (
        <HomePage />
      )}
    </>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <TooltipProvider>
        <WorkspaceProvider>
          <ImportProvider>
            <div className="min-h-svh bg-neutral-50 text-neutral-950 print:bg-white">
              <Screens />
            </div>
            {/* Hidden in print: even an empty box after the landscape matrix page adds a blank page. */}
            <div className="print:hidden">
              <Toaster position="bottom-center" />
            </div>
          </ImportProvider>
        </WorkspaceProvider>
      </TooltipProvider>
    </ErrorBoundary>
  )
}
