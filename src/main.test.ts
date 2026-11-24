import { describe, expect, it, vi } from "vitest"

const { calls } = vi.hoisted(() => ({ calls: [] as string[] }))

vi.mock("react-dom/client", () => ({
  createRoot: () => ({
    render: () => {
      calls.push("render")
    },
  }),
}))
vi.mock("./App", () => ({ App: () => null }))
vi.mock("./settings/apply", () => ({
  applyApplicationSettings: () => {
    calls.push("apply")
  },
}))

describe("application bootstrap", () => {
  it("applies synchronous defaults before the first React render", async () => {
    calls.length = 0
    document.body.innerHTML = '<div id="root"></div>'
    await import("./main")
    expect(calls).toEqual(["apply", "render"])
  })
})
