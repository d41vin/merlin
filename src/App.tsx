import { FlaskConical, ShieldCheck } from "lucide-react"
import { useEffect, useState } from "react"

import { MarkdownProof } from "@/components/MarkdownProof"
import { PanelProof } from "@/components/PanelProof"
import { createLayoutStore } from "@/layout/store"
import { classifyDocumentLink } from "@/markdown/url-policy"

export function App() {
  const [store] = useState(createLayoutStore)
  const [externalLink, setExternalLink] = useState("No external link selected")

  useEffect(() => {
    function handleExternalLink(event: Event) {
      const value = event instanceof CustomEvent ? event.detail : undefined
      const link = classifyDocumentLink(value)
      if (link.kind === "external") {
        setExternalLink(`Explicit click validated: ${link.value}`)
      }
    }
    document.addEventListener("merlin:external-link", handleExternalLink)
    return () => document.removeEventListener("merlin:external-link", handleExternalLink)
  }, [])

  return (
    <main className="merlin-page">
      <header className="merlin-header">
        <div>
          <h1 className="merlin-page-title">Merlin Phase 0 technical preflight</h1>
          <p className="merlin-reading">
            Minimal proof shell for the approved stack. This is not a Merlin product screen.
          </p>
        </div>
        <span className="merlin-metadata">
          <FlaskConical aria-hidden="true" size={14} /> Phase 0 only
        </span>
      </header>
      <section className="merlin-surface merlin-surface-elevated" aria-labelledby="boundary-title">
        <h2 className="merlin-section-title" id="boundary-title">
          <ShieldCheck aria-hidden="true" size={15} /> Verification boundary
        </h2>
        <p className="merlin-reading">
          Persistence transport:{" "}
          {store.kind === "sqlite" ? "typed Tauri commands to SQLite" : "browser unavailable"}.
          Rendered document content receives no Tauri bindings, filesystem APIs, shell access, or
          remote-fetch permission. Native proofs run separately with temporary data and synthetic
          credentials.
        </p>
        <output className="merlin-metadata" role="status" data-testid="external-link-status">
          {externalLink}
        </output>
      </section>
      <PanelProof store={store} />
      <MarkdownProof />
    </main>
  )
}
