import { readFileSync } from "node:fs"
import { join } from "node:path"

import { BUNDLED_THEME_SLUGS, DEFAULT_BUNDLED_THEME_SLUG } from "../src/themes/index.ts"
import { validateThemeManifest } from "../src/themes/contract.ts"
import {
  PROJECT_ROOT,
  describeGeneratedCssDrift,
  discoverThemeManifestPaths,
  expectedThemeCssPath,
  readThemeManifest,
  renderDensityCss,
  renderThemeCss,
} from "./theme-css.mjs"

const failures = []
const validatedThemes = []
const discoveredSlugs = new Set()
const manifestPaths = discoverThemeManifestPaths()
if (manifestPaths.length === 0) failures.push("FAIL: no bundled theme manifests were found")

for (const manifestPath of manifestPaths) {
  let manifest
  try {
    manifest = readThemeManifest(manifestPath)
  } catch (error) {
    failures.push(
      `FAIL ${manifestPath}: unreadable manifest (${error instanceof Error ? error.message : "parse error"})`,
    )
    continue
  }
  const slug = manifest && typeof manifest.slug === "string" ? manifest.slug : manifestPath
  if (discoveredSlugs.has(slug)) failures.push(`FAIL ${slug}: duplicate discovered theme slug`)
  discoveredSlugs.add(slug)
  const manifestFailures = validateThemeManifest(manifest)
  failures.push(...manifestFailures)
  if (manifestFailures.length > 0) continue

  const cssPath = expectedThemeCssPath(manifest)
  let actualCss
  try {
    actualCss = readFileSync(cssPath, "utf8")
  } catch {
    failures.push(`FAIL ${manifest.displayName}: missing generated stylesheet ${cssPath}`)
    continue
  }
  const themeDrift = describeGeneratedCssDrift(actualCss, renderThemeCss(manifest))
  if (themeDrift) {
    failures.push(
      `FAIL ${manifest.displayName}: generated CSS drift in ${manifest.slug}.css (${themeDrift}); run pnpm generate:themes`,
    )
    continue
  }
  validatedThemes.push(manifest)
}

const registeredSlugs = [...BUNDLED_THEME_SLUGS].sort()
const manifestSlugs = [...discoveredSlugs].sort()
if (registeredSlugs.join(",") !== manifestSlugs.join(",")) {
  failures.push(
    `FAIL: runtime/discovered theme registry mismatch (runtime: ${registeredSlugs.join(",")}; manifests: ${manifestSlugs.join(",")})`,
  )
}

const densityPath = join(PROJECT_ROOT, "src", "styles", "density.css")
try {
  const densityDrift = describeGeneratedCssDrift(
    readFileSync(densityPath, "utf8"),
    renderDensityCss(),
  )
  if (densityDrift) {
    failures.push(`FAIL: density.css drift (${densityDrift})`)
  }
} catch {
  failures.push(`FAIL: missing or invalid density contract stylesheet ${densityPath}`)
}

const htmlPath = join(PROJECT_ROOT, "index.html")
try {
  const html = readFileSync(htmlPath, "utf8")
  const htmlTag = html.match(/<html\b[^>]*>/)?.[0] ?? ""
  const theme = htmlTag.match(/\bdata-theme="([^"]*)"/)?.[1]
  const density = htmlTag.match(/\bdata-density="([^"]*)"/)?.[1]
  const colorScheme = html.match(/<meta\b[^>]*\bname="color-scheme"[^>]*>/)?.[0]
  const content = colorScheme?.match(/\bcontent="([^"]*)"/)?.[1]
  if (theme !== DEFAULT_BUNDLED_THEME_SLUG) {
    failures.push("FAIL: index.html must provide the default bundled theme before rendering")
  }
  if (density !== "default")
    failures.push("FAIL: index.html must provide default density before rendering")
  if (content !== "dark")
    failures.push("FAIL: index.html must provide the initial dark color-scheme")
} catch {
  failures.push(`FAIL: missing application HTML entry ${htmlPath}`)
}

if (failures.length > 0) {
  for (const failure of failures) console.error(failure)
  console.error(`Theme validation failed: ${failures.length} violation(s)`)
  process.exitCode = 1
} else {
  for (const theme of validatedThemes) {
    const pairCount =
      theme.textPairs.reduce((count, pair) => count + pair.surfaces.length, 0) +
      theme.uiPairs.reduce((count, pair) => count + pair.surfaces.length, 0)
    console.log(
      `PASS ${theme.displayName}: ${pairCount} required/declared contrast pairings validated`,
    )
  }
  console.log(
    `PASS: ${validatedThemes.length} bundled theme(s), generated CSS, density, registry, and startup markers validated`,
  )
}
