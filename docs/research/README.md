# Research kit — NotaLocal

Prompts listos para un **modelo investigador**. Cada ID de las guías (`I*`, `R-*`, `Q*`) tiene un prompt autónomo: contexto, restricciones, método y decisión exigida.

**Cómo usarlos**

1. Pega primero [`prompts/SYSTEM.md`](prompts/SYSTEM.md) como system / preámbulo.
2. Pega **un solo** prompt de investigación por corrida (no mezclar I1 con Q3).
3. El entregable debe quedar en `docs/research/<ID>-….md` con fuentes y una decisión explícita.
4. Actualiza las etiquetas de la guía origen (`REQUIERE INVESTIGACIÓN` / `REQUIRES RESEARCH` → `CONFIRMED` o `ASSUMPTION`).

Hay dos longitudes:

- **Corta** (recomendado para un modelo investigador): `prompts/frontend.md`, `backend.md`, `ai-qvac.md`
- **Extendida** (protocolos de lab paso a paso): [`backend-extended.md`](prompts/backend-extended.md), [`ai-qvac-extended.md`](prompts/ai-qvac-extended.md)

**Qué no es investigación de escritorio.** Varios ítems de Justin e IA son spikes de laboratorio (QVAC, RAM, `tcpdump`). Esos prompts piden: (a) lo que sí se puede resolver con docs oficiales, y (b) un protocolo de lab que un humano ejecute. **No inventar números, firmas de API ni resultados de corridas.**

## Índice

### Frontend / UX — Antonio

Fuente: [FRONTEND_UIUX_GUIDE.md](../FRONTEND_UIUX_GUIDE.md) §6 y §14.

