import { describe, expect, it } from "vitest"

import {
  cloneLayout,
  type PanelLayout,
  DEFAULT_PANEL_LAYOUT,
  fromUiSdkLayout,
  ORDERED_PANEL_IDS,
  toUiSdkLayout,
  validatePanelLayout,
} from "./model"

describe("panel layout serialization", () => {
  it("round-trips validated UI SDK sizes and retains collapse restore sizes", () => {
    const layout = fromUiSdkLayout([40, 0, 35, 25], DEFAULT_PANEL_LAYOUT)
    expect(layout.panels.map((panel) => panel.id)).toEqual(ORDERED_PANEL_IDS)
    expect(layout.panels[1]).toEqual({
      id: "todos",
      size: 0,
      restoreSize: 25,
      collapsed: true,
    })
    expect(validatePanelLayout(JSON.parse(JSON.stringify(layout)))).toEqual(layout)
    expect(toUiSdkLayout(layout)).toEqual([40, 0, 35, 25])
  })

  it("does not mutate the default layout across resets", () => {
    const copy = cloneLayout(DEFAULT_PANEL_LAYOUT)
    copy.panels[0]!.size = 50
    expect(DEFAULT_PANEL_LAYOUT.panels[0]!.size).toBe(25)
    expect(fromUiSdkLayout([25, 25, 25, 25], copy)).toEqual(DEFAULT_PANEL_LAYOUT)
  })

  it("rejects malformed, non-finite, unknown, and inconsistent snapshots", () => {
    const invalid = [
      null,
      {},
      { ...DEFAULT_PANEL_LAYOUT, version: 2 },
      { ...DEFAULT_PANEL_LAYOUT, extra: true },
      { ...DEFAULT_PANEL_LAYOUT, panels: DEFAULT_PANEL_LAYOUT.panels.slice(1) },
      { ...DEFAULT_PANEL_LAYOUT, panels: [...DEFAULT_PANEL_LAYOUT.panels].reverse() },
      ...[
        (layout: PanelLayout) => {
          layout.panels[0]!.size = Number.NaN
        },
        (layout: PanelLayout) => {
          layout.panels[0]!.size = -1
        },
        (layout: PanelLayout) => {
          layout.panels[0]!.size = 24
        },
        (layout: PanelLayout) => {
          layout.panels[0]!.size = 0
        },
        (layout: PanelLayout) => {
          layout.panels[0]!.restoreSize = 0
        },
        (layout: PanelLayout) => {
          Object.assign(layout.panels[0]!, { unexpected: true })
        },
      ].map((mutate) => {
        const layout = cloneLayout(DEFAULT_PANEL_LAYOUT)
        mutate(layout)
        return layout
      }),
    ]

    for (const candidate of invalid) {
      expect(() => validatePanelLayout(candidate)).toThrow()
    }
  })
})
