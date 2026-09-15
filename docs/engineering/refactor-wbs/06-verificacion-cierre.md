# Prompt 06 — Verificación integral, documentación y cierre

task_id: WBS-6
owner_role: A07 / tester y docs_sync
status_source: ../../../refactorr-agent.md
dependencies: WBS-5 done
unblocks: entrega final
RESUME_FROM: registro canónico / WBS-6 / 6.1
required_approvals: G6 verificación, revisión final y docs_sync
max_review_loops: 2

## Mandato

Lee [el maestro](../../../refactorr-agent.md), G1–G5 y los cambios reales. Verifica el
resultado integrado. No declarar que todos los casos deben devolver error: compartir
una generación válida y conservar un borrador con limpieza pendiente son resultados
correctos cuando cumplen el contrato explícito.

## WBS y criterios de cierre

- [x] **6.1** Ejecutar suite completa actual más las nuevas pruebas; las 57 históricas
  pertenecen a siete archivos seleccionados. Registrar recuentos reales, fallos,
  skips y limitaciones. No excluir tests para mantener el número esperado.
- [x] **6.2** Reejecutar S1–S5 y S6 con el diff integrado. Comparar con el «antes» de
  A01 y los oráculos canónicos; comprobar caminos positivos y negativos.
- [x] **6.3** Revisar «Qué NO tocar» con evidencia por comportamiento, no solo git diff.
- [x] **6.4** Crear write-up de decisiones bajo docs/research/ con ID libre comprobado;
  actualizar docs realmente afectadas y su índice si corresponde.
- [x] **6.5** Preparar PR con motivación, límites, cambios y protección del comportamiento
  conforme a Contribuir del README. Publicar solo si la ejecución tiene esa autorización.

scope_in: verificación, correcciones devueltas a propietarios, documentación y PR revisable.
scope_out: ampliar funcionalidad, publicar claims clínicos/de rendimiento, merge o despliegue no autorizado.
forbidden_areas: secretos, audio real, falsa aprobación, bypass de tests, cambios ajenos.
expected_artifacts: resultados completos, comparación S1–S6, write-up existente y borrador o enlace real de PR.

## Verification Strategy

tests_required: yes
test_levels: unit, integration, smoke Electron para frontera y consumidores modificados.
test_data_origin: synthetic
test_targets: suite completa, contratos compartidos, preload CJS, pipeline y consumidores de resultados parciales/procedencia.
oracle: cero fallos obligatorios pendientes; S1–S6 cumplen el maestro; comportamiento protegido preservado.
stop_on_failure: true

commands_planned:

```sh
pnpm test
pnpm typecheck
pnpm lint:desktop
pnpm --filter oira-desktop build
git diff --check
git status --short
```

Añadir ejecución concreta del harness S1–S6 y smoke definido por A04; los nombres de
archivos y comandos vienen de los handoffs reales, no de rutas supuestas. Verificar
que typecheck cubre tsconfig.node.json y tsconfig.web.json. No atribuir cobertura de
ESLint a preload cuando el script no lo incluye.

No afirmar que un build demuestra seguridad IPC en runtime ni que tests con dobles
ejecutan QVAC real. Si se realiza un smoke con modelos ya disponibles, identificar
equipo, versión y datos sintéticos; no descargar modelos ni publicar mediciones por
iniciativa de este plan. Un bloqueo de entorno obligatorio impide G6; dejarlo claro.

## No regresión protegida

| Decisión | Evidencia requerida |
| --- | --- |
| Selector y puertos | Mock sigue funcionando y QVAC sigue conectado a Qwen; contratos no alterados incidentalmente |
| Preload acotado | Métodos explícitos, sin ipcRenderer/evento expuesto; carga CJS y desuscripción |
| Copias canónicas | Mutación del resultado no modifica borrador, transcripción ni resultado de otro consumidor |
| Guardado clínico | Sin confirmación o sin borrador no se acepta; procedencia no evita guardrails |
| Aceptaciones serializadas | Guardados simultáneos/repetidos mantienen una nota vigente y recuperación idempotente |
| Transiciones | Tabla no relajada; fallos ahora observables y estados coherentes cuando la operación sí termina |

## Write-up y PR

Leer docs/research/README.md e inventariar IDs antes de escoger nombre. Documentar
decisiones finales sobre procedencia, legacy, wrapper IPC, propiedad de generación,
resultados parciales y recuperación de limpieza. Citar rutas/commits reales y fuentes
primarias cuando se formulen afirmaciones externas. No presentar investigación futura
como completada ni eliminación de alucinaciones como resultado de validar IDs.

El PR debe explicar el disparador y el antes/después de cada hallazgo sin duplicarlos
por lente. Incluir alcance final, compatibilidad, controles ejecutados, limitaciones y
rollback. Si solo se prepara localmente, guardar el borrador en una ruta elegida y
registrada como existente; no inventar URL. El README requiere motivación, límites y
cómo se protege el comportamiento, no un formato más amplio inventado.

## Contrato y cierre de cadena

entry_criteria: G5 aprobado, sin tareas reabiertas y diffs integrados.
handoff_to: usuario / responsable de publicación si queda una acción externa pendiente.
stop_conditions: prueba obligatoria fallida, evidencia incompleta o publicación que requiera autoridad no concedida.
exit_criteria: 6.1–6.4 verificadas y 6.5 entregado según autoridad; G6 y registro coherentes.
rollback_plan: devolver defectos al agente propietario; mantener notas/datos y evidencia; nunca reset destructivo.

Si solo falta publicar, distinguir `implementation_verified` de `publication_pending`
en el LOG. No marcar 6.5 publicado ni todo WBS-6 done si el alcance ejecutado requería
publicación y aún no ocurrió. Puede entregarse el paquete local verificado dejando
WBS-6 pendiente de esa acción concreta.

Añadir LOG final con archivos, comandos, resultados, revisores reales, decisiones,
artefactos y cualquier bloqueo. Solo con todos los criterios cumplidos actualizar
`active_agent: none`, `active_task: none`, `next_agent: none`, `next_task: none` y
`RESUME_FROM: cierre completado`; en otro caso indicar exactamente dónde retomar.
