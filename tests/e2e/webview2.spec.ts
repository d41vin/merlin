import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import path from "node:path"

import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Page } from "@playwright/test"

import { getFixture, MARKDOWN_FIXTURES } from "../../src/markdown/fixtures"
import {
  prepareWebView2Artifacts,
  restartWebView2,
  startWebView2,
  stopWebView2,
  type WebView2Session,
} from "../support/webview2-process"
import { proofHarnessUrl } from "../support/harness"

async function layout(page: Page) {
  return JSON.parse((await page.getByTestId("layout-json").textContent()) ?? "{}") as {
    version: number
    panels: { id: string; size: number; restoreSize: number; collapsed: boolean }[]
  }
}

async function expectShellReady(page: Page) {
  await expect(page.getByRole("heading", { level: 1, name: "Overview" })).toBeVisible({
    timeout: 90_000,
  })
  await expect(page.getByText(/technical preflight|not a Merlin product screen/i)).toHaveCount(0)
  await expect(page.getByTestId("control-state-proof")).toHaveCount(0)
}

async function sidebarWidth(page: Page) {
  const bounds = await page.locator(".merlin-shell-sidebar").boundingBox()
  if (!bounds) throw new Error("Sidebar has no rendered bounds")
  return Math.round(bounds.width)
}

async function waitForNativeReady(page: Page) {
  await expect(page.getByTestId("layout-status")).toHaveText("SQLite layout ready", {
    timeout: 90_000,
  })
  await expect(page.getByTestId("settings-status")).toHaveText("SQLite settings ready", {
    timeout: 90_000,
  })
  await expect(page.locator(".merlin-fixture-row[data-result='pass']")).toHaveCount(
    MARKDOWN_FIXTURES.length,
    { timeout: 90_000 },
  )
}

interface ApplicationSettings {
  version: 1
  themeSlug: "merlin-dark"
  density: "default" | "compact"
  forceReducedMotion: boolean
  usedDefaults: boolean
}

async function invokeNative<T>(
  page: Page,
  command: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  return page.evaluate(
    async ({ command, args }) => {
      const internals = (
        window as Window & {
          __TAURI_INTERNALS__?: {
            invoke<T>(command: string, args: Record<string, unknown>): Promise<T>
          }
        }
      ).__TAURI_INTERNALS__
      if (!internals) throw new Error("Tauri IPC is unavailable")
      return internals.invoke<T>(command, args)
    },
    { command, args },
  )
}

