# Diseño de Benchmark Reusable para Oira — Etapa 1: Investigación y Plan

> **Fecha:** 2026-09-13
> **Estatus:** PROPUESTA DE INVESTIGACIÓN — **pendiente de aprobación**
> **Regla:** Esta etapa NO implementa nada. NO modifica archivos. NO ejecuta cambios. Solo investiga, analiza, compara, diseña y documenta.
> **Referencia:** brief del usuario (secciones 0–16) + repositorio Oira (auditoría completada) + repositorio Albatross (pendiente de integración).
> **Regla de interpretación:** medido / observado / inferido / no_probado — nunca inventar datos faltantes.

---

## 0. Auditar Oira (completada)

### Pipeline real reconstruido desde el código

```
                    OIRA PIPELINE (real)

Audio (mic/WAV)
  │
  ▼
[Transcripción — Whisper large-v3-turbo via @xenva/transformers]
  │  entrada: WAV 16kHz mono
  │  salida: TranscriptSegment[]  {id, speaker, startMs, text}
  │  estado actual: E2E audio→transcripción = NO MEDIDO (Sin WAV en eval/audio/)
  │
  ▼
[Estructuración — Qwen 3 4B Q4_K_M via QVAC SDK (cloud api.qvac.no)]
  │  entrada: transcript + prompt I4 (prompt.ts) + CLINICAL_NOTE_JSON_SCHEMA
  │  salida: objeto JSON con sections[7] {presence, text, sourceSegmentIds}
  │  Estado actual: NIVEL 2 COMPLETO (Capa A --skip-stt)
  │
  ▼
[Postprocesamiento — normalizeStructuringOutput + asSection]
  │  honra presence STATED|NOT_STATED|UNKNOWN; sourceSegmentIds filtrados
  │
  ▼
[Validación — clinicalNoteSchema.safeParse + verifySource]
  │  salida: GenerateNoteResult {transcript, note}
  │
  ▼
[Persistencia — notes.service.ts]
```

### Interfaces entre etapas (puertos/adapters — DI limpia)

| Etapa | Puerto | Adapter real | Entrada → Salida |
| --- | --- | --- | --- |
| Transcripción | `TranscriptionPort` | Whisper (Electron renderer) | WAV → `TranscriptSegment[]` |
| Estructuración | `StructuringPort` | `qwen-structuring.ts` → QVAC SDK | transcript → objeto JSON |
| Inference runtime | `InferenceRuntimePort` | `inference-runtime.ts` | handoff + `responseFormat` |
| Audio capture | `AudioCapturePort` | renderer | WAV path |
| Encounters | `EncounterPort` | in-memory/store | estado del encuentro |
| Progress | `ProgressPort` | renderer UI | eventos de fase |

### Puntos clave observables vs no observables

- **Observable:** eventos de fase (`transcribing`/`structuring`/`failed`), métricas de latencia, raw SDK text, run.json, reporte.
- **No observable:** estado interno del modelo, tokens generados, decisiones internas de Qwen, prompts efectivos sin instrumentar, calidad de la transcripción sin WAV de referencia.

### Schemas y tipos clave

- `@oira/types` — `SECTION_IDS`, `SECTION_TITLES`, `TranscriptSegment`, `StructuringSection`
- `CLINICAL_NOTE_JSON_SCHEMA` — schema I4 con `presence ∈ {STATED, NOT_STATED, UNKNOWN}` por sección
- `clinicalNoteSchema` (zod) — validación post-procesamiento
- `FieldPresence` — tipo union de presence

---

## 1. Auditar Albatross (completada)

**Repositorio:** https://github.com/Abraham2106/Albatross · **Rama:** main (68 commits) · **Licencia:** Propietaria (solo evaluación hackathon permitida).

### Qué es Albatross
Aplicación Electron + React + TypeScript que convierte dictados de voz de ingenieros de campo en base instalada estructurada y auditable de equipos médicos hospitalarios. Principios: 100% local (Whisper Turbo + Qwen3-4B en laptop), motor determinista rankea gaps, cada extracción cita texto literal, `null ≠ Unknown`, conflictos no se auto-resuelven, modelo propone/código decide.

### Pipeline
```
Voice → Whisper Turbo → Transcripción → Qwen3-4B (JSON schema, temp 0, seed 42)
→ Validación (schema + cita) → Lógica dominio (new/corroboration/conflict)
→ Confirmación humana → SQLite local → Certeza recalculada → Nuevas preguntas
```

### Métricas de referencia (10 dictados, modelos reales)
| Idioma | Modalidad | Cantidad | Marca | Edad | Latencia p50 |
|--------|-----------|----------|-------|------|--------------|
| English | 100% | 100% | 88% | 100% | 3.2s |
| Español | 100% | 88% | 81% | 100% | 3.4s |

### Harness de medición y benchmarking (CRÍTICO)

| Archivo | Qué hace |
|---------|----------|
| `scripts/measure.mjs` | Orquesta benchmark completo |
| `scripts/measurement-core.mjs` | Lógica pura de evaluación (reutilizable) |
| `scripts/measurement-core.test.mjs` | 14 tests verificando reproducibilidad |
| `fixtures/voice-tests.json` | 10 casos gold EN/ES + 4 casos propios (A1-A4) |

