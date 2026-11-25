import { createRoot } from "react-dom/client"

import { applyApplicationSettings } from "@/settings/apply"
import { DEFAULT_APPLICATION_SETTINGS } from "@/settings/model"
import { ProofHarness } from "./ProofHarness"
import "@/styles/index.css"
import "@/styles/preflight.css"

const HARNESS_ENTRY_MARKER = "merlin-proof-harness-entry-v1"

document.documentElement.dataset.proofHarness = HARNESS_ENTRY_MARKER
applyApplicationSettings(DEFAULT_APPLICATION_SETTINGS)
const root = document.getElementById("root")
if (!root) throw new Error("Missing proof harness root")
createRoot(root).render(<ProofHarness />)
