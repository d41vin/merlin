import { useEffect, useState, type ComponentType } from "react"

import { INITIAL_DESTINATION, type DestinationId } from "@/app/navigation"
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
    <div className="merlin-shell">
      <aside className="merlin-shell-sidebar" aria-label="Sidebar">
        <p className="merlin-metadata merlin-shell-brand">Merlin</p>
        <PrimaryNavigation activeDestination={destination} onNavigate={setDestination} />
      </aside>
      <main className="merlin-shell-main" aria-labelledby={PAGE_HEADING_ID}>
        {settingsFailed ? <StatusMessage /> : null}
        <Page />
      </main>
    </div>
  )
}
