# Presence-preserving normalize (I4) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the product note preserve honest I4 presence (`STATED` / `NOT_STATED` / `UNKNOWN`) instead of collapsing every non-empty section to `STATED`, then re-measure Capa A against the frozen baseline.

**Architecture:** Two tightly coupled product fixes, no prompt text changes. (1) `asSection` / `normalizeStructuringOutput` honor an explicit `presence` field when the model emits section objects. (2) Wire the already-defined `CLINICAL_NOTE_JSON_SCHEMA` into QVAC `responseFormat: json_schema` so the model is asked for `{ presence, text, sourceSegmentIds }` instead of free-form `json_object` (which produced flat strings in the baseline). Then re-run `pnpm eval -- --adapter qvac` and compare to `reports/2026-09-12T19-37-28.021Z-skip-stt-qvac/`.

**Tech Stack:** TypeScript, Vitest, `@qvac/sdk` 0.18.2, Electron `ELECTRON_RUN_AS_NODE`, existing `eval/` harness.

## Global Constraints

- Do **not** edit prompt copy in `apps/desktop/src/main/structure/prompt.ts` (or glossary) in this plan.
- Do **not** invent clinical content; empty / `NOT_STATED` / `UNKNOWN` remain valid.
- Do **not** change fixture gold or scorer formulas except optional dual-score reporting (Task 4, additive only).
- Preserve permissive parse: invalid shapes still produce a draft (`validateStructuringOutput` stays `ok: true`); only presence semantics change.
- Commits only if the user explicitly asks; otherwise leave changes uncommitted.
- Baseline reference (medido): `reports/2026-09-12T19-37-28.021Z-skip-stt-qvac/` — presence 89.0%, UNKNOWN F1 = 0, case `12` = 57%.
- QVAC weights cache: `%LOCALAPPDATA%\Oira\qvac-models` via `qvac.config.mjs`.

## Evidence that motivates this plan (medido / observado)

- **Medido:** baseline raw SDK for `12-contradiction` and `02-negation` is flat string JSON, e.g. `"clinical_narrative": "…"`, not section objects.
- **Observado:** `createQwenStructuring` passes `schema: {}`; `completeStructuring` hardcodes `responseFormat: { type: "json_object" }` and ignores `input.schema`.
- **Observado:** `CLINICAL_NOTE_JSON_SCHEMA` already requires `presence` ∈ `{STATED,NOT_STATED,UNKNOWN}` per section.
- **Observado:** `asSection` ignores `presence` and maps non-empty text → `STATED` (`schema.ts`); tests explicitly lock that behavior today.

**Inferido:** fixing normalize alone without wiring `json_schema` will not unlock `UNKNOWN` on the measured path.

## File map

| File | Role |
| --- | --- |
| `apps/desktop/src/main/structure/schema.ts` | Presence-preserving `asSection` + helpers |
| `apps/desktop/src/main/structure/schema.test.ts` | Contract tests (replace the “pega texto → STATED” lock) |
| `apps/desktop/src/main/structure/json-schema.ts` | Existing I4 schema (read-only unless a tiny export tweak is needed) |
| `apps/desktop/src/main/qvac/inference-runtime.ts` | Use `json_schema` when schema non-empty |
| `apps/desktop/src/main/qvac/qwen-structuring.ts` | Pass `CLINICAL_NOTE_JSON_SCHEMA` instead of `{}` |
| `apps/desktop/src/main/qvac/qwen-structuring.test.ts` | Assert schema is forwarded |
| `apps/desktop/src/main/qvac/inference-runtime.test.ts` | Assert responseFormat when schema provided |
| `eval/runner.mjs` / `eval/report.mjs` (optional Task 4) | Dual score product vs raw-normalized if raw objects appear |
| `reports/<new-run>/` | New baseline artifacts |

---

### Task 1: Presence-preserving `asSection`

**Files:**
- Modify: `apps/desktop/src/main/structure/schema.ts`
- Modify: `apps/desktop/src/main/structure/schema.test.ts`

**Interfaces:**
- Consumes: section raw values (string | object), `known` segment id set
- Produces: `StructuringSection` with honest `presence`

**Presence policy (lock this in tests):**

| Input shape | Result |
| --- | --- |
| Non-object / plain string, non-empty | `STATED` + text (legacy flat path) |
| Plain string empty | `NOT_STATED` + `""` |
| Object, `presence: "STATED"`, non-empty text | `STATED` + text + filtered ids |
| Object, `presence: "STATED"`, empty text | `NOT_STATED` + `""` + `[]` (keep existing coerce) |
| Object, `presence: "NOT_STATED"` | `NOT_STATED` + `""` + `[]` (**honor presence; drop text**) |
| Object, `presence: "UNKNOWN"` | `UNKNOWN` + text (may be non-empty) + filtered ids |
| Object, missing/invalid `presence`, non-empty text | `STATED` + text (legacy fallback) |
| Object, missing/invalid `presence`, empty text | `NOT_STATED` |

- [ ] **Step 1: Rewrite failing/updated tests in `schema.test.ts`**