**Métricas medidas:**
- **Grupos:** Exactos, Precision, Recall, F1, Casos exactos, Filas extra/faltantes
- **Por campo (11):** Accuracy, Penalizada, Presentes/Ausentes, Error, Relleno (filling)
- **Latencia:** p50, p95 (interpolación lineal), cold-start excluido
- **Calidad:** Truncamientos, unknownStopReasons, brandFillCases, brandModelFillCases
- **Dominio:** Distribuciones Status/Confidence

**Detección de "Filling" (invención):** `brandFillCases` = marca donde referencia es `null`/`Unknown` → objetivo 0. Evaluado en casos 4, 6, 10.

**Reproducibilidad:** `--self-check` (tests sin modelos), `--replay` (recalcula desde `run.json`), hashes SHA-256 de fuentes, `validateReplay`.

**Resultados reales:** GPU 3.2s p50, CPU 46.9s p50; 0% filling ambos idiomas.

### Fixtures y Ground Truth
- `fixtures/voice-tests.json`: 10 casos paralelos EN/ES con expected[11 campos] + 4 casos propios.
- **Convenciones:** `null` = no mencionado; `"Unknown"` = explícitamente no sabe; `cantidad_aprox: true`; `edad_cualitativa` ("old"/"new"/"recent") nunca se convierte a años.
- `fixtures/h1/placa-sintetica.json`: Ground truth visión H1.4.

### Domain puro (`src/domain/`) — **DIRECTAMENTE REUTILIZABLE**
| Archivo | Responsabilidad | Para Oira |
|---------|-----------------|-----------|
| `types.ts` | Tipos: Modality, ConfidenceLevel, StatusLevel, Site, EquipmentGroup, Dispute, Candidate, ObservationRef, MissionQuestion, CertaintyReport | ✅ Copiar y adaptar |
| `certainty.ts` | `explainCertainty()` — Σ(peso × confianza × frescura × penalización) / Σpesos. Bandas: red<34, amber<67, green≥67 | ✅ Fórmula declarativa |
| `merge.ts` | `mergeCandidate()` — Hungarian assignment por modalidad; new/corroboration/conflict; disputes abiertos | ✅ Lógica fusión determinista |
| `derive.ts` | `deriveConfidence/Status/InstallYear/Age`, freshnessFactor (escalón 90/180/365d), FNV-1a IDs | ✅ Derivaciones puras |
| `vocabulary.ts` | Normalización marca/modality/modelo, aliases bilingües | ✅ |
| `missions.ts` | `rankMissingFields()` — Preguntas priorizadas por missing/conflict/low_confidence/stale | ✅ Gap ranking |
| `analytics.ts` | `staleSites`, `findRefreshOpportunities`, `totalQuantity` | ✅ |

### QVAC Inference Engine (`src/adapters/inference/qvac/`) — **ADAPTABLE**
- `qvac-inference-engine.ts`: Orquesta Whisper + Qwen vía SDK nativo. Single-concurrency, timeouts.
- `schema.ts`: `EXTRACTION_SCHEMA` (JSON Schema 11 campos + hospital), `EXTRACTION_PROMPT` (anti-halucinación).
- `parse-output.ts`: `coerceExtraction()` — parsing robusto, normalización, evidencia alineada a transcripción.
- `validation.ts`: Validadores estrictos: evidence ⊆ transcript, unknownFields consistency, age mutual exclusion.
- `model-pack.ts`: Descarga/inspección modelos (Whisper Turbo, Qwen 4B/1.7B, VisionPsy). Checksum por tamaño.
- `qvac-fit.ts`: **Política de memoria adaptativa**: evalúa `sequential` vs `hot` (stt+llm, all) vs `vision_delegated`. BASE_RAM=4GiB. Fit levels: perfect/good/marginal/tooTight (<60%/<80%/<95%/≥95%). Recomienda política según hardware. **Muy relevante para Oira.**

### Persistencia SQLite — **DIRECTAMENTE REUTILIZABLE**
- `node:sqlite` sync, WAL mode, `busy_timeout=5000`, FK ON.
- `BEGIN IMMEDIATE` transacciones (optimistic concurrency per revision).
- **Cadena de custodia inmutable** (`accepted_visits` con `chain_index`, `prev_hash`, `hash`).
- `verifyIntegrity()` recorre cadena completa detectando alteraciones post-aceptación.
- Schema versionado (`user_version` migraciones).

### Tests (69 tests Vitest + Node)
- `tests/contracts/`: 22 archivos (lógica dominio, validación, derivaciones, pipeline, merge, QVAC, pairing, vision).
- `tests/integration/visits.test.ts`: Ciclo completo con SqliteVisitRepository + fakeEngine.
- Fixtures compartidas (`voice-tests.json`), tests de propiedades (Hungarian vs exhaustivo 50 filas).

