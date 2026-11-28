import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Locator, type Page } from "@playwright/test"

import { getFixture, MARKDOWN_FIXTURES } from "../../src/markdown/fixtures"
import { PROJECTS_UNAVAILABLE_DESCRIPTION } from "../../src/projects/copy"
import { contrastRatio } from "../../src/themes/contract"
import { CONTROLS_HARNESS_PATH, PROOF_HARNESS_PATH } from "../support/harness"

async function computedThemeStyle(locator: Locator, pseudo?: string) {
  return locator.evaluate((element, pseudoElement) => {
    const style = getComputedStyle(element, pseudoElement)
    return {
      color: style.color,
      backgroundColor: style.backgroundColor,
      borderTopColor: style.borderTopColor,
      borderTopWidth: style.borderTopWidth,
      borderLeftColor: style.borderLeftColor,
      borderLeftWidth: style.borderLeftWidth,
      outlineColor: style.outlineColor,
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      outlineOffset: style.outlineOffset,
      minHeight: style.minHeight,
      opacity: style.opacity,
      colorScheme: style.colorScheme,
      fontFamily: style.fontFamily,
    }
  }, pseudo)
}

function cssColorToHex(color: string) {
  const channels = color.match(/^rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)(?:,\s*1)?\s*\)$/)
  if (!channels) throw new Error(`Expected an opaque computed rgb() color, received ${color}`)
  return `#${channels
    .slice(1)
    .map((channel) => Number(channel).toString(16).padStart(2, "0"))
    .join("")}`
}

async function adjacentBackground(locator: Locator) {
  return locator.evaluate((element) => {
    let ancestor = element.parentElement
    while (ancestor) {
      const background = getComputedStyle(ancestor).backgroundColor
      if (background !== "transparent" && background !== "rgba(0, 0, 0, 0)") return background
      ancestor = ancestor.parentElement
    }
    return getComputedStyle(document.documentElement).backgroundColor
  })
}

function expectContrast(foreground: string, background: string, minimum: number) {
  expect(
    contrastRatio(cssColorToHex(foreground), cssColorToHex(background)),
  ).toBeGreaterThanOrEqual(minimum)
}

async function tabToElement(page: Page, target: Locator) {
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
  })
  for (let attempt = 0; attempt < 80; attempt += 1) {
    await page.keyboard.press("Tab")
    if (await target.evaluate((element) => element === document.activeElement)) return
  }
  throw new Error("Keyboard tab sequence did not reach the requested element")
}

async function layout(page: Page) {
  return JSON.parse((await page.getByTestId("layout-json").textContent()) ?? "{}") as {
    panels: { id: string; size: number; restoreSize: number; collapsed: boolean }[]
  }
}

