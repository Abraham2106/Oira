# WBS — Corrección SOLID/GRASP y aplicación de los 11 principios (Lethbridge)

project: Oira
plan_id: OIRA-REF-01
plan_version: 2
canonical_source: refactorr-agent.md
base_commit: 3eba308701d5ea76369a8965494d5704f541ec21
target_branch: fix/domain-invariants-and-ipc
created_at: 2026-09-13
status: implementation_verified
owner_role: orchestrator
active_agent: none
active_task: none
next_agent: none
next_task: none
RESUME_FROM: cierre completado
preimplementation_status: approved_G1
implementation_started: true

## Uso: prompt maestro encadenado

Actúa como arquitecto e implementador senior del repositorio Oira. Este documento es el
prompt maestro y registro canónico; los seis documentos enlazados contienen los prompts
operativos. «On-chain» significa aquí una cadena auditable de entregas entre agentes,
no una integración blockchain ni una solicitud de razonamiento interno privado.

Antes de actuar, lee este archivo completo, el prompt de tu WBS y el último handoff real.
Ejecuta únicamente la tarea habilitada por `RESUME_FROM`, sus dependencias y sus gates.
Usa CodeGraph antes de localizar o entender código mientras exista `.codegraph/`.
Comprueba el código actual: el reporte previo es evidencia histórica, no sustituto de
lectura ni autorización para restaurar un checkout anterior.

Al recibir una orden de **ejecutar** este plan, empieza por A01 y continúa la cadena
autorizada hasta su cierre o un bloqueo real. La creación de estos siete documentos
no ejecuta la rama, los fixes, commits, publicación de PR ni el cierre de ninguna WBS.
No declares agentes iniciados solo por tener un nombre asignado en el plan.

## Registro de tareas y agentes

Los estados viven únicamente en esta tabla. Los prompts no mantienen una segunda
copia editable del estado. La cabecera refleja la tarea activa de la tabla.

| task_id | WBS | Prompt | Agente asignado | status | dependencies | unblocks | required_approvals |
| --- | --- | --- | --- | --- | --- | --- | --- |
| WBS-1 | 1.0 Gestión y preparación | [01](docs/engineering/refactor-wbs/01-gestion-preparacion.md) | A01 preparación | done | ninguna | WBS-2 | G1 preparación |
| WBS-2 | 2.0 Trazabilidad | [02](docs/engineering/refactor-wbs/02-trazabilidad-fuentes.md) | A02 dominio | done | WBS-1 | WBS-3 | G2 dominio, revision, QA |
| WBS-3 | 3.0 Concurrencia e IPC | [03](docs/engineering/refactor-wbs/03-concurrencia-ipc.md) | A03 concurrencia → A04 IPC | done | WBS-2 | WBS-4 | G3A y G3B aprobados |
| WBS-4 | 4.0 Errores | [04](docs/engineering/refactor-wbs/04-errores-consistencia.md) | A05 errores | done | WBS-3 | WBS-5 | G4 resultados y limpieza, revisión, QA |
| WBS-5 | 5.0 Lethbridge | [05](docs/engineering/refactor-wbs/05-lethbridge-transversal.md) | A06 auditoría transversal | done | WBS-4 | WBS-6 | G5 auditoría |
| WBS-6 | 6.0 Verificación y cierre | [06](docs/engineering/refactor-wbs/06-verificacion-cierre.md) | A07 integración y cierre | done | WBS-5 | ninguna | G6 verificación, documentación y entrega |

sequence: A01 → A02 → A03 → A04 → A05 → A06 → A07

La revisión Lethbridge se aplica durante A02–A05; WBS-5 consolida sus evidencias, no
pospone los principios hasta el final. Se usa ejecución secuencial como opción por
defecto. El paralelismo opcional de 3.1/3.2 exige trabajo aislado, contratos ya fijados
y un único integrador del registro; no está activado en esta versión del plan.

## Alcance, lentes y decisiones protegidas

goal: corregir cinco hallazgos reproducibles sin rediseñar componentes ajenos.
priority: alta para WBS-2 y WBS-3; media para WBS-4.
scope_in: dominio de nota, normalización, guardrail de IDs, orquestación, frontera IPC y errores asociados.
scope_out: nuevos modelos, verificación semántica por LLM, cloud, SQLite, rediseño visual, rendimiento y cumplimiento legal.
changed_subsystems: Main, contratos shared, tipos de dominio; consumidores de contratos solo donde sea necesario.
security_privacy_notes: fixtures sintéticos; no incluir contenido clínico, secretos, audio real ni payloads completos en logs.

| Hallazgo | Asignación exclusiva | Evidencia del reporte base | WBS |
| --- | --- | --- | --- |
| H1 | OOP general → invariantes de dominio | Texto libre/citas eliminadas terminan STATED sin fuentes | 2.0 |
| H2 | GRASP → Controller | bindIpcMain no comprueba emisor; handlers descartan evento | 3.2 |
| H3 | GRASP → Controller | generate concurrente entra dos veces; perdedor purga audio compartido | 3.1 |
| H4 | Clean Code → manejo de errores | advanceEncounter y settleDrafted silencian excepciones | 4.1 |
| H5 | Clean Code → manejo de errores | purge en finally reemplaza el error primario | 4.2 |

SOLID S/O/L/I/D: sin hallazgos relevantes en el reporte base. No inventar tareas para
llenar esas categorías. GRASP Information Expert, Creator, Low Coupling, High Cohesion,
Polymorphism, Pure Fabrication, Indirection y Protected Variations: sin hallazgos
adicionales; Low Coupling remite a Dependency Inversion cuando corresponda. La matriz
Lethbridge es una comprobación transversal de cambios, no otra lista de hallazgos.

### Qué NO tocar por iniciativa propia

