const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")
const { execFileSync } = require("node:child_process")

function verifyPackagedRuntime(appDirectory) {
  const app = path.resolve(appDirectory)
  const env = { ...process.env }
  delete env.NODE_PATH
  delete env.QVAC_WORKER_PATH
  delete env.QVAC_IPC_SOCKET_PATH
  const options = { cwd: app, env, encoding: "utf8", windowsHide: true, timeout: 30_000, killSignal: "SIGKILL" }
  const binary = execFileSync(process.execPath, ["-e", `
    const { createRequire } = require('node:module');
    process.stdout.write(createRequire(${JSON.stringify(path.join(app, "package.json"))})('bare-runtime-win32-x64').bare);
  `], options).trim()
  assert.ok(binary.startsWith(app + path.sep), `Runtime escapes packaged app: ${binary}`)
  function checkLinks(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      assert.equal(entry.isSymbolicLink(), false, `Dependency link: ${path.join(directory, entry.name)}`)
      if (entry.isDirectory()) checkLinks(path.join(directory, entry.name))
    }
  }
  checkLinks(path.join(app, "node_modules"))
  execFileSync(binary, ["--version"], options)
  // Import the worker core and both plugins without initializing its global
  // worker lock, resource sampler, model cache, or IPC connection.
  execFileSync(binary, ["--eval", `
    import '@qvac/sdk/worker-core';
    import '@qvac/sdk/llamacpp-completion/plugin';
    import '@qvac/sdk/whispercpp-transcription/plugin';
    Bare.exit(0);
  `], options)
}

module.exports = { verifyPackagedRuntime }
if (require.main === module) {
  verifyPackagedRuntime(process.argv[2] ?? path.resolve(__dirname, "../out/Oira-win32-x64/resources/app"))
  process.stdout.write("PACKAGED_RUNTIME_PASS\n")
}
