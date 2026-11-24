import { execFileSync } from "node:child_process"

import { describe, expect, it } from "vitest"

import merlinDark from "../src/themes/merlin-dark.tokens.json" with { type: "json" }
import {
  contrastRatio,
  DENSITY_VALUES,
  relativeLuminance,
  REQUIRED_TEXT_PAIRS,
  REQUIRED_UI_PAIRS,
  resolveOpaqueColor,
  validateDensityValues,
  validateThemeManifest,
} from "../src/themes/contract.ts"
import { describeGeneratedCssDrift, renderDensityCss, renderThemeCss } from "./theme-css.mjs"

function cloneTheme() {
  return structuredClone(merlinDark)
}

describe("WCAG contrast calculations", () => {
  it("matches known luminance, ratios, and symmetry", () => {
    expect(relativeLuminance("#000000")).toBe(0)
    expect(relativeLuminance("#ffffff")).toBe(1)
    expect(contrastRatio("#000000", "#ffffff")).toBe(21)
    expect(contrastRatio("#ffffff", "#000000")).toBe(21)
    expect(contrastRatio("#777777", "#ffffff")).toBeCloseTo(4.478091, 5)
  })

  it("covers 4.5:1 and 3:1 boundaries and rejects malformed colors", () => {
    expect(contrastRatio("#767676", "#ffffff")).toBeGreaterThan(4.5)
    expect(contrastRatio("#777777", "#ffffff")).toBeLessThan(4.5)
    expect(contrastRatio("#5f5f5f", "#000000")).toBeGreaterThan(3)
    expect(contrastRatio("#515151", "#000000")).toBeLessThan(3)
    expect(() => contrastRatio("#fff", "#ffffff")).toThrow(/Expected #RRGGBB/)
    expect(() => contrastRatio("rgba(0, 0, 0, 0.5)", "#ffffff")).toThrow(/Expected #RRGGBB/)
  })
})

describe("strict bundled theme validation", () => {
  it("validates every required and declared Merlin Dark pairing", () => {
    expect(validateThemeManifest(merlinDark)).toEqual([])
    for (const [declaredPairs, requiredPairs] of [
      [merlinDark.textPairs, REQUIRED_TEXT_PAIRS],
      [merlinDark.uiPairs, REQUIRED_UI_PAIRS],
    ]) {
      for (const required of requiredPairs) {
        const declared = declaredPairs.find((pair) => pair.foreground === required.foreground)
        expect(declared).toBeDefined()
        expect(declared.surfaces).toEqual(expect.arrayContaining(required.surfaces))
      }
    }
  })

  it("fails closed for missing and undeclared semantic tokens", () => {
    const incomplete = cloneTheme()
    delete incomplete.semantic["--text-link"]
    const failures = validateThemeManifest(incomplete)
    expect(failures.some((failure) => failure.includes("missing required token --text-link"))).toBe(
      true,
    )

    const extra = cloneTheme()
    extra.semantic["--brand-blue"] = "var(--primitive-blue-300)"
    expect(
      validateThemeManifest(extra).some((failure) => failure.includes("undeclared semantic")),
    ).toBe(true)
  })

  it("rejects malformed manifest identities, missing swatches, and unsupported versions", () => {
    const missingSwatch = cloneTheme()
    delete missingSwatch.swatch
    expect(
      validateThemeManifest(missingSwatch).some((failure) => failure.includes("manifest fields")),
    ).toBe(true)

    const wrongTypes = cloneTheme()
    wrongTypes.slug = { value: "merlin-dark" }
    wrongTypes.displayName = 42
    wrongTypes.mode = "dim"
    const failures = validateThemeManifest(wrongTypes)
    expect(failures.some((failure) => failure.includes("invalid theme slug"))).toBe(true)
    expect(failures.some((failure) => failure.includes("invalid display name"))).toBe(true)
    expect(failures.some((failure) => failure.includes("invalid mode"))).toBe(true)

    const wrongContract = cloneTheme()
    wrongContract.contractVersion = 999
    expect(
      validateThemeManifest(wrongContract).some((failure) => failure.includes("unsupported")),
    ).toBe(true)
  })

  it("rejects empty, duplicate, unregistered, and accent-text pairings", () => {
    const empty = cloneTheme()
    empty.textPairs = [{ foreground: "--text-primary", surfaces: [] }]
    expect(validateThemeManifest(empty).some((failure) => failure.includes("empty surfaces"))).toBe(
      true,
    )

    const duplicate = cloneTheme()
    duplicate.textPairs.push({ foreground: "--on-danger", surfaces: ["--danger"] })
    expect(
      validateThemeManifest(duplicate).some((failure) => failure.includes("duplicate textPairs")),
    ).toBe(true)

    const unknown = cloneTheme()
    unknown.uiPairs.push({ foreground: "--border-strong", surfaces: ["--not-a-surface"] })
    expect(
      validateThemeManifest(unknown).some((failure) => failure.includes("invalid uiPairs pairing")),
    ).toBe(true)

    const accentText = cloneTheme()
    accentText.textPairs.push({ foreground: "--accent", surfaces: ["--bg-canvas"] })
    expect(
      validateThemeManifest(accentText).some((failure) =>
        failure.includes("not a permitted textPairs foreground"),
      ),
    ).toBe(true)
  })

  it("requires coverage independently of whether other declared pairs pass", () => {
    const missing = cloneTheme()
    missing.textPairs = missing.textPairs.filter(
      (pair) => pair.foreground !== "--text-primary" || pair.surfaces.length !== 7,
    )
    missing.textPairs.push({
      foreground: "--text-primary",
      surfaces: [
        "--bg-canvas",
        "--bg-surface-1",
        "--bg-surface-2",
        "--bg-surface-3",
        "--bg-hover",
        "--bg-selected",
      ],
    })
    expect(
      validateThemeManifest(missing).some((failure) =>
        failure.includes("missing required pairing --text-primary on --bg-active"),
      ),
    ).toBe(true)
  })

  it("detects contrast regressions and rejects translucent pair colors", () => {
    const badContrast = cloneTheme()
    badContrast.primitives["--primitive-grey-100"] = "#08090a"
    expect(validateThemeManifest(badContrast).length).toBeGreaterThan(0)

    const translucent = cloneTheme()
    translucent.primitives["--primitive-grey-100"] = "rgba(242, 244, 245, 0.5)"
    const failures = validateThemeManifest(translucent)
    expect(failures.some((failure) => failure.includes("invalid textPairs pairing"))).toBe(true)
  })

  it("enforces direct hue aliases, primitive naming, and swatch identity", () => {
    const directLiteral = cloneTheme()
    directLiteral.semantic["--bg-canvas"] = "#08090a"
    expect(
      validateThemeManifest(directLiteral).some((failure) =>
        failure.includes("--bg-canvas must reference an existing hue primitive directly"),
      ),
    ).toBe(true)

    const genericAccent = cloneTheme()
    genericAccent.primitives["--primitive-accent"] = "#c4622d"
    genericAccent.semantic["--accent"] = "var(--primitive-accent)"
    expect(
      validateThemeManifest(genericAccent).some((failure) =>
        failure.includes("invalid primitive name"),
      ),
    ).toBe(true)

    const wrongSwatch = cloneTheme()
    wrongSwatch.swatch = "#000000"
    expect(
      validateThemeManifest(wrongSwatch).some((failure) => failure.includes("swatch must match")),
    ).toBe(true)
  })

  it("resolves aliases and rejects missing primitive targets", () => {
    expect(resolveOpaqueColor(merlinDark, "--accent")).toBe("#c4622d")
    const missing = cloneTheme()
    delete missing.primitives["--primitive-grey-950"]
    expect(() => resolveOpaqueColor(missing, "--bg-canvas")).toThrow(/opaque hue primitive/)
    expect(validateThemeManifest(missing).length).toBeGreaterThan(0)
  })

  it("accepts the supported quoted font stacks without theme-specific literals", () => {
    const quoted = cloneTheme()
    quoted.semantic["--font-ui"] = "'Inter var', -apple-system, \"Segoe UI\", sans-serif"
    quoted.semantic["--font-mono"] = '"Cascadia \\"Code\\"", Consolas, monospace'
    expect(validateThemeManifest(quoted)).toEqual([])

    const quotedKeywords = cloneTheme()
    quotedKeywords.semantic["--font-ui"] = '"inherit", "default", sans-serif'
    expect(validateThemeManifest(quotedKeywords)).toEqual([])
  })

  it("rejects malformed stacks, controls, delimiters, and CSS-injection-style font values", () => {
    const malformed = [
      '"Unterminated, sans-serif',
      "Inter,, sans-serif",
      '"Inter" trailingjunk, sans-serif',
      "Inter; } body { display: none",
      "Inter\n, sans-serif",
      "Inter\u0000, sans-serif",
      "Inter\\, sans-serif",
      "inherit",
      "inherit, sans-serif",
      "initial, sans-serif",
      "unset, sans-serif",
      "revert, sans-serif",
      "revert-layer, sans-serif",
      "default",
      "inherit Custom Family, sans-serif",
      "",
    ]
    for (const value of malformed) {
      const invalid = cloneTheme()
      invalid.semantic["--font-ui"] = value
      expect(
        validateThemeManifest(invalid).some((failure) => failure.includes("invalid font token")),
      ).toBe(true)
      expect(() => renderThemeCss(invalid)).toThrow(/Cannot render invalid theme CSS/)
    }
  })
})

describe("deterministic CSS generation", () => {
  it("binds selector and color-scheme to the manifest and emits primitive mappings", () => {
    const css = renderThemeCss(merlinDark)
    expect(css).toContain('[data-theme="merlin-dark"]')
    expect(css).toContain("color-scheme: dark;")
    expect(css).toContain("--bg-canvas: var(--primitive-grey-950);")
    expect(css).toContain("--text-link: var(--primitive-blue-300);")
    expect(css).toContain("--accent: var(--primitive-rust-500);")
    expect(renderThemeCss(merlinDark)).toBe(css)
  })

  it("validates all seven expected values independently in both density modes", () => {
    const shared = {
      "--control-height-small": "28px",
      "--panel-padding": "8px",
      "--section-padding": "16px",
      "--table-header-height": "28px",
      "--sidebar-item-height": "28px",
      "--active-indicator-width": "2px",
    }
    expect(DENSITY_VALUES).toEqual({
      default: { "--row-height": "32px", ...shared },
      compact: { "--row-height": "28px", ...shared },
    })
    expect(validateDensityValues(DENSITY_VALUES)).toEqual([])

    const css = renderDensityCss()
    for (const [mode, rowHeight] of [
      ["default", "32px"],
      ["compact", "28px"],
    ]) {
      const block = css.match(new RegExp(`:root\\[data-density="${mode}"\\] \\{[^}]+\\}`))?.[0]
      expect(block).toBeDefined()
      for (const [token, value] of Object.entries({ "--row-height": rowHeight, ...shared })) {
        expect(block).toContain(`${token}: ${value};`)
      }
    }
  })

  it("rejects missing, extra, and invalid density values before generation", () => {
    const missing = structuredClone(DENSITY_VALUES)
    delete missing.compact["--control-height-small"]
    expect(
      validateDensityValues(missing).some((failure) => failure.includes("compact token inventory")),
    ).toBe(true)
    expect(() => renderDensityCss(missing)).toThrow(/Cannot render invalid density CSS/)

    const extra = structuredClone(DENSITY_VALUES)
    extra.default["--future-density"] = "12px"
    expect(
      validateDensityValues(extra).some((failure) => failure.includes("default token inventory")),
    ).toBe(true)
    expect(() => renderDensityCss(extra)).toThrow(/Cannot render invalid density CSS/)

    const invalid = structuredClone(DENSITY_VALUES)
    invalid.compact["--active-indicator-width"] = "var(--primitive-grey-700)"
    expect(
      validateDensityValues(invalid).some((failure) => failure.includes("invalid compact value")),
    ).toBe(true)
    expect(() => renderDensityCss(invalid)).toThrow(/Cannot render invalid density CSS/)
  })

  it("pins LF checkout attributes and diagnoses artificial CRLF working copies exactly", () => {
    const attributes = execFileSync(
      "git",
      ["check-attr", "text", "eol", "--", "src/themes/merlin-dark.css", "src/styles/density.css"],
      { encoding: "utf8" },
    )
    expect(attributes).toMatch(/src\/themes\/merlin-dark\.css: eol: lf/)
    expect(attributes).toMatch(/src\/styles\/density\.css: eol: lf/)
    expect(attributes).not.toMatch(/eol: crlf/)

    for (const expected of [renderThemeCss(merlinDark), renderDensityCss()]) {
      expect(expected).not.toContain("\r")
      const artificialCrlfWorkingCopy = expected.replace(/\n/g, "\r\n")
      expect(artificialCrlfWorkingCopy).not.toBe(expected)
      expect(describeGeneratedCssDrift(artificialCrlfWorkingCopy, expected)).toMatch(
        /requires LF checkout line endings/,
      )
      expect(describeGeneratedCssDrift(expected, expected)).toBeUndefined()
    }
  })
})