- Selector mock/QVAC y puertos de inferencia.
- Preload acotado: métodos explícitos, eventos envueltos y desuscripción; mantener CJS.
- Copias defensivas del borrador/transcripción canónica.
- Confirmación clínica, borrador previo y validaciones en Main antes de guardar.
- Serialización de aceptaciones y una nota aceptada vigente por encuentro.
- Tabla de transiciones: respetar sus rechazos; no añadir transiciones para ocultar errores.

Una tarea puede atravesar estas piezas cuando su contrato lo exige. Debe registrar
archivo, motivo, diferencia de comportamiento y prueba de no regresión. No se exige
identidad textual cuando cambie legítimamente un contrato.

## Feature preparation — gate G1

primary_user: médico que revisa y acepta un borrador local.
value: trazabilidad explícita, operaciones sin interferencia y errores recuperables.
mvp_slice: cinco correcciones, adaptación necesaria de consumidores y pruebas.
feature_flag: no se planifica; no crear uno sin justificar necesidad concreta.
preparation_owner: A01 / planner

- [x] Checkout, SHA, rama, estado sucio y relación con la base comprobados.
- [x] Los cinco escenarios S1–S5 reproducidos antes del fix, con oráculos aprobados.
- [x] Rutas candidatas y consumidores reales identificados mediante CodeGraph.
- [x] D1: procedencia clínica, campos mixtos y compatibilidad de notas previas definidos.
- [x] D2: lista de remitentes/URL autorizados para desarrollo y empaquetado definida.
- [x] D3: compartir generación por encuentro y propiedad de limpieza confirmadas.
- [x] D4: contrato de inconsistencia tras guardar y política de reintento de purge definidos.
- [x] Pruebas, revisión, límites y rollback registrados.

Las decisiones D1–D4 se resuelven con el código y los defaults de los prompts; A01
anota su decisión concreta y evidencia antes de cerrar G1. No son preguntas obligatorias
al usuario. Si el repositorio no permite resolver una decisión material, registrar el
bloqueo específico y consultar solo ese punto. WBS-2–6 permanecen `draft` hasta cumplir
el gate y sus dependencias. A01 puede trabajar en preparación sin que G1 esté cerrado.

## Execution Governance

mode: CODE-FIRST para WBS-2–4; DOCS/REVIEW para WBS-1, WBS-5 y WBS-6 según entregable.
orchestration_mode: sequential_multi_agent
default_agent_sequence: planner → implementer → reviewer → tester → docs_sync
max_review_loops: 2 por tarea
status_legend: draft, ready, in_progress, blocked, needs_review, approved, done, dropped
active_alarms: []

1. Un solo `active_agent` con permiso de escritura a la vez. El orquestador registra
   el agente real o sesión real al activarlo; los identificadores A01–A07 son roles
   lógicos, no prueba de que existan procesos en ejecución.
2. Cada rol deja un contrato cumplido: planner define cambios/oráculos; implementer
   entrega diff; reviewer examina evidencia y límites; tester ejecuta comprobaciones;
   docs_sync actualiza registro. Si una sesión asume varios roles, declararlo; no
   presentar auto-revisión como revisión independiente.
3. Los gates son revisiones técnicas de roles. No requieren pedir autorización humana
   rutinaria ya cubierta por una orden de ejecución. Si se delega, asignar únicamente
   subtareas acotadas y pasar este contrato y sus alarmas.
4. No introducir mocks de producción, resultados ficticios ni placeholders funcionales.
   Los dobles de pruebas y fixtures sintéticos solicitados por el usuario están
   permitidos: identificarlos como tales y no usarlos como prueba de inferencia real.
   No reemplazar ni eliminar el adaptador mock existente como trabajo incidental.
5. `commands_planned` nunca prueba ejecución. `commands_run` incluye comando exacto,
   directorio, resultado, fecha y limitaciones. No inventar SHA, enlace PR, mediciones
   o aprobación. No cerrar una implementación con documentación solamente.
6. Antes de tocar archivos respetar AGENTS.md, ownership y cambios del usuario.
   Main/IPC/storage corresponde al límite Justin; renderer/UI a Antonio; inferencia,
   prompts/evaluación al límite IA. Registrar cruces necesarios, sin contactar a nadie
   ni ampliar alcance por esos nombres.
7. Usar apply_patch para ediciones. No reset --hard, checkout destructivo, borrado de
   notas, ni git add indiscriminado. No forzar una rama existente ni cambiar globalmente
   safe.directory; si hace falta, usar una excepción git -c limitada a este checkout.
8. Si falla una comprobación obligatoria, no cerrar. Resolver o registrar `blocked`
   con causa real. Tras dos ciclos de revisión fallidos, el orquestador reduce la tarea
   o escala la decisión concreta; no repetir trabajo sin límite.
9. Al retomar, releer estado y diff. No robar un turno activo sin comprobar que la sesión
   terminó. Un handoff devuelve el control al orquestador para activar al siguiente.
10. WBS-6 prepara un PR revisable; publicar, hacer push o merge solo con autorización
    existente para esa acción. Una publicación pendiente queda explícita, no se inventa.

### Contrato común de entrega por agente

entry_criteria: dependencias done, gate aplicable aprobado, prompt leído, turno adquirido.
input_artifacts: este registro, prompt WBS, último handoff y diff actual.
expected_outputs: cambios acotados, evidencia de aceptación, revisión, rollback y siguiente paso.
required_approvals: reviewer del cambio, tester de la verificación, orchestrator del handoff.
stop_conditions: bloqueo real de entorno, dependencia no satisfecha, conflicto de trabajo o expansión material.
escalation_rule: preservar trabajo, anotar evidencia y pedir únicamente la decisión faltante.
rollback_plan: forward-fix acotado por defecto; revertir solo cambios propios identificados sin perder datos.
done_policy: dependencias y gates cumplidos, pruebas ejecutadas, evidencias enlazadas, revisión y sync hechos.

