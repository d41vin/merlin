export const DESTINATIONS = ["overview", "projects", "resources"] as const

export type DestinationId = (typeof DESTINATIONS)[number]

export const INITIAL_DESTINATION: DestinationId = "overview"

// M4.2 renders the fixed 240px sidebar in shell.css. M4.3 will consume this
// constant when the resizable sidebar replaces the fixed shell scaffolding.
export const DEFAULT_SIDEBAR_WIDTH = 240

export const DESTINATION_LABELS: Record<DestinationId, string> = {
  overview: "Overview",
  projects: "Projects",
  resources: "Resources",
}

export function isDestinationId(value: unknown): value is DestinationId {
  return DESTINATIONS.some((destination) => destination === value)
}
