import { readFileSync } from "node:fs"

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
    await session.page.goto(proofHarnessUrl(session.page.url()))
    await waitForNativeReady(session.page)
    expect(await layout(session.page)).toEqual(persisted)
    const restoredSettings = await invokeNative<ApplicationSettings>(session.page, "settings_get")
    expect(restoredSettings.density).toBe("compact")
    expect(restoredSettings.forceReducedMotion).toBe(true)
    expect(restoredSettings.usedDefaults).toBe(false)
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
    await session.page.goto(proofHarnessUrl(session.page.url()))
    await expect(session.page.locator("body")).toHaveAttribute(
      "data-harness-entry",
      "merlin-proof-harness-entry-v1",
    )
    await waitForNativeReady(session.page)
    expect(await layout(session.page)).toEqual(saved)
    const settings = await invokeNative<ApplicationSettings>(session.page, "settings_get")
    expect(settings.density).toBe("compact")
    expect(settings.forceReducedMotion).toBe(true)
    expect(settings.usedDefaults).toBe(false)
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
