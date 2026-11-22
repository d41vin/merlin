export const ORDERED_PANEL_IDS = ["docs", "todos", "activity", "resources"] as const

export type PanelId = (typeof ORDERED_PANEL_IDS)[number]

export interface PanelState {
  id: PanelId
  size: number
  restoreSize: number
  collapsed: boolean
}

export interface PanelLayout {
  version: 1
  panels: PanelState[]
}

export const DEFAULT_PANEL_LAYOUT: PanelLayout = {
  version: 1,
  panels: ORDERED_PANEL_IDS.map((id) => ({
    id,
    size: 25,
    restoreSize: 25,
    collapsed: false,
  })),
}

export function cloneLayout(layout: PanelLayout): PanelLayout {
  return {
    version: 1,
    panels: layout.panels.map((panel) => ({ ...panel })),
  }
}

export function validatePanelLayout(value: unknown): PanelLayout {
  if (!value || typeof value !== "object") throw new Error("Layout must be an object")
  const candidate = value as Partial<PanelLayout>
  const rootKeys = Object.keys(value).sort()
  if (rootKeys.join(",") !== "panels,version") {
    throw new Error("Layout contains unknown fields")
  }
  if (candidate.version !== 1) throw new Error("Layout version must be 1")
  if (!Array.isArray(candidate.panels) || candidate.panels.length !== ORDERED_PANEL_IDS.length) {
    throw new Error("Layout must contain exactly four panels")
  }

  const panels = candidate.panels.map((panel, index) => {
    if (!panel || typeof panel !== "object") throw new Error("Panel must be an object")
    const panelKeys = Object.keys(panel).sort()
    if (panelKeys.join(",") !== "collapsed,id,restoreSize,size") {
      throw new Error("Panel contains unknown fields")
    }
    const expectedId = ORDERED_PANEL_IDS[index]
    if (panel.id !== expectedId) {
      throw new Error(`Panel ${index} must be ${expectedId}`)
    }
    if (!Number.isFinite(panel.size) || panel.size < 0 || panel.size > 100) {
      throw new Error(`Panel ${expectedId} has an invalid size`)
    }
    if (!Number.isFinite(panel.restoreSize) || panel.restoreSize <= 0 || panel.restoreSize > 100) {
      throw new Error(`Panel ${expectedId} has an invalid restore size`)
    }
    if (typeof panel.collapsed !== "boolean" || panel.collapsed !== (panel.size === 0)) {
      throw new Error(`Panel ${expectedId} has inconsistent collapse state`)
    }
    return { ...panel }
  })

  const total = panels.reduce((sum, panel) => sum + panel.size, 0)
  if (!Number.isFinite(total) || Math.abs(total - 100) > 0.01) {
    throw new Error("Panel sizes must sum to 100 within 0.01")
  }
  return { version: 1, panels }
}

export function fromUiSdkLayout(sizes: number[], previous: PanelLayout): PanelLayout {
  if (sizes.length !== ORDERED_PANEL_IDS.length) {
    throw new Error("UI SDK returned an unexpected panel count")
  }

  const layout = {
    version: 1 as const,
    panels: ORDERED_PANEL_IDS.map((id, index) => {
      const size = sizes[index]
      if (size === undefined) throw new Error(`Missing UI SDK size for ${id}`)
      const oldPanel = previous.panels[index]
      if (oldPanel === undefined) throw new Error(`Missing prior panel ${id}`)
      return {
        id,
        size,
        restoreSize: size > 0 ? size : oldPanel.restoreSize,
        collapsed: size === 0,
      }
    }),
  }
  return validatePanelLayout(layout)
}

export function toUiSdkLayout(layout: PanelLayout): number[] {
  const valid = validatePanelLayout(layout)
  return valid.panels.map((panel) => panel.size)
}
