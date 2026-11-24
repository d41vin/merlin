import { Button } from "@/components/ui/button"

export function ControlStateProof() {
  return (
    <section className="merlin-surface" aria-labelledby="control-state-title">
      <h2 className="merlin-section-title" id="control-state-title">
        Theme control states
      </h2>
      <div className="merlin-toolbar" data-testid="control-state-proof">
        <Button type="button" variant="outline" data-testid="control-neutral">
          Neutral control
        </Button>
        <Button type="button" variant="default" data-testid="control-accent">
          Accent control
        </Button>
        <Button type="button" variant="destructive" data-testid="control-destructive">
          Destructive control
        </Button>
        <Button
          type="button"
          variant="outline"
          data-testid="control-neutral-selected"
          data-selected="true"
        >
          Selected neutral
        </Button>
        <Button
          type="button"
          variant="default"
          data-testid="control-accent-selected"
          data-selected="true"
        >
          Selected accent
        </Button>
        <Button
          type="button"
          variant="destructive"
          data-testid="control-destructive-selected"
          data-selected="true"
        >
          Selected destructive
        </Button>
        <Button type="button" variant="default" data-testid="control-accent-disabled" disabled>
          Disabled accent
        </Button>
        <Button
          type="button"
          variant="destructive"
          data-testid="control-destructive-disabled"
          disabled
        >
          Disabled destructive
        </Button>
      </div>
    </section>
  )
}
