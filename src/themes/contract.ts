export const SUPPORTED_THEME_CONTRACT_VERSION = 1

export interface ContrastPair {
  foreground: string
  surfaces: string[]
}

export interface ThemeManifest {
  slug: string
  displayName: string
  mode: "light" | "dark"
  swatch: string
  contractVersion: number
  primitives: Record<string, string>
  semantic: Record<string, string>
  textPairs: ContrastPair[]
  uiPairs: ContrastPair[]
}

export const REQUIRED_SEMANTIC_TOKENS = [
  "--bg-canvas",
  "--bg-surface-1",
  "--bg-surface-2",
  "--bg-surface-3",
  "--bg-hover",
  "--bg-selected",
  "--bg-active",
  "--border-hairline",
  "--border-strong",
  "--border-focus",
  "--border-width",
  "--text-primary",
  "--text-secondary",
  "--text-tertiary",
  "--text-disabled",
  "--text-link",
  "--text-inverse",
  "--accent",
  "--accent-hover",
  "--on-accent",
  "--success",
  "--warning",
  "--danger",
  "--on-danger",
  "--selection-background",
  "--selection-foreground",
  "--overlay-backdrop",
  "--shadow-popover",
  "--radius-control",
  "--radius-panel",
  "--font-ui",
  "--font-mono",
  "--tracking-metadata",
  "--tracking-label",
  "--tracking-control",
  "--tracking-body",
  "--tracking-section",
  "--tracking-page-title",
] as const

export const DENSITY_MODES = ["default", "compact"] as const
export const REQUIRED_DENSITY_TOKENS = [
  "--row-height",
  "--control-height-small",
  "--panel-padding",
  "--section-padding",
  "--table-header-height",
  "--sidebar-item-height",
  "--active-indicator-width",
] as const

export const DENSITY_VALUES = {
  default: {
    "--row-height": "32px",
    "--control-height-small": "28px",
    "--panel-padding": "8px",
    "--section-padding": "16px",
    "--table-header-height": "28px",
    "--sidebar-item-height": "28px",
    "--active-indicator-width": "2px",
  },
  compact: {
    "--row-height": "28px",
    "--control-height-small": "28px",
    "--panel-padding": "8px",
    "--section-padding": "16px",
    "--table-header-height": "28px",
    "--sidebar-item-height": "28px",
    "--active-indicator-width": "2px",
  },
} as const

const TEXT_PAIR_DEFINITIONS: ContrastPair[] = [
  {
    foreground: "--text-primary",
    surfaces: [
      "--bg-canvas",
      "--bg-surface-1",
      "--bg-surface-2",
      "--bg-surface-3",
      "--bg-hover",
      "--bg-selected",
      "--bg-active",
    ],
  },
  {
    foreground: "--text-secondary",
    surfaces: ["--bg-canvas", "--bg-surface-1", "--bg-surface-2", "--bg-surface-3"],
  },
  {
    foreground: "--text-tertiary",
    surfaces: ["--bg-canvas", "--bg-surface-1", "--bg-surface-2", "--bg-surface-3"],
  },
  {
    foreground: "--text-disabled",
    surfaces: ["--bg-canvas", "--bg-surface-1", "--bg-surface-2", "--bg-surface-3"],
  },
  {
    foreground: "--text-link",
    surfaces: ["--bg-canvas", "--bg-surface-1", "--bg-surface-2", "--bg-surface-3"],
  },
  { foreground: "--on-accent", surfaces: ["--accent", "--accent-hover"] },
  { foreground: "--on-danger", surfaces: ["--danger"] },
  { foreground: "--selection-foreground", surfaces: ["--selection-background"] },
  ...["--success", "--warning", "--danger"].map((foreground) => ({
    foreground,
    surfaces: ["--bg-canvas", "--bg-surface-1", "--bg-surface-2", "--bg-surface-3"],
  })),
]