### Reportes
- `reports/extraction/<timestamp>-<lang><-cpu>/`: `REPORT.md` + `run.json` (metadata con hashes, hardware, modelos, warmup, results[10] con transcript, expected, emitted, trace, output crudo, evaluation, latencyMs, status/confidence derivados).

---

## 2. Comparación Oira ↔ Albatross

| Aspecto | Oira (actual) | Albatross | Convergencia / Divergencia |
|---------|---------------|-----------|----------------------------|
| **Pipeline** | Audio → Whisper → Qwen (cloud QVAC) → Nota clínica | Voice → Whisper → Qwen (local) → Base instalada | Mismo patrón STT→LLM estructurado; Oira cloud, Albatross local |
| **Arquitectura** | Ports/Adapters (DI) + Hexagonal implícito | Hexagonal explícito (Domain/Application/Adapters) | Mismo estilo; Albatross más explícito en boundaries |
| **Esquema de salida** | `CLINICAL_NOTE_JSON_SCHEMA` (7 secciones I4) | `EXTRACTION_SCHEMA` (11 campos + hospital) | Ambos JSON Schema estricto; dominios distintos |
| **Prompt** | `prompt.ts` (I4 presence + buckets) | `schema.ts` (`EXTRACTION_PROMPT` anti-hallucinación) | Albatross más estricto contra invención |
| **Validación** | `clinicalNoteSchema.safeParse` + `verifySource` | `parse-output.ts` + `validation.ts` (evidence ⊆ transcript, unknownFields consistency) | Albatross valida cita literal contra transcripción |
| **Post-procesamiento** | `normalizeStructuringOutput` + `asSection` (presencia honesta) | `coerceExtraction()` + `mergeCandidate()` (Hungarian + disputes) | Albatross tiene fusión determinista multi-visita; Oira single-pass |
| **Dominio puro** | No separado (lógica en adapters) | `src/domain/` (types, certainty, merge, derive, vocabulary, missions, analytics) | **Gran gap**: Albatross tiene núcleo determinista reutilizable |
| **Certeza / Confianza** | No existe | `certainty.ts` (fórmula declarativa con pesos/frescura/disputas) | Oira podría adoptar para nota-verifier |
| **Merge / Fusión** | No existe (single encounter) | Hungarian assignment por modalidad, new/corroboration/conflict | Oira no necesita multi-visita ahora |
| **Persistencia** | En desarrollo (notes.service.ts) | SQLite WAL + optimistic concurrency + audit chain inmutable | Albatross más maduro; patrón aplicable a Oira |
| **Política memoria** | No existe (cloud QVAC) | `qvac-fit.ts` (sequential/hot/vision_delegated según VRAM/RAM) | Relevante si Oira va local |
| **Inferencia** | QVAC SDK cloud (`api.qvac.no`) | QVAC SDK local + `model-pack.ts` (Whisper Turbo, Qwen 4B/1.7B, VisionPsy) | Diferente despliegue; misma SDK |
| **Benchmark harness** | `eval/runner.mjs` + `scorer` + `report` (Capa A solo) | `scripts/measure.mjs` + `measurement-core.mjs` (completo) | Albatross más completo (llaves, filling, replay, hardware) |
| **Dataset** | 13 casos texto congelados (sin audio) | 10 casos gold EN/ES + 4 propios (con audio implícito) | Albatross tiene casos paralelos bilingües |
| **Métricas** | Presence I4 (accuracy, macro-F1, matriz 3×3), invención léxica, mustInclude, latencia | Grupo (P/R/F1/exactos), campo (11 campos accuracy/penalizada/filling), latencia p50/p95, truncamientos | Albatross mide filling real vs null/Unknown |
| **Reproducibilidad** | `--replay`, hashes 4 archivos, gitCommit | `--replay`, `--self-check`, hashes fuentes, hardware, modelos, seeds | Albatross más exhaustivo |
| **Reportes** | 14 secciones MD + JSON | MD + JSON (run.json completo con raw SDK output, trace, timings) | Mismo formato; Albatross incluye más metadata |
| **Tests** | Vitest (unit + schema) + self-check scorer | 69 tests Vitest/Node (contracts, integration, measurement-core) | Albatross más coverage; Oira menos tests de integración |

**Conclusión:** Albatross es **más maduro en infraestructura determinista** (domain, merge, certainty, persistence, memory policy, measurement). Oira tiene **pipeline STT→LLM funcional** y **presencia I4 honesta**. La arquitectura hexagonal de Albatross valida la dirección de Oira; los componentes de dominio son directamente transferibles.

---

## 3. Arquitectura actual del harness `eval/` (auditoría completada)

### Inventario de archivos