async function sidebarWidth(page: Page) {
  const bounds = await page.locator(".merlin-shell-sidebar").boundingBox()
  if (!bounds) throw new Error("Sidebar has no rendered bounds")
  return Math.round(bounds.width)
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
  await page.goto(PROOF_HARNESS_PATH)
  await waitForProofs(page)
  await expect(
    page.getByRole("heading", { name: "Merlin Phase 0 technical preflight" }),
  ).toBeVisible()
  await expect(page.getByTestId("layout-status")).toHaveText("Browser-only interaction proof")
  await expect(page.getByTestId("settings-status")).toHaveText(
    "Browser-only settings defaults; native persistence unavailable",
  )
  await expect(page.locator("html")).toHaveAttribute("data-theme", "merlin-dark")
  await expect(page.locator("html")).toHaveAttribute("data-density", "default")
  await expect(page.locator("html")).not.toHaveAttribute("data-force-reduced-motion")

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
      await page.goto(`http://127.0.0.1:5173${PROOF_HARNESS_PATH}`)
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
  await page.goto(PROOF_HARNESS_PATH)
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

test("Milkdown editor has a strong boundary and visible keyboard focus treatment", async ({
  page,
}) => {
  await page.goto(PROOF_HARNESS_PATH)
  await waitForProofs(page)
  const editor = page.getByTestId("milkdown-editor-host")
  const content = editor.locator("[contenteditable='true']")
  await expect(content).toBeVisible()

  await tabToElement(page, content)
  await expect(content).toBeFocused()
  await expect.poll(() => editor.evaluate((element) => element.matches(":focus-within"))).toBe(true)

  const style = await computedThemeStyle(editor)
  expect(style).toMatchObject({
    borderTopColor: "rgb(137, 148, 159)",
    borderTopWidth: "1px",
    outlineColor: "rgb(217, 119, 66)",
    outlineStyle: "solid",
    outlineWidth: "2px",
    outlineOffset: "2px",
  })
  expectContrast(style.borderTopColor, style.backgroundColor, 3)
  expectContrast(style.outlineColor, await adjacentBackground(editor), 3)
  expect((await computedThemeStyle(content)).outlineStyle).toBe("none")
})

test("Merlin Dark computed component states and density remain semantic and accessible", async ({
  page,
}) => {
  const consoleErrors: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text())
  })
  await page.addInitScript(() => {
    const target = window as Window & { __MERLIN_OBSERVED_THEMES__?: string[] }
    target.__MERLIN_OBSERVED_THEMES__ = []
    const capture = () => {
      const theme = document.documentElement?.dataset.theme
      if (theme) target.__MERLIN_OBSERVED_THEMES__!.push(theme)
    }
    new MutationObserver(capture).observe(document, {
      attributes: true,
      attributeFilter: ["data-theme"],
      subtree: true,
    })
    requestAnimationFrame(capture)
  })
  await page.goto(PROOF_HARNESS_PATH)
  await page.getByRole("button", { name: "Run current source proof" }).waitFor()
  await expect(page.locator("html")).toHaveAttribute("data-theme", "merlin-dark")
  await expect(page.locator("html")).toHaveAttribute("data-density", "default")

  await page.evaluate(() => {
    const host = document.createElement("div")
    host.id = "theme-status-fixture"
    for (const kind of ["success", "warning", "error"] as const) {
      const status = document.createElement("div")
      status.className = "merlin-status"
      status.dataset.kind = kind
      status.dataset.testid = `theme-status-${kind}`
      status.textContent = `Theme ${kind} status`
      host.append(status)
    }
    document.body.append(host)
  })

  const generic = page.getByTestId("control-neutral")
  const accent = page.getByTestId("control-accent")
  const destructive = page.getByTestId("control-destructive")
  const selected = page.getByTestId("control-neutral-selected")
  const disabledAccent = page.getByTestId("control-accent-disabled")
  const disabledDestructive = page.getByTestId("control-destructive-disabled")
  await expect(page.getByTestId("control-state-proof").locator("[data-slot='button']")).toHaveCount(
    8,
  )

  expect(await computedThemeStyle(generic)).toMatchObject({
    minHeight: "32px",
    color: "rgb(242, 244, 245)",
    backgroundColor: "rgb(22, 25, 28)",
    borderTopColor: "rgb(137, 148, 159)",
  })
  expect((await computedThemeStyle(page.locator("#markdown-fixture"))).colorScheme).toBe("dark")
  expect((await computedThemeStyle(page.locator(".merlin-metadata").first())).fontFamily).toContain(
    "Cascadia Mono",
  )
  expect((await computedThemeStyle(page.locator(".merlin-link-button").first())).color).toBe(
    "rgb(155, 188, 232)",
  )
  expect(await computedThemeStyle(generic, "::selection")).toMatchObject({
    color: "rgb(242, 244, 245)",
    backgroundColor: "rgb(58, 66, 74)",
  })
  expect((await computedThemeStyle(page.getByTestId("theme-status-success"))).color).toBe(
    "rgb(117, 189, 138)",
  )
  expect((await computedThemeStyle(page.getByTestId("theme-status-warning"))).color).toBe(
    "rgb(215, 167, 88)",
  )
  expect((await computedThemeStyle(page.getByTestId("theme-status-error"))).color).toBe(
    "rgb(216, 108, 108)",
  )

  const controlMatrix = [
    {
      variant: "neutral",
      control: generic,
      selectedControl: selected,
      baseBackground: "rgb(22, 25, 28)",
      baseForeground: "rgb(242, 244, 245)",
      baseBorder: "rgb(137, 148, 159)",
      hoverBackground: "rgb(42, 48, 54)",
      hoverForeground: "rgb(242, 244, 245)",
      hoverBorder: "rgb(137, 148, 159)",
    },
    {
      variant: "accent",
      control: accent,
      selectedControl: page.getByTestId("control-accent-selected"),
      baseBackground: "rgb(196, 98, 45)",
      baseForeground: "rgb(8, 9, 10)",
      baseBorder: "rgb(196, 98, 45)",
      hoverBackground: "rgb(217, 119, 66)",
      hoverForeground: "rgb(8, 9, 10)",
      hoverBorder: "rgb(217, 119, 66)",
    },
    {
      variant: "destructive",
      control: destructive,
      selectedControl: page.getByTestId("control-destructive-selected"),
      baseBackground: "rgb(216, 108, 108)",
      baseForeground: "rgb(8, 9, 10)",
      baseBorder: "rgb(216, 108, 108)",
      hoverBackground: "rgb(216, 108, 108)",
      hoverForeground: "rgb(8, 9, 10)",
      hoverBorder: "rgb(216, 108, 108)",
    },
  ]

  for (const entry of controlMatrix) {
    await page.mouse.move(0, 0)
    const base = await computedThemeStyle(entry.control)
    expect(base).toMatchObject({
      color: entry.baseForeground,
      backgroundColor: entry.baseBackground,
      borderTopColor: entry.baseBorder,
    })
    expectContrast(base.color, base.backgroundColor, 4.5)
    if (entry.variant === "neutral") {
      expectContrast(base.borderTopColor, base.backgroundColor, 3)
    } else {
      expectContrast(base.backgroundColor, await adjacentBackground(entry.control), 3)
    }

    await entry.control.hover()
    await expect
      .poll(() => entry.control.evaluate((element) => element.matches(":hover")))
      .toBe(true)
    const hovered = await computedThemeStyle(entry.control)
    expect(hovered).toMatchObject({
      color: entry.hoverForeground,
      backgroundColor: entry.hoverBackground,
      borderTopColor: entry.hoverBorder,
    })
    expectContrast(hovered.color, hovered.backgroundColor, 4.5)

    await page.mouse.down()
    await expect
      .poll(() => entry.control.evaluate((element) => element.matches(":active")))
      .toBe(true)
    await expect
      .poll(async () => (await computedThemeStyle(entry.control)).backgroundColor)
      .toBe("rgb(58, 66, 74)")
    const pressed = await computedThemeStyle(entry.control)
    expect(pressed).toMatchObject({
      color: "rgb(242, 244, 245)",
      backgroundColor: "rgb(58, 66, 74)",
      borderTopColor: "rgb(137, 148, 159)",
    })
    expectContrast(pressed.color, pressed.backgroundColor, 4.5)
    expectContrast(pressed.borderTopColor, pressed.backgroundColor, 3)
    await page.mouse.up()

    await page.mouse.move(0, 0)
    const selectedBase = await computedThemeStyle(entry.selectedControl)
    expect(selectedBase).toMatchObject({
      color: "rgb(242, 244, 245)",
      backgroundColor: "rgb(42, 48, 54)",
      borderLeftColor: "rgb(196, 98, 45)",
      borderLeftWidth: "2px",
    })
    expectContrast(selectedBase.color, selectedBase.backgroundColor, 4.5)
    expectContrast(selectedBase.borderLeftColor, selectedBase.backgroundColor, 3)

    await entry.selectedControl.hover()
    await expect
      .poll(() => entry.selectedControl.evaluate((element) => element.matches(":hover")))
      .toBe(true)
    const selectedHovered = await computedThemeStyle(entry.selectedControl)
    expect(selectedHovered).toMatchObject({
      color: "rgb(242, 244, 245)",
      backgroundColor: "rgb(42, 48, 54)",
      borderLeftColor: "rgb(196, 98, 45)",
      borderLeftWidth: "2px",
    })
    expectContrast(selectedHovered.color, selectedHovered.backgroundColor, 4.5)
    expectContrast(selectedHovered.borderLeftColor, selectedHovered.backgroundColor, 3)

    await page.mouse.down()
    await expect
      .poll(() => entry.selectedControl.evaluate((element) => element.matches(":active")))
      .toBe(true)
    await expect
      .poll(async () => (await computedThemeStyle(entry.selectedControl)).backgroundColor)
      .toBe("rgb(58, 66, 74)")
    const selectedPressed = await computedThemeStyle(entry.selectedControl)
    expect(selectedPressed).toMatchObject({
      color: "rgb(242, 244, 245)",
      backgroundColor: "rgb(58, 66, 74)",
      borderTopColor: "rgb(137, 148, 159)",
      borderLeftColor: "rgb(137, 148, 159)",
    })
    expectContrast(selectedPressed.color, selectedPressed.backgroundColor, 4.5)
    expectContrast(selectedPressed.borderLeftColor, selectedPressed.backgroundColor, 3)
    await page.mouse.up()
  }

  await page.mouse.move(0, 0)
  await tabToElement(page, selected)
  await expect(selected).toBeFocused()
  await expect
    .poll(() => selected.evaluate((element) => element.matches(":focus-visible")))
    .toBe(true)
  const focused = await computedThemeStyle(selected)
  expect(focused).toMatchObject({
    outlineColor: "rgb(217, 119, 66)",
    outlineStyle: "solid",
    outlineWidth: "2px",
    outlineOffset: "2px",
  })
  expectContrast(focused.outlineColor, await adjacentBackground(selected), 3)

  for (const disabled of [disabledAccent, disabledDestructive]) {
    const disabledStyle = await computedThemeStyle(disabled)
    expect(disabledStyle).toMatchObject({
      color: "rgb(137, 148, 159)",
      backgroundColor: "rgb(22, 25, 28)",
      borderTopColor: "rgb(58, 66, 74)",
      opacity: "1",
    })
    expectContrast(disabledStyle.color, disabledStyle.backgroundColor, 4.5)
  }

  const handle = page.getByRole("separator", { name: "Resize Docs and Todos" })
  expect((await computedThemeStyle(handle, "::after")).borderLeftColor).toBe("rgb(137, 148, 159)")

  await page.evaluate(() => {
    document.documentElement.dataset.density = "compact"
  })
  await expect.poll(async () => (await computedThemeStyle(generic)).minHeight).toBe("28px")
  await expect
    .poll(
      async () => (await computedThemeStyle(page.locator(".merlin-fixture-row").first())).minHeight,
    )
    .toBe("28px")
  await page.evaluate(() => {
    document.documentElement.dataset.density = "default"
  })
  await expect.poll(async () => (await computedThemeStyle(generic)).minHeight).toBe("32px")

  const observedThemes = await page.evaluate(
    () => (window as Window & { __MERLIN_OBSERVED_THEMES__?: string[] }).__MERLIN_OBSERVED_THEMES__,
  )
  expect(observedThemes?.length).toBeGreaterThan(0)
  expect([...new Set(observedThemes)]).toEqual(["merlin-dark"])

  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze()
  expect(accessibility.violations).toEqual([])
  expect(consoleErrors).toEqual([])
})

