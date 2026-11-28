import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import type { DocsDocument, DocsFileSummary, DocsManifest } from "@/docs/model"
import type { DocsStore } from "@/docs/store"

import { DocsBrowser } from "./DocsBrowser"

const PROJECT_ID = "11111111-1111-4111-8111-111111111111"

function file(relativePath: string, overrides: Partial<DocsFileSummary> = {}): DocsFileSummary {
  return {
    relativePath,
    kind: "markdown",
    sizeBytes: 120,
    modifiedAt: "2026-11-28T12:00:00Z",
    fileIdentity: null,
    contentHash: "a".repeat(64),
    encoding: "utf-8",
    features: [],
    status: "present",
    lastSeenAt: "2026-11-28T12:00:00Z",
    ...overrides,
  }
}

function manifest(files: DocsFileSummary[], scannedAt: string | null = null): DocsManifest {
  return {
    projectId: PROJECT_ID,
    docsRootKind: "repository",
    docsRootRelativePath: "docs",
    files,
    scannedAt,
  }
}

function documentFor(file: DocsFileSummary, source: string): DocsDocument {
  return {
    relativePath: file.relativePath,
    kind: file.kind,
    source,
    sizeBytes: source.length,
    modifiedAt: file.modifiedAt,
    contentHash: file.contentHash ?? "b".repeat(64),
    encoding: file.encoding,
    features: file.features,
  }
}

function createFakeStore(initial: DocsManifest, scanResult?: DocsManifest) {
  const store: DocsStore = {
    kind: "native",
    getManifest: vi.fn(async () => initial),
    scanManifest: vi.fn(async () => scanResult ?? initial),
    readDocument: vi.fn(async (_projectId, relativePath) => {
      const target = initial.files.find((candidate) => candidate.relativePath === relativePath)
      if (!target) throw new Error("missing")
      return documentFor(target, `# ${target.relativePath}\n`)
    }),
  }
  return store
}

