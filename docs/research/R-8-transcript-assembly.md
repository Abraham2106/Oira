# R-8 — Ensamblado de transcript y semántica de streaming

**Estado:** investigación documental completada; observación de segmentos y eventos reales está **BLOCKED — NEEDS TARGET HARDWARE**.  
**Fuentes consultadas:** 2026-08-22.  
**Dependencias:** R-1 debe fijar la versión instalada del SDK; R-2 debe definir formato/captura de audio.  
**Objetivo:** decidir un camino P0 de batch seguro y determinar si el streaming P2 puede implementarse sin inventar la semántica de append e id.

## 1. Resumen y decisión

La documentación actual de QVAC distingue dos caminos: transcribe devuelve la transcripción completa como una sola cadena, mientras que transcribeStream ofrece resultados parciales mediante una sesión dúplex. La guía de transcripción especifica eventos tipados de texto incremental, segmento, VAD y fin de turno; el API summary además documenta sobrecargas antiguas de streaming con audio upfront como deprecadas [QVAC, Transcription](https://docs.qvac.tether.io/ai-capabilities/transcription/), [QVAC, API Summary](https://docs.qvac.tether.io/reference/api/).

No se encontró una fuente oficial que explique la semántica de negocio de los campos append e id para un TranscribeSegment concreto de la versión que NotaLocal instalará. Tampoco hay tipos instalados en este entorno. Por la regla del proyecto, no se puede inventar si append significa concatenar, reemplazar, corregir una hipótesis anterior o cualquier otra operación; tampoco se puede asignar semántica a id.

**Decisión P0: usar transcripción batch y persistir únicamente la cadena completa devuelta por transcribe, junto con metadatos propios de NotaLocal.** No se usa append/id en P0.  
**Decisión P2: DEFER streaming.** No se implementa ensamblador de parciales hasta capturar eventos reales y compararlos contra una transcripción completa para el mismo audio no clínico.

## 2. Evidencia oficial

QVAC indica que el audio puede llegar como audioChunk, ya sea ruta de archivo o buffer en memoria. La misma guía dice que transcribe produce una cadena completa y que transcribeStream entrega parciales en tiempo real [QVAC, Transcription](https://docs.qvac.tether.io/ai-capabilities/transcription/).

Para la sesión dúplex, QVAC documenta que se escriben chunks de audio en la sesión y se itera sobre eventos. La unión discriminada documentada incluye:

- texto incremental;
- metadata de segmento, solo para whisper cuando metadata se solicita;
- estado VAD, también de whisper;
- endOfTurn de whisper con silencio medido;
- endOfTurn de Parakeet motivado por token EOU.

QVAC especifica que la variante whisper de endOfTurn lleva duración de silencio y que la Parakeet no la lleva; también advierte que versiones antiguas de server y client pueden diferir respecto de source. Eso es evidencia para registrar y versionar eventos, no para deducir que cualquier texto incremental es definitivo.

El API summary actual documenta seis sobrecargas de transcribeStream. Las de audio upfront se describen como deprecadas y recomiendan usar transcribe para audio completo. Para streaming bidireccional, el texto dice que la sesión es de un solo uso y que transcripción se obtiene mientras el VAD detecta segmentos completos de habla [QVAC, API Summary](https://docs.qvac.tether.io/reference/api/).

## 3. Lo que sigue sin estar verificado

No se ha verificado para el SDK que se instalará:

| Pregunta | Estado |
|---|---|
| Forma exacta de TranscribeSegment en archivos de tipos instalados | TODO: VERIFY FROM OFFICIAL QVAC DOCUMENTATION / installed types |
| Existencia, tipo y semántica de append | TODO: VERIFY FROM OFFICIAL QVAC DOCUMENTATION / installed types |
| Existencia, tipo, monotonía y alcance de id | TODO: VERIFY FROM OFFICIAL QVAC DOCUMENTATION / installed types |
| Si textos parciales pueden corregirse, repetirse o retroceder | BLOCKED — NEEDS TARGET HARDWARE |
| Relación entre eventos segment y texto para cada motor | BLOCKED — NEEDS TARGET HARDWARE |
| Correlación de endOfTurn/VAD con el texto persistible | BLOCKED — NEEDS TARGET HARDWARE |
| Compatibilidad entre la versión client/server/worker fijada | BLOCKED — NEEDS TARGET HARDWARE |

Por ello no se declara que concatenar eventos de texto sea correcto, ni que un identificador permita deduplicar. Tampoco se declara que una frontera de turno sea una frontera clínica.

## 4. Algoritmo normativo P0: batch

P0 no requiere streaming. El algoritmo de NotaLocal debe:

1. guardar un identificador de operación propio y la ruta temporal o referencia de audio propia;
2. enviar el audio completo por el camino documentado y recibir la transcripción final;
3. validar que el resultado es una cadena dentro de los límites definidos por NotaLocal;
4. persistir una única revisión de transcript propia, con timestamp, modelo/pin conocidos y estado de operación;
5. no inferir campos de QVAC que no estén confirmados en la versión instalada;
6. no concatenar, reemplazar ni deduplicar parciales porque no habrá parciales en P0;
7. si ocurre error/cancelación, conservar un error tipado propio sin convertir contenido clínico en logs.

La “revisión” de NotaLocal es un concepto de dominio propio y no equivale a append ni id del SDK. Este diseño no afirma ninguna firma de QVAC y permite que R-2 defina después la entrada de audio.

## 5. Streaming P2: condición de entrada

Streaming es una mejora de UX, no un requisito de P0. Si se reabre P2, el ensamblador deberá operar como una máquina de estados propia, pero su regla de transición se elegirá solo tras observar los tipos instalados y eventos reales. Debe separar claramente:

- texto tentativo que se muestra pero no se persiste como final;
- resultado definitivo solo si la evidencia del SDK/modelo lo permite;
- cambios de turno como señal del motor, no aprobación clínica;
- segmentos y metadatos como datos de diagnóstico con retención mínima;
- finalización/cancelación/error como estados de operación propios.

La documentación permite distinguir source de endOfTurn y tratar los dos motores con cautela, pero no autoriza asumir la semántica de edición de parciales. La app no debe autoaprobar, exportar ni reemplazar una nota por un evento de streaming.

## 6. Protocolo de laboratorio bloqueado

Con el pin de R-1, el audio/captura de R-2 y material no clínico:

1. Copiar desde los tipos instalados la definición completa de TranscribeSegment, con ruta de archivo, versión y hash del lockfile.
2. Ejecutar batch con metadata cuando esté documentado y guardar la salida sin editar.
3. Ejecutar transcribeStream una vez por motor/configuración relevante y registrar la secuencia cruda de eventos en JSON, conservando el orden y tipos.
4. Ejecutar el mismo audio en batch; comparar el resultado final con ensambladores candidatos, sin declarar equivalencia si difiere.
5. Probar al menos habla continua, silencios, reinicio, cancelación y entrada corta; usar frases no clínicas.
6. Identificar si append/id aparecen, y documentar solo su comportamiento observado y el tipo oficial instalado.
7. Repetir tras package, porque el stack SDK/worker debe ser el mismo que se distribuye.

| Prueba | Resultado |
|---|---|
| Tipos instalados | BLOCKED — NEEDS TARGET HARDWARE / R-1 pin |
| Log batch | BLOCKED — NEEDS TARGET HARDWARE |
| Log streaming Whisper | BLOCKED — NEEDS TARGET HARDWARE |
| Log streaming Parakeet, si entra en alcance | BLOCKED — NEEDS TARGET HARDWARE |
| Bakeoff contra cadena batch | BLOCKED — NEEDS TARGET HARDWARE |
| Validación en paquete | BLOCKED — NEEDS TARGET HARDWARE |

## 7. Datos propios que se pueden persistir

Mientras P0 opere en batch, NotaLocal puede persistir conceptos propios: identificador de encuentro, identificador de operación, timestamp, versión de app, pin/modelo confirmados, estado de transcripción y texto final. R-2/R-5/R-6 determinan la forma segura de audio, cifrado y directorio; R-8 no autoriza almacenar eventos crudos de streaming con contenido clínico más allá de una necesidad depurada y con retención definida.

## 8. Afirmaciones prohibidas

No afirmar que el SDK garantiza que los parciales nunca se duplican; que append significa concatenar; que id es global o monotónico; que endOfTurn equivale al final clínico de una conversación; que streaming es tan exacto como batch; ni que los eventos observados en una versión aplican a otra.

## 9. Decisión

**P0: batch con la cadena completa de transcribe. P2: streaming DEFER.**  
La documentación apoya los dos modos, pero no resuelve la semántica de append/id que el repositorio exige para un ensamblador robusto. Hasta instalar el SDK fijado y ejecutar el protocolo, no habrá algoritmo de concatenación ni persistencia de parciales como verdad final.

## Bibliografía

1. QVAC by Tether. [Transcription](https://docs.qvac.tether.io/ai-capabilities/transcription/). Consultado el 2026-08-22.
2. QVAC by Tether. [API Summary](https://docs.qvac.tether.io/reference/api/). Consultado el 2026-08-22.
3. QVAC by Tether. [Build an Electron app](https://docs.qvac.tether.io/tutorials/electron/). Consultado el 2026-08-22.
