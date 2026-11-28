import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { Button } from "./button"
import { Dialog } from "./dialog"
import { Input } from "./input"
import { Label } from "./label"

function DialogHarness() {
  return (
    <Dialog
      trigger={<Button type="button">Open dialog</Button>}
      title="Example dialog"
      description="A dialog used to verify focus behavior."
    >
      <Label htmlFor="dialog-name">Dialog field</Label>
      <Input id="dialog-name" />
    </Dialog>
  )
}

describe("dialog", () => {
  it("opens with labelled content, moves focus inside, and closes on Escape", async () => {
    const user = userEvent.setup()
    render(<DialogHarness />)

    const trigger = screen.getByRole("button", { name: "Open dialog" })
    await user.click(trigger)
    const dialog = await screen.findByRole("dialog", { name: "Example dialog" })
    expect(dialog).toHaveAccessibleDescription("A dialog used to verify focus behavior.")
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true))

    await user.keyboard("{Escape}")
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    expect(trigger).toHaveFocus()
  })

  it("closes with the close control and restores focus to the trigger", async () => {
    const user = userEvent.setup()
    render(<DialogHarness />)

    const trigger = screen.getByRole("button", { name: "Open dialog" })
    await user.click(trigger)
    await screen.findByRole("dialog", { name: "Example dialog" })
    await user.click(screen.getByRole("button", { name: "Close" }))

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    expect(trigger).toHaveFocus()
  })
})
