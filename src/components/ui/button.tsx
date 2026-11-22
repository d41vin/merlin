import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

const buttonVariants = cva(
  "merlin-control inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap font-medium select-none disabled:pointer-events-none disabled:opacity-60",
  {
    variants: {
      variant: {
        default: "merlin-control-accent",
        outline: "",
        secondary: "merlin-button-secondary",
        ghost: "merlin-button-ghost",
        destructive: "merlin-button-destructive",
        link: "merlin-link-button",
      },
      size: {
        default: "min-h-8 px-2.5",
        sm: "min-h-7 px-2 text-xs",
        icon: "size-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button }
