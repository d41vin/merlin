import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export function ControlsHarness() {
  return (
    <main className="merlin-page">
      <header className="merlin-header">
        <div>
          <h1 className="merlin-page-title">Merlin common controls harness</h1>
          <p className="merlin-reading">
            Test-only controls for keyboard, focus, and accessible-name verification. This page
            contains no Merlin project, resource, account, or usage data.
          </p>
        </div>
      </header>
      <section className="merlin-surface" aria-labelledby="form-controls-title">
        <h2 className="merlin-section-title" id="form-controls-title">
          Form controls
        </h2>
        <div className="merlin-control-stack">
          <div>
            <Label htmlFor="harness-name">Display name</Label>
            <Input id="harness-name" name="name" autoComplete="off" placeholder="Example" />
          </div>
          <div>
            <Label htmlFor="harness-notes">Notes</Label>
            <Textarea id="harness-notes" name="notes" rows={4} placeholder="Optional notes" />
          </div>
          <div>
            <Label htmlFor="harness-disabled">Disabled field</Label>
            <Input id="harness-disabled" value="Unavailable" disabled readOnly />
          </div>
          <div>
            <Label htmlFor="harness-invalid">Field with error</Label>
            <Input
              id="harness-invalid"
              aria-invalid="true"
              aria-describedby="harness-invalid-error"
            />
            <p className="merlin-status" data-kind="error" id="harness-invalid-error">
              Enter a value.
            </p>
          </div>
        </div>
      </section>
      <section className="merlin-surface" aria-labelledby="dialog-controls-title">
        <h2 className="merlin-section-title" id="dialog-controls-title">
          Dialog
        </h2>
        <p className="merlin-reading">
          Focus stays inside the modal and returns to the trigger when it closes.
        </p>
        <Dialog
          trigger={<Button type="button">Open dialog</Button>}
          title="Example dialog"
          description="A token-styled modal with Escape handling and focus management."
        >
          <div>
            <Label htmlFor="harness-dialog-name">Display name</Label>
            <Input id="harness-dialog-name" placeholder="Example" />
          </div>
        </Dialog>
      </section>
    </main>
  )
}
