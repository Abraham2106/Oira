# Oira

Desktop app for local clinical documentation. Oira captures a consultation on the physician’s computer, prepares a structured **draft note**, and leaves review, correction, and confirmation to the physician.

The product principle is fixed: **the agent documents; the physician decides.**

This repository is a monorepo for the Oira desktop client (Electron), shared UI and types, and engineering documentation. The public name is still pending (`Notas-Medicas-name-pending`).

## Current status

Early prototype. The desktop renderer runs a complete consultation path against a **mock bridge**. There is no live microphone capture, no QVAC inference, and no SQLite persistence in this build.

| Included | Not included |
| --- | --- |
| Electron shell and React renderer | Website / marketing site |
| Draft review with seven clinical sections | `@qvac/sdk`, model download, or remote inference |
| Synthetic transcript and note | Real audio, EHR integration, accounts, or cloud sync |
| Copy-to-clipboard export | PDF export, signing, or installers |

Do not publish legal, compliance, or performance claims from this prototype. Privacy UI shows `DESCONOCIDO` unless the backend has confirmed a fact.

## Requirements

- Node.js 20 or later
- [pnpm](https://pnpm.io/) 10 (see `packageManager` in the root `package.json`)

## Setup

```bash
pnpm install
pnpm dev:desktop
```

The first install compiles Electron and esbuild binaries. `pnpm dev:desktop` opens the desktop app with hot reload.

### Scripts

| Command | Purpose |
| --- | --- |
| `pnpm dev:desktop` | Start Electron in development |
| `pnpm test` | Run unit tests (state machine and mock bridge) |
| `pnpm lint:desktop` | Lint the renderer |
| `pnpm typecheck` | Typecheck shared types and the desktop app |
| `pnpm --filter oira-desktop build` | Production bundle under `apps/desktop/out/` |

### Prototype flow

1. Confirm that the patient was informed of recording (not a legal consent artifact).
2. Start and stop a simulated recording. No identifier is required.
3. Wait through transcription and structuring (mock delays).
4. Review the draft beside the transcript. Empty sections stay **No consta** or **Sin determinar**.
5. Accept explicitly, then copy the preview. What is pasted elsewhere is outside Oira.

Fixtures are synthetic. Do not commit real patient audio, transcripts, or notes.

## Repository layout

```text
apps/desktop/                 Electron app
  src/main/                   Main process (Justin)
  src/preload/                contextBridge (Justin)
  src/renderer/               UI (Antonio)
packages/types/               Shared domain types
packages/ui/                  Presentational primitives (no clinical logic)
docs/                         Architecture, UX, AI, and research
```

The renderer talks to the rest of the system only through `src/renderer/bridge/`. Development uses `mock.ts`; the real `window.oira` API is owned by Main/preload.

## Ownership

| Area | Owner | Boundary |
| --- | --- | --- |
| Website (later), renderer, design system, UX | Antonio | Does not edit `src/main/` or `src/preload/` |
| Electron Main, IPC, SQLite, QVAC adapter | Justin | Exposes `window.oira` — if new to Electron, read [Electron from zero](docs/ELECTRON_GETTING_STARTED.md) first |
| STT, structuring, prompts, evaluation | IA | Defines transcript and note shape

## Documentation

| Document | Contents |
| --- | --- |
| [Electron from zero](docs/ELECTRON_GETTING_STARTED.md) | What Electron is, Main/Preload/Renderer, how Justin runs and owns config (no prior Electron knowledge) |
| [Frontend / UI-UX](docs/FRONTEND_UIUX_GUIDE.md) | Screens, copy, states, and frontend definition of done |
| [Frontend delivery plan](docs/FRONTEND_AGILE_DELIVERABLE.md) | Twelve measurable frontend iterations |
| [Backend architecture](docs/BACKEND_DESKTOP_ARCHITECTURE_GUIDE.md) | Main process, IPC, storage, QVAC adapter |
| [Backend delivery plan](docs/BACKEND_AGILE_DELIVERABLE.md) | Twelve measurable backend iterations without `@qvac/sdk` |
| [Backend skeleton review](docs/BACKEND_SKELETON_REVIEW.md) | What to cut vs keep in the current `config` + `ipc` skeleton |
| [AI / QVAC transcription](docs/AI_QVAC_TRANSCRIPTION_GUIDE.md) | Speech-to-text, structuring, prompts, evaluation |

Open research items and researcher prompts live under [`docs/research/`](docs/research/README.md). Each investigation is a single ID, written up with sources and an explicit product decision. Items marked as requiring research must not appear as product claims until that write-up exists.