## Verification Strategy — oráculos canónicos

tests_required: yes para los fixes
test_levels: unit, integration; smoke Electron para frontera IPC y consumidores afectados
test_data_origin: synthetic
determinism_notes: promesas controladas, contadores y reloj inyectado; no sleeps ni descargas de modelos.
stop_on_failure: true

| ID | Antes documentado, pendiente de reproducir por A01 | Después exigido | Responsable |
| --- | --- | --- | --- |
| S1 | Texto libre acaba STATED sin fuentes y pasa validación | Salida generada inválida identificada; reintentos acotados; sin borrador aceptado silenciosamente | A02 |
| S2 | Cita missing se elimina y el contenido pasa sin fuentes | Cita inválida conservada hasta rechazo identificable; no saneamiento engañoso | A02 |
| S3 | Segunda generación INFERENCE_BUSY purga audio de la primera | Una ejecución propietaria, una limpieza al terminar; duplicados comparten resultado o rechazo temprano documentado | A03 |
| S4 | advance falla y generate/save devuelven éxito silencioso | Fallo de generación explícito; si ya se guardó, resultado tipado informa persistencia e inconsistencia | A05 |
| S5 | purge falla y sustituye el error de inferencia | Error primario conservado; limpieza observable y reintentable sin repetir inferencia | A05 |
| S6 | Emisor IPC no se valida (caso adicional) | Rechazo antes de withValidation/servicio; navegación no autorizada bloqueada | A04 |

S1 y S2 son dos escenarios de H1: así se cuentan los cinco escenarios históricos.
S6 es una prueba nueva de H2. No confundir cinco hallazgos con cinco pruebas en total.
La corrección no significa «todo debe fallar»: S3 puede tener éxito compartido y S5
puede conservar un borrador correcto con advertencia explícita de limpieza.

commands_planned:

- `pnpm test` — suite completa del checkout, no limitarla a 57 pruebas.
- `pnpm typecheck` — tipos compartidos, Main/Preload y Renderer.
- `pnpm lint:desktop` — cobertura configurada en el repositorio.
- `pnpm --filter oira-desktop build` — bundle, especialmente si cambia contrato/preload.
- Pruebas focalizadas exactas definidas en cada prompt antes del fix.

En Windows se puede usar `pnpm.cmd`. Si el wrapper no funciona, verificar la instalación
y ejecutar el binario local mediante Node desde apps/desktop, documentando el cambio.
No alterar dependencias o configuración solo para ocultar un fallo de entorno.

historical_evidence: revisión anterior de esta conversación sobre el commit base.
historical_test_result: 57 pruebas pasaron en 7 archivos seleccionados; no fue la suite completa.
commands_run_this_plan:
- 2026-09-14 `pnpm.cmd test` (raiz): 55 archivos, 243 PASS, 0 fallos, 0 skips
- 2026-09-14 `pnpm.cmd --filter oira-desktop exec vitest run src/main/refactor-contracts.test.ts`: 9 PASS
- 2026-09-14 `pnpm.cmd typecheck`: types + tsconfig.node.json + tsconfig.web.json PASS
- 2026-09-14 `pnpm.cmd lint:desktop`: PASS; preload fuera de ESLint
- 2026-09-14 `pnpm.cmd --filter oira-desktop build`: PASS; `out/preload/index.cjs`
- 2026-09-14 `git diff --check`: PASS (avisos CRLF)
test_artifacts_this_plan:
- apps/desktop/src/main/refactor-contracts.test.ts
- docs/research/R-13-domain-invariants-and-ipc.md
- docs/engineering/refactor-wbs/pr-draft.md
review_artifacts_this_plan:
- LOG-008 / G6 (misma sesión A07; no hay revisor independiente en este cierre)

## Documentación, riesgos y rollback

wiki_pages_to_read_before: AGENTS.md, README.md, package.json, docs/research/README.md y guías enlazadas pertinentes.
wiki_pages_to_update_after: documentos realmente afectados; no se presupone wiki remota.
wiki_facts_to_capture: contratos finales, motivos, límites, pruebas ejecutadas y compatibilidad.
wiki_do_not_store: contenido clínico real, credenciales, prompts con datos personales, resultados inventados.

WBS-6 seleccionará un ID libre bajo docs/research/ siguiendo I*, R-* o Q*, sin sobrescribir
un ID existente. Esa ruta es un entregable futuro, no un archivo ya creado. Usar fuentes
primarias para afirmaciones externas; distinguir decisión de ingeniería de investigación.

Los riesgos principales son reinterpretar notas previas, perder procedencia en ediciones,
romper consumidores de Result<T>, bloquear la URL legítima empaquetada o repetir una
operación ya persistida. El rollback no migra destructivamente notas ni reactiva guardrails
permisivos para conseguir tests verdes. Ante datos incompatibles, preservar bytes y
aplicar recuperación explícita; no eliminar archivos para «limpiar» una prueba fallida.

## Bitácora append-only de agentes

No borrar entradas anteriores. Corregirlas con otra entrada que indique cuál sustituye.
La primera entrada es de creación documental, no de ejecución del WBS.

### LOG-000 — creación del paquete

date: 2026-09-13
agent_id: autor del plan / sesión principal
task_id: documentación del plan
status_after: draft
summary: creados el registro canónico y seis prompts encadenados; ningún refactor iniciado.
files_changed: refactorr-agent.md y docs/engineering/refactor-wbs/01–06.
implementation_changes: none
commands_run: lectura de skill/plantillas, README y convenciones; git status y rev-parse de la base; validación PowerShell de siete documentos, enlaces relativos, UTF-8 y bloques de código; git diff --check.
test_artifacts: validación documental PASS en la sesión; no se ejecutaron pruebas de producto para esta entrega documental.
next_agent: A01
RESUME_FROM: WBS-1 / 1.1

