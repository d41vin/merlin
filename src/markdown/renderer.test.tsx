import { getFixture } from "./fixtures"
import { DocumentRenderer } from "./renderer"
import { sanitizeMarkdown } from "./sanitize"
import { classifyDocumentLink } from "./url-policy"
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

describe("document URL policy", () => {
  it("accepts only explicit HTTPS, safe anchors, and confined relative-reference candidates", () => {
    expect(classifyDocumentLink("https://example.com/docs?x=1#part")).toEqual({
      kind: "external",
      value: "https://example.com/docs?x=1#part",
    })
    expect(classifyDocumentLink("#safe")).toEqual({ kind: "anchor", value: "#safe" })
    expect(classifyDocumentLink("guide/intro.md#safe")).toEqual({
      kind: "relative",
      value: "guide/intro.md#safe",
    })
    for (const unsafe of [
      "javascript:alert(1)",
      "file:///C:/secret",
      "data:text/html,hello",
      "http://example.com",
      "https://user:password@example.com/",
      "https://example.com\\@evil.example/",
      "../outside.md",
      "guide/../../outside.md",
      "/absolute/path.md",
      "C:/secret.md",
      "guide%2F..%2Foutside.md",
      "guide%5coutside.md",
      "guide.md#bad anchor",
      "",
    ]) {
      expect(classifyDocumentLink(unsafe).kind, unsafe).toBe("rejected")
    }
  })
})

describe("sanitized document renderer", () => {
  it("strips executable-capable HTML, event handlers, styles, and unlisted elements", () => {
    const fixture = getFixture("hostile-html")
    ;(window as Window & { __MERLIN_DOCUMENT_EXECUTED__?: boolean }).__MERLIN_DOCUMENT_EXECUTED__ =
      false
    const { container } = render(<DocumentRenderer source={fixture.source} />)

    expect(
      container.querySelector(
        "script,iframe,object,embed,svg,form,button,style,link,meta,template,[style],[onclick],[onerror],[onload]",
      ),
    ).toBeNull()
    expect(
      (window as Window & { __MERLIN_DOCUMENT_EXECUTED__?: boolean }).__MERLIN_DOCUMENT_EXECUTED__,
    ).toBe(false)
    expect(container.querySelectorAll("[data-url-policy='rejected']").length).toBeGreaterThan(0)
    expect(container.querySelector("[data-image-policy='blocked']")).toBeInTheDocument()
    expect(screen.getByText("code")).not.toHaveAttribute("class")

    const tree = sanitizeMarkdown(fixture.source)
    expect(tree.type).toBe("root")
  })

  it("renders safe HTML allowlist constructs and permanently disabled task inputs", () => {
    const source =
      '# Safe\n\n<details open id="document-id"><summary>More</summary><p>Allowed</p></details>\n\n- [x] Done\n'
    const { container } = render(<DocumentRenderer source={source} />)
    const details = container.querySelector("details")
    expect(details).not.toHaveAttribute("open")
    expect(details).not.toHaveAttribute("id")
    expect(screen.getByText("Allowed")).toBeInTheDocument()
    const checkbox = screen.getByRole("checkbox", { name: "Task completion status" })
    expect(checkbox).toBeDisabled()
    expect(checkbox).toBeChecked()
    expect(checkbox).toHaveAttribute("readonly")
  })

  it("keeps Mermaid inert and never creates remote or local fetchable image sources", () => {
    const { container } = render(
      <DocumentRenderer
        source={
          getFixture("mermaid").source +
          "\n![Remote](https://example.com/x.png)\n\n![Local](assets/x.png)\n"
        }
      />,
    )
    expect(container.querySelector("code[data-mermaid='inert']")).toHaveTextContent("flowchart TD")
    expect(container.querySelectorAll("svg, img")).toHaveLength(0)
    expect(container.querySelector("[data-local-image='assets/x.png']")).toBeInTheDocument()
    expect(container.querySelector("[data-image-policy='blocked']")).toBeInTheDocument()
  })

  it("keeps the complete MDX source inert without importing or evaluating expressions", () => {
    const source = getFixture("mdx").source
    const nativeOperation = vi.fn()
    ;(window as Window & { nativeOperation?: typeof nativeOperation }).nativeOperation =
      nativeOperation
    const { container } = render(<DocumentRenderer source={source} />)
    const inert = container.querySelector("pre[data-mdx-mode='inert-source']")
    expect(inert?.textContent).toBe(source)
    expect(container.querySelectorAll("Chart, chart, script")).toHaveLength(0)
    expect(nativeOperation).not.toHaveBeenCalled()
  })

  it("requires a user click before reporting an HTTPS link and never auto-navigates", () => {
    const listener = vi.fn()
    document.addEventListener("merlin:external-link", listener)
    const source = getFixture("links-images").source
    const { container } = render(<DocumentRenderer source={source} />)
    const link = container.querySelector("a[data-url-kind='external']")
    expect(link).toHaveAttribute("href", "https://example.com/docs")
    expect(listener).not.toHaveBeenCalled()
    fireEvent.click(link!)
    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener.mock.calls[0]![0].detail).toBe("https://example.com/docs")
    expect(container.querySelector("a[href^='javascript']")).toBeNull()
    document.removeEventListener("merlin:external-link", listener)
  })
})
