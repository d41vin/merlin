import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { SETTINGS_LOAD_FAILURE_MESSAGE } from "@/components/common/StatusMessage"
import { OVERVIEW_UNAVAILABLE_DESCRIPTION } from "@/features/overview/OverviewPage"
import { PROJECTS_UNAVAILABLE_DESCRIPTION } from "@/projects/copy"
import { RESOURCES_UNAVAILABLE_DESCRIPTION } from "@/features/resources/ResourcesPage"
import { defaultApplicationSettings } from "@/settings/model"

import { AppShell } from "./AppShell"

const { loadMock } = vi.hoisted(() => ({ loadMock: vi.fn<() => Promise<unknown>>() }))

vi.mock("@/settings/store", () => ({
  createApplicationSettingsStore: () => ({
    kind: "browser-unavailable" as const,
    load: loadMock,
    setTheme: vi.fn(),
    setDensity: vi.fn(),
    setReducedMotion: vi.fn(),
  }),
}))

function resetRootAttributes() {
  document.documentElement.dataset.theme = "merlin-dark"
  delete document.documentElement.dataset.density
  delete document.documentElement.dataset.forceReducedMotion
}

describe("application shell", () => {
  beforeEach(() => {
    loadMock.mockReset()
    loadMock.mockResolvedValue(defaultApplicationSettings())
    resetRootAttributes()
  })

  it("starts on Overview, switches destinations, and keeps focus on the activated control", async () => {
    const user = userEvent.setup()
    render(<AppShell />)
    await waitFor(() => expect(document.documentElement.dataset.density).toBe("default"))
    expect(screen.queryByRole("status")).toBeNull()

    const nav = screen.getByRole("navigation", { name: "Primary navigation" })
    const [overview, projects, resources] = within(nav).getAllByRole("button")
    expect([overview.textContent, projects.textContent, resources.textContent]).toEqual([
      "Overview",
      "Projects",
      "Resources",
    ])

    expect(screen.getByRole("main", { name: "Overview" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 1, name: "Overview" })).toBeInTheDocument()
    expect(screen.getByText(OVERVIEW_UNAVAILABLE_DESCRIPTION, { exact: true })).toBeInTheDocument()
    expect(overview).toHaveAttribute("aria-current", "page")
    expect(projects).not.toHaveAttribute("aria-current")
    expect(resources).not.toHaveAttribute("aria-current")

    await user.click(projects)
    expect(projects).toHaveFocus()
    expect(projects).toHaveAttribute("aria-current", "page")
    expect(overview).not.toHaveAttribute("aria-current")
    expect(screen.getByRole("heading", { level: 1, name: "Projects" })).toBeInTheDocument()
    expect(screen.getByRole("main", { name: "Projects" })).toBeInTheDocument()
    expect(screen.getByText(PROJECTS_UNAVAILABLE_DESCRIPTION, { exact: true })).toBeInTheDocument()

    await user.keyboard("{Tab}")
    expect(resources).toHaveFocus()
    await user.keyboard("{Enter}")
    expect(resources).toHaveAttribute("aria-current", "page")
    expect(resources).toHaveFocus()
    expect(screen.getByRole("heading", { level: 1, name: "Resources" })).toBeInTheDocument()
    expect(screen.getByRole("main", { name: "Resources" })).toBeInTheDocument()
    expect(screen.getByText(RESOURCES_UNAVAILABLE_DESCRIPTION, { exact: true })).toBeInTheDocument()

    await user.tab({ shift: true })
    expect(projects).toHaveFocus()
    await user.tab({ shift: true })
    expect(overview).toHaveFocus()

    overview.focus()
    await user.keyboard(" ")
    expect(overview).toHaveAttribute("aria-current", "page")
    expect(overview).toHaveFocus()
    expect(
      within(nav)
        .getAllByRole("button")
        .filter((button) => button.getAttribute("aria-current") === "page"),
    ).toEqual([overview])
  })

  it("exposes a named, keyboard-focusable sidebar resize handle", async () => {
    render(<AppShell />)
    await waitFor(() => expect(document.documentElement.dataset.density).toBe("default"))

    const handle = screen.getByRole("separator", { name: "Resize sidebar" })
    expect(handle).toHaveAttribute("tabindex", "0")
    expect(handle).toHaveAttribute("aria-orientation", "vertical")
    expect(handle).toHaveAttribute("aria-controls", "merlin-sidebar")
    expect(handle).toHaveAttribute("data-slot", "resizable-handle")

    handle.focus()
    expect(handle).toHaveFocus()
    expect(window.localStorage.length).toBe(0)
    expect(window.sessionStorage.length).toBe(0)
  })

  it("applies a successful settings load without showing a status message", async () => {
    loadMock.mockResolvedValue({
      version: 1,
      themeSlug: "merlin-dark",
      density: "compact",
      forceReducedMotion: true,
      usedDefaults: true,
    })
    render(<AppShell />)
    await waitFor(() => {
      expect(document.documentElement.dataset.density).toBe("compact")
      expect(document.documentElement).toHaveAttribute("data-force-reduced-motion", "true")
    })
    expect(screen.queryByRole("status")).toBeNull()
  })

  it("applies safe defaults and shows a fixed status without reflecting a rejected error", async () => {
    const canary = "canary-settings-rejection-45d2"
    loadMock.mockRejectedValue(new Error(`settings load failed: ${canary}`))
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})

    render(<AppShell />)
    const status = await screen.findByRole("status")
    expect(status.textContent).toBe(SETTINGS_LOAD_FAILURE_MESSAGE)
    expect(status).toHaveAttribute("aria-live", "polite")
    expect(document.documentElement.dataset.theme).toBe("merlin-dark")
    expect(document.documentElement.dataset.density).toBe("default")
    expect(document.documentElement).not.toHaveAttribute("data-force-reduced-motion")
    expect(document.body.textContent).not.toContain(canary)
    expect(consoleError).not.toHaveBeenCalled()
  })
})
