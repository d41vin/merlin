import { readdirSync, readFileSync } from "node:fs"
import { basename, join } from "node:path"

import {
  DENSITY_MODES,
  DENSITY_VALUES,
  REQUIRED_DENSITY_TOKENS,
  validateDensityValues,
  validateThemeManifest,
} from "../src/themes/contract.ts"

export const PROJECT_ROOT = process.cwd()
export const THEME_DIRECTORY = join(PROJECT_ROOT, "src", "themes")

export function discoverThemeManifestPaths(directory = THEME_DIRECTORY) {
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".tokens.json"))
    .map((entry) => join(directory, entry.name))
    .sort()
}

export function readThemeManifest(path) {
  return JSON.parse(readFileSync(path, "utf8"))
}

export function renderThemeCss(manifest, generatedComment = true) {
  const failures = validateThemeManifest(manifest)
  if (failures.length > 0) {
    throw new Error(`Cannot render invalid theme CSS:\n${failures.join("\n")}`)
  }
  const lines = []
  if (generatedComment) {
    lines.push(
      `/* Generated from ${basename(`${manifest.slug}.tokens.json`)}; do not edit directly. */`,
    )
  }
  lines.push(`[data-theme="${manifest.slug}"] {`, `  color-scheme: ${manifest.mode};`, "")
  for (const [token, value] of Object.entries(manifest.primitives)) {
    lines.push(`  ${token}: ${value};`)
  }
  lines.push("")
  for (const [token, value] of Object.entries(manifest.semantic)) {
    lines.push(`  ${token}: ${value};`)
  }
  lines.push("}", "")
  return lines.join("\n")
}

export function describeGeneratedCssDrift(actual, expected) {
  if (actual === expected) return undefined
  if (actual.replace(/\r\n?/g, "\n") === expected) {
    return "working-copy line endings differ; generated CSS requires LF checkout line endings"
  }
  return "generated content differs"
}

export function expectedThemeCssPath(manifest, directory = THEME_DIRECTORY) {
  return join(directory, `${manifest.slug}.css`)
}

export function renderDensityCss(values = DENSITY_VALUES) {
  const failures = validateDensityValues(values)
  if (failures.length > 0) {
    throw new Error(`Cannot render invalid density CSS:\n${failures.join("\n")}`)
  }
  const blocks = []
  for (const density of DENSITY_MODES) {
    const declarations = values[density]
    const lines = [`:root[data-density="${density}"] {`]
    for (const token of REQUIRED_DENSITY_TOKENS) lines.push(`  ${token}: ${declarations[token]};`)
    lines.push("}")
    blocks.push(lines.join("\n"))
  }
  return `${blocks.join("\n\n")}\n`
}