| Archivo | Qué hace |
| --- | --- |
| `eval/runner.mjs` | CLI + orquestación. Lee `eval/fixtures/cases.json`, crea adapter (qvac/heuristic), warmup, ejecuta `structure(transcript)` por caso, cronometra, evalúa con scorer, escribe `reports/<runId>/`. Flags: `--skip-stt`, `--adapter`, `--cases`, `--replay`, `--output-dir`, `--self-check`. Registra `metadata` con gitCommit, datasetHash, sourceHashes (4 archivos), CPU, SDK. |
| `eval/scorer/index.mjs` | Scorer puro (sin I/O). Implementa: presencia I4 (accuracy, precision/recall/F1 por clase, **macro-F1**, matriz 3×3), invención léxica (`must_not_contain` normalizado sin acentos), cobertura `mustInclude`, `statedWithoutSource`, validación de IDs de fuente, raw-JSON valid, latencia (p50/p95/p99/mean/min/max), helpers `wordErrorRate`/`charErrorRate` (edit distance) y `sttNotMeasured()`. |
| `eval/report.mjs` | Genera los 5 artefactos: `REPORT.md` (14 secciones), `metrics.json`, `cases.json`, `errors.json`. Aplica etiquetas `medido/observado/inferido/no_probado`. |
| `eval/fixtures/cases.json` | Manifiesto de 13 casos congelados (`frozen: true`), `schema: oira-eval-fixtures-v1`. |
| `eval/fixtures/_write.mjs` | Generador de fixtures (gold desde guion). **EN DESINCRONIZACIÓN con fixtures en disco** — regenerarlo altera `datasetHash` y rompe comparabilidad. |
| `eval/fixtures.test.mjs` · `eval/scorer.test.mjs` | Self-check con `node:test`. |
| `eval/qvac-local.config.mjs` | Cache de pesos fuera de OneDrive (`%LOCALAPPDATA%\Oira\qvac-models`). |
| `eval/register-ts.mjs` · `eval/ts-resolve-hook.mjs` | Resolución de imports TS. |
| `eval/*.log` | Logs (gitignored). |

### 13 fixtures actuales

`01-simple`, `02-negation`, `03-medications`, `04-dosage`, `05-correction`, `06-ambiguous-timeline`, `07-no-diagnosis`, `08-multiple-symptoms`, `09-noisy-text`, `10-longer`, `11-missing-plan`, `12-contradiction`, `13-injection`.

Cada caso tiene: `script.txt` (guion), `transcript.json` (segmentos `{id, speaker, startMs, text}`), `gold.json` con `must_not_contain`, `sections[7]` con `{presence, text, mustInclude[], mustNotInclude[], sourceQuotes[]}`.

**UNKNOWN solo en `12-contradiction`** (clinical_narrative y reported_findings).

### Métricas implementadas (Nivel 2 — completo)

| Métrica | Estado | Valor baseline `20-15-09` |
| --- | --- | --- |
| Presence accuracy | ✅ medido | 89.0% (81/91) |
| Precision/Recall/F1 por clase | ✅ medido | STATED .926/.781/.847, NOT_STATED .875/.982/.926, UNKNOWN .000/.000/.000 |
| Macro-F1 | ✅ medido | 0.591 |
| Matriz de confusión 3×3 | ✅ medido | — |
| Inversión léxica (`must_not_contain`) | ✅ medido | 0.0% (0/13) |
| Cobertura `mustInclude` | ✅ medido | 76.0% (38/50) |
| `statedWithoutSource` | ✅ medido | 0 |
| Raw JSON valid rate | ✅ medido | 1.0 |
| Product emitted rate | ✅ medido | 100% |
| Latencia p50/p95/p99 | ✅ medido | 14436/17581/17724 ms |
| WER/CER | ⚠️ helpers escritos, nunca invocados | siempre `no_medido` |
| E2E audio→nota | ❌ no existe | — |

---

## 4. GAP Analysis vs. requisitos del brief (secciones 6–16)

### YA IMPLEMENTADO (medido)
- Clasificación multiclase completa (accuracy, precision, recall, F1, macro-F1, matriz 3×3) — sección 7.
- Latencia de estructuración con p50/p95/p99/mean/min/max — sección 9.
- Tabla de failure cases, error analysis conteos, limitations, conclusions — secciones 10–14.
- Componentes end-to-end texto→nota (product emitted, raw JSON valid, invención, mustInclude, statedWithoutSource) — sección 8 (parcial).
- Reproducibilidad básica: `--replay`, hashes de código, datasetHash — sección 12.

### PARCIALMENTE IMPLEMENTADO
- **3 niveles:** solo nivel 2 (estructuración). Niveles 1 y 3 ausentes.
- **STT WER/CER:** helpers escritos y testeado, sin datos WAV, pipeline, siempre `no_medido`.
- **End-to-end:** existe bloque "Capa A E2E" pero no pipeline audio→nota, ni latencia E2E total.
- **Error analysis:** solo conteos; sin desglose por modo de fallo (negación, dosis, sujeto, temporalidad), sin denominadores por categoría.
- **Reproducibilidad:** `--replay` y hashes funcionan, pero no hay versionado de prompt/schema ni parámetros de generación, ni dispositivo efectivo verificado en runtime.

