# R-13 — Decisiones de invariantes de dominio, procedencia e IPC

**Estado:** decisión de ingeniería de OIRA-REF-01; no es un spike de laboratorio ni una investigación clínica.  
**Fecha:** 14 de septiembre de 2026.  
**ID:** R-13 (libre al inventariar `docs/research/` el 2026-09-14; no sobrescribe R-1…R-12).  
**Alcance:** contratos implementados para H1–H5 y S6.  
**No afirma:** eliminación de alucinaciones, fidelidad semántica de citas, seguridad IPC en runtime de una ventana Electron viva, ni rendimiento de QVAC real.

## 1. Resumen

El plan `OIRA-REF-01` (base `3eba308701d5ea76369a8965494d5704f541ec21`, rama `fix/domain-invariants-and-ipc`) corrige cinco hallazgos reproducibles. La corrección no exige que todo falle: una generación compartida válida (S3) y un borrador útil con limpieza pendiente (S5) son resultados correctos cuando el contrato los nombra.

| ID | Antes (A01, RED esperado) | Después verificado (A07, 2026-09-14) |
| --- | --- | --- |
| S1 | Texto libre STATED sin fuentes pasaba validación | `runGenerateNote` rechaza con `INVALID_STRUCTURED_OUTPUT`; no hay borrador aceptado en silencio |
| S2 | Cita inexistente se eliminaba y el texto pasaba | `validateStructuringOutput` falla; la cita inválida no se sanea |
| S3 | Segunda generación `INFERENCE_BUSY` y purge del audio ajeno | Una ejecución propietaria por `encounterId`; duplicados comparten resultado con copias defensivas; un solo purge |
| S4 | `advance` fallaba y generate/save devolvían éxito silencioso | El fallo de transición en el camino de éxito se propaga; persistido con transición pendiente es `PERSISTED_TRANSITION_PENDING` |
| S5 | Fallo de purge sustituía el error de inferencia | Error primario conservado; `secondaryFailures` registra `audio_cleanup`; borrador válido puede volver `CLEANUP_PENDING` |
| S6 | Emisor IPC no se validaba | Rechazo `IPC_SENDER_UNAUTHORIZED` antes de listener/Zod/servicio |

Harness: `apps/desktop/src/main/refactor-contracts.test.ts` (9 PASS el 2026-09-14). Suite completa: 55 archivos, 243 PASS, 0 fallos, 0 skips.

## 2. Procedencia (D1)

Contrato discriminado, no un booleano del modelo:

- `EXTRACTED`: lo marca código de Main al aceptar salida estructurada. Un campo `STATED` extraído exige `sourceSegmentIds` no vacíos (`clinical.schema.ts`, `validateStructuringOutput`, `verifySource`).
- `CLINICIAN_EDITED`: lo deriva el servicio al reconciliar una edición explícita; no se atribuye retrospectivamente evidencia a texto mixto.
- `LEGACY_UNVERIFIED`: solo en lectura JSON de registros anteriores a este contrato. Está fuera de `clinicalNoteSchema`. El archivo se conserva; el flujo clínico no re-persiste ese valor sin revisión/conversión completa.

Qwen usa únicamente `completion.text`. `thinkingText` y `rawText` no entran al parser. Campos u objetos desconocidos se rechazan; no se convierten en `NOT_STATED`.

Esto no demuestra que un ID citado respalde el texto. La validación semántica sigue pendiente (`NOTE_VERIFIER_P3.md`).

## 3. Remitente IPC (D2)

`withTrustedIpcSender` envuelve todos los handlers registrados. Exige `webContents` registrado, main frame y URL exacta:

- desarrollo: origen exacto de `ELECTRON_RENDERER_URL`;
- empaquetado: `index.html` resuelto bajo el bundle.

Se rechazan subframes, otro `webContents`, URL distinta y eventos sin emisor. La navegación (`will-navigate`, `will-frame-navigate`, `will-redirect`) se limita al mismo destino; popups internos siguen denegados y las URLs externas usan `shell.openExternal` preexistente.

Evidencia de unidad: `sender-guard.test.ts` y S6. El build produjo `apps/desktop/out/preload/index.cjs`. **No** se reejecutó un smoke de ventana Electron viva en esta verificación; un bundle y dobles de evento no demuestran seguridad IPC en runtime.

## 4. Propiedad de generación (D3)

`createNotesService.generate` registra una promesa por `encounterId` antes del primer `await`. Llamadas duplicadas esperan esa promesa y reciben `structuredClone`. Solo la ejecución propietaria llama a `runGenerateNote` y a `audio.purge`. Encuentros distintos no comparten el mapa. Tras fallo, el registro se libera y un reintento puede comenzar.

## 5. Resultados parciales y limpieza (D4)

Uniones discriminadas, no flags contradictorios:

- `GenerateNoteResult`: `READY` o `CLEANUP_PENDING` (borrador útil, `cleanup.retryable`).
- `SaveNoteResult`: `SAVED` o `PERSISTED_TRANSITION_PENDING` (`noteId` estable, `recovery.retryable`). El renderer no aplica `ACCEPT` si la transición queda pendiente.
- Errores primarios conservan `secondaryFailures` (`encounter_transition`, `audio_cleanup`).
- `retryAudioCleanup(encounterId)` reintenta purge desde el almacén/encuentro confiable; no repite transcripción, estructuración ni persistencia.

No hay affordance visual dedicada de retry; el canal IPC y el preload sí exponen el método explícito.

## 6. Comportamiento protegido

Comprobado por prueba, no solo por diff:

| Pieza | Evidencia 2026-09-14 |
| --- | --- |
| Selector mock/QVAC | `select.test.ts`: mock sin SDK; `qvac` sigue cableado a `createQwenStructuring` |
| Preload CJS | `preload-contract.test.ts`; build `out/preload/index.cjs` con métodos nombrados, `retryAudioCleanup`, desuscripción, sin `invoke(channel)` genérico |
| Copias defensivas | S3 muta el resultado de un consumidor y el otro permanece intacto |
| Guardado clínico | `notes.service.test.ts` rechaza sin `clinicianConfirmed`, sin borrador previo y con `verifySource` |
| Aceptaciones serializadas | `saveChains` serializa; `noteId` estable en reintento `PERSISTED_TRANSITION_PENDING` |
| Tabla de transiciones | `encounterMachine.test.ts` sigue lanzando en `IDLE + ACCEPT`; no se añadieron transiciones para ocultar errores |

## 7. Comandos y límites

Ejecutados el 2026-09-14 desde `C:\Users\solan\Documents\Personal\Hackathon\Oira`:

- `pnpm.cmd test` — 55 archivos, 243 PASS
- `pnpm.cmd --filter oira-desktop exec vitest run src/main/refactor-contracts.test.ts` — 9 PASS
- `pnpm.cmd typecheck` — `@oira/types`, `tsconfig.node.json` y `tsconfig.web.json` PASS
- `pnpm.cmd lint:desktop` — `eslint src/renderer src/main --max-warnings=0` PASS; preload no está en esa cobertura
- `pnpm.cmd --filter oira-desktop build` — PASS; preload CJS 2.76 kB
- `git diff --check` — sin errores de whitespace (avisos CRLF del checkout)

No se descargaron modelos. No se ejecutó QVAC real. No se publicó el PR. Los recuentos 243/55 no se obtuvieron excluyendo pruebas; el subconjunto histórico de 57 en siete archivos ya no es el tamaño de la suite.
