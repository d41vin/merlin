import { UnavailableState } from "@/components/common/UnavailableState"
import { PageHeader } from "@/components/shell/PageHeader"

export const RESOURCES_UNAVAILABLE_DESCRIPTION =
  "Resource records, accounts, and usage tracking are not implemented in this build."

export function ResourcesPage() {
  return (
    <div className="merlin-shell-page">
      <PageHeader title="Resources" />
      <UnavailableState description={RESOURCES_UNAVAILABLE_DESCRIPTION} />
    </div>
  )
}
