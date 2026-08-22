# Q15 — Contenido de logs del servidor y del SDK

## Ficha

| Campo | Valor |
|---|---|
| Prioridad | P2 — laboratorio |
| Estado | BLOCKED — NEEDS TARGET HARDWARE |
| Decisión solicitada | Elegir entre logs nunca en producción o métricas en nivel warn sólo si se demuestra ausencia de contenido |
| SDK, versión, plataforma y configuración | BLOCKED — NEEDS TARGET HARDWARE |
| Centinela sintético | ZXQ-SENTINEL-PARACETAMOL-7741 |
| Datos de prueba | Audio, transcript y completación exclusivamente sintéticos; sin PHI |

## Decisión de producto

La configuración predeterminada de producción será **logs del SDK/servidor desactivados**. La opción de métricas operativas en nivel warn no está aprobada todavía.

Sólo podrá reconsiderarse una configuración de métricas si se identifican claves y tipos documentados oficialmente y un ensayo controlado demuestra, para cada sumidero observado, que no aparece el centinela ni campos de contenido equivalentes. La falta de un resultado de búsqueda no prueba por sí sola que un log sea inocuo: se requiere además inspección de esquema y de muestras de cada flujo observado.

No se presupone que existan APIs, métodos o claves llamadas loggingStream o subscribeServerLogs. Esos nombres son objetivos de descubrimiento del prompt y sólo se usarán si aparecen en los tipos instalados o en la documentación oficial de la versión ensayada.

## Hechos, límites y supuestos

### Confirmado por fuentes públicas

- QVAC publica documentación y un repositorio oficial para su SDK. La disponibilidad de una documentación pública no identifica por sí sola las claves de logging de la versión instalada ni el contenido emitido en una ejecución real.
- La documentación de gestión de logs de NIST trata los registros como información que debe gestionarse a lo largo de su ciclo de vida. Esto refuerza que las capturas de laboratorio deben protegerse y revisarse antes de habilitar telemetría.
- El principio de minimización de datos requiere no registrar más información que la necesaria; no equivale a una afirmación de que cualquier nivel de log concreto sea seguro.

### No confirmado

- Qué exportaciones, configuraciones o niveles de log ofrece la versión instalada de QVAC.
- Si stdout, stderr, una transmisión de logs, una suscripción de servidor, el sistema operativo u otro proceso reciben texto de audio, transcript, prompt o completación.
- Si un modo warn, de existir, es sólo de métricas.
- Si logs o trazas llegan a disco, red, consola, recolector externo o más de un sumidero.

### Supuestos de diseño, no hechos del SDK

- El equipo puede realizar la prueba en hardware objetivo con credenciales y almacenamiento de laboratorio controlados.
- El centinela se incluye en una entrada sintética creada sólo para el ensayo y se elimina junto con sus salidas según el procedimiento local.

## Protocolo reproducible

1. Inventariar la versión exacta del SDK, el modelo, la plataforma y las rutas de los tipos instalados. Consultar primero la documentación y tipos oficiales disponibles en el entorno.
2. Buscar de forma estática símbolos relacionados con loggingStream, subscribeServerLogs, logger, log, warn y configuración. Por cada coincidencia, guardar ruta, versión y firma exacta. Si no existe un símbolo tipado o documentado, registrar «no localizado»; no invocar una API supuesta.
3. Elaborar una matriz de sumideros potenciales: stdout, stderr, archivos de log, consola del host, flujos del SDK sólo si están documentados, suscripciones sólo si están documentadas y cualquier recolector explícitamente configurado.
4. Con la configuración predeterminada, ejecutar una transcripción y una completación sintéticas que contengan exactamente ZXQ-SENTINEL-PARACETAMOL-7741. Capturar cada sumidero en un directorio de laboratorio protegido.
5. Si y sólo si las fuentes oficiales identifican una clave válida para un nivel operacional como warn, repetir el ensayo con esa clave exacta. Conservar la cita o ruta de tipo que demuestra el nombre; no adivinar opciones.
6. Buscar el centinela de manera exacta en todos los artefactos de cada ejecución y revisar manualmente estructuras, claves y muestras para detectar transcript, prompt, completación, audio codificado o campos que transporten contenido.
7. Documentar separadamente los resultados de cada sumidero, la retención temporal, destinos de red si existen y cualquier imposibilidad de inspección. Una salida opaca o inaccesible no se considera contenido libre.
8. Borrar los artefactos sintéticos conforme al procedimiento de laboratorio y mantener la producción con logs desactivados mientras no haya aprobación explícita basada en el resultado.

## Matriz de descubrimiento de configuración

