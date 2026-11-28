import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { SETTINGS_LOAD_FAILURE_MESSAGE, StatusMessage } from "./StatusMessage"

describe("status message", () => {
  it("renders a polite status region with the fixed content-free message", () => {
    render(<StatusMessage />)
    const status = screen.getByRole("status")
    expect(status).toHaveAttribute("aria-live", "polite")
    expect(status.textContent).toBe(SETTINGS_LOAD_FAILURE_MESSAGE)
    expect(status.textContent).not.toMatch(/error|exception|stack|canary/i)
  })
})
