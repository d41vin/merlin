import { useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { DocumentRenderer } from "@/markdown/renderer"
import { MARKDOWN_FIXTURES, getFixture } from "@/markdown/fixtures"
import {
  createMilkdownEditor,
  probeMilkdown,
  type ActiveMilkdownEditor,
  type MilkdownProbeResult,
} from "@/markdown/milkdown"

export function MarkdownProof() {
  const [selectedId, setSelectedId] = useState("canonical")
  const fixture = getFixture(selectedId)
  const [source, setSource] = useState(fixture.source)
  const [results, setResults] = useState<Record<string, MilkdownProbeResult>>({})
  const [status, setStatus] = useState("Running Markdown fixture proofs")
  const [proofVersion, setProofVersion] = useState(0)
  const selectedResult = results[selectedId]
  const editorHost = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let active = true
    async function run() {
      const entries: Record<string, MilkdownProbeResult> = {}
      for (const item of MARKDOWN_FIXTURES) {
        entries[item.id] = await probeMilkdown(item.source)
        if (!active) return
      }
      setResults(entries)
      setStatus("All fixture preservation decisions completed")
    }
    void run().catch((error: unknown) => {
      if (active) {
        setStatus(error instanceof Error ? error.message : "Markdown fixture proof failed")
      }
    })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const host = editorHost.current
    if (!host || selectedResult?.mode !== "milkdown") return
    let active: ActiveMilkdownEditor | undefined
    let cancelled = false
    host.replaceChildren()
    void createMilkdownEditor(host, source)
      .then((editor) => {
        if (cancelled) return editor.destroy()
        active = editor
      })
      .catch(() => {
        host.replaceChildren()
      })
    return () => {
      cancelled = true
      if (active) void active.destroy()
    }
  }, [selectedId, selectedResult?.mode, proofVersion, source])

  async function reprobeCurrentSource() {
    const result = await probeMilkdown(source)
    setResults((previous) => ({ ...previous, [selectedId]: result }))
    setProofVersion((version) => version + 1)
    setStatus(result.detail)
  }

  return (
    <section className="merlin-surface" aria-labelledby="markdown-proof-title">
      <h2 className="merlin-section-title" id="markdown-proof-title">
        Markdown preservation and rendering
      </h2>
      <p className="merlin-reading">
        Rich editing is allowed only after an exact Milkdown round trip. Unsupported constructs use
        source mode. The preview is sanitized separately and cannot invoke native commands.
      </p>
      <label className="merlin-label" htmlFor="markdown-fixture">
        Synthetic Markdown fixture
      </label>
      <select
        id="markdown-fixture"
        className="merlin-control"
        value={selectedId}
        onChange={(event) => {
          const nextId = event.target.value
          setSelectedId(nextId)
          setSource(getFixture(nextId).source)
          setStatus(`Selected ${nextId}`)
        }}
      >
        {MARKDOWN_FIXTURES.map((item) => (
          <option key={item.id} value={item.id}>
            {item.label}
          </option>
        ))}
      </select>
      <div className="merlin-toolbar">
        <Button type="button" variant="outline" onClick={() => void reprobeCurrentSource()}>
          Run current source proof
        </Button>
      </div>
      <div className="merlin-status" role="status" data-testid="markdown-status">
        {status}
      </div>
      <output
        className="merlin-metadata"
        data-testid="selected-markdown-mode"
        data-preserved={selectedResult?.preserved ? "true" : "pending"}
      >
        {selectedResult
          ? `${selectedResult.mode === "milkdown" ? "Milkdown" : "Source fallback"} · ${
              selectedResult.preserved ? "original preserved" : "preservation failed"
            }`
          : "Proof pending"}
      </output>
      <div className="merlin-proof-grid">
        <div>
          <h3 className="merlin-label">Editor boundary</h3>
          <div ref={editorHost} className="merlin-editor-root" data-testid="milkdown-editor-host">
            {selectedResult?.mode !== "milkdown" ? (
              <textarea
                className="merlin-source"
                aria-label="Preserved Markdown source"
                value={source}
                onChange={(event) => setSource(event.target.value)}
                data-testid="markdown-source"
              />
            ) : null}
          </div>
        </div>
        <div>
          <h3 className="merlin-label">Sanitized preview or inert MDX source</h3>
          <DocumentRenderer source={source} />
        </div>
      </div>
      <div className="merlin-fixture-results" aria-label="Markdown fixture results">
        {MARKDOWN_FIXTURES.map((item) => {
          const result = results[item.id]
          return (
            <div
              className="merlin-fixture-row"
              key={item.id}
              data-fixture={item.id}
              data-result={result?.preserved ? "pass" : "pending"}
              data-mode={result?.mode ?? "pending"}
            >
              <span>{item.label}</span>
              <span>{result?.mode ?? "pending"}</span>
              <span>{result?.preserved ? "PRESERVED" : "PENDING"}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