### LOG-001 — A01 / preparación y gate G1

date: 2026-09-13 America/Costa_Rica
agent_id: A01 / planner, escritor principal
task_id: WBS-1 / 1.1–1.5
status_before: ready
status_after: done; G1 approved
base_head: 3eba308701d5ea76369a8965494d5704f541ec21
result_head: 3eba308701d5ea76369a8965494d5704f541ec21 (sin commit local)
files_changed: refactorr-agent.md; apps/desktop/src/main/refactor-contracts.test.ts
changes: creada la rama local `fix/domain-invariants-and-ipc`; añadido un único archivo de contratos sintéticos con S1–S6. No hubo cambios funcionales de producción.
decisions:
- D1: la procedencia será un contrato discriminado de código confiable: salida de inferencia `EXTRACTED` exige fuentes no vacías; el servicio Main, no el modelo ni un booleano recibido, deriva `CLINICIAN_EDITED` al guardar una edición explícita. Campos mixtos conservan la edición y no reciben retrospectivamente evidencia. Registros legacy sin procedencia se preservan sin migración destructiva y requieren revisión explícita antes de tratarlos como afirmaciones nuevas.
- D2: A04 debe registrar únicamente el `webContents` de la ventana creada, su frame principal y la URL exacta cargada: en desarrollo el origen exacto de `ELECTRON_RENDERER_URL`; empaquetado el `index.html` resuelto bajo el bundle. No se aceptan subframes, puertos localhost genéricos ni cualquier `file:`. La navegación se limita a esos mismos destinos.
- D3: `createNotesService` poseerá una promesa en curso por `encounterId`, registrada antes del primer `await`, que comparte resultado mediante copias defensivas; `runGenerateNote` conserva una única limpieza de la ejecución propietaria.
- D4: los resultados deberán distinguir éxito normal, persistencia realizada con transición pendiente y borrador útil con limpieza pendiente; causas primarias se preservan y el retry de purge se deriva del encuentro/almacén confiable sin repetir inferencia, estructura ni persistencia.
consumers_and_candidates: `structure/schema.ts`, `qvac/qwen-structuring.ts`, `shared/schemas/clinical.schema.ts`, `notes/verify-source.ts`, `application/generate-note.ts`, `notes/notes.service.ts`, `shared/types/oira-api.ts`, `ports/inbound.ts`, `renderer/bridge/ipc.ts`, `renderer/state/useEncounter.ts`, `main/index.ts`, `main/ipc/index.ts`, `main/ipc/types.ts` y handlers IPC. CodeGraph confirmó los paths `createNotesService → runGenerateNote → verifySource`, `registerIpc → withValidation` y consumidores de `GenerateNoteResult`.
commands_run:
- `git -c safe.directory='C:/Users/solan/Documents/Personal/Hackathon/Oira' status --short --branch`, `rev-parse HEAD`, `merge-base HEAD base` y `branch --list`: HEAD y merge-base son `3eba308...`; checkout inicial en `main`, tres artefactos de plan sin seguimiento; rama destino inexistente.
- `git -c safe.directory='C:/Users/solan/Documents/Personal/Hackathon/Oira' switch -c fix/domain-invariants-and-ipc`: exit 0; rama local creada sin reset ni cambios ajenos.
- `codegraph.cmd explore ...`: inspectó rutas, fuentes y blast radius de H1–H5 y S6; el wrapper `.ps1` quedó bloqueado por ExecutionPolicy y se usó el ejecutable `.cmd` indexado.
- `pnpm.cmd test` (fuera del sandbox porque esbuild no podía leer la configuración dentro): exit 0, 53 archivos y 221 pruebas PASS.
- `pnpm.cmd --filter oira-desktop exec vitest run src/main/structure/schema.test.ts src/main/notes/verify-source.test.ts src/main/notes/notes.service.test.ts src/main/application/generate-note.test.ts src/main/qvac/qwen-structuring.test.ts src/main/ipc/register.test.ts`: exit 0, 6 archivos y 53 pruebas PASS.
- `pnpm.cmd --filter oira-desktop exec vitest run src/main/refactor-contracts.test.ts`: exit 1 esperado, S1–S6 RED (6/6) por los defectos reproducidos; no es regresión aún porque los fixes no han empezado.
- `git diff --check`: exit 0.
test_artifacts: salida textual de Vitest registrada arriba; el artefacto ejecutable es `apps/desktop/src/main/refactor-contracts.test.ts` y sus datos son sintéticos.
review: `/root/a01_review`, revisión independiente de solo lectura, veredicto APROBAR G1 tras verificar registro; limitación: no repitió las ejecuciones fuera del sandbox, contrastó CodeGraph, diff y resultados del escritor.
protected_behavior: no se modificaron selector mock/QVAC, preload CJS, copias defensivas existentes, confirmación clínica, serialización de saveChains ni tabla de transiciones.
rollback: retirar únicamente `refactor-contracts.test.ts` y los hunks LOG-001 si se abandona el plan; no borrar datos, notas, audio ni los documentos de planificación preexistentes.
alarms: []
handoff_to: A02 / dominio
RESUME_FROM: WBS-2 / 2.1; releer este LOG, Prompt 02 y el diff, después separar normalización de validación y cerrar S1/S2 sin ampliar a validación semántica.

### LOG-002 — A02 / trazabilidad y procedencia

