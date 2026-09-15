import { resolve } from "node:path"
import { defineConfig, externalizeDepsPlugin } from "electron-vite"
import react from "@vitejs/plugin-react"

export default defineConfig({
  main: {
    // Workspace packages export TypeScript source. Bundle them so packaged
    // Electron never tries to execute .ts from node_modules.
    plugins: [externalizeDepsPlugin({ exclude: ["@oira/types", "@qvac/sdk", "zod"] })],
    build: {
      outDir: resolve("dist/main"),
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: resolve("dist/preload"),
      // Sandboxed preloads cannot be ESM (verified: window.oira stayed
      // undefined with an .mjs preload and sandbox: true).
      rollupOptions: {
        output: {
          format: "cjs",
          entryFileNames: "index.cjs",
        },
      },
    },
  },
  renderer: {
    root: resolve("src/renderer"),
    plugins: [react()],
    build: {
      outDir: resolve("dist/renderer"),
    },
  },
})
