import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Page } from "@playwright/test"

import { getFixture, MARKDOWN_FIXTURES } from "../../src/markdown/fixtures"

async function layout(page: Page) {
  return JSON.parse((await page.getByTestId("layout-json").textContent()) ?? "{}") as {
    panels: { id: string; size: number; restoreSize: number; collapsed: boolean }[]
  }
}

async function waitForProofs(page: Page) {
  await expect(page.locator(".merlin-fixture-row[data-result='pass']")).toHaveCount(
    MARKDOWN_FIXTURES.length,
    { timeout: 90_000 },
  )
}

test("pointer and keyboard panel behavior, semantic rendering, and accessibility", async ({
  page,
}) => {
  const consoleErrors: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text())
  })
  await page.addInitScript(() => {
    window.localStorage.clear()
  })
  await page.goto("/")
  await waitForProofs(page)
  await expect(
    page.getByRole("heading", { name: "Merlin Phase 0 technical preflight" }),
  ).toBeVisible()
  await expect(page.getByTestId("layout-status")).toHaveText("Browser-only interaction proof")

  const firstHandle = page.getByRole("separator", { name: "Resize Docs and Todos" })
  await expect(firstHandle).toHaveAttribute("tabindex", "0")
  const bounds = await firstHandle.boundingBox()
  expect(bounds).not.toBeNull()
  const initial = (await layout(page)).panels[0]!.size
  await page.mouse.move(bounds!.x + bounds!.width / 2, bounds!.y + bounds!.height / 2)
  await page.mouse.down()
  await page.mouse.move(bounds!.x + bounds!.width / 2 + 90, bounds!.y + bounds!.height / 2, {
    steps: 10,
  })
  await page.mouse.up()
  await expect.poll(async () => (await layout(page)).panels[0]!.size).not.toBe(initial)

  const afterPointer = (await layout(page)).panels[0]!.size
  await firstHandle.focus()
  await expect(firstHandle).toBeFocused()
  await page.keyboard.press("ArrowRight")
  await expect.poll(async () => (await layout(page)).panels[0]!.size).not.toBe(afterPointer)

  await page.getByRole("button", { name: "Collapse Docs" }).click()
  await expect(page.getByTestId("panel-docs")).toHaveAttribute("data-collapsed")
  await expect(page.getByTestId("panel-docs")).toHaveAttribute("inert")
  expect(
    await page
      .getByTestId("panel-docs")
      .evaluate((panel) => panel.contains(document.activeElement)),
  ).toBe(false)
  expect((await layout(page)).panels[0]!.size).toBe(0)
  expect((await layout(page)).panels[0]!.restoreSize).toBeGreaterThan(0)
  await expect(page.getByRole("button", { name: "Focus sentinel Docs" })).toBeHidden()
  await firstHandle.focus()
  await page.keyboard.press("Enter")
  await expect(page.getByTestId("panel-docs")).not.toHaveAttribute("data-collapsed")
  expect((await layout(page)).panels[0]!.size).toBeGreaterThan(0)
  await expect(page.getByRole("button", { name: "Focus sentinel Docs" })).toBeVisible()

  await page.getByRole("button", { name: "Reset panel layout" }).click()
  await expect
    .poll(async () => (await layout(page)).panels.map((panel) => panel.size))
    .toEqual([25, 25, 25, 25])
  expect(await page.evaluate(() => window.localStorage.length)).toBe(0)
  expect(
    await page
      .locator(".merlin-surface")
      .first()
      .evaluate((element) => {
        const style = getComputedStyle(element)
        return {
          declared: style.getPropertyValue("--border-width").trim(),
          renderedWidth: style.borderTopWidth,
          color: style.borderTopColor,
        }
      }),
  ).toMatchObject({ declared: "0.5px", renderedWidth: "1px" })

  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze()
  expect(accessibility.violations).toEqual([])
  expect(consoleErrors).toEqual([])
})

