import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { Label } from "./label"
import { Textarea } from "./textarea"

describe("textarea", () => {
  it("associates with a label and accepts multi-line text", async () => {
    const user = userEvent.setup()
    render(
      <>
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" />
      </>,
    )

    const textarea = screen.getByRole("textbox", { name: "Notes" })
    await user.type(textarea, "First line{enter}Second line")

    expect(textarea).toHaveValue("First line\nSecond line")
    expect(textarea).toHaveFocus()
    expect(textarea).toHaveAttribute("data-slot", "textarea")
  })

  it("exposes disabled and invalid states", () => {
    render(
      <>
        <Label htmlFor="disabled-notes">Disabled notes</Label>
        <Textarea id="disabled-notes" disabled />
        <Label htmlFor="invalid-notes">Invalid notes</Label>
        <Textarea id="invalid-notes" aria-invalid="true" />
      </>,
    )

    expect(screen.getByRole("textbox", { name: "Disabled notes" })).toBeDisabled()
    expect(screen.getByRole("textbox", { name: "Invalid notes" })).toHaveAttribute(
      "aria-invalid",
      "true",
    )
  })
})
