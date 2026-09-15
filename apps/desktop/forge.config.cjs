const path = require("node:path")
const QvacForgePlugin = require("@qvac/sdk/electron-forge")
const { packageProductionDependencies } = require("./scripts/package-production-dependencies.cjs")

module.exports = {
  packagerConfig: {
    name: "Oira",
    executableName: "Oira",
    authors: "Oira contributors",
    asar: false,
    // The copy hook supplies a hoisted production tree that Forge can prune.
    // QVAC's afterPrune hook then removes non-Windows/native-arch prebuilds.
    prune: true,
    ignore: [
      /^\/src($|\/)/,
      /^\/scripts($|\/)/,
      /^\/out($|\/)/,
      // A standalone, locked production tree replaces pnpm's workspace links.
      /^\/node_modules($|\/)/,
      /^\/electron\.vite\.config\.ts$/,
      /^\/electron\.vite\.config\..*\.mjs$/,
      /^\/tsconfig\..*\.json$/,
      /^\/vitest\.config\.ts$/,
    ],
  },
  makers: [
    {
      name: "@electron-forge/maker-squirrel",
      config: {
        name: "Oira",
        setupExe: "Oira-Setup-x64.exe",
        noMsi: true,
      },
    },
  ],
  plugins: [
    new QvacForgePlugin({
      projectDir: __dirname,
      configPath: path.resolve(__dirname, "../../qvac.config.mjs"),
      hosts: ["win32-x64"],
    }),
  ],
  hooks: {
    packageAfterCopy: async (_config, buildPath) => {
      const fs = require("node:fs")
      await packageProductionDependencies(buildPath)
      const worker = path.join(buildPath, "qvac", "worker.entry.mjs")
      try {
        if (fs.existsSync(worker)) {
          const source = fs.readFileSync(worker, "utf8")
          const rewritten = source.replace(/"file:\/\/[^"]*\/node_modules\//g, '"../node_modules/')
          if (rewritten !== source) fs.writeFileSync(worker, rewritten)
        }
      } catch {}
      try {
        const bare = path.join(buildPath, "node_modules")
        for (const entry of fs.readdirSync(bare)) {
          if (entry.startsWith("bare-runtime")) {
            const bin = path.join(bare, entry, "bin")
            if (fs.existsSync(bin)) for (const file of fs.readdirSync(bin)) {
              try { fs.chmodSync(path.join(bin, file), 0o755) } catch {}
            }
          }
        }
      } catch {}
    },
  },
}
