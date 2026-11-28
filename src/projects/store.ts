import { invoke } from "@tauri-apps/api/core"

import type { DocsRootDetection, ProjectSummary, RepositoryConnectOutcome } from "@/projects/model"

export interface ProjectStore {
  readonly kind: "native" | "browser-unavailable"
  list(): Promise<ProjectSummary[]>
  create(name: string, description: string): Promise<ProjectSummary>
  connectRepository(
    projectId: string,
    localPath: string,
    remoteIdentity: string | null,
  ): Promise<RepositoryConnectOutcome>
  detectDocsRoot(projectId: string): Promise<DocsRootDetection>
  confirmDocsRoot(projectId: string, relativePath: string): Promise<ProjectSummary>
  createDocsRoot(projectId: string): Promise<ProjectSummary>
  skipDocsRoot(projectId: string): Promise<ProjectSummary>
}

export function createProjectStore(): ProjectStore {
  if (typeof window !== "undefined" && window.__TAURI_INTERNALS__) {
    return {
      kind: "native",
      list: () => invoke<ProjectSummary[]>("projects_list"),
      create: (name, description) =>
        invoke<ProjectSummary>("project_create", { name, description }),
      connectRepository: (projectId, localPath, remoteIdentity) =>
        invoke<RepositoryConnectOutcome>("repository_connect", {
          projectId,
          localPath,
          remoteIdentity,
        }),
      detectDocsRoot: (projectId) => invoke<DocsRootDetection>("docs_root_detect", { projectId }),
      confirmDocsRoot: (projectId, relativePath) =>
        invoke<ProjectSummary>("docs_root_confirm", { projectId, relativePath }),
      createDocsRoot: (projectId) => invoke<ProjectSummary>("docs_root_create", { projectId }),
      skipDocsRoot: (projectId) => invoke<ProjectSummary>("docs_root_skip", { projectId }),
    }
  }

  const unavailable = () =>
    Promise.reject(
      new Error("Project registration is only available in the Merlin desktop application"),
    )
  return {
    kind: "browser-unavailable",
    list: unavailable,
    create: unavailable,
    connectRepository: unavailable,
    detectDocsRoot: unavailable,
    confirmDocsRoot: unavailable,
    createDocsRoot: unavailable,
    skipDocsRoot: unavailable,
  }
}
