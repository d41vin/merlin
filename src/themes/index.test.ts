import { afterEach, describe, expect, it } from "vitest"

import merlinDark from "./merlin-dark.tokens.json"
import {
  applyBundledTheme,
  BUNDLED_THEME_SLUGS,
  createThemeRegistry,
  getTheme,
  validateThemeForApplication,
} from "./index"

describe("bundled theme registry and application", () => {
  afterEach(() => {
    applyBundledTheme("merlin-dark")
  })

  it("registers exactly Merlin Dark and returns its validated definition", () => {
    expect(BUNDLED_THEME_SLUGS).toEqual(["merlin-dark"])
    expect(getTheme("merlin-dark").displayName).toBe("Merlin Dark")
  })

  it("rejects duplicate or malformed registry entries", () => {
    expect(() => createThemeRegistry([merlinDark, merlinDark])).toThrow(/duplicate slug/)
    expect(() => createThemeRegistry([null])).toThrow(/invalid manifest/)
    expect(() => createThemeRegistry([{ displayName: "Missing slug" }])).toThrow(/invalid slug/)
  })

  it("reports unsupported versions safely before a theme can be used", () => {
    const invalid = structuredClone(merlinDark)
    invalid.contractVersion = 999
    invalid.displayName = "Sensitive manifest content"
    expect(() => validateThemeForApplication(invalid)).toThrow(
      "Unsupported bundled theme contract version; supported version is 1",
    )
    expect(() => validateThemeForApplication(invalid)).not.toThrow(/999|Sensitive manifest content/)
  })

  it("keeps other runtime validation diagnostics stable and content-free", () => {
    const invalid = structuredClone(merlinDark)
    invalid.displayName = "Sensitive manifest content"
    invalid.semantic["--font-ui"] = "Unsafe; } body { display: none"
    expect(() => validateThemeForApplication(invalid)).toThrow(
      "Bundled theme contract is invalid; run pnpm test:themes for detailed diagnostics",
    )
    expect(() => validateThemeForApplication(invalid)).not.toThrow(
      /Sensitive manifest content|Unsafe|display: none/,
    )
  })

  it("applies data-theme and mode synchronously", () => {
    document.documentElement.dataset.theme = "stale-theme"
    document.documentElement.style.colorScheme = "light"
    applyBundledTheme("merlin-dark")
    expect(document.documentElement.dataset.theme).toBe("merlin-dark")
    expect(document.documentElement.style.colorScheme).toBe("dark")
  })

  it("rejects an unknown slug without mutating the current root", () => {
    applyBundledTheme("merlin-dark")
    expect(() => applyBundledTheme("not-bundled")).toThrow("Bundled theme is unavailable")
    expect(document.documentElement.dataset.theme).toBe("merlin-dark")
    expect(document.documentElement.style.colorScheme).toBe("dark")
  })
})
