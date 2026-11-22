import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { PanelLayout } from "@/layout/model"
import type { LayoutStore } from "@/layout/store"

import { PanelProof } from "./PanelProof"

const load = vi.fn<() => Promise<PanelLayout | null>>()
const save = vi.fn<() => Promise<void>>()
const store: LayoutStore = {
  kind: "sqlite",
  load,
  save,
}

function currentLayout() {
  return JSON.parse(screen.getByTestId("layout-json").textContent ?? "{}") as {
    panels: { id: string; size: number; restoreSize: number; collapsed: boolean }[]
  }
}

describe("controlled UI SDK panel proof", () => {
  beforeEach(() => {
    load.mockReset().mockResolvedValue(null)
    save.mockReset().mockResolvedValue(undefined)
  })

  it("supports keyboard resize, collapse/restore, reset, labels, and save commits", async () => {
    const user = userEvent.setup()
    render(<PanelProof store={store} />)
    await screen.findByText("SQLite layout ready")

    const handles = screen.getAllByRole("separator")
    expect(handles).toHaveLength(3)
    expect(handles[0]).toHaveAccessibleName("Resize Docs and Todos")
    expect(handles[0]).toHaveAttribute("aria-valuenow")
    expect(handles[0]).toHaveAttribute("tabindex", "0")

    handles[0]!.focus()
    expect(handles[0]).toHaveFocus()
    await user.keyboard("{ArrowRight}")
    await waitFor(() => expect(currentLayout().panels[0]!.size).not.toBe(25))
    expect(save).toHaveBeenCalled()

    const resized = currentLayout().panels[0]!.size
    await user.click(screen.getByRole("button", { name: "Collapse Docs" }))
    await waitFor(() => expect(currentLayout().panels[0]!.collapsed).toBe(true))
    expect(currentLayout().panels[0]!.restoreSize).toBe(resized)
    expect(screen.getByTestId("panel-docs")).toHaveAttribute("data-collapsed")

    handles[0]!.focus()
    await user.keyboard("{Enter}")
    await waitFor(() => expect(currentLayout().panels[0]!.collapsed).toBe(false))
    expect(currentLayout().panels[0]!.size).toBeCloseTo(resized)

    await user.click(screen.getByRole("button", { name: "Reset panel layout" }))
    await waitFor(() =>
      expect(currentLayout().panels.map((panel) => panel.size)).toEqual([25, 25, 25, 25]),
    )
    expect(save.mock.calls.length).toBeGreaterThanOrEqual(3)
    expect(window.localStorage.length).toBe(0)
  }, 30_000)

  it("restores a validated SQLite snapshot without localStorage", async () => {
    const saved = {
      version: 1 as const,
      panels: [
        { id: "docs" as const, size: 40, restoreSize: 40, collapsed: false },
        { id: "todos" as const, size: 0, restoreSize: 20, collapsed: true },
        { id: "activity" as const, size: 35, restoreSize: 35, collapsed: false },
        { id: "resources" as const, size: 25, restoreSize: 25, collapsed: false },
      ],
    }
    load.mockResolvedValue(saved)
    render(<PanelProof store={store} />)
    await screen.findByText("SQLite layout ready")
    expect(currentLayout()).toEqual(saved)
    expect(screen.getByTestId("panel-todos")).toHaveAttribute("data-collapsed")
    expect(window.localStorage.length).toBe(0)
  }, 30_000)
})
