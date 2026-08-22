# NotaLocal — Researcher prompts (backend investigations)

Standalone, copy-pasteable prompts for a researcher model (or an engineer executing a lab protocol). Each prompt is self-contained. Product context is repeated so the prompt works without the rest of this file.

**How to use:** copy one `## Prompt R-n` section in full. Do not merge investigations. Write the decision to the path named in that prompt.

---

## Prompt R-1

**ID:** R-1  
**Title:** Reproduce the official QVAC Electron tutorial end-to-end, including `npm run package`  
**Priority:** P0 — BLOCKS EVERYTHING  
**Kind:** LAB / SPIKE PROTOCOL (empirical). Desk-gather official docs first; the decision cannot be made from literature alone.

### Role / context

You are a researcher supporting **Justin**, backend owner of **NotaLocal**: a 100% local Electron desktop app for clinical documentation (hackathon, QVAC / Tether track).

Stack that must be proven, not assumed:

- Electron **Main process = local backend**. No Express. No cloud DB. No remote inference fallback.
- Renderer has **no Node**. IPC only via a preload `contextBridge` that will later expose `window.notalocal` (the official tutorial uses the same pattern: `contextIsolation: true`, `nodeIntegration: false`).
- Local inference via **QVAC**. Architectural rule: **`@qvac/sdk` is the ONLY place that may import QVAC**. In NotaLocal that will be `src/main/qvac/` only. The tutorial scaffold may differ; do not “improve” isolation until the tutorial itself packages.
- Persistence will be SQLite (investigated in R-3). Not in scope here except as a packaging risk you must **not** introduce yet.
- Clinical data must not leave the machine unless the doctor **explicitly exports**. You will **not** claim “data never leaves the device.”

This investigation is the gate. If the official tutorial cannot be installed, run, and packaged on **target hardware**, NotaLocal has no stack.

### Hard constraints

1. **NEVER invent QVAC API signatures, parameters, return types, event names, or error codes.** If a signature is not in official QVAC documentation or in the published TypeScript types of the **pinned** `@qvac/sdk` you actually installed, write `TODO: VERIFY FROM OFFICIAL QVAC DOCUMENTATION` and stop. Do not write a “plausible” signature.
2. Do **not** claim “100% secure”, “military encryption”, HIPAA / HIPAA-compliant, “100% offline”, or “data never leaves the device”. Export is an explicit doctor action and is a permitted data exit.
3. Prefer **official** sources: QVAC docs, Electron docs, Node docs. Blog posts and GitHub issues are secondary and must be labeled unofficial.
4. Follow the official tutorial **literally** first (including answering **No** to the Electron updater plugin and **No** to the download-mirror proxy if the tutorial still says so). Record every deviation you were forced to make.
5. Do not add NotaLocal features, SQLite, SQLCipher, custom preload APIs, or extra native addons in this spike. The artifact is a **faithful packaged tutorial app**.
6. Produce a **concrete decision** written to `docs/research/R-1-qvac-electron-tutorial.md`. An investigation without a written decision is incomplete.
7. If you cannot run the lab (no hardware, no GPU, CI-only environment), complete Phase 0 (desk) fully, mark every lab step `BLOCKED — NEEDS TARGET HARDWARE`, and do **not** invent pass/fail results.

### Questions this investigation must answer

1. Does the official QVAC Electron stack **install, run, load a model, and complete the tutorial’s inference path** on each target machine we care about (record OS, CPU arch, RAM, GPU if any)?
2. Which **exact versions** must we pin in NotaLocal `package.json` / lockfile? (`@qvac/sdk`, Electron, Node, npm, electron-vite, Electron Forge and the QVAC Forge plugin if the tutorial uses them, and any other packages the scaffold pulls in.)
3. What is the official **minimum environment** (Node, npm, OS, RAM/disk) as documented today? Does our hardware meet it?
4. What **breaks `npm run package`** (or the tutorial’s exact package script)? Native addons, ASAR, universal macOS builds, missing helper / sandbox, path collisions (`dist/` vs `out/`), missing binaries, architecture mismatches?
5. After packaging, does the **packaged app** start and complete the same inference path as `npm run dev`?
6. Which tutorial caveats are **confirmed on our machines** (for example: Linux `--no-sandbox` / `app.commandLine.appendSwitch('no-sandbox')`; Forge plugin forcing `asar: false`; macOS universal builds blocked)? Treat each as `TODO: VERIFY FROM OFFICIAL QVAC DOCUMENTATION` until you have both a doc citation **and** an empirical result.
7. What is the smallest honest **go / no-go** for NotaLocal: proceed on these pins, proceed with listed workarounds, or the stack is not viable on target hardware?

### Method / sources

#### Phase 0 — desk (do this first; no hardware required for reading)

Gather and quote (with URL + retrieval date + section heading). Do not paraphrase APIs into invented signatures.

