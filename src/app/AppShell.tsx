import { Resizable, ResizableHandle, ResizablePanel } from "@ui-sdk/react/resizable"
import { useEffect, useState, type ComponentType } from "react"

import {
  DEFAULT_SIDEBAR_WIDTH,
  INITIAL_DESTINATION,
  initialSidebarLayout,
  MAX_SIDEBAR_WIDTH,
  MIN_SIDEBAR_WIDTH,
  type DestinationId,
} from "@/app/navigation"
import { StatusMessage } from "@/components/common/StatusMessage"
import { PAGE_HEADING_ID } from "@/components/shell/PageHeader"
import { PrimaryNavigation } from "@/components/shell/PrimaryNavigation"
import { OverviewPage } from "@/features/overview/OverviewPage"
import { ProjectsPage } from "@/features/projects/ProjectsPage"
import { ResourcesPage } from "@/features/resources/ResourcesPage"
import { applyApplicationSettings } from "@/settings/apply"
import { defaultApplicationSettings } from "@/settings/model"
import { createApplicationSettingsStore } from "@/settings/store"

const PAGES: Record<DestinationId, ComponentType> = {
  overview: OverviewPage,
  projects: ProjectsPage,
  resources: ResourcesPage,
}

export function AppShell() {
  const [settingsStore] = useState(createApplicationSettingsStore)
  const [settingsFailed, setSettingsFailed] = useState(false)
  const [destination, setDestination] = useState<DestinationId>(INITIAL_DESTINATION)
  const [sidebarLayout] = useState(() => initialSidebarLayout(window.innerWidth))

  useEffect(() => {
    let active = true
    settingsStore
      .load()
      .then((stored) => {
        if (!active) return
        applyApplicationSettings(stored)
      })
      .catch(() => {
        if (!active) return
        applyApplicationSettings(defaultApplicationSettings())
        setSettingsFailed(true)
      })
    return () => {
      active = false
    }
  }, [settingsStore])

  const Page = PAGES[destination]

  return (
    <Resizable className="merlin-shell" defaultLayout={sidebarLayout}>
      <ResizablePanel
        id="merlin-sidebar"
        className="merlin-shell-sidebar-panel"
        defaultSize={`${DEFAULT_SIDEBAR_WIDTH}px`}
        minSize={`${MIN_SIDEBAR_WIDTH}px`}
        maxSize={`${MAX_SIDEBAR_WIDTH}px`}
      >
        <aside className="merlin-shell-sidebar" aria-label="Sidebar">
          <p className="merlin-metadata merlin-shell-brand">Merlin</p>
          <PrimaryNavigation activeDestination={destination} onNavigate={setDestination} />
        </aside>
      </ResizablePanel>
      <ResizableHandle className="merlin-shell-resize-handle" aria-label="Resize sidebar" />
      <ResizablePanel className="merlin-shell-content-panel">
        <main className="merlin-shell-main" aria-labelledby={PAGE_HEADING_ID}>
          {settingsFailed ? <StatusMessage /> : null}
          <Page />
        </main>
      </ResizablePanel>
    </Resizable>
  )
}
