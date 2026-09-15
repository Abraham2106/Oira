# FEATURE-PREPARATION

feature_id: OIRA-DESKTOP-DISTRIBUTION-001
feature_title: Instalación verificable y preparación inicial de modelos
status: blocked
owner_role: product-technical-planner
last_updated: 2026-09-14

## 1. Problem and goal

- [x] La iniciativa tiene un nombre y un alcance claros.
- [x] Problema: una persona externa no puede instalar Oira sin Node, pnpm, Git y herramientas de desarrollo.
- [x] Usuario principal: profesional que instala Oira en una computadora Windows sin entorno de desarrollo.
- [x] Valor: instalar la aplicación, comprobar el equipo y preparar modelos locales mediante un flujo explícito y recuperable.
- [x] No incluye autoactualización, macOS, Linux, publicación en Microsoft Store ni aprovisionamiento empresarial.

## 2. User intents

- [x] Instalar Oira desde un ejecutable firmado.
- [x] Saber quién publicó el instalador y si Windows validó su firma.
- [x] Comprobar compatibilidad, espacio y memoria antes de descargar.
- [x] Conocer qué modelos se descargarán, desde qué origen y cuánto ocupan cuando el dato sea verificable.
- [x] Iniciar la descarga de forma explícita y ver progreso real.
- [x] Reintentar tras pérdida de red sin descartar archivos ya válidos.
- [x] Verificar integridad antes de declarar un modelo listo.
- [x] Continuar a la configuración del micrófono solo cuando la preparación obligatoria termine.
- [x] Revisar posteriormente el estado desde Ajustes.
- [x] Salir sin iniciar una descarga.

### Primary flow

`Instalador de Windows -> Startup -> Preparar Oira -> Equipo listo -> Nueva consulta`

La pantalla `Preparar Oira` se omite en aperturas posteriores únicamente si Main confirma que los requisitos y ambos modelos siguen válidos.

### Error and edge cases

- Sin conexión antes de descargar: no iniciar y ofrecer `Reintentar`.
- Interrupción durante descarga: conservar solo datos parciales que el mecanismo real pueda reanudar con seguridad.
- Disco insuficiente: indicar requerido, disponible y acción de nueva comprobación.
- Hash o firma inválidos: no cargar el archivo; eliminar únicamente el artefacto inválido y descargarlo otra vez.
- Modelo presente pero corrupto: volver a verificación, nunca marcarlo listo.
- Firma del instalador no comprobable: mostrar `NO VERIFICADO`; no autodeclarar confianza.
- Total de bytes desconocido: mostrar progreso indeterminado, nunca porcentaje o ETA inventados.
- Hardware no soportado: bloquear el flujo clínico local y explicar el requisito faltante; no activar nube ni mock.

## 3. UI/UX

- [x] Punto de entrada: después de `StartupScreen` y antes de `DeviceReadyScreen`.
- [x] Patrón: una pantalla operativa de preparación, no modal ni asistente de varias páginas.
- [x] Secciones: Equipo, Modelos locales y Seguridad e integridad.
- [x] Acción primaria por estado: `Comprobar`, `Descargar y preparar`, `Reintentar` o `Continuar`.
- [x] Acción secundaria: `Salir`; no existe `Omitir` en producción QVAC.
- [x] Estados definidos: checking, blocked, ready_to_download, downloading, verifying, error y ready.
- [x] Recuperación: reintento por fase; nunca reiniciar una consulta porque la preparación ocurre antes del flujo clínico.
- [x] Accesibilidad prevista: foco visible, regiones `aria-live` para cambios, `progress` real y texto equivalente al color.
- [ ] Los tamaños, requisitos y nombre del publicador están aprobados. Bloqueado por A-PH-001, A-PH-003 y A-PH-004.

## 4. Technical design

- [x] Subsystems: empaquetado Electron, release CI, Main/config, QVAC, IPC/preload, renderer/i18n, settings, pruebas y atlas.
- [x] El renderer seguirá accediendo al sistema únicamente mediante `src/renderer/bridge/`.
- [x] Los payloads nuevos tendrán schemas Zod y canales centralizados.
- [x] La preparación tendrá estado propio de aplicación y no ampliará `ProductState`, que seguirá reservado al encuentro clínico.
- [x] La descarga permanecerá local-first y requerirá acción explícita en builds empaquetados.
- [x] Los secretos de firma vivirán fuera del repositorio y fuera de los artefactos de logs.
- [x] No se usarán mocks silenciosos; las pruebas emplearán adaptadores controlados y datos sintéticos.
- [x] El cambio estructural actualizará `docs/codebase-map.html` y su preview según `AGENTS.md`.
- [ ] El SDK QVAC confirma origen, progreso, reanudación, ubicación e integridad en builds empaquetados. Bloqueado por A-PH-004.
- [ ] Existe un manifiesto aprobado con IDs, versiones, tamaños y digests/firmas. Bloqueado por A-PH-003.

## 5. Verification

