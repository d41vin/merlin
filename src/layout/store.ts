import { invoke } from "@tauri-apps/api/core"

import type { PanelLayout } from "./model"

export interface LayoutStore {
  readonly kind: "sqlite" | "browser-unavailable"
  load(): Promise<PanelLayout | null>
  save(layout: PanelLayout): Promise<void>
}

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown
  }
}

export function createLayoutStore(): LayoutStore {
  if (typeof window !== "undefined" && window.__TAURI_INTERNALS__) {
    return {
      kind: "sqlite",
      async load() {
        return invoke<PanelLayout | null>("preflight_get_layout")
      },
      async save(layout) {
        await invoke("preflight_save_layout", { layout })
      },
    }
  }

  return {
    kind: "browser-unavailable",
    async load() {
      return null
    },
    async save() {
      throw new Error("SQLite layout persistence is only available inside the Tauri proof shell")
    },
  }
}
