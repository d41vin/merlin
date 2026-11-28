import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs"
import path from "node:path"

const repoRoot = process.cwd()
const productionDirectory = path.join(repoRoot, "dist")
const harnessDirectory = path.join(repoRoot, "dist-harness")
const productionExecutable = path.join(repoRoot, "src-tauri", "target", "release", "merlin.exe")
const harnessExecutable = path.join(
  repoRoot,
  "src-tauri",
  "target",
  "test-harness",
  "release",
  "merlin-test-harness.exe",
)
const evidenceDirectory = path.join(repoRoot, "test-results", "build-isolation")
const evidencePath = path.join(evidenceDirectory, "evidence.json")
const harnessMarker = "merlin-proof-harness-entry-v1"
const controlsMarker = "merlin-controls-harness-entry-v1"
const forbiddenProductionPaths = [/tests[\\/]harness/i, /proofs\.html$/i, /controls\.html$/i]

function walk(directory) {
  const files = []
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...walk(absolutePath))
    else if (entry.isFile()) files.push(absolutePath)
  }
  return files
}

function relativeFiles(directory) {
  return walk(directory)
    .map((file) => path.relative(directory, file).replaceAll("\\", "/"))
    .sort()
}

function containsBytes(file, value) {
  return readFileSync(file).includes(Buffer.from(value, "utf8"))
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function requireDirectory(directory, label) {
  if (!statSync(directory, { throwIfNoEntry: false })?.isDirectory()) {
    throw new Error(`${label} directory is missing: ${directory}`)
  }
  return relativeFiles(directory)
}

const productionFiles = requireDirectory(productionDirectory, "Production build")
const harnessFiles = requireDirectory(harnessDirectory, "Harness build")

const productionHtml = productionFiles.filter((file) => file.endsWith(".html"))
assert(
  productionHtml.length === 1 && productionHtml[0] === "index.html",
  `Production build must contain exactly index.html; found ${productionHtml.join(", ") || "none"}`,
)
assert(productionFiles.includes("index.html"), "Production index.html is missing")

const forbiddenProductionFiles = productionFiles.filter((file) =>
  forbiddenProductionPaths.some((pattern) => pattern.test(file)),
)
assert(
  forbiddenProductionFiles.length === 0,
  `Production build contains harness-only paths: ${forbiddenProductionFiles.join(", ")}`,
)

const productionMarkerHits = productionFiles.filter(
  (file) =>
    containsBytes(path.join(productionDirectory, file), harnessMarker) ||
    containsBytes(path.join(productionDirectory, file), controlsMarker),
)
assert(
  productionMarkerHits.length === 0,
  `Production build contains the harness marker in: ${productionMarkerHits.join(", ")}`,
)

const productionHtmlWithHarnessPaths = productionFiles
  .filter((file) => file.endsWith(".html"))
  .filter((file) =>
    /tests[\\/]harness|proofs\.html|controls\.html/i.test(
      readFileSync(path.join(productionDirectory, file), "utf8"),
    ),
  )
assert(
  productionHtmlWithHarnessPaths.length === 0,
  `Production HTML references harness pages: ${productionHtmlWithHarnessPaths.join(", ")}`,
)

assert(
  harnessFiles.includes("index.html"),
  "Harness build is missing the normal application entry (index.html)",
)
assert(
  harnessFiles.includes("tests/harness/proofs.html"),
  "Harness build is missing tests/harness/proofs.html",
)
assert(
  harnessFiles.includes("tests/harness/controls.html"),
  "Harness build is missing tests/harness/controls.html",
)

const harnessMarkerHits = harnessFiles.filter((file) =>
  containsBytes(path.join(harnessDirectory, file), harnessMarker),
)
assert(harnessMarkerHits.length > 0, `Harness build is missing the ${harnessMarker} marker`)
const controlsMarkerHits = harnessFiles.filter((file) =>
  containsBytes(path.join(harnessDirectory, file), controlsMarker),
)
assert(controlsMarkerHits.length > 0, `Harness build is missing the ${controlsMarker} marker`)

const proofPage = readFileSync(path.join(harnessDirectory, "tests/harness/proofs.html"), "utf8")
assert(
  /<script[^>]+src="[^"]+"/i.test(proofPage),
  "Harness proof page does not reference an entry script",
)
const controlsPage = readFileSync(
  path.join(harnessDirectory, "tests/harness/controls.html"),
  "utf8",
)
assert(
  /<script[^>]+src="[^"]+"/i.test(controlsPage),
  "Harness controls page does not reference an entry script",
)

