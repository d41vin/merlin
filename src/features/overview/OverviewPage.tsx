import { UnavailableState } from "@/components/common/UnavailableState"
import { PageHeader } from "@/components/shell/PageHeader"

export const OVERVIEW_UNAVAILABLE_DESCRIPTION =
  "Overview is not implemented in this build. Project summaries, resource readiness, and activity are not available yet."

export function OverviewPage() {
  return (
    <div className="merlin-shell-page">
      <PageHeader title="Overview" />
      <UnavailableState description={OVERVIEW_UNAVAILABLE_DESCRIPTION} />
    </div>
  )
}