date: 2026-09-13 America/Costa_Rica
agent_id: A02 / dominio, escritor principal
task_id: WBS-2 / 2.1–2.5
status_before: in_progress
status_after: needs_review
base_head: 3eba308701d5ea76369a8965494d5704f541ec21
result_head: 3eba308701d5ea76369a8965494d5704f541ec21 (sin commit local)
files_changed: packages/types/src/index.ts; apps/desktop/src/shared/schemas/clinical.schema.ts; apps/desktop/src/main/structure/schema.ts; apps/desktop/src/main/structure/note-from-output.ts; apps/desktop/src/main/qvac/qwen-structuring.ts; apps/desktop/src/main/notes/verify-source.ts; apps/desktop/src/main/notes/notes.service.ts; apps/desktop/src/renderer/state/useEncounter.ts; fixtures, mocks y pruebas de estructura/ Qwen/almacenamiento.
changes: se añadió `EXTRACTED | CLINICIAN_EDITED`; Qwen marca la salida sólo como extraída desde Main; la validación rechaza JSON no estructurado, STATED sin fuentes y citas ausentes sin sanearlas. Las ediciones del renderer se marcan humanas y Main reconcilia el borrador, vaciando citas sólo para cambios reales; una cita inválida declarada sigue rechazándose antes de reconciliar.
commands_run: `pnpm.cmd typecheck` PASS; prueba focal de notas, estructura y Qwen: 39 PASS, mientras S3–S6 quedan 4 RED esperados en refactor-contracts.test.ts para WBS posteriores.
review: pendiente de revisor independiente G2.
rollback: revertir únicamente hunks A02; no migrar ni borrar notas legacy.
alarms: []
handoff_to: reviewer G2
RESUME_FROM: WBS-2 / revisión G2; si aprueba, actualizar WBS-2 done y activar A03 / 3.1.

+### LOG-003 - G2 / revision Luna y cierre de WBS-2

date: 2026-09-13 22:38:52 -06:00 America/Costa_Rica
agent_id: /root/a02_luna_review / revisor Luna independiente, solo lectura; /root / integrador y escritor unico
task_id: WBS-2 / revision G2 y forward-fix acotado
status_before: needs_review
status_after: done; G2 approved
base_head: 3eba308701d5ea76369a8965494d5704f541ec21
result_head: 3eba308701d5ea76369a8965494d5704f541ec21 (sin commit local)
files_changed: packages/types/src/index.ts; apps/desktop/src/shared/schemas/clinical.schema.ts; apps/desktop/src/main/structure/schema.ts; apps/desktop/src/main/structure/schema.test.ts; apps/desktop/src/main/qvac/qwen-structuring.ts; apps/desktop/src/main/qvac/qwen-structuring.test.ts; apps/desktop/src/main/storage/json-file.store.ts; apps/desktop/src/main/storage/json-file.store.test.ts; apps/desktop/src/renderer/bridge/ipc.ts; ademas de los hunks A02 ya enumerados en LOG-002 y este registro.
changes: Qwen acepta unicamente completion.text, nunca thinkingText ni rawText; el validador rechaza objetos/secciones desconocidos, formas invalidas, STATED vacio y NOT_STATED con contenido, sin sanear evidencia. El lector JSON reconoce registros anteriores sin procedencia como LEGACY_UNVERIFIED, mantiene el archivo intacto al leer y la frontera renderer impide re-guardarlos hasta revision explicita.
decisions:
- LEGACY_UNVERIFIED es una marca de incertidumbre, no atribucion humana ni evidencia inventada. Esta fuera de clinicalNoteSchema; los registros legacy se preservan en lectura y no se vuelven a persistir por un flujo clinico sin conversion/revision completa.
- La salida estructurada debe incluir al menos una seccion reconocida y cada seccion debe cumplir la forma requerida antes de normalizar. Se descarto seguir tolerando objetos vacios o campos desconocidos porque los convertia silenciosamente en NOT_STATED.
commands_run:
- pnpm.cmd install desde la raiz: exit 0; lockfile al dia. Se uso porque pnpm exec vitest no encontro el binario enlazado en la raiz.
- apps/desktop/node_modules/.bin/vitest.CMD run src/main/qvac/qwen-structuring.test.ts src/main/structure/schema.test.ts src/main/notes/verify-source.test.ts src/main/notes/notes.service.test.ts src/main/storage/json-file.store.test.ts src/renderer/bridge/ipc.test.ts desde apps/desktop, elevado tras bloqueo sandbox de esbuild: exit 0; 6 archivos, 51 pruebas PASS.
- pnpm.cmd typecheck desde la raiz: exit 0; paquetes types, node y web PASS.
- git -c safe.directory='C:/Users/solan/Documents/Personal/Hackathon/Oira' diff --check: exit 0; sin errores de whitespace (solo advertencias CRLF del checkout).
- apps/desktop/node_modules/.bin/vitest.CMD run src/main/refactor-contracts.test.ts elevado: exit 1 esperado; S1 y S2 PASS, S3-S6 continuan RED y asignados a WBS-3/WBS-4.
test_artifacts: apps/desktop/src/main/refactor-contracts.test.ts; pruebas focalizadas de esquema, Qwen, fuente, notas, JSON store e IPC bridge; todos los datos son sinteticos.
review: /root/a02_luna_review reviso el diff y consumidores sin editar. Primera pasada bloqueo lectura legacy y normalizacion silenciosa; segunda pasada APPROVE tras verificar los forward-fixes, 51 PASS, typecheck PASS y diff --check PASS. Limitacion: una futura edicion/persistencia directa de un registro LEGACY_UNVERIFIED debe disenar y probar una conversion/revision completa.
protected_behavior: revision y CodeGraph no hallaron cambios en selector QVAC, preload CJS, confirmacion clinica, saveChains, generate-note.ts ni tabla de transiciones. La adaptacion IPC solo rechaza el valor legacy antes de enviarlo y conserva la validacion Main.
rollback: revertir unicamente hunks de A02/LOG-003 o aplicar forward-fix; no migrar, borrar ni cuarentenar registros legacy para obtener verde.
alarms: []
handoff_to: A03 / WBS-3 / 3.1
RESUME_FROM: WBS-3 / 3.1; releer este LOG, Prompt 03, el diff y los consumidores. Resolver unicamente S3 con una promesa en curso por encounterId, copias defensivas y una sola limpieza; no activar A04 antes de G3A.

