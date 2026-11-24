import { renameSync, unlinkSync, writeFileSync } from "node:fs"

import {
  discoverThemeManifestPaths,
  expectedThemeCssPath,
  readThemeManifest,
  renderThemeCss,
} from "./theme-css.mjs"

const manifestPaths = discoverThemeManifestPaths()
if (manifestPaths.length === 0) throw new Error("No bundled theme manifests were found")

for (const manifestPath of manifestPaths) {
  const manifest = readThemeManifest(manifestPath)
  const cssPath = expectedThemeCssPath(manifest)
  const temporaryPath = `${cssPath}.tmp`
  try {
    writeFileSync(temporaryPath, renderThemeCss(manifest), "utf8")
    renameSync(temporaryPath, cssPath)
  } finally {
    try {
      unlinkSync(temporaryPath)
    } catch {
      // A successful rename leaves no temporary file; a failed write leaves no source change.
    }
  }
  console.log(`Generated ${cssPath}`)
}