test("product shell exposes three honest destinations with accessible navigation", async ({
  page,
}) => {
  const consoleErrors: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text())
  })
  const externalRequests: string[] = []
  page.on("request", (request) => {
    if (request.url().startsWith("https://")) externalRequests.push(request.url())
  })
  await page.addInitScript(() => {
    window.localStorage.clear()
    window.sessionStorage.clear()
  })

  await page.goto("/")
  await expect(page.locator("html")).toHaveAttribute("data-theme", "merlin-dark")
  await expect(page.locator("html")).toHaveAttribute("data-density", "default")
  await expect(page.locator("html")).not.toHaveAttribute("data-force-reduced-motion")
  await expect(page.getByRole("heading", { level: 1, name: "Overview" })).toBeVisible()
  await expect(page.getByText(/technical preflight|not a Merlin product screen/i)).toHaveCount(0)
  await expect(page.getByText("Verification boundary")).toHaveCount(0)
  await expect(page.getByTestId("control-state-proof")).toHaveCount(0)
  await expect(page.getByRole("status")).toHaveCount(0)

  const navigation = page.getByRole("navigation", { name: "Primary navigation" })
  const navButtons = navigation.getByRole("button")
  await expect(navButtons).toHaveCount(3)
  for (const name of ["Overview", "Projects", "Resources"]) {
    const button = navigation.getByRole("button", { name, exact: true })
    await expect(button).toBeVisible()
    await expect(button).toBeEnabled()
  }

  const main = page.getByRole("main")
  await expect(main.locator("button, table, ul, ol, a, input, select, textarea")).toHaveCount(0)
  await expect(page.getByText(/no projects yet|no resources yet/i)).toHaveCount(0)
  await expect(page.getByRole("button", { name: /new project|add resource/i })).toHaveCount(0)

  const destinations = [
    {
      name: "Overview",
      copy: "Overview is not implemented in this build. Project summaries, resource readiness, and activity are not available yet.",
    },
    {
      name: "Projects",
      copy: PROJECTS_UNAVAILABLE_DESCRIPTION,
    },
    {
      name: "Resources",
      copy: "Resource records, accounts, and usage tracking are not implemented in this build.",
    },
  ]

  async function expectActiveDestination(name: string, copy: string) {
    const button = navigation.getByRole("button", { name, exact: true })
    await expect(button).toHaveAttribute("aria-current", "page")
    await expect(button).toBeFocused()
    await expect(page.locator("[aria-current='page']")).toHaveCount(1)
    await expect(page.getByRole("heading", { level: 1, name })).toBeVisible()
    await expect(page.getByRole("main", { name })).toBeVisible()
    await expect(page.getByText(copy, { exact: true })).toBeVisible()
    await expect(page.getByRole("status")).toHaveCount(0)
  }

  await page.keyboard.press("Tab")
  const overviewButton = navigation.getByRole("button", { name: "Overview", exact: true })
  await expect(overviewButton).toBeFocused()
  const overviewFocusVisible = await overviewButton.evaluate((element) =>
    element.matches(":focus-visible"),
  )
  expect(overviewFocusVisible).toBe(true)
  const overviewOutlineWidth = await overviewButton.evaluate(
    (element) => getComputedStyle(element).outlineWidth,
  )
  expect(overviewOutlineWidth).toBe("2px")
  await page.keyboard.press("Enter")
  await expectActiveDestination(destinations[0]!.name, destinations[0]!.copy)

  await page.keyboard.press("Tab")
  const projectsButton = navigation.getByRole("button", { name: "Projects", exact: true })
  await expect(projectsButton).toBeFocused()
  await page.keyboard.press("Enter")
  await expectActiveDestination(destinations[1]!.name, destinations[1]!.copy)

  await page.keyboard.press("Tab")
  const resourcesButton = navigation.getByRole("button", { name: "Resources", exact: true })
  await expect(resourcesButton).toBeFocused()
  await page.keyboard.press("Space")
  await expectActiveDestination(destinations[2]!.name, destinations[2]!.copy)

  for (const destination of destinations) {
    await navigation.getByRole("button", { name: destination.name, exact: true }).click()
    await expectActiveDestination(destination.name, destination.copy)
  }

  const sidebar = page.locator(".merlin-shell-sidebar")
  const sidebarBounds = await sidebar.boundingBox()
  expect(sidebarBounds).not.toBeNull()
  expect(Math.round(sidebarBounds!.width)).toBe(240)

  await page.setViewportSize({ width: 760, height: 760 })
  const overflow = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    body: document.body.scrollWidth - document.body.clientWidth,
  }))
  expect(overflow.document).toBeLessThanOrEqual(0)
  expect(overflow.body).toBeLessThanOrEqual(0)
  const narrowSidebarBounds = await sidebar.boundingBox()
  expect(narrowSidebarBounds).not.toBeNull()
  const narrowSidebarWidth = Math.round(narrowSidebarBounds!.width)
  expect(narrowSidebarWidth).toBeGreaterThanOrEqual(200)
  expect(narrowSidebarWidth).toBeLessThanOrEqual(320)

  const storage = await page.evaluate(() => ({
    local: window.localStorage.length,
    session: window.sessionStorage.length,
  }))
  expect(storage).toEqual({ local: 0, session: 0 })
  expect(externalRequests).toEqual([])

  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze()
  expect(accessibility.violations).toEqual([])
  expect(consoleErrors).toEqual([])
})