### Formato obligatorio para nuevas entradas (instrucción, no evidencia)

Al cerrar o pausar un turno, añadir LOG consecutivo con estos campos y valores reales:

```yaml
date: fecha y hora con zona
agent_id: identificador real y rol lógico Axx
task_id: WBS y subpaso
status_before: estado al entrar
status_after: estado al salir
base_head: SHA comprobado al entrar
result_head: SHA comprobado al salir, o mismo SHA si no hubo commit
files_changed: lista exacta de rutas
changes: explicación concreta de qué cambió y por qué
decisions: decisiones y alternativas descartadas relevantes
commands_run: comandos, directorios, salidas resumidas y exit codes
test_artifacts: rutas existentes o evidencia textual de ejecución
review: revisor real, veredicto y limitaciones de independencia
protected_behavior: pruebas de las piezas protegidas atravesadas
rollback: acción específica que preserva datos y cambios ajenos
alarms: IDs activos y evidencia, o lista vacía
handoff_to: siguiente agente lógico
RESUME_FROM: subpaso exacto y condición de entrada
```

Si aparece una alarma, registrar `alarm_id`, `why_present`, `missing_to_replace`,
`replacement_plan`, `owner_role` y `blocks`; copiarla al prompt afectado y al handoff.
Las plantillas de este documento nunca cuentan como entradas cumplimentadas.

### LOG-004 — A03 / concurrencia y gate G3A

date: 2026-09-13 23:03:45 -06:00 America/Costa_Rica
agent_id: /root / A03 concurrencia, escritor principal; /root/a03_luna_review / revisor Luna independiente, solo lectura
task_id: WBS-3 / 3.1 / S3 y G3A
status_before: in_progress; WBS-2 done, G2 approved
status_after: done; G3A approved; WBS-3 remains in_progress for A04/3.2
base_head: 3eba308701d5ea76369a8965494d5704f541ec21
result_head: 3eba308701d5ea76369a8965494d5704f541ec21 (sin commit local)
files_changed: apps/desktop/src/main/notes/notes.service.ts; apps/desktop/src/main/refactor-contracts.test.ts; refactorr-agent.md
changes: `createNotesService.generate` conserva un mapa de promesas por encounterId, registra el trabajo antes de ceder control asincrono, comparte llamadas duplicadas y devuelve copias defensivas. Solo elimina su propio registro tras exito o fallo. Se ampliaron las pruebas S3 con barreras y contadores para una transcripcion, una estructuracion y un purge por ejecucion; mutacion entre consumidores; liberacion tras fallo; y aislamiento por encounterId.
decisions:
- Se comparte el resultado de `runGenerateNote` en el servicio, no se introduce mutex global ni se altera la politica de regeneracion. `runGenerateNote` conserva la propiedad unica de purge para la ejecucion propietaria.
- El doble AudioCapturePort de prueba implementa el puerto completo; no se uso cast para ocultar un contrato incompleto.
- S4, S5 y S6 permanecen RED y fuera de alcance: A05/A04 los resuelven en sus subfases asignadas.
commands_run:
- `.\\node_modules\\.bin\\vitest.CMD run src/main/refactor-contracts.test.ts` desde apps/desktop dentro del sandbox: exit 1; esbuild no pudo leer el checkout (`Access is denied`).
- `.\\node_modules\\.bin\\vitest.CMD run src/main/refactor-contracts.test.ts` desde apps/desktop, elevado tras ese bloqueo: exit 1 esperado; S1, S2 y los tres S3 PASS; S4, S5 y S6 RED asignados a WBS posteriores.
- `.\\node_modules\\.bin\\vitest.CMD run src/main/refactor-contracts.test.ts -t S3` desde apps/desktop, elevado: exit 0; 3 PASS, 5 skipped.
- `.\\node_modules\\.bin\\vitest.CMD run src/main/notes/notes.service.test.ts src/main/application/generate-note.test.ts` desde apps/desktop, elevado: exit 0; 25 PASS.
- `pnpm.cmd typecheck` desde raiz: primer intento exit 2 por doble AudioCapturePort incompleto; despues de corregir `finalize` a retorno string, exit 0 para types, node y web.
- `git -c safe.directory='C:/Users/solan/Documents/Personal/Hackathon/Oira' diff --check` desde raiz: exit 0; sin errores de whitespace, solo avisos CRLF del checkout.
test_artifacts: apps/desktop/src/main/refactor-contracts.test.ts; salida Vitest focal S3 (3 PASS); salida de notes.service.test.ts y generate-note.test.ts (25 PASS); typecheck PASS.
review: /root/a03_luna_review, Luna independiente solo lectura, APPROVE G3A. Verifico diff, consumidores, registro, aislamiento por encounterId, clones defensivos, limpieza unica y limites. Limitacion: la suite completa del archivo sigue roja por S4/S5/S6 no resueltos; esbuild requiere elevacion en este sandbox por acceso denegado al checkout.
protected_behavior: no se modificaron saveChains, generate-note.ts, selector QVAC, preload CJS, IPC principal ni tabla de transiciones. Las copias defensivas de cada consumidor se probaron mediante mutacion de un resultado compartido.
rollback: revertir unicamente el mapa `generations` y los casos S3 de refactor-contracts.test.ts mediante forward-fix o hunk identificado; no borrar audio, notas, registros legacy ni cambios ajenos de A02.
alarms: []
handoff_to: A04 / WBS-3 / 3.2
RESUME_FROM: WBS-3 / 3.2; releer LOG-004 y Prompt 03, inspeccionar version/documentacion oficial de Electron instalada y resolver unicamente S6 antes de G3B.

