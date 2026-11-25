import { fileURLToPath, URL } from "node:url"

import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  clearScreen: false,
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    outDir: "dist-harness",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        application: fileURLToPath(new URL("./index.html", import.meta.url)),
        proofs: fileURLToPath(new URL("./tests/harness/proofs.html", import.meta.url)),
      },
    },
  },
})