Replace the test `"pega texto aunque el modelo marque NOT_STATED"` with presence-honoring cases. Keep the empty-STATED coerce test. Add UNKNOWN + flat-string tests.

```ts
it("honra NOT_STATED aunque venga texto", () => {
  const result = validateStructuringOutput(
    {
      sections: {
        follow_up: { presence: "NOT_STATED", text: "algo", sourceSegmentIds: [] },
      },
    },
    KNOWN,
  )
  expect(result.ok).toBe(true)
  if (result.ok) {
    expect(result.value.sections.follow_up?.presence).toBe("NOT_STATED")
    expect(result.value.sections.follow_up?.text).toBe("")
  }
})

it("preserva UNKNOWN con texto", () => {
  const result = validateStructuringOutput(
    {
      sections: {
        clinical_narrative: {
          presence: "UNKNOWN",
          text: "Afirmó y negó falta de aire.",
          sourceSegmentIds: ["seg-1"],
        },
      },
    },
    KNOWN,
  )
  expect(result.ok).toBe(true)
  if (result.ok) {
    expect(result.value.sections.clinical_narrative?.presence).toBe("UNKNOWN")
    expect(result.value.sections.clinical_narrative?.text).toBe(
      "Afirmó y negó falta de aire.",
    )
    expect(result.value.sections.clinical_narrative?.sourceSegmentIds).toEqual([
      "seg-1",
    ])
  }
})

it("strings planas siguen siendo STATED si hay texto", () => {
  const result = validateStructuringOutput(
    { clinical_narrative: "Dolor de rodilla." },
    KNOWN,
  )
  expect(result.ok).toBe(true)
  if (result.ok) {
    expect(result.value.sections.clinical_narrative?.presence).toBe("STATED")
  }
})
```

- [ ] **Step 2: Run tests — expect the NOT_STATED/UNKNOWN cases to fail on current code**

Run: `pnpm --filter oira-desktop test -- src/main/structure/schema.test.ts`

Expected: FAIL on `"honra NOT_STATED…"` and/or `"preserva UNKNOWN…"` (current code forces `STATED` when text is non-empty).

- [ ] **Step 3: Implement `asSection` presence handling in `schema.ts`**

Replace `asSection` (and add a tiny helper) with:

```ts
import type { FieldPresence } from "@oira/types"

function unknownSection(
  text: string,
  sourceSegmentIds: string[] = [],
): StructuringSection {
  return { presence: "UNKNOWN", text, sourceSegmentIds }
}

function readPresence(raw: unknown): FieldPresence | undefined {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return undefined
  const value = (raw as { presence?: unknown }).presence
  if (value === "STATED" || value === "NOT_STATED" || value === "UNKNOWN") return value
  return undefined
}

function asSection(raw: unknown, known: Set<string>): StructuringSection {
  const text = extractText(raw)
  let sourceSegmentIds: string[] = []
  if (typeof raw === "object" && raw !== null && !Array.isArray(raw)) {
    const ids = (raw as { sourceSegmentIds?: unknown }).sourceSegmentIds
    if (Array.isArray(ids)) {
      sourceSegmentIds = ids.filter(
        (id): id is string => typeof id === "string" && known.has(id),
      )
    }
  }

  const presence = readPresence(raw)
  if (presence === "NOT_STATED") return emptySection()
  if (presence === "UNKNOWN") return unknownSection(text, sourceSegmentIds)
  if (presence === "STATED" || presence === undefined) {
    if (!text) return emptySection()
    return statedSection(text, sourceSegmentIds)
  }
  return emptySection()
}
```

Keep `normalizeStructuringOutput` leftovers → `clinical_narrative` as `statedSection` (flat salvage path).

- [ ] **Step 4: Re-run schema tests**

Run: `pnpm --filter oira-desktop test -- src/main/structure/schema.test.ts`

Expected: PASS.

---

### Task 2: Wire `CLINICAL_NOTE_JSON_SCHEMA` into completion (no prompt edits)

**Files:**
- Modify: `apps/desktop/src/main/qvac/inference-runtime.ts` (`completeStructuring`)
- Modify: `apps/desktop/src/main/qvac/qwen-structuring.ts`
- Modify: `apps/desktop/src/main/qvac/inference-runtime.test.ts`
- Modify: `apps/desktop/src/main/qvac/qwen-structuring.test.ts`

**Interfaces:**
- Consumes: `input.schema: Record<string, unknown>` already on `completeStructuring`
- Produces: QVAC `responseFormat` either `json_schema` (when schema has keys) or legacy `json_object` (empty schema)

- [ ] **Step 1: Update runtime to honor non-empty schema**

In `completeStructuring`, replace hardcoded:

```ts
responseFormat: { type: "json_object" },
```

with:

```ts
responseFormat:
  Object.keys(input.schema).length > 0
    ? {
        type: "json_schema",
        json_schema: {
          name: "clinical_note",
          schema: input.schema,
          // omit strict unless already used elsewhere; SDK accepts it optionally
        },
      }
    : { type: "json_object" },
```

Match the exact `CompletionResponseFormat` shape in `apps/desktop/src/main/qvac/sdk-0.18.2.d.ts` (read before coding; field names must match the local pin).

