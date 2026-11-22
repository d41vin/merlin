import { beforeEach, describe, expect, it, vi } from "vitest"

import { DEFAULT_PANEL_LAYOUT } from "./model"
import { createLayoutStore } from "./store"

const { invokeMock } = vi.hoisted(() => ({ invokeMock: vi.fn() }))
vi.mock("@tauri-apps/api/core", () => ({ invoke: invokeMock }))

describe("layout persistence transport", () => {
  beforeEach(() => {
    invokeMock.mockReset()
    delete window.__TAURI_INTERNALS__
    window.localStorage.clear()
  })

  it("uses only the two typed Tauri commands when the native bridge exists", async () => {
    window.__TAURI_INTERNALS__ = {}
    invokeMock.mockResolvedValueOnce(DEFAULT_PANEL_LAYOUT).mockResolvedValueOnce(undefined)
    const getItem = vi.spyOn(Storage.prototype, "getItem")
    const setItem = vi.spyOn(Storage.prototype, "setItem")
    const store = createLayoutStore()

    expect(store.kind).toBe("sqlite")
    await expect(store.load()).resolves.toEqual(DEFAULT_PANEL_LAYOUT)
    await store.save(DEFAULT_PANEL_LAYOUT)
    expect(invokeMock.mock.calls).toEqual([
      ["preflight_get_layout"],
      ["preflight_save_layout", { layout: DEFAULT_PANEL_LAYOUT }],
    ])
    expect(getItem).not.toHaveBeenCalled()
    expect(setItem).not.toHaveBeenCalled()
  })

  it("fails honestly when SQLite is unavailable instead of using localStorage", async () => {
    const store = createLayoutStore()
    expect(store.kind).toBe("browser-unavailable")
    await expect(store.load()).resolves.toBeNull()
    await expect(store.save(DEFAULT_PANEL_LAYOUT)).rejects.toThrow(
      /only available inside the Tauri/,
    )
    expect(window.localStorage.length).toBe(0)
  })
})
