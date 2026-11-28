import { createRoot } from "react-dom/client"

import { applyApplicationSettings } from "@/settings/apply"
import { DEFAULT_APPLICATION_SETTINGS } from "@/settings/model"
import { ControlsHarness } from "./ControlsHarness"
import "@/styles/index.css"

const HARNESS_ENTRY_MARKER = "merlin-controls-harness-entry-v1"

document.documentElement.dataset.controlsHarness = HARNESS_ENTRY_MARKER
applyApplicationSettings(DEFAULT_APPLICATION_SETTINGS)
const root = document.getElementById("root")
if (!root) throw new Error("Missing controls harness root")
createRoot(root).render(<ControlsHarness />)
