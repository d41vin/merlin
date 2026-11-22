import { readFileSync } from "node:fs"

import merlinDark from "../src/themes/merlin-dark.tokens.json" with { type: "json" }
import { validateTheme } from "./contrast-lib.mjs"

const failures = validateTheme(merlinDark)

const css = readFileSync(new URL("../src/themes/merlin-dark.css", import.meta.url), "utf8")
const declarations = new Map(
  [...css.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)].map((match) => [match[1], match[2].trim()]),
)
for (const [groupName, values] of [
  ["primitives", merlinDark.primitives],
  ["semantic tokens", merlinDark.semantic],
]) {
  for (const [token, value] of Object.entries(values)) {
    if (declarations.get(token) !== value) {
      failures.push(
        `FAIL ${merlinDark.displayName}: CSS/JSON drift for ${token} (${groupName}); expected ${value}, found ${declarations.get(token) ?? "missing"}`,
      )
    }
  }
}

if (failures.length > 0) {
  for (const failure of failures) console.error(failure)
  console.error(`Theme contrast validation failed: ${failures.length} violation(s)`)
  process.exitCode = 1
} else {
  const pairCount =
    merlinDark.textPairs.reduce((count, pair) => count + pair.surfaces.length, 0) +
    merlinDark.uiPairs.reduce((count, pair) => count + pair.surfaces.length, 0)
  console.log(`PASS ${merlinDark.displayName}: ${pairCount} declared contrast pairings validated`)
}
