import { invoke } from "@tauri-apps/api/core"

import {
  defaultApplicationSettings,
  validateApplicationSettings,
  type ApplicationSettingsSnapshot,
  type Density,
  type ThemeSlug,
} from "./model"

export interface ApplicationSettingsStore {
  readonly kind: "sqlite" | "browser-unavailable"
  load(): Promise<ApplicationSettingsSnapshot>
  setTheme(theme: ThemeSlug): Promise<ApplicationSettingsSnapshot>
  setDensity(density: Density): Promise<ApplicationSettingsSnapshot>
  setReducedMotion(forceReducedMotion: boolean): Promise<ApplicationSettingsSnapshot>
}

function nativePersistenceUnavailable(): Error {
  return new Error("Native settings persistence is unavailable outside Tauri")
}

export function createApplicationSettingsStore(): ApplicationSettingsStore {
  if (typeof window !== "undefined" && window.__TAURI_INTERNALS__) {
    return {
      kind: "sqlite",
      async load() {
        return validateApplicationSettings(await invoke<unknown>("settings_get"))
      },
      async setTheme(theme) {
        return validateApplicationSettings(await invoke<unknown>("settings_set_theme", { theme }))
      },
      async setDensity(density) {
        return validateApplicationSettings(
          await invoke<unknown>("settings_set_density", { density }),
        )
      },
      async setReducedMotion(forceReducedMotion) {
        return validateApplicationSettings(
          await invoke<unknown>("settings_set_reduce_motion", { forceReducedMotion }),
        )
      },
    }
  }

  return {
    kind: "browser-unavailable",
    async load() {
      return defaultApplicationSettings()
    },
    async setTheme() {
      throw nativePersistenceUnavailable()
    },
    async setDensity() {
      throw nativePersistenceUnavailable()
    },
    async setReducedMotion() {
      throw nativePersistenceUnavailable()
    },
  }
}
