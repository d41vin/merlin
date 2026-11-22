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
]

export function parseHexColor(value) {
  if (typeof value !== "string" || !/^#[0-9a-fA-F]{6}$/.test(value)) {
    throw new Error(`Expected #RRGGBB color, received ${String(value)}`)
  }
  return [1, 3, 5].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16) / 255)
}

export function relativeLuminance(value) {
  const [red, green, blue] = parseHexColor(value).map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  )
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

export function contrastRatio(foreground, background) {
  const a = relativeLuminance(foreground)
  const b = relativeLuminance(background)
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

function validatePairs(theme, kind, minimum) {
  const failures = []
  const pairs = kind === "textPairs" ? theme.textPairs : theme.uiPairs
  if (!Array.isArray(pairs) || pairs.length === 0) {
    failures.push(`FAIL ${theme.displayName}: missing ${kind}`)
    return failures
  }
  for (const pair of pairs) {
    const foreground = theme.semantic[pair.foreground]
    for (const surfaceName of pair.surfaces) {
      const background = theme.semantic[surfaceName]
      if (foreground === undefined || background === undefined) {
        failures.push(
          `FAIL ${theme.displayName}: undefined pair ${pair.foreground} on ${surfaceName}`,
        )
        continue
      }
      const ratio = contrastRatio(foreground, background)
      if (ratio + Number.EPSILON < minimum) {
        failures.push(
          `FAIL ${theme.displayName}: ${pair.foreground} on ${surfaceName} = ${ratio.toFixed(3)}:1 (requires ${minimum}:1)`,
        )
      }
    }
  }
  return failures
}

export function validateTheme(theme, supportedContractVersion = 1) {
  const failures = []
  if (!theme.slug || !theme.displayName) failures.push("FAIL: theme identity is missing")
  if (theme.mode !== "light" && theme.mode !== "dark") {
    failures.push(`FAIL ${theme.displayName}: invalid mode ${String(theme.mode)}`)
  }
  if (theme.contractVersion !== supportedContractVersion) {
    failures.push(
      `FAIL ${theme.displayName}: contract ${String(theme.contractVersion)} is unsupported`,
    )
  }
  if (!theme.semantic || !theme.textPairs || !theme.uiPairs) {
    failures.push(`FAIL ${theme.displayName}: semantic or pairing contract is missing`)
    return failures
  }
  for (const token of REQUIRED_SEMANTIC_TOKENS) {
    if (typeof theme.semantic[token] !== "string" || theme.semantic[token].trim() === "") {
      failures.push(`FAIL ${theme.displayName}: missing required token ${token}`)
    }
  }
  failures.push(...validatePairs(theme, "textPairs", 4.5))
  failures.push(...validatePairs(theme, "uiPairs", 3))
  return failures
}
