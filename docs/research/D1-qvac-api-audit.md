# D1 — Auditoría de API QVAC y allow-list para Oira

> **Estado:** investigación de escritorio, sin ejecución del SDK.  
> **Fecha de acceso:** 22 de agosto de 2026.  
> **Versión objetivo del producto:** `@qvac/sdk@0.17.1` (debe permanecer pineada y verificarse localmente antes de programar o correr el laboratorio).

## Decisión

Oira adopta una **allow-list mínima, versionada y de doble verificación**. Para el MVP de transcripción por lotes y estructuración local, los únicos símbolos de operación que un spike puede invocar son:

`loadModel`, `transcribe`, `completion`, `unloadModel` y, exclusivamente para cancelar una operación ya identificada, `cancel`.

El uso de `responseFormat.json_schema`, de cualquier clave de `generationParams`, de una constante de modelo o de un literal `modelType` queda **condicionado a que aparezca en los tipos instalados de 0.17.1**. Esta auditoría no autoriza adivinar sus campos a partir de documentación de otra versión. Tampoco se autoriza `transcribeStream` para P0.

La decisión conserva el flujo necesario para el producto —cargar modelo, transcribir, estructurar, validar en código y descargar— sin ampliar la superficie de API por conveniencia.

## Alcance y método

Se consultaron únicamente fuentes primarias de QVAC/Tether: la documentación oficial de JS/TS, Transcription y API, y el repositorio oficial de QVAC. No se ejecutó `npm`, no se descargó un modelo y no se usaron datos clínicos ni resultados de rendimiento.

La documentación pública consultada se presenta como API «v0.17.x (latest)» y remite a los `.d.ts` instalados para el detalle de parámetros. El repositorio oficial en su rama principal ya declara `@qvac/sdk@0.18.0`; por ello sirve para identificar superficies y rutas de revisión, **no** para convertir un detalle nuevo en un hecho sobre 0.17.1. Esta distinción es deliberada.

## Hechos confirmados

