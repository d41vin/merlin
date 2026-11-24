import { readdirSync, readFileSync } from "node:fs"
import { basename, join, relative, resolve } from "node:path"

import { REQUIRED_DENSITY_TOKENS, REQUIRED_SEMANTIC_TOKENS } from "../src/themes/contract.ts"

const ALLOWED_TOKENS = new Set([...REQUIRED_SEMANTIC_TOKENS, ...REQUIRED_DENSITY_TOKENS])
const SOURCE_ROOT = "src/"
const RAW_HEX = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})(?![0-9a-fA-F])/g
const RAW_COLOR_FUNCTION = /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\s*\(/gi
const PALETTE_UTILITY =
  /(?:^|["'\s:])((?:bg|text|border(?:-[trblxyse])?|ring|ring-offset|outline|fill|stroke|shadow|accent|caret|decoration|divide|placeholder|from|via|to)-(?:black|white|slate|gray|grey|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)(?:-\d{2,3})?)\b/dg
const NAMED_COLOR =
  "(?:aliceblue|antiquewhite|aqua|aquamarine|azure|beige|bisque|black|blanchedalmond|blue|blueviolet|brown|burlywood|cadetblue|chartreuse|chocolate|coral|cornflowerblue|cornsilk|crimson|cyan|darkblue|darkcyan|darkgoldenrod|darkgray|darkgreen|darkgrey|darkkhaki|darkmagenta|darkolivegreen|darkorange|darkorchid|darkred|darksalmon|darkseagreen|darkslateblue|darkslategray|darkslategrey|darkturquoise|darkviolet|deeppink|deepskyblue|dimgray|dimgrey|dodgerblue|firebrick|floralwhite|forestgreen|fuchsia|gainsboro|ghostwhite|gold|goldenrod|gray|green|greenyellow|grey|honeydew|hotpink|indianred|indigo|ivory|khaki|lavender|lavenderblush|lawngreen|lemonchiffon|lightblue|lightcoral|lightcyan|lightgoldenrodyellow|lightgray|lightgreen|lightgrey|lightpink|lightsalmon|lightseagreen|lightskyblue|lightslategray|lightslategrey|lightsteelblue|lightyellow|lime|limegreen|linen|magenta|maroon|mediumaquamarine|mediumblue|mediumorchid|mediumpurple|mediumseagreen|mediumslateblue|mediumspringgreen|mediumturquoise|mediumvioletred|midnightblue|mintcream|mistyrose|moccasin|navajowhite|navy|oldlace|olive|olivedrab|orange|orangered|orchid|palegoldenrod|palegreen|paleturquoise|palevioletred|papayawhip|peachpuff|peru|pink|plum|powderblue|purple|rebeccapurple|red|rosybrown|royalblue|saddlebrown|salmon|sandybrown|seagreen|seashell|sienna|silver|skyblue|slateblue|slategray|slategrey|snow|springgreen|steelblue|tan|teal|thistle|tomato|turquoise|violet|wheat|white|whitesmoke|yellow|yellowgreen)"
const NAMED_COLOR_TOKEN = new RegExp("(?:^|[\\s,(])(" + NAMED_COLOR + ")(?=$|[\\s,)!])", "gimd")
const ARBITRARY_NAMED_UTILITY = new RegExp(
  "(?:bg|text|border(?:-[trblxyse])?|ring|ring-offset|outline|fill|stroke|shadow)-\\[" +
    NAMED_COLOR +
    "\\]",
  "gi",
)
const COLOR_DECLARATION =
  /(?:^|[;{])\s*(?:color|background(?:-color)?|border(?:-[\w-]+)?(?:-color)?|outline(?:-color)?|box-shadow|text-shadow|text-decoration(?:-color)?|fill|stroke|caret-color|accent-color|column-rule(?:-color)?)\s*:\s*([^;}]+)/dgim
const INLINE_STYLE_VALUE =
  /\b(color|background|backgroundColor|border|borderColor|outline|outlineColor|boxShadow|textShadow|textDecorationColor|fill|stroke|caretColor|accentColor|columnRuleColor|fontFamily)\s*:\s*(["'])([^"']*)\2/dgim
const SVG_COLOR_ATTRIBUTE = /\b(?:fill|stroke|color|stop-color)\s*=\s*(["'])([^"']*)\1/dgim
const FONT_FAMILY_DECLARATION = /(?:^|[;{])\s*font-family\s*:\s*([^;}]+)/dgim

function normalize(path) {
  return path.replaceAll("\\", "/")
}

export function isProductionSourcePath(path) {
  const normalized = `${normalize(path).replace(/^\.\//, "")}`
  if (!/^src\/.*\.(?:css|ts|tsx)$/.test(normalized)) return false
  if (normalized.startsWith("src/themes/") || normalized.startsWith("src/test/")) return false
  if (/\/(?:__fixtures__|fixtures)(?:\/|$)/.test(normalized)) return false
  if (/\.(?:test|spec)\.[^.]+$/.test(normalized)) return false
  if (normalized === "src/markdown/fixtures.ts") return false
  return normalized.startsWith(SOURCE_ROOT)
}

export function collectProductionSourceFiles(root = process.cwd()) {
  const sourceRoot = join(root, "src")
  const files = []
  function visit(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const fullPath = join(directory, entry.name)
      const projectPath = normalize(relative(root, fullPath))
      if (entry.isDirectory()) {
        if (projectPath === "src/themes" || projectPath === "src/test") continue
        if (entry.name === "__fixtures__" || entry.name === "fixtures") continue
        visit(fullPath)
      } else if (entry.isFile() && isProductionSourcePath(projectPath)) {
        files.push(fullPath)
      }
    }
  }
  visit(sourceRoot)
  return files.sort()
}

export function findTokenUsageViolations(source, filePath = "source") {
  const failures = []
  const path = normalize(filePath)
  function add(rule, index, detail) {
    const precedingLines = source.slice(0, index).split(/\r\n|\r|\n/)
    const line = precedingLines.length
    const column = precedingLines.at(-1).length + 1
    failures.push(`FAIL ${path}:${line}:${column}: ${rule} (${detail})`)
  }
  function captureIndex(match, capture = 1) {
    return match.indices?.[capture]?.[0] ?? match.index
  }
  function addNamedColors(rule, value, valueOffset) {
    const withoutUrls = value.replace(/\burl\(\s*(?:"[^"]*"|'[^']*'|[^)]*)\)/gi, (url) =>
      " ".repeat(url.length),
    )
    for (const match of withoutUrls.matchAll(NAMED_COLOR_TOKEN)) {
      add(rule, valueOffset + captureIndex(match), match[1])
    }
  }

  for (const match of source.matchAll(/--primitive-[a-z0-9-]+/gi)) {
    add("primitive reference outside the theme layer", match.index, match[0])
  }
  for (const match of source.matchAll(/var\(\s*(--[a-z0-9-]+)/dgi)) {
    if (!ALLOWED_TOKENS.has(match[1])) {
      add("unregistered variable", captureIndex(match), match[1])
    }
  }
  for (const match of source.matchAll(/(?:^|[;{])\s*(--[a-z0-9-]+)\s*:/dgim)) {
    if (!ALLOWED_TOKENS.has(match[1])) {
      add("undeclared component token", captureIndex(match), match[1])
    }
  }
  for (const match of source.matchAll(RAW_HEX)) add("raw hex color", match.index, match[0])
  for (const match of source.matchAll(RAW_COLOR_FUNCTION)) {
    add("raw functional color", match.index, match[0])
  }
  for (const match of source.matchAll(PALETTE_UTILITY)) {
    add("raw named Tailwind palette color", captureIndex(match), match[1])
  }
  for (const match of source.matchAll(ARBITRARY_NAMED_UTILITY)) {
    add("arbitrary named Tailwind color", match.index, match[0])
  }
  for (const match of source.matchAll(COLOR_DECLARATION)) {
    addNamedColors("raw named CSS color", match[1], captureIndex(match))
  }
  for (const match of source.matchAll(INLINE_STYLE_VALUE)) {
    const property = match[1]
    const valueOffset = captureIndex(match, 3)
    if (property === "fontFamily") {
      const value = match[3].trim()
      if (value !== "inherit" && !/^var\(--font-(?:ui|mono)\)$/.test(value)) {
        add("literal font family outside theme typography roles", valueOffset, value)
      }
    } else {
      addNamedColors("raw named inline color", match[3], valueOffset)
    }
  }
  for (const match of source.matchAll(SVG_COLOR_ATTRIBUTE)) {
    addNamedColors("raw named SVG color", match[2], captureIndex(match, 2))
  }
  for (const match of source.matchAll(FONT_FAMILY_DECLARATION)) {
    const value = match[1].trim()
    if (value !== "inherit" && !/^var\(--font-(?:ui|mono)\)$/.test(value)) {
      add("literal font family outside theme typography roles", captureIndex(match), value)
    }
  }
  return failures
}

export function auditProductionSources(root = process.cwd()) {
  const failures = []
  for (const filePath of collectProductionSourceFiles(root)) {
    const projectPath = normalize(relative(root, filePath))
    failures.push(...findTokenUsageViolations(readFileSync(filePath, "utf8"), projectPath))
  }
  return failures
}

if (basename(process.argv[1] ?? "") === "validate-token-usage.mjs") {
  const failures = auditProductionSources(resolve(process.cwd()))
  if (failures.length > 0) {
    for (const failure of failures) console.error(failure)
    console.error(`Token usage validation failed: ${failures.length} violation(s)`)
    process.exitCode = 1
  } else {
    console.log(
      `PASS: ${collectProductionSourceFiles().length} production source files consume registered tokens`,
    )
  }
}