| Elemento buscado | Fuente o ruta exacta | Firma o clave oficial | Resultado |
|---|---|---|---|
| loggingStream | BLOCKED — NEEDS TARGET HARDWARE | BLOCKED — NEEDS TARGET HARDWARE | BLOCKED — NEEDS TARGET HARDWARE |
| subscribeServerLogs | BLOCKED — NEEDS TARGET HARDWARE | BLOCKED — NEEDS TARGET HARDWARE | BLOCKED — NEEDS TARGET HARDWARE |
| Configuración de logger | BLOCKED — NEEDS TARGET HARDWARE | BLOCKED — NEEDS TARGET HARDWARE | BLOCKED — NEEDS TARGET HARDWARE |
| Nivel warn o equivalente | BLOCKED — NEEDS TARGET HARDWARE | BLOCKED — NEEDS TARGET HARDWARE | BLOCKED — NEEDS TARGET HARDWARE |

## Registro de resultados

| Ejecución y sumidero | Configuración documentada | Centinela encontrado | Revisión de campos de contenido | Destino/retención | Estado |
|---|---|---|---|---|---|
| Predeterminada: stdout | BLOCKED — NEEDS TARGET HARDWARE | BLOCKED — NEEDS TARGET HARDWARE | BLOCKED — NEEDS TARGET HARDWARE | BLOCKED — NEEDS TARGET HARDWARE | BLOCKED — NEEDS TARGET HARDWARE |
| Predeterminada: stderr | BLOCKED — NEEDS TARGET HARDWARE | BLOCKED — NEEDS TARGET HARDWARE | BLOCKED — NEEDS TARGET HARDWARE | BLOCKED — NEEDS TARGET HARDWARE | BLOCKED — NEEDS TARGET HARDWARE |
| Predeterminada: archivo/consola | BLOCKED — NEEDS TARGET HARDWARE | BLOCKED — NEEDS TARGET HARDWARE | BLOCKED — NEEDS TARGET HARDWARE | BLOCKED — NEEDS TARGET HARDWARE | BLOCKED — NEEDS TARGET HARDWARE |
| Flujo o suscripción documentados | BLOCKED — NEEDS TARGET HARDWARE | BLOCKED — NEEDS TARGET HARDWARE | BLOCKED — NEEDS TARGET HARDWARE | BLOCKED — NEEDS TARGET HARDWARE | BLOCKED — NEEDS TARGET HARDWARE |
| Nivel warn documentado, si existe | BLOCKED — NEEDS TARGET HARDWARE | BLOCKED — NEEDS TARGET HARDWARE | BLOCKED — NEEDS TARGET HARDWARE | BLOCKED — NEEDS TARGET HARDWARE | BLOCKED — NEEDS TARGET HARDWARE |

## Criterios de cierre

| Hallazgo | Decisión |
|---|---|
| El centinela o contenido equivalente aparece en cualquier sumidero | Logs del SDK/servidor nunca en producción. Abrir corrección de configuración o de proveedor antes de evaluar una excepción. |
| No se identifican claves oficiales, no se puede observar un sumidero o faltan capturas | BLOCKED — NEEDS TARGET HARDWARE. Mantener logs desactivados en producción. |
| Todas las claves usadas están documentadas, todos los sumideros se inspeccionan y no muestran el centinela ni campos de contenido en las ejecuciones versionadas | Puede solicitarse revisión para métricas operativas mínimas en nivel documentado. No es aprobación automática ni prueba para otras versiones o configuraciones. |

## Riesgos y caveats

- Este protocolo no afirma qué contenido registra el SDK; está diseñado precisamente para comprobarlo.
- Un centinela ausente no elimina el riesgo de datos indirectos, metadatos identificables, trazas de errores o sumideros que no se hayan inventariado.
- No se deben probar logs con pacientes, notas clínicas, audio real ni identificadores reales.
- La evidencia de un entorno no se transfiere automáticamente a otra versión de SDK, modelo, configuración, sistema operativo o recolector.
- Este informe no constituye asesoría jurídica ni certificación de cumplimiento.

## Fuentes

1. QVAC. Sitio y documentación oficiales. https://qvac.tether.io/
2. Tether. Repositorio oficial de QVAC. https://github.com/tetherto/qvac
3. NIST. Guide to Computer Security Log Management, SP 800-92. https://csrc.nist.gov/pubs/sp/800/92/final
4. Repositorio del proyecto, prompt IA/QVAC para Q15. docs/research/prompts/ai-qvac.md

## Próximo paso

Localizar los tipos y claves reales en el hardware objetivo y ejecutar el ensayo con el centinela. Hasta que la matriz esté completada y revisada, conservar logs del SDK/servidor desactivados en producción.
