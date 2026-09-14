# Prompt 01 — Gestión y preparación

task_id: WBS-1
owner_role: A01 / planner
status_source: ../../../refactorr-agent.md
dependencies: ninguna
unblocks: WBS-2
RESUME_FROM: registro canónico / WBS-1 / 1.1
required_approvals: G1 preparación, reviewer del plan de pruebas
max_review_loops: 2

## Mandato

Lee [el prompt maestro](../../../refactorr-agent.md). Eres A01. Prepara una línea base
reproducible de los cinco escenarios y contratos de corrección. No implementes fixes
durante esta etapa ni marques como cerrado un fallo por haberlo reproducido.

## WBS y entregables

- [ ] **1.1** Comprobar HEAD, estado sucio, rama y existencia del commit base
  `3eba308701d5ea76369a8965494d5704f541ec21`. Crear `fix/domain-invariants-and-ipc`
  cuando se ejecute el plan. Si existe, inspeccionarla; no resetearla. Si HEAD diverge,
  documentar el diff y conservar cambios posteriores. No forzar checkout de la base.
- [ ] **1.2** Reproducir S1 texto libre, S2 cita missing, S3 generación simultánea,
  S4 fallo de advance y S5 fallo de purge, con datos sintéticos. Guardar evidencia
  del comportamiento actual y pruebas del contrato esperado antes del fix.
- [ ] **1.3** Revisar los oráculos de WBS-2–4 y el caso adicional S6 IPC. Registrar
  resultado esperado, límites y comandos focalizados para cada cambio.
- [ ] **1.4** Resolver D1–D4 del gate G1 mediante inspección. Registrar contratos
  concretos y riesgos; definir archivos candidatos y consumidores afectados.
- [ ] **1.5** Anotar qué pruebas de la suite completa pasan/fallan antes de cambios;
  separar fallos previos de regresiones futuras y cerrar G1 con evidencia.

scope_in: rama de trabajo, tests sintéticos, preparación de contratos y bitácora.
scope_out: cambios funcionales, reformas SOLID sin hallazgo, instalación de modelos.
forbidden_areas: datos reales y cambios del usuario; archivos de producción salvo lectura.
candidate_files: pruebas existentes de notes, application, inference, qvac e ipc; nuevas pruebas solo en esos ámbitos.
expected_artifacts: línea base S1–S5, contrato S6, decisiones D1–D4, mapa de consumidores y LOG de A01.

## Inspección y contratos previos

Consultar CodeGraph para `createNotesService runGenerateNote verifySource`,
`normalizeStructuringOutput createQwenStructuring`, `bindIpcMain createWindow`,
`ClinicalNote FieldValue OiraApi` y los consumidores de guardado/persistencia.
Leer las pruebas que la herramienta no devuelva directamente.

D1 debe distinguir presencia de procedencia: una afirmación extraída STATED requiere
fuentes; un aporte médico nuevo necesita representación explícita, confirmación y
un camino distinto de la salida generada. Resolver campos con texto mixto, notas
previas sin metadatos y cómo los consumidores mantienen la distinción.

D2 debe concretar remitente, frame y URL de desarrollo/empaquetado a partir de la
configuración real. D3 prefiere compartir la generación del mismo encuentro con
copias defensivas por consumidor. D4 debe definir resultado de guardado persistido
pero inconsistente y reintento de limpieza sin retranscribir ni ocultar retención.

## Verification Strategy

tests_required: yes
test_levels: unit, integration
test_data_origin: synthetic
test_targets: S1–S5 y configuración real necesaria para S6
oracle: evidencia antes del cambio, pruebas negativas del contrato futuro y gates concretos.
determinism_notes: promesas diferidas, errores inyectados y contador de purge; no tiempos arbitrarios.
stop_on_failure: true, salvo pruebas RED esperadas del contrato futuro etiquetadas como tales.

commands_planned:

```sh
git status --short
git rev-parse HEAD
git branch --show-current
git show --no-patch 3eba308701d5ea76369a8965494d5704f541ec21
pnpm test
pnpm --filter oira-desktop exec vitest run src/main/notes/verify-source.test.ts src/main/notes/notes.service.test.ts src/main/application/generate-note.test.ts src/main/inference/select.test.ts src/main/qvac/qwen-structuring.test.ts src/main/qvac/inference-runtime.test.ts src/main/ipc/register.test.ts
```

Las 57 pruebas históricas son el resultado de siete archivos seleccionados; no fijar
ese número como tamaño total de la suite. Las pruebas RED esperadas no se eliminan
para pasar G1: documentar que fallan por el defecto, no por el harness o el entorno.

## Contrato de agente

entry_criteria: orden de ejecución del plan, ningún agente activo y WBS-1 ready.
output_artifacts: evidencia reproducible antes del fix y LOG con D1–D4 resueltos.
handoff_to: A02 / WBS-2
stop_conditions: conflicto de checkout no resoluble sin pérdida, faltan decisiones materiales o harness no ejecutable.
exit_criteria: G1 completo, contratos revisados y pruebas futuras con oráculos válidos.
rollback_plan: retirar únicamente cambios propios de preparación mediante parche; conservar evidencia y trabajo ajeno.

Actualizar registro, cabecera y bitácora. Registrar comandos efectivamente ejecutados
y ubicación real de sus resultados. `RESUME_FROM` del siguiente turno será WBS-2 / 2.1.
