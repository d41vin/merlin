import { UnavailableState } from "@/components/common/UnavailableState"
import { PageHeader } from "@/components/shell/PageHeader"

export const PROJECTS_UNAVAILABLE_DESCRIPTION =
  "Project records and the project workbench are not implemented in this build."

export function ProjectsPage() {
  return (
    <div className="merlin-shell-page">
      <PageHeader title="Projects" />
      <UnavailableState description={PROJECTS_UNAVAILABLE_DESCRIPTION} />
    </div>
  )
}