test("sidebar resizes by pointer and keyboard within session bounds and resets on reload", async ({
  page,
}) => {
  const consoleErrors: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text())
  })
  await page.addInitScript(() => {
    window.localStorage.clear()
    window.sessionStorage.clear()
  })

  await page.goto("/")
  await expect(page.getByRole("heading", { level: 1, name: "Overview" })).toBeVisible()
  const handle = page.getByRole("separator", { name: "Resize sidebar" })
  await expect(handle).toBeVisible()
  await expect(handle).toHaveAttribute("data-slot", "resizable-handle")
  expect(await sidebarWidth(page)).toBe(240)

  const navigation = page.getByRole("navigation", { name: "Primary navigation" })
  const overview = navigation.getByRole("button", { name: "Overview", exact: true })
  const projects = navigation.getByRole("button", { name: "Projects", exact: true })
  const activeStyle = await overview.evaluate((element) => {
    const style = getComputedStyle(element)
    return {
      height: style.height,
      color: style.color,
      backgroundColor: style.backgroundColor,
      borderLeftColor: style.borderLeftColor,
      borderLeftWidth: style.borderLeftWidth,
    }
  })
  expect(activeStyle).toMatchObject({
    height: "28px",
    color: "rgb(242, 244, 245)",
    backgroundColor: "rgb(42, 48, 54)",
    borderLeftColor: "rgb(196, 98, 45)",
    borderLeftWidth: "2px",
  })

  await projects.hover()
  await expect.poll(() => projects.evaluate((element) => element.matches(":hover"))).toBe(true)
  const hoveredStyle = await projects.evaluate((element) => {
    const style = getComputedStyle(element)
    return {
      height: style.height,
      color: style.color,
      backgroundColor: style.backgroundColor,
      borderLeftColor: style.borderLeftColor,
    }
  })
  expect(hoveredStyle).toMatchObject({
    height: "28px",
    color: "rgb(242, 244, 245)",
    backgroundColor: "rgb(42, 48, 54)",
    borderLeftColor: "rgba(0, 0, 0, 0)",
  })
  await page.mouse.move(0, 0)

  await tabToElement(page, handle)
  await expect(handle).toBeFocused()
  await expect
    .poll(() => handle.evaluate((element) => element.matches(":focus-visible")))
    .toBe(true)
  const focusRing = await handle.evaluate((element) => {
    const style = getComputedStyle(element)
    return {
      outlineColor: style.outlineColor,
      outlineWidth: style.outlineWidth,
      outlineStyle: style.outlineStyle,
      outlineOffset: style.outlineOffset,
    }
  })
  expect(focusRing).toMatchObject({
    outlineColor: "rgb(217, 119, 66)",
    outlineWidth: "2px",
    outlineStyle: "solid",
    outlineOffset: "2px",
  })
  const handleLine = await handle.evaluate(
    (element) => getComputedStyle(element, "::after").borderLeftColor,
  )
  expect(handleLine).toBe("rgb(137, 148, 159)")

  await page.keyboard.press("End")
  await expect.poll(() => sidebarWidth(page)).toBe(320)
  expect(handle).toBeFocused()
  await page.keyboard.press("Home")
  await expect.poll(() => sidebarWidth(page)).toBe(200)
  await page.keyboard.press("ArrowRight")
  await expect.poll(() => sidebarWidth(page)).toBeGreaterThan(200)
  const keyboardWidth = await sidebarWidth(page)
  expect(keyboardWidth).toBeLessThanOrEqual(320)
  expect(handle).toBeFocused()

  await projects.click()
  await expect(page.getByRole("heading", { level: 1, name: "Projects" })).toBeVisible()
  expect(await sidebarWidth(page)).toBe(keyboardWidth)
  await navigation.getByRole("button", { name: "Resources", exact: true }).click()
  await expect(page.getByRole("heading", { level: 1, name: "Resources" })).toBeVisible()
  expect(await sidebarWidth(page)).toBe(keyboardWidth)

  const initialBounds = await handle.boundingBox()
  expect(initialBounds).not.toBeNull()
  await page.mouse.move(
    initialBounds!.x + initialBounds!.width / 2,
    initialBounds!.y + initialBounds!.height / 2,
  )
  await page.mouse.down()
  await page.mouse.move(
    initialBounds!.x + initialBounds!.width / 2 + 400,
    initialBounds!.y + initialBounds!.height / 2,
    { steps: 10 },
  )
  await page.mouse.up()
  await expect.poll(() => sidebarWidth(page)).toBe(320)

  const maximumBounds = await handle.boundingBox()
  expect(maximumBounds).not.toBeNull()
  await page.mouse.move(
    maximumBounds!.x + maximumBounds!.width / 2,
    maximumBounds!.y + maximumBounds!.height / 2,
  )
  await page.mouse.down()
  await page.mouse.move(
    maximumBounds!.x + maximumBounds!.width / 2 - 400,
    maximumBounds!.y + maximumBounds!.height / 2,
    { steps: 10 },
  )
  await page.mouse.up()
  await expect.poll(() => sidebarWidth(page)).toBe(200)

  await page.setViewportSize({ width: 760, height: 760 })
  await expect.poll(() => sidebarWidth(page)).toBeGreaterThanOrEqual(200)
  const resizedWidth = await sidebarWidth(page)
  expect(resizedWidth).toBeLessThanOrEqual(320)

  await page.setViewportSize({ width: 1280, height: 1000 })
  await expect.poll(() => sidebarWidth(page)).toBeLessThanOrEqual(320)
  const grownWidth = await sidebarWidth(page)
  expect(grownWidth).toBeGreaterThanOrEqual(200)
  await page.setViewportSize({ width: 760, height: 760 })
  await expect.poll(() => sidebarWidth(page)).toBeGreaterThanOrEqual(200)
  const restoredWidth = await sidebarWidth(page)
  expect(restoredWidth).toBeLessThanOrEqual(320)
  const overflow = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    body: document.body.scrollWidth - document.body.clientWidth,
  }))
  expect(overflow.document).toBeLessThanOrEqual(0)
  expect(overflow.body).toBeLessThanOrEqual(0)
  expect(
    await page.evaluate(() => ({
      local: window.localStorage.length,
      session: window.sessionStorage.length,
    })),
  ).toEqual({ local: 0, session: 0 })

  await page.reload()
  await expect(page.getByRole("heading", { level: 1, name: "Overview" })).toBeVisible()
  await expect.poll(() => sidebarWidth(page)).toBe(240)
  expect(await page.evaluate(() => window.localStorage.length)).toBe(0)
  expect(await page.evaluate(() => window.sessionStorage.length)).toBe(0)

  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze()
  expect(accessibility.violations).toEqual([])
  expect(consoleErrors).toEqual([])
})

