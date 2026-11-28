import { describe, expect, it } from "vitest"

import {
  DEFAULT_SIDEBAR_WIDTH,
  DESTINATIONS,
  DESTINATION_LABELS,
  INITIAL_DESTINATION,
  initialSidebarLayout,
  isDestinationId,
  MAX_SIDEBAR_WIDTH,
  MIN_SIDEBAR_WIDTH,
  SIDEBAR_RESIZE_HANDLE_WIDTH,
} from "./navigation"

describe("navigation model", () => {
  it("defines exactly the three approved destinations in order", () => {
    expect(DESTINATIONS).toEqual(["overview", "projects", "resources"])
    expect(Object.keys(DESTINATION_LABELS)).toEqual([...DESTINATIONS])
    expect(DESTINATION_LABELS).toEqual({
      overview: "Overview",
      projects: "Projects",
      resources: "Resources",
    })
  })

  it("starts on Overview", () => {
    expect(INITIAL_DESTINATION).toBe("overview")
  })

  it("uses the approved 240px default sidebar width within 200–320px bounds", () => {
    expect(DEFAULT_SIDEBAR_WIDTH).toBe(240)
    expect(MIN_SIDEBAR_WIDTH).toBe(200)
    expect(MAX_SIDEBAR_WIDTH).toBe(320)
    expect(MIN_SIDEBAR_WIDTH).toBeLessThan(DEFAULT_SIDEBAR_WIDTH)
    expect(DEFAULT_SIDEBAR_WIDTH).toBeLessThan(MAX_SIDEBAR_WIDTH)
  })

  it("derives a two-panel initial layout that resolves to 240px at any window width", () => {
    for (const viewportWidth of [760, 900, 1100, 1280, 1920]) {
      const layout = initialSidebarLayout(viewportWidth)
      const panelSpace = viewportWidth - SIDEBAR_RESIZE_HANDLE_WIDTH
      expect(layout).toHaveLength(2)
      expect(layout[0] + layout[1]).toBeCloseTo(100, 10)
      expect((layout[0] / 100) * panelSpace).toBeCloseTo(DEFAULT_SIDEBAR_WIDTH, 10)
    }
  })

  it("accepts only known destination ids", () => {
    for (const destination of DESTINATIONS) {
      expect(isDestinationId(destination)).toBe(true)
    }
    for (const invalid of ["settings", "Overview", "", " overview", null, undefined, 1, {}]) {
      expect(isDestinationId(invalid)).toBe(false)
    }
  })
})
