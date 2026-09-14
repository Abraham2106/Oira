# Architecture atlas tooling

The curated HTML lives in `docs/codebase-map.html`. Its graph data and UML/component/domain views must change together when architecture changes. See the root `AGENTS.md`.

## Local commands

From the repository root:

```sh
node scripts/architecture/atlas/check.mjs
npm ci --prefix scripts/architecture/atlas
npm --prefix scripts/architecture/atlas exec -- playwright install chromium
node scripts/architecture/atlas/capture.mjs
```

The equivalent root scripts are `pnpm atlas:check` and `pnpm atlas:capture`. Capture writes only `docs/assets/codebase-map.png`. This nested npm package deliberately sits outside the pnpm product workspace so CI does not install Electron, QVAC or model weights.

An existing Chrome can be used locally by setting `ATLAS_CHROME` to its executable path. CI uses the Chromium revision pinned by Playwright's lockfile.

## What is checked

- JavaScript syntax; unique layer/node IDs; nonempty node metadata.
- Edge endpoints, relation labels and supported edge types.
- The three views and the README image reference.
- Browser rendering without page errors; nonempty graph; tab and inspector interactions.

The validator does not prove that curated relationships match the source or detect every structural change. Agents and reviewers must use CodeGraph/source inspection to maintain the data and diagrams.

## Capture contract

`?snapshot=1` disables animation, applies fixed dimensions and runs exactly 600 layout ticks from the initial positions. `window.prepareAtlasSnapshot()` resets this state, and `document.documentElement.dataset.atlasReady` announces that rendering finished. The ordinary interactive view retains its animation and controls.

Repeated captures on the same browser/OS should be identical. Font rasterization can differ across operating systems; the committed preview becomes the Linux CI rendering after merge.

## GitHub Actions

`.github/workflows/architecture-atlas.yml` uses a read-only render job for PRs, pushes to `main`, and manual runs. It uploads the PNG as an artifact. Only a separate publish job on `main` gets `contents: write` and commits **only** `docs/assets/codebase-map.png`.

The README uses a relative image link, so it needs no recurring text rewrite. PNG-only commits are excluded from the path trigger. Stale captures are skipped if the atlas or tooling changed after rendering; pushes never use force.

Branch protection and organization token policies still apply. If they reject the bot's push, the preview remains available in the run artifact; commit that PNG through the normal PR process. The workflow does not bypass protection or create credentials.

References: [GitHub token permissions](https://docs.github.com/en/actions/tutorials/authenticate-with-github_token), [Playwright CI setup](https://playwright.dev/docs/ci-intro).
