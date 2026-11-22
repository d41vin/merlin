import merlinDark from "./merlin-dark.tokens.json"

export const SUPPORTED_THEME_CONTRACT_VERSION = 1

export interface ThemeDefinition {
  slug: string
  displayName: string
  mode: "light" | "dark"
  swatch: string
  contractVersion: number
  semantic: Record<string, string>
}

const themes = new Map<string, ThemeDefinition>([[merlinDark.slug, merlinDark as ThemeDefinition]])

export function getTheme(slug: string): ThemeDefinition {
  const theme = themes.get(slug)
  if (!theme) {
    throw new Error(`Unsupported bundled theme: ${slug}`)
  }
  if (theme.contractVersion !== SUPPORTED_THEME_CONTRACT_VERSION) {
    throw new Error(`Unsupported theme contract: ${theme.contractVersion}`)
  }
  if (theme.mode !== "light" && theme.mode !== "dark") {
    throw new Error(`Invalid theme mode: ${String(theme.mode)}`)
  }
  return theme
}

export function applyBundledTheme(slug: string, root: HTMLElement = document.documentElement) {
  const theme = getTheme(slug)
  root.dataset.theme = theme.slug
  root.style.colorScheme = theme.mode
  return theme
}
