import { DESTINATIONS, DESTINATION_LABELS, type DestinationId } from "@/app/navigation"

interface PrimaryNavigationProps {
  activeDestination: DestinationId
  onNavigate: (destination: DestinationId) => void
}

export function PrimaryNavigation({ activeDestination, onNavigate }: PrimaryNavigationProps) {
  return (
    <nav className="merlin-shell-nav" aria-label="Primary navigation">
      {DESTINATIONS.map((destination) => (
        <button
          key={destination}
          type="button"
          className="merlin-nav-item"
          aria-current={destination === activeDestination ? "page" : undefined}
          onClick={() => onNavigate(destination)}
        >
          {DESTINATION_LABELS[destination]}
        </button>
      ))}
    </nav>
  )
}