- **CONFIRMED:** `@qvac/sdk` es el cliente JS/TS de QVAC y su worker se ejecuta en proceso; la instalación oficial es `npm i @qvac/sdk`. [JS/TS SDK de QVAC](https://docs.qvac.tether.io/js-ts-sdk/)
- **CONFIRMED:** la ruta de transcripción documentada es `loadModel()` → `transcribe()` o `transcribeStream()` → `unloadModel()`. [Transcription de QVAC](https://docs.qvac.tether.io/ai-capabilities/transcription/)
- **CONFIRMED:** con `metadata: true`, la referencia pública v0.17.x documenta que `transcribe` devuelve segmentos con `append`, `endMs`, `id`, `startMs` y `text`; sin esa opción devuelve texto completo. [API Summary v0.17.x](https://docs.qvac.tether.io/reference/api/)
- **CONFIRMED:** `completion(params: CompletionParams)` devuelve un `CompletionRun`; sus superficies canónicas documentadas son `events` y `final`. La propia referencia marca los accesos de conveniencia `tokenStream`, `text`, `toolCallStream`, `toolCalls` y `stats` como deprecados. [API Summary v0.17.x](https://docs.qvac.tether.io/reference/api/)
- **CONFIRMED:** la sobrecarga de `transcribeStream` que recibe el audio completo por adelantado está deprecada y se eliminará en el siguiente major; no pertenece a P0. [API Summary v0.17.x](https://docs.qvac.tether.io/reference/api/)
- **CONFIRMED:** los descriptores de catálogo permiten a `loadModel` inferir `modelType` a partir de `modelSrc`; si no puede inferirlo, la referencia prescribe proporcionar un tipo canónico coincidente. [API Summary v0.17.x](https://docs.qvac.tether.io/reference/api/)
- **CONFIRMED:** existe `cancel({ requestId })`; el ciclo de descarga oficial ilustra que el identificador se expone de forma síncrona en la operación de carga/descarga. [Download lifecycle de QVAC](https://docs.qvac.tether.io/models/download-lifecycle/)

## Allow-list

| Símbolo | Uso permitido en Oira | Fuente primaria / archivo que debe contrastarse en 0.17.1 | Estado |
| --- | --- | --- | --- |
| `loadModel` | Cargar **un** descriptor de catálogo para STT o LLM; omitir `modelType` cuando el descriptor lo permita. | [API Summary](https://docs.qvac.tether.io/reference/api/); `node_modules/@qvac/sdk/dist/index.d.ts` | **CONFIRMED** para la función; configuración exacta **TODO** |
| `transcribe` | STT batch. Q1/Q2 deben solicitar `metadata: true` para conservar `id` y marcas temporales. | [API Summary](https://docs.qvac.tether.io/reference/api/); `dist/index.d.ts` y definición de transcripción instalada | **CONFIRMED** |
| `completion` | Estructuración transcript → candidato JSON; consumir `run.events` y `run.final`, no superficies legacy. | [API Summary](https://docs.qvac.tether.io/reference/api/); `dist/index.d.ts` y definición de completion instalada | **CONFIRMED** para la función/salida canónica |
| `unloadModel` | Liberar el modelo al terminar una etapa o al cerrar de forma controlada. | [JS/TS SDK](https://docs.qvac.tether.io/js-ts-sdk/); [Transcription](https://docs.qvac.tether.io/ai-capabilities/transcription/); `dist/index.d.ts` | **CONFIRMED** |
| `cancel` | Cancelación explícita de una operación cuyo `requestId` ya se obtuvo. No sustituye validación ni recuperación clínica. | [Download lifecycle](https://docs.qvac.tether.io/models/download-lifecycle/); `dist/index.d.ts` | **CONFIRMED** |
| Descriptor de catálogo | Fuente de modelo pasada a `loadModel`; preferida frente a URL manual para mantener la inferencia del engine. | [API Summary](https://docs.qvac.tether.io/reference/api/); contrato de modelos instalado | **CONFIRMED** como patrón |
| `responseFormat` | Sólo para Q3, **después** de confirmar su tipo exacto en 0.17.1. | `dist/index.d.ts` y el tipo de completion instalado | **TODO: VERIFY FROM OFFICIAL QVAC DOCUMENTATION** |
| `responseFormat: { type: 'json_schema', … }` | Candidato de Q3; no se autoriza como firma confirmada por esta investigación. | Definición instalada de completion en 0.17.1 | **TODO: VERIFY FROM OFFICIAL QVAC DOCUMENTATION** |
| `generationParams` y sus claves | Sólo claves presentes en el tipo instalado; no se infiere `temp`, `temperature`, `seed` ni controles de razonamiento desde memoria. | Definición instalada de completion en 0.17.1 | **TODO: VERIFY FROM OFFICIAL QVAC DOCUMENTATION** |
| `transcribeStream` | No usar en P0. Se evalúa separadamente para P1 y sin la sobrecarga de audio upfront. | [API Summary](https://docs.qvac.tether.io/reference/api/) | **NOT ALLOWED FOR P0** |
| API de diarización inventada (p. ej. `diarize()`) | Nunca usar. | No aparece como operación autorizada en las fuentes revisadas. | **NOT SUPPORTED FOR THIS PLAN** |

## Literales de `modelType`: regla de compatibilidad

Las fuentes oficiales actuales no son internamente homogéneas: la guía de transcripción muestra `"whisper"` y `"parakeet"`, mientras que la referencia de API enumera ejemplos de tipos canónicos de engine como `"whispercpp-transcription"` y `"parakeet-transcription"`. No se resuelve esa diferencia eligiendo uno por intuición.

**Decisión operativa:** en los tests con constantes de catálogo, pasar el descriptor y permitir la inferencia del engine. Si un caso usa una ruta local o una URL sin descriptor, el investigador debe copiar el literal aceptado desde `@qvac/sdk@0.17.1`; de otro modo, parar con `TODO: VERIFY FROM OFFICIAL QVAC DOCUMENTATION`.

## Superficies excluidas

Quedan fuera de esta allow-list: delegación/P2P, servidor HTTP compatible con OpenAI, RAG, plugins personalizados, recarga de configuración, logs de servidor, borrado de caché, streaming y cualquier API de diarización no documentada específicamente. Algunas podrán ser objeto de Q14–Q19, pero no son necesarias para Q1–Q6 ni deben entrar por arrastre.

También queda excluida toda inferencia remota. Que el SDK pueda descargar modelos o exponer otras capacidades no autoriza un fallback cloud ni el envío de audio, transcript o JSON clínico fuera del flujo local de Oira.

## Checklist obligatorio antes de laboratorio

1. Ejecutar `npm ls @qvac/sdk` y registrar la versión exacta; debe ser 0.17.1 o la investigación se invalida y se repite.
2. Abrir `node_modules/@qvac/sdk/dist/index.d.ts` y la definición distribuida de transcripción/completion; guardar el hash o la versión del paquete en el artefacto de Q1/Q3.
3. Verificar que las constantes de D2 están exportadas por esa instalación y que su descriptor declara el engine esperado.
4. Para Q1, confirmar en el tipo de configuración de Whisper que `language`, `translate` y el valor `'es'` son aceptados antes de ejecutar.
5. Para Q3, confirmar de forma literal el tipo de `responseFormat` y el nombre de cada clave de generación; no sustituirlos por equivalentes plausibles.
6. Si un paso falla, registrar el error exacto y no modificar esta allow-list sin una nueva cita oficial.

## Límites y bloqueos

**BLOCKED — NEEDS TARGET SDK/HARDWARE:** esta auditoría no puede declarar que 0.17.1 cargue un modelo, acepte `language: 'es'`, produzca JSON válido, preserve timestamps en el audio de consulta ni sea compatible con la máquina de demostración. Esas son Q1–Q6.

La ausencia de los `.d.ts` de 0.17.1 en este repositorio impide confirmar campos de `modelConfig`, `responseFormat` y `generationParams`. Este es un bloqueo de evidencia, no una licencia para completar firmas.

## Fuentes primarias

1. Tether/QVAC. [JS/TS SDK](https://docs.qvac.tether.io/js-ts-sdk/). Consultado el 2026-08-22.
2. Tether/QVAC. [Transcription](https://docs.qvac.tether.io/ai-capabilities/transcription/). Consultado el 2026-08-22.
3. Tether/QVAC. [API Summary — v0.17.x](https://docs.qvac.tether.io/reference/api/). Consultado el 2026-08-22.
4. Tether/QVAC. [Download lifecycle](https://docs.qvac.tether.io/models/download-lifecycle/). Consultado el 2026-08-22.
5. Tether/QVAC. [Repositorio oficial, paquete SDK](https://github.com/tetherto/qvac/blob/main/packages/sdk/package.json). Consultado el 2026-08-22; usado sólo para advertir que la rama principal ya no equivale al pin 0.17.1.
