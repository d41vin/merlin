export const PAGE_HEADING_ID = "merlin-page-heading"

interface PageHeaderProps {
  title: string
  description?: string
}

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <header>
      <h1 className="merlin-page-title" id={PAGE_HEADING_ID}>
        {title}
      </h1>
      {description ? <p className="merlin-reading">{description}</p> : null}
    </header>
  )
}