### FALTA POR COMPLETO
1. **Corpus de audio WAV** (`eval/audio/` no existe) + STT real + WER/CER sobre él; negación médica y términos/números en STT.
2. **Nivel 1 (STT) y Nivel 3 (E2E)**: pipeline completo audio→nota con latencia por fase.
3. **`_write.mjs` desincronizado con fixtures congelados** — no regenerar (rompe datasetHash).
4. **Métricas de fidelidad de contenido:** `sourceQuotes` no puntuados, `mustNotInclude` ignorados, sin extraction fidelity/field precision-recall.
5. **Métricas del revisor:** todo el bloque de nota-verifier pendiente (`docs/NOTE_VERIFIER_P3.md`).
6. **Tasa de reintentos y JSON validity al primer intento.**
7. **Latencia por fase** (STT, carga de modelo, handoff), frío/caliente, tokens/s, RTF.
8. **Prompt/schema versioning** en metadata (hoy `models.structuring` es constante no verificada en runtime).
9. **`unsupported clinical fact rate`** completo (4 componentes del guía §15.1).
10. **Caso 13:** `must_not_contain` no incluye el diagnóstico inyectado ("neumonía").
11. **Estabilidad multi-máquina:** hoy solo 1 corrida; sin repeatability study.
12. **Comparación de configuraciones:** tabla §16 del guía (prompt actual vs. prompt endurecido vs. +heurísticas vs. +revisor).

---

## 5. DISEÑO DEL BENCHMARK PROPUESTO

### 5.1 Tres niveles de medición

```
NIVEL 1 — SPEECH-TO-TEXT
  Audio → Transcripción de referencia
  Métricas: WER, CER, tasa de transcripción exitosa, tasa vacía, errores críticos

NIVEL 2 — CLASIFICACIÓN (YA IMPLEMENTADO)
  Transcripción gold → Qwen → Nota estructurada
  Métricas: presencia I4 accuracy/precision/recall/F1/macro-F1/matriz 3×3,
            invención léxica, mustInclude coverage, statedWithoutSource,
            raw JSON valid, latencia estructuración

NIVEL 3 — END-TO-END
  Audio → Resultado final de Oira
  Métricas: combinación de nivel 1 + nivel 2, latencia E2E total,
            clasificación final correcta, tasa de error end-to-end
```

### 5.2 Dataset — arquitectura propuesta

```text
eval/
├── fixtures/                          # Conjunto actual (congelado, v1)
│   ├── cases.json                     # Manifiesto (schema: oira-eval-fixtures-v1)
│   ├── 01-simple/
│   │   ├── script.txt                 # Guion de entrada
│   │   ├── transcript.json            # Segmentos {id, speaker, startMs, text}
│   │   └── gold.json                  # Ground truth I4 + must_not_contain + mustInclude + sourceQuotes
│   └── ...
├── audio/                             # NUEVO — corpus WAV de referencia
│   ├── 01-simple.wav
│   ├── 01-simple.reference.json       # Transcripción de referencia anotada
│   └── ...
├── datasets/
│   ├── dev/                           # Development
│   ├── validation/                    # Validation (para ajustar thresholds)
│   └── test/                          # Test congelado (13+ casos)
└── cases.json                         # Manifiesto unificado (niveles + metadatos)
```

Cada caso debe tener como mínimo:

```json
{
  "case_id": "string",
  "audio": "path/to/audio.wav",
  "reference_transcript": { "segments": [{ "id", "speaker", "startMs", "text", "endMs" }] },
  "expected_classification": { "sections": { "<sectionId>": { "presence", "text", "mustInclude", "mustNotInclude", "sourceQuotes" } } },
  "metadata": { "category", "difficulty", "duration_ms", "speaker_count" },
  "source": "origen del caso (guion/sintético/paciente_real/anonimizado)",
  "version": "schema del dataset"
}
```

Separación dev/validation/test: **sí, recomendada** para evitar overfitting al scorer. El conjunto actual de 13 casos es pequeño — congelar el test, reservar validación para threshold-tuning.

### 5.3 Categorías de casos de prueba (propuestas — sin asumir que todas son necesarias)

Basado en el corpus actual + brevedad del brief:

| Categoría | Caso actual | Valor | Justificación |
| --- | --- | --- | --- |
| Simple | 01-simple | Alta | Baseline mínimo |
| Negación | 02-negation | Alta | Problema medido (6 omisiones visit_context) |
| Medicamentos/dosis | 03, 04 | Alta | Fidelidad numérica y de unidades |
| Corrección | 05-correction | Media | Manejo de auto-corrección en transcripción |
| Timeline ambiguo | 06 | Media | Temporalidad |
| Sin diagnóstico | 07 | Media | Caso negativo — evitar sobre-diagnóstico |
| Múltiples síntomas | 08 | Media | Dispersión atencional |
| Texto ruidoso | 09-noisy-text | Media | Robustez |
| Texto largo | 10-longer | Baja | Latencia + contexto largo |
| Plan faltante | 11 | Media | NOT_STATED honesto |
| Contradicción | 12 | Alta | UNKNOWN honesto |
| Inyección | 13 | Alta | Resistencia a prompt injection |
| Audio ruidoso | NUEVO | Alta | Robustez STT |
| Habla rápida/lenta | NUEVO | Media | Variedad de velocidad |
| Múltiples speakers | NUEVO | Media | Diarización |
| Caso limítrofe | NUEVO | Media | Negación con duda explícita |

