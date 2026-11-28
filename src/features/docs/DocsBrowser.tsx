import { ChevronDown, ChevronRight, FileQuestion, FileText } from "lucide-react"
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react"

import { Button } from "@/components/ui/button"
import {
  buildDocsTree,
  collectFolderPaths,
  folderAncestors,
  formatFileSize,
  isMarkdownFamily,
  recentDocuments,
  type DocsDocument,
  type DocsFileSummary,
  type DocsManifest,
  type DocsTreeNode,
} from "@/docs/model"
import { createDocsStore, type DocsStore } from "@/docs/store"
import { classifyMarkdown, requiresSourceFallback, type MarkdownFeature } from "@/markdown/fixtures"
import { DocumentRenderer } from "@/markdown/renderer"

interface DocsBrowserProps {
  projectId: string
  store?: DocsStore
}

export function DocsBrowser({ projectId, store: providedStore }: DocsBrowserProps) {
  const [store] = useState(() => providedStore ?? createDocsStore())
  if (store.kind === "browser-unavailable") {
    return (
      <section className="merlin-docs-browser" aria-label="Docs browser">
        <p className="merlin-status" data-kind="warning" role="status">
          Docs browsing is only available in the Merlin desktop application.
        </p>
      </section>
    )
  }
  return <NativeDocsBrowser projectId={projectId} store={store} />
}

type LoadState = "loading" | "ready" | "error"
type ReaderState = "idle" | "loading" | "ready" | "error"
type ViewMode = "preview" | "source"

interface FlatRow {
  id: string
  level: number
  name: string
  expanded?: boolean
  node: DocsTreeNode
}

function flattenRows(nodes: DocsTreeNode[], expanded: ReadonlySet<string>): FlatRow[] {
  const rows: FlatRow[] = []
  const visit = (node: DocsTreeNode, level: number) => {
    if (node.kind === "folder") {
      const isExpanded = expanded.has(node.path)
      rows.push({
        id: `folder:${node.path}`,
        level,
        name: node.name,
        expanded: isExpanded,
        node,
      })
      if (isExpanded) {
        for (const child of node.children) visit(child, level + 1)
      }
      return
    }
    rows.push({ id: `file:${node.path}`, level, name: node.name, node })
  }
  for (const node of nodes) visit(node, 1)
  return rows
}

function parentFolderPath(path: string): string | null {
  const segments = path.split("/").filter(Boolean)
  if (segments.length < 2) return null
  return segments.slice(0, -1).join("/")
}

function mergeExpandedFolders(
  current: ReadonlySet<string>,
  files: DocsFileSummary[],
): Set<string> {
  const merged = new Set(current)
  for (const path of collectFolderPaths(buildDocsTree(files))) merged.add(path)
  return merged
}

const FALLBACK_FEATURES: MarkdownFeature[] = [
  "frontmatter",
  "html",
  "mdx",
  "images",
  "crlf",
  "custom-container",
]

function fallbackFeatures(source: string): MarkdownFeature[] {
  return classifyMarkdown(source).filter((feature) => FALLBACK_FEATURES.includes(feature))
}

function formatTimestamp(value: string | null): string {
  if (!value) return "Never refreshed"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return "Refresh time unavailable"
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed)
}

