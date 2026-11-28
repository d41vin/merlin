import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { UnavailableState } from "./UnavailableState"

const DESCRIPTION = "Project records and the project workbench are not implemented in this build."

describe("unavailable state", () => {
  it("presents a heading and description with honest not-implemented wording", () => {
    render(<UnavailableState description={DESCRIPTION} />)
    expect(
      screen.getByRole("heading", { level: 2, name: "Not implemented in this build" }),
    ).toBeInTheDocument()
    expect(screen.getByText(DESCRIPTION, { exact: true })).toBeInTheDocument()
  })

  it("contains no fabricated controls, data, or empty-dataset wording", () => {
    render(<UnavailableState description={DESCRIPTION} />)
    for (const role of ["button", "link", "textbox", "table", "list"] as const) {
      expect(screen.queryByRole(role)).toBeNull()
    }
    expect(document.body.textContent).not.toMatch(/\b(no|empty)\b[^.]*\byet\b/i)
    expect(document.body.textContent).not.toMatch(/new project|add resource/i)
  })
})