- [ ] **Step 2: Pass the real schema from `qwen-structuring.ts`**

```ts
import { CLINICAL_NOTE_JSON_SCHEMA } from "../structure/json-schema"
// ...
const completion = await runtime.completeStructuring({
  history: messagesFor(chunk),
  schema: CLINICAL_NOTE_JSON_SCHEMA,
  generation,
})
```

- [ ] **Step 3: Adjust unit tests**

- `qwen-structuring.test.ts`: assert `completeStructuring` was called with `schema` equal to `CLINICAL_NOTE_JSON_SCHEMA` (or deep-equal on `required` / `properties.sections`).
- `inference-runtime.test.ts`: when calling `completeStructuring` with a non-empty schema, mock `sdk.completion` and expect `responseFormat.type === "json_schema"` and `json_schema.schema` to be that object; empty schema → `json_object`.

- [ ] **Step 4: Run focused + desktop tests**

Run:

```bash
pnpm --filter oira-desktop test -- src/main/structure/schema.test.ts src/main/qvac/qwen-structuring.test.ts src/main/qvac/inference-runtime.test.ts
pnpm --filter oira-desktop test
```

Expected: all PASS.

- [ ] **Step 5: Typecheck**

Run: `pnpm typecheck`

Expected: PASS.

---

### Task 3: Smoke one hard case before full suite

**Files:** none (command-only)

- [ ] **Step 1: Run only cases `02` and `12` with qvac**

```powershell
$env:QVAC_CONFIG_PATH = (Resolve-Path "qvac.config.mjs").Path
pnpm eval -- --adapter qvac --cases "02,12"
```

Expected (success criteria — verify in new `reports/*/cases.json` + raw in `run.json`):

- Adapter errors: 0
- Raw completion for at least one case prefers section **objects** with `presence` when `json_schema` works (**medido** after run; if still flat strings, stop and diagnose schema wiring before full suite — do not claim UNKNOWN fixed).
- If objects appear: `12` may still mis-route text, but product note is **allowed** to show `UNKNOWN` when the model sets it (normalize no longer forbids it).

- [ ] **Step 2: Record observed raw shape in the run notes**

Inspect `results[].evaluation.rawSdkText` (or equivalent) for `12-contradiction`. Note whether presence fields exist. This gates Task 4.

---

### Task 4: Full Capa A re-baseline + compare

**Files:**
- Create (by runner): `reports/<new-run-id>-skip-stt-qvac/**`
- Optional modify: `eval/report.mjs` only if you add a one-line “compare to baseline run id” note — **skip code changes unless needed**; prefer manual compare in REPORT conclusions.

- [ ] **Step 1: Full eval**

```powershell
pnpm eval -- --adapter qvac
```

Expected: 13/13 adapter ok; write `REPORT.md`, `metrics.json`, `cases.json`, `errors.json`, `run.json`.

- [ ] **Step 2: Compare to frozen baseline (medido only)**

Compare at least:

| Metric | Old (2026-09-12T19-37-28…) | New |
| --- | ---: | ---: |
| presence accuracy | 89.0% | ? |
| UNKNOWN support / TP | 2 / 0 | ? |
| case `12` presence | 57.1% | ? |
| case `02` presence | 71.4% | ? |
| invention rate | 0% | ? |
| raw JSON valid | 1.0 | ? |

Do **not** invent improvements. If UNKNOWN TP still 0, document whether raw still lacks `presence` (**medido**) vs model chooses never to emit UNKNOWN (**inferido**).

- [ ] **Step 3: Desktop lint**

Run: `pnpm lint:desktop`

Expected: exit 0.

---

### Task 5 (optional, eval-only): Dual presence score

Only if Task 3 shows object-shaped raw **and** product normalize still differs from raw presence.

**Files:**
- Modify: `eval/scorer/index.mjs` / `eval/runner.mjs` / `eval/report.mjs`

Add additive fields `presenceProduct` (current) and `presenceRaw` (normalize a second time from parsed raw **or** score raw presence before product normalize). Do not replace the product score — the mission scores the product note.

Skip this task if timeboxed; re-baseline alone is enough for the approval scope.

---

## Out of scope (explicit)

- Prompt / glossary / bucket-discipline wording changes
- Heuristic assembler behavior changes (unless a test breaks solely due to shared normalize — then fix via same `asSection` contract)
- note-verifier implementation
- WAV / WER / Capa B
- Changing gold fixtures to match bad model output

## Success criteria

1. Unit tests prove `UNKNOWN` and honest `NOT_STATED` survive normalize when present on section objects.
2. Production structuring path requests `CLINICAL_NOTE_JSON_SCHEMA` via `json_schema` (verified by unit test).
3. New qvac Capa A report exists; comparison table filled with **medido** numbers only.
4. No prompt file edits in the diff.

## Self-review

- Spec coverage: normalize + schema wire + remeasure — all tasked; dual-score optional.
- No prompt edits required for success criteria 1–4.
- Types: `FieldPresence` from `@oira/types`; section shape matches `structuringSectionSchema`.