function NativeDocsBrowser({ projectId, store }: { projectId: string; store: DocsStore }) {
  const [manifest, setManifest] = useState<DocsManifest | null>(null)
  const [loadState, setLoadState] = useState<LoadState>("loading")
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [document, setDocument] = useState<DocsDocument | null>(null)
  const [readerState, setReaderState] = useState<ReaderState>("idle")
  const [readerError, setReaderError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>("preview")
  const [activeRowId, setActiveRowId] = useState<string | null>(null)
  const rowRefs = useRef(new Map<string, HTMLElement>())
  const readRequest = useRef(0)

  const tree = useMemo(() => buildDocsTree(manifest?.files ?? []), [manifest])
  const rows = useMemo(() => flattenRows(tree, expanded), [tree, expanded])
  const recent = useMemo(() => recentDocuments(manifest?.files ?? []), [manifest])
  const selectedFile =
    manifest?.files.find((file) => file.relativePath === selectedPath) ?? null

  useEffect(() => {
    let active = true
    setLoadState("loading")
    store
      .getManifest(projectId)
      .then((next) => {
        if (!active) return
        setManifest(next)
        setExpanded((current) => mergeExpandedFolders(current, next.files))
        setLoadState("ready")
      })
      .catch(() => {
        if (active) setLoadState("error")
      })
    return () => {
      active = false
    }
  }, [store, projectId])

  useEffect(() => {
    if (rows.length === 0) {
      setActiveRowId(null)
      return
    }
    if (!activeRowId || !rows.some((row) => row.id === activeRowId)) {
      setActiveRowId(rows[0].id)
    }
  }, [rows, activeRowId])

  function focusRow(rowId: string) {
    setActiveRowId(rowId)
    rowRefs.current.get(rowId)?.focus()
  }

  function setFolderExpanded(path: string, nextExpanded: boolean) {
    setExpanded((current) => {
      const next = new Set(current)
      if (nextExpanded) next.add(path)
      else next.delete(path)
      return next
    })
  }

  async function handleScan() {
    setScanning(true)
    setScanError(null)
    setAnnouncement(null)
    try {
      const next = await store.scanManifest(projectId)
      setManifest(next)
      setExpanded((current) => mergeExpandedFolders(current, next.files))
      setLoadState("ready")
      setAnnouncement(
        `Manifest refreshed. ${next.files.length} ${
          next.files.length === 1 ? "entry" : "entries"
        } in the Docs root.`,
      )
    } catch {
      setScanError(
        "The Docs tree could not be scanned. Confirm that the Docs root is available and within the manifest limits.",
      )
    } finally {
      setScanning(false)
    }
  }

  async function openFile(file: DocsFileSummary) {
    readRequest.current += 1
    const request = readRequest.current
    setSelectedPath(file.relativePath)
    setDocument(null)
    setReaderError(null)
    setReaderState("idle")
    if (!isMarkdownFamily(file) || file.status !== "present") return
    setReaderState("loading")
    try {
      const next = await store.readDocument(projectId, file.relativePath)
      if (request !== readRequest.current) return
      setDocument(next)
      setViewMode(
        next.kind === "mdx" || requiresSourceFallback(next.source) ? "source" : "preview",
      )
      setReaderState("ready")
    } catch {
      if (request !== readRequest.current) return
      setReaderState("error")
      setReaderError(
        "This document could not be read. Merlin does not treat an unreadable file as empty.",
      )
    }
  }

  function openRecent(file: DocsFileSummary) {
    setExpanded((current) => {
      const next = new Set(current)
      for (const path of folderAncestors(file.relativePath)) next.add(path)
      return next
    })
    setActiveRowId(`file:${file.relativePath}`)
    void openFile(file)
  }

  function handleTreeKeyDown(event: KeyboardEvent<HTMLUListElement>) {
    if (!activeRowId) return
    const index = rows.findIndex((row) => row.id === activeRowId)
    if (index < 0) return
    const row = rows[index]

    if (event.key === "ArrowDown") {
      event.preventDefault()
      focusRow(rows[Math.min(index + 1, rows.length - 1)].id)
      return
    }
    if (event.key === "ArrowUp") {
      event.preventDefault()
      focusRow(rows[Math.max(index - 1, 0)].id)
      return
    }
    if (event.key === "Home") {
      event.preventDefault()
      focusRow(rows[0].id)
      return
    }
    if (event.key === "End") {
      event.preventDefault()
      focusRow(rows[rows.length - 1].id)
      return
    }
    if (event.key === "ArrowRight") {
      if (row.node.kind !== "folder") return
      event.preventDefault()
      if (!row.expanded) {
        setFolderExpanded(row.node.path, true)
      } else if (row.node.children.length > 0) {
        focusRow(
          row.node.children[0].kind === "folder"
            ? `folder:${row.node.children[0].path}`
            : `file:${row.node.children[0].path}`,
        )
      }
      return
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault()
      if (row.node.kind === "folder" && row.expanded) {
        setFolderExpanded(row.node.path, false)
        return
      }
      const parent = parentFolderPath(row.node.path)
      if (parent) focusRow(`folder:${parent}`)
      return
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      if (row.node.kind === "folder") {
        setFolderExpanded(row.node.path, !row.expanded)
      } else {
        void openFile(row.node.file)
      }
    }
  }

  const canPreview =
    document !== null &&
    document.kind !== "mdx" &&
    !requiresSourceFallback(document.source)
  const fallback = document ? fallbackFeatures(document.source) : []

  return (
    <section className="merlin-docs-browser" aria-label="Docs browser">
      <div className="merlin-docs-toolbar">
        <h3 className="merlin-section-title">Docs</h3>
        <div className="merlin-docs-toolbar-actions">
          <span className="merlin-metadata">
            {manifest
              ? `${manifest.files.length} ${manifest.files.length === 1 ? "entry" : "entries"} · ${formatTimestamp(manifest.scannedAt)}`
              : "Manifest not loaded"}
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void handleScan()}
            disabled={scanning}
          >
            {scanning ? "Refreshing manifest…" : "Refresh manifest"}
          </Button>
        </div>
      </div>

      {scanError ? (
        <p className="merlin-status" data-kind="error" role="alert">
          {scanError}
        </p>
      ) : null}
      {announcement ? (
        <p className="merlin-status" data-kind="success" role="status">
          {announcement}
        </p>
      ) : null}

      {loadState === "loading" ? (
        <p className="merlin-status" data-kind="pending" role="status">
          Loading Docs manifest
        </p>
      ) : loadState === "error" ? (
        <p className="merlin-status" data-kind="error" role="alert">
          The Docs manifest could not be loaded. Refresh the manifest after confirming the Docs
          root.
        </p>
      ) : manifest && manifest.files.length === 0 ? (
        <p className="merlin-reading">
          No entries in this Docs root yet. Add Markdown files in the repository or Project Store,
          then refresh the manifest. Merlin does not scan outside the confirmed Docs root.
        </p>
      ) : (
        <div className="merlin-docs-layout">
          <div className="merlin-docs-navigation">
            {recent.length > 0 ? (
              <div className="merlin-docs-recent">
                <h4 className="merlin-label">Recent documents</h4>
                <ul className="merlin-docs-recent-list">
                  {recent.map((file) => (
                    <li key={file.relativePath}>
                      <button
                        type="button"
                        className="merlin-docs-recent-button"
                        onClick={() => openRecent(file)}
                      >
                        {file.relativePath}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <ul
              className="merlin-docs-tree"
              role="tree"
              aria-label="Docs files"
              onKeyDown={handleTreeKeyDown}
            >
              {rows.map((row) => {
                const selected =
                  row.node.kind === "file" && row.node.path === selectedPath
                return (
                  <li
                    key={row.id}
                    role="treeitem"
                    aria-level={row.level}
                    aria-expanded={row.node.kind === "folder" ? row.expanded : undefined}
                    aria-selected={row.node.kind === "file" ? selected : undefined}
                    tabIndex={activeRowId === row.id ? 0 : -1}
                    className="merlin-docs-tree-row"
                    style={{ paddingInlineStart: `${(row.level - 1) * 14 + 6}px` }}
                    ref={(element) => {
                      if (element) rowRefs.current.set(row.id, element)
                      else rowRefs.current.delete(row.id)
                    }}
                    onFocus={() => setActiveRowId(row.id)}
                    onClick={() => {
                      if (row.node.kind === "folder") {
                        setFolderExpanded(row.node.path, !row.expanded)
                      } else {
                        void openFile(row.node.file)
                      }
                    }}
                  >
                    {row.node.kind === "folder" ? (
                      row.expanded ? (
                        <ChevronDown aria-hidden="true" size={14} />
                      ) : (
                        <ChevronRight aria-hidden="true" size={14} />
                      )
                    ) : row.node.file.kind === "file" ? (
                      <FileQuestion aria-hidden="true" size={14} />
                    ) : (
                      <FileText aria-hidden="true" size={14} />
                    )}
                    <span className="merlin-docs-tree-name">{row.name}</span>
                    {row.node.kind === "file" &&
                    (row.node.file.status !== "present" ||
                      row.node.file.kind === "file") ? (
                      <span className="merlin-docs-tree-meta">
                        {row.node.file.status === "present"
                          ? "not Markdown"
                          : row.node.file.status === "unsupported_link"
                            ? "link"
                            : row.node.file.status === "too_large"
                              ? "too large"
                              : row.node.file.status === "invalid_encoding"
                                ? "encoding"
                                : row.node.file.status}
                      </span>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          </div>

          <section className="merlin-docs-reader" aria-label="Document reader">
            {selectedFile ? (
              <>
                <div className="merlin-docs-reader-header">
                  <div className="merlin-docs-reader-title">
                    <h4 className="merlin-docs-document-title">{selectedFile.relativePath}</h4>
                    <p className="merlin-metadata">
                      {formatFileSize(selectedFile.sizeBytes)} · Modified{" "}
                      {formatTimestamp(selectedFile.modifiedAt)}
                    </p>
                  </div>
                  {readerState === "ready" && document ? (
                    canPreview ? (
                      <div className="merlin-docs-view-toggle" role="group" aria-label="Document view">
                        <Button
                          type="button"
                          size="sm"
                          variant={viewMode === "preview" ? "secondary" : "ghost"}
                          aria-pressed={viewMode === "preview"}
                          onClick={() => setViewMode("preview")}
                        >
                          Preview
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={viewMode === "source" ? "secondary" : "ghost"}
                          aria-pressed={viewMode === "source"}
                          onClick={() => setViewMode("source")}
                        >
                          Source
                        </Button>
                      </div>
                    ) : (
                      <span className="merlin-metadata">Source only</span>
                    )
                  ) : null}
                </div>

                {selectedFile.kind === "file" ? (
                  <p className="merlin-reading">
                    This file lives in the Docs root but is not a Markdown document, so Merlin does
                    not open it in the document reader.
                  </p>
                ) : selectedFile.status === "missing" ? (
                  <p className="merlin-status" data-kind="warning" role="status">
                    This document was not found when the manifest was last refreshed. Merlin does
                    not treat absence as deletion; refresh after the file or repository is
                    available again.
                  </p>
                ) : selectedFile.status === "too_large" ? (
                  <p className="merlin-status" data-kind="warning" role="status">
                    This document is larger than the 2 MiB read-only limit. Merlin does not
                    truncate or rewrite it.
                  </p>
                ) : selectedFile.status === "invalid_encoding" ? (
                  <p className="merlin-status" data-kind="warning" role="status">
                    This document is not valid UTF-8. Merlin does not guess an encoding or rewrite
                    the source.
                  </p>
                ) : selectedFile.status === "unsupported_link" ? (
                  <p className="merlin-status" data-kind="warning" role="status">
                    This entry is a symbolic link or junction. Merlin does not follow links out of
                    the Docs root.
                  </p>
                ) : selectedFile.status === "unreadable" ? (
                  <p className="merlin-status" data-kind="warning" role="status">
                    This document could not be read. Merlin does not treat an unreadable file as
                    empty.
                  </p>
                ) : readerState === "loading" ? (
                  <p className="merlin-status" data-kind="pending" role="status">
                    Loading document
                  </p>
                ) : readerState === "error" ? (
                  <p className="merlin-status" data-kind="error" role="alert">
                    {readerError}
                  </p>
                ) : document ? (
                  <>
                    {document.kind === "mdx" ? (
                      <p className="merlin-metadata">
                        MDX is shown as inert source and is never executed.
                      </p>
                    ) : fallback.length > 0 ? (
                      <p className="merlin-metadata">
                        Source fallback for {fallback.join(", ")}. Merlin shows the exact source
                        without executing it.
                      </p>
                    ) : null}
                    {viewMode === "source" || !canPreview ? (
                      <pre
                        className="merlin-docs-source"
                        data-docs-source="exact"
                        tabIndex={0}
                        aria-label="Document source"
                      >
                        {document.source}
                      </pre>
                    ) : (
                      <div className="merlin-docs-preview">
                        <DocumentRenderer source={document.source} />
                      </div>
                    )}
                  </>
                ) : null}
              </>
            ) : (
              <p className="merlin-reading">
                Select a Markdown document from the tree or the recent list to read it. This
                milestone is read-only; Merlin does not save, rename, delete, watch, or synchronize
                documents yet.
              </p>
            )}
          </section>
        </div>
      )}
    </section>
  )
}
