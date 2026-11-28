import { invoke } from "@tauri-apps/api/core"

import type { DocsDocument, DocsManifest } from "@/docs/model"

export interface DocsStore {
  readonly kind: "native" | "browser-unavailable"
  getManifest(projectId: string): Promise<DocsManifest>
  scanManifest(projectId: string): Promise<DocsManifest>
  readDocument(projectId: string, relativePath: string): Promise<DocsDocument>
}

export function createDocsStore(): DocsStore {
  if (typeof window !== "undefined" && window.__TAURI_INTERNALS__) {
    return {
      kind: "native",
      getManifest: (projectId) => invoke<DocsManifest>("docs_manifest_get", { projectId }),
      scanManifest: (projectId) => invoke<DocsManifest>("docs_manifest_scan", { projectId }),
      readDocument: (projectId, relativePath) =>
        invoke<DocsDocument>("docs_document_read", { projectId, relativePath }),
    }
  }

  const unavailable = () =>
    Promise.reject(
      new Error("Docs browsing is only available in the Merlin desktop application"),
    )
  return {
    kind: "browser-unavailable",
    getManifest: unavailable,
    scanManifest: unavailable,
    readDocument: unavailable,
  }
}
