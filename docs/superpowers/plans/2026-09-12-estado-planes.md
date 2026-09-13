# Estado de los planes — situación al 2026-09-12

> Documento de estado consolidado: recopila los **dos planes** de superpowers activos del work de presencia I4, qué está cerrado (medido) y qué falta por hacer. No reemplaza los planes, solo los resume para retomar rápido.

## 1. Plan A — Presence-preserving normalize

**Archivo:** `docs/superpowers/plans/2026-09-12-presence-preserving-normalize.md` · **commit:** `2094762` (fusionado a la rama)

**Estado: ✅ COMPLETO** (todas las tasks marcadas en `.superpowers/sdd/progress.md`)

| Task | Qué | Cómo quedó |
|---|---|---|
| 1 | `asSection` presencia-honest / `normalizeStructuringOutput` honra `NOT_STATED`/`UNKNOWN` | Cerrado con tests |
| 2 | Wire `CLINICAL_NOTE_JSON_SCHEMA` → QVAC `json_schema` | Cerrado con tests |
| 3 | Smoke `02`+`12`, raw objects con `presence` | Run `2026-09-12T20-13-39.074Z` |
| 4 | Full re-baseline Capa A qvac | Run `2026-09-12T20-15-09.774Z-skip-stt-qvac` → **baseline a batir** |
| 5 | Dual-score (opcional) | Saltada por timebox |

**Métricas del baseline `20-15-09` (medido, `metrics.json`):**

- presence accuracy **89.0%** (81/91 correcto)
- Macro-F1 **0.591** · UNKNOWN TP **0/2** (F1 = 0)
- `visit_context` STATED→NOT_STATED: **6** casos (falla dominante del mix de errores)
- Invention rate **0%** · statedWithoutSource **0**
- raw JSON válido **1.0** · latency p50 **14.4 s**

---

## 2. Plan B — I4 Structuring Prompt

**Archivo:** `docs/superpowers/plans/2026-09-12-i4-structuring-prompt.md` · **commit:** `2094762` (mismo)

**Estado: ⏳ A MEDIO — Tasks 1–2 implementadas y commiteadas; Tareas 3–4 pendientes de verificar**

Los 12 checkboxes del plan siguen en `[ ]` en el archivo (no se tiquetearon), pero el **código** ya está en el estado objetivo (commit `2094762`):

- `prompt.ts` ya pide `{presence, text, sourceSegmentIds}` + buckets + `/no_think` — **Task 2 hecha**
- `prompt.test.ts` ya exige los tokens new I4 — **Task 1 hecha** (falta confirmar que pasen)

### Lo que falta (por orden de ejecución)

| # | Acción | Comando / evidencia | Bloqueado por |
|---|---|---|---|
| 1 | Correr **unit test del prompt** aislado | `pnpm --filter oira-desktop test -- src/main/structure/prompt.test.ts` (filtrar bien: **no** pasar `"--"`; el runner lo añade) | — |
| 2 | Aislar 4 fallos en `register.test.ts` | 4 timeouts de 5 s: cargan QVAC real (modelo local Qwen 4B). Son **timeouts de infra/test**, no del prompt | Hardware/QVAC |
| 3 | **Task 3 — Smoke** casos duros `02` y `12` | `pnpm eval -- --adapter qvac --cases "02,12"` | Clasificador QVAC (estaba en **outage** al final de la sesión anterior) |
| 4 | **Task 4.1 — Full re-baseline** Capa A | `pnpm eval -- --adapter qvac` (13 casos, 0 errores) | QVAC arriba |
| 5 | **Task 4.2 — Comparar** vs `20-15-09` (medido) | Tabla: presencia ≥ 89%, `visit_context` omissions **baja**, case `12` UNKNOWN documentado (product **o** raw), invention 0 | Resultado del run |
| 6 | **Task 4.3** — append línea en `.superpowers/sdd/progress.md` | Nuevo run id | — |
| 7 | Tiquetear los 12 checkboxes del plan B | Dejar constancia en el `.md` | — |

### Criterio de éxito (del spec, sección 9 — no inventar)

1. `visit_context` gold `STATED`→pred `NOT_STATED` **disminuye** vs `20-15-09`.
2. Caso `12`: `UNKNOWN` aparece en el producto **o** el raw SDK muestra que el modelo sigue negándose (documentar cuál; medido).
3. Invention rate sigue **0**; `statedWithoutSource` cerca de **0**.

---

## 3. Contexto operativo

- **Rama:** `feature/presence-preserving-normalize` (pusheada, PR sugerido en `https://github.com/Abraham2106/Oira/pull/new/feature/presence-preserving-normalize`)
- **Último run en disco:** `20-15-09` (el baseline, **no** hay re-baseline post-prompt aún)
- **Sin commitear:** solo `.superpowers/` y `apps/desktop/src/.codegraph/` (locales, no van al PR)
- **CLAUDE.md:** monorepo con `pnpm --filter oira-desktop test`; QVAC cache en `%LOCALAPPDATA%\Oira\qvac-models` (fuera de OneDrive)
- **Logs:** `eval/*.log` e `eval/qvac-local.config.mjs` ignorados por `.gitignore`