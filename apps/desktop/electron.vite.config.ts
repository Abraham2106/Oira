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
      // bare-runtime selects its platform package with a computed require().
      // Forge ships that native package; leave its resolution to Node at runtime.
      commonjsOptions: { ignoreDynamicRequires: true },
      rollupOptions: {
        input: {
          index: resolve("src/main/index.ts"),
          gateway: resolve("src/main/qvac/gateway.ts"),
          "gpu-probe": resolve("src/main/qvac/gpu-probe.ts"),
        },
        external: ["node:sqlite"],
        output: {
          banner: 'import { createRequire as oiraCreateRequire } from "node:module"; const require = oiraCreateRequire(import.meta.url);',
        },
      },
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
