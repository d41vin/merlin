import { describe, expect, it } from "vitest"

import { classifyMarkdown, MARKDOWN_FIXTURES, requiresSourceFallback } from "./fixtures"
import { probeMilkdown } from "./milkdown"

describe("Markdown fixture classification", () => {
  it("classifies the documented source constructs and fallback policy", () => {
    for (const fixture of MARKDOWN_FIXTURES) {
      expect(classifyMarkdown(fixture.source), fixture.id).toEqual(fixture.features)
      expect(requiresSourceFallback(fixture.source), fixture.id).toBe(
        fixture.requiresSourceFallback,
      )
    }
  })

  it("recognizes CRLF and MDX without evaluating either", () => {
    expect(classifyMarkdown("---\r\ntitle: test\r\n---\r\n\r\nBody\r\n")).toEqual([
      "frontmatter",
      "crlf",
    ])
    expect(classifyMarkdown("import X from 'x'\n\n<X value={nativeOperation()} />\n")).toEqual([
      "html",
      "mdx",
    ])
  })
})

describe("Milkdown preservation proof", () => {
  it("keeps an exact canonical CommonMark document in the real Milkdown editor", async () => {
    const fixture = MARKDOWN_FIXTURES.find((candidate) => candidate.id === "canonical")
    expect(fixture).toBeDefined()
    const result = await probeMilkdown(fixture!.source)
    expect(result.milkdownAttempted).toBe(true)
    expect(result.serialized).toBe(fixture!.source)
    expect(result.mode).toBe("milkdown")
    expect(result.preserved).toBe(true)
  }, 30_000)

  it("preserves every fixture and falls back rather than accepting lossy output", async () => {
    for (const fixture of MARKDOWN_FIXTURES) {
      const result = await probeMilkdown(fixture.source)
      expect(result.source, fixture.id).toBe(fixture.source)
      expect(result.preserved, fixture.id).toBe(true)
      if (fixture.requiresSourceFallback) {
        expect(result.mode, fixture.id).toBe("source")
        expect(result.milkdownAttempted, fixture.id).toBe(false)
      } else {
        expect(result.milkdownAttempted, fixture.id).toBe(true)
        if (result.mode === "milkdown") {
          expect(result.serialized, fixture.id).toBe(fixture.source)
        } else {
          expect(result.serialized, fixture.id).not.toBe(fixture.source)
        }
      }
    }
  }, 60_000)
})
