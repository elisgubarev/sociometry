import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group max-[600px]:w-auto!"
      icons={{
        success: (
          <CircleCheckIcon className="size-[18px] text-emerald-600" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-[18px] text-rose-600" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      position="top-center"
      offset={20}
      duration={2000}
      toastOptions={{
        classNames: {
          toast:
            "cn-toast inset-x-0! mx-auto! w-fit! max-w-full! gap-2.5! rounded-xl! border-0! px-4! py-3! text-[14px]! font-medium! shadow-lg! ring-1! ring-neutral-950/5!",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
