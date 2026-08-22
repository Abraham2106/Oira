# D3 — Salida estructurada: qué aplica a NotaLocal

> **Estado:** CONFIRMED para la decisión de arquitectura; la viabilidad del esquema clínico completo en un modelo de 600M sigue siendo **BLOCKED — NEEDS TARGET HARDWARE** (Q3).  
> **Fecha de investigación:** 22 de agosto de 2026.  
> **Ámbito:** investigación documental; no se ejecutó QVAC ni se procesaron datos de pacientes.

## Decisión

**Mantener `responseFormat: json_schema` como la única modalidad aceptable para la estructuración clínica de NotaLocal.** `json_object` y las instrucciones de «responde solo JSON» no son rutas de producción. La decisión no elimina los controles posteriores: el proceso Main debe seguir aplicando `JSON.parse`, validación Zod, verificación de estados (`OBSERVED`, `UNCERTAIN`, `NOT_STATED`) y comprobación de evidencia de origen antes de exponer una nota al renderer.

Esta decisión es de **forma**, no de verdad clínica. Una salida válida contra un esquema puede contener un valor clínicamente incorrecto, no dicho o atribuido a un segmento equivocado. Q3 sigue siendo la prueba de envío: debe demostrar, con el SDK y el modelo de 600M instalados, que el esquema clínico elegido se completa y valida en todos los casos sintéticos definidos por el proyecto.

## Pregunta y criterio de decisión

La pregunta era si las fuentes de QVAC y la literatura justifican seleccionar `json_schema` frente a `json_object` para convertir una transcripción delimitada en un borrador de nota clínica.

El criterio de aceptación no es solo «produce JSON». La salida debe tener una forma verificable por programa, conservar la distinción entre no dicho e incierto y permitir que el sistema rechace una respuesta que no cumpla el contrato. Ninguna fuente documental permite adelantar una tasa de validez, exactitud clínica, latencia o consumo de memoria: esas medidas pertenecen a Q3–Q6.

## Hechos confirmados por QVAC

La documentación oficial de la interfaz HTTP de QVAC declara tres valores de `response_format.type`: `text`, `json_object` y `json_schema`. Para `json_schema`, QVAC exige además un objeto JSON Schema en `json_schema.schema`; permite un nombre y la opción `strict`. Esto confirma que el modo tiene un contrato de forma más específico que `json_object`, pero **no equivale a una garantía documentada de exactitud semántica de una nota clínica** [QVAC, 2026].

La misma documentación indica una limitación de integración: los modos de salida estructurada no se combinan con `tools`; la petición debe separarlos. NotaLocal no necesita herramientas en la llamada que estructura el transcript, por lo que esta restricción no cambia la decisión, pero debe constar en la allow-list y en las pruebas de integración [QVAC, 2026].

QVAC también documenta que, con modelos de razonamiento híbrido y un presupuesto de tokens ajustado, una respuesta estructurada puede finalizar por longitud mientras el razonamiento sigue activo y dejar `content` vacío. La mitigación documentada es desactivar el razonamiento con `reasoning_budget: false` o aumentar el presupuesto; la elección de parámetros exactos sigue siendo una cuestión de tipos/documentación de la versión instalada y de prueba de laboratorio. Esto refuerza que incluso con un esquema la ruta debe tratar finalización por longitud, contenido vacío y errores como fallos de estructuración, no como notas parcialmente fiables [QVAC, 2026].

## Por qué `json_schema` y no `json_object`

`json_object` describe una salida JSON, pero no expresa por sí solo los campos obligatorios, enumeraciones ni tipos que NotaLocal necesita para impedir que la forma del borrador cambie entre ejecuciones. En cambio, `json_schema` entrega al motor una especificación declarativa de esa estructura. El contrato mínimo debería expresar: el objeto de nota, las secciones permitidas, los estados admisibles, `null` cuando corresponde a `NOT_STATED`, la evidencia literal y el identificador de segmento. La semántica de tales campos sigue requiriendo validación propia.

La literatura de generación restringida explica el motivo: el decodificador puede enmascarar los tokens que no son compatibles con las restricciones, produciendo salidas que siguen la estructura especificada. Geng et al. evalúan este tipo de sistemas con casi diez mil esquemas JSON reales y advierten que la evaluación debe separar **cumplimiento**, **cobertura de características del esquema**, **eficiencia** y **calidad de la tarea**. Esa separación coincide con la arquitectura de NotaLocal: Q3 puede medir la primera dimensión, mientras que los casos clínicos, Zod y `verifySource()` abordan las otras [Geng et al., 2025].

No se debe interpretar el resultado como una licencia para ampliar el esquema sin pruebas. Los marcos de decodificación no implementan necesariamente el mismo subconjunto de JSON Schema; Geng et al. encontraron diferencias materiales de cobertura entre motores. Por ello el esquema clínico de P0 debe ser deliberadamente pequeño, explícito y validado contra la versión real de QVAC. Si un constructo no pasa las pruebas, se simplifica el esquema; no se sustituye silenciosamente por salida libre [Geng et al., 2025].

## Estructura válida no es contenido correcto

