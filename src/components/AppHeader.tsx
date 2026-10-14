import { routeHref } from "@/hooks/useHashRoute"
import { SaveStatus } from "./SaveStatus"

export function Logo() {
  return (
    <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-neutral-950">
      <svg viewBox="0 0 24 24" className="size-[17px] fill-none stroke-white stroke-[1.8]" aria-hidden>
        <line x1="7" y1="7" x2="17" y2="9" strokeLinecap="round" />
        <line x1="7" y1="7" x2="11" y2="18" strokeLinecap="round" />
        <line x1="17" y1="9" x2="11" y2="18" strokeLinecap="round" />
        <circle cx="7" cy="7" r="2.4" className="fill-white" />
        <circle cx="17" cy="9" r="2.4" className="fill-white" />
        <circle cx="11" cy="18" r="2.4" className="fill-white" />
      </svg>
    </span>
  )
}

export function AppHeader({ crumb }: { crumb?: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-neutral-200 bg-neutral-50/85 backdrop-blur-md print:hidden">
      <div className="mx-auto flex h-16 w-full max-w-290 items-center gap-3 px-4 sm:px-8">
        <a
          href={routeHref({ name: "home" })}
          className="-ml-1 inline-flex shrink-0 items-center gap-2.5 rounded-lg p-1 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <Logo />
          <span className="text-[15px] font-semibold tracking-tight">Социометрия</span>
        </a>
        {crumb && (
          <div className="hidden min-w-0 items-center gap-3 sm:flex">
            <span className="text-neutral-300">/</span>
            <span className="truncate text-[14.5px] font-medium text-neutral-700">{crumb}</span>
          </div>
        )}
        <div className="ml-auto min-w-0">
          <SaveStatus />
        </div>
      </div>
    </header>
  )
}