### LOG-005 — A04 / frontera IPC y gate G3B

date: 2026-09-13 23:22:02 -06:00 America/Costa_Rica
agent_id: /root / A04 escritor principal; /root/a04_luna_review / revisor Luna independiente, solo lectura
task_id: WBS-3 / 3.2 / S6 y G3B
status_before: WBS-3 in_progress; G3A approved
status_after: WBS-3 done; G3B approved; WBS-4 activated
base_head: 3eba308701d5ea76369a8965494d5704f541ec21
result_head: 3eba308701d5ea76369a8965494d5704f541ec21 (sin commit local)
files_changed: apps/desktop/src/shared/constants/app-error-codes.ts; apps/desktop/src/main/errors/ipc.ts; apps/desktop/src/main/ipc/sender-guard.ts; apps/desktop/src/main/ipc/sender-guard.test.ts; apps/desktop/src/main/index.ts; apps/desktop/src/main/refactor-contracts.test.ts; refactorr-agent.md
changes: se añadio un guard comun para todos los handlers IPC: exige webContents registrado, main frame y URL exacta; rechaza antes de listener/Zod/logger/servicio. Se restringieron navegación, subframes y redirecciones; los popups internos siguen denegados.
decisions: Electron 38.8.6 fue verificado mediante documentación oficial y typings instalados. URLs externas se delegan al navegador del sistema por el shell.openExternal preexistente; no se alteró esa política fuera del alcance.
commands_run: sender-guard.test.ts elevado exit 0 (6 PASS); refactor-contracts.test.ts -t S6 elevado exit 0; pnpm.cmd typecheck raíz exit 0; pnpm.cmd --filter oira-desktop build elevado exit 0. Los intentos sandbox de Vitest/build fallaron antes de ejecutar por esbuild Access is denied al leer el checkout; se repitieron elevados.
test_artifacts: sender-guard.test.ts; refactor-contracts.test.ts S6; build output con out/preload/index.cjs.
review: /root/a04_luna_review APPROVE. Limitación: smoke manual aportado por usuario, no repetido por revisor.
protected_behavior: no se modificaron preload CJS, selector QVAC, saveChains ni tabla de transiciones.
rollback: revertir únicamente guard/error/navegación A04 mediante hunks identificados; no borrar notas, audio ni cambios A02/A03.
alarms: []
handoff_to: A05 / WBS-4
RESUME_FROM: WBS-4 / 4.1; mapear contratos de resultados y consumidores antes de resolver S4/S5.

### LOG-006 — A05 / errores, consistencia y gate G4

date: 2026-09-13 America/Costa_Rica
agent_id: /root / A05 errores, escritor principal; /root/a05_review / revisor independiente, solo lectura
task_id: WBS-4 / 4.1–4.3 / S4 y S5
status_before: in_progress; WBS-3 done, G3A/G3B approved
status_after: done; G4 approved
base_head: 3eba308701d5ea76369a8965494d5704f541ec21
result_head: 3eba308701d5ea76369a8965494d5704f541ec21 (sin commit local)
files_changed: generate-note.ts, notes.service.ts, core errors/result types, contratos IPC/preload/bridge, pruebas de notas/contratos/bridge, schema.ts y este registro.
changes: resultados de generación y guardado ahora son uniones discriminadas. CLEANUP_PENDING conserva el borrador y permite retry derivado solo del encounterId; PERSISTED_TRANSITION_PENDING conserva noteId y evita marcar ACCEPT en renderer. Errores primarios preservan marcadores seguros de transición/limpieza secundarios; settleDrafted reconcilia estados sin cambiar la tabla de transiciones ni saveChains.
decisions: retry de audio se expone por IPC validado y preload, sin rutas arbitrarias ni repetir inferencia/persistencia. La UI avisa estados parciales; no se añadió un control visual explícito de retry. Se eliminó una variable/parámetro muerto de schema.ts exclusivamente para restaurar lint.
commands_run: pnpm.cmd typecheck exit 0; pnpm.cmd lint:desktop exit 0; pnpm.cmd test elevado tras bloqueo sandbox de esbuild exit 0 (55 archivos, 243 pruebas); Vitest focal elevado exit 0 (5 archivos, 41 pruebas antes de la ampliación final); pnpm.cmd --filter oira-desktop build elevado exit 0; git diff --check exit 0.
test_artifacts: refactor-contracts.test.ts (S4/S5 y secundarios); notes.service.test.ts (retry cleanup y noteId estable); bridge tests; apps/desktop/out/.
review: /root/a05_review, independiente solo lectura, APPROVE. Limitación: no ejecutó comandos; el retry de limpieza está disponible por bridge/IPC pero sin affordance visual explícita.
protected_behavior: no se cambiaron selector QVAC, formato preload CJS, saveChains, confirmación clínica, tabla de transiciones ni copias defensivas.
rollback: revertir únicamente hunks A05 y el ajuste muerto de lint mediante forward-fix; no borrar notas, borradores, audio ni cambios A02–A04.
alarms: []
handoff_to: A06 / auditoría transversal
RESUME_FROM: WBS-5 / 5.1; releer LOG-006, Prompt 05 y auditar el diff integrado sin inventar hallazgos.

### LOG-007 — A06 / auditoría Lethbridge y gate G5

