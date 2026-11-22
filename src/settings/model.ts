export const APPLICATION_SETTINGS_VERSION = 1 as const

export type ThemeSlug = "merlin-dark"
export type Density = "default" | "compact"

export interface ApplicationSettingsSnapshot {
  version: typeof APPLICATION_SETTINGS_VERSION
  themeSlug: ThemeSlug
  density: Density
  forceReducedMotion: boolean
  usedDefaults: boolean
}

export const DEFAULT_APPLICATION_SETTINGS: ApplicationSettingsSnapshot = {
  version: APPLICATION_SETTINGS_VERSION,
  themeSlug: "merlin-dark",
  density: "default",
  forceReducedMotion: false,
  usedDefaults: false,
}

export function defaultApplicationSettings(): ApplicationSettingsSnapshot {
  return { ...DEFAULT_APPLICATION_SETTINGS }
}

export function validateApplicationSettings(value: unknown): ApplicationSettingsSnapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Application settings snapshot is invalid")
  }

  const candidate = value as Record<string, unknown>
  if (
    Object.keys(candidate).sort().join(",") !==
    "density,forceReducedMotion,themeSlug,usedDefaults,version"
  ) {
    throw new Error("Application settings snapshot is invalid")
  }
  if (
    candidate.version !== APPLICATION_SETTINGS_VERSION ||
    candidate.themeSlug !== "merlin-dark" ||
    (candidate.density !== "default" && candidate.density !== "compact") ||
    typeof candidate.forceReducedMotion !== "boolean" ||
    typeof candidate.usedDefaults !== "boolean"
  ) {
    throw new Error("Application settings snapshot is invalid")
  }

  return {
    version: APPLICATION_SETTINGS_VERSION,
    themeSlug: candidate.themeSlug,
    density: candidate.density,
    forceReducedMotion: candidate.forceReducedMotion,
    usedDefaults: candidate.usedDefaults,
  }
}