const UI_PAIR_DEFINITIONS: ContrastPair[] = [
  {
    foreground: "--accent",
    surfaces: [
      "--bg-canvas",
      "--bg-surface-1",
      "--bg-surface-2",
      "--bg-surface-3",
      "--bg-selected",
    ],
  },
  {
    foreground: "--accent-hover",
    surfaces: ["--bg-canvas", "--bg-surface-1", "--bg-surface-2", "--bg-surface-3"],
  },
  {
    foreground: "--border-focus",
    surfaces: [
      "--bg-canvas",
      "--bg-surface-1",
      "--bg-surface-2",
      "--bg-surface-3",
      "--bg-hover",
      "--bg-selected",
      "--bg-active",
    ],
  },
  {
    foreground: "--border-strong",
    surfaces: [
      "--bg-canvas",
      "--bg-surface-1",
      "--bg-surface-2",
      "--bg-surface-3",
      "--bg-hover",
      "--bg-selected",
      "--bg-active",
    ],
  },
  ...["--success", "--warning", "--danger"].map((foreground) => ({
    foreground,
    surfaces: ["--bg-canvas", "--bg-surface-1", "--bg-surface-2", "--bg-surface-3"],
  })),
]

export const REQUIRED_TEXT_PAIRS = TEXT_PAIR_DEFINITIONS
export const REQUIRED_UI_PAIRS = UI_PAIR_DEFINITIONS

const TEXT_FOREGROUND_TOKENS = new Set([
  "--text-primary",
  "--text-secondary",
  "--text-tertiary",
  "--text-disabled",
  "--text-link",
  "--text-inverse",
  "--on-accent",
  "--on-danger",
  "--selection-foreground",
  "--success",
  "--warning",
  "--danger",
])
const UI_FOREGROUND_TOKENS = new Set([
  "--accent",
  "--accent-hover",
  "--border-strong",
  "--border-focus",
  "--success",
  "--warning",
  "--danger",
])
const DIRECT_COLOR_TOKENS = new Set([
  ...REQUIRED_SEMANTIC_TOKENS.filter(
    (token) =>
      token.startsWith("--bg-") ||
      token.startsWith("--text-") ||
      token === "--accent" ||
      token === "--accent-hover" ||
      token === "--on-accent" ||
      token === "--success" ||
      token === "--warning" ||
      token === "--danger" ||
      token === "--on-danger" ||
      token === "--border-hairline" ||
      token === "--border-strong" ||
      token === "--border-focus" ||
      token === "--selection-background" ||
      token === "--selection-foreground" ||
      token === "--overlay-backdrop",
  ),
])
const LENGTH_TOKENS = new Set(["--border-width", "--radius-control", "--radius-panel"])
const TRACKING_TOKENS = new Set(
  REQUIRED_SEMANTIC_TOKENS.filter((token) => token.startsWith("--tracking-")),
)
const FONT_TOKENS = new Set(["--font-ui", "--font-mono"])
const EXPECTED_MANIFEST_KEYS = [
  "contractVersion",
  "displayName",
  "mode",
  "primitives",
  "semantic",
  "slug",
  "swatch",
  "textPairs",
  "uiPairs",
]
const PRIMITIVE_NAME = /^--primitive-(?!accent(?:-|$))[a-z][a-z0-9]*(?:-[a-z0-9]+)+$/
const RGBA_COLOR =
  /^rgba\(\s*(?:0|25[0-5]|2[0-4]\d|1?\d?\d)\s*,\s*(?:0|25[0-5]|2[0-4]\d|1?\d?\d)\s*,\s*(?:0|25[0-5]|2[0-4]\d|1?\d?\d)\s*,\s*(?:0(?:\.\d+)?|1(?:\.0+)?)\s*\)$/
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/
const DIRECT_ALIAS = /^var\((--primitive-[a-z0-9-]+)\)$/
const LENGTH = /^(?:0|(?:\d+(?:\.\d+)?|\.\d+)px)$/
const TRACKING = /^-?(?:\d+(?:\.\d+)?|\.\d+)em$/

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  return Object.keys(value).sort().join(",") === [...expected].sort().join(",")
}

