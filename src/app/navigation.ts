export const DESTINATIONS = ["overview", "projects", "resources"] as const

export type DestinationId = (typeof DESTINATIONS)[number]

export const INITIAL_DESTINATION: DestinationId = "overview"

export const DEFAULT_SIDEBAR_WIDTH = 240
export const MIN_SIDEBAR_WIDTH = 200
export const MAX_SIDEBAR_WIDTH = 320
export const SIDEBAR_RESIZE_HANDLE_WIDTH = 7

export function initialSidebarLayout(viewportWidth: number): [number, number] {
  const panelSpace = Math.max(viewportWidth - SIDEBAR_RESIZE_HANDLE_WIDTH, MIN_SIDEBAR_WIDTH)
  const sidebar = Math.min(100, (DEFAULT_SIDEBAR_WIDTH / panelSpace) * 100)
  return [sidebar, 100 - sidebar]
}

export const DESTINATION_LABELS: Record<DestinationId, string> = {
  overview: "Overview",
  projects: "Projects",
  resources: "Resources",
}

export function isDestinationId(value: unknown): value is DestinationId {
  return DESTINATIONS.some((destination) => destination === value)
}
