import {
  createResizableController,
  Resizable,
  ResizableHandle,
  ResizablePanel,
} from "@ui-sdk/react/resizable"
import { Fragment, useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  cloneLayout,
  DEFAULT_PANEL_LAYOUT,
  fromUiSdkLayout,
  ORDERED_PANEL_IDS,
  toUiSdkLayout,
  validatePanelLayout,
  type PanelLayout,
} from "@/layout/model"
import type { LayoutStore } from "@/layout/store"

interface PanelProofProps {
  store: LayoutStore
}

const PANEL_LABELS: Record<(typeof ORDERED_PANEL_IDS)[number], string> = {
  docs: "Docs",
  todos: "Todos",
  activity: "Activity",
  resources: "Resources",
}

export function PanelProof({ store }: PanelProofProps) {
  const [controller] = useState(() => createResizableController())
  const [layout, setLayout] = useState<PanelLayout>(() => cloneLayout(DEFAULT_PANEL_LAYOUT))
  const layoutRef = useRef(layout)
  const saveSequence = useRef(0)
  const [status, setStatus] = useState("Loading layout")
  const [statusKind, setStatusKind] = useState<"success" | "error" | "pending">("pending")
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let active = true
    store
      .load()
      .then((stored) => {
        if (!active) return
        const next = stored ? validatePanelLayout(stored) : cloneLayout(DEFAULT_PANEL_LAYOUT)
        layoutRef.current = next
        setLayout(next)
        setLoaded(true)
        setStatus(
          store.kind === "sqlite" ? "SQLite layout ready" : "Browser-only interaction proof",
        )
        setStatusKind("success")
      })
      .catch((error: unknown) => {
        if (!active) return
        setLoaded(true)
        setStatus(error instanceof Error ? error.message : "Layout load failed")
        setStatusKind("error")
      })
    return () => {
      active = false
      saveSequence.current += 1
    }
  }, [store])

  function updateLayout(sizes: number[]) {
    const next = fromUiSdkLayout(sizes, layoutRef.current)
    layoutRef.current = next
    setLayout(next)
    return next
  }

  async function persistLayout(next: PanelLayout) {
    const sequence = ++saveSequence.current
    setStatus("Saving layout")
    setStatusKind("pending")
    try {
      await store.save(next)
      if (sequence !== saveSequence.current) return
      setStatus("Layout saved to SQLite")
      setStatusKind("success")
    } catch (error) {
      if (sequence !== saveSequence.current) return
      setStatus(error instanceof Error ? error.message : "Layout save failed")
      setStatusKind("error")
    }
  }

  function resetLayout() {
    const next = cloneLayout(DEFAULT_PANEL_LAYOUT)
    controller.setLayout(toUiSdkLayout(next), { reason: "imperative" })
    layoutRef.current = next
    setLayout(next)
    void persistLayout(next)
  }

  return (
    <section className="merlin-surface" aria-labelledby="panel-proof-title">
      <h2 className="merlin-section-title" id="panel-proof-title">
        UI SDK panel interaction
      </h2>
      <p className="merlin-reading">
        Four controlled panels expose pointer, keyboard, collapse, restore, and reset behavior.
        Layout commits use typed Tauri commands; browser localStorage is never configured.
      </p>
      <div className="merlin-toolbar">
        <Button type="button" variant="outline" onClick={resetLayout} disabled={!loaded}>
          Reset panel layout
        </Button>
      </div>
      <div
        className="merlin-status"
        role="status"
        data-kind={statusKind}
        data-testid="layout-status"
      >
        {status}
      </div>
      <div className="merlin-panel-proof" data-testid="panel-proof">
        <Resizable
          controller={controller}
          layout={toUiSdkLayout(layout)}
          onLayoutChange={(sizes) => {
            updateLayout(sizes)
          }}
          onLayoutCommit={(sizes) => {
            const next = fromUiSdkLayout(sizes, layoutRef.current)
            layoutRef.current = next
            void persistLayout(next)
          }}
          role="group"
          aria-label="Phase 0 panel proof"
        >
          {ORDERED_PANEL_IDS.map((id, index) => {
            const panel = layout.panels[index]
            if (!panel) throw new Error(`Missing panel state: ${id}`)
            return (
              <Fragment key={id}>
                <ResizablePanel
                  id={id}
                  defaultSize={panel.restoreSize}
                  minSize={10}
                  collapsible
                  collapsedSize={0}
                  data-testid={`panel-${id}`}
                  role="region"
                  aria-label={PANEL_LABELS[id]}
                >
                  <div className="merlin-panel-heading">
                    <h3>{PANEL_LABELS[id]}</h3>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="merlin-panel-collapse"
                      aria-label={`${panel.collapsed ? "Restore" : "Collapse"} ${PANEL_LABELS[id]}`}
                      onClick={() => {
                        if (controller.isCollapsed(id)) controller.expand(id)
                        else controller.collapse(id)
                      }}
                    >
                      {panel.collapsed ? "Restore" : "Collapse"}
                    </Button>
                  </div>
                  <div className="merlin-metadata" data-testid={`panel-size-${id}`}>
                    {panel.size.toFixed(1)}% · restore {panel.restoreSize.toFixed(1)}%
                  </div>
                  <button type="button" className="merlin-link-button" tabIndex={0}>
                    Focus sentinel {PANEL_LABELS[id]}
                  </button>
                </ResizablePanel>
                {index < ORDERED_PANEL_IDS.length - 1 ? (
                  <ResizableHandle
                    aria-label={`Resize ${PANEL_LABELS[id]} and ${
                      PANEL_LABELS[ORDERED_PANEL_IDS[index + 1] ?? "resources"]
                    }`}
                  />
                ) : null}
              </Fragment>
            )
          })}
        </Resizable>
      </div>
      <output className="merlin-result" data-testid="layout-json" aria-label="Current layout">
        {JSON.stringify(layout)}
      </output>
    </section>
  )
}
