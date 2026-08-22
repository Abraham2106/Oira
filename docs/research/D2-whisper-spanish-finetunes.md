# D2 — Elegibilidad de Whisper para español: fine-tune frente a tiny genérico

> **Estado:** investigación de escritorio; no selecciona el STT por defecto.  
> **Fecha de acceso:** 22 de agosto de 2026.  
> **Pin del producto a revalidar:** `@qvac/sdk@0.17.1`.

## Decisión

Para Q1 y Q2, las únicas dos candidatas iniciales son:

1. `WHISPER_SPANISH_TINY_Q8_0`
2. `WHISPER_TINY`

La primera se evalúa por llevar un descriptor de catálogo específico de español; la segunda, como baseline genérico solicitado por el protocolo. **Esta decisión no afirma que ninguna transcriba español clínico con calidad suficiente, ni elige la constante por defecto.** Esa decisión sólo puede salir de Q2 tras la evaluación de los 13 casos sintéticos y sus métricas bloqueantes.

Toda constante cuyo nombre sea `WHISPER_EN_*` queda excluida del experimento español por política de producto, no por una estimación de calidad. `WHISPER_SMALL_Q8_0` queda reservada como escalamiento explícito si ambas candidatas iniciales fallan Q2; no se añade un modelo externo u oficioso.

## Alcance y método

Se revisaron solamente fuentes oficiales de QVAC/Tether:

- la documentación oficial de transcripción y de la API;
- el contrato de modelos publicado en el repositorio oficial de QVAC.

No se consultaron model cards, benchmarks, papers ni blogs. Por tanto, este documento **no contiene** afirmaciones de WER, exactitud en español, calidad médica, robustez a acentos, rendimiento o memoria. Si se incorporan más adelante, deben etiquetarse como **UNVERIFIED** para QVAC salvo que procedan de una corrida reproducible de NotaLocal.

Hay una limitación importante de versionado: el contrato oficial consultado corresponde al commit actual del repositorio de QVAC y su `package.json` declara 0.18.0, mientras que NotaLocal pretende fijar 0.17.1. Los tamaños y SHA que siguen son hechos del snapshot consultado; **no se trasladan automáticamente al pin de NotaLocal**. Antes de ejecutar Q1 o Q2 hay que leer el registro/tipos efectivamente instalados.

## Hechos confirmados sobre la superficie QVAC

