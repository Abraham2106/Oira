# Agent notes

Canonical setup and scripts live in the root `README.md` and root `package.json`.

## Workspace

- pnpm 10 workspace (`packageManager` pins exact version); Node >= 20. Run `pnpm install` from the repo root; only `electron` and `esbuild` are allowed to run install scripts (`onlyBuiltDependencies`).
- `apps/desktop` is the only runnable product. `apps/website` is an empty placeholder. `packages/types` holds shared domain types (`ProductState`, `SECTION_IDS`, note/transcript shapes); `packages/ui` is presentational primitives with no clinical logic.

## Commands

- `pnpm dev:desktop` — electron-vite dev server (renderer at http://localhost:5173, native Electron window).
- `pnpm test` — vitest in apps/desktop only. Single file: `pnpm --filter oira-desktop exec vitest run src/main/errors/core.test.ts`.
- `pnpm typecheck` — runs types package then desktop. Desktop splits into `tsconfig.node.json` (main/preload/shared) and `tsconfig.web.json` (renderer/shared); both must pass.
- `pnpm lint:desktop` lints ONLY `src/renderer` with `--max-warnings=0`. Main/preload have no ESLint coverage; typecheck is their only guard.
- Production build: `pnpm --filter oira-desktop build` → output in `apps/desktop/out/`.

## Architecture facts

- Renderer reaches the rest of the system ONLY via `src/renderer/bridge/`. `getBridge()` returns the real `window.oira` adapter when preload exposed it, otherwise the mock bridge. Mock delays (~1.6s simulated transcribe/structure) live in `src/renderer/state/useEncounter.ts`, not in the mock bridge itself.
- Main process registers IPC handlers with stub deps (`createStubIpcDeps` in `src/main/ipc/index.ts`): in-memory encounter repository plus notes/export/auth stubs. No SQLite or QVAC inference exists yet despite docs describing them.
- IPC channel names live in `src/shared/constants/ipc-channels.ts`; payloads are zod-validated in `src/shared/schemas/`. The renderer view-model types differ deliberately from the wire API (`OiraApi` in `apps/desktop/src/shared/types/oira-api.ts`).
- Sandboxed preloads cannot be ESM: preload must stay CJS built as `index.cjs` (see comment in `electron.vite.config.ts`; verified by a prior bug where `window.oira` stayed undefined).
- The renderer state machine (`src/renderer/state/encounterMachine.ts`) throws on invalid transitions; extend `ProductState` transitions in `packages/types` first if adding states.
- Real-pipeline seams exist as ports with deterministic fakes, none wired into IPC yet: `src/main/stt` (SttPort: fake engine + QVAC adapter stub), `src/main/structure` (prompt v2 + zod output validation + heuristic assembler + glossary/RAG seam), `src/main/storage` (JSON file store for accepted notes), `src/renderer/audio` (getUserMedia/MediaRecorder capture + Bluetooth device detection). Product vision + master prompt live in root `VISION.md`; visual system in `DESIGN.md`.

## Conventions & constraints

- Renderer ESLint enforces repo rules: no `console`, no `localStorage`, no `dangerouslySetInnerHTML`, ESM only (`require` banned). Clinical copy is Spanish ("No consta", "Sin determinar"); privacy UI shows `DESCONOCIDO` unless the backend confirmed a fact.
- Product principle: "the agent documents; the physician decides." Never ship AI-authored content as final without explicit physician review/accept steps.
- Fixtures are synthetic. Never commit real patient audio, transcripts, or notes; do not make compliance/performance claims from prototype code (see README table of included vs not included).
- Ownership boundaries (README table): renderer/UI = Antonio, main/preload/IPC/storage/QVAC adapter = Justin, STT/prompts/eval = IA. Respect them when changing files across that boundary.
- Research-backed claims need a write-up under `docs/research/<ID>-*.md` before appearing as product claims.

## Environment-specific (Cursor Cloud Linux VM only)

- On those VMs the desktop is on `DISPLAY=:1` (TigerVNC): run `DISPLAY=:1 pnpm dev:desktop` so computer-use sees the window; never wrap in `xvfb-run`. D-Bus/GPU-process errors are expected noise. Windows/local checkouts need none of this.
