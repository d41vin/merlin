import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { describe, expect, it } from "vitest"

import { INITIAL_DESTINATION, type DestinationId } from "@/app/navigation"

import { PrimaryNavigation } from "./PrimaryNavigation"

function NavigationHarness() {
  const [activeDestination, setActiveDestination] = useState<DestinationId>(INITIAL_DESTINATION)
  return (
    <PrimaryNavigation activeDestination={activeDestination} onNavigate={setActiveDestination} />
  )
}

function getButtons() {
  const navigation = screen.getByRole("navigation", { name: "Primary navigation" })
  return within(navigation).getAllByRole("button")
}

describe("primary navigation", () => {
  it("renders exactly three enabled destination buttons with one current destination", () => {
    render(<NavigationHarness />)
    const buttons = getButtons()
    expect(buttons).toHaveLength(3)
    expect(buttons.map((button) => button.textContent)).toEqual([
      "Overview",
      "Projects",
      "Resources",
    ])
    for (const button of buttons) {
      expect(button).toBeEnabled()
      expect(button).toHaveAttribute("type", "button")
      expect(button.tabIndex).toBe(0)
    }
    expect(buttons[0]).toHaveAttribute("aria-current", "page")
    expect(buttons[1]).not.toHaveAttribute("aria-current")
    expect(buttons[2]).not.toHaveAttribute("aria-current")
  })

  it("switches destinations by pointer and keyboard while retaining focus", async () => {
    const user = userEvent.setup()
    render(<NavigationHarness />)
    const [overview, projects, resources] = getButtons()

    await user.click(projects)
    expect(projects).toHaveAttribute("aria-current", "page")
    expect(overview).not.toHaveAttribute("aria-current")
    expect(projects).toHaveFocus()

    await user.keyboard("{Tab}")
    expect(resources).toHaveFocus()
    await user.keyboard("{Enter}")
    expect(resources).toHaveAttribute("aria-current", "page")
    expect(resources).toHaveFocus()

    overview.focus()
    expect(overview).toHaveFocus()
    await user.keyboard(" ")
    expect(overview).toHaveAttribute("aria-current", "page")
    expect(overview).toHaveFocus()
    expect(projects).not.toHaveAttribute("aria-current")
    expect(resources).not.toHaveAttribute("aria-current")
  })
})
