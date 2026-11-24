import merlinDark from "./merlin-dark.tokens.json" with { type: "json" }
import {
  SUPPORTED_THEME_CONTRACT_VERSION,
  validateThemeManifest,
  type ThemeManifest,
} from "./contract.ts"

export type ThemeDefinition = ThemeManifest
export const DEFAULT_BUNDLED_THEME_SLUG = "merlin-dark"
export { SUPPORTED_THEME_CONTRACT_VERSION }

export function createThemeRegistry(manifests: unknown[]): Map<string, unknown> {
  const registry = new Map<string, unknown>()
  for (const manifest of manifests) {
    if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
      throw new Error("Bundled theme registry contains an invalid manifest")
    }
    const slug = (manifest as Record<string, unknown>).slug
    if (typeof slug !== "string" || slug === "") {
      throw new Error("Bundled theme registry contains an invalid slug")
    }
    if (registry.has(slug)) throw new Error("Bundled theme registry contains a duplicate slug")
    registry.set(slug, manifest)
  }
  return registry
}

const themes = createThemeRegistry([merlinDark])
export const BUNDLED_THEME_SLUGS = [...themes.keys()]

export function validateThemeForApplication(theme: unknown): ThemeManifest {
  const failures = validateThemeManifest(theme, SUPPORTED_THEME_CONTRACT_VERSION)
  if (failures.length > 0) {
    const unsupportedVersion =
      theme !== null &&
      typeof theme === "object" &&
      !Array.isArray(theme) &&
      "contractVersion" in theme &&
      theme.contractVersion !== SUPPORTED_THEME_CONTRACT_VERSION
    if (unsupportedVersion) {
      throw new Error(
        `Unsupported bundled theme contract version; supported version is ${SUPPORTED_THEME_CONTRACT_VERSION}`,
      )
    }
    throw new Error(
      "Bundled theme contract is invalid; run pnpm test:themes for detailed diagnostics",
    )
  }
  return theme as ThemeManifest
}

export function getTheme(slug: string): ThemeManifest {
  const theme = themes.get(slug)
  if (!theme) throw new Error("Bundled theme is unavailable")
  return validateThemeForApplication(theme)
}

export function applyBundledTheme(slug: string, root: HTMLElement = document.documentElement) {
  const theme = getTheme(slug)
  root.dataset.theme = theme.slug
  root.style.colorScheme = theme.mode
  return theme
}
