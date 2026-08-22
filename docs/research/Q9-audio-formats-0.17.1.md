# Q9 — Formatos de audio del SDK fijado

**Estado:** investigación documental y protocolo; las constantes del SDK instalado y los ensayos están **BLOCKED — NEEDS TARGET HARDWARE**.  
**Decisión:** DEFER formatos aceptados y requisito de ffmpeg hasta imprimir exports de la versión instalada y ejecutar transcripción.  
**Fuentes consultadas:** 2026-08-22.

## 1. Evidencia documental

QVAC documenta que audioChunk admite ruta o buffer y publica ejemplos WAV. El ejemplo Parakeet TDT recomienda PCM mono de 16 kHz dentro de WAV [QVAC, Transcription](https://docs.qvac.tether.io/ai-capabilities/transcription/). La documentación de un addon Whisper describe formatos de configuración de decoder, incluyendo tokens de contenedor y representaciones PCM, pero esa documentación de addon no sustituye las constantes públicas del SDK que NotaLocal vaya a instalar [QVAC, transcription-whispercpp addon](https://docs.qvac.tether.io/addons/transcription-whispercpp/).

Los tokens de contenedor y los sample types/representaciones PCM son categorías distintas. No se publica una lista recordada de SUPPORTED_AUDIO_FORMATS ni de FORMATS_NEEDING_DECODE: solo el paquete fijado puede confirmarlas.

## 2. Preguntas

1. ¿Qué exporta exactamente el SDK fijado como SUPPORTED_AUDIO_FORMATS?
2. ¿Existe FORMATS_NEEDING_DECODE como export público y qué valores contiene?
3. ¿Qué formatos de captura funcionan como ruta/buffer para el motor elegido?
4. ¿ffmpeg se requiere siempre, solo para ciertos formatos/decodificación, o solo para ejemplos/documentación?
5. ¿Qué diferencia hay entre un contenedor declarado y una muestra PCM declarada por configuración?

## 3. Protocolo bloqueado

1. Partir del lockfile de R-1 y registrar versión exacta de SDK, Node y Electron.
2. En un script Main no clínico, imprimir SUPPORTED_AUDIO_FORMATS si se exporta públicamente. No importar miembros privados.
3. Imprimir FORMATS_NEEDING_DECODE solo si existe como export público; de lo contrario registrar “no exportado” sin deducir la razón.
4. Conservar salida literal, ruta de archivo de tipos y documentación/JSDoc correspondiente.
5. Probar, en dev y package, los formatos creados por R-2; registrar si la operación requiere decoder/herramienta y el error real.
6. Separar “aceptado”, “aceptado tras decode” y “no probado”; no convertir los nombres en garantía de compatibilidad.

| Ítem | Versión SDK | Export/documentación | Resultado dev | Resultado package | Ffmpeg | Decisión |
|---|---|---|---|---|---|---|
| SUPPORTED_AUDIO_FORMATS | BLOCKED — NEEDS TARGET HARDWARE | BLOCKED | | | | BLOCKED |
| FORMATS_NEEDING_DECODE, si existe | BLOCKED | BLOCKED | | | | BLOCKED |
| WAV PCM candidato R-2 | BLOCKED | BLOCKED | | | | BLOCKED |
| Otro formato de captura | BLOCKED | BLOCKED | | | | BLOCKED |

## 4. Afirmaciones prohibidas

No decir que todos los formatos requieren ffmpeg, que ninguno lo requiere, que una lista de addon es una lista de SDK, ni que s16le/f32le sean contenedores. No publicar formatos soportados sin la salida de la versión instalada.

## 5. Decisión

**DEFER.** El formato P0 continúa sujeto a R-2. La lista permitida y el rol de ffmpeg se decidirán solo con constantes exportadas/tipos del SDK fijado y pruebas empaquetadas.

## Bibliografía

1. QVAC by Tether. [Transcription](https://docs.qvac.tether.io/ai-capabilities/transcription/). Consultado el 2026-08-22.
2. QVAC by Tether. [transcription-whispercpp addon](https://docs.qvac.tether.io/addons/transcription-whispercpp/). Consultado el 2026-08-22.
3. QVAC by Tether. [System requirements](https://docs.qvac.tether.io/system-requirements/). Consultado el 2026-08-22.
