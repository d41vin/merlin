import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { Input } from "./input"
import { Label } from "./label"

describe("input", () => {
  it("associates with a label and accepts typed text", async () => {
    const user = userEvent.setup()
    render(
      <>
        <Label htmlFor="display-name">Display name</Label>
        <Input id="display-name" />
      </>,
    )

    const input = screen.getByRole("textbox", { name: "Display name" })
    await user.type(input, "Example")

    expect(input).toHaveValue("Example")
    expect(input).toHaveFocus()
    expect(input).toHaveAttribute("data-slot", "input")
  })

  it("exposes disabled and invalid states with a described error", () => {
    render(
      <>
        <Label htmlFor="disabled-field">Disabled field</Label>
        <Input id="disabled-field" disabled />
        <Label htmlFor="invalid-field">Invalid field</Label>
        <Input id="invalid-field" aria-invalid="true" aria-describedby="invalid-help" />
        <p id="invalid-help">Enter a value.</p>
      </>,
    )

    expect(screen.getByRole("textbox", { name: "Disabled field" })).toBeDisabled()
    const invalid = screen.getByRole("textbox", { name: "Invalid field" })
    expect(invalid).toHaveAttribute("aria-invalid", "true")
    expect(invalid).toHaveAccessibleDescription("Enter a value.")
  })
})
