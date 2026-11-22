import { describe, expect, it } from "vitest"

import {
  DEFAULT_APPLICATION_SETTINGS,
  defaultApplicationSettings,
  validateApplicationSettings,
} from "./model"

describe("application settings snapshots", () => {
  it("contains only the approved defaults and returns independent values", () => {
    expect(DEFAULT_APPLICATION_SETTINGS).toEqual({
      version: 1,
      themeSlug: "merlin-dark",
      density: "default",
      forceReducedMotion: false,
      usedDefaults: false,
    })
    const copy = defaultApplicationSettings()
    copy.density = "compact"
    expect(DEFAULT_APPLICATION_SETTINGS.density).toBe("default")
  })

  it("accepts only a complete exact snapshot with approved values", () => {
    const valid = { ...DEFAULT_APPLICATION_SETTINGS, usedDefaults: true }
    expect(validateApplicationSettings(valid)).toEqual(valid)
  })

  it("rejects malformed, wrong-type, extra, and unsupported values without reflecting them", () => {
    const canary = "sk-test-DO-NOT-REFLECT"
    const invalid = [
      null,
      [],
      "settings",
      {},
      { ...DEFAULT_APPLICATION_SETTINGS, version: 2 },
      { ...DEFAULT_APPLICATION_SETTINGS, themeSlug: canary },
      { ...DEFAULT_APPLICATION_SETTINGS, density: canary },
      { ...DEFAULT_APPLICATION_SETTINGS, forceReducedMotion: "true" },
      { ...DEFAULT_APPLICATION_SETTINGS, usedDefaults: "false" },
      { ...DEFAULT_APPLICATION_SETTINGS, unexpected: canary },
    ]
    const missingVersion: Record<string, unknown> = { ...DEFAULT_APPLICATION_SETTINGS }
    delete missingVersion.version
    invalid.push(missingVersion)

    for (const candidate of invalid) {
      let message = ""
      expect(() => {
        try {
          validateApplicationSettings(candidate)
        } catch (error) {
          message = error instanceof Error ? error.message : String(error)
          throw error
        }
      }).toThrow("Application settings snapshot is invalid")
      expect(message).not.toContain(canary)
    }
  })
})
