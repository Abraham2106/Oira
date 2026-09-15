# Prompt 05 — Aplicación transversal de los 11 principios de Lethbridge

task_id: WBS-5
owner_role: A06 / reviewer transversal
status_source: ../../../refactorr-agent.md
dependencies: WBS-4 done para cierre; criterios aplicados durante WBS-2–4
unblocks: WBS-6
RESUME_FROM: registro canónico / WBS-5 / 5.1
required_approvals: G5 auditoría por reviewer
max_review_loops: 2

## Mandato

Lee [el maestro](../../../refactorr-agent.md) y diffs/handoffs A02–A05. Audita solo
código cambiado y sus consumidores indispensables. Aplica los once principios según
la asignación suministrada por el usuario. No atribuirles citas académicas no verificadas.
No crear once refactors ni duplicar los cinco hallazgos bajo otros lentes.

scope_in: revisión de cambios WBS-2–4, evidencia y solicitudes acotadas de corrección.
scope_out: cambios funcionales nuevos, módulos periféricos y abstracciones especulativas.
forbidden_areas: editar código de otro agente durante auditoría sin devolverle la tarea.
expected_artifacts: matriz completada con rutas/líneas actuales, evidencia y veredicto por principio.

## 5.0 — Matriz de revisión

Las filas son criterios planificados, no aprobaciones. Al ejecutar, añadir evidencia y
veredicto a la bitácora o a este documento, señalando el SHA/diff revisado.

| task_id | # | Principio | Aplicación acotada | Evidencia exigida |
| --- | --- | --- | --- | --- |
| 5.1 | 1 | Divide and conquer | 2.1: normalización y validación independientes | Unidades y pruebas separadas, sin pasar inválidos por conversión |
| 5.2 | 2 | Increase cohesion | 2.3: verify-source valida trazabilidad | No absorbe normalización, UI o inferencia |
| 5.3 | 3 | Reduce coupling | 3.1: generación en curso por encuentro | Servicio usa puertos; no inspecciona estado interno QVAC |
| 5.4 | 4 | Work at a high level of abstraction | 4.1.2: resultado de inconsistencia | Estado de negocio tipado y consumido; sin flags contradictorios |
| 5.5 | 5 | Increase reusability | 3.2: wrapper de emisor | Un control común realmente usado por todos los canales |
| 5.6 | 6 | Reuse existing designs | Sin hallazgos que exijan tareas en este ciclo | Registrar «Sin hallazgos relevantes; sin cambio dedicado» |
| 5.7 | 7 | Design for flexibility | 2.5: procedencia y aportes del médico | Contrato discriminado, evolución explícita, sin borrar significado legacy |
| 5.8 | 8 | Anticipate obsolescence | Sin hallazgos que exijan tareas en este ciclo | Registrar «Sin hallazgos relevantes; sin cambio dedicado» |
| 5.9 | 9 | Design for portability | Sin hallazgos que exijan tareas en este ciclo | Registrar «Sin hallazgos relevantes; sin cambio dedicado» |
| 5.10 | 10 | Design for testability | 2.0–4.0: escenarios sintéticos | Oráculos causales, puertos inyectables, promesas deterministas |
| 5.11 | 11 | Design defensively | Fuentes, emisor IPC, concurrencia y errores | Rechazo o resultado parcial explícito; sin falsa evidencia/limpieza/guardado |

P7 no exige que cualquier tercer origen sea aceptado por el esquema actual. La
flexibilidad debe conservar invariantes y hacer explícita una ampliación del contrato.
P9 no exige inventar una campaña multiplataforma; sí registrar límites de las pruebas
ejecutadas sin afirmar portabilidad no demostrada.

## Procedimiento del auditor

1. Comprobar diffs reales contra el alcance congelado; separar cambios previos ajenos.
2. Leer con CodeGraph funciones tocadas y sus consumidores. Usar líneas actuales.
3. Por cada fila aplicable, registrar ruta, observación, prueba y veredicto. Si una
   observación ya corresponde a H1–H5, referenciarlo sin abrir otro hallazgo duplicado.
4. Revisar las seis piezas «Qué NO tocar». Si cambiaron, exigir motivo y prueba de
   preservación del comportamiento protegido.
5. Devolver defectos al propietario A02/A03/A04/A05 mediante LOG y subpaso concreto.
   Reabrir la WBS y bloquear cierre de dependientes; no arreglar a escondidas otra capa.
6. Cerrar G5 solo cuando la matriz tenga evidencia y no queden correcciones pendientes.

## Verification Strategy

tests_required: no nuevas pruebas por esta auditoría documental; revisar pruebas ejecutadas y pedir las faltantes.
test_levels: revisión estática y evidencia de unit/integration de WBS-2–4.
test_targets: diffs y aceptación, no todo el repositorio.
test_data_origin: synthetic para cualquier reejecución necesaria.
oracle: filas aplicables respaldadas; no cambios fuera del alcance ni hallazgos repetidos.
stop_on_failure: true
commands_planned: git diff --stat y git diff sobre límites comprobados; pruebas focalizadas solo si aparece una duda concreta.

entry_criteria: G4 cerrado y evidencias A02–A05 disponibles.
handoff_to: A07 / WBS-6, o propietario del defecto para corrección.
stop_conditions: evidencia ausente, cambio fuera del alcance, dos ciclos de revisión agotados.
exit_criteria: G5 aprobado y matriz con veredictos verificables; sin deuda escondida como cumplimiento.
rollback_plan: revertir solo correcciones documentales propias; las de código se devuelven al propietario.

Actualizar el principal indicando quién revisó realmente. Si no hubo independencia
de sesión respecto al implementador, dejar esa limitación explícita.