date: 2026-09-14 America/Costa_Rica
agent_id: /root / A06 integrador documental; /root/a05_review / revisor independiente solo lectura
task_id: WBS-5 / 5.1–5.11
status_before: in_progress
status_after: done; G5 approved
files_changed: refactorr-agent.md
changes: matriz auditada: P1–P5, P7, P10 y P11 PASS con schema/verify-source/notes service/result unions/sender guard/tests; P6, P8 y P9 sin hallazgo relevante ni cambio dedicado. No se abrió refactor adicional.
commands_run: CodeGraph sobre normalización, verificación, servicio, resultados e IPC; git diff --stat/diff --check exit 0.
review: /root/a05_review APPROVE independiente, sin bloqueos. Limitación: no reejecutó pruebas; se apoya en LOG-006 (243 PASS). docs/codebase-map.html está sin seguimiento, fuera del plan y preservado.
protected_behavior: selector QVAC, tabla de transiciones, saveChains, confirmación y clones conservados; preload permanece CJS y sólo suma método explícito.
rollback: revertir sólo este LOG si se corrige documentación; código se devuelve a su WBS propietario.
alarms: []
handoff_to: A07 / integración y cierre
RESUME_FROM: WBS-6 / 6.1 / releer LOG-007 y Prompt 06; verificar artefactos, preparar commit y borrador PR local sin publicar.

### LOG-008 — A07 / verificación integral, docs y cierre local

date: 2026-09-14 00:35 America/Costa_Rica
agent_id: sesión principal Cursor / A07 tester + docs_sync + escritor; G6 no tuvo revisor independiente
task_id: WBS-6 / 6.1–6.5
status_before: in_progress; WBS-5 done, G5 approved
status_after: done; G6 approved con limitaciones; implementation_verified; publication_pending
base_head: 3eba308701d5ea76369a8965494d5704f541ec21
result_head: commit local de cierre en esta sesión (SHA en git log -1 de fix/domain-invariants-and-ipc)
files_changed: diffs A02–A05 ya presentes; sender-guard; refactor-contracts; preload-contract.test.ts (retryAudioCleanup); docs/research/R-13-domain-invariants-and-ipc.md; docs/research/README.md; README.md; AGENTS.md; docs/QWEN_STRUCTURING_P2.md; docs/NOTE_VERIFIER_P3.md; docs/engineering/refactor-wbs/*; docs/engineering/refactor-wbs/pr-draft.md; este registro.
changes: verificación integrada S1–S6 y suite completa; write-up R-13; docs alineadas con validación estructural (sin claims semánticos); borrador de PR local sin publicar. Preload contract test ahora exige el método explícito retryAudioCleanup.
decisions:
- ID de research libre: R-13 (R-1…R-12 ocupados en disco).
- 6.5 se entrega como borrador en docs/engineering/refactor-wbs/pr-draft.md. Push/gh pr create no autorizados.
- G6 lo cierra la misma sesión que ejecutó las pruebas; no se presenta como revisión independiente.
- .gitignore (.codex-local/) y docs/codebase-map.html quedan fuera del paquete.
commands_run:
- pnpm.cmd test (raiz, 2026-09-14 00:20:34): exit 0; Test Files 55 passed; Tests 243 passed; 0 failed; 0 skipped. Duración 13.47s.
- pnpm.cmd --filter oira-desktop exec vitest run src/main/refactor-contracts.test.ts: exit 0; 9 PASS (S1, S2, 3×S3, S4, S4 secundario, S5, S6).
- siete archivos de verificación (schema, verify-source, notes.service, generate-note, qwen-structuring, register, sender-guard): exit 0; 7 archivos, 65 PASS. El recuento histórico de 57 no se forzó excluyendo tests.
- pnpm.cmd typecheck: exit 0; @oira/types, tsconfig.node.json y tsconfig.web.json.
- pnpm.cmd lint:desktop: exit 0; eslint src/renderer src/main --max-warnings=0. Preload no cubierto por ESLint.
- pnpm.cmd --filter oira-desktop build: exit 0; out/main/index.js, out/preload/index.cjs (2.76 kB, CJS, métodos nombrados, retryAudioCleanup, desuscripción), renderer.
- git diff --check: exit 0; solo avisos CRLF del checkout.
test_artifacts: refactor-contracts.test.ts; sender-guard.test.ts; notes.service.test.ts; select.test.ts; encounterMachine.test.ts; preload-contract.test.ts; out/preload/index.cjs; docs/research/R-13-domain-invariants-and-ipc.md; docs/engineering/refactor-wbs/pr-draft.md.
review: G6 por la misma sesión A07 tras ejecutar comandos. Limitación: no hay revisor independiente en este cierre. No se reejecutó smoke de ventana Electron viva (G3B lo dejó como smoke manual de usuario); no se afirma seguridad IPC de runtime. No se ejecutó QVAC real ni se descargaron modelos.
protected_behavior:
- Selector: select.test.ts mock sin SDK y qvac → createQwenStructuring.
- Preload CJS: preload-contract.test.ts + out/preload/index.cjs; sin invoke genérico; desuscripción de eventos.
- Copias: S3 muta un resultado y el otro permanece.
- Guardado: notes.service.test.ts rechaza sin clinicianConfirmed y sin borrador; verifySource sigue aplicándose.
- saveChains: noteId estable y saves concurrentes en notes.service.test.ts.
- Transiciones: encounterMachine.test.ts sigue lanzando IDLE+ACCEPT; useEncounter no aplica ACCEPT en PERSISTED_TRANSITION_PENDING.
rollback: revertir el commit de esta rama o forward-fix acotado; no borrar notas, audio ni registros LEGACY_UNVERIFIED.
alarms: []
handoff_to: usuario / responsable de publicación (push y GitHub PR)
RESUME_FROM: cierre completado; publicación GitHub pendiente de autorización.
