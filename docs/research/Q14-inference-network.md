# Q14 — Red durante inferencia con modelo cacheado

## Ficha

| Campo | Valor |
|---|---|
| Prioridad | P2 — laboratorio |
| Estado | BLOCKED — NEEDS TARGET HARDWARE |
| Decisión solicitada | Elegir el nivel honesto de afirmación sobre red durante inferencia cacheada |
| SDK, modelo, sistema operativo y NIC | BLOCKED — NEEDS TARGET HARDWARE |
| Datos de prueba | Únicamente audio y texto sintéticos; sin PHI |

## Decisión de producto

No se autoriza la **Afirmación A** («no hay egreso inesperado» o equivalente) hasta ejecutar y conservar las capturas del protocolo en el equipo objetivo, con versión exacta de SDK y modelo ya cacheado.

Para la primera entrega se adopta la postura conservadora de la **Afirmación B**: no se usa lenguaje de «offline», «sin red», «air-gapped», «sin internet» ni promesas comparables. Esta postura no afirma que exista tráfico residual; simplemente evita convertir una hipótesis de laboratorio en una promesa de producto.

La información pública de QVAC no basta para inferir el tráfico de red de una carga de modelo, una transcripción o una completación. También debe separarse el prefetch inicial de las operaciones que se pretenden medir con recursos ya disponibles localmente.

## Hechos, límites y supuestos

### Confirmado por fuentes públicas

- QVAC publica un SDK y documentación para ejecutar capacidades de IA en dispositivos, pero estas páginas no constituyen una medición de paquetes del producto, de una versión concreta ni de un modelo concreto.
- El repositorio oficial de QVAC describe componentes y modalidades que incluyen capacidades de red entre pares. Por ello, «uso local» no puede transformarse en una garantía genérica de ausencia de comunicaciones.
- tcpdump documenta la captura de paquetes en una interfaz seleccionada; una captura sólo representa las interfaces, filtros y periodo que el ensayo haya registrado.

### No confirmado

- Si la caché del modelo ya poblada evita toda conexión de red.
- Si cargar el modelo, transcribir y completar tienen el mismo comportamiento de red.
- Si el SDK realiza resolución DNS, telemetría, actualización, verificación, P2P u otra comunicación.
- Qué interfaces, procesos o dependencias intervienen en el equipo objetivo.

### Supuestos de diseño, no hechos del SDK

- El equipo de laboratorio puede realizar la prueba en un host aislado y dispone de consola local o acceso fuera de banda antes de bajar la NIC.
- El equipo puede registrar de forma segura versión de SO, SDK, modelo, interfaz y hashes sin incluir datos de pacientes.

## Protocolo reproducible

1. Preparar un host de laboratorio aislado y anotar sistema operativo, versión exacta del SDK, modelo, hash o identificador de artefacto, fecha, proceso y todas las interfaces activas. No utilizar audio, transcripciones ni prompts clínicos reales.
2. Ejecutar el prefetch o la descarga necesaria por separado y conservar sólo metadatos técnicos de esa fase. Confirmar que el artefacto requerido está disponible antes de comenzar las mediciones cacheadas.
3. Elegir la interfaz de salida pertinente y comenzar una captura de línea base con tcpdump. Conservar el filtro, hora de inicio, PID si se conoce y un nombre de archivo de captura controlado.
4. En ejecuciones independientes y con la NIC activa, capturar: carga del modelo cacheado, transcripción de un audio sintético y completación con texto sintético. Para cada ejecución, registrar el resultado funcional y todo endpoint, DNS o paquete observado; no etiquetar nada como inesperado antes de definir el baseline.
5. Revisar las capturas y clasificar cada evento por destino, protocolo, proceso atribuible cuando sea posible y relación temporal con la operación. Si la atribución no es posible, marcarla como no atribuida, no como tráfico del SDK.
6. Tras verificar acceso local o fuera de banda, desactivar manualmente la NIC de prueba. Repetir carga, transcripción y completación usando la misma caché. Registrar éxito, error y mensajes técnicos sin incorporar contenido sensible.
7. Repetir el conjunto si cambian SDK, modelo, sistema, firewall, VPN, proxy o configuración de red. La conclusión sólo es válida para la combinación ensayada.
8. Almacenar capturas y notas de laboratorio con control de acceso. No publicar PCAP, trazas ni logs sin revisión, porque pueden contener metadatos sensibles.

## Registro de resultados