Un esquema puede impedir una llave no permitida o un tipo erróneo, pero no puede probar que «faringitis» fue pronunciado, que una negación fue conservada o que una cita corresponde al segmento indicado. La literatura distingue la exactitud de esquema de la similitud/adecuación de contenido; ambas deben evaluarse separadamente. También señala que el prompting directo para imponer un formato suele rendir peor que mecanismos estructurados, mientras que el entrenamiento o la evaluación específica pueden cambiar los resultados. Ninguno de esos hallazgos mide QVAC ni el corpus clínico español de NotaLocal, por lo que se clasifican como evidencia de diseño general, no como desempeño del producto [Shi et al., 2025].

En consecuencia, se conserva la cadena de seguridad establecida por el proyecto:

1. El transcript se trata como **datos** delimitados, no como instrucciones.
2. El modelo genera solo contra `json_schema`.
3. El Main aplica `JSON.parse` y validación Zod al resultado completo.
4. Cada campo `OBSERVED` debe conservar texto fuente y un segmento verificable.
5. Las respuestas que no superen las validaciones pasan a `EXTRACTION_FAILED`; no se reparan inventando valores ni se exportan.
6. El médico revisa y confirma explícitamente el borrador antes de exportarlo.

Así, la gramática protege la interfaz entre modelo y aplicación; no reemplaza grounding, evaluación de negaciones, protección contra inyección ni revisión médica.

## Implicación para Q3

Q3 debe conservar como modalidad exclusiva `responseFormat: json_schema`. Su protocolo debe separar al menos:

| Comprobación | Resultado permitido | Resultado no permitido |
| --- | --- | --- |
| Respuesta JSON parseable | objeto completo que parsea | texto libre, JSON truncado o vacío |
| Validación de esquema | todos los campos y estados válidos | llaves/tipos/estados ajenos al contrato |
| Semántica clínica | sin hecho clínico no respaldado en casos sintéticos | inferencia de diagnóstico o valor plausible no dicho |
| Origen | campos observados trazables a transcript/segmento | cita inexistente o segmento inválido |
| Finalización | final normal y resultado completo | `length`, error de inferencia o contenido vacío tratados como éxito |

La prueba no debe cambiar a `json_object` para ocultar una incompatibilidad. Si el modelo de 600M no logra una salida completa y válida con el esquema P0, las únicas rutas honestas son simplificar campos anidados, evaluar un modelo permitido de mayor capacidad o declarar el hito bloqueado. El informe no establece cuál será necesaria porque no se realizó la ejecución.

## Clasificación de evidencia

| Afirmación | Estado | Base y límite |
| --- | --- | --- |
| QVAC expone `text`, `json_object` y `json_schema` | CONFIRMED | Documentación oficial HTTP; se debe contrastar con los tipos de la versión instalada antes de codificar. |
| `json_schema` requiere un esquema JSON y admite nombre/strict | CONFIRMED | Documentación oficial HTTP. |
| `json_schema` es preferible a `json_object` para el contrato P0 | DECISIÓN | Se apoya en el contrato de forma más expresivo y en las necesidades de validación del producto. |
| La salida estructurada vuelve correcto el contenido clínico | FORBIDDEN | Ninguna fuente ni gramática demuestra veracidad, negación o atribución de origen. |
| QVAC/600M cumplirá el esquema clínico al 100% | UNVERIFIED | Solo Q3, con SDK, hardware y casos sintéticos, puede responderlo. |
| La literatura de decodificación restringida predice el rendimiento de QVAC | UNVERIFIED | Es evidencia general, no una medición de este SDK, modelo o esquema. |

## Alternativas descartadas

**Solo prompt «JSON».** Rechazada: no crea un contrato de forma ejecutable y traslada al parser una variabilidad evitable.

**`json_object` en producción.** Rechazada: puede ser útil como compatibilidad o diagnóstico de laboratorio, pero no expresa el contrato clínico P0. No se utilizará como fallback silencioso.

**Confiar exclusivamente en la gramática.** Rechazada: confunde validez sintáctica con contenido clínico respaldado.

## Trabajo bloqueado y protocolo

**BLOCKED — NEEDS TARGET HARDWARE / SDK.** Instalar la versión fijada de `@qvac/sdk`, inspeccionar sus `.d.ts` y ejecutar el caso canónico de Q3 con el esquema completo, `responseFormat: json_schema` y datos sintéticos. Registrar versión exacta, modelo, sistema operativo, comando, resultado bruto, parseo, Zod, grounding y cualquier error. Si hay truncación, registrar `finish_reason` y configuración de token/razonamiento sin inventar una corrección.

## Fuentes

1. **QVAC.** “HTTP server — Structured output (`response_format`).” Documentación oficial de QVAC/Tether, consultada el 22 de agosto de 2026. https://docs.qvac.tether.io/cli/http-server/
2. **Geng, S.; Cooper, H.; Moskal, M.; Jenkins, S.; Berman, J.; Ranchin, N.; West, R.; Horvitz, E.; Nori, H.** “Generating Structured Outputs from Language Models: Benchmark and Studies.” *arXiv:2501.10868*, 2025. https://arxiv.org/abs/2501.10868
3. **Shi, S. et al.** “SLOT: Structuring the Output of Large Language Models.” *arXiv:2505.04016*, 2025. https://arxiv.org/abs/2505.04016
4. **Dong, Y. et al.** “XGrammar: Flexible and Efficient Structured Generation Engine for Large Language Models.” *Proceedings of MLSys*, 2025. https://arxiv.org/abs/2411.15100
