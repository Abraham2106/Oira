# Backend researcher prompts

Preamble: [`SYSTEM.md`](SYSTEM.md). One prompt per run.

Official starting points (re-verify; do not treat this list as API truth):

- https://docs.qvac.tether.io/
- https://docs.qvac.tether.io/tutorials/electron/
- https://docs.qvac.tether.io/system-requirements/
- https://docs.qvac.tether.io/models/download-lifecycle/
- https://docs.qvac.tether.io/ai-capabilities/transcription/
- Electron docs for the **pinned** Electron version from R-1

If you cannot run lab steps: finish desk quotes, mark every trial `BLOCKED — NEEDS TARGET HARDWARE`, and **do not fabricate pass/fail**.

---

## Prompt R-1

**R-1 — P0 — lab. BLOCKS EVERYTHING.** Artifact: `docs/research/R-1-qvac-electron-tutorial.md`

**Decide:** GO / GO WITH WORKAROUNDS / NO-GO, plus the **exact pin set** (Node, npm, Electron, `@qvac/sdk`, packager plugins).

Reproduce the **official** QVAC Electron tutorial end-to-end, including its package script (verify the name; internal notes say `npm run package`). Follow the tutorial literally first. Do not add SQLite, Oira APIs, or extra native addons.

**Questions:** Does install + first inference work on each target machine? What breaks packaging? Does the **packaged** binary still infer? Confirm Linux sandbox notes, `asar`, macOS universal vs per-arch — only with a doc quote **and** an empirical result.

**Desk first:** quote tutorial, system requirements, SDK runtime notes, installed `.d.ts` after install. Then lab on each OS/arch: record hardware, commands, full errors, lockfile versions, `process.versions.electron`.

If NO-GO, **do not start the rest of the backend stack.**

---

## Prompt R-2

**R-2 — P0 — lab.** Artifact: `docs/research/R-2-audio-format-and-capture.md`

**Decide:** canonical on-disk format + capture path (`MediaRecorder` vs `AudioWorklet`→PCM→Main WAV) + what `pushAudioChunk` transports.

Assumption to **test**, not copy: Main writes WAV PCM mono 16 kHz s16le. Chromium default is often WebM/Opus.

Print official format constants from the **installed** SDK (leads: `SUPPORTED_AUDIO_FORMATS`, `FORMATS_NEEDING_DECODE` — verify names). Never invent `transcribe()` arguments.

**Trials:** authored 16 kHz mono WAV path; same bytes as buffer if types allow; MediaRecorder WebM in **dev and packaged** (ffmpeg may exist in one only). Synthetic / researcher voice only.

If both packaged paths fail: BLOCKED with exact errors — do not silently pick WebM.

---

## Prompt R-3

**R-3 — P0 — lab.** Artifact: `docs/research/R-3-sqlite-binding.md`

**Decide:** `node:sqlite` vs `better-sqlite3` vs **JSON files for MVP** (plan B).

Winner = whoever **survives the packaged app that already loads QVAC native addons** (R-1 pins). Renderer never touches SQLite. Do not enable `nodeIntegration`. Do not imply the DB is encrypted (R-5).

Smoke: `PRAGMA foreign_keys`, two tables, `ON DELETE CASCADE`, in **dev and packaged**, with QVAC loaded both before and after SQLite open. Record ABI / `.node` / `asar` issues.

---

## Prompt R-4

**R-4 — P0 — lab.** Artifact: `docs/research/R-4-memory-budget.md`

**Decide:** sequential vs concurrent STT+LLM; which official model constants fit; preflight policy for our `LOW_MEMORY` / `DISK_FULL` **before** crash.

Leads to verify: `getSystemResources`, `getModelInfo`, `loadModel`, `unloadModel`. If missing from types: `TODO: VERIFY FROM OFFICIAL QVAC DOCUMENTATION` and use **OS RSS** as truth. Official GPU MB may be `unverified`.

Measure Electron process-tree RSS: baseline; STT; after unload; LLM; after unload; both loaded. Non-clinical WAV. If concurrent OOMs on the demo laptop, sequential is mandatory.

---

## Prompt R-5