| Source | What to extract |
|---|---|
| Official QVAC Electron tutorial: https://docs.qvac.tether.io/tutorials/electron/ | Scaffold command, prompts (updater / mirror), Linux sandbox notes, Main-vs-Renderer rules, package script name, packaging caveats |
| Official QVAC system requirements: https://docs.qvac.tether.io/system-requirements/ | RAM, CPU, GPU, disk, OS matrix |
| Official QVAC JS/TS SDK docs (path as published; start from https://docs.qvac.tether.io/) | Supported runtimes, Node version, how the worker is loaded |
| Official QVAC download-lifecycle docs: https://docs.qvac.tether.io/models/download-lifecycle/ | Only as needed to complete the tutorial’s first-run model download |
| Published types after install: `node_modules/@qvac/sdk/dist/**/*.d.ts` | Pin the **installed** version; copy type paths you relied on; never invent |
| Electron official docs (version = the Electron the tutorial installs) | `contextIsolation`, `nodeIntegration`, packaging, `app.commandLine` |
| Node official docs | The Node version Electron embeds vs the Node you use to install |

Internal notes (not sources of API truth): NotaLocal `docs/BACKEND_DESKTOP_ARCHITECTURE_GUIDE.md` §0.6, §7.7, §21 R-1, Appendix A. If an internal note disagrees with official docs, **official docs win** and you record the discrepancy.

#### Phase 1 — lab protocol (target hardware required)

Execute on **each** target machine. One machine is not a matrix.

**P1. Record the machine (before any install)**

- OS name + version; CPU model + arch (`uname -m` / `system_profiler` / `wmic`); total RAM; free disk; GPU model + driver if present; whether the session is headed (GUI) or headless.
- `node -v`, `npm -v` **before** any version manager change. Then install the versions the official tutorial requires (internal notes claim Node `>= v22.17` and npm `>= v10.9` — **verify**).
- If the SDK or docs mention a doctor / diagnostic CLI, run **only** what official docs name. Do not invent a command. Paste official output.

**P2. Scaffold exactly as the tutorial**

- Use the official create command from current docs (internal notes mention `npm create @quick-start/electron@latest … -- --template react-ts` — **re-verify**; do not assume the package name is stable).
- Answer tutorial prompts as documented.
- Commit or zip the untouched scaffold (`package-lock.json` included) before any edit.

**P3. Follow every tutorial step through first successful local run**

- Record the exact commands, full stdout/stderr of failures, and the first command that succeeds.
- On Linux, apply sandbox flags **only** if the official tutorial says to. Record whether the app fails without them.
- Confirm: Renderer cannot `require` Node; QVAC is used from Main as the tutorial shows.
- If the tutorial downloads a model: record approximate size, duration, and whether the UI/docs mention peers / registry. Do **not** yet make offline claims (that is R-7).

**P4. Package**

- Run the tutorial’s package script (internal notes say `npm run package` — **verify** the actual script name in the generated `package.json`).
- Record: success/fail; artifact paths; whether `asar` is true/false in the output; whether a Forge/QVAC plugin overrode config; macOS: did a universal build fail; did you have to build `arm64` and `x64` separately.
- Launch the **packaged** binary (not `electron .`). Repeat the tutorial’s inference happy path.
- List every file you had to change to make packaging work, with the reason.

**P5. Version pin extract**

From the working tree that packaged successfully, extract:

- `node -v`, `npm -v`
- `package.json` `dependencies` + `devDependencies` versions
- lockfile hashes for `@qvac/sdk`, `electron`, `electron-vite`, Electron Forge packages, and any `@qvac/*` packages
- Electron version reported at runtime (`process.versions.electron` in Main)

**P6. Failure taxonomy**

If something breaks, classify: install, native addon load, model download, inference, package, packaged-app launch, architecture, sandbox, path collision, undocumented. Include the **exact** error string. Do not invent an SDK error name if you did not see it.

### Exact output format

Write **one** markdown file: `docs/research/R-1-qvac-electron-tutorial.md`

```markdown
# R-1 — QVAC Electron tutorial + package
Status: CONFIRMED | BLOCKED | FAILED
Date: YYYY-MM-DD
Researcher:
SDK version actually installed:
Electron version actually installed:

## 1. Desk sources (quoted)
| Claim | Official URL + section | Quote (short) | Retrieval date |

## 2. Hardware matrix
| Machine | OS | Arch | RAM | GPU | node/npm | Tutorial dev | Packaged app | Notes |

## 3. Commands that worked (copy-paste)
## 4. Commands / steps that failed (full error text)
## 5. Versions to pin (table: package → exact version → why)
## 6. Packaging findings
- asar:
- macOS universal:
- Linux sandbox:
- Plugin / config overrides:
- Dist folder collision (dist/ vs out/):
## 7. Deviations from the official tutorial
## 8. TODO: VERIFY FROM OFFICIAL QVAC DOCUMENTATION
(list every unsigned / unconfirmed API or flag)
## 9. What we will NOT claim in README or pitch
## 10. Decision
```

Update tags in `docs/BACKEND_DESKTOP_ARCHITECTURE_GUIDE.md` only for statements this spike resolved: `REQUIRES RESEARCH` → `CONFIRMED` or `ASSUMPTION`, with a pointer to this file.

### Decision required (must be one of these, plus pins)

Write **exactly one** primary decision:

- **GO — stack works on listed target hardware.** Pin versions in the table. Proceed to R-2/R-3/R-4 on the same pins.
- **GO WITH WORKAROUNDS —** list each workaround (e.g. Linux `--no-sandbox`, `asar: false` forced, separate macOS arch builds). Workarounds become product constraints, not secrets.
- **NO-GO —** official tutorial or packaged app fails on required hardware. State the blocking error and what would have to change (hardware, OS, or wait for an official SDK release). **Do not start the rest of the backend stack.**

Also decide the **pin set** (Node, npm, Electron, `@qvac/sdk`, Forge/vite as applicable). Unpinned versions are not a decision.

---

## Prompt R-2

**ID:** R-2  
**Title:** Audio format and capture path — `transcribe()` with 16 kHz mono WAV vs MediaRecorder WebM  
**Priority:** P0  
**Kind:** LAB / SPIKE PROTOCOL (empirical). Desk-gather official format lists first; canonical format cannot be chosen from docs alone.

### Role / context

You are a researcher supporting **Justin** (NotaLocal backend). NotaLocal is a local Electron clinical-documentation app. The Renderer (Antonio) captures microphone audio with **no Node**. Main writes temp files and will later expose something like `pushAudioChunk` on `window.notalocal`. That IPC shape **depends on this decision**.

Product pipeline: encounter → record → local STT → local LLM structuring → draft → doctor review → export. P0 transcription is **batch** on a complete file after stop (streaming is P2 / R-8). Audio is deleted when the note is approved; the database stores a **path**, never the audio blob.

Internal architecture **assumption** (not proven): write **WAV PCM mono 16 kHz 16-bit** in Main, because official QVAC examples use 16 kHz mono WAV. The “easy” Chromium path is `MediaRecorder` → **WebM/Opus**, which may be unacceptable.

### Hard constraints

1. **NEVER invent QVAC API signatures.** Names that appear in internal notes (`transcribe`, `audioChunk` as path or buffer, `SUPPORTED_AUDIO_FORMATS`, `FORMATS_NEEDING_DECODE`, Whisper `audio_format` values, `FFMPEG_NOT_AVAILABLE`) are **leads**. Re-read official QVAC transcription docs and the **installed** `@qvac/sdk` types. If you cannot find a field, write `TODO: VERIFY FROM OFFICIAL QVAC DOCUMENTATION`. Do not paste an invented `transcribe({...})` into the decision as if it were official.
2. Do **not** assert format compatibility you did not measure on the pinned SDK version from R-1.
3. Do not claim HIPAA, “100% secure”, or “data never leaves the device”.
4. Do not keep clinical or real-patient audio. Use synthetic speech or a researcher’s own voice with non-clinical content.
5. Prefer official docs: QVAC transcription, Chromium/Electron `MediaRecorder` / `AudioWorklet`, WAV/RIFF spec as needed.
6. Write the decision to `docs/research/R-2-audio-format-and-capture.md`.
7. If hardware / models are unavailable, finish desk work, mark lab rows `BLOCKED`, and do not fabricate accept/reject results.

### Questions this investigation must answer

1. What does the **installed** SDK export as the supported audio container/codec list? Paste the **raw** printed value of the official constant (internal notes name `SUPPORTED_AUDIO_FORMATS` — verify). Is `.webm` on that list?
2. Which formats require a decoder / ffmpeg path (internal notes name `FORMATS_NEEDING_DECODE` — verify)? Is ffmpeg present in **dev** Electron? In the **packaged** app from R-1?
3. Does `transcribe()` (official name — verify arguments from docs/types) accept a **file path** to a WAV we wrote ourselves: **16 kHz, mono, PCM s16le, RIFF/WAV header**?
4. Does it accept the same PCM as a **buffer** without a path? If a `.raw` / `audio_format` option exists, what does official documentation say about **headers**? If undocumented, measure and tag `CONFIRMED (empirical, @qvac/sdk@<version>)`.
5. Does `transcribe()` accept a WebM/Opus blob from Chromium `MediaRecorder` (default mime, and any mime we can request)? Success, hard error, or decode-needed-but-ffmpeg-missing?
6. Canonical **on-disk format** for P0? Canonical **capture path**: `MediaRecorder` vs `AudioWorklet` (or `ScriptProcessor` fallback) → raw PCM → Main writes WAV?
7. What bytes does `pushAudioChunk` transport: encoded WebM chunks, or PCM frames (Float32 or Int16) plus enough metadata to write WAV? What validation belongs in Main (magic bytes, max duration/size)?

### Method / sources

#### Phase 0 — desk (first)

| Source | Extract |
|---|---|
| https://docs.qvac.tether.io/ai-capabilities/transcription/ | How audio is passed in; example files (e.g. 16 kHz mono WAV); any statement about sample rate, channels, PCM layout; streaming vs batch (batch only for this spike) |
| Installed `@qvac/sdk` types + examples under `node_modules/@qvac/sdk` | Print official format constants; read JSDoc for the transcribe entrypoint; do not invent |
| Electron / Chromium docs: `MediaRecorder`, `AudioWorklet`, `getUserMedia` | Default mime types; whether `audio/wav` is actually available in Electron’s Chromium; AudioWorklet availability in a sandboxed renderer |
| MDN (label unofficial relative to Electron) | Only to understand APIs; confirm behavior in **this** Electron version |
| Internal: `docs/BACKEND_DESKTOP_ARCHITECTURE_GUIDE.md` §4, §21 R-2; `docs/AI_QVAC_TRANSCRIPTION_GUIDE.md` audio sections | Assumptions to test, not to copy as facts |

#### Phase 1 — lab protocol

**Prerequisites:** R-1 pins; a model the official docs allow for transcription; `@qvac/sdk` imported only from a Main-side script (tutorial app or a throwaway Main spike). Renderer still has no Node.

**L1. Print official constants** from the installed SDK (use the real export names from types). Paste JSON into the report. Do not retype from memory.

**L2. Fixture A — authored WAV.** Create (soxi/ffprobe to prove): 16 kHz, 1 channel, s16le, WAV header, a few seconds of speech. Call the official batch transcribe API with a **path**. Record: success/fail, exact error string, whether output is a string or segments, wall time.

**L3. Fixture B — same frames as buffer.** If types allow `Buffer` / `Uint8Array` / path-only, test what is documented. If `.raw` or `audio_format` appears in **official** types, test with and without a WAV header. Document bytes.

**L4. Fixture C — MediaRecorder WebM.** In Electron Renderer, `getUserMedia` + `MediaRecorder` with default mime and, separately, any `audio/webm` / opus bits requested. Save blobs to disk from Main after IPC of raw bytes (Renderer must not write filesystem). Probe container with ffprobe. Pass path (and if allowed, buffer) to transcribe. Record results in **dev** and, if possible, in the **packaged** app (ffmpeg may exist in one and not the other).

**L5. Capture-path prototype (no product UI).** Sketch two implementations far enough to measure complexity and risk:

- Path M: MediaRecorder chunks → Main → (decode?) → transcribe.
- Path W: AudioWorklet PCM → IPC chunks → Main appends to a WAV (header written/updated in Main) → transcribe.

Measure: CPU of capture, chunk sizes, whether resampling to 16 kHz is required, and whether Path M works **without** shipping ffmpeg.

**L6. Failure cases:** empty file, 0-byte chunk, stereo 48 kHz WAV, 44.1 kHz WAV, truncated WebM, huge file. Record official error strings only.

### Exact output format

Write `docs/research/R-2-audio-format-and-capture.md`:

```markdown
# R-2 — Audio format and capture path
Status: CONFIRMED | BLOCKED | FAILED
Date:
@qvac/sdk version:
Electron version:

## 1. Official constants (raw paste)
SUPPORTED_AUDIO_FORMATS (or official name):
FORMATS_NEEDING_DECODE (or official name):
Sources:

## 2. Desk quotes (URL + section + quote)
## 3. ffmpeg availability
| Environment | ffmpeg present? | How verified |

## 4. Trial matrix
| Fixture | Input | API used (cite types file + line, no invented sig) | Dev result | Packaged result | Error string |

## 5. Capture-path comparison
| Path | Works with transcribe? | Needs ffmpeg? | Renderer complexity | Main complexity | Risk |

## 6. Proposed pushAudioChunk contract (OUR types, not SDK types)
- bytes:
- metadata:
- validation:
- max size / duration:

## 7. TODO: VERIFY FROM OFFICIAL QVAC DOCUMENTATION
## 8. What we will NOT claim
## 9. Decision
```

### Decision required

Choose **one** canonical pair:

- **CANONICAL FORMAT:** (e.g. WAV PCM mono 16 kHz s16le written by Main) — or another format **only** if trials show it works in the packaged app without an undeclared ffmpeg dependency.
- **CANONICAL CAPTURE:** `AudioWorklet` → PCM → Main WAV **or** `MediaRecorder` → (stated container) → Main **or** hybrid.
- **`pushAudioChunk` bytes:** PCM frames vs encoded chunks.
- **Rejected options** and why (especially default WebM if it fails or needs ffmpeg in production).

If both packaged paths fail, the decision is **BLOCKED** with the exact errors — do not silently pick WebM.

---

## Prompt R-3

**ID:** R-3  
**Title:** SQLite binding in a packaged Electron app that already loads QVAC native addons  
**Priority:** P0  
**Kind:** LAB / SPIKE PROTOCOL (empirical). Desk-gather Node/Electron/SQLite binding docs first; the winner is whoever **survives packaging beside QVAC**.

### Role / context

You are a researcher supporting **Justin** (NotaLocal backend). Storage is **local only**, in `app.getPath('userData')`, accessed **only from Electron Main**. Renderer has no Node and never talks to SQLite.

Candidates:

- `node:sqlite` (Node.js built-in SQLite)
- `better-sqlite3` (native addon; typically needs rebuild for Electron)

Criterion that beats API taste: **does it work in the packaged app that already includes QVAC native addons / Bare worker**, with the R-1 pin set?

If **both** break packaging or runtime, Plan B for MVP: JSON files on disk (still Main-only, still `safeJoin`, still no PHI in logs).

Do not solve encryption here (R-5). Do not invent QVAC APIs.

### Hard constraints

1. Never invent QVAC signatures. This spike should not call QVAC except as “the host app that already packaged in R-1.”
2. Never claim the database is encrypted, HIPAA, or “100% secure.” Until R-5, the honest line is: **the database is not encrypted**.
3. Do not enable `nodeIntegration` or disable `contextIsolation` to “make native modules easier.”
4. Prefer official docs: Node `node:sqlite`, Electron native-module / rebuild docs, `better-sqlite3` official README, Electron Forge native-module docs, QVAC packaging caveats (official tutorial).
5. Write `docs/research/R-3-sqlite-binding.md`.
6. Test in the **packaged** binary, not only `electron-vite dev`.

### Questions this investigation must answer

1. Which Node version does **Electron’s** Main embed (R-1)? Does that Node document `node:sqlite` as available and stable enough for an MVP?
2. Does `node:sqlite` work in Electron Main **without** a native rebuild? In the packaged app with `asar: false` (if QVAC still forces that)?
3. Does `better-sqlite3` rebuild cleanly against this Electron (`electron-rebuild` / `@electron/rebuild` / Forge hooks)? Does it load **at the same time** as QVAC addons?
4. Do two native stacks collide (ABI, `NODE_MODULE_VERSION`, duplicate copies of libstdc++, asar unpack rules, `build.fromSource`)?
5. WAL, `PRAGMA foreign_keys`, and a simple migration: do they work with the chosen binding?
6. If both fail: is JSON-file persistence acceptable for MVP, and what are the integrity / crash risks?

### Method / sources

#### Phase 0 — desk

| Source | Extract |
|---|---|
| Node.js official docs for the **same major** as Electron’s embedded Node: `node:sqlite` | Stability, API (DatabaseSync vs async), platform support |
| Electron official docs: native Node modules, ABI, `asar` unpack | Rebuild requirements |
| https://github.com/WiseLibs/better-sqlite3 (official README) | Electron rebuild instructions; known Electron issues |
| Electron Forge official docs | How native addons are packaged |
| QVAC official Electron tutorial packaging section | `asar: false`, architecture-specific prebuilds — do not fight the plugin until you understand it |
| SQLite official docs | `PRAGMA foreign_keys`, WAL — for the smoke schema only |

#### Phase 1 — lab protocol

Use the **R-1 packaged tutorial app** (or a branch of it). Do not start NotaLocal services.

**S1. Binding A — `node:sqlite`**

- Add a Main-only module that opens `<userData>/r3-smoke.db`, `PRAGMA foreign_keys = ON`, creates two tables with `ON DELETE CASCADE`, inserts, deletes parent, asserts child gone.
- Run in dev and in packaged app.
- Record: module resolve errors, “unknown built-in”, crash on open.

**S2. Binding B — `better-sqlite3`**

- Add dependency; rebuild for Electron (record the exact rebuild command).
- Same smoke schema.
- Dev + packaged. Then **load QVAC as the tutorial does** and open SQLite in the same Main process (order: QVAC first then SQLite, and reverse). Record crashes.

**S3. Package matrix**

- `npm run package` (or official script) after each binding.
- Artifact size delta; whether extra `.node` files appear; whether Forge/QVAC plugin strips them.

**S4. Plan B prototype (only if A or B fails in packaged+QVAC)**

- Write/read a versioned JSON file under `userData` with atomic rename. Document why this is worse (no transactions across files, easier corruption).

### Exact output format

Write `docs/research/R-3-sqlite-binding.md`:

```markdown
# R-3 — SQLite binding vs QVAC packaging
Status:
Date:
Electron:
Embedded Node (process.versions.node):
@qvac/sdk:

## 1. Desk sources
## 2. Trial matrix
| Binding | Dev open/CRUD | Packaged CRUD | Packaged + QVAC loaded | Rebuild required | Errors |

## 3. Packaging notes (asar, .node paths, plugin)
## 4. Plan B notes (if needed)
## 5. TODO: VERIFY FROM OFFICIAL QVAC DOCUMENTATION
(only if a QVAC packaging rule was unclear)
## 6. What we will NOT claim (no encryption implied)
## 7. Decision
```

### Decision required

Choose **one**:

- **USE `node:sqlite`** — because it survived packaged + QVAC on listed OS/arch.
- **USE `better-sqlite3`** — same bar; record rebuild pipeline as a required CI/dev step.
- **PLAN B — JSON files for MVP** — both bindings failed packaged+QVAC; list the failures; SQLite becomes a post-MVP retry.
- **SPLIT** — only if you have evidence one binding works on OS A and not OS B; then state which OS the demo ships on (coordinates with R-9).

---

## Prompt R-4

**ID:** R-4  
**Title:** Memory budget — STT + LLM together vs sequential; `getSystemResources()` as preflight  
**Priority:** P0  
**Kind:** LAB / SPIKE PROTOCOL (empirical). Desk-gather official QVAC resource/model APIs first; RAM numbers must be measured on target hardware.

### Role / context

You are a researcher supporting **Justin** (NotaLocal). The app will load a **speech-to-text** model and a **structuring LLM** via QVAC. They are different engines. Do not confuse Qwen (LLM) with Whisper/Parakeet (STT).

Internal **assumption**: do **not** keep STT and LLM loaded at once on a clinical laptop; sequence is load STT → transcribe → unload → load LLM → structure → unload. Cost is latency; benefit is avoiding OOM.

You must measure both strategies and test whether an official resources API can detect **LOW_MEMORY before a crash**. Internal notes mention a function named `getSystemResources` and model info with an expected size — **verify names and shapes from official docs and installed types**. Never invent a signature.

Renderer has no Node. Clinical data does not leave the machine unless the doctor exports. Do not ship telemetry that includes transcripts or note text.

### Hard constraints

1. **NEVER invent QVAC API signatures.** If `getSystemResources`, `getModelInfo`, `loadModel`, `unloadModel`, `close` (names from internal notes) are not in official docs/types for your pinned version, mark `TODO: VERIFY FROM OFFICIAL QVAC DOCUMENTATION` and use **OS tools** as the source of truth for RSS.
2. Official SDK docs may say GPU memory samples are `unverified` / process-scoped. Do not treat SDK GPU MB as truth without OS confirmation.
3. No HIPAA / “100% secure” / “data never leaves the device” claims.
4. No real patient audio or PHI in logs. Record **RSS, timings, model constants, not transcript text**.
5. Prefer official QVAC system-requirements and system-resources docs, plus OS tools (`ps`, Activity Monitor, Task Manager).
6. Write `docs/research/R-4-memory-budget.md`.
7. Use R-1 pins. If you cannot download models, stop after desk + protocol; do not invent MB figures.

### Questions this investigation must answer

1. What does official documentation say `getSystemResources` (or the real name) returns? Paste a **raw JSON** from a real call. What is documented as `supported` / `unavailable` / `unverified` / `failed`?
2. Can we estimate “this model will not fit” **before** `loadModel` using official model-info (expected size) + OS free RAM + SDK resources? How often is that estimate wrong (false safe / false alarm)?
3. Peak RSS: STT only; LLM only; **both loaded**; sequential (STT then unload then LLM). Include Electron baseline (empty Main + window).
4. Which model **constants** from the official catalog fit the target laptop class (record exact constant names from the installed SDK; do not invent names)?
5. Do we run **sequential** (MVP default) or **concurrent** loads? What RSS headroom do we require before attempting a load?
6. How should Main map a failed preflight to a typed app error such as `LOW_MEMORY` (our error code, not necessarily an SDK code)? Can we detect `DISK_FULL` similarly (free disk vs `expectedSize`)?
7. Does unloading actually return RSS to near baseline, or is there a leak / lazy free?

### Method / sources

#### Phase 0 — desk

| Source | Extract |
|---|---|
| https://docs.qvac.tether.io/system-requirements/ | Stated RAM/GPU minimums |
| QVAC docs for system resources / model download (follow official nav; also https://docs.qvac.tether.io/models/download-lifecycle/) | Preflight capabilities |
| Installed types: search for resource and model-info types | Field names; copy from `.d.ts`, do not invent |
| Package file if present (internal notes mention `docs/system-resources-support-matrix.md` **inside the package** — only use if it exists in your install) | GPU memory caveats |
| Electron / OS docs | How to measure process RSS for Electron (helper processes exist — measure the process that actually loads the native worker, and the sum of the Electron process tree) |

#### Phase 1 — lab protocol

**M0. Baseline.** Start the R-1 app with **no** model loaded. Record Electron process-tree RSS and private bytes (macOS: Activity Monitor + `ps`; Linux: `ps` / `/proc/<pid>/status` VmRSS; Windows: Task Manager / `Get-Process`). Note helper/GPU process PIDs.

**M1. Official preflight call.** If types export a system-resources function, call it with **only documented arguments**. Save raw JSON. Repeat after load/unload.

**M2. Model info.** For each candidate STT and LLM constant you are allowed to use (from official catalog / installed exports), call the official model-info API if it exists. Record `expectedSize` / cache fields **as actually returned**. Confirm disk free space.

**M3. Sequential.** For N≥2 runs (state N): load STT → measure peak RSS → transcribe a short **non-clinical** WAV (reuse R-2 fixture) → unload → measure RSS → load LLM → run a **tiny non-clinical** completion if the tutorial/docs show how (do not invent `completion` arguments; if unsure, load+unload only and mark completion `TODO: VERIFY…`) → unload → measure.

**M4. Concurrent.** Load STT, then load LLM without unloading STT. Measure peak. If the process is killed, capture OS OOM logs. Do **not** retry in a loop that thrashes the machine.

**M5. Preflight vs crash.** Artificially lower available memory if you can do so safely (not required on shared CI). Otherwise, compare (free RAM − expectedSize − Electron baseline − safety margin) to actual success/fail of `loadModel`. Propose a numeric margin (MB) as an **assumption**, labeled as such.

**M6. Disk.** Fill or mock only if safe; otherwise compute: refuse load if `freeDisk < expectedSize + margin`. Record whether the SDK fails with a documented disk error or a crash.

### Exact output format

Write `docs/research/R-4-memory-budget.md`:

```markdown
# R-4 — Memory budget and preflight
Status:
Date:
Hardware (full):
@qvac/sdk:
Model constants used (official names only):

## 1. Raw getSystemResources (or official name) JSON
## 2. Raw model-info JSON (per model)
## 3. RSS table (MB, process tree + worker if distinct)
| Condition | Peak RSS | SDK memory fields | Survived? |
| Electron baseline | | | |
| STT loaded | | | |
| STT after unload | | | |
| LLM loaded | | | |
| LLM after unload | | | |
| STT+LLM concurrent | | | |

## 4. Latency cost of sequential unload/reload
## 5. Preflight algorithm (pseudocode with OUR types)
## 6. False safe / false alarm observations
## 7. TODO: VERIFY FROM OFFICIAL QVAC DOCUMENTATION
## 8. What we will NOT claim
## 9. Decision
```

### Decision required

Choose:

- **SEQUENTIAL LOADS (MVP)** or **CONCURRENT LOADS**, with the hardware class this applies to.
- **Allowed model size classes** on that hardware (name official constants that fit; do not recommend undocumented aliases).
- **Preflight policy:** when to return our `LOW_MEMORY` / `DISK_FULL` **before** calling load; numeric margins; what to do if the official resources API is `unavailable` or `unverified` (fall back to OS).
- If concurrent **crashes** on the demo laptop: sequential is mandatory, not optional.

---

## Prompt R-5

**ID:** R-5  
**Title:** Encryption at rest and key management — SQLCipher vs column encryption; Electron `safeStorage` including “no keyring”  
**Priority:** P1  
**Kind:** DESK RESEARCH first (official Electron/Node/SQLite/SQLCipher docs + legal-adjacent **claim hygiene**). Then a **LAB / SPIKE PROTOCOL** for `safeStorage` and packaging behavior on macOS, Windows, and Linux without a keyring.

### Role / context

You are a researcher supporting **Justin** (NotaLocal). Threat model is **not** a remote attacker (there is no app server). Realistic threats: someone in front of an unlocked laptop; another OS user; device theft (a PIN does **not** replace full-disk encryption).

P0 auth assumption: local PIN, salted KDF (`scrypt` / Argon2id via established libraries or `node:crypto`), constant-time compare, lockout/backoff **without** wiping clinical notes. Session in Main memory only.

Until encryption is proven, the **required honest position** is: **the database is not encrypted** — stated in README and UI. This investigation decides whether MVP encrypts, and **where the key lives**.

### Hard constraints

1. **Do not write custom cryptography.** No homegrown ciphers, no “XOR + PIN”, no rolling your own KDF.
2. **Never invent QVAC APIs.** Encryption is not a QVAC feature in this spike.
3. **Forbidden claims** (even if a vendor page uses them): “100% secure”, “military-grade encryption”, “HIPAA compliant” / “HIPAA”, “end-to-end encryption” (there is no remote peer), “data never leaves the device” (doctors export), “secure wipe” / anti-forensic deletion.
4. If you recommend “no encryption in MVP”, that is a valid decision **only if** README + UI copy are specified.
5. Key-management failure modes matter more than algorithm names: lost PIN vs lost keychain vs Linux machine with **no** Secret Service / libsecret / gnome-keyring / kwallet.
6. QVAC Forge packaging may force `asar: false` (verify in R-1). App files on disk are readable; encryption of **user data** is not the same as hiding source.
7. Write `docs/research/R-5-encryption-at-rest.md`.

### Questions this investigation must answer

1. What are the real options for SQLite encryption in Electron Main: SQLCipher (which npm bindings?), `better-sqlite3` encryption add-ons, application-level column encryption (which library, which algorithm, which AAD)? What do **official** projects document about Electron?
2. How does Electron `safeStorage` work on macOS (Keychain), Windows (DPAPI), Linux (kwallet / gnome-libsecret / none)? What do official Electron docs say for `safeStorage.isEncryptionAvailable()`, `encryptString` / `decryptString`, and the Linux `--password-store` / `basic_text` switches?
3. On Linux **without a keyring**, does `isEncryptionAvailable()` return false, or does encryption **succeed** with a weaker store, or fail **silently** later? Silent success that stores a key in plaintext is worse than refusing to encrypt.
4. If the DB key is derived from the PIN: forgetting the PIN **destroys** notes. Is that acceptable for a hackathon MVP? If the key is in the OS keychain: any OS user who can unlock the session may decrypt. Device theft without FDE: attacker images the disk — what actually protects data?
5. Does SQLCipher (or the chosen binding) **package** next to QVAC native addons (reuse R-3 lessons)?
6. **MVP decision:** encrypt or not? If yes: algorithm + binding + key location + recovery story. If no: exact user-visible sentences (no legal theatre).

### Method / sources

#### Phase 0 — desk (mandatory; this is the core of R-5)

Use official docs only for normative claims:

| Source | Extract |
|---|---|
| Electron official `safeStorage` | Platform backends; `isEncryptionAvailable`; Linux password store; when encryption is unavailable |
| Electron official `app` / command-line switches related to password store | Linux `basic_text` implications — quote, do not soften |
| SQLCipher official documentation | What is encrypted (entire file vs headers); key/passphrase model; SQLCipher community vs commercial |
| Node.js `node:crypto` official docs | What we may use for column encryption (AES-GCM) if we roll **application** encryption with a key from `safeStorage` — still no homemade primitives |
| `better-sqlite3` official docs + SQLCipher-related official bindings if any | Electron rebuild; license |
| SQLite official encryption extension pages (if citing SEE/SQLCipher) | Distinguish SEE vs SQLCipher; licensing |
| R-3 decision file if it exists | Binding already chosen |

Legal-adjacent: you may summarize **risk** in plain language. You are **not** a lawyer. Do not draft a HIPAA BAA, “compliance matrix”, or marketing security page.

#### Phase 1 — lab protocol (required for the keyring question)

**K1. `safeStorage` matrix** on macOS, Windows, and two Linux profiles: (a) GNOME/KDE with a running secret service, (b) minimal session **without** gnome-keyring/kwallet (live USB, stripped WM, `SSH_TTY` only if that is a realistic hospital image).

For each: `isEncryptionAvailable()`, encrypt/decrypt roundtrip, persist the ciphertext to disk, **reboot or new process**, decrypt again. Then log out / lock and note whether another OS user can decrypt.

**K2. Linux no-keyring.** Document Electron version-specific behavior. If a switch enables `basic_text`, state whether that stores secrets reversibly on disk and whether NotaLocal must **refuse** that mode.

**K3. Packaging.** If recommending SQLCipher or a native crypto addon: `npm run package` with QVAC present (R-1 app). If it fails, encryption cannot be “yes” for MVP unless Plan B is pure JS `node:crypto` + key in `safeStorage`.

**K4. Failure drill.** Simulate: PIN forgotten; keychain reset; `isEncryptionAvailable()===false` on first launch. Write the product behavior (refuse to store notes vs store plaintext vs refuse to start).

### Exact output format

Write `docs/research/R-5-encryption-at-rest.md`:

```markdown
# R-5 — Encryption at rest and key management
Status:
Date:
Platforms tested:

## 1. Desk: options table
| Option | What is encrypted | Where the key lives | Packaging risk | Lost-key outcome | Official sources |

## 2. safeStorage matrix
| OS | Keyring present? | isEncryptionAvailable | Roundtrip after restart | Notes / switches |

## 3. Linux “no keyring” behavior (quoted Electron docs + empirical)
## 4. Threat-model fit (walk-by / other user / stolen disk without FDE)
## 5. Forbidden claims checklist (all marked DO NOT USE)
## 6. Proposed README + UI sentences if MVP does NOT encrypt
## 7. Proposed README + UI sentences if MVP DOES encrypt (limits included)
## 8. TODO: VERIFY FROM OFFICIAL QVAC DOCUMENTATION
(only packaging interactions)
## 9. Decision
```

### Decision required

Choose **one**:

- **NO ENCRYPTION IN MVP.** Document in README and in-app settings/privacy surface. Give the **exact** sentences. Recommend OS full-disk encryption as the real theft control (as advice, not a certification).
- **ENCRYPT IN MVP — application-level columns** with `node:crypto` (named algorithm) and key in `safeStorage` **only when** `isEncryptionAvailable()===true`; otherwise refuse or fall back to the no-encryption copy. State which columns.
- **ENCRYPT IN MVP — SQLCipher (or named binding)** plus key from PIN and/or `safeStorage`. Only if the packaged+QVAC test passed.
- **DEFER encryption, PIN-only lock** — encrypt = no, but UI must not imply the files are unreadable on disk.

You must also answer: **where the key lives**, and **what happens when `safeStorage` is unavailable**.

---

## Prompt R-6

**ID:** R-6  
**Title:** OS authentication / biometrics and restrictive directory permissions (POSIX vs Windows ACL)  
**Priority:** P1  
**Kind:** DESK RESEARCH (official Electron OS-auth APIs per platform) plus **LAB / SPIKE PROTOCOL** for real prompts and for creating restrictive directories portably.

### Role / context

You are a researcher supporting **Justin** (NotaLocal). P0 unlock is a **local PIN**. This investigation decides whether MVP also offers **OS unlock** (Touch ID, Windows Hello, platform PAM/keyring unlock) **in addition to** the PIN — never as a replacement that stores biometrics ourselves.

Temp audio lives under a Main-derived path (internal assumption): `<userData>/tmp-audio/<encounterId>/`. Renderer never sends filesystem paths. Directories should be created with **restrictive permissions**. POSIX `0700` is not Windows ACL.

We never read or store biometric templates. OS unlock, if any, is via **OS APIs**.

### Hard constraints

1. Never invent QVAC APIs.
2. Never claim HIPAA, “100% secure”, or that directory permissions stop a local administrator or disk-image attacker.
3. Do not implement raw fingerprint capture. If an API is unclear, `TODO: VERIFY` against **Electron official docs** for the version pinned in R-1.
4. Prefer official Electron docs: `systemPreferences`, `safeStorage` (overlap with R-5), Windows Hello / `app` login item docs if any; Node `fs.mkdir` `mode`; Windows ACL via documented APIs only (`icacls` behavior is empirical).
5. Write `docs/research/R-6-os-auth-and-directory-permissions.md`.

### Questions this investigation must answer

1. **macOS:** What is the real Electron API to prompt Touch ID / Local Authentication? Which Electron versions? Does it unlock our PIN key or only prove presence? What happens on Intel vs Apple Silicon? What is the user-visible prompt string limitation?
2. **Windows:** Is Windows Hello available through Electron without native addons? If only via undocumented or community modules, that is **not** MVP. What is official?
3. **Linux:** Is there any official Electron biometric/OS-auth API? If not, PIN-only on Linux.
4. Should MVP be **PIN only** or **PIN + optional OS unlock** (OS unlock re-opens an already-provisioned session key, PIN remains recovery)?
5. How do we create `<userData>/tmp-audio` (and the DB directory) with **owner-only** access on POSIX (`0700`) and an equivalent DACL on Windows (current user, no Everyone/Users write)? Does `fs.mkdir(mode)` on Windows silently ignore mode?
6. Do `userData` defaults already restrict access enough that extra ACLs are redundant on each OS?

### Method / sources

#### Phase 0 — desk

| Source | Extract |
|---|---|
| Electron official `systemPreferences` (macOS): Touch ID / media access / `promptTouchID` **if present in this Electron version** | Exact method names from **that version’s** docs — do not copy old blog names |
| Electron official Windows security / Hello pages **if they exist** for this version | If they do not exist, say so |
| Electron `app.getPath('userData')` | Default location per OS |
| Node.js `fs` official docs | `mkdir` `mode`, `chmod`, limitations on Windows |
| Microsoft official docs | Default ACL on `%APPDATA%`; how to set a DACL without a random npm “acl” package if possible |
| POSIX `mkdir(2)` / umask | Interaction with umask so `0700` is actually `0700` |

#### Phase 1 — lab protocol

**A1. OS prompt spike** (headed machines only). For each platform, write a 20-line Main script that calls **only documented** Electron APIs. Screenshot or quote the OS dialog. Record cancel, fail, success. If no API, write `NOT AVAILABLE (official docs)`.

**A2. Directory lab.** In Main:

- `fs.mkdir` with `mode: 0o700` under `userData`.
- Inspect: POSIX `ls -ld` / `stat`; Windows `icacls`.
- Create a file; try to read it from another user account if available (or document that you could not test).
- Confirm `safeJoin` is unrelated but do not implement product path logic here.

**A3. umask / inheritance.** Show whether a file inside `0700` is `0600` or `0644`. Recommend explicit `chmod` after create if needed.

### Exact output format

Write `docs/research/R-6-os-auth-and-directory-permissions.md`:

```markdown
# R-6 — OS auth and restrictive directories
Status:
Date:
Electron version:

## 1. Official API per platform
| Platform | Official API | Doc URL + Electron version | Can MVP use it? | What it actually proves |

## 2. Lab: auth prompt results
## 3. Lab: directory permissions
| OS | mkdir mode | Observed perms / ACL | Other-user read? |

## 4. Portable helper recommendation (OUR code sketch, not QVAC)
## 5. What we will NOT claim
## 6. Decision
```

### Decision required

Choose:

- **PIN ONLY for all platforms in MVP**, or
- **PIN + optional OS unlock on {macOS / Windows / Linux}** — list which, and state that OS unlock is presence/session, not a substitute for the KDF material if that is your design.

And separately:

- **Directory policy:** exact POSIX modes + Windows ACL recipe (or “rely on userData defaults” with evidence). Must be portable enough to implement in Main without a large native dependency unless the lab shows it is required.

---

## Prompt R-7

**ID:** R-7  
**Title:** Network behavior — download destinations/ports; full pipeline with network OFF; residual activity after `close()`  
**Priority:** P1  
**Kind:** LAB / SPIKE PROTOCOL (empirical). Desk-gather official QVAC download/offline statements first. **Public “offline” wording is limited to what this lab proves.**

### Role / context

You are a researcher supporting **Justin** (NotaLocal). Product rule: **initial model download needs network**; inference is intended to be local on cached models; everything else in NotaLocal must not phone home. Export is a user-initiated **local** write (or clipboard), not an upload.

QVAC documentation (verify current wording) describes resumable downloads, cache validation on later `loadModel`, and that the **first** download needs registry access. The Electron tutorial warns the first run **may download from peers**. That implies **P2P**, not only an HTTPS CDN. Hospital firewalls may block this.

Internal notes mention `downloadAsset`, `getModelInfo`, `close` — **verify**. Residual **seeding** after `close()` is a specific unknown.

You must produce sentences we are **allowed** to say in README/demo, and a list of **blocked** marketing phrases.

### Hard constraints

1. **NEVER invent QVAC API signatures** for download, cancel, close, or cache APIs. Quote official docs and installed types.
2. **Do not claim “100% offline”, “air-gapped”, “data never leaves the device”, HIPAA, or “no network stack”.** Even a local app may open sockets for model distribution.
3. Wi-Fi toggle is not enough; **disable the interface** and prove `ping` fails, then run the pipeline.
4. Capture traffic. Guessing is not a result.
5. Clinical data must not appear in pcap annotations. Use non-clinical audio and dummy notes.
6. Write `docs/research/R-7-network-and-offline-claims.md`.

### Questions this investigation must answer

1. Where does a model download go (hosts, DNS names, ports, protocols)? Registry HTTP(S) vs P2P (document official names: Holepunch / Hyperswarm / other **only if official docs use them**)?
2. What must a hospital firewall allow for **first-run download**? What can remain blocked afterward?
3. After models are cached (`isCached` or official equivalent **if present**), does the **full** path still work with the NIC down: load STT, transcribe, unload, load LLM, structure (if API verified), export TXT/JSON locally?
4. During inference with NIC up, is there **any** unexpected egress (telemetry, DHT, peer announce)?
5. After the official `close()` (verify name), is there residual peer/seeding traffic? For how long? Does process exit kill it?
6. Exact **public claim** we can defend, and the claims we must not use.

### Method / sources

#### Phase 0 — desk

| Source | Extract |
|---|---|
| https://docs.qvac.tether.io/models/download-lifecycle/ | Resume, cache, cancel, offline preparation, registry requirement |
| https://docs.qvac.tether.io/tutorials/electron/ | First-run peer download warning |
| QVAC JS/TS SDK docs | Worker in-process vs separate transport — quote |
| Installed types for download/cache/close | Real names |
| Internal `docs/AI_QVAC_TRANSCRIPTION_GUIDE.md` §19 | Procedure to **execute**, not to treat as already proven |

#### Phase 1 — lab protocol

**N1. Prepare with network ON.** Set an explicit cache dir if official docs provide `cacheDirectory` or `QVAC_CACHE_DIR` (verify). Download the models needed for the tutorial/pipeline using **only documented** APIs. Verify cache via official model-info if available.

**N2. Traffic capture (network ON) during download.** `tcpdump` / Wireshark / `pktmon` on the app PIDs. Produce: destination list (IP, port, protocol), DNS names if resolvable, whether UDP peer discovery appears. **Do not** publish patient data. Redact nothing that is needed for firewall rules; redact packet payloads that might contain tokens if you see any (record that you saw a token — do not paste secrets).

**N3. Traffic capture during inference with network ON** (models already cached). Any socket besides localhost?

**N4. Network OFF.** Bring the interface down (examples to adapt: macOS `ifconfig <if> down`; Linux `nmcli networking off`; Windows `Disable-NetAdapter`). Confirm ping fails. Run: start app → load cached STT → transcribe fixture → load LLM if in scope → local export. Fill a pass/fail table.

**N5. `close()` residual.** With network ON, after inference, call official `close()`. Continue capture 2–5 minutes. Then quit the process. Note leftover child processes.

**N6. Claim workshop.** Rewrite marketing lines into **test-backed** sentences. Reject any sentence that exceeds N4/N5.

### Exact output format

Write `docs/research/R-7-network-and-offline-claims.md`:

```markdown
# R-7 — Network behavior and offline claims
Status:
Date:
@qvac/sdk:
Cache dir:

## 1. Official quotes (download / cache / peers / close)
## 2. Firewall sheet
| Destination / pattern | Port / proto | When used | Required for inference after cache? |

## 3. Pipeline with NIC down
| Step | Pass/Fail | Error |

## 4. Egress during cached inference (NIC up)
## 5. Residual after close() and after process exit
## 6. Allowed public sentences (≤ 5)
## 7. Forbidden public sentences (list)
## 8. TODO: VERIFY FROM OFFICIAL QVAC DOCUMENTATION
## 9. Decision
```

### Decision required

Decide:

- The **exact offline claim** NotaLocal may use (one paragraph, no superlatives).
- **Hospital firewall** needs for first download vs day-2 use.
- Whether we must document **P2P** to IT (yes/no, with evidence).
- Whether `close()` is sufficient or we must **kill the process** to stop network activity.
- If NIC-down inference **fails**: we **cannot** say “works offline”; we can only say what actually ran (e.g. “inference is local” **if** that remains true while some registry check fails — be precise).

---

## Prompt R-8

**ID:** R-8  
**Title:** Semantics of `append` and `id` on `TranscribeSegment`; `endOfTurn` / `vad` from `transcribeStream()`  
**Priority:** P1  
**Kind:** DESK RESEARCH (official QVAC transcription docs + published types) plus **LAB / SPIKE PROTOCOL** to observe real event streams. The assembly algorithm must not invent fields.

### Role / context

You are a researcher supporting **Justin** (NotaLocal). P0 uses **batch** `transcribe()` on a complete WAV (R-2). Product still stores **segments + timestamps** for clinical traceability (doctor sees which span grounded a fact). Streaming live transcript is **P2**.

Internal notes describe a segment object with `text`, `startMs`, `endMs`, `append`, `id`, and a duplex `transcribeStream()` session with `write` / `end` / `destroy` and events that may include `text`, `segment`, `vad`, `endOfTurn`. **Every one of those names is a lead.** You will confirm against official documentation and the pinned SDK types. If the next SDK release renamed them, the types win.

Wrong assembly ⇒ duplicated or dropped words in a medical transcript. That is a patient-safety defect.

### Hard constraints

1. **NEVER invent QVAC API signatures or event shapes.** Copy from official docs and `.d.ts` with file path. If JSDoc is silent on `append`, say so and use **empirical** rules tagged `CONFIRMED (empirical, @qvac/sdk@<version>)`.
2. Internal example code that `.join('')` segments is **not** a specification. Prove whether spaces are inside `text` or must be inserted when `append` is false.
3. Do not use the **deprecated** “entire audio upfront” stream overload if official JSDoc still marks it deprecated. Prefer the documented duplex session.
4. `metadata: true` / timestamps may be **Whisper-only**. If official JSDoc says so, do not assume Parakeet segments.
5. `vad` events may be Whisper-only. Verify.
6. No HIPAA / “never leaves the device” claims. No real PHI in checked-in fixtures.
7. Write `docs/research/R-8-transcript-assembly.md`.

### Questions this investigation must answer

1. Official type of a transcription segment: fields, types, invariants (`id` unique? reused when revising a hypothesis?).
2. Meaning of `append`:
   - `true` = concatenate **without** separator to the previous segment with the same `id`?
   - `true` = this is a **replacement** (partial → final) for that `id`?
   - `false` = new utterance / new `id`?
   - Does `id` change on every partial?
3. How to assemble batch `metadata: true` output into (a) display string (b) stored `TranscriptSegment[]` **our** type (we must not leak SDK types across the app)?
4. Stream events: order of `text` vs `segment` vs `vad` vs `endOfTurn`; whether `text` is cumulative or delta; whether `segment` duplicates `text`.
5. `endOfTurn` for Whisper vs Parakeet: official fields (`source`, `silenceDurationMs` — verify). What should UI do (Antonio) vs what Main should persist?
6. If we add P2 streaming, the **algorithm** that avoids duplicated text (state machine + examples).
7. Recommended `endOfTurnSilenceMs` / `vadRunIntervalMs` **only if** those options exist in official types — otherwise `TODO: VERIFY…`.

### Method / sources

#### Phase 0 — desk (do not skip)

| Source | Extract |
|---|---|
| https://docs.qvac.tether.io/ai-capabilities/transcription/ | Stream session, events, VAD, end of turn, metadata |
| `node_modules/@qvac/sdk/dist/**/*.d.ts` and official examples in the package | `TranscribeSegment` or equivalent; session interface; deprecated overloads |
| Internal guides | Questions only; they may be stale |

Produce a “claimed vs official” table. Any internal field not in types = dropped.

#### Phase 1 — lab protocol

**T1. Batch metadata.** Transcribe one WAV with official metadata flag if it exists. Log **each segment as JSON**. Repeat with a file that has a mid-sentence pause and a file with two speakers (still non-clinical). Mark which segments share `id` and how `append` flips.

**T2. Concatenation tests.** Implement three assemblers on the same JSON: (1) `join('')`, (2) `join(' ')`, (3) rule: if `append` then concat else new paragraph/space. Compare to the official full-string result of `transcribe` **without** metadata (if that overload exists). Pick the rule that matches the official full string.

**T3. Stream session.** Using **only** documented options, `write` PCM/WAV chunks from R-2’s canonical format (if stream accepts the same bytes — **verify**; do not assume). Log every event in order with timestamps. Note duplicates.

**T4. VAD / endOfTurn.** Enable VAD only if documented. Speak, pause, speak. Record `speaking` / `probability` if those fields exist. Compare Whisper vs Parakeet **only if** both are in official docs for streaming.

**T5. Single-use session.** If JSDoc says a session cannot be iterated twice, confirm the official error type name by triggering it once.

### Exact output format

Write `docs/research/R-8-transcript-assembly.md`:

```markdown
# R-8 — TranscribeSegment and stream-event semantics
Status:
Date:
@qvac/sdk:

## 1. Official types (paste from .d.ts with path; no invented fields)
## 2. Official docs quotes (append, id, events)
## 3. Empirical batch log (JSON array, non-clinical)
## 4. Assembler bakeoff vs official full string
## 5. Empirical stream event log (ordered)
## 6. Recommended algorithms
### Batch (P0)
### Stream (P2) — state machine
## 7. Mapping to OUR TranscriptSegment (fields we keep / drop)
## 8. TODO: VERIFY FROM OFFICIAL QVAC DOCUMENTATION
## 9. Decision
```

### Decision required

Decide:

- **Batch assembly algorithm** (normative, with examples of `append`/`id`).
- Whether `append` means **continue**, **replace**, or **unknown — do not ship streaming**.
- **P2 streaming:** yes with the state machine, or **defer** because duplication cannot be prevented from documented+empirical behavior.
- What we persist in SQLite (`text` + `startMs`/`endMs` only vs also `id`/`append`).

---

## Prompt R-9

**ID:** R-9  
**Title:** Multi-platform packaging and signing — forced `asar: false`, separate macOS arch builds, code signing  
**Priority:** P2  
**Kind:** DESK RESEARCH (Electron + Apple + Microsoft official signing docs; official QVAC packaging caveats) plus **LAB / SPIKE PROTOCOL** for install UX warnings on unsigned builds.

### Role / context

You are a researcher supporting **Justin** (NotaLocal). R-1 already proved (or failed) packaging on at least one machine. This investigation decides **which platforms the demo ships** and **what install warnings the doctor sees**.

Internal notes (verify): QVAC’s Electron Forge plugin **forces `asar: false`** because a Bare worker cannot load native addons from an ASAR archive; **macOS universal binaries are blocked** (per-arch prebuilds); cross-build may be supported. `asar: false` means app files are visible on disk — relevant to how we talk about security (R-5), not a reason to invent obfuscation.

No auto-updater in MVP (tutorial says decline the updater plugin — verify). An updater is a network installer and needs its own review.

### Hard constraints

1. Never invent QVAC APIs. Packaging plugin options must come from official QVAC Electron tutorial / plugin docs.
2. Never claim the unsigned app is “safe” or that `asar: false` is “secure because local.” Do not claim notarization equals antivirus.
3. Do not claim HIPAA because the binary is signed.
4. Prefer official docs: Electron Forge / Electron Builder (whichever R-1 actually used), Apple notarization, Microsoft Authenticode, Ubuntu/Debian install norms.
5. Write `docs/research/R-9-packaging-and-signing.md`.

### Questions this investigation must answer

1. Confirmed packaging constraints from **current** official QVAC docs + R-1 evidence: `asar`, universal macOS, required per-arch builds, Linux sandbox flags in the packaged app.
2. Which platforms can we **actually** produce a bootable artifact for in the hackathon (macOS arm64, macOS x64, Windows x64, Linux x64, …)?
3. Without paid Apple/Microsoft certificates, what **exact** user-visible warnings appear (Gatekeeper, SmartScreen, Ubuntu “executable”, etc.)? What click-path must we document for demo staff?
4. If we **do** sign: minimum official steps and whether they fit the hackathon. If we **do not** sign: the warning is a product decision, not a surprise.
5. Does `asar: false` change how we describe on-disk protection in README (yes — files are readable)?

### Method / sources

#### Phase 0 — desk

| Source | Extract |
|---|---|
| https://docs.qvac.tether.io/tutorials/electron/ | Packaging caveats, plugin name, asar, arch |
| Electron Forge or the packager the tutorial uses (official) | `packagerConfig`, asar, extraResource, fuses |
| Apple official notarization / hardened runtime | Requirements; what unsigned users see |
| Microsoft official Authenticode / SmartScreen | Requirements; first-run UX |
| Electron official “code signing” guides for the packager in use | |

#### Phase 1 — lab protocol

**P1.** On each demo-target OS, install the **unsigned** (or ad-hoc signed) artifact from R-1. Photograph or quote the OS warning. Record the exact clicks to open anyway.

**P2.** If a signing identity is available, sign one macOS and one Windows build and compare the warning. If not available, mark `BLOCKED — NO CERTIFICATE` (still a valid result).

**P3.** Confirm the packaged tree is not ASAR (list files). Note that clinical data is in `userData`, not next to asar-less JS — still do not claim this is encryption.

### Exact output format

Write `docs/research/R-9-packaging-and-signing.md`:

```markdown
# R-9 — Packaging, platforms, and signing
Status:
Date:

## 1. Official QVAC packaging constraints (quotes + R-1 confirmation)
## 2. Platform matrix
| OS / arch | We can package? | We can run? | Sign? | User-visible install warning (verbatim) |

## 3. Demo support decision table
## 4. README / demo-runbook install steps (honest)
## 5. What we will NOT claim
## 6. Decision
```

### Decision required

Decide:

- **Demo platforms** (explicit include/exclude list).
- **Signing:** none / ad-hoc / full (Apple + Microsoft) — and the **verbatim** warning users will see in the chosen path.
- Whether `asar: false` must be mentioned in security/limitations copy (recommended: yes, as a limitation, not as a feature).

---

## Prompt R-10

**ID:** R-10  
**Title:** PDF export via Electron `webContents.printToPDF` and a print template  
**Priority:** P2  
**Kind:** DESK RESEARCH (official Electron `printToPDF`) plus a **LAB / SPIKE PROTOCOL** with a dummy print template. **Product decision is joint with Antonio (UI).**

### Role / context

You are a researcher supporting **Justin** (NotaLocal backend) and you must coordinate with **Antonio** (Renderer/UI). P0 export is **TXT, JSON, and clipboard**. PDF is optional P2.

Rules that already exist and are not yours to relax:

- Export is always an **explicit** user action. No auto-export, no upload, no HTTP client in `/export`.
- Only an **ApprovedNote** is exportable (drafts are not clinical documents).
- Save path comes from `dialog.showSaveDialog` in Main. Renderer never sends a filesystem path.
- The LLM must **not** generate PDF bytes or HTML. PDF is a **renderer** of already-validated note data (internal IA guide: if a ticket says “the model generates the PDF”, reject it).

Candidate API (Electron official): `webContents.printToPDF`. That implies a hidden or dedicated `BrowserWindow` / view loaded with a **print template** Antonio owns.

### Hard constraints

1. Never invent QVAC APIs. QVAC is out of scope except “do not ask the model for PDF.”
2. Never claim PDF export is HIPAA, tamper-proof, a legal medical record, or that data never left the device (the doctor just created a file they can email themselves).
3. Do not pull a cloud HTML-to-PDF service. No headless Chrome over the network. No npm package that calls a remote API.
4. Prefer Electron official `webContents.printToPDF` options for the **pinned Electron**.
5. Write `docs/research/R-10-pdf-export.md`. Antonio must be named in the decision (agree / defer).

### Questions this investigation must answer

1. Does `webContents.printToPDF` in this Electron version meet MVP needs (page size, margins, headers/footers, page numbers, Unicode/Spanish, print CSS `@media print`)?
2. Can we generate PDF **without** giving the print window Node integration (must stay `contextIsolation: true`, `nodeIntegration: false`)? How does Main inject **already validated** note JSON — IPC only, no `file://` with PHI in the query string if we can avoid it?
3. What template work does Antonio owe (HTML/CSS, fonts **bundled locally**, no CDN, no remote CSS)?
4. Failure modes: silent empty PDF, truncated CSS, huge notes, images (we likely have none), path of the save dialog.
5. **Is PDF in scope for this hackathon?** If it slips, TXT/JSON/clipboard remain enough?

### Method / sources

#### Phase 0 — desk

| Source | Extract |
|---|---|
| Electron official `webContents.printToPDF` for pinned version | Options object (cite version); Chromium page ranges; `preferCSSPageSize` |
| Electron official `dialog.showSaveDialog` | Filters for `.pdf` |
| Electron security docs | Hidden windows, `sandbox`, CSP for a print-only page |
| Internal `docs/BACKEND_DESKTOP_ARCHITECTURE_GUIDE.md` §14; frontend export/review rules | ApprovedNote-only; no model-rendered PDF |

#### Phase 1 — lab protocol

**D1.** In the R-1 or NotaLocal shell, open a **hidden** `BrowserWindow` with the same security prefs as production. Load a **local** HTML template with **fictional** clinical-looking text (fake patient). Call `printToPDF` with documented options. Save via save dialog.

**D2.** Check: Spanish accents, long table, page break, header/footer if options exist. Open the PDF in a stock viewer.

**D3.** Confirm the print window cannot `fetch` the network (CSP `connect-src 'none'` if that is the production policy). No remote fonts.

**D4.** Estimate Antonio hours: template, CSS print, review of overflow. Estimate Justin hours: IPC `exportPdf`, window lifecycle, tests (PDF magic bytes `%PDF`, no PHI in logs).

### Exact output format

Write `docs/research/R-10-pdf-export.md`:

```markdown
# R-10 — PDF export via printToPDF
Status:
Date:
Electron version:
Antonio sign-off: pending | agreed-in | deferred

## 1. Official printToPDF options (this Electron version)
## 2. Spike results (file size, page count, issues)
## 3. Security notes (no Node in print window; no remote assets)
## 4. Work split
| Task | Justin | Antonio |
## 5. What we will NOT claim about the PDF
## 6. Decision
```

### Decision required

Choose **one**, jointly with Antonio:

- **PDF OUT OF SCOPE for this delivery.** TXT/JSON/clipboard only. Revisit after demo.
- **PDF IN SCOPE** using `webContents.printToPDF` + Antonio’s local print template; list must-have visual requirements and the IPC method name you will add to `window.notalocal`.
- **PDF IN SCOPE BUT AFTER P0** — implement only if R-1–R-4 are done.

If `printToPDF` is inadequate (e.g. cannot embed a usable layout without Node in the print window), decide **no PDF** rather than adding a cloud converter.

---

## Shared footer (include when a researcher asks “what is the house style?”)

Every `docs/research/R-*.md` file must end with a **Decision** section that a teammate can implement without re-doing the reading. Use tags: `CONFIRMED` (official doc or empirical with version), `ASSUMPTION` (our choice), `TODO: VERIFY FROM OFFICIAL QVAC DOCUMENTATION` (unknown API). Never upgrade a guess to `CONFIRMED`.