const productionOnlyFiles = productionFiles.filter((file) => !harnessFiles.includes(file))
const harnessOnlyFiles = harnessFiles.filter((file) => !productionFiles.includes(file))
assert(
  productionOnlyFiles.length > 0 || harnessOnlyFiles.length > 0,
  "Production and harness builds contain the same file set; isolation is not demonstrated",
)

function containsExecutableMarker(file, value) {
  const bytes = readFileSync(file)
  return bytes.includes(Buffer.from(value, "utf8")) || bytes.includes(Buffer.from(value, "utf16le"))
}

const productionSourceFiles = walk(path.join(repoRoot, "src"))
const productionSourceHarnessReferences = productionSourceFiles
  .filter((file) => {
    const contents = readFileSync(file)
    return (
      contents.includes(Buffer.from("tests/harness", "utf8")) ||
      contents.includes(Buffer.from(harnessMarker, "utf8")) ||
      contents.includes(Buffer.from(controlsMarker, "utf8"))
    )
  })
  .map((file) => path.relative(repoRoot, file).replaceAll("\\", "/"))
assert(
  productionSourceHarnessReferences.length === 0,
  `Production source references harness paths or markers: ${productionSourceHarnessReferences.join(
    ", ",
  )}`,
)

let executableEvidence = null
if (existsSync(productionExecutable) && existsSync(harnessExecutable)) {
  const productionProofPage = containsExecutableMarker(
    productionExecutable,
    "tests/harness/proofs.html",
  )
  const productionControlsPage = containsExecutableMarker(
    productionExecutable,
    "tests/harness/controls.html",
  )
  const productionHarnessDist = containsExecutableMarker(productionExecutable, "dist-harness")
  const productionHarnessMarker =
    containsExecutableMarker(productionExecutable, harnessMarker) ||
    containsExecutableMarker(productionExecutable, controlsMarker)
  assert(
    !productionProofPage &&
      !productionControlsPage &&
      !productionHarnessDist &&
      !productionHarnessMarker,
    "Production executable contains harness-only page, output, or marker evidence",
  )

  const harnessProofPage = containsExecutableMarker(harnessExecutable, "tests/harness/proofs.html")
  const harnessControlsPage = containsExecutableMarker(
    harnessExecutable,
    "tests/harness/controls.html",
  )
  const harnessDist = containsExecutableMarker(harnessExecutable, "dist-harness")
  assert(
    harnessProofPage && harnessControlsPage && harnessDist,
    "Optimized harness executable does not contain the harness-only pages and output evidence",
  )

  executableEvidence = {
    productionExecutable,
    productionProofPage,
    productionControlsPage,
    productionHarnessDist,
    productionHarnessMarker,
    harnessExecutable,
    harnessProofPage,
    harnessControlsPage,
    harnessDist,
  }
} else {
  console.log("SKIP: executable marker checks (build both executables to enable them)")
}

mkdirSync(evidenceDirectory, { recursive: true })
const evidence = {
  generatedAt: new Date().toISOString(),
  production: {
    directory: productionDirectory,
    files: productionFiles,
    htmlFiles: productionHtml,
    harnessMarkerHits: productionMarkerHits,
    harnessPathHits: forbiddenProductionFiles,
  },
  harness: {
    directory: harnessDirectory,
    files: harnessFiles,
    proofPagePresent: harnessFiles.includes("tests/harness/proofs.html"),
    controlsPagePresent: harnessFiles.includes("tests/harness/controls.html"),
    harnessMarkerHits,
    controlsMarkerHits,
  },
  isolation: {
    productionOnlyFiles,
    harnessOnlyFiles,
    productionIsSingleEntry: productionHtml.length === 1 && productionHtml[0] === "index.html",
    productionSourceHarnessReferences,
  },
  executables: executableEvidence,
}
writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`)

console.log("PASS: production build contains exactly one HTML entry (index.html)")
console.log("PASS: production build contains no harness page, harness path, or harness marker")
console.log("PASS: production source contains no harness path or harness marker")
console.log("PASS: optimized harness contains index.html, proofs.html, and controls.html")
console.log(
  `PASS: harness markers found in ${harnessMarkerHits.length} proof and ${controlsMarkerHits.length} controls asset(s)`,
)
if (executableEvidence) {
  console.log("PASS: production executable contains no harness page, output, or marker")
  console.log("PASS: optimized harness executable contains the harness proof and controls pages")
}
console.log(`Evidence: ${evidencePath}`)
