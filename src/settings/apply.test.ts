import { afterEach, describe, expect, it } from "vitest"

import { applyApplicationSettings } from "./apply"
import { DEFAULT_APPLICATION_SETTINGS } from "./model"

describe("validated application settings integration", () => {
  afterEach(() => {
    applyApplicationSettings(DEFAULT_APPLICATION_SETTINGS)
  })

  it("applies the bundled theme, density, and forced reduced motion", () => {
    const applied = applyApplicationSettings({
      ...DEFAULT_APPLICATION_SETTINGS,
      density: "compact",
      forceReducedMotion: true,
    })
    expect(applied.density).toBe("compact")
    expect(document.documentElement.dataset.theme).toBe("merlin-dark")
    expect(document.documentElement.style.colorScheme).toBe("dark")
    expect(document.documentElement.dataset.density).toBe("compact")
    expect(document.documentElement.dataset.forceReducedMotion).toBe("true")
  })

  it("removes only the forced override so the operating-system preference remains effective", () => {
    document.documentElement.dataset.forceReducedMotion = "true"
    applyApplicationSettings(DEFAULT_APPLICATION_SETTINGS)
    expect(document.documentElement.dataset.forceReducedMotion).toBeUndefined()
    expect(document.documentElement.dataset.density).toBe("default")
  })

  it("rejects an invalid snapshot before changing the current root", () => {
    const canary = "sk-test-DO-NOT-REFLECT"
    applyApplicationSettings({
      ...DEFAULT_APPLICATION_SETTINGS,
      density: "compact",
      forceReducedMotion: true,
    })
    expect(() =>
      applyApplicationSettings({ ...DEFAULT_APPLICATION_SETTINGS, themeSlug: canary }),
    ).toThrow("Application settings snapshot is invalid")
    expect(document.documentElement.dataset.theme).toBe("merlin-dark")
    expect(document.documentElement.dataset.density).toBe("compact")
    expect(document.documentElement.dataset.forceReducedMotion).toBe("true")
  })
})
