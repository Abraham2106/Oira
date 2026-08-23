# R-2 — Formato de audio y ruta de captura

**Estado:** evidencia documental completada; elección canónica y aceptación por modelo están **BLOCKED — NEEDS TARGET HARDWARE**.  
**Dependencias:** R-1 (pins/paquete QVAC) y un modelo de transcripción descargable.  
**Fuentes consultadas:** 2026-08-22.

## 1. Resumen y decisión

QVAC documenta que la entrada de transcripción se entrega como audioChunk, ya sea una ruta de archivo o un buffer en memoria. En ejemplos oficiales aparecen un WAV de 16 kHz y, para Parakeet TDT, la indicación de audio PCM mono de 16 kHz dentro de un contenedor WAV [QVAC, Transcription](https://docs.qvac.tether.io/ai-capabilities/transcription/). Eso es evidencia de un formato usado por ejemplos, no una prueba de que sea el único formato aceptado ni de que el navegador capture exactamente ese formato.

**Decisión: DEFER la elección del formato canónico y del camino MediaRecorder frente a AudioWorklet.** Para P0 se prepara el candidato WAV PCM mono 16 kHz, escrito y validado en Main, pero solo será la decisión final si supera el laboratorio con el SDK/versiones fijados. No se inventan constantes de formatos, opciones de transcribe ni disponibilidad de ffmpeg.

## 2. Hallazgos documentales

La guía de QVAC declara que transcribe produce una cadena completa y que audioChunk puede ser ruta o buffer. El ejemplo Whisper usa un archivo sample-16khz.wav; el ejemplo Parakeet TDT dice que el audio debería ser PCM mono 16 kHz en WAV. La documentación no convierte ese ejemplo en una allow-list general para todos los motores o versiones.

Esto preserva dos posibilidades de laboratorio: una ruta a WAV emitido por la app y una entrada en memoria cuando los tipos instalados lo documenten. No se decide si WebM/Opus de MediaRecorder será aceptable, ni se asume un decodificador interno.

## 3. Riesgos de captura

- MediaRecorder puede producir formatos de contenedor/códec distintos del candidato WAV; necesita una prueba de bytes, duración, canales y resultado de transcripción.
- AudioWorklet puede permitir construir PCM/WAV bajo control de la app, pero su implementación y sincronización deben probarse en Electron real.
- El renderer no debe escribir directamente datos clínicos a ubicaciones arbitrarias ni importar QVAC. Main valida una estructura propia y administra el temporal.
- La ruta de audio, buffer y formato que acepte el SDK solo se toman de documentación/tipos de la versión instalada; no de nombres internos o suposiciones.

## 4. Contrato propio propuesto

Sin atribuirlo al SDK, Oira puede definir una operación propia pushAudioChunk con: identificador de operación, bytes o referencia temporal controlada por Main, formato declarado por la aplicación, duración estimada y secuencia. Main valida límites, crea el WAV temporal si la decisión final lo exige y entrega al adaptador únicamente la forma confirmada de QVAC. Este contrato no expone Node ni rutas arbitrarias al renderer.

## 5. Matriz de laboratorio

| Entrada | SDK/tipos | Dev | Package + QVAC | Calidad/transcripción | Decisión |
|---|---|---|---|---|---|
| WAV PCM mono 16 kHz creado por Main | BLOCKED — NEEDS TARGET HARDWARE | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| MediaRecorder WebM/Opus sin conversión | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| AudioWorklet a PCM/WAV | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| Buffer en memoria, si tipos oficiales lo permiten | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED |

## 6. Protocolo bloqueado

1. Conservar tipos instalados y pin de R-1; copiar únicamente constantes/firma documentadas.
2. Generar clips no clínicos equivalentes con cada ruta de captura.
3. Verificar cabecera, frecuencia, canales, tamaño y duración con herramientas locales.
4. Ejecutar transcripción batch en Main, registrar salida/error íntegros y repetir en paquete.
5. Comparar compatibilidad y facilidad de borrado temporal; no medir precisión clínica ni publicar cifras sin corpus aprobado.
6. Elegir un formato solo si el ganador funciona en dev y paquete junto al stack QVAC.

Todos los pasos están **BLOCKED — NEEDS TARGET HARDWARE**.

## 7. Afirmaciones prohibidas

No afirmar que QVAC acepta WebM/Opus, que cualquier PCM se acepta como buffer, que ffmpeg está disponible, ni que 16 kHz mono WAV es una regla universal. Tampoco prometer streaming: P0 es batch.

## 8. Decisión

**DEFER.** Candidato de prueba: WAV PCM mono 16 kHz en contenedor WAV. La decisión canónica, las firmas del SDK y la ruta de captura quedan pendientes de los tipos instalados y de una prueba empaquetada.

## Bibliografía

1. QVAC by Tether. [Transcription](https://docs.qvac.tether.io/ai-capabilities/transcription/). Consultado el 2026-08-22.
2. QVAC by Tether. [Build an Electron app](https://docs.qvac.tether.io/tutorials/electron/). Consultado el 2026-08-22.
