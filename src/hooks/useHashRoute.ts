import { useCallback, useSyncExternalStore } from "react"

export type SurveyTab = "students" | "entry" | "matrix" | "results"
export const SURVEY_TABS: SurveyTab[] = ["students", "entry", "matrix", "results"]

/** `student` is the form open on the entry tab. */
export type Route = { name: "home" } | { name: "survey"; id: string; tab: SurveyTab; student?: string }

function decode(part: string): string {
  try {
    return decodeURIComponent(part)
  } catch {
    return part
  }
}

export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, "").split("/").filter(Boolean).map(decode)
  if (parts[0] === "s" && parts[1]) {
    const tab = SURVEY_TABS.includes(parts[2] as SurveyTab) ? (parts[2] as SurveyTab) : "students"
    return { name: "survey", id: parts[1], tab, student: tab === "entry" ? parts[3] : undefined }
  }
  return { name: "home" }
}

export function routeHref(route: Route): string {
  if (route.name === "home") return "#/"
  const base = `#/s/${encodeURIComponent(route.id)}/${route.tab}`
  return route.student ? `${base}/${encodeURIComponent(route.student)}` : base
}

const subscribe = (cb: () => void) => {
  window.addEventListener("hashchange", cb)
  return () => window.removeEventListener("hashchange", cb)
}
const getHash = () => window.location.hash

export type Navigate = (route: Route, opts?: { replace?: boolean; keepScroll?: boolean }) => void

export function useHashRoute(): [Route, Navigate] {
  const hash = useSyncExternalStore(subscribe, getHash)
  const navigate = useCallback<Navigate>((route, opts) => {
    const href = routeHref(route)
    if (window.location.hash === href) return
    if (opts?.replace) {
      history.replaceState(null, "", href)
      window.dispatchEvent(new HashChangeEvent("hashchange"))
    } else {
      window.location.hash = href
    }
    if (!opts?.keepScroll) window.scrollTo({ top: 0 })
  }, [])
  return [parseHash(hash), navigate]
}
