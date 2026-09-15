const path = require("node:path")
const QvacForgePlugin = require("@qvac/sdk/electron-forge")

module.exports = {
  packagerConfig: {
    name: "Oira",
    executableName: "Oira",
    authors: "Oira contributors",
    asar: false,
    // QVAC bundles and verifies its native worker before Forge packages it.
    // Forge's generic dependency pruner cannot walk pnpm's linked dependency tree.
    prune: false,
    ignore: [
      /^\/src($|\/)/,
      /^\/scripts($|\/)/,
      /^\/out($|\/)/,
      /^\/electron\.vite\.config\.ts$/,
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
}
