import type { MarkdownFeature } from "@/markdown/fixtures"
import type { DocsRootKind } from "@/projects/model"

export type DocsFileKind = "markdown" | "mdx" | "file"

export type DocsEncoding = "utf-8" | "utf-8-bom" | "unsupported" | "unreadable"

export type DocsFileStatus =
  | "present"
  | "missing"
  | "too_large"
  | "invalid_encoding"
  | "unsupported_link"
  | "unreadable"

export interface DocsFileSummary {
  relativePath: string
  kind: DocsFileKind
  sizeBytes: number
  modifiedAt: string | null
  fileIdentity: string | null
  contentHash: string | null
  encoding: DocsEncoding
  features: MarkdownFeature[]
  status: DocsFileStatus
  lastSeenAt: string
}

export interface DocsManifest {
  projectId: string
  docsRootKind: DocsRootKind
  docsRootRelativePath: string
  files: DocsFileSummary[]
  scannedAt: string | null
}

export interface DocsDocument {
  relativePath: string
  kind: DocsFileKind
  source: string
  sizeBytes: number
  modifiedAt: string | null
  contentHash: string
  encoding: DocsEncoding
  features: MarkdownFeature[]
}

export interface DocsFolderNode {
  kind: "folder"
  path: string
  name: string
  children: DocsTreeNode[]
}

export interface DocsFileNode {
  kind: "file"
  path: string
  name: string
  file: DocsFileSummary
}

export type DocsTreeNode = DocsFolderNode | DocsFileNode

export function compareDocsNames(left: string, right: string): number {
  const normalizedLeft = left.toLocaleLowerCase("en")
  const normalizedRight = right.toLocaleLowerCase("en")
  if (normalizedLeft !== normalizedRight) return normalizedLeft < normalizedRight ? -1 : 1
  if (left === right) return 0
  return left < right ? -1 : 1
}

export function buildDocsTree(files: DocsFileSummary[]): DocsTreeNode[] {
  const root: DocsFolderNode = { kind: "folder", path: "", name: "", children: [] }
  const folders = new Map<string, DocsFolderNode>([["", root]])

  for (const file of files) {
    const segments = file.relativePath.split("/").filter(Boolean)
    if (segments.length === 0) continue
    let parent = root
    let prefix = ""
    for (const segment of segments.slice(0, -1)) {
      prefix = prefix ? `${prefix}/${segment}` : segment
      let folder = folders.get(prefix)
      if (!folder) {
        folder = { kind: "folder", path: prefix, name: segment, children: [] }
        folders.set(prefix, folder)
        parent.children.push(folder)
      }
      parent = folder
    }
    parent.children.push({
      kind: "file",
      path: file.relativePath,
      name: segments.at(-1) ?? file.relativePath,
      file,
    })
  }

  const sortChildren = (node: DocsFolderNode) => {
    node.children.sort((left, right) => {
      if (left.kind !== right.kind) return left.kind === "folder" ? -1 : 1
      return compareDocsNames(left.name, right.name)
    })
    for (const child of node.children) {
      if (child.kind === "folder") sortChildren(child)
    }
  }
  sortChildren(root)
  return root.children
}

export function collectFolderPaths(nodes: DocsTreeNode[]): string[] {
  const paths: string[] = []
  const visit = (node: DocsTreeNode) => {
    if (node.kind !== "folder") return
    paths.push(node.path)
    for (const child of node.children) visit(child)
  }
  for (const node of nodes) visit(node)
  return paths
}

export function folderAncestors(relativePath: string): string[] {
  const segments = relativePath.split("/").filter(Boolean)
  const paths: string[] = []
  for (let index = 1; index < segments.length; index += 1) {
    paths.push(segments.slice(0, index).join("/"))
  }
  return paths
}

export function isMarkdownFamily(file: DocsFileSummary): boolean {
  return file.kind === "markdown" || file.kind === "mdx"
}

export function recentDocuments(files: DocsFileSummary[], limit = 5): DocsFileSummary[] {
  return files
    .filter(
      (file) => isMarkdownFamily(file) && file.status === "present" && file.modifiedAt !== null,
    )
    .sort((left, right) => {
      const leftTime = left.modifiedAt ?? ""
      const rightTime = right.modifiedAt ?? ""
      if (leftTime !== rightTime) return leftTime < rightTime ? 1 : -1
      return compareDocsNames(left.relativePath, right.relativePath)
    })
    .slice(0, limit)
}

export function formatFileSize(sizeBytes: number): string {
  if (sizeBytes < 1024) return `${sizeBytes} B`
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`
}