- [x] Criterios de aceptación y pruebas negativas están definidos en `TASK-PLAN.md`.
- [x] Niveles previstos: unit, integration, e2e, smoke y validación manual en Windows limpio.
- [x] Datos de prueba: exclusivamente sintéticos; ningún audio, transcripción o nota real.
- [x] Oracle de seguridad: firma Authenticode válida y digest/firma de cada modelo coincidente con el manifiesto aprobado.
- [x] Oracle UX: no se puede continuar mientras exista un bloqueo y la pantalla se omite solo tras una comprobación real satisfactoria.
- [x] Riesgos de regresión: preload CJS, arranque, carga QVAC, navegación, settings y permisos.
- [ ] Matriz exacta de Windows/hardware y umbrales aprobados. Bloqueado por A-PH-005.

## 6. Delivery and rollout

- [x] MVP: Windows x64, Electron Forge + `QvacForgePlugin`, candidato de instalador Windows unsigned, preparación explícita y dos modelos actuales.
- [x] Diferido: autoactualizador, otras plataformas, descarga en segundo plano y selección manual de modelos.
- [x] Feature flag: no; el gate se activa por estado persistido y evidencia actual de Main.
- [x] Rollback: retirar el release, revocar/rotar certificado si aplica y volver al flujo de desarrollo; nunca degradar a inferencia remota.
- [x] Entrega en una sola rama/PR para mantener código, atlas, documentación y evidencia sincronizados.
- [ ] Identidad legal, certificado, licencia y canal de publicación aprobados. Bloqueado por A-PH-001 y A-PH-002.

## Decisions

problem_statement: Oira no dispone de un instalador autocontenido ni de un primer inicio verificable para usuarios externos.
primary_user: Profesional en Windows x64 sin herramientas de desarrollo.
value: Instalación sencilla con evidencia de compatibilidad, consentimiento de descarga e integridad local.
mvp_slice: Candidato Windows unsigned generado por Electron Forge/QVAC más preparación inicial de Whisper y Qwen antes de Equipo listo.
deferred_scope: Autoactualización, Microsoft Store, macOS, Linux, administración remota y selección avanzada de modelos.
feature_flag: none
rollback: Retirar el artefacto publicado y revertir el cambio; no habilitar fallback cloud o mock.
required_artifacts: Instalador unsigned, manifiesto de modelos, pruebas, evidencia de estado de firma, captura UI, atlas y documentación.
wiki_updates: README.md, docs/BACKEND_DESKTOP_ARCHITECTURE_GUIDE.md, docs/codebase-map.html y docs/assets/codebase-map.png.

## Active alarms

### A-PH-001

alarm_type: placeholder
severity: critical
status: active
location: identidad y certificado de firma Authenticode
summary: No existe una identidad de publicador ni un certificado aprobados.
missing_to_replace: Nombre legal del publicador, tipo/proveedor de certificado, custodio y proceso de renovación/revocación.
replacement_target: Certificado de firma válido y secretos gestionados fuera del repositorio.
replacement_plan: El responsable de release aprueba proveedor y custodia; seguridad valida el procedimiento con un artefacto de prueba.
blocks: release, T-003 ready, feature complete

### A-PH-002

alarm_type: placeholder
severity: critical
status: active
location: licencia y autorización de distribución
summary: El repositorio no publica `LICENSE` y no está aprobada la distribución externa.
missing_to_replace: Licencia del proyecto y confirmación de redistribución de Electron, QVAC y modelos.
replacement_target: Decisión legal/documental registrada antes de publicar un instalador.
replacement_plan: Product owner y responsable legal revisan licencias y agregan los avisos requeridos.
blocks: release, feature complete

### A-PH-003

alarm_type: placeholder
severity: critical
status: needs_review
location: manifiesto de Whisper y Qwen
summary: El manifiesto HTTPS fijado ya contiene origen, versión, tamaño y SHA-256 LFS; falta la aprobación formal del owner de IA/QVAC y seguridad.
missing_to_replace: URL/origen, model ID, versión, tamaño, SHA-256 o firma y política de rotación para cada modelo.
replacement_target: Manifiesto versionado consumido y validado por Main, con aprobación formal registrada.
replacement_plan: El owner de IA/QVAC obtiene los datos del proveedor y seguridad aprueba el método de verificación.
blocks: T-004 ready, T-006 production integration, feature complete

### A-PH-004

alarm_type: placeholder
severity: blocking
status: active
location: comportamiento de `@qvac/sdk` 0.18.2 en builds empaquetados
summary: No está demostrado qué evidencia de descarga, progreso, cancelación, reanudación e integridad expone QVAC.
missing_to_replace: Resultado documentado y reproducible de un spike con la versión fijada del SDK.
replacement_target: Contrato real de provisioning sin porcentajes, reanudación o verificación ficticios.
replacement_plan: Ejecutar un spike empaquetado con modelos sintéticos o públicos no clínicos y registrar capacidades y límites.
blocks: T-004 ready, T-005 ready, feature complete

### A-PH-005

alarm_type: placeholder
severity: blocking
status: active
location: requisitos mínimos del equipo
summary: No existen umbrales medidos y publicables de RAM, disco, GPU y Windows.
missing_to_replace: Matriz reproducible de equipos y valores mínimos aprobados para los modelos seleccionados.
replacement_target: Requisitos usados por Main y copiados literalmente en UI/documentación.
replacement_plan: Medir carga y ejecución en la matriz acordada; documentar evidencia antes de publicar claims.
blocks: T-004 ready, T-006 production integration, release