describe("docs browser", () => {
  it("shows an honest empty state and refreshes only on request", async () => {
    const user = userEvent.setup()
    const scanned = manifest([file("guide.md")], "2026-11-28T12:30:00Z")
    const store = createFakeStore(manifest([]), scanned)
    render(<DocsBrowser projectId={PROJECT_ID} store={store} />)

    expect(await screen.findByText(/No entries in this Docs root yet/)).toBeInTheDocument()
    expect(store.scanManifest).not.toHaveBeenCalled()

    await user.click(screen.getByRole("button", { name: "Refresh manifest" }))

    expect(await screen.findByRole("treeitem", { name: "guide.md" })).toBeInTheDocument()
    expect(store.scanManifest).toHaveBeenCalledWith(PROJECT_ID)
    expect(screen.getByText(/Manifest refreshed. 1 entry/)).toBeInTheDocument()
  })

  it("opens Markdown in preview and shows the exact source on request", async () => {
    const user = userEvent.setup()
    const source = "# Guide\n\nA **safe** paragraph.\n"
    const guide = file("guide.md")
    const store = createFakeStore(manifest([guide]))
    vi.mocked(store.readDocument).mockResolvedValueOnce(documentFor(guide, source))
    render(<DocsBrowser projectId={PROJECT_ID} store={store} />)

    await user.click(await screen.findByRole("treeitem", { name: "guide.md" }))

    expect(await screen.findByRole("heading", { name: "Guide" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Preview" })).toHaveAttribute("aria-pressed", "true")
    await user.click(screen.getByRole("button", { name: "Source" }))
    expect(screen.getByLabelText("Document source")).toHaveTextContent("# Guide")
    expect(store.readDocument).toHaveBeenCalledWith(PROJECT_ID, "guide.md")
  })

  it("uses source fallback for frontmatter and never executes MDX", async () => {
    const user = userEvent.setup()
    const notes = file("notes.md")
    const mdx = file("diagram.mdx", { kind: "mdx" })
    const store = createFakeStore(manifest([notes, mdx]))
    vi.mocked(store.readDocument)
      .mockResolvedValueOnce(documentFor(notes, "---\ntitle: Notes\n---\n\n# Notes\n"))
      .mockResolvedValueOnce(
        documentFor(mdx, "import { Chart } from './Chart.js'\n\n<Chart value={1} />\n"),
      )
    render(<DocsBrowser projectId={PROJECT_ID} store={store} />)

    await user.click(await screen.findByRole("treeitem", { name: "notes.md" }))
    expect(await screen.findByText(/Source fallback for frontmatter/)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Preview" })).toBeNull()
    expect(screen.getByLabelText("Document source")).toHaveTextContent("title: Notes")

    await user.click(screen.getByRole("treeitem", { name: "diagram.mdx" }))
    expect(await screen.findByText(/MDX is shown as inert source/)).toBeInTheDocument()
    expect(screen.getByLabelText("Document source")).toHaveTextContent("<Chart value={1} />")
  })

  it("does not open non-Markdown files or claim missing files are deleted", async () => {
    const user = userEvent.setup()
    const asset = file("asset.bin", { kind: "file", encoding: "unsupported" })
    const missing = file("missing.md", { status: "missing" })
    const store = createFakeStore(manifest([asset, missing]))
    render(<DocsBrowser projectId={PROJECT_ID} store={store} />)

    await user.click(await screen.findByRole("treeitem", { name: /asset\.bin/ }))
    expect(
      screen.getByText(/not a Markdown document, so Merlin does not open it/),
    ).toBeInTheDocument()
    expect(store.readDocument).not.toHaveBeenCalled()

    await user.click(screen.getByRole("treeitem", { name: /missing\.md/ }))
    expect(screen.getByText(/Merlin does not treat absence as deletion/)).toBeInTheDocument()
    expect(store.readDocument).not.toHaveBeenCalled()
  })

  it("supports keyboard tree navigation and opening a document", async () => {
    const user = userEvent.setup()
    const notes = file("nested/personal/notes.md")
    const store = createFakeStore(manifest([file("guide.md"), notes]))
    render(<DocsBrowser projectId={PROJECT_ID} store={store} />)

    const nested = await screen.findByRole("treeitem", { name: "nested" })
    nested.focus()
    expect(nested).toHaveFocus()

    await user.keyboard("{ArrowDown}")
    const personal = screen.getByRole("treeitem", { name: "personal" })
    expect(personal).toHaveFocus()

    await user.keyboard("{ArrowLeft}")
    expect(personal).toHaveAttribute("aria-expanded", "false")
    await user.keyboard("{ArrowRight}")
    expect(personal).toHaveAttribute("aria-expanded", "true")

    await user.keyboard("{ArrowDown}")
    expect(screen.getByRole("treeitem", { name: "notes.md" })).toHaveFocus()
    await user.keyboard("{Enter}")

    expect(
      await screen.findByRole("heading", { level: 1, name: "nested/personal/notes.md" }),
    ).toBeInTheDocument()
    expect(store.readDocument).toHaveBeenCalledWith(PROJECT_ID, "nested/personal/notes.md")
  })

  it("reports scan and read failures without fabricating content", async () => {
    const user = userEvent.setup()
    const guide = file("guide.md")
    const store = createFakeStore(manifest([guide]))
    vi.mocked(store.scanManifest).mockRejectedValueOnce(new Error("scan failed"))
    vi.mocked(store.readDocument).mockRejectedValueOnce(new Error("read failed"))
    render(<DocsBrowser projectId={PROJECT_ID} store={store} />)

    await user.click(await screen.findByRole("button", { name: "Refresh manifest" }))
    expect(await screen.findByRole("alert")).toHaveTextContent(/could not be scanned/)

    await user.click(screen.getByRole("treeitem", { name: "guide.md" }))
    await waitFor(() =>
      expect(screen.getByText(/This document could not be read/)).toBeInTheDocument(),
    )
    expect(screen.queryByLabelText("Document source")).toBeNull()
  })
})