test("Merlin Dark hairline rendering remains visible across device pixel ratios", async ({
  browser,
}) => {
  for (const scale of [1, 1.25, 1.5, 2]) {
    const context = await browser.newContext({
      viewport: { width: 1100, height: 760 },
      deviceScaleFactor: scale,
      reducedMotion: "reduce",
    })
    const page = await context.newPage()
    try {
      await page.goto("http://127.0.0.1:5173/")
      await expect(page.locator(".merlin-surface").first()).toBeVisible()
      const result = await page
        .locator(".merlin-surface")
        .first()
        .evaluate((element) => {
          const style = getComputedStyle(element)
          const width = Number.parseFloat(style.borderTopWidth)
          return {
            declared: style.getPropertyValue("--border-width").trim(),
            devicePixelRatio: window.devicePixelRatio,
            width,
            devicePixels: width * window.devicePixelRatio,
            color: style.borderTopColor,
          }
        })
      expect(Number.parseFloat(result.declared)).toBe(0.5)
      expect(result.declared.endsWith("px")).toBe(true)
      expect(result.devicePixelRatio).toBe(scale)
      expect(result.devicePixels).toBeGreaterThanOrEqual(0.5)
      expect(result.width).toBeGreaterThanOrEqual(0.5)
      expect(result.width).toBeLessThanOrEqual(1)
      expect(result.color).not.toBe("rgba(0, 0, 0, 0)")
      test.info().annotations.push({
        type: `device scale ${scale}`,
        description: JSON.stringify(result),
      })
    } finally {
      await context.close()
    }
  }
})

test("Milkdown source fallback and hostile document security boundary", async ({ page }) => {
  await page.addInitScript(() => {
    ;(window as Window & { __MERLIN_DOCUMENT_EXECUTED__?: boolean }).__MERLIN_DOCUMENT_EXECUTED__ =
      false
  })
  const remoteRequests: string[] = []
  page.on("request", (request) => {
    if (/^https:\/\/example\.com/.test(request.url())) remoteRequests.push(request.url())
  })
  await page.goto("/")
  await waitForProofs(page)

  await expect(page.locator("[data-fixture='canonical'][data-mode='milkdown']")).toHaveCount(1)
  await expect(
    page.getByTestId("milkdown-editor-host").locator("[contenteditable='true']"),
  ).toBeVisible()

  await page.locator("#markdown-fixture").selectOption("hostile-html")
  await expect(page.getByTestId("markdown-source")).toBeVisible()
  const preview = page.locator("[data-render-boundary='untrusted-document']")
  await expect(
    preview.locator("script,iframe,object,embed,svg,form,button,[style],[onclick],[onerror]"),
  ).toHaveCount(0)
  expect(
    await page.evaluate(
      () =>
        (window as Window & { __MERLIN_DOCUMENT_EXECUTED__?: boolean })
          .__MERLIN_DOCUMENT_EXECUTED__,
    ),
  ).toBe(false)

  await page.locator("#markdown-fixture").selectOption("mdx")
  const mdx = page.locator("pre[data-mdx-mode='inert-source']")
  await expect(mdx).toBeVisible()
  expect(await mdx.textContent()).toBe(getFixture("mdx").source)
  await expect(page.getByTestId("markdown-source")).toHaveValue(getFixture("mdx").source)

  await page.locator("#markdown-fixture").selectOption("links-images")
  const external = preview.locator("a[data-url-kind='external']")
  await expect(external).toHaveAttribute("href", "https://example.com/docs")
  await external.click()
  await expect(page.getByTestId("external-link-status")).toContainText(
    "Explicit click validated: https://example.com/docs",
  )
  await expect(preview.locator("a[href^='javascript'], img")).toHaveCount(0)
  expect(remoteRequests).toEqual([])

  await page.locator("#markdown-fixture").selectOption("mermaid")
  await expect(preview.locator("code[data-mermaid='inert']")).toContainText("flowchart TD")
  await expect(preview.locator("svg")).toHaveCount(0)

  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze()
  expect(accessibility.violations).toEqual([])
  expect(await page.evaluate(() => window.localStorage.length)).toBe(0)
})