function themeName(theme: unknown): string {
  if (!isRecord(theme)) return "unknown theme"
  if (typeof theme.displayName === "string" && theme.displayName.trim()) return theme.displayName
  if (typeof theme.slug === "string" && theme.slug.trim()) return theme.slug
  return "unknown theme"
}

function aliasTarget(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined
  return value.match(DIRECT_ALIAS)?.[1]
}

export function validateDensityValues(value: unknown): string[] {
  if (!isRecord(value)) return ["FAIL density: modes must be an object"]
  const failures: string[] = []
  if (!exactKeys(value, DENSITY_MODES)) {
    failures.push("FAIL density: exactly default and compact modes are required")
  }
  for (const mode of DENSITY_MODES) {
    const declarations = value[mode]
    if (!isRecord(declarations)) {
      failures.push(`FAIL density: ${mode} declarations must be an object`)
      continue
    }
    if (!exactKeys(declarations, REQUIRED_DENSITY_TOKENS)) {
      failures.push(`FAIL density: ${mode} token inventory is incomplete or contains extra tokens`)
    }
    for (const token of REQUIRED_DENSITY_TOKENS) {
      if (typeof declarations[token] !== "string" || !LENGTH.test(declarations[token])) {
        failures.push(`FAIL density: invalid ${mode} value for ${token}`)
      }
    }
  }
  return failures
}

function validFontStack(value: unknown): value is string {
  if (typeof value !== "string" || value.trim() === "" || /[;{}\u0000-\u001f\u007f]/.test(value)) {
    return false
  }

  const families: string[] = []
  let family = ""
  let quote = ""
  let escaped = false
  for (const character of value) {
    if (escaped) {
      family += character
      escaped = false
      continue
    }
    if (quote && character === "\\") {
      family += character
      escaped = true
      continue
    }
    if (quote) {
      family += character
      if (character === quote) quote = ""
      continue
    }
    if (character === '"' || character === "'") {
      quote = character
      family += character
    } else if (character === ",") {
      families.push(family.trim())
      family = ""
    } else {
      if (character === "\\") return false
      family += character
    }
  }
  if (quote || escaped) return false
  families.push(family.trim())

  return families.every((part) => {
    if (part === "") return false
    const doubleQuoted = /^"(?:[^"\\]|\\.)+"$/.test(part)
    const singleQuoted = /^'(?:[^'\\]|\\.)+'$/.test(part)
    const unquoted = /^-?[a-z_][a-z0-9_-]*(?:\s+-?[a-z_][a-z0-9_-]*)*$/i.test(part)
    const reservedUnquotedWord =
      /(?:^|\s)(?:inherit|initial|unset|revert|revert-layer|default)(?=\s|$)/i.test(part)
    return doubleQuoted || singleQuoted || (unquoted && !reservedUnquotedWord)
  })
}

export function parseHexColor(value: string): number[] {
  if (typeof value !== "string" || !HEX_COLOR.test(value)) {
    throw new Error(`Expected #RRGGBB color, received ${String(value)}`)
  }
  return [1, 3, 5].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16) / 255)
}

export function relativeLuminance(value: string): number {
  const [red, green, blue] = parseHexColor(value).map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  )
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

