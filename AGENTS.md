# Agent notes

Canonical setup and scripts live in the root `README.md` and `package.json`.

## Cursor Cloud specific instructions

NotaLocal is a pnpm workspace. The only runnable product today is the Electron desktop prototype (`apps/desktop`). `apps/website` is an empty placeholder.

- Refresh dependencies with `pnpm install` from the repo root (pnpm 10 is pinned via `packageManager`).
- Lint / typecheck / test: `pnpm lint:desktop`, `pnpm typecheck`, `pnpm test`.
- Dev server: `pnpm dev:desktop` (electron-vite). Renderer is at `http://localhost:5173/`; Electron opens a native window.
- This Cloud Agent desktop is on `DISPLAY=:1` (TigerVNC). Run Electron on that display so the window is visible to computer-use (`DISPLAY=:1 pnpm dev:desktop`). Do not wrap it in `xvfb-run`; that starts a separate X server the VNC session cannot see.
- Electron logs D-Bus and GPU-process errors under this VM; they are expected and do not block the mock consultation UI.
- The prototype uses the renderer mock bridge. Hello-world flow: check the patient-informed checkbox → Comenzar grabación → Detener grabación → wait for mock transcribe/structure (~1.6s) → confirm review → Aceptar borrador → Copiar nota.
- No secrets, database, or Docker services are required for the current prototype.
