import { applyBundledTheme } from "@/themes"

import { validateApplicationSettings, type ApplicationSettingsSnapshot } from "./model"

export function applyApplicationSettings(
  value: unknown,
  root: HTMLElement = document.documentElement,
): ApplicationSettingsSnapshot {
  const settings = validateApplicationSettings(value)
  applyBundledTheme(settings.themeSlug, root)
  root.dataset.density = settings.density
  if (settings.forceReducedMotion) {
    root.dataset.forceReducedMotion = "true"
  } else {
    delete root.dataset.forceReducedMotion
  }
  return settings
}
