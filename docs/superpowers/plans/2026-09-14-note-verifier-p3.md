# NOTE_VERIFIER_P3 — Plan de implementación

> Decide de diseño: [`NOTE_VERIFIER_P3.md`](../../NOTE_VERIFIER_P3.md) (spec completa).
> Rama: `feature/note-verifier-p3`. Estado: F0 ✅ · F1 en curso · F2–F5 pendientes.
> Disciplina: Regla 12 (`medido`/`observado`/`inferido`/`no_probado`) · Regla 16 (medir → analizar → optimizar con autorización).

## Fases y avance

| Fase | Entrega | Estado |
| --- | --- | --- |
| F0 | Rama + sanity verde + baseline medido | ✅ 2026-09-14 |
| F1 | Contrato estricto de generación (prompts versionados, validación con códigos, reintentos acotados, borrador no validado visible) | 🔧 |
| F2 | Heurísticas deterministas explicables (`structure/rules/`) | ⏳ |
| F3 | Segundo agente Qwen de revisión (puerto, prompt, runtime, estados/UI) | ⏳ |
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
semántica queda `no_probado` hasta F2/F3.