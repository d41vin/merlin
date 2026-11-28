import { useEffect, useState } from "react"

import { UnavailableState } from "@/components/common/UnavailableState"
import { PageHeader } from "@/components/shell/PageHeader"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { DocsBrowser } from "@/features/docs/DocsBrowser"
import {
  docsRootLabel,
  PROJECT_STATUS_LABELS,
  type DocsRootDetection,
  type ProjectSummary,
} from "@/projects/model"
import { PROJECTS_UNAVAILABLE_DESCRIPTION } from "@/projects/copy"
import { createProjectStore, type ProjectStore } from "@/projects/store"
import type { DocsStore } from "@/docs/store"

type DocsDialog = "confirm" | "create" | "choose" | null

export function ProjectsPage({
  store,
  docsStore,
}: { store?: ProjectStore; docsStore?: DocsStore } = {}) {
  const [projectStore] = useState(() => store ?? createProjectStore())
  if (projectStore.kind === "browser-unavailable") {
    return (
      <div className="merlin-shell-page">
        <PageHeader title="Projects" />
        <UnavailableState description={PROJECTS_UNAVAILABLE_DESCRIPTION} />
      </div>
    )
  }
  return <NativeProjectsPage store={projectStore} docsStore={docsStore} />
}

function NativeProjectsPage({ store, docsStore }: { store: ProjectStore; docsStore?: DocsStore }) {
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detection, setDetection] = useState<DocsRootDetection | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState("")
  const [newDescription, setNewDescription] = useState("")
  const [createError, setCreateError] = useState<string | null>(null)
  const [connectOpen, setConnectOpen] = useState(false)
  const [repositoryPath, setRepositoryPath] = useState("")
  const [remoteIdentity, setRemoteIdentity] = useState("")
  const [connectError, setConnectError] = useState<string | null>(null)
  const [reconnect, setReconnect] = useState<{ id: string; name: string } | null>(null)
  const [docsDialog, setDocsDialog] = useState<DocsDialog>(null)
  const [choosePath, setChoosePath] = useState("")
  const [docsError, setDocsError] = useState<string | null>(null)

  const selected = projects?.find((project) => project.id === selectedId) ?? null
  const selectedRepositoryPath = selected?.repository?.path ?? null

  useEffect(() => {
    let active = true
    store
      .list()
      .then((list) => {
        if (!active) return
        setProjects(list)
        setSelectedId((current) => current ?? list[0]?.id ?? null)
      })
      .catch(() => {
        if (active) setLoadFailed(true)
      })
    return () => {
      active = false
    }
  }, [store])

  useEffect(() => {
    if (!selectedId || !selectedRepositoryPath) {
      setDetection(null)
      return
    }
    let active = true
    store
      .detectDocsRoot(selectedId)
      .then((next) => {
        if (active) setDetection(next)
      })
      .catch(() => {
        if (active) setDetection(null)
      })
    return () => {
      active = false
    }
  }, [store, selectedId, selectedRepositoryPath])

  async function reloadProjects(preferredId?: string) {
    const list = await store.list()
    setProjects(list)
    setSelectedId((current) => preferredId ?? current ?? list[0]?.id ?? null)
    return list
  }

  async function loadDetection(project: ProjectSummary) {
    if (!project.repository) {
      setDetection(null)
      return
    }
    try {
      setDetection(await store.detectDocsRoot(project.id))
    } catch {
      setDetection(null)
    }
  }

  async function handleCreateProject() {
    if (!newName.trim()) {
      setCreateError("Enter a project name.")
      return
    }
    setBusy(true)
    setCreateError(null)
    setStatusMessage(null)
    setErrorMessage(null)
    try {
      const created = await store.create(newName, newDescription)
      await reloadProjects(created.id)
      setCreateOpen(false)
      setNewName("")
      setNewDescription("")
      setStatusMessage("Project created.")
      await loadDetection(created)
    } catch {
      setCreateError("Project could not be created. Check the name and try again.")
    } finally {
      setBusy(false)
    }
  }

  async function handleConnectRepository() {
    if (!selected) return
    if (!repositoryPath.trim()) {
      setConnectError("Enter the repository folder path.")
      return
    }
    setBusy(true)
    setConnectError(null)
    setReconnect(null)
    setStatusMessage(null)
    setErrorMessage(null)
    try {
      const outcome = await store.connectRepository(
        selected.id,
        repositoryPath,
        remoteIdentity.trim() || null,
      )
      if (outcome.status === "alreadyConnected") {
        setReconnect({ id: outcome.existingProjectId, name: outcome.existingProjectName })
        return
      }
      const list = await reloadProjects(outcome.project.id)
      setConnectOpen(false)
      setRepositoryPath("")
      setRemoteIdentity("")
      setStatusMessage("Repository connected.")
      const updated = list.find((project) => project.id === outcome.project.id)
      if (updated) await loadDetection(updated)
    } catch {
      setConnectError("Repository could not be connected. Use an existing local folder path.")
    } finally {
      setBusy(false)
    }
  }

  function handleOpenExistingProject() {
    if (!reconnect) return
    setSelectedId(reconnect.id)
    setConnectOpen(false)
    setReconnect(null)
    setStatusMessage(`Opened ${reconnect.name}.`)
  }

  async function runDocsAction(
    action: (projectId: string) => Promise<ProjectSummary>,
    successMessage: string,
    failureMessage: string,
  ) {
    if (!selected) return
    setBusy(true)
    setDocsError(null)
    setErrorMessage(null)
    setStatusMessage(null)
    try {
      const updated = await action(selected.id)
      const list = await reloadProjects(updated.id)
      setDocsDialog(null)
      setChoosePath("")
      setStatusMessage(successMessage)
      const refreshed = list.find((project) => project.id === updated.id)
      if (refreshed) await loadDetection(refreshed)
    } catch {
      setDocsError(failureMessage)
      setErrorMessage(failureMessage)
    } finally {
      setBusy(false)
    }
  }

  function handleChooseDocsRoot() {
    if (!choosePath.trim()) {
      setDocsError("Enter a folder path relative to the repository.")
      return
    }
    void runDocsAction(
      (projectId) => store.confirmDocsRoot(projectId, choosePath),
      "Docs root confirmed.",
      "Docs root could not be confirmed. It must be an existing folder inside the repository.",
    )
  }

  const docsRoot = selected?.docsRoot ?? null
  const repository = selected?.repository ?? null
  const repositoryDocsConfigured =
    docsRoot?.kind === "repository" && docsRoot.status === "active" && docsRoot.available
  const canConfigureDocs = repository?.available && !repositoryDocsConfigured

  return (
    <div className="merlin-shell-page merlin-projects-page">
      <PageHeader
        title="Projects"
        description="Register projects and confirm the Docs root Merlin will use for each project."
      />

      <div className="merlin-projects-toolbar">
        <Dialog
          open={createOpen}
          onOpenChange={(open) => {
            setCreateOpen(open)
            if (!open) setCreateError(null)
          }}
          trigger={<Button type="button">New project</Button>}
          title="New project"
          description="Register a project in Merlin. A repository is optional and can be connected later."
          footer={
            <Button type="button" onClick={() => void handleCreateProject()} disabled={busy}>
              Create project
            </Button>
          }
        >
          <div>
            <Label htmlFor="new-project-name">Name</Label>
            <Input
              id="new-project-name"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              autoComplete="off"
            />
          </div>
          <div>
            <Label htmlFor="new-project-description">Description</Label>
            <Textarea
              id="new-project-description"
              rows={3}
              value={newDescription}
              onChange={(event) => setNewDescription(event.target.value)}
            />
          </div>
          {createError ? (
            <p className="merlin-status" data-kind="error" role="alert">
              {createError}
            </p>
          ) : null}
        </Dialog>
      </div>

      {statusMessage ? (
        <p className="merlin-status" data-kind="success" role="status">
          {statusMessage}
        </p>
      ) : null}
      {errorMessage ? (
        <p className="merlin-status" data-kind="error" role="alert">
          {errorMessage}
        </p>
      ) : null}

      {loadFailed ? (
        <p className="merlin-status" data-kind="error" role="alert">
          Projects could not be loaded.
        </p>
      ) : projects === null ? (
        <p className="merlin-status" data-kind="pending" role="status">
          Loading projects
        </p>
      ) : (
        <div className="merlin-projects-layout">
          <section className="merlin-surface" aria-label="Project list">
            {projects.length === 0 ? (
              <p className="merlin-reading">
                No projects yet. Create a project to register its Docs root.
              </p>
            ) : (
              <ul className="merlin-project-list">
                {projects.map((project) => (
                  <li key={project.id}>
                    <button
                      type="button"
                      className="merlin-project-row"
                      aria-current={project.id === selectedId ? "true" : undefined}
                      onClick={() => setSelectedId(project.id)}
                    >
                      <span className="merlin-project-row-name">{project.name}</span>
                      <span className="merlin-project-row-meta">
                        {PROJECT_STATUS_LABELS[project.status]} ·{" "}
                        {project.repository
                          ? project.repository.available
                            ? "Repository"
                            : "Repository unavailable"
                          : "No repository"}{" "}
                        · {docsRootLabel(project)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section
            className="merlin-surface merlin-project-detail"
            aria-label="Project registration"
          >
            {selected ? (
              <>
                <div>
                  <h2 className="merlin-section-title">{selected.name}</h2>
                  {selected.description ? (
                    <p className="merlin-reading">{selected.description}</p>
                  ) : (
                    <p className="merlin-metadata">No description</p>
                  )}
                </div>

                <dl className="merlin-project-facts">
                  <div>
                    <dt>Status</dt>
                    <dd>{PROJECT_STATUS_LABELS[selected.status]}</dd>
                  </div>
                  <div>
                    <dt>Repository</dt>
                    <dd>
                      {repository ? (
                        <span className="merlin-project-path">{repository.path}</span>
                      ) : (
                        "Not connected"
                      )}
                    </dd>
                  </div>
                  {repository ? (
                    <div>
                      <dt>Repository state</dt>
                      <dd>{repository.available ? "Available" : "Unavailable"}</dd>
                    </div>
                  ) : null}
                  {repository?.remoteIdentity ? (
                    <div>
                      <dt>Remote identity</dt>
                      <dd className="merlin-project-path">{repository.remoteIdentity}</dd>
                    </div>
                  ) : null}
                  <div>
                    <dt>Docs root</dt>
                    <dd>
                      {docsRoot ? (
                        docsRoot.status === "skipped" ? (
                          "Not configured (skipped)"
                        ) : (
                          <>
                            {docsRoot.kind === "repository"
                              ? docsRoot.relativePath
                              : "Merlin Project Store"}
                            {" · "}
                            {docsRoot.available ? "Available" : "Missing"}
                          </>
                        )
                      ) : (
                        "Not configured"
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Project Store</dt>
                    <dd>
                      {selected.projectStoreReady ? "Ready" : "Unavailable"}
                      <span className="merlin-project-path merlin-project-store-path">
                        {selected.projectStorePath}
                      </span>
                    </dd>
                  </div>
                </dl>

                <div className="merlin-project-actions">
                  {!repository ? (
                    <Dialog
                      open={connectOpen}
                      onOpenChange={(open) => {
                        setConnectOpen(open)
                        if (!open) {
                          setConnectError(null)
                          setReconnect(null)
                        }
                      }}
                      trigger={<Button type="button">Connect repository</Button>}
                      title="Connect repository"
                      description="Use an existing local folder as the repository for this project. Merlin stores the canonical path and optional remote identity."
                      footer={
                        reconnect ? (
                          <Button type="button" onClick={handleOpenExistingProject}>
                            Open {reconnect.name}
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            onClick={() => void handleConnectRepository()}
                            disabled={busy}
                          >
                            Connect repository
                          </Button>
                        )
                      }
                    >
                      {reconnect ? (
                        <p className="merlin-reading" role="status">
                          This repository is already registered to <strong>{reconnect.name}</strong>
                          . Open that project instead of creating a duplicate.
                        </p>
                      ) : (
                        <>
                          <div>
                            <Label htmlFor="repository-path">Repository folder</Label>
                            <Input
                              id="repository-path"
                              value={repositoryPath}
                              onChange={(event) => setRepositoryPath(event.target.value)}
                              placeholder="C:/dev/project"
                              autoComplete="off"
                            />
                          </div>
                          <div>
                            <Label htmlFor="repository-remote">Remote identity (optional)</Label>
                            <Input
                              id="repository-remote"
                              value={remoteIdentity}
                              onChange={(event) => setRemoteIdentity(event.target.value)}
                              placeholder="https://... or git@..."
                              autoComplete="off"
                            />
                          </div>
                          {connectError ? (
                            <p className="merlin-status" data-kind="error" role="alert">
                              {connectError}
                            </p>
                          ) : null}
                        </>
                      )}
                    </Dialog>
                  ) : null}

                  {canConfigureDocs ? (
                    <>
                      {detection?.candidateRelativePath ? (
                        <Dialog
                          open={docsDialog === "confirm"}
                          onOpenChange={(open) => {
                            setDocsDialog(open ? "confirm" : null)
                            if (!open) setDocsError(null)
                          }}
                          trigger={<Button type="button">Confirm docs folder</Button>}
                          title="Use docs as the Docs root?"
                          description={`Merlin will treat ${detection.candidateRelativePath}/ in the connected repository as the primary Docs root for this project.`}
                          footer={
                            <Button
                              type="button"
                              onClick={() =>
                                void runDocsAction(
                                  (projectId) => store.confirmDocsRoot(projectId, "docs"),
                                  "Docs root confirmed.",
                                  "Docs root could not be confirmed.",
                                )
                              }
                              disabled={busy}
                            >
                              Confirm docs root
                            </Button>
                          }
                        >
                          <p className="merlin-reading">
                            No files are moved, copied, or changed by this step.
                          </p>
                          {docsError ? (
                            <p className="merlin-status" data-kind="error" role="alert">
                              {docsError}
                            </p>
                          ) : null}
                        </Dialog>
                      ) : (
                        <Dialog
                          open={docsDialog === "create"}
                          onOpenChange={(open) => {
                            setDocsDialog(open ? "create" : null)
                            if (!open) setDocsError(null)
                          }}
                          trigger={<Button type="button">Create docs folder</Button>}
                          title="Create docs folder?"
                          description="Merlin will create an empty docs/ folder inside the connected repository. Nothing else is written until you register documents."
                          footer={
                            <Button
                              type="button"
                              onClick={() =>
                                void runDocsAction(
                                  (projectId) => store.createDocsRoot(projectId),
                                  "Docs folder created and registered.",
                                  "Docs folder could not be created or registered.",
                                )
                              }
                              disabled={busy}
                            >
                              Create docs folder
                            </Button>
                          }
                        >
                          <p className="merlin-reading">
                            Creating this folder is explicit; Merlin never creates repository
                            folders silently.
                          </p>
                          {docsError ? (
                            <p className="merlin-status" data-kind="error" role="alert">
                              {docsError}
                            </p>
                          ) : null}
                        </Dialog>
                      )}

                      <Dialog
                        open={docsDialog === "choose"}
                        onOpenChange={(open) => {
                          setDocsDialog(open ? "choose" : null)
                          if (!open) {
                            setChoosePath("")
                            setDocsError(null)
                          }
                        }}
                        trigger={
                          <Button type="button" variant="outline">
                            Choose existing folder
                          </Button>
                        }
                        title="Choose an existing Docs folder"
                        description="Enter a folder path relative to the connected repository. The folder must already exist and stay inside the repository."
                        footer={
                          <Button type="button" onClick={handleChooseDocsRoot} disabled={busy}>
                            Use this folder
                          </Button>
                        }
                      >
                        <div>
                          <Label htmlFor="docs-relative-path">Folder path</Label>
                          <Input
                            id="docs-relative-path"
                            value={choosePath}
                            onChange={(event) => setChoosePath(event.target.value)}
                            placeholder="documentation"
                            autoComplete="off"
                          />
                        </div>
                        {docsError ? (
                          <p className="merlin-status" data-kind="error" role="alert">
                            {docsError}
                          </p>
                        ) : null}
                      </Dialog>

                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() =>
                          void runDocsAction(
                            (projectId) => store.skipDocsRoot(projectId),
                            "Docs root skipped for now.",
                            "Docs root could not be skipped.",
                          )
                        }
                        disabled={busy}
                      >
                        Skip for now
                      </Button>
                    </>
                  ) : null}
                </div>

                {repository && !repository.available ? (
                  <p className="merlin-status" data-kind="warning" role="status">
                    Repository unavailable. Docs registration is paused until the folder is
                    reachable again; Merlin does not treat absence as deletion.
                  </p>
                ) : null}
                {docsRoot && docsRoot.status === "missing" ? (
                  <p className="merlin-status" data-kind="warning" role="status">
                    Docs root is missing at its registered location. Merlin does not treat absence
                    as deletion and will not scan outside the confirmed root.
                  </p>
                ) : null}
                {docsRoot && docsRoot.status === "active" && docsRoot.available ? (
                  <>
                    <p className="merlin-reading">
                      Browsing is read-only in this milestone. Merlin does not save, rename, delete,
                      watch, or synchronize documents yet.
                    </p>
                    <DocsBrowser key={selected.id} projectId={selected.id} store={docsStore} />
                  </>
                ) : null}
              </>
            ) : (
              <p className="merlin-reading">Select a project to view or update its registration.</p>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
