# NOTE_VERIFIER_P3 — Plan de implementación

> Decide de diseño: [`NOTE_VERIFIER_P3.md`](../../NOTE_VERIFIER_P3.md) (spec completa).
> Rama: `feature/note-verifier-p3`. Estado: F0 ✅ · F1 ✅ · F2 ✅ · F3 ✅ · F4–F5 pendientes de cierre.
> Disciplina: Regla 12 (`medido`/`observado`/`inferido`/`no_probado`) · Regla 16 (medir → analizar → optimizar con autorización).

## Fases y avance

| Fase | Entrega | Estado |
| --- | --- | --- |
| F0 | Rama + sanity verde + baseline medido | ✅ 2026-09-14 |
| F1 | Contrato estricto de generación (prompts versionados, validación con códigos, reintentos acotados, borrador no validado visible) | ✅ 2026-09-14 |
| F2 | Heurísticas deterministas explicables (`structure/rules/`) | ✅ 2026-09-14 |
| F3 | Segundo agente Qwen de revisión (puerto, prompt, runtime, estados/UI) | ✅ 2026-09-14 |
| F4 | Corpus anotado + harness de procesamiento + comparación de 4 configs | ⏳ |
| F5 | Selección de GPU endurecida (`device-selection.ts`) | ⏳ |

## Baseline — **medido** (F0)

Run real de la generación actual: `reports/2026-09-14T02-59-03.316Z-e2e-qvac/` (5 iteraciones,
commit `1194884` → `main` `94f5e87`, sin cambios en generación). Referencia para F4 y para
fijar umbrales (Regla 16 → nunca inventar metas antes del baseline).

| Métrica | Valor | Evidence |
| --- | ---: | --- |
| Presence accuracy (STT-fed, 19/19) | 83.5% (111/133) | medido |
| WER / CER | 5.1% / 1.9% | medido |
| Quote fidelity (recall) | 22.4% (15/67) | medido |
| Unsupported clinical fact rate | 78.9% (15/19) | medido |
| E2E p50 / STT p50 / structure p50 | 38.2 s / 10.2 s / 19.0 s | medido |
| Errores / transcribe retry | 0 / 0 | medido |

⚠️ Nota del baseline: `unsupportedFactRate` proviene casi todo de `source_not_supported`
(check **literal normalizado**, cota superior inflada por el parafraseo). La verificación
semántica queda `no_probado` hasta F4 con modelo local y corpus anotado; F2 cubre contratos deterministas y F3 el contrato de revisión, no calidad clínica.

## F3 — revisión independiente y trazable

El segundo Qwen recibe solo transcripción y borrador, emite hallazgos informativos y nunca acepta ni reescribe la nota. Sus secciones, IDs de segmento, citas literales y texto de omisiones se validan contra la transcripción antes de mostrarse; cualquier salida inválida, cancelada o vencida se presenta como `not_completed`. La interfaz marca el paso de revisión y permite saltar desde cada hallazgo al segmento citado. Esta trazabilidad es funcional; la precisión clínica del revisor sigue `no_probado` hasta F4.

## Integración con main

F1 conserva `draft_unvalidated` y adopta `READY` / `CLEANUP_PENDING` para notas válidas. Se mantienen la recuperación de limpieza, las transiciones de guardado y la procedencia clínica de main. El contenido de thinking/raw no se promueve a nota. Atlas actualizado con generación estricta, heurísticas y revisión Qwen.
