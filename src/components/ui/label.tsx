import { cn } from "cn"
import type { ComponentProps } from "react"

function Label({ className, ...props }: ComponentProps<"label">) {
  return <label data-slot="label" className={cn("merlin-label", className)} {...props} />
}

export { Label }
