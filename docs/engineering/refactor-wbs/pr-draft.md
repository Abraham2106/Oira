# Borrador de PR — OIRA-REF-01

**Ruta:** `docs/engineering/refactor-wbs/pr-draft.md`  
**Estado:** borrador local. No hay URL de GitHub: no se hizo push ni `gh pr create`.  
**Rama:** `fix/domain-invariants-and-ipc`  
**Base:** `3eba308701d5ea76369a8965494d5704f541ec21` (`main`)

## Título propuesto

fix: invariantes de dominio, procedencia e IPC de emisor confiable

## Motivación

Cinco hallazgos reproducibles permitían afirmar texto sin fuentes, compartir mal una generación, silenciar fallos de transición/limpieza y aceptar IPC de un emisor no autorizado. El médico debe revisar un borrador con procedencia explícita; el agente no debe convertir un error recuperable en éxito silencioso.

## Límites

- No hay modelos nuevos, SQLite, cloud, rediseño visual ni verificación semántica por LLM.
- No se afirma cumplimiento legal, rendimiento, ni “nunca sale del dispositivo”.
- No se afirma seguridad IPC de runtime: el guardia se cubre con pruebas de unidad y el preload CJS del build. No se reejecutó una ventana Electron viva en WBS-6.
- Tests con dobles no ejecutan QVAC real.
- `retryAudioCleanup` está en IPC/preload; no hay control visual dedicado.
- `docs/codebase-map.html` y el cambio de `.gitignore` (`.codex-local/`) quedan fuera de este paquete.

## Cambios

1. **H1 / S1–S2.** Validación estructural de salida: `STATED` extraído exige fuentes; citas inexistentes y objetos desconocidos se rechazan. Procedencia `EXTRACTED` | `CLINICIAN_EDITED`; lectura JSON legacy como `LEGACY_UNVERIFIED` sin reescritura destructiva.
2. **H3 / S3.** Una promesa en curso por `encounterId`, copias defensivas y un solo purge de la ejecución propietaria.
3. **H2 / S6.** `withTrustedIpcSender` rechaza emisores no registrados antes de Zod/servicio; navegación limitada a la URL de la ventana.
4. **H4–H5 / S4–S5.** Resultados discriminados `CLEANUP_PENDING` y `PERSISTED_TRANSITION_PENDING`; el error primario se conserva; retry de audio no repite inferencia.

Detalle y oráculos: [R-13](../../research/R-13-domain-invariants-and-ipc.md). Registro: `refactorr-agent.md` LOG-001…LOG-008.

## Cómo se protege el comportamiento

- El selector mock/QVAC sigue cableado (`select.test.ts`).
- Preload permanece CJS con métodos explícitos y desuscripción; se añadió solo `retryAudioCleanup`.
- Mutar el resultado de un consumidor no altera el de otro (S3).
- Guardar sigue exigiendo confirmación clínica, borrador previo y `verifySource`.
- `saveChains` serializa aceptaciones; un `noteId` vigente por encuentro.
- La tabla de transiciones no se relajó; `PERSISTED_TRANSITION_PENDING` no dispara `ACCEPT`.

## Controles ejecutados (2026-09-14)

- `pnpm test` — 55 archivos, 243 PASS, 0 fallos, 0 skips
- `pnpm typecheck` — types, node y web PASS
- `pnpm lint:desktop` — PASS (`src/renderer` y `src/main`; preload no está en ESLint)
- `pnpm --filter oira-desktop build` — PASS; `out/preload/index.cjs`
- `git diff --check` — PASS (avisos CRLF)

## Rollback

Forward-fix acotado o revert del commit de esta rama. No migrar ni borrar notas/audio/registros legacy para recuperar verde.

## Publicación

Pendiente de autorización explícita para `git push` y `gh pr create`.