test("real WebView2 interactions and SQLite persistence survive a native process restart", async () => {
  test.setTimeout(360_000)
  prepareWebView2Artifacts()
  let session: WebView2Session | undefined
  const consoleErrors: string[] = []
  const consoleMessages: string[] = []
  const remoteRequests: string[] = []
  const observePage = (page: Page) => {
    page.on("console", (message) => {
      consoleMessages.push(message.text())
      if (message.type() === "error") {
        consoleErrors.push(`${message.text()} (${JSON.stringify(message.location())})`)
      }
    })
    page.on("request", (request) => {
      if (/^https:\/\/example\.com/.test(request.url())) remoteRequests.push(request.url())
    })
  }

  try {
    session = await startWebView2()
    observePage(session.page)
    await expectShellReady(session.page)
    await expect(session.page.locator("html")).toHaveAttribute("data-theme", "merlin-dark")
    await expect(session.page.locator("html")).toHaveAttribute("data-density", "default")
    await expect(session.page.locator("html")).not.toHaveAttribute("data-force-reduced-motion")
    await expect(session.page.getByRole("navigation", { name: "Primary navigation" })).toBeVisible()
    await expect(
      session.page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button"),
    ).toHaveCount(3)
    expect(await sidebarWidth(session.page)).toBe(240)
    const shellHandle = session.page.getByRole("separator", { name: "Resize sidebar" })
    await expect(shellHandle).toBeVisible()
    await shellHandle.focus()
    await expect(shellHandle).toBeFocused()
    await session.page.keyboard.press("End")
    await expect.poll(() => sidebarWidth(session!.page)).toBe(320)
    await session.page.keyboard.press("Home")
    await expect.poll(() => sidebarWidth(session!.page)).toBe(200)
    await session.page.keyboard.press("ArrowRight")
    await expect.poll(() => sidebarWidth(session!.page)).toBeGreaterThan(200)
    const shellWidth = await sidebarWidth(session.page)
    await session.page.getByRole("button", { name: "Projects", exact: true }).click()
    await expect(session.page.getByRole("heading", { level: 1, name: "Projects" })).toBeVisible()
    expect(await sidebarWidth(session.page)).toBe(shellWidth)
    expect(await invokeNative<unknown>(session.page, "preflight_get_layout")).toBeNull()
    expect(
      await session.page.evaluate(() => ({
        local: window.localStorage.length,
        session: window.sessionStorage.length,
      })),
    ).toEqual({ local: 0, session: 0 })
    await session.page.reload()
    await expectShellReady(session.page)
    await expect.poll(() => sidebarWidth(session!.page)).toBe(240)
    const shellAccessibility = await new AxeBuilder({ page: session.page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze()
    expect(shellAccessibility.violations).toEqual([])

    await session.page.goto(proofHarnessUrl(session.page.url()))
    await waitForNativeReady(session.page)
    expect(
      await session.page.evaluate(
        () =>
          (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ !== undefined,
      ),
    ).toBe(true)
    expect(await session.page.evaluate(() => window.localStorage.length)).toBe(0)

    const defaultSettings = await invokeNative<ApplicationSettings>(session.page, "settings_get")
    expect(defaultSettings).toEqual({
      version: 1,
      themeSlug: "merlin-dark",
      density: "default",
      forceReducedMotion: false,
      usedDefaults: false,
    })
    await expect(session.page.locator("html")).toHaveAttribute("data-theme", "merlin-dark")
    await expect(session.page.locator("html")).toHaveAttribute("data-density", "default")
    await expect(session.page.locator("html")).not.toHaveAttribute("data-force-reduced-motion")
    await expect(session.page.locator("html")).toHaveCSS("color-scheme", "dark")
    await expect(session.page.locator(".merlin-control").first()).toHaveCSS("min-height", "32px")
    await expect(session.page.locator("#markdown-fixture")).toHaveCSS("color-scheme", "dark")

    const savedTheme = await invokeNative<ApplicationSettings>(session.page, "settings_set_theme", {
      theme: "merlin-dark",
    })
    expect(savedTheme.themeSlug).toBe("merlin-dark")
    const savedDensity = await invokeNative<ApplicationSettings>(
      session.page,
      "settings_set_density",
      { density: "compact" },
    )
    expect(savedDensity.density).toBe("compact")
    const savedMotion = await invokeNative<ApplicationSettings>(
      session.page,
      "settings_set_reduce_motion",
      { forceReducedMotion: true },
    )
    expect(savedMotion.forceReducedMotion).toBe(true)

    const canary = "sk-test-WEBVIEW2-DO-NOT-REFLECT"
    const rejectionResults = await session.page.evaluate(async (value) => {
      const internals = (
        window as Window & {
          __TAURI_INTERNALS__?: {
            invoke(command: string, args: Record<string, unknown>): Promise<unknown>
          }
        }
      ).__TAURI_INTERNALS__
      if (!internals) throw new Error("Tauri IPC is unavailable")
      const attempts: { command: string; args: Record<string, unknown> }[] = [
        { command: "settings_set_theme", args: { theme: value } },
        { command: "settings_set_density", args: { density: value } },
        { command: "settings_set_theme", args: { theme: { value } } },
        { command: "settings_set_reduce_motion", args: { forceReducedMotion: value } },
      ]
      const results = []
      for (const attempt of attempts) {
        try {
          await internals.invoke(attempt.command, attempt.args)
          results.push({ succeeded: true, serialized: "", message: "" })
        } catch (error) {
          results.push({
            succeeded: false,
            serialized: JSON.stringify(error),
            message: error instanceof Error ? error.message : String(error),
          })
        }
      }
      return results
    }, canary)
    expect(rejectionResults).toHaveLength(4)
    for (const rejection of rejectionResults) {
      expect(rejection.succeeded).toBe(false)
      expect(rejection.serialized).not.toContain(canary)
      expect(rejection.message).not.toContain(canary)
    }
    expect(consoleMessages.join("\n")).not.toContain(canary)
    expect(readFileSync("test-results/webview2/process.log", "utf8")).not.toContain(canary)
    const afterRejected = await invokeNative<ApplicationSettings>(session.page, "settings_get")
    expect(afterRejected.density).toBe("compact")
    expect(afterRejected.forceReducedMotion).toBe(true)

    const handle = session.page.getByRole("separator", { name: "Resize Docs and Todos" })
    const bounds = await handle.boundingBox()
    expect(bounds).not.toBeNull()
    const initial = (await layout(session.page)).panels[0]!.size
    await session.page.mouse.move(bounds!.x + bounds!.width / 2, bounds!.y + bounds!.height / 2)
    await session.page.mouse.down()
    await session.page.mouse.move(
      bounds!.x + bounds!.width / 2 + 70,
      bounds!.y + bounds!.height / 2,
      {
        steps: 10,
      },
    )
    await session.page.mouse.up()
    await expect.poll(async () => (await layout(session!.page)).panels[0]!.size).not.toBe(initial)
    await expect(session.page.getByTestId("layout-status")).toHaveText("Layout saved to SQLite")

    const afterPointer = (await layout(session.page)).panels[0]!.size
    await handle.focus()
    await expect(handle).toBeFocused()
    await session.page.keyboard.press("ArrowRight")
    await expect
      .poll(async () => (await layout(session!.page)).panels[0]!.size)
      .not.toBe(afterPointer)
    await expect(session.page.getByTestId("layout-status")).toHaveText("Layout saved to SQLite")

    await session.page.getByRole("button", { name: "Collapse Docs" }).click()
    await expect(session.page.getByTestId("panel-docs")).toHaveAttribute("data-collapsed")
    await expect(session.page.getByTestId("panel-docs")).toHaveAttribute("inert")
    expect(
      await session.page
        .getByTestId("panel-docs")
        .evaluate((panel) => panel.contains(document.activeElement)),
    ).toBe(false)
    await expect(session.page.getByTestId("layout-status")).toHaveText("Layout saved to SQLite")
    const persisted = await layout(session.page)
    expect(persisted.panels[0]!.size).toBe(0)
    expect(persisted.panels[0]!.restoreSize).toBeGreaterThan(0)
    await expect(session.page.getByRole("button", { name: "Focus sentinel Docs" })).toBeHidden()

    session = await restartWebView2(session)
    observePage(session.page)
    await expectShellReady(session.page)
    await expect(session.page.locator("html")).toHaveAttribute("data-density", "compact")
    await expect(session.page.locator("html")).toHaveAttribute("data-force-reduced-motion", "true")
    await expect(session.page.locator("html")).toHaveAttribute("data-theme", "merlin-dark")
    expect(await sidebarWidth(session.page)).toBe(240)
    const restoredSettings = await invokeNative<ApplicationSettings>(session.page, "settings_get")
    expect(restoredSettings.density).toBe("compact")
    expect(restoredSettings.forceReducedMotion).toBe(true)
    expect(restoredSettings.usedDefaults).toBe(false)

    await session.page.goto(proofHarnessUrl(session.page.url()))
    await waitForNativeReady(session.page)
    expect(await layout(session.page)).toEqual(persisted)
    await expect(session.page.locator("html")).toHaveAttribute("data-density", "compact")
    await expect(session.page.locator("html")).toHaveAttribute("data-force-reduced-motion", "true")
    await expect(session.page.locator("html")).toHaveAttribute("data-theme", "merlin-dark")
    await expect(session.page.locator("html")).toHaveCSS("color-scheme", "dark")
    await expect(session.page.locator(".merlin-control").first()).toHaveCSS("min-height", "28px")
    await expect(session.page.locator("#markdown-fixture")).toHaveCSS("color-scheme", "dark")
    await expect(session.page.getByTestId("panel-docs")).toHaveAttribute("data-collapsed")

    const restartedHandle = session.page.getByRole("separator", {
      name: "Resize Docs and Todos",
    })
    await restartedHandle.focus()
    await session.page.keyboard.press("Enter")
    await expect(session.page.getByTestId("panel-docs")).not.toHaveAttribute("data-collapsed")
    expect((await layout(session.page)).panels[0]!.size).toBeCloseTo(
      persisted.panels[0]!.restoreSize,
      5,
    )
    await session.page.getByRole("button", { name: "Reset panel layout" }).click()
    await expect
      .poll(async () => (await layout(session!.page)).panels.map((panel) => panel.size))
      .toEqual([25, 25, 25, 25])
    await expect(session.page.getByTestId("layout-status")).toHaveText("Layout saved to SQLite")
    expect(await session.page.evaluate(() => window.localStorage.length)).toBe(0)

    await session.page.evaluate(() => {
      ;(
        window as Window & { __MERLIN_DOCUMENT_EXECUTED__?: boolean }
      ).__MERLIN_DOCUMENT_EXECUTED__ = false
    })
    const documentState = () =>
      session!.page.evaluate(
        () =>
          (window as Window & { __MERLIN_DOCUMENT_EXECUTED__?: boolean })
            .__MERLIN_DOCUMENT_EXECUTED__,
      )

    await session.page.locator("#markdown-fixture").selectOption("hostile-html")
    await expect(session.page.getByTestId("markdown-source")).toHaveValue(
      getFixture("hostile-html").source,
    )
    const hostilePreview = session.page.locator("[data-render-boundary='untrusted-document']")
    await expect(
      hostilePreview.locator(
        "script,iframe,object,embed,svg,form,button,style,link,meta,template,[style],[onclick],[onerror],[onload]",
      ),
    ).toHaveCount(0)
    await expect(hostilePreview.locator("img, a[href^='javascript']")).toHaveCount(0)
    await expect(hostilePreview.locator("[data-image-policy='blocked']")).toHaveCount(1)
    expect(await documentState()).toBe(false)

    await session.page.locator("#markdown-fixture").selectOption("mdx")
    const inertMdx = session.page.locator("pre[data-mdx-mode='inert-source']")
    await expect(inertMdx).toBeVisible()
    expect(await inertMdx.textContent()).toBe(getFixture("mdx").source)
    await expect(session.page.getByTestId("markdown-source")).toHaveValue(getFixture("mdx").source)
    await expect(session.page.locator("Chart, chart")).toHaveCount(0)
    expect(await documentState()).toBe(false)

    await session.page.locator("#markdown-fixture").selectOption("links-images")
    const imagePreview = session.page.locator("[data-render-boundary='untrusted-document']")
    await expect(imagePreview.locator("img, a[href^='javascript']")).toHaveCount(0)
    await expect(imagePreview.locator("[data-image-policy='blocked']")).toHaveCount(1)
    await expect(imagePreview.locator("[data-local-image='assets/local.png']")).toHaveCount(1)
    expect(remoteRequests).toEqual([])

    await session.page.locator("#markdown-fixture").selectOption("mermaid")
    const mermaidPreview = session.page.locator("[data-render-boundary='untrusted-document']")
    await expect(mermaidPreview.locator("code[data-mermaid='inert']")).toContainText("flowchart TD")
    await expect(mermaidPreview.locator("svg")).toHaveCount(0)
    expect(await documentState()).toBe(false)
    expect(remoteRequests).toEqual([])

    const accessibility = await new AxeBuilder({ page: session.page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze()
    expect(accessibility.violations).toEqual([])
    expect(consoleErrors).toEqual([])
  } finally {
    if (session) await stopWebView2(session)
  }
})

test("optimized harness launches packaged assets and typed SQLite IPC", async () => {
  test.setTimeout(360_000)
  prepareWebView2Artifacts()
  let session: WebView2Session | undefined
  const consoleErrors: string[] = []
  const observeErrors = (page: Page) => {
    page.on("console", (message) => {
      if (message.type() === "error") {
        consoleErrors.push(`${message.text()} (${JSON.stringify(message.location())})`)
      }
    })
  }

  try {
    session = await startWebView2("optimized-harness")
    observeErrors(session.page)
    expect(session.mode).toBe("optimized-harness")
    expect(session.page.url()).toContain("tauri.localhost")
    expect(session.page.url()).not.toContain("localhost:5173")
    await expect(session.page).toHaveTitle("Merlin")
    expect(await session.page.locator("body").getAttribute("data-harness-entry")).toBeNull()
    expect(
      await session.page.evaluate(
        () =>
          (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ !== undefined,
      ),
    ).toBe(true)
    await expectShellReady(session.page)
    await expect(session.page.locator("html")).toHaveAttribute("data-theme", "merlin-dark")
    await expect(session.page.locator("html")).toHaveAttribute("data-density", "default")
    await expect(session.page.locator("html")).not.toHaveAttribute("data-force-reduced-motion")
    await expect(session.page.locator("html")).toHaveCSS("color-scheme", "dark")
    await expect(session.page.getByRole("navigation", { name: "Primary navigation" })).toBeVisible()
    await expect(
      session.page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button"),
    ).toHaveCount(3)
    expect(await sidebarWidth(session.page)).toBe(240)
    const shellHandle = session.page.getByRole("separator", { name: "Resize sidebar" })
    await expect(shellHandle).toBeVisible()
    await session.page.getByRole("button", { name: "Resources", exact: true }).click()
    await expect(session.page.getByRole("heading", { level: 1, name: "Resources" })).toBeVisible()
    expect(await sidebarWidth(session.page)).toBe(240)
    expect(await invokeNative<unknown>(session.page, "preflight_get_layout")).toBeNull()
    expect(await session.page.evaluate(() => window.localStorage.length)).toBe(0)
    const shellAccessibility = await new AxeBuilder({ page: session.page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze()
    expect(shellAccessibility.violations).toEqual([])

    await session.page.goto(proofHarnessUrl(session.page.url()))
    await expect(session.page.locator("body")).toHaveAttribute(
      "data-harness-entry",
      "merlin-proof-harness-entry-v1",
    )
    await waitForNativeReady(session.page)
    await expect(
      session.page.getByTestId("milkdown-editor-host").locator("[contenteditable='true']"),
    ).toHaveAccessibleName("Markdown rich editor")
    expect(await session.page.evaluate(() => window.localStorage.length)).toBe(0)
    await expect(session.page.locator("html")).toHaveAttribute("data-theme", "merlin-dark")
    await expect(session.page.locator("html")).toHaveAttribute("data-density", "default")
    await expect(session.page.locator("html")).not.toHaveAttribute("data-force-reduced-motion")
    await expect(session.page.locator("html")).toHaveCSS("color-scheme", "dark")
    await expect(session.page.locator(".merlin-control").first()).toHaveCSS("min-height", "32px")
    await expect(session.page.locator("#markdown-fixture")).toHaveCSS("color-scheme", "dark")
    const nativeHairline = await session.page
      .locator(".merlin-surface")
      .first()
      .evaluate((element) => {
        const style = getComputedStyle(element)
        return {
          declared: style.getPropertyValue("--border-width").trim(),
          width: Number.parseFloat(style.borderTopWidth),
          devicePixelRatio: window.devicePixelRatio,
        }
      })
    expect(Number.parseFloat(nativeHairline.declared)).toBe(0.5)
    expect(nativeHairline.declared.endsWith("px")).toBe(true)
    expect(nativeHairline.width).toBeGreaterThanOrEqual(0.5)
    expect(nativeHairline.width).toBeLessThanOrEqual(1)
    expect(nativeHairline.devicePixelRatio).toBeGreaterThan(0)
    test.info().annotations.push({
      type: "native WebView2 device scale",
      description: JSON.stringify(nativeHairline),
    })

    await session.page.getByRole("button", { name: "Collapse Docs" }).click()
    await expect(session.page.getByTestId("layout-status")).toHaveText("Layout saved to SQLite")
    const saved = await layout(session.page)
    expect(saved.panels[0]!.collapsed).toBe(true)
    await invokeNative<ApplicationSettings>(session.page, "settings_set_density", {
      density: "compact",
    })
    await invokeNative<ApplicationSettings>(session.page, "settings_set_reduce_motion", {
      forceReducedMotion: true,
    })

    session = await restartWebView2(session)
    observeErrors(session.page)
    await expectShellReady(session.page)
    await expect(session.page.locator("html")).toHaveAttribute("data-density", "compact")
    await expect(session.page.locator("html")).toHaveAttribute("data-force-reduced-motion", "true")
    await expect(session.page.locator("html")).toHaveAttribute("data-theme", "merlin-dark")
    expect(await sidebarWidth(session.page)).toBe(240)
    const settings = await invokeNative<ApplicationSettings>(session.page, "settings_get")
    expect(settings.density).toBe("compact")
    expect(settings.forceReducedMotion).toBe(true)
    expect(settings.usedDefaults).toBe(false)

    await session.page.goto(proofHarnessUrl(session.page.url()))
    await expect(session.page.locator("body")).toHaveAttribute(
      "data-harness-entry",
      "merlin-proof-harness-entry-v1",
    )
    await waitForNativeReady(session.page)
    expect(await layout(session.page)).toEqual(saved)
    await expect(session.page.locator("html")).toHaveAttribute("data-density", "compact")
    await expect(session.page.locator("html")).toHaveAttribute("data-force-reduced-motion", "true")
    await expect(session.page.locator("html")).toHaveAttribute("data-theme", "merlin-dark")
    await expect(session.page.locator("html")).toHaveCSS("color-scheme", "dark")
    await expect(session.page.locator(".merlin-control").first()).toHaveCSS("min-height", "28px")
    expect(await session.page.evaluate(() => window.localStorage.length)).toBe(0)
    expect(consoleErrors).toEqual([])
  } finally {
    if (session) await stopWebView2(session)
  }
})

test("project registration and docs-root confirmation persist through a native restart", async () => {
  test.setTimeout(360_000)
  prepareWebView2Artifacts()
  const repositoryDirectory = path.join(process.cwd(), "test-results", "webview2", "p2-repository")
  rmSync(repositoryDirectory, { recursive: true, force: true })
  const docsDirectory = path.join(repositoryDirectory, "docs")
  mkdirSync(path.join(docsDirectory, "personal"), { recursive: true })
  mkdirSync(path.join(docsDirectory, "diagrams"), { recursive: true })
  mkdirSync(path.join(docsDirectory, ".git"), { recursive: true })
  const guideSource = "# WebView2 guide\n\nA **safe** paragraph.\n"
  const notesSource = "---\ntitle: Personal notes\n---\n\n# Notes\n\nKeep this source.\n"
  const mdxSource = "import { Chart } from './Chart.js'\n\n# Chart\n\n<Chart value={1} />\n"
  writeFileSync(path.join(docsDirectory, "guide.md"), guideSource)
  writeFileSync(path.join(docsDirectory, "personal", "notes.md"), notesSource)
  writeFileSync(path.join(docsDirectory, "diagrams", "flow.mdx"), mdxSource)
  writeFileSync(path.join(docsDirectory, "asset.bin"), Buffer.from([0, 159, 146, 150]))
  writeFileSync(path.join(docsDirectory, ".git", "config"), "[remote]\n\turl = not-a-document\n")
  let session: WebView2Session | undefined
  const consoleErrors: string[] = []
  const observeErrors = (page: Page) => {
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text())
    })
  }

  try {
    session = await startWebView2()
    observeErrors(session.page)
    await expectShellReady(session.page)
    await session.page.getByRole("button", { name: "Projects", exact: true }).click()
    await expect(session.page.getByRole("heading", { level: 1, name: "Projects" })).toBeVisible()
    await expect(session.page.getByText(/No projects yet/)).toBeVisible()

    await session.page.getByRole("button", { name: "New project" }).click()
    const createDialog = session.page.getByRole("dialog", { name: "New project" })
    await createDialog.getByRole("textbox", { name: "Name" }).fill("WebView2 project")
    await createDialog
      .getByRole("textbox", { name: "Description" })
      .fill("Project registration proof")
    await createDialog.getByRole("button", { name: "Create project" }).click()
    await expect(createDialog).toBeHidden()
    await expect(session.page.getByRole("button", { name: /WebView2 project/ })).toBeVisible()
    const detail = session.page.getByRole("region", { name: "Project registration" })
    await expect(detail.getByText(/Merlin Project Store/)).toBeVisible()
    const projectsAccessibility = await new AxeBuilder({ page: session.page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze()
    expect(projectsAccessibility.violations).toEqual([])

    await detail.getByRole("button", { name: "Connect repository" }).click()
    const connectDialog = session.page.getByRole("dialog", { name: "Connect repository" })
    const dialogAccessibility = await new AxeBuilder({ page: session.page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze()
    expect(dialogAccessibility.violations).toEqual([])
    await connectDialog
      .getByRole("textbox", { name: "Repository folder" })
      .fill(repositoryDirectory)
    await connectDialog.getByRole("button", { name: "Connect repository" }).click()
    await expect(connectDialog).toBeHidden()
    await expect(detail.getByText(repositoryDirectory)).toBeVisible()

    await detail.getByRole("button", { name: "Confirm docs folder" }).click()
    const docsDialog = session.page.getByRole("dialog", { name: "Use docs as the Docs root?" })
    await docsDialog.getByRole("button", { name: "Confirm docs root" }).click()
    await expect(docsDialog).toBeHidden()
    await expect(session.page.getByText("Docs root confirmed.")).toBeVisible()
    await expect(detail.getByText(/docs · Available/)).toBeVisible()

    const docsBrowser = session.page.getByRole("region", { name: "Docs browser" })
    await docsBrowser.getByRole("button", { name: "Refresh manifest" }).click()
    await expect(docsBrowser.getByText(/Manifest refreshed\./)).toBeVisible()
    await expect(docsBrowser.getByRole("treeitem", { name: "guide.md" })).toBeVisible()
    await expect(docsBrowser.getByRole("treeitem", { name: "personal" })).toBeVisible()
    await expect(docsBrowser.getByRole("treeitem", { name: "notes.md" })).toBeVisible()
    await expect(docsBrowser.getByRole("treeitem", { name: "flow.mdx" })).toBeVisible()
    await expect(docsBrowser.getByRole("treeitem", { name: /asset\.bin/ })).toBeVisible()
    await expect(docsBrowser.getByRole("treeitem", { name: ".git" })).toHaveCount(0)

    await docsBrowser.getByRole("treeitem", { name: "guide.md" }).click()
    await expect(
      docsBrowser.getByRole("heading", { level: 1, name: "WebView2 guide" }),
    ).toBeVisible()
    await docsBrowser.getByRole("button", { name: "Source" }).click()
    expect(await docsBrowser.getByLabel("Document source").textContent()).toBe(guideSource)

    await docsBrowser.getByRole("treeitem", { name: "notes.md" }).click()
    await expect(docsBrowser.getByText(/Source fallback for frontmatter/)).toBeVisible()
    expect(await docsBrowser.getByLabel("Document source").textContent()).toBe(notesSource)

    await docsBrowser.getByRole("treeitem", { name: "flow.mdx" }).click()
    await expect(docsBrowser.getByText(/MDX is shown as inert source/)).toBeVisible()
    expect(await docsBrowser.getByLabel("Document source").textContent()).toBe(mdxSource)

    await docsBrowser.getByRole("treeitem", { name: /asset\.bin/ }).click()
    await expect(docsBrowser.getByText(/not a Markdown document/)).toBeVisible()

    const docsAccessibility = await new AxeBuilder({ page: session.page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze()
    expect(docsAccessibility.violations).toEqual([])
    expect(
      await session.page.evaluate(() => ({
        local: window.localStorage.length,
        session: window.sessionStorage.length,
      })),
    ).toEqual({ local: 0, session: 0 })

    session = await restartWebView2(session)
    observeErrors(session.page)
    await expectShellReady(session.page)
    await session.page.getByRole("button", { name: "Projects", exact: true }).click()
    await expect(session.page.getByRole("heading", { level: 1, name: "Projects" })).toBeVisible()
    await expect(session.page.getByRole("button", { name: /WebView2 project/ })).toBeVisible()
    const restartedDetail = session.page.getByRole("region", { name: "Project registration" })
    await expect(restartedDetail.getByText(repositoryDirectory)).toBeVisible()
    await expect(restartedDetail.getByText(/docs · Available/)).toBeVisible()
    const restartedDocs = session.page.getByRole("region", { name: "Docs browser" })
    await expect(restartedDocs.getByRole("treeitem", { name: "guide.md" })).toBeVisible()
    await expect(restartedDocs.getByRole("button", { name: "Refresh manifest" })).toBeVisible()
    expect(consoleErrors).toEqual([])
  } finally {
    if (session) await stopWebView2(session)
  }
})
