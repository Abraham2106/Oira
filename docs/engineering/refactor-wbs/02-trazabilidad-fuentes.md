# Prompt 02 — Trazabilidad y procedencia clínica

task_id: WBS-2
owner_role: A02 / dominio
status_source: ../../../refactorr-agent.md
dependencies: WBS-1 done y G1 aprobado
unblocks: WBS-3
RESUME_FROM: registro canónico / WBS-2 / 2.1
required_approvals: G2 dominio, reviewer, tester
max_review_loops: 2
lens: OOP general → invariantes de dominio (H1)

## Mandato

Lee [el maestro](../../../refactorr-agent.md), el handoff de A01 y la decisión D1.
Corrige el guardrail de trazabilidad. Normalizar formato no debe convertir una salida
sin evidencia en una afirmación documentada. No implementes un verificador semántico
ni un segundo modelo: comprobar IDs no demuestra verdad clínica.

## WBS y aceptación

- [ ] **2.1** Separar normalización de validación; sus pruebas deben ser independientes.
- [ ] **2.1.1** `asSection` conserva la referencia inválida hasta validarla o devuelve
  error explícito. Nunca borrar missing y aceptar el texto sin evidencia.
- [ ] **2.1.2** Texto libre, salida truncada o contenido de thinking/raw no se promociona
  a una afirmación clínica válida. El parseo fallido llega como error al pipeline.
- [ ] **2.2** Endurecer el esquema: STATED de origen extraído exige fuente no vacía.
  Expresar la regla con el contrato de procedencia D1, no invalidar sin alternativa
  legítima los aportes nuevos del médico.
- [ ] **2.3** `verifySource` rechaza fuentes vacías en afirmaciones extraídas STATED y
  cualquier ID inexistente. No inventar IDs para superar la comprobación.
- [ ] **2.4** Mapear la salida generada inválida a `INVALID_STRUCTURED_OUTPUT` y usar
  los reintentos acotados existentes. No reintentar indefinidamente errores operativos.
- [ ] **2.5** Distinguir aporte nuevo del médico y afirmación extraída en tipos, esquemas,
  conversiones y consumidores necesarios. Conservar la distinción al editar/guardar.
- [ ] **2.6** S1 y S2 dejan de pasar; controles positivos de extracción y aporte médico
  explícito continúan funcionando, con revisión clínica y sin degradar trazabilidad.

## Límites y archivos candidatos

scope_in:

- `apps/desktop/src/main/structure/schema.ts`, `note-from-output.ts`, merge y consumidores reales.
- `apps/desktop/src/main/qvac/qwen-structuring.ts`.
- `apps/desktop/src/shared/schemas/clinical.schema.ts` y contrato IPC afectado.
- `apps/desktop/src/main/notes/verify-source.ts`, guardado y generación donde corresponda.
- `packages/types/src/index.ts`; renderer/bridge, edición, storage y exportación solo
  si sus contratos atraviesan la nueva procedencia.

scope_out: verificación semántica, nuevo LLM, nuevo sistema de almacenamiento y rediseño visual.
forbidden_areas: selector de inferencia, cambios de privacidad no demostrados y eliminación de confirmación médica.
regression_risks: notas previas, textos mixtos, secciones ausentes, exportación y atributos perdidos entre capas.

## Decisiones obligatorias de implementación

El origen no es sinónimo de `presence` ni de `reviewed`. El adaptador de inferencia no
puede aceptar que el propio modelo marque su salida como «aporte del médico» para
evitar las fuentes. Establecer la procedencia de generación desde código confiable.
El camino de edición humana debe ser explícito y validarse en Main; no basta con
añadir un booleano opcional que cualquier salida generada active.

Aplicar la representación discriminada elegida en D1 con el menor cambio viable.
No añadir un `string` abierto que permita orígenes arbitrarios para simular flexibilidad.
Agregar un tercer origen legítimo puede exigir ampliar el contrato y sus pruebas;
no prometer compatibilidad de lectores antiguos con valores que no conocen.

No atribuir retrospectivamente origen humano o evidencia a notas antiguas. Resolver
lectura legacy de forma explícita, conservar datos originales y exigir revisión donde
falte procedencia. Evitar una migración destructiva. No convertir silenciosamente
contenido inválido en NOT_STATED/UNKNOWN solo para devolver éxito.

## Verification Strategy

tests_required: yes
test_levels: unit, integration
test_data_origin: synthetic
test_targets: normalización, esquemas, verifySource, adaptador Qwen con runtime controlado, pipeline y save.
oracle: S1/S2 rechazados identificablemente; fuentes válidas y aporte humano explícito conservados.
negative_tests: fuentes vacías/missing, origen humano fingido por LLM, datos legacy, procedencia perdida, JSON inválido.
determinism_notes: salida Qwen inyectada; no GPU, modelos, red ni sleeps.
stop_on_failure: true

commands_planned:

```sh
pnpm --filter oira-desktop exec vitest run src/main/structure src/main/notes src/main/application/generate-note.test.ts src/main/qvac/qwen-structuring.test.ts src/main/ipc
pnpm typecheck
```

Añadir las pruebas concretas de consumidores identificados por A01; registrar sus rutas
antes de editar. Comprobar que el reintento se ejecuta el número configurado de veces,
que al agotarse no se guarda borrador inválido y que el éxito posterior válido funciona.
Validar edición, confirmación y exportación si cambian esos contratos.

## Revisión transversal y entrega

Lethbridge: P1 separación, P2 cohesión de verificación, P7 procedencia explícita,
P10 pruebas, P11 rechazo defensivo. Anotar evidencias para WBS-5 sin duplicar H1 bajo SOLID.

entry_criteria: D1 resuelto, tests/oráculos revisados, turno A02 adquirido.
expected_outputs: diff funcional, pruebas, política legacy, evidencia S1/S2 y G2.
handoff_to: A03 / WBS-3 / 3.1
stop_conditions: contrato de procedencia incompatible sin solución que preserve datos o ampliación material de alcance.
exit_criteria: G2 aprobado, pruebas ejecutadas y consumidor final conserva la procedencia.
rollback_plan: parche inverso solo del cambio propio; si hay datos nuevos, mantener lector compatible o forward-fix sin borrarlos.

Actualizar la bitácora principal con rutas reales, cambios, pruebas, revisión,
compatibilidad, alarmas y siguiente agente. No cerrar con solo tipos o documentación.