| ID | Prioridad | Tipo | Prompt |
| --- | --- | --- | --- |
| I1 / R6 / C | P0 | escritorio | [I1 — afirmaciones legales sobre datos de salud](prompts/frontend.md#prompt-i1) |
| I2 / R7 / G | P0 | escritorio | [I2 — informar al paciente de la grabación](prompts/frontend.md#prompt-i2) |
| I3 / R1 / B | P0 | escritorio | [I3 — transcript vs nota al terminar](prompts/frontend.md#prompt-i3) |
| I4 / R4 | P0 | escritorio | [I4 — estructura de nota ambulatoria](prompts/frontend.md#prompt-i4) |
| I5 / R2 | P0 | escritorio | [I5 — identificador mínimo del encuentro](prompts/frontend.md#prompt-i5) |
| Theme A | P0 | escritorio | [A — scribes ambientales: qué copiar](prompts/frontend.md#prompt-theme-a) |
| I6 / R5 / D | P1 | escritorio | [I6 — copy de inferencia local](prompts/frontend.md#prompt-i6) |
| I7 / R10 | P1 | escritorio | [I7 — automation bias](prompts/frontend.md#prompt-i7) |
| I8 / E | P1 | escritorio | [I8 — matriz de retención](prompts/frontend.md#prompt-i8) |
| I9 / R8 | P1 | escritorio | [I9 — formatos de export](prompts/frontend.md#prompt-i9) |
| I10 / I14 | P1 | protocolo | [I10 — tiempos y requisitos publicables](prompts/frontend.md#prompt-i10) |
| Extra §9 | P1 | escritorio | [Extra — explicar prompt injection](prompts/frontend.md#prompt-extra) |
| I11 / R3 | P2 | escritorio | [I11 — transcripción en vivo](prompts/frontend.md#prompt-i11) |
| I12 / F | P2 | escritorio | [I12 — teleconsulta](prompts/frontend.md#prompt-i12) |
| I13 | P2 | escritorio | [I13 — idiomas e i18n](prompts/frontend.md#prompt-i13) |
| I15 | P2 | escritorio | [I15 — nivel de accesibilidad](prompts/frontend.md#prompt-i15) |

### Backend — Justin

Fuente: [BACKEND_DESKTOP_ARCHITECTURE_GUIDE.md](../BACKEND_DESKTOP_ARCHITECTURE_GUIDE.md) §21.

| ID | Prioridad | Tipo | Prompt |
| --- | --- | --- | --- |
| R-1 | P0 | lab | [Tutorial oficial QVAC Electron + `package`](prompts/backend.md#prompt-r-1) |
| R-2 | P0 | lab | [Formato de audio y captura](prompts/backend.md#prompt-r-2) |
| R-3 | P0 | lab | [Binding SQLite vs addons QVAC](prompts/backend.md#prompt-r-3) |
| R-4 | P0 | lab | [Presupuesto de memoria](prompts/backend.md#prompt-r-4) |
| R-5 | P1 | escritorio + lab | [Cifrado en reposo y `safeStorage`](prompts/backend.md#prompt-r-5) |
| R-6 | P1 | escritorio + lab | [Auth del OS y permisos de directorio](prompts/backend.md#prompt-r-6) |
| R-7 | P1 | lab | [Red, offline y claims](prompts/backend.md#prompt-r-7) |
| R-8 | P1 | escritorio + lab | [Semántica `append` / stream](prompts/backend.md#prompt-r-8) |
| R-9 | P2 | escritorio + lab | [Empaquetado y firma](prompts/backend.md#prompt-r-9) |
| R-10 | P2 | escritorio + lab | [Export PDF](prompts/backend.md#prompt-r-10) |

### IA / QVAC

Fuente: [AI_QVAC_TRANSCRIPTION_GUIDE.md](../AI_QVAC_TRANSCRIPTION_GUIDE.md) §24.

| ID | Prioridad | Tipo | Prompt |
| --- | --- | --- | --- |
| D1 | P0 | escritorio | [Allow-list de API QVAC](prompts/ai-qvac.md#prompt-d1) |
| D2 | P0 | escritorio | [Whisper Spanish vs tiny](prompts/ai-qvac.md#prompt-d2) |
| Q1 | P0 | lab | [STT `language: 'es'`](prompts/ai-qvac.md#prompt-q1) |
| Q2 | P0 | lab | [Default STT constant](prompts/ai-qvac.md#prompt-q2) |
| Q3 | P0 | lab | [`json_schema` + Qwen 600M](prompts/ai-qvac.md#prompt-q3) |
| D3 | P0 | escritorio | [Structured output: qué aplica](prompts/ai-qvac.md#prompt-d3) |
| Q4 | P0 | lab | [RSS pico de los LLM](prompts/ai-qvac.md#prompt-q4) |
| Q5 | P0 | lab | [Latencia de `loadModel()`](prompts/ai-qvac.md#prompt-q5) |
| Q6 | P0 | lab | [Contexto vs caso 10](prompts/ai-qvac.md#prompt-q6) |
| Q7 | P1 | lab | [`initial_prompt` médico](prompts/ai-qvac.md#prompt-q7) |
| Q8 | P1 | lab | [Qwen3 `/no_think`](prompts/ai-qvac.md#prompt-q8) |
| Q9 | P1 | lab | [Formatos de audio 0.17.1](prompts/ai-qvac.md#prompt-q9) |
| Q10 | P1 | lab | [Determinismo `temp:0` + seed](prompts/ai-qvac.md#prompt-q10) |
| D4 | P1 | escritorio | [Confiabilidad de diarización](prompts/ai-qvac.md#prompt-d4) |
| Q11 | P1 | lab | [Sortformer en español](prompts/ai-qvac.md#prompt-q11) |
| Q12 | P1 | lab | [`realTimeFactor`](prompts/ai-qvac.md#prompt-q12) |
| Q13 | P1 | lab | [`append` en español](prompts/ai-qvac.md#prompt-q13) |
| Q14 | P2 | lab | [Red durante inferencia cacheada](prompts/ai-qvac.md#prompt-q14) |
| Q15 | P2 | lab | [Logs con texto clínico](prompts/ai-qvac.md#prompt-q15) |
| Q16 | P2 | lab | [`deleteCache` y KV](prompts/ai-qvac.md#prompt-q16) |
| Q17 | P2 | escritorio | [Sortformer estructurado vs texto](prompts/ai-qvac.md#prompt-q17) |
| Q18 | P2 | lab | [Qwen 1.7B como punto medio](prompts/ai-qvac.md#prompt-q18) |
| Q19 | P2 | lab | [`kvCache` en retries](prompts/ai-qvac.md#prompt-q19) |

## Orden sugerido para un investigador de escritorio (sin hardware QVAC)

1. **I1** (bloquea Privacy/Security) → **I2** (consentimiento) → **Theme A** → **I3, I4, I5**
2. **D1, D2, D3, D17, D4** (docs oficiales QVAC; no inventar APIs)
3. **I6, I7, I8, I9, Extra, I15, I13, I11, I12**
4. **R-5, R-6, R-9, R-10** (docs Electron / cifrado / firma; sin inventar resultados de lab)

Los P0 de lab (**R-1…R-4**, **Q1…Q6**) van a un investigador *con* máquina y SDK, no a un modelo solo de papers.