**R-5 — P1 — desk + lab.** Artifact: `docs/research/R-5-encryption-at-rest.md`

**Decide:** encrypt in MVP or not; where the key lives; what happens when `safeStorage.isEncryptionAvailable() === false` (Linux with **no** keyring).

No homemade crypto. No “military-grade”, HIPAA, E2E (there is no remote peer), “secure wipe.” If **no encryption**, you must supply the **exact** README + UI sentences.

Desk: official Electron `safeStorage`; SQLCipher vs application AES-GCM via `node:crypto` + key from `safeStorage`; licensing. Lab: macOS, Windows, Linux-with-keyring, Linux-without-keyring; reboot roundtrip; packaging beside QVAC if you recommend a native binding.

Stolen disk without OS FDE: PIN does not save the notes. Say so.

---

## Prompt R-6

**R-6 — P1 — desk + lab.** Artifact: `docs/research/R-6-os-auth-and-directory-permissions.md`

**Decide:** PIN only vs PIN + optional OS unlock (which platforms). And a portable directory policy for `<userData>/tmp-audio` (POSIX `0700` vs Windows ACL). We never store biometric templates.

Use **this Electron version’s** official docs only (`systemPreferences` / Touch ID names change). If Windows Hello or Linux biometrics have no official Electron API, say `NOT AVAILABLE` — do not pull random npm modules for MVP.

`fs.mkdir({ mode: 0o700 })` on Windows often no-ops — prove it with `icacls`. Permissions do not stop an admin or a disk image.

---

## Prompt R-7

**R-7 — P1 — lab.** Artifact: `docs/research/R-7-network-and-offline-claims.md`

**Decide:** the **exact** public offline sentence we can defend; hospital firewall sheet; whether P2P must be disclosed to IT; whether `close()` stops residual traffic or the process must exit.

First download may use registry **and peers** (verify current tutorial wording). NIC **down**, not “Wi-Fi off.” Capture traffic. No “100% offline”, “air-gapped”, or “data never leave the device.”

Pipeline with cache warm + NIC down: load STT → transcribe fixture → load LLM if API verified → local export. Residual capture 2–5 min after official `close()`.

**Deliver ≤5 allowed public sentences and a forbidden list.**

---

## Prompt R-8

**R-8 — P1 — desk + lab.** Artifact: `docs/research/R-8-transcript-assembly.md`

**Decide:** batch assembly algorithm (normative, with `append`/`id` examples); persist which fields; whether P2 streaming is safe or must be deferred because duplication cannot be prevented.

Leads: `TranscribeSegment`, `transcribeStream()`, `endOfTurn`, `vad`. Types and official docs win over internal notes. Do not use a deprecated “entire audio upfront” stream overload if JSDoc still marks it deprecated.

Bakeoff assemblers against the official full-string result: `join('')` vs `join(' ')` vs append-aware. Wrong assembly is a patient-safety defect. Non-clinical fixtures only.

---

## Prompt R-9

**R-9 — P2 — desk + lab.** Artifact: `docs/research/R-9-packaging-and-signing.md`

**Decide:** demo platform include/exclude list; signing none / ad-hoc / full; **verbatim** OS warnings (Gatekeeper, SmartScreen, etc.) and the click-path for demo staff.

Confirm current QVAC packaging caveats (`asar: false`, no universal macOS, per-arch prebuilds) against R-1. `asar: false` is a **limitation** (files readable on disk), not a security feature. Unsigned ≠ “safe.” Signed ≠ HIPAA.

---

## Prompt R-10

**R-10 — P2 — desk + lab. Joint with Antonio.** Artifact: `docs/research/R-10-pdf-export.md`

**Decide:** PDF out of scope / in scope via `webContents.printToPDF` / after P0 only. Antonio must be named in the sign-off line.

P0 export remains TXT / JSON / clipboard. Only an **approved** note is exportable. LLM must not generate PDF bytes. No cloud HTML-to-PDF. Print window: `contextIsolation`, no Node, no CDN fonts, CSP cannot fetch.

If `printToPDF` cannot do a usable layout without weakening security: **no PDF**, do not add a converter.
