import { cn } from "cn"
import type { ComponentProps } from "react"

function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn("merlin-textarea-control", className)}
      {...props}
    />
  )
}

export { Textarea }