- **CONFIRMED:** QVAC documenta que Whisper es una de las dos rutas de ASR, junto con Parakeet, y que el ciclo de transcripción es cargar un modelo, transcribir y descargarlo. [Transcription de QVAC](https://docs.qvac.tether.io/ai-capabilities/transcription/)
- **CONFIRMED:** la transcripción batch acepta audio por ruta o buffer y, con `metadata: true`, la referencia pública v0.17.x expone segmentos con texto, id y marcas temporales. Esto hace a Whisper un candidato compatible con la necesidad de grounding temporal de NotaLocal, pero no prueba precisión. [API Summary v0.17.x](https://docs.qvac.tether.io/reference/api/)
- **CONFIRMED:** el ejemplo oficial de Whisper muestra `WHISPER_TINY` como descriptor de catálogo y carga mediante `loadModel`. El ejemplo usa `language: 'en'`; ese ejemplo **no** demuestra la aceptación o el efecto de `'es'`. [Ejemplo oficial de Whisper en Transcription](https://docs.qvac.tether.io/ai-capabilities/transcription/)
- **CONFIRMED, snapshot actual solamente:** el contrato oficial de modelos contiene entradas de catálogo llamadas `WHISPER_TINY` y `WHISPER_SPANISH_TINY_Q8_0`, ambas con addon `whisper` y engine `whispercpp-transcription`. [Contrato de modelos de QVAC](https://github.com/tetherto/qvac/blob/975b36ea3975e98cff8e1d00354bdfaa8da5c93a/packages/sdk/contract/models.json)

## Registro de candidatas

La siguiente tabla transcribe metadatos del contrato oficial **en el snapshot indicado**. Son datos de distribución; no son mediciones de RAM, velocidad ni exactitud. Para no inducir una falsa equivalencia, el campo «confirma para 0.17.1» se mantiene como pendiente.

| Constante | Descriptor de origen del snapshot oficial | Tamaño esperado (bytes) | SHA-256 del snapshot | Addon / engine | ¿Confirmada para 0.17.1? | Elegibilidad |
| --- | --- | ---: | --- | --- | --- | --- |
| `WHISPER_SPANISH_TINY_Q8_0` | `registry://s3/qvac_models_compiled/ggml/whisper-spanish/2026-03-05/es-tiny-ggml-model-q8_0.bin` | 43,537,433 | `e18a4e2374b5f91505cb1a1fd08b89b44d7dc0d5f70c6fc5a2e483cb8281bc91` | `whisper` / `whispercpp-transcription` | No; verificar instalación | **Elegible** para Q1/Q2 |
| `WHISPER_TINY` | `registry://hf/ggerganov/whisper.cpp/resolve/5359861c739e955e79d9a303bcbc70fb988958b1/ggml-tiny.bin` | 77,691,713 | `be07e048e1e599ad46341c8d2a135645097a538221678b7acdd1b1919c6e1b21` | `whisper` / `whispercpp-transcription` | No; verificar instalación | **Elegible** como baseline para Q1/Q2 |
| `WHISPER_SMALL_Q8_0` | `registry://hf/ggerganov/whisper.cpp/resolve/5359861c739e955e79d9a303bcbc70fb988958b1/ggml-small-q8_0.bin` | 264,464,607 | `49c8fb02b65e6049d5fa6c04f81f53b867b5ec9540406812c643f177317f779f` | `whisper` / `whispercpp-transcription` | No; verificar instalación | **No P0 inicial**; escalamiento de Q2 |

Fuente de todos los valores de la tabla: [contrato de modelos oficial de QVAC, commit 975b36e](https://github.com/tetherto/qvac/blob/975b36ea3975e98cff8e1d00354bdfaa8da5c93a/packages/sdk/contract/models.json), consultado el 2026-08-22.

## Exclusiones

| Grupo | Estado | Razón |
| --- | --- | --- |
| `WHISPER_EN_*` | **ASSUMPTION / política de elegibilidad** | El objetivo de NotaLocal es habla médica española. Un descriptor etiquetado explícitamente como inglés no forma parte del baseline español. Confirmar su presencia/nombre en 0.17.1 no cambia esta exclusión. |
| Parakeet TDT | **NOT SELECTED FOR Q1/Q2** | QVAC lo documenta como ruta de transcripción multilingüe, pero el protocolo de Q1/Q2 exige comparar las dos constantes Whisper y necesita timestamps para el grounding propuesto. No se usa como sustitución silenciosa. |
| Modelos externos, GGUF locales no catalogados o fine-tunes no auditados | **NOT ALLOWED** | Romperían el comparativo reproducible y la regla del proyecto de usar únicamente lo que se confirme en el SDK/registro. |
| `WHISPER_SMALL_Q8_0` | **DEFERRED** | Es una escalada prevista sólo si Q2 concluye que las dos candidatas iniciales no superan los criterios bloqueantes. |

La exclusión por nombre no equivale a afirmar capacidades internas del modelo. Es una decisión de diseño conservadora: cuando el producto necesita español, no se justifica iniciar un experimento P0 con una constante rotulada como inglesa.

## Qué no prueba este documento

Los nombres de catálogo y los checksums no responden ninguna de las preguntas que importan para una nota clínica. Siguen sin medir:

- reconocimiento de nombres de fármacos y abreviaturas;
- conservación de unidades y dosis;
- negaciones, especialmente frases como «no he tenido fiebre»;
- acentos regionales, ruido de consulta y solapamiento de voces;
- cambios de idioma, nombres propios y code-switching;
- integridad de `startMs`/`endMs` para el source grounding;
- tasa de palabras erróneas, latencia, consumo de memoria y estabilidad.

Cualquier afirmación sobre esos puntos sería **UNVERIFIED** hasta que Q1/Q2 la produzcan con audio sintético, configuración y versión registradas. No se copiaron claims de model cards upstream: no forman parte de la evidencia usada aquí y, aun si se consultaran, no reemplazarían la evaluación de NotaLocal.

## Protocolo de traspaso a Q1 y Q2

### Q1 — viabilidad de `language: 'es'`

**BLOCKED — NEEDS TARGET SDK/HARDWARE.** Con la instalación pineada, el investigador debe:

1. registrar `npm ls @qvac/sdk`;
2. comprobar que ambas constantes se exportan y guardar para cada una nombre, `expectedSize`, `sha256Checksum`, addon y engine;
3. confirmar en los tipos de Whisper que `language` y `translate` se aceptan;
4. ejecutar una sola prueba sintética de 15–30 segundos para cada candidata con `language: 'es'`, `translate: false` y `metadata: true`;
5. guardar salida, error exacto si ocurre, idioma observable, token médico guionizado y existencia de timestamps.

La salida de Q1 sólo puede ser «ruta viable» o «no viable». Si el campo de idioma se ignora pero la salida sigue siendo español, debe registrarse la diferencia: no se confirmará el campo como control efectivo.

### Q2 — selección de default

**BLOCKED — NEEDS TARGET SDK/HARDWARE; depende de Q1.** Una vez viable la ruta, se compararán exclusivamente `WHISPER_SPANISH_TINY_Q8_0` y `WHISPER_TINY` sobre los 13 casos sintéticos T1–T6. La selección favorece el modelo más pequeño que satisfaga todos los criterios bloqueantes:

- cero fármacos inventados;
- cero errores de dosis;
- cero negaciones omitidas o invertidas;
- timestamps utilizables para grounding.

Si ambos fallan, Q2 no debe declarar ganador: debe escalar de manera explícita a `WHISPER_SMALL_Q8_0` o declarar bloqueada la calidad de STT P0. El uso de un modelo más grande no se deduce de este documento.

## Controles de reproducibilidad

Antes de cualquier comparación, cada `.stt.json` debe incluir: versión del SDK, sistema operativo y arquitectura, constante exacta, descriptor, tamaño/hash verificados, configuración efectivamente pasada a `loadModel`, hash del audio sintético, timestamp de ejecución y si el modelo estaba descargado de antemano. Esto permite diferenciar una variación de modelo de una variación de instalación.

No se debe reutilizar el SHA de la tabla como si fuera el de 0.17.1. La fuente oficial ya muestra que el catálogo está versionado y puede cambiar; el registro local instalado es la autoridad para la corrida.

## Fuentes primarias

1. Tether/QVAC. [Transcription](https://docs.qvac.tether.io/ai-capabilities/transcription/). Consultado el 2026-08-22.
2. Tether/QVAC. [API Summary — v0.17.x](https://docs.qvac.tether.io/reference/api/). Consultado el 2026-08-22.
3. Tether/QVAC. [Repositorio oficial: contrato de modelos](https://github.com/tetherto/qvac/blob/975b36ea3975e98cff8e1d00354bdfaa8da5c93a/packages/sdk/contract/models.json). Consultado el 2026-08-22.
4. Tether/QVAC. [Repositorio oficial: package.json del SDK](https://github.com/tetherto/qvac/blob/main/packages/sdk/package.json). Consultado el 2026-08-22; usado para delimitar el desfase entre la rama actual y el pin 0.17.1.
