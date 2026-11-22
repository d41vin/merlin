import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from "node:child_process"
import { createWriteStream, mkdirSync, rmSync } from "node:fs"
import path from "node:path"

import { chromium, type Browser, type Page } from "playwright"

export type WebView2Mode = "development-harness" | "optimized-harness"

export interface WebView2Session {
  browser: Browser
  page: Page
  process: ChildProcessWithoutNullStreams
  mode: WebView2Mode
}

const repoRoot = process.cwd()
const artifactRoot = path.join(repoRoot, "test-results", "webview2")
const dataDirectory = path.join(artifactRoot, "data")
const profileDirectory = path.join(artifactRoot, "profile")
const logPath = path.join(artifactRoot, "process.log")
const port = Number(process.env.MERLIN_WEBVIEW2_DEBUG_PORT ?? 9333)
export function prepareWebView2Artifacts() {
  mkdirSync(artifactRoot, { recursive: true })
  rmSync(dataDirectory, { recursive: true, force: true })
  rmSync(profileDirectory, { recursive: true, force: true })
  rmSync(logPath, { force: true })
}

export async function startWebView2(
  mode: WebView2Mode = "development-harness",
): Promise<WebView2Session> {
  mkdirSync(artifactRoot, { recursive: true })
  const log = createWriteStream(logPath, { flags: "a" })
  const optimizedHarnessExecutable = path.join(
    repoRoot,
    "src-tauri",
    "target",
    "test-harness",
    "release",
    "merlin-test-harness.exe",
  )
  const processCommand =
    mode === "optimized-harness"
      ? optimizedHarnessExecutable
      : process.platform === "win32"
        ? "powershell.exe"
        : "pnpm"
  const processArguments =
    mode === "optimized-harness"
      ? []
      : process.platform === "win32"
        ? [
            "-NoProfile",
            "-File",
            "scripts/native-harness.ps1",
            "pnpm",
            "exec",
            "tauri",
            "dev",
            "--no-watch",
            "--features",
            "test-harness",
          ]
        : ["tauri", "dev", "--no-watch", "--features", "test-harness"]
  const child = spawn(processCommand, processArguments, {
    cwd: repoRoot,
    env: {
      ...process.env,
      MERLIN_TEST_HARNESS_BUILD: "1",
      MERLIN_TEST_MODE: "1",
      MERLIN_TEST_DATA_DIR: dataDirectory,
      WEBVIEW2_USER_DATA_FOLDER: profileDirectory,
      WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${port} --remote-allow-origins=*`,
    },
    stdio: "pipe",
    windowsHide: true,
  })
  child.stdout.pipe(log, { end: false })
  child.stderr.pipe(log, { end: false })

  let exitCode: number | null = null
  child.once("exit", (code) => {
    exitCode = code
  })
  child.once("close", () => {
    log.end()
  })

  try {
    await waitForCdp(child, () => exitCode)
    const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`, {
      timeout: 30_000,
    })
    const page = await waitForApplicationPage(browser)
    await page.waitForLoadState("domcontentloaded")
    return { browser, page, process: child, mode }
  } catch (error) {
    stopProcess(child)
    throw error
  }
}

export async function restartWebView2(session: WebView2Session): Promise<WebView2Session> {
  await session.browser.close()
  stopProcess(session.process)
  return startWebView2(session.mode)
}

export async function stopWebView2(session: WebView2Session) {
  await session.browser.close()
  stopProcess(session.process)
}

function stopProcess(child: ChildProcessWithoutNullStreams) {
  if (child.exitCode !== null || child.signalCode !== null) return
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
      windowsHide: true,
      stdio: "ignore",
    })
  } else {
    child.kill("SIGTERM")
  }
}

async function waitForCdp(child: ChildProcessWithoutNullStreams, getExitCode: () => number | null) {
  const deadline = Date.now() + 240_000
  let lastError = "CDP endpoint did not become ready"
  while (Date.now() < deadline) {
    if (getExitCode() !== null) {
      throw new Error(
        `Tauri harness process exited before CDP readiness with code ${getExitCode()}`,
      )
    }
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`)
      if (response.ok) {
        const version = (await response.json()) as { webSocketDebuggerUrl?: string }
        if (version.webSocketDebuggerUrl) return
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : lastError
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  stopProcess(child)
  throw new Error(lastError)
}

async function waitForApplicationPage(browser: Browser): Promise<Page> {
  const deadline = Date.now() + 60_000
  while (Date.now() < deadline) {
    for (const context of browser.contexts()) {
      for (const page of context.pages()) {
        const url = page.url()
        if (
          url.includes("127.0.0.1:5173") ||
          url.includes("localhost:5173") ||
          url.includes("tauri.localhost")
        ) {
          return page
        }
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(
    "The Tauri application page was not exposed through the isolated WebView2 CDP port",
  )
}
