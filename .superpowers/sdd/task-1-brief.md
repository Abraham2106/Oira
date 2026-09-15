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
          text: "AfirmÃ³ y negÃ³ falta de aire.",
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
      "AfirmÃ³ y negÃ³ falta de aire.",
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

- [ ] **Step 2: Run tests â€” expect the NOT_STATED/UNKNOWN cases to fail on current code**

Run: `pnpm --filter oira-desktop test -- src/main/structure/schema.test.ts`

Expected: FAIL on `"honra NOT_STATEDâ€¦"` and/or `"preserva UNKNOWNâ€¦"` (current code forces `STATED` when text is non-empty).

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

Keep `normalizeStructuringOutput` leftovers â†’ `clinical_narrative` as `statedSection` (flat salvage path).

- [ ] **Step 4: Re-run schema tests**

Run: `pnpm --filter oira-desktop test -- src/main/structure/schema.test.ts`

Expected: PASS.

---
