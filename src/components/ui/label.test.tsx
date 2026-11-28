import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { Input } from "./input"
import { Label } from "./label"

describe("label", () => {
  it("associates explicitly with a control and focuses it on click", async () => {
    const user = userEvent.setup()
    render(
      <>
        <Label htmlFor="labeled-field">Labeled field</Label>
        <Input id="labeled-field" />
      </>,
    )

    const label = screen.getByText("Labeled field")
    expect(label).toHaveAttribute("data-slot", "label")
    expect(label).toHaveAttribute("for", "labeled-field")
    expect(screen.getByRole("textbox", { name: "Labeled field" })).toBeInTheDocument()

    await user.click(label)
    expect(screen.getByRole("textbox", { name: "Labeled field" })).toHaveFocus()
  })

  it("merges an additional class without dropping token styling", () => {
    render(<Label className="merlin-layout-width">Custom label</Label>)
    const label = screen.getByText("Custom label")
    expect(label).toHaveClass("merlin-label")
    expect(label).toHaveClass("merlin-layout-width")
  })
})
