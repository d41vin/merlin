import { describe, expect, it } from "vitest"

import {
  DEFAULT_SIDEBAR_WIDTH,
  DESTINATIONS,
  DESTINATION_LABELS,
  INITIAL_DESTINATION,
  isDestinationId,
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

  it("uses the approved 240px default sidebar width", () => {
    expect(DEFAULT_SIDEBAR_WIDTH).toBe(240)
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
