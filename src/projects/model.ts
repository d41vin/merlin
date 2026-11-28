export type ProjectStatus = "planned" | "active" | "passive" | "archived"

export type RepositoryConnectionStatus = "connected" | "unavailable" | "disconnected"

export type DocsRootKind = "repository" | "project_store"

export type DocsRootStatus = "active" | "skipped" | "missing"

export interface RepositorySummary {
  path: string
  remoteIdentity: string | null
  defaultBranch: string | null
  connectionStatus: RepositoryConnectionStatus
  available: boolean
}

export interface DocsRootSummary {
  kind: DocsRootKind
  relativePath: string
  path: string
  status: DocsRootStatus
  available: boolean
}

export interface ProjectSummary {
  id: string
  name: string
  description: string
  status: ProjectStatus
  createdAt: string
  updatedAt: string
  repository: RepositorySummary | null
  docsRoot: DocsRootSummary | null
  projectStorePath: string
  projectStoreReady: boolean
}

export interface DocsRootDetection {
  repositoryConnected: boolean
  repositoryAvailable: boolean
  candidateRelativePath: string | null
  configured: DocsRootSummary | null
}

export type RepositoryConnectOutcome =
  | { status: "connected"; project: ProjectSummary }
  | { status: "alreadyConnected"; existingProjectId: string; existingProjectName: string }

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  planned: "Planned",
  active: "Active",
  passive: "Passive",
  archived: "Archived",
}

export function docsRootLabel(project: ProjectSummary): string {
  const root = project.docsRoot
  if (!root) {
    return "Not configured"
  }
  if (root.status === "missing") {
    return "Missing"
  }
  if (root.status === "skipped") {
    return "Skipped"
  }
  if (root.kind === "project_store") {
    return "Merlin Project Store"
  }
  return root.relativePath
}