### 5.4 Ground truth — metodología propuesta

```
INPUT (guion/sintético/paciente)
  │
  ▼
GROUND TRUTH (escrito por evaluador humano, no por el modelo)
  │  - transcripción de referencia anotada
  │  - clasificación I4 con presencia honesta
  │  - mustInclude / mustNotInclude / sourceQuotes
  │
  ▼
MODEL OUTPUT (Qwen)
  │
  ▼
EVALUATOR (scorer puro, sin I/O)
```

- **Transcripción de referencia:** escrita desde el guion (como hoy) o transcripción humana anotada.
- **Clasificación esperada:** anotación humana del presence por sección; para casos ambiguos, múltiples respuestas válidas documentadas con justificación.
- **Casos ambiguos:** documentar qué respuestas son válidas y por qué; evitar única respuesta donde no la hay.
- **Regla:** el modelo nunca determina la respuesta correcta.

### 5.5 Métricas STT (propuesta — basada en análisis del brief)

- **Principal:** WER (Word Error Rate) sobre la transcripción de referencia.
- **Secundarias:** CER (Character Error Rate), tasa de transcripción exitosa (1 - tasa vacía), tasa de errores críticos (inversión de significado, omisión de negación, inversión de sujeto).
- **Interpretación:** WER alto + negación preservada ≠ fracaso clínico; WER bajo + negación invertida = error crítico.
- **Métricas engañosas:** WER sobre texto limpio no refleja fallo clínico; hay que separar "error lingüístico" de "error clínico".

### 5.6 Métricas clasificación (propuesta — mantener lo existente + ampliar)

- **Oficiales:** accuracy, macro-F1 (tratamiento desigual de clases), matriz de confusión 3×3.
- **Ampliación:** field-level precision/recall (extracción fidelity), unsupported clinical fact rate, negation retention rate.
- **Desbalance:** NOT_STATED domina (57/91); accuracy cruda es engañosa — macro-F1 es la métrica principal de comparación.

### 5.7 Métricas E2E (propuesta)

- Clasificación correcta end-to-end (audio→nota).
- Latencia E2E total (audio→nota) con breakdown por fase.
- Tasa de fallo E2E (cualquier fase).
- Comparación entre niveles (¿dónde ocurre el error).

---

## 6. DISEÑO DEL SISTEMA DE EVALUACIÓN

### 6.1 Evaluador (arquitectura propuesta)

Mantener la arquitectura actual de **scorer puro sin I/O** (ya probada y reproducible). Ampliar:

```
eval/
├── runner.mjs                         # Orquestador (ampliar: 3 niveles)
├── scorer/
│   ├── index.mjs                      # Scorer principal (ampliar: STT + E2E)
│   ├── presence-scorer.mjs            # Existente, refactorizar como módulo
│   ├── stt-scorer.mjs                 # NUEVO — WER/CER/críticos
│   ├── e2e-scorer.mjs                 # NUEVO — composición niveles
│   ├── extraction-fidelity.mjs        # NUEVO — field precision/recall
│   └── index.test.mjs                 # Ampliar tests
├── report.mjs                         # Generador (mantener 14 secciones + ampliar)
├── fixtures/
│   ├── cases.json                     # Manifiesto (ampliar con audio/audio-reference)
│   ├── 01-simple/
│   │   ├── script.txt
│   │   ├── transcript.json
│   │   ├── gold.json
│   │   ├── audio.wav                  # NUEVO
│   │   └── audio.reference.json       # NUEVO
│   └── ...
├── audio/                             # NUEVO — corpus WAV
├── datasets/                          # NUEVO — dev/validation/test
├── evaluator/                         # NUEVO — si se requiere revisor/verifier
│   └── ...
├── scripts/                           # NUEVO — generación de dataset, anotación
└── README.md
```

### 6.2 Formato de reporte (mantener 14 secciones actuales + ampliar)

Las 14 secciones actuales del `REPORT.md` son correctas. La ampliación propuesta:
- Sección 6 (STT): rellenar con WER/CER reales cuando exista corpus de audio.
- Sección 8 (E2E): añadir breakdown por nivel + comparación entre niveles.
- Sección 10 (Error Analysis): añadir desglose por modo de fallo.
- Sección 12 (Reproducibilidad): añadir prompt/schema version, generation_params, device.
- Sección 16 (Comparación de configuraciones): tabla §16 del guía — añadir cuando haya ≥2 configuraciones medidas.

### 6.3 Comandos (propuesta)

```bash
# Actuales (mantener)
pnpm eval                              # Capa A --skip-stt
pnpm eval -- --adapter qvac
pnpm eval -- --adapter heuristic
pnpm eval -- --skip-stt --cases "02,12"
pnpm eval -- --replay reports/<id>/run.json
pnpm eval:self-check                   # Tests del scorer/fixtures
pnpm eval:fixtures                     # Generar fixtures (usar con cuidado: altera datasetHash)

# Propuestos
pnpm eval -- --with-stt               # Nivel 1 + 2 (con STT real)
pnpm eval -- --e2e                    # Nivel 3 (audio→nota)
pnpm eval -- --level 1|2|3            # Nivel específico
pnpm eval -- --repeats 5              # Repeatability study
pnpm eval -- --config <config-id>     # Comparar configuraciones
```

