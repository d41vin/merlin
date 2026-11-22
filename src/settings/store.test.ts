import { beforeEach, describe, expect, it, vi } from "vitest"

import { DEFAULT_APPLICATION_SETTINGS } from "./model"
import { createApplicationSettingsStore } from "./store"

const { invokeMock } = vi.hoisted(() => ({ invokeMock: vi.fn() }))
vi.mock("@tauri-apps/api/core", () => ({ invoke: invokeMock }))

describe("application settings persistence transport", () => {
  beforeEach(() => {
    invokeMock.mockReset()
    delete window.__TAURI_INTERNALS__
    window.localStorage.clear()
  })

  it("uses only the four typed Tauri commands and no browser persistence", async () => {
    window.__TAURI_INTERNALS__ = {}
    const compact = {
      ...DEFAULT_APPLICATION_SETTINGS,
      density: "compact" as const,
      forceReducedMotion: true,
    }
    invokeMock
      .mockResolvedValueOnce(DEFAULT_APPLICATION_SETTINGS)
      .mockResolvedValueOnce(DEFAULT_APPLICATION_SETTINGS)
      .mockResolvedValueOnce(compact)
      .mockResolvedValueOnce(compact)
    const getItem = vi.spyOn(Storage.prototype, "getItem")
    const setItem = vi.spyOn(Storage.prototype, "setItem")
    const store = createApplicationSettingsStore()

    expect(store.kind).toBe("sqlite")
    await expect(store.load()).resolves.toEqual(DEFAULT_APPLICATION_SETTINGS)
    await expect(store.setTheme("merlin-dark")).resolves.toEqual(DEFAULT_APPLICATION_SETTINGS)
    await expect(store.setDensity("compact")).resolves.toEqual(compact)
    await expect(store.setReducedMotion(true)).resolves.toEqual(compact)
    expect(invokeMock.mock.calls).toEqual([
      ["settings_get"],
      ["settings_set_theme", { theme: "merlin-dark" }],
      ["settings_set_density", { density: "compact" }],
      ["settings_set_reduce_motion", { forceReducedMotion: true }],
    ])
    expect(getItem).not.toHaveBeenCalled()
    expect(setItem).not.toHaveBeenCalled()
  })

  it("revalidates native responses without reflecting invalid values", async () => {
    window.__TAURI_INTERNALS__ = {}
    const canary = "sk-test-DO-NOT-REFLECT"
    invokeMock.mockResolvedValue({ ...DEFAULT_APPLICATION_SETTINGS, themeSlug: canary })
    const store = createApplicationSettingsStore()
    await expect(store.load()).rejects.toThrow("Application settings snapshot is invalid")
    await expect(store.load()).rejects.not.toThrow(canary)
  })

  it("returns browser defaults but reports unavailable native writes without localStorage", async () => {
    const store = createApplicationSettingsStore()
    expect(store.kind).toBe("browser-unavailable")
    await expect(store.load()).resolves.toEqual(DEFAULT_APPLICATION_SETTINGS)
    await expect(store.setTheme("merlin-dark")).rejects.toThrow(
      "Native settings persistence is unavailable outside Tauri",
    )
    await expect(store.setDensity("compact")).rejects.toThrow(
      "Native settings persistence is unavailable outside Tauri",
    )
    await expect(store.setReducedMotion(true)).rejects.toThrow(
      "Native settings persistence is unavailable outside Tauri",
    )
    expect(window.localStorage.length).toBe(0)
  })
})
