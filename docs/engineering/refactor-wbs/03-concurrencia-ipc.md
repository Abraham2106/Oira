# Prompt 03 — Concurrencia y frontera IPC

task_id: WBS-3
owner_role: A03 concurrencia, después A04 IPC; nunca ambos escritores simultáneos
status_source: ../../../refactorr-agent.md
dependencies: WBS-2 done
unblocks: WBS-4
RESUME_FROM: registro canónico / WBS-3 / 3.1
required_approvals: G3A concurrencia, G3B IPC, reviewer, tester
max_review_loops: 2 por subfase
lens: GRASP → Controller (H3 y H2, problemas diferentes)

## Mandato y secuencia

Lee [el maestro](../../../refactorr-agent.md), G2 y D2/D3. A03 corrige la propiedad de
la generación y entrega G3A a A04. A04 añade una única frontera común de autenticidad
del emisor y entrega G3B a A05. WBS-3 permanece abierta entre ambos turnos.

## 3.1 — A03: propiedad del pipeline

- [ ] **3.1.1** Registrar una promesa en curso por `encounterId` antes de ceder el
  control asíncrono de una nueva generación.
- [ ] **3.1.2** Compartir el trabajo con llamadas duplicadas del mismo encuentro.
  Si D3 justifica rechazo temprano, hacerlo antes de entrar al pipeline y probarlo.
- [ ] **3.1.3** Solo la ejecución propietaria limpia el audio. No delegar la limpieza
  a cada consumidor de la promesa. No encolar otra transcripción del WAV ya purgado.
- [ ] **3.1.4** Reproducir S3: una sola transcripción/estructura y purge una vez al
  terminar, nunca mientras la primera está pendiente.

scope_in_A03: notes.service.ts, generate-note.ts y pruebas asociadas; temp-store.ts solo si hace falta.
scope_out_A03: internals QVAC, mutex global nuevo por defecto, rediseño de saveChains.

Compartir trabajo no equivale a compartir referencias mutables. Cada consumidor debe
recibir una copia defensiva del borrador; alterar uno no modifica otro ni el canónico.
Liberar el registro solo si la promesa sigue siendo la registrada, tanto tras éxito
como tras fallo. Una generación ya terminada no se considera «en curso»; no redefinir
la regeneración posterior ni su política de audio sin documentarlo.

No unir encuentros diferentes por accidente. Que el runtime limite concurrencia
global no autoriza al servicio a conocer sus estados internos. Una operación rechazada
no puede purgar recursos de un encuentro ajeno. Mantener saveChains independiente y
validar que se puede aceptar el borrador resultante conforme al contrato vigente.

## 3.2 — A04: puerta de entrada IPC

- [ ] **3.2.1** Envolver `bindIpcMain` con comprobación común de `webContents`
  autorizado, frame principal y URL exacta/normalizada según D2.
- [ ] **3.2.2** Restringir navegación de la ventana a destinos autorizados; cubrir
  redirecciones y frame pertinente según la API Electron instalada.
- [ ] **3.2.3** Mantener la política en el adaptador de entrada. Los handlers conservan
  su validación Zod y sesión, sin copiar comprobaciones de emisor por canal.
- [ ] **3.2.4** S6: emisor no autorizado se rechaza antes de `withValidation`, logger
  de operación o servicio. También debe existir control positivo del emisor legítimo.

scope_in_A04: main/index.ts, ipc/types.ts y wrapper/política local que sea necesario crear, pruebas de entrada.
scope_out_A04: exponer ipcRenderer genérico, convertir preload a ESM, cambiar el modo de autenticación del producto.
forbidden_areas: datos clínicos en logs, navegación abierta por fallback y aceptación por prefijos de URL inseguros.

Inspeccionar la versión instalada y documentación oficial de Electron antes de usar
APIs concretas. No copiar recomendaciones de otra versión sin comprobar su contrato.
La identidad de sender sola no basta si ese webContents navega a otro documento.
Rechazar evento/frame ausente, subframe y emisor no registrado. No confiar en una
URL enviada como parte del payload. Para file:// no autorizar cualquier archivo;
comparar con el documento empaquetado esperado. En desarrollo usar la URL configurada,
no una excepción general para todos los localhost o todos los puertos.

No extrapolar esto como defensa contra un XSS dentro del propio documento confiable.
No afirmar seguridad completa ni ejecutar pruebas con sitios/datos reales innecesarios.

## Verification Strategy

tests_required: yes
test_levels: unit, integration, smoke Electron para A04
test_data_origin: synthetic
test_targets: generación concurrente y wrapper real de registro IPC, navegación dev/empaquetado.
oracle: S3 conserva recursos y aislamiento; S6 no despacha emisores inválidos y permite el válido.
negative_tests: doble generate, rechazo/limpieza del registro, mutación entre consumidores, otro encuentro, frame/URL maliciosos.
determinism_notes: barreras de promesas y contadores; no medir carreras mediante sleeps.
stop_on_failure: true

commands_planned:

```sh
pnpm --filter oira-desktop exec vitest run src/main/notes/notes.service.test.ts src/main/application/generate-note.test.ts src/main/qvac/inference-runtime.test.ts src/main/ipc
pnpm typecheck
pnpm --filter oira-desktop build
```

Registrar las rutas y comandos de pruebas nuevas antes del fix. Probar integración del
wrapper con el registro de todos los canales, no solo su predicado aislado. El smoke
de Electron verifica app legítima, carga del preload CJS y navegación denegada. Si no
se puede ejecutar, registrar el bloqueo real; un fake de evento no sustituye ese smoke.

## Contratos y handoff

### A03

entry_criteria: G2 cerrado y D3 confirmado.
expected_outputs: diff de concurrencia, S3 antes/después, copias defensivas y G3A.
handoff_to: A04 / 3.2, mediante orquestador y LOG propio.
stop_conditions: dependencia funcional sin cerrar o interferencia con generación/guardado no resuelta.

### A04

entry_criteria: G3A aprobado y D2 concretado para ambos modos de ejecución.
expected_outputs: wrapper común, navegación restringida, pruebas de S6 y G3B.
handoff_to: A05 / WBS-4.
stop_conditions: origen legítimo no identificable, API no confirmada o smoke obligatorio bloqueado.

exit_criteria: ambos gates aprobados y controles positivos/negativos pasan.
rollback_plan: revertir solo hunk propio o forward-fix; preservar guardrails de dominio y no borrar audio/notas para destrabar pruebas.

Lethbridge: P3 independencia del runtime; P5 wrapper reusable; P10 y P11 para ambas
subfases. Cada agente añade entrada separada al principal y actualiza `active_agent`,
`next_agent` y `RESUME_FROM`; A03 no puede marcar toda WBS-3 done.
