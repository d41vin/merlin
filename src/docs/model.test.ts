import { describe, expect, it } from "vitest"

import {
  buildDocsTree,
  collectFolderPaths,
  folderAncestors,
  formatFileSize,
  recentDocuments,
  type DocsFileSummary,
} from "./model"

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

describe("docs model", () => {
  it("builds a folder-first tree from relative paths", () => {
    const tree = buildDocsTree([
      file("zeta.md"),
      file("asset.bin", { kind: "file" }),
      file("alpha/b.md"),
      file("alpha/a/c.md"),
    ])

    expect(tree.map((node) => node.name)).toEqual(["alpha", "asset.bin", "zeta.md"])
    const alpha = tree[0]
    expect(alpha.kind).toBe("folder")
    if (alpha.kind !== "folder") throw new Error("expected folder")
    expect(alpha.children.map((node) => node.name)).toEqual(["a", "b.md"])
    expect(collectFolderPaths(tree)).toEqual(["alpha", "alpha/a"])
  })

  it("lists recent present Markdown documents by modification time", () => {
    const files = [
      file("older.md", { modifiedAt: "2026-11-01T00:00:00Z" }),
      file("newest.md", { modifiedAt: "2026-11-28T00:00:00Z" }),
      file("middle.md", { modifiedAt: "2026-11-15T00:00:00Z" }),
      file("missing.md", { modifiedAt: "2026-11-29T00:00:00Z", status: "missing" }),
      file("asset.bin", { kind: "file", modifiedAt: "2026-11-30T00:00:00Z" }),
      file("no-date.md", { modifiedAt: null }),
    ]

    expect(recentDocuments(files, 2).map((entry) => entry.relativePath)).toEqual([
      "newest.md",
      "middle.md",
    ])
  })

  it("returns ancestor folders for a nested document", () => {
    expect(folderAncestors("docs/personal/notes.md")).toEqual(["docs", "docs/personal"])
    expect(folderAncestors("guide.md")).toEqual([])
  })

  it("formats sizes without inventing precision", () => {
    expect(formatFileSize(512)).toBe("512 B")
    expect(formatFileSize(2048)).toBe("2.0 KB")
    expect(formatFileSize(3 * 1024 * 1024)).toBe("3.0 MB")
  })
})
