import { describe, expect, it } from "vitest"

import merlinDark from "../src/themes/merlin-dark.tokens.json" with { type: "json" }
import { contrastRatio, relativeLuminance, validateTheme } from "./contrast-lib.mjs"

describe("WCAG contrast calculations", () => {
  it("matches known luminance and ratios", () => {
    expect(relativeLuminance("#000000")).toBe(0)
    expect(relativeLuminance("#ffffff")).toBe(1)
    expect(contrastRatio("#000000", "#ffffff")).toBe(21)
    expect(contrastRatio("#777777", "#ffffff")).toBeCloseTo(4.478091, 5)
  })

  it("handles the 4.5:1 boundary and rejects malformed colors", () => {
    expect(contrastRatio("#767676", "#ffffff")).toBeGreaterThan(4.5)
    expect(contrastRatio("#777777", "#ffffff")).toBeLessThan(4.5)
    expect(() => contrastRatio("#fff", "#ffffff")).toThrow(/Expected #RRGGBB/)
  })

  it("validates the bundled theme and fails closed on missing tokens", () => {
    expect(validateTheme(merlinDark)).toEqual([])
    const incomplete = structuredClone(merlinDark)
    delete incomplete.semantic["--text-link"]
    expect(validateTheme(incomplete).some((failure) => failure.includes("--text-link"))).toBe(true)
  })

  it("rejects unsupported contracts and contrast violations", () => {
    const wrongContract = structuredClone(merlinDark)
    wrongContract.contractVersion = 999
    expect(validateTheme(wrongContract).some((failure) => failure.includes("unsupported"))).toBe(
      true,
    )

    const badContrast = structuredClone(merlinDark)
    badContrast.semantic["--text-primary"] = "#08090a"
    expect(validateTheme(badContrast).length).toBeGreaterThan(0)
  })
})