| Ejecución | Caché verificada | Operación | Interfaz y filtro | DNS/paquetes observados | Resultado funcional | Estado |
|---|---|---|---|---|---|---|
| Carga cacheada con NIC activa | BLOCKED — NEEDS TARGET HARDWARE | BLOCKED — NEEDS TARGET HARDWARE | BLOCKED — NEEDS TARGET HARDWARE | BLOCKED — NEEDS TARGET HARDWARE | BLOCKED — NEEDS TARGET HARDWARE | BLOCKED — NEEDS TARGET HARDWARE |
| Transcripción con NIC activa | BLOCKED — NEEDS TARGET HARDWARE | BLOCKED — NEEDS TARGET HARDWARE | BLOCKED — NEEDS TARGET HARDWARE | BLOCKED — NEEDS TARGET HARDWARE | BLOCKED — NEEDS TARGET HARDWARE | BLOCKED — NEEDS TARGET HARDWARE |
| Completación con NIC activa | BLOCKED — NEEDS TARGET HARDWARE | BLOCKED — NEEDS TARGET HARDWARE | BLOCKED — NEEDS TARGET HARDWARE | BLOCKED — NEEDS TARGET HARDWARE | BLOCKED — NEEDS TARGET HARDWARE | BLOCKED — NEEDS TARGET HARDWARE |
| Carga cacheada con NIC desactivada | BLOCKED — NEEDS TARGET HARDWARE | BLOCKED — NEEDS TARGET HARDWARE | BLOCKED — NEEDS TARGET HARDWARE | BLOCKED — NEEDS TARGET HARDWARE | BLOCKED — NEEDS TARGET HARDWARE | BLOCKED — NEEDS TARGET HARDWARE |
| Transcripción con NIC desactivada | BLOCKED — NEEDS TARGET HARDWARE | BLOCKED — NEEDS TARGET HARDWARE | BLOCKED — NEEDS TARGET HARDWARE | BLOCKED — NEEDS TARGET HARDWARE | BLOCKED — NEEDS TARGET HARDWARE | BLOCKED — NEEDS TARGET HARDWARE |
| Completación con NIC desactivada | BLOCKED — NEEDS TARGET HARDWARE | BLOCKED — NEEDS TARGET HARDWARE | BLOCKED — NEEDS TARGET HARDWARE | BLOCKED — NEEDS TARGET HARDWARE | BLOCKED — NEEDS TARGET HARDWARE | BLOCKED — NEEDS TARGET HARDWARE |

## Criterios de cierre

| Resultado reproducible | Redacción permitida |
|---|---|
| Las tres operaciones cacheadas se completan con la NIC de prueba desactivada y las capturas documentadas no muestran egreso atribuible en el alcance declarado | Puede evaluarse una afirmación estrecha y versionada: «en esta configuración de laboratorio, las operaciones probadas se completaron con la NIC de prueba desactivada». Requiere revisión antes de uso externo. |
| Hay paquetes, DNS, error al bajar la NIC o imposibilidad de atribuir el tráfico | Mantener la Afirmación B: no usar lenguaje de offline ni de ausencia de red. Documentar el hecho observado sin especular sobre su causa. |
| No hay hardware, caché verificable o capturas revisables | BLOCKED — NEEDS TARGET HARDWARE. No usar ninguna afirmación sobre comportamiento de red. |

## Riesgos y caveats

- Una NIC desactivada no prueba por sí sola la ausencia de comunicaciones por loopback, otra interfaz, VPN, proxy, adaptador virtual o proceso auxiliar. El alcance debe listar las interfaces observadas.
- El éxito de una ejecución cacheada no cubre la primera descarga, actualizaciones, cambios de modelo, reinicios ni configuraciones futuras.
- Las capturas son evidencia técnica sensible y no deben contener tráfico de producción ni ser tratadas como evidencia de cumplimiento normativo.
- Este informe no evalúa HIPAA, privacidad legal, certificaciones ni aislamiento físico.

## Fuentes

1. QVAC. Sitio y documentación oficiales. https://qvac.tether.io/
2. Tether. Repositorio oficial de QVAC. https://github.com/tetherto/qvac
3. The Tcpdump Group. Manual de tcpdump. https://www.tcpdump.org/manpages/tcpdump.1.html
4. Repositorio del proyecto, prompt IA/QVAC para Q14. docs/research/prompts/ai-qvac.md

## Próximo paso

Ejecutar el protocolo en hardware objetivo, adjuntar el registro sin datos sensibles y revisar la decisión antes de incorporar cualquier texto de privacidad o red al producto.