---

## 7. RIESGOS

| Riesgo | Probabilidad | Impacto | Mitigación |
| --- | --- | --- | --- |
| Audio WAV requiere consentimiento/anonimización de pacientes reales | Alta | Alto | Usar guiones sintéticos + audio sintético en desarrollo; real solo con consentimiento |
| `_write.mjs` desincronizado con fixtures congelados | Alta | Alto | No regenerar; arreglar el generador antes de tocar fixtures |
| Latencia Qwen cloud variable (p50 14.4s) | Media | Medio | Medir con `--repeats`, reportar distribución |
| Escala pequeña del dataset (13 casos) | Alta | Medio | Congelar test; expandir gradualmente; no overfitting |
| Nota-verifier pendiente (docs/NOTE_VERIFIER_P3.md) | Media | Medio | Dejar para etapa 2, prioridad baja |
| Coste de ejecución con QVAC cloud (13 casos × 14s) | Baja | Bajo | `--skip-stt` mantiene coste bajo; calcular coste por corrida |
| Complejidad de implementar STT local (Whisper) | Media | Alto | Mantener `--skip-stt` como opción; STT local solo en `--with-stt` |

---

## 8. ESTIMACIÓN DE ARCHIVOS A CREAR/MODIFICAR (Etapa 2)

| Archivo | Acción | Motivo | Dependencia | Riesgo |
| --- | --- | --- | --- | --- |
| `eval/audio/` | Crear corpus WAV | Nivel 1 (STT) | — | Alto (consentimiento) |
| `eval/audio/<case>/audio.reference.json` | Crear | Ground truth de transcripción | Corpus WAV | Medio |
| `eval/fixtures/<case>/audio.wav` | Crear | Audio por caso | Corpus WAV | Medio |
| `eval/fixtures/cases.json` | Modificar (con cuidado) | Añadir campos audio/reference | Schema estable | Alto (altera datasetHash) |
| `eval/scorer/stt-scorer.mjs` | Crear | Métricas WER/CER/críticos | Audio corpus | Medio |
| `eval/scorer/extraction-fidelity.mjs` | Crear | Field precision/recall | Gold con sourceQuotes | Medio |
| `eval/scorer/e2e-scorer.mjs` | Crear | Composición niveles | scorers nivel 1+2 | Medio |
| `eval/scorer/index.mjs` | Modificar | Orquestar 3 niveles | Todos los anteriores | Alto |
| `eval/runner.mjs` | Modificar | Flags `--with-stt`, `--e2e`, `--level`, `--repeats` | Scorers ampliados | Alto |
| `eval/report.mjs` | Modificar | Secciones 6/8/10/12 ampliadas | Runner ampliado | Bajo |
| `eval/evaluator/` | Crear (opcional) | Revisor/verifier | Nota-verifier P3 | Medio |
| `eval/scripts/` | Crear | Generación/anotación de dataset | — | Bajo |

---

## 9. PLAN DE IMPLEMENTACIÓN PROPUESTO (pendiente de aprobación)

### Fase 0 — Preparación (sin implementar)
1. Completar auditoría Albatross con resultados del agente.
2. Aprobar este diseño con el usuario.
3. Definir corpus de audio: ¿sintético (guardrail) o real (consentimiento)?
4. Arreglar `_write.mjs` para que esté sincronizado con fixtures congelados.

### Fase 1 — Nivel 1 (STT)
1. Crear corpus de audio WAV (`eval/audio/`).
2. Implementar `eval/scorer/stt-scorer.mjs`.
3. Implementar WER/CER en runner.
4. Medir y documentar con labels de evidencia.

### Fase 2 — Ampliación de métricas
1. Implementar `eval/scorer/extraction-fidelity.mjs`.
2. Puntuar `sourceQuotes` y `mustNotInclude` ignorados.
3. Implementar `unsupported clinical fact rate` completo.
4. Implementar tasa de reintentos y JSON validity al primer intento.

### Fase 3 — Nivel 3 (E2E)
1. Wire de audio→nota en runner (`--with-stt`, `--e2e`).
2. Latencia por fase y E2E total.
3. Breakdown frío/caliente.

### Fase 4 — Reproducibilidad y comparación
1. Prompt/schema versioning en metadata.
2. Repeatability study (`--repeats 5`).
3. Tabla de comparación de configuraciones.

### Fase 5 (opcional) — Nota-verifier
1. Implementar bloque de revisor.
2. Métricas de revisión.

---

## 10. COMPONENTES REUTILIZABLES DE ALBATROSS (clasificación completada)