export function contrastRatio(foreground: string, background: string): number {
  const a = relativeLuminance(foreground)
  const b = relativeLuminance(background)
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

export function resolveOpaqueColor(theme: ThemeManifest, token: string): string {
  const primitive = aliasTarget(theme.semantic[token])
  const value = primitive ? theme.primitives[primitive] : undefined
  if (!primitive || typeof value !== "string" || !HEX_COLOR.test(value)) {
    throw new Error(`${token} does not resolve to an opaque hue primitive`)
  }
  return value
}

function requiredPairKeys(pairs: ContrastPair[]): Set<string> {
  const keys = new Set<string>()
  for (const pair of pairs) {
    for (const surface of pair.surfaces) keys.add(`${pair.foreground}|${surface}`)
  }
  return keys
}

const REQUIRED_TEXT_PAIR_KEYS = requiredPairKeys(REQUIRED_TEXT_PAIRS)
const REQUIRED_UI_PAIR_KEYS = requiredPairKeys(REQUIRED_UI_PAIRS)

function validatePairs(
  theme: ThemeManifest,
  kind: "textPairs" | "uiPairs",
  minimum: number,
  requiredKeys: Set<string>,
): string[] {
  const name = themeName(theme)
  const failures: string[] = []
  const pairs = theme[kind]
  if (!Array.isArray(pairs) || pairs.length === 0) return [`FAIL ${name}: missing ${kind}`]

  const declared = new Set<string>()
  const allowedForeground = kind === "textPairs" ? TEXT_FOREGROUND_TOKENS : UI_FOREGROUND_TOKENS
  for (const pair of pairs as unknown[]) {
    if (!isRecord(pair) || !exactKeys(pair, ["foreground", "surfaces"])) {
      failures.push(`FAIL ${name}: malformed ${kind} entry`)
      continue
    }
    if (
      typeof pair.foreground !== "string" ||
      !Array.isArray(pair.surfaces) ||
      pair.surfaces.length === 0 ||
      pair.surfaces.some((surface) => typeof surface !== "string")
    ) {
      failures.push(`FAIL ${name}: malformed ${kind} entry or empty surfaces`)
      continue
    }
    if (!allowedForeground.has(pair.foreground)) {
      failures.push(`FAIL ${name}: ${pair.foreground} is not a permitted ${kind} foreground`)
    }
    const localSurfaces = new Set<string>()
    for (const surface of pair.surfaces as string[]) {
      const key = `${pair.foreground}|${surface}`
      if (declared.has(key) || localSurfaces.has(surface)) {
        failures.push(`FAIL ${name}: duplicate ${kind} pairing ${pair.foreground} on ${surface}`)
      }
      declared.add(key)
      localSurfaces.add(surface)
      try {
        const ratio = contrastRatio(
          resolveOpaqueColor(theme, pair.foreground),
          resolveOpaqueColor(theme, surface),
        )
        if (ratio + 1e-9 < minimum) {
          failures.push(
            `FAIL ${name}: ${pair.foreground} on ${surface} = ${ratio.toFixed(3)}:1 (requires ${minimum}:1)`,
          )
        }
      } catch (error) {
        failures.push(
          `FAIL ${name}: invalid ${kind} pairing ${pair.foreground} on ${surface}: ${
            error instanceof Error ? error.message : "unresolved color"
          }`,
        )
      }
    }
  }
  for (const key of requiredKeys) {
    if (!declared.has(key)) {
      const [foreground, surface] = key.split("|")
      failures.push(`FAIL ${name}: missing required pairing ${foreground} on ${surface}`)
    }
  }
  return failures
}

export function validateThemeManifest(
  value: unknown,
  supportedContractVersion = SUPPORTED_THEME_CONTRACT_VERSION,
): string[] {
  const failures: string[] = []
  const name = themeName(value)
  if (!isRecord(value)) return [`FAIL ${name}: theme manifest must be an object`]
  if (!exactKeys(value, EXPECTED_MANIFEST_KEYS)) {
    failures.push(`FAIL ${name}: manifest fields are incomplete or contain unsupported fields`)
  }
  if (typeof value.slug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.slug)) {
    failures.push(`FAIL ${name}: invalid theme slug`)
  }
  if (typeof value.displayName !== "string" || value.displayName.trim() === "") {
    failures.push(`FAIL ${name}: invalid display name`)
  }
  if (value.mode !== "light" && value.mode !== "dark") failures.push(`FAIL ${name}: invalid mode`)
  if (typeof value.swatch !== "string" || !HEX_COLOR.test(value.swatch)) {
    failures.push(`FAIL ${name}: invalid swatch`)
  }
  if (value.contractVersion !== supportedContractVersion) {
    failures.push(`FAIL ${name}: contract ${String(value.contractVersion)} is unsupported`)
  }
  if (!isRecord(value.primitives)) failures.push(`FAIL ${name}: primitives must be an object`)
  if (!isRecord(value.semantic)) failures.push(`FAIL ${name}: semantic tokens must be an object`)
  if (!Array.isArray(value.textPairs)) failures.push(`FAIL ${name}: textPairs must be an array`)
  if (!Array.isArray(value.uiPairs)) failures.push(`FAIL ${name}: uiPairs must be an array`)
  if (!isRecord(value.primitives) || !isRecord(value.semantic)) return failures

  for (const [token, primitiveValue] of Object.entries(value.primitives)) {
    if (!PRIMITIVE_NAME.test(token)) failures.push(`FAIL ${name}: invalid primitive name ${token}`)
    if (
      typeof primitiveValue !== "string" ||
      (!HEX_COLOR.test(primitiveValue) && !RGBA_COLOR.test(primitiveValue))
    ) {
      failures.push(`FAIL ${name}: invalid primitive color ${token}`)
    }
  }

  const semantic = value.semantic
  for (const token of REQUIRED_SEMANTIC_TOKENS) {
    if (typeof semantic[token] !== "string" || semantic[token].trim() === "") {
      failures.push(`FAIL ${name}: missing required token ${token}`)
    }
  }
  for (const token of Object.keys(semantic)) {
    if (!REQUIRED_SEMANTIC_TOKENS.includes(token as (typeof REQUIRED_SEMANTIC_TOKENS)[number])) {
      failures.push(`FAIL ${name}: undeclared semantic token ${token}`)
    }
  }

  for (const token of DIRECT_COLOR_TOKENS) {
    const primitive = aliasTarget(semantic[token])
    if (!primitive || typeof value.primitives[primitive] !== "string") {
      failures.push(`FAIL ${name}: ${token} must reference an existing hue primitive directly`)
    }
  }
  for (const token of LENGTH_TOKENS) {
    if (typeof semantic[token] !== "string" || !LENGTH.test(semantic[token])) {
      failures.push(`FAIL ${name}: invalid length token ${token}`)
    }
  }
  for (const token of TRACKING_TOKENS) {
    if (typeof semantic[token] !== "string" || !TRACKING.test(semantic[token])) {
      failures.push(`FAIL ${name}: invalid tracking token ${token}`)
    }
  }
  for (const token of FONT_TOKENS) {
    if (!validFontStack(semantic[token])) {
      failures.push(`FAIL ${name}: invalid font token ${token}`)
    }
  }
  const shadow = semantic["--shadow-popover"]
  if (shadow !== "none") {
    const parts = typeof shadow === "string" ? shadow.split(/\s+/) : []
    const primitive = parts.length === 4 ? aliasTarget(parts[3]) : undefined
    if (
      parts.length !== 4 ||
      parts.slice(0, 3).some((part) => !/^-?(?:0|(?:\d+(?:\.\d+)?|\.\d+)px)$/.test(part)) ||
      !primitive ||
      typeof value.primitives[primitive] !== "string"
    ) {
      failures.push(
        `FAIL ${name}: --shadow-popover must be none or one shadow with a primitive color`,
      )
    }
  }

  const theme = value as unknown as ThemeManifest
  if (typeof value.swatch === "string" && HEX_COLOR.test(value.swatch)) {
    try {
      if (resolveOpaqueColor(theme, "--accent").toLowerCase() !== value.swatch.toLowerCase()) {
        failures.push(`FAIL ${name}: swatch must match the resolved accent`)
      }
    } catch {
      failures.push(`FAIL ${name}: swatch cannot be matched to an invalid accent`)
    }
  }
  if (Array.isArray(value.textPairs)) {
    failures.push(...validatePairs(theme, "textPairs", 4.5, REQUIRED_TEXT_PAIR_KEYS))
  }
  if (Array.isArray(value.uiPairs)) {
    failures.push(...validatePairs(theme, "uiPairs", 3, REQUIRED_UI_PAIR_KEYS))
  }
  return failures
}
