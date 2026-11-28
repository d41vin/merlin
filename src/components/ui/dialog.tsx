import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import type { ReactElement, ReactNode } from "react"

import { Button } from "@/components/ui/button"

interface DialogProps {
  trigger: ReactElement
  title: string
  description?: string
  children?: ReactNode
  footer?: ReactNode
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

function Dialog({
  trigger,
  title,
  description,
  children,
  footer,
  defaultOpen,
  open,
  onOpenChange,
}: DialogProps) {
  return (
    <DialogPrimitive.Root
      defaultOpen={defaultOpen}
      open={open}
      onOpenChange={(nextOpen) => onOpenChange?.(nextOpen)}
    >
      <DialogPrimitive.Trigger render={trigger} />
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="merlin-dialog-backdrop" />
        <DialogPrimitive.Popup className="merlin-dialog-popup">
          <div className="merlin-dialog-header">
            <DialogPrimitive.Title className="merlin-section-title">{title}</DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="merlin-reading">
                {description}
              </DialogPrimitive.Description>
            ) : null}
          </div>
          {children ? <div className="merlin-dialog-body">{children}</div> : null}
          <div className="merlin-dialog-actions">
            {footer}
            <DialogPrimitive.Close
              render={
                <Button type="button" variant="outline" size="sm">
                  Close
                </Button>
              }
            />
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

export { Dialog }