| Componente | Clasificación | Qué necesita Oira |
|------------|---------------|-------------------|
| **Domain types** (`types.ts`) | ✅ **DIRECTAMENTE REUTILIZABLE** | Copiar y adaptar tipos a dominio Oira |
| **Certainty engine** (`certainty.ts`) | ✅ **DIRECTAMENTE REUTILIZABLE** | Fórmula declarativa, pesos configurables |
| **Merge logic** (`merge.ts`) | ✅ **DIRECTAMENTE REUTILIZABLE** | Hungarian + dispute handling genérico |
| **Derive logic** (`derive.ts`) | ✅ **DIRECTAMENTE REUTILIZABLE** | Confidence/Status/Freshness/IDs deterministas |
| **Vocabulary/normalization** | ✅ **DIRECTAMENTE REUTILIZABLE** | Normalización cadenas, aliases |
| **Missions/ranking** (`missions.ts`) | ✅ **DIRECTAMENTE REUTILIZABLE** | Gap ranking por prioridad |
| **Analytics** (`analytics.ts`) | ✅ **DIRECTAMENTE REUTILIZABLE** | Stale detection, refresh opportunities |
| **Profiles** (`profiles.ts`) | 🔄 **ADAPTABLE** | Cambiar modalidades/pesos a dominio Oira |
| **Seed** (`seed.ts`) | 🔄 **ADAPTABLE** | Solo para demo/datos iniciales |
| **QVAC Inference Engine** | 🔄 **ADAPTABLE** | Reemplazar SDK por proveedor Oira (Ollama, etc.) |
| **Schema/Prompt extraction** | 🔄 **ADAPTABLE** | Redefinir schema + prompt a dominio Oira |
| **Parse-output/validation** | 🔄 **ADAPTABLE** | Adaptar coerción a schema Oira |
| **SQLite Repository** | ✅ **DIRECTAMENTE REUTILIZABLE** | Cambiar tablas/entidades, patrón idéntico |
| **VisitService** | 🔄 **ADAPTABLE** | Reescribir casos de uso a dominio Oira |
| **CaptureService** | 🔄 **ADAPTABLE** | Solo si Oira tiene captura móvil/foto |
| **CIB projection** | 🔄 **ADAPTABLE** | Reescribir DTOs a UI Oira |
| **Measurement harness** | ✅ **DIRECTAMENTE REUTILIZABLE** | Cambiar fixtures + campos evaluados |
| **QVAC-fit (memory policy)** | ✅ **DIRECTAMENTE REUTILIZABLE** | Modelo de decisión memoria GPU/RAM |

**Riesgos y dependencias:**
- **@qvac/sdk 0.18.2:** Dependencia nativa (binarios Node-API). Abstractar detrás de puerto `InferenceEngine`; implementar adapter para Ollama/llama.cpp.
- **Node 22.17+:** Requiere `--experimental-strip-types/transform-types` — Oira ya usa Node moderno; OK.
- **Electron 44:** Solo para desktop; domain/application son agnósticos a runtime.
- **Pesos hardcodeados:** `REQUIREMENT_WEIGHT` y `LLM_CATALOG` en domain/adapters — externalizar a config JSON/TOML.
- **Modalidades médicas fijas:** 6 tipos en `MODALITIES` — reemplazar por catálogo Oira.
- **Tests acoplados a fixture:** `voice-tests.json` referenciado en tests — crear fixtures propios Oira.
- **Licencia propietaria:** Solo evaluación hackathon permitida — **NO copiar código literal**; reimplementar patrones.

---

## 11. DECISIONES PENDIENTES DE CONFIRMACIÓN DEL USUARIO

Estas decisiones son ambiguas o de alcance — **no se adivinan, se documentan como pendientes**:

1. **Corpus de audio:** ¿Sintético (guardrail, rápido) o real (consentimiento, más realista)?
2. **Scope de STT:** ¿Whisper local (más complejo) o STT cloud (más simple)?
3. **Nota-verifier:** ¿Incluir en esta propuesta o dejar para etapa posterior?
4. **Escala del dataset:** ¿Mantener 13 casos y expandir gradualmente, o preparar corpus grande desde el inicio?
5. **Aprobación de Albatross:** ¿Integrar metodología Albatross como referencia principal o secundaria?
6. **Prioridad:** ¿Empezar por Nivel 1 (STT) o por ampliar métricas de contenido (Nivel 2)?
7. **Reproducibilidad multi-máquina:** ¿Requerida desde el inicio o posterior?

---

## 12. PRÓXIMOS PASOS

1. ✅ **Auditoría de Albatross completada** e integrada en secciones 1, 2, 3, 10.
2. **Presentar versión completa** al usuario para aprobación (este documento).
3. **Esperar confirmación explícita** antes de iniciar la Etapa 2 (implementación).

---

> **Regla de seguridad del proceso:** Si alguna decisión aquí presentada es ambigua, NO ADIVINAR. Detenerse y preguntar. Si una modificación puede afectar el producto existente, NO HACERLO SIN CONFIRMACIÓN. Si faltan datos, DOCUMENTAR QUE FALTAN. Si no se puede medir algo, NO INVENTAR LA MÉTRICA.
