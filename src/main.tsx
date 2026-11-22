import { createRoot } from "react-dom/client"

import { App } from "./App"
import { applyApplicationSettings } from "./settings/apply"
import { DEFAULT_APPLICATION_SETTINGS } from "./settings/model"
import "./styles/index.css"

applyApplicationSettings(DEFAULT_APPLICATION_SETTINGS)
const root = document.getElementById("root")
if (!root) throw new Error("Missing application root")
createRoot(root).render(<App />)
