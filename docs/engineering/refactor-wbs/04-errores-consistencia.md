# Prompt 04 — Errores, consistencia y limpieza

task_id: WBS-4
owner_role: A05 / errores
status_source: ../../../refactorr-agent.md
dependencies: WBS-3 done
unblocks: WBS-5
RESUME_FROM: registro canónico / WBS-4 / 4.1
required_approvals: G4 resultados y limpieza, reviewer, tester
max_review_loops: 2
lens: Clean Code → manejo de errores (H4 y H5)

## Mandato

Lee [el maestro](../../../refactorr-agent.md), los handoffs de A02–A04 y D4. Elimina
errores silenciados y enmascarados sin deshacer la propiedad de generación de A03.
El resultado debe distinguir inferencia, persistencia, transición y limpieza.

## WBS

- [ ] **4.1** Sustituir catches indiscriminados de `advanceEncounter`/`settleDrafted`
  por tratamiento contextual.
- [ ] **4.1.1** Propagar fallo de transición en el camino de generación exitoso; si
  había un fallo primario, preservarlo y registrar el secundario por separado.
- [ ] **4.1.2** Si save ya persistió y falló la transición, devolver resultado tipado
  con noteId/estado de persistencia y recuperación; no éxito completo ni error que
  induzca a suponer que no se guardó nada.
- [ ] **4.2** Aislar `purge` en un try/catch propio dentro de la política de limpieza.
  `temp-store` debe seguir informando fallos de fs; no resolverlo tragándose allí el error.
- [ ] **4.2.1** Preservar error primario cuando exista.
- [ ] **4.2.2** Hacer observable el fallo de limpieza sin payload clínico ni contenido
  del audio; código/etapa e identificador técnico mínimo si corresponde.
- [ ] **4.2.3** Permitir reintentar eliminación tras éxito de inferencia sin repetir
  transcripción, estructura o persistencia. Conservar el resultado útil y avisar que
  la eliminación no fue confirmada.
- [ ] **4.3** Probar S4/S5 y combinaciones de transición/limpieza: causas distinguibles,
  ningún error secundario reemplaza al primario y ningún doble fallo desaparece.

scope_in: generate-note.ts, notes.service.ts, tipos Result/errores y consumidores necesarios; política de purge y pruebas.
scope_out: nuevo motor transaccional, SQLite, reestructuración de todos los errores del producto.
forbidden_areas: cambios a la tabla de transiciones para forzar éxito, saveChains y notas ajenas.
regression_risks: doble persistencia, error parcial mostrado como éxito total, pérdida de borrador y retención silenciosa de audio.

## Contrato de resultados

Aplicar D4 como unión discriminada coherente con Result<T>. No añadir flags dispersos
que permitan combinaciones contradictorias. El renderer/bridge debe conservar la
información; no convertir todo en `new Error(message)` si pierde noteId, fase o
posibilidad de recuperación necesaria. Adaptar únicamente consumidores atravesados.

Volver a aceptar una nota ya en el estado esperado debe conservar el comportamiento
soportado. Consultar estado y hacer la reconciliación idempotente cuando corresponda;
no llamar a una transición inválida y ocultar su excepción. Si la escritura falló,
no afirmar persistencia. Si la escritura funcionó y falla la transición, no duplicar
la nota durante recuperación ni generar un noteId nuevo por defecto.

El reintento de limpieza tendrá propietario, alcance y límite claros según D4. No
exponer un canal que acepte rutas arbitrarias desde renderer; derivar el recurso del
encuentro y del almacén confiable. No mantener ciclos infinitos ni presentar como
eliminado un archivo cuyo borrado falló. No volver a generar para eliminar un archivo.

## Matriz mínima de pruebas

| Inferencia / persistencia | Transición | Purge | Resultado requerido |
| --- | --- | --- | --- |
| Generación válida | válida | válido | Borrador normal, limpieza del propietario una vez |
| Inferencia falla | fallar estado también falla | falla | Error primario de inferencia preservado; dos causas secundarias observables |
| Generación válida | falla | válido | Fallo de transición explícito; no éxito normal |
| Generación válida | válida | falla | Resultado útil preservado con limpieza pendiente visible; retry sin inferencia |
| Nota persistida | falla | no aplica al save salvo diseño existente | Resultado persistido/inconsistente, mismo noteId al reconciliar |
| Escritura falla | no afirmar avance exitoso | no aplica | Error de escritura, sin falsa nota aceptada |

tests_required: yes
test_levels: unit, integration y flujo consumidor si cambia contrato visible
test_data_origin: synthetic
test_targets: S4/S5, doble/triple fallo, recuperación, save repetido y propagación por IPC/bridge.
oracle: matriz anterior y oráculos canónicos, sin omisión de causas ni duplicación de trabajo.
determinism_notes: errores de fs/puertos inyectados y promesas controladas; sin audio real.
stop_on_failure: true

commands_planned:

```sh
pnpm --filter oira-desktop exec vitest run src/main/application src/main/notes src/main/errors src/main/audio src/main/ipc src/renderer/bridge
pnpm typecheck
pnpm lint:desktop
```

## Revisión y entrega

Lethbridge: P4 resultado a nivel de dominio, P10 pruebas, P11 fallos explícitos. No
duplicar estos dos hallazgos como SRP ni iniciar una reforma general de logging.

entry_criteria: G3A/G3B aprobados, D4 y consumidores concretados, pruebas revisadas.
expected_outputs: diff de errores/recuperación, matriz ejecutada, contratos actualizados y G4.
handoff_to: A06 / WBS-5.
stop_conditions: resultado parcial no representable sin decidir alcance material o incompatibilidad no resuelta.
exit_criteria: S4/S5 y matriz pasan; información llega al consumidor y retry no repite acciones exitosas.
rollback_plan: forward-fix conservando notas persistidas y borradores; rollback de contrato solo coordinado con sus consumidores.

Actualizar principal con resultados exactos, archivos, decisiones, límites y ruta de
recuperación. Documentar cualquier cambio necesario a piezas protegidas.
