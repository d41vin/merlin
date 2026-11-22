import { createRoot } from "react-dom/client"

import { App } from "./App"
import "./styles/index.css"
import { applyBundledTheme } from "./themes"

applyBundledTheme("merlin-dark")
const root = document.getElementById("root")
if (!root) throw new Error("Missing application root")
createRoot(root).render(<App />)
