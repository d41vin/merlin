interface UnavailableStateProps {
  description: string
}

export function UnavailableState({ description }: UnavailableStateProps) {
  return (
    <section className="merlin-shell-unavailable">
      <h2 className="merlin-section-title">Not implemented in this build</h2>
      <p className="merlin-reading">{description}</p>
    </section>
  )
}
