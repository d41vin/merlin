import { describe, expect, it } from "vitest"

import {
  auditProductionSources,
  findTokenUsageViolations,
  isProductionSourcePath,
} from "./validate-token-usage.mjs"

describe("production token source scope", () => {
  it("includes production CSS/TSX and excludes themes, tests, fixtures, and artifacts", () => {
    expect(isProductionSourcePath("src/App.tsx")).toBe(true)
    expect(isProductionSourcePath("src/styles/components.css")).toBe(true)
    expect(isProductionSourcePath("src/themes/merlin-dark.css")).toBe(false)
    expect(isProductionSourcePath("src/themes/contract.ts")).toBe(false)
    expect(isProductionSourcePath("src/components/ui/button.test.tsx")).toBe(false)
    expect(isProductionSourcePath("src/markdown/fixtures.ts")).toBe(false)
    expect(isProductionSourcePath("src/markdown/__fixtures__/hostile.tsx")).toBe(false)
    expect(isProductionSourcePath("src/test/setup.ts")).toBe(false)
    expect(isProductionSourcePath("dist/assets/index.css")).toBe(false)
  })
})

describe("token usage positive examples", () => {
  it("accepts registered semantic/density tokens and non-color keywords", () => {
    const css = `
      .merlin-control {
        color: var(--text-primary);
        background: var(--bg-surface-2);
        border: var(--border-width) solid var(--border-strong);
        border-radius: var(--radius-control);
        font-family: var(--font-ui);
      }
      .merlin-row { min-height: var(--row-height); padding: var(--panel-padding); }
      .merlin-icon { color: currentColor; background: transparent; }
      .merlin-density { --row-height: 28px; }
      .merlin-document { font-family: inherit; }
    `
    expect(findTokenUsageViolations(css, "src/styles/example.css")).toEqual([])

    const tsx = `
      <div
        className="hover:bg-[var(--bg-surface-1)] md:text-[var(--text-primary)] redesign"
        style={{ fontFamily: "var(--font-ui)", background: "transparent", color: "currentColor" }}
      />
    `
    expect(findTokenUsageViolations(tsx, "src/components/example.tsx")).toEqual([])
  })

  it("does not treat prose, quoted URLs, or non-color custom properties as colors", () => {
    const source = `
      const copy = "red is a color name in prose"
      const style = { backgroundImage: 'url("red.png")' }
      .document { background: url("rebeccapurple.png"); content: "blue"; color: currentColor; }
      .ordinary { --brand-name: rebeccapurple; }
    `
    const failures = findTokenUsageViolations(source, "src/components/example.tsx")
    expect(failures.filter((failure) => failure.includes("raw named"))).toEqual([])
  })
})

describe("token usage negative examples", () => {
  const cases = [
    ["color: var(--primitive-rust-500);", "primitive reference"],
    ["background: #c4622d;", "raw hex color"],
    ["background: rgba(0, 0, 0, 0.65);", "raw functional color"],
    ["color: red;", "raw named CSS color"],
    ["color: rebeccapurple;", "raw named CSS color"],
    ["color:red!important;", "raw named CSS color"],
    ["border: 1px solid rebeccapurple;", "raw named CSS color"],
    ["box-shadow: 0 0 2px red;", "raw named CSS color"],
    ["background: linear-gradient(red, blue);", "raw named CSS color"],
    ['style={{ color: "#c4622d" }}', "raw hex color"],
    ['style={{ backgroundColor: "red" }}', "raw named inline color"],
    ['style={{ background: "red" }}', "raw named inline color"],
    ['style={{ border: "1px solid rebeccapurple" }}', "raw named inline color"],
    ['style={{ fontFamily: "Segoe UI" }}', "literal font family"],
    ['<path fill="rebeccapurple" />', "raw named SVG color"],
    ['className="bg-[#c4622d]"', "raw hex color"],
    ['className="text-[rgb(196_98_45)]"', "raw functional color"],
    ['className="text-[red]"', "arbitrary named Tailwind color"],
    ['className="hover:bg-[rebeccapurple]"', "arbitrary named Tailwind color"],
    ['className="shadow-[red]"', "arbitrary named Tailwind color"],
    ['className="border-t-[rebeccapurple]"', "arbitrary named Tailwind color"],
    ['className="text-red-500"', "raw named Tailwind palette color"],
    ['className="bg-slate-900"', "raw named Tailwind palette color"],
    ['className="hover:bg-red-500"', "raw named Tailwind palette color"],
    ['className="md:text-slate-900"', "raw named Tailwind palette color"],
    ['className="focus-visible:border-red-500"', "raw named Tailwind palette color"],
    ['className="hover:shadow-red-500"', "raw named Tailwind palette color"],
    ['className="focus:ring-offset-slate-900"', "raw named Tailwind palette color"],
    ['className="border-t-red-500"', "raw named Tailwind palette color"],
    ['className="md:border-l-slate-900"', "raw named Tailwind palette color"],
    ['className="bg-[var(--primitive-rust-500)]"', "primitive reference"],
    ["color: var(--brand-blue);", "unregistered variable"],
    ["min-height: var(--row-heigth);", "unregistered variable"],
    ["--brand-blue: var(--text-primary);", "undeclared component token"],
    ['font-family: "Segoe UI", sans-serif;', "literal font family"],
  ]

  for (const [source, expected] of cases) {
    it(`rejects ${expected}: ${source}`, () => {
      expect(findTokenUsageViolations(source, "src/components/example.tsx").join("\n")).toContain(
        expected,
      )
    })
  }
})

describe("token diagnostic locations", () => {
  it("reports the offending capture line and column identically for LF and CRLF", () => {
    const lf = `.one {\n  color: var(--brand-blue);\n  font-family: "Segoe UI";\n  border: 1px solid rebeccapurple;\n  color:red!important;\n}\n`
    for (const source of [lf, lf.replace(/\n/g, "\r\n")]) {
      const failures = findTokenUsageViolations(source, "src/styles/example.css")
      expect(failures.some((failure) => failure.includes(":2:14:"))).toBe(true)
      expect(failures.some((failure) => failure.includes(":3:16:"))).toBe(true)
      expect(failures.some((failure) => failure.includes(":4:21:"))).toBe(true)
      expect(failures.some((failure) => failure.includes(":5:9:"))).toBe(true)
      expect(
        failures.every((failure) => /^FAIL src\/styles\/example\.css:\d+:\d+:/.test(failure)),
      ).toBe(true)
    }
  })
})

describe("actual production source integration", () => {
  it("finds no current primitive, raw-color, or unregistered-token bypasses", () => {
    expect(auditProductionSources()).toEqual([])
  })
})
