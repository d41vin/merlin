import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { PROJECTS_UNAVAILABLE_DESCRIPTION } from "@/projects/copy"
import type { ProjectSummary } from "@/projects/model"
import type { ProjectStore } from "@/projects/store"

import { ProjectsPage } from "./ProjectsPage"

function project(overrides: Partial<ProjectSummary> = {}): ProjectSummary {
  const id = overrides.id ?? "11111111-1111-4111-8111-111111111111"
  return {
    id,
    name: "Merlin",
    description: "A project",
    status: "planned",
    createdAt: "2026-11-28T00:00:00Z",
    updatedAt: "2026-11-28T00:00:00Z",
    repository: null,
    docsRoot: {
      kind: "project_store",
      relativePath: "",
      path: `C:/data/project-store/${id}/docs`,
      status: "active",
      available: true,
    },
    projectStorePath: `C:/data/project-store/${id}`,
    projectStoreReady: true,
    ...overrides,
  }
}

function createFakeStore(initial: ProjectSummary[]) {
  const projects = [...initial]
  const find = (id: string) => {
    const value = projects.find((candidate) => candidate.id === id)
    if (!value) throw new Error("missing project")
    return value
  }
  const store: ProjectStore = {
    kind: "native",
    list: vi.fn(async () => projects),
    create: vi.fn(async (name, description) => {
      const created = project({
        id: "22222222-2222-4222-8222-222222222222",
        name,
        description,
      })
      projects.push(created)
      return created
    }),
    connectRepository: vi.fn(async (projectId, path) => {
      const current = find(projectId)
      const updated = {
        ...current,
        repository: {
          path,
          remoteIdentity: null,
          defaultBranch: null,
          connectionStatus: "connected" as const,
          available: true,
        },
        docsRoot: {
          kind: "project_store" as const,
          relativePath: "",
          path: `C:/data/project-store/${projectId}/docs`,
          status: "skipped" as const,
          available: true,
        },
      }
      projects.splice(
        projects.findIndex((candidate) => candidate.id === projectId),
        1,
        updated,
      )
      return { status: "connected" as const, project: updated }
    }),
    detectDocsRoot: vi.fn(async (projectId) => ({
      repositoryConnected: true,
      repositoryAvailable: true,
      candidateRelativePath: "docs",
      configured: find(projectId).docsRoot,
    })),
    confirmDocsRoot: vi.fn(async (projectId, relativePath) => {
      const current = find(projectId)
      const updated = {
        ...current,
        docsRoot: {
          kind: "repository" as const,
          relativePath,
          path: `C:/repo/${relativePath}`,
          status: "active" as const,
          available: true,
        },
      }
      projects.splice(
        projects.findIndex((candidate) => candidate.id === projectId),
        1,
        updated,
      )
      return updated
    }),
    createDocsRoot: vi.fn(async (projectId) => find(projectId)),
    skipDocsRoot: vi.fn(async (projectId) => find(projectId)),
  }
  return { store, projects }
}

describe("projects page", () => {
  it("renders an honest unavailable state without a native project store", () => {
    const store: ProjectStore = {
      kind: "browser-unavailable",
      list: vi.fn(),
      create: vi.fn(),
      connectRepository: vi.fn(),
      detectDocsRoot: vi.fn(),
      confirmDocsRoot: vi.fn(),
      createDocsRoot: vi.fn(),
      skipDocsRoot: vi.fn(),
    }
    render(<ProjectsPage store={store} />)

    expect(screen.getByText(PROJECTS_UNAVAILABLE_DESCRIPTION, { exact: true })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "New project" })).toBeNull()
  })

  it("creates and selects a project without a repository", async () => {
    const user = userEvent.setup()
    const { store } = createFakeStore([])
    render(<ProjectsPage store={store} />)

    expect(await screen.findByText(/No projects yet/)).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "New project" }))
    const dialog = screen.getByRole("dialog", { name: "New project" })
    await user.type(within(dialog).getByRole("textbox", { name: "Name" }), "Apollo")
    await user.type(within(dialog).getByRole("textbox", { name: "Description" }), "Docs and tasks")
    await user.click(within(dialog).getByRole("button", { name: "Create project" }))

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    expect(await screen.findByRole("button", { name: /Apollo/ })).toBeInTheDocument()
    expect(screen.getByText("Project created.")).toBeInTheDocument()
    const detail = screen.getByRole("region", { name: "Project registration" })
    expect(within(detail).getByText(/Merlin Project Store/)).toBeInTheDocument()
    expect(within(detail).getByText(/Ready/)).toBeInTheDocument()
    expect(store.create).toHaveBeenCalledWith("Apollo", "Docs and tasks")
  })

  it("connects a repository and confirms the detected docs folder", async () => {
    const user = userEvent.setup()
    const existing = project()
    const { store } = createFakeStore([existing])
    render(<ProjectsPage store={store} />)

    await screen.findByRole("button", { name: /Merlin/ })
    await user.click(screen.getByRole("button", { name: "Connect repository" }))
    let dialog = screen.getByRole("dialog", { name: "Connect repository" })
    await user.type(
      within(dialog).getByRole("textbox", { name: "Repository folder" }),
      "C:/dev/apollo",
    )
    await user.click(within(dialog).getByRole("button", { name: "Connect repository" }))

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    expect(await screen.findByText("C:/dev/apollo")).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Confirm docs folder" })).toBeInTheDocument(),
    )

    await user.click(screen.getByRole("button", { name: "Confirm docs folder" }))
    dialog = screen.getByRole("dialog", { name: "Use docs as the Docs root?" })
    await user.click(within(dialog).getByRole("button", { name: "Confirm docs root" }))

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    expect(await screen.findByText("Docs root confirmed.")).toBeInTheDocument()
    expect(store.confirmDocsRoot).toHaveBeenCalledWith(existing.id, "docs")
    expect(
      screen.getByText(
        "Docs root registered. Document browsing, editing, and synchronization arrive in later Phase 2 milestones.",
      ),
    ).toBeInTheDocument()
  })
})
