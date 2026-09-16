# Agent notes

Canonical setup and scripts live in the root `README.md` and root `package.json`.

## Workspace

- pnpm 10 workspace (`packageManager` pins exact version); Node >= 22.17. Run `pnpm install` from the repo root; only `electron` and `esbuild` are allowed to run install scripts (`onlyBuiltDependencies`).
- `apps/desktop` is the only runnable product. `apps/website` is an empty placeholder. `packages/types` holds shared domain types (`ProductState`, `SECTION_IDS`, note/transcript shapes); `packages/ui` is presentational primitives with no clinical logic.

## Commands

- `pnpm dev:desktop` — electron-vite dev server (renderer at http://localhost:5173, native Electron window).
- `pnpm test` — vitest in apps/desktop only. Single file: `pnpm --filter oira-desktop exec vitest run src/main/errors/core.test.ts`.
- `pnpm typecheck` — runs types package then desktop. Desktop splits into `tsconfig.node.json` (main/preload/shared) and `tsconfig.web.json` (renderer/shared); both must pass.
- `pnpm lint:desktop` lints `src/renderer src/main` with `--max-warnings=0`. Preload has no ESLint coverage; typecheck is its guard.
- Production build: `pnpm --filter oira-desktop build` → output in `apps/desktop/out/`.

## Architecture facts

- Renderer reaches the rest of the system ONLY via `src/renderer/bridge/`. `getBridge()` returns the real `window.oira` adapter when preload exposed it, otherwise the mock bridge. Mock delays (~1.6s simulated transcribe/structure) live in `src/renderer/state/useEncounter.ts`, not in the mock bridge itself.
- Main process composes adapters in `src/main/composition` (`composeApplication`) and registers IPC as a driving adapter (`registerIpc` in `src/main/ipc/index.ts`). Domain ports live in `src/main/ports`. Encounters stay in-memory. Accepted notes: `composeApplication` uses an injected `notesStore`, else `createNoteStoreForPath(notesFile)` (`.sqlite`/`.db` → unencrypted `node:sqlite` demo store; otherwise JSON), else in-memory. The Electron app passes `notesFile` from `paths.databaseFile` (`{userData}/notes/accepted-notes.sqlite`).
- IPC channel names live in `src/shared/constants/ipc-channels.ts`; payloads are zod-validated in `src/shared/schemas/`. The renderer view-model types differ deliberately from the wire API (`OiraApi` in `apps/desktop/src/shared/types/oira-api.ts`).
- Sandboxed preloads cannot be ESM: preload must stay CJS built as `index.cjs` (see comment in `electron.vite.config.ts`; verified by a prior bug where `window.oira` stayed undefined).
- The renderer state machine (`src/renderer/state/encounterMachine.ts`) throws on invalid transitions; extend `ProductState` transitions in `packages/types` first if adding states.
- QVAC Whisper transcription exists via `createQvacTranscription`. Default structuring is Qwen via `createQwenStructuring`; the heuristic assembler remains for eval/mock paths. Active inference ports are `TranscriptionPort` and `StructuringPort`; the deleted `src/main/stt/` tree is not active. Storage: in-memory when neither `notesStore` nor `notesFile` is passed; unencrypted SQLite demo (`createSqliteNoteStore` / `node:sqlite`) for `.sqlite`/`.db` paths; JSON otherwise. Not SQLCipher. Generated `EXTRACTED` + `STATED` fields require sources; `saveNote` requires `clinicianConfirmed: true`, a generated draft, and source verification. Partial results use `CLEANUP_PENDING` / `PERSISTED_TRANSITION_PENDING`. Product vision + master prompt live in root `VISION.md`; visual system in `DESIGN.md`. See [R-13](docs/research/R-13-domain-invariants-and-ipc.md).

## Conventions & constraints

### Architecture atlas maintenance (required)

- The canonical interactive architecture map is `docs/codebase-map.html`; the README preview is `docs/assets/codebase-map.png`.
- Any **major structural change** must update the atlas in the same change/PR: adding, moving, renaming or removing a module/service/port/adapter; changing process boundaries, dependency injection, IPC contracts, inference stages/models, persistence, or shared domain/state models.
- Use CodeGraph first when an existing `.codegraph/` index is available. Confirm relationships against current source. Do not create an index automatically. The HTML is a curated architecture overview, not an exhaustive generated symbol index.
- Update `LAYERS`, `NODES`, `EDGES`, node descriptions/source paths, guided tours, and the UML/component/domain diagrams affected by the change. Add new structural components and remove obsolete ones; preserve edge direction and distinguish calls, contract implementation, injection and data flow.
- A bug fix or styling-only change needs no graph edit unless it changes a represented relationship. Explain the atlas impact in the PR when a structural change is involved.
- Run `pnpm atlas:check`. For preview/render validation: `npm ci --prefix scripts/architecture/atlas`, `npm --prefix scripts/architecture/atlas exec -- playwright install chromium`, then `pnpm atlas:capture`. Review the generated image. The capture tool is isolated from the Electron/QVAC workspace.
- GitHub Actions validates/captures on PRs, uploads a preview artifact, and refreshes the tracked PNG after a matching push to `main`. CI renders the curated HTML; it does **not** infer missing architecture changes. Never substitute a screenshot refresh for updating the graph.
- Keep browser profiles, temporary screenshots and real clinical data out of commits. Only the canonical preview under `docs/assets/` is a generated repository asset.

- Renderer ESLint enforces repo rules: no `console`, no `localStorage`, no `dangerouslySetInnerHTML`, ESM only (`require` banned). Clinical copy is Spanish ("No consta", "Sin determinar"); privacy UI shows `DESCONOCIDO` unless the backend confirmed a fact.
- Product principle: "the agent documents; the physician decides." Never ship AI-authored content as final without explicit physician review/accept steps.
- Fixtures are synthetic. Never commit real patient audio, transcripts, or notes; do not make compliance/performance claims from prototype code (see README table of included vs not included).
- Ownership boundaries (README table): renderer/UI = Antonio, main/preload/IPC/storage/QVAC adapter = Justin, STT/prompts/eval = IA. Respect them when changing files across that boundary.
- Research-backed claims need a write-up under `docs/research/<ID>-*.md` before appearing as product claims.

## Environment-specific (Cursor Cloud Linux VM only)

- On those VMs the desktop is on `DISPLAY=:1` (TigerVNC): run `DISPLAY=:1 pnpm dev:desktop` so computer-use sees the window; never wrap in `xvfb-run`. D-Bus/GPU-process errors are expected noise. Windows/local checkouts need none of this.