test("minimal common controls expose labels, focus, disabled/error states, and dialog behavior", async ({
  page,
}) => {
  const consoleErrors: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text())
  })
  const externalRequests: string[] = []
  page.on("request", (request) => {
    if (request.url().startsWith("https://")) externalRequests.push(request.url())
  })
  await page.goto(CONTROLS_HARNESS_PATH)
  await expect(
    page.getByRole("heading", { level: 1, name: "Merlin common controls harness" }),
  ).toBeVisible()
  await expect(page.getByText(/no merlin project, resource, account, or usage data/i)).toBeVisible()

  const name = page.getByRole("textbox", { name: "Display name" })
  const notes = page.getByRole("textbox", { name: "Notes" })
  const disabled = page.getByRole("textbox", { name: "Disabled field" })
  const invalid = page.getByRole("textbox", { name: "Field with error" })
  await expect(name).toBeEditable()
  await expect(notes).toBeEditable()
  await expect(disabled).toBeDisabled()
  await expect(invalid).toHaveAttribute("aria-invalid", "true")
  await expect(invalid).toHaveAccessibleDescription("Enter a value.")
  await name.fill("Example name")
  await notes.fill("A short note.")
  expect(await name.inputValue()).toBe("Example name")
  expect(await notes.inputValue()).toBe("A short note.")

  await tabToElement(page, name)
  await expect(name).toBeFocused()
  await expect.poll(() => name.evaluate((element) => element.matches(":focus-visible"))).toBe(true)
  const inputStyle = await computedThemeStyle(name)
  expect(inputStyle).toMatchObject({
    color: "rgb(242, 244, 245)",
    backgroundColor: "rgb(8, 9, 10)",
    borderTopColor: "rgb(137, 148, 159)",
    outlineColor: "rgb(217, 119, 66)",
    outlineStyle: "solid",
    outlineWidth: "2px",
  })
  expectContrast(inputStyle.color, inputStyle.backgroundColor, 4.5)
  expectContrast(inputStyle.borderTopColor, inputStyle.backgroundColor, 3)
  expectContrast(inputStyle.outlineColor, "rgb(8, 9, 10)", 3)

  const trigger = page.getByRole("button", { name: "Open dialog" })
  await trigger.click()
  const dialog = page.getByRole("dialog", { name: "Example dialog" })
  await expect(dialog).toBeVisible()
  await expect(dialog).toHaveAccessibleDescription(
    "A token-styled modal with Escape handling and focus management.",
  )
  expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true)
  for (let attempt = 0; attempt < 6; attempt += 1) {
    await page.keyboard.press("Tab")
    expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true)
  }
  await page.keyboard.press("Escape")
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()

  await trigger.click()
  await expect(dialog).toBeVisible()
  await dialog.getByRole("button", { name: "Close" }).click()
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()

  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze()
  expect(accessibility.violations).toEqual([])
  expect(externalRequests).toEqual([])
  expect(consoleErrors).toEqual([])
})
