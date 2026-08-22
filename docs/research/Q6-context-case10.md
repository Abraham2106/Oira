# Q6 — Contexto del caso 10 y necesidad de troceado

> **Tipo:** protocolo de laboratorio P0.  
> **Estado:** **BLOCKED — NEEDS TARGET HARDWARE**. No se conoce si el caso largo cabe en contexto ni se decide troceado.  
> **Dependencias:** [D1](./D1-qvac-api-audit.md), [Q2](./Q2-stt-default-constant.md), [Q3](./Q3-json-schema-600m.md), [Q4](./Q4-llm-rss-peak.md) y [Q5](./Q5-loadmodel-latency.md).  
> **Pin requerido:** `@qvac/sdk@0.17.1`.

## Pregunta y decisiones permitidas

¿El transcript sintético del caso 10 —aproximadamente cuatro minutos de consulta— puede atravesar la estructuración local sin desbordar contexto y sin perder los temas situados al final?

Tras una ejecución reproducible, Q6 puede decidir una de estas opciones:

1. no hace falta trocear en P0;
2. es obligatorio trocear y se abre F11 con un diseño explícito;
3. se ajusta contexto **sólo** si existe un parámetro oficial y tipado para la versión instalada.

El protocolo no permite inventar `n_ctx`, `ctx_size`, ventanas de contexto o una estrategia de resumen. Tampoco confunde una longitud máxima de salida con capacidad de contexto de entrada.

## Hipótesis

La hipótesis es que un transcript largo puede fallar explícitamente, truncar contenido o terminar con JSON que parece válido pero omite el tramo final. Q6 prueba tanto errores formales como preservación de hechos ancla del final. No asume que una completion exitosa garantice cobertura completa.

## Evidencia oficial

- **CONFIRMED:** QVAC documenta `completion()` y una salida final canónica; D1 establece que su forma detallada debe verificarse en los tipos del pin. [QVAC API v0.17.x](https://docs.qvac.tether.io/reference/api/) y [D1](./D1-qvac-api-audit.md)
- **CONFIRMED:** los modelos se cargan mediante `loadModel`; valores de configuración sólo son válidos si la definición de la versión instalada los admite. [QVAC JS/TS SDK](https://docs.qvac.tether.io/js-ts-sdk/)
- **TODO: VERIFY FROM OFFICIAL QVAC DOCUMENTATION:** exportación de `ContextOverflowError`, semántica exacta del error y cualquier parámetro que aumente contexto en 0.17.1. Si no se observa en los tipos, no se escribe ni se usa.
- **DECISIÓN:** Q3 mantiene `json_schema`, parseo, Zod y grounding; Q6 no rebaja esos controles para obtener una respuesta corta. [Q3](./Q3-json-schema-600m.md)

## Fixture caso 10

Crear un WAV/transcript **sintético** de duración aproximada de cuatro minutos. La transcripción gold debe contener:

- temas repartidos entre inicio, centro y final;
- al menos dos hechos ancla al final, por ejemplo una negación y un medicamento/dosis explícitamente guionizados;
- identificadores de segmento/tiempo, si el STT viable de Q2 los genera;
- `must_not_contain` para impedir que el estructurador complete valores no dichos.

Congelar hash del WAV, transcript, segmentos y schema antes de correr. No usar conversación real.

| Campo de fixture | Valor |
| --- | --- |
| Duración objetivo | **BLOCKED — NEEDS DATASET** |
| Hash WAV | **BLOCKED — NEEDS DATASET** |
| Hash transcript | **BLOCKED — NEEDS DATASET** |
| Anclas inicio | **BLOCKED — NEEDS DATASET** |
| Anclas centro | **BLOCKED — NEEDS DATASET** |
| Anclas final | **BLOCKED — NEEDS DATASET** |
| Ground truth estructurado | **BLOCKED — NEEDS HUMAN REVIEW/DATASET** |

## Configuración de prueba

| Elemento | Regla |
| --- | --- |
| STT | Usar la constante que Q2 haya elegido; si Q2 no concluyó, Q6 queda bloqueado. |
| LLM | Usar la configuración de Q3 que esté siendo evaluada. |
| Prompt/schema | Idénticos al caso corto de Q3, con hashes registrados. |
| Contexto | No fijar ni aumentar parámetros hasta confirmar su existencia oficial en tipos 0.17.1. |
| Reintentos | Máximo dos, como en Q3; registrar cada intento. |
| Salida | Guardar contenido bruto, evento/final o error exacto, parseo, Zod y grounding. |

## Procedimiento

1. Verificar pin del SDK, tipos de completion y disponibilidad de modelos. Registrar hardware de Q4 y política de carga de Q5.
2. Ejecutar STT del caso 10 con la ruta validada por Q1/Q2 y guardar transcript/segmentos sin edición clínica.
3. Verificar que el transcript de entrada contiene las anclas de inicio, centro y final antes de llamar al LLM.
4. Ejecutar el mismo request `json_schema` de Q3 con el transcript completo.
5. Registrar si la operación finaliza, si aparece un error de contexto (sólo con nombre exacto observado) y cómo termina la generación.
6. Aplicar JSON.parse, Zod, consistencia y grounding.
7. Revisar específicamente las anclas del final: deben aparecer correctamente cuando el schema lo permita o quedar `NOT_STATED`/fallo explícito; nunca se declaran presentes si no tienen respaldo.
8. Repetir sólo bajo condiciones documentadas. Si hay fallo, no alterar prompt/schema/contexto dentro de la misma corrida.
9. Evaluar la decisión después de observar resultados completos, no durante la ejecución.

## Criterios de evaluación

| Comprobación | Criterio | Estado |
| --- | --- | --- |
| Entrada completa | Transcript contiene anclas iniciales, centrales y finales | **BLOCKED — NEEDS TARGET HARDWARE/DATASET** |
| Operación | Completion finaliza o conserva error exacto | **BLOCKED — NEEDS TARGET HARDWARE** |
| Contexto | No hay desbordamiento observado; si lo hay, se clasifica sin inventar nombre | **BLOCKED — NEEDS TARGET HARDWARE** |
| Forma | JSON parseable y Zod válido | **BLOCKED — NEEDS TARGET HARDWARE** |
| Grounding | Toda observación se vincula a segmentos/texto existentes | **BLOCKED — NEEDS TARGET HARDWARE** |
| Cola | Anclas finales son preservadas o su ausencia se reporta como fallo/incompletitud | **BLOCKED — NEEDS TARGET HARDWARE** |
| Seguridad | Cero hechos clínicos no respaldados | **BLOCKED — NEEDS TARGET HARDWARE** |

Una respuesta corta o un JSON válido que ignore las anclas finales no justifica «no trocear».

## Tabla de resultados vacía

| Corrida | Transcript completo | Completion final | Error exacto / tipo confirmado | JSON/Zod | Ancla inicio | Ancla centro | Anclas finales | Grounding | Hecho no respaldado | Resultado |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Caso 10, intento 1 | **BLOCKED — NEEDS TARGET HARDWARE** |  |  |  |  |  |  |  |  |  |
| Caso 10, intento 2 | No ejecutado |  |  |  |  |  |  |  |  |  |
| Caso 10, intento 3 | No ejecutado |  |  |  |  |  |  |  |  |  |

## Tabla de decisión vacía

| Observación | ¿Trocear? | ¿Aumentar contexto? | Acción |
| --- | --- | --- | --- |
| Sin error, schema/grounding/anclas correctos | **BLOCKED — NEEDS TARGET HARDWARE** | No decidir |  |
| Error de contexto confirmado | **BLOCKED — NEEDS TARGET HARDWARE** | Sólo si tipo oficial lo permite |  |
| JSON válido pero pierde la cola | **BLOCKED — NEEDS TARGET HARDWARE** | No decidir |  |
| Hecho no respaldado | **BLOCKED — NEEDS TARGET HARDWARE** | No decidir |  |

## Si se requiere troceado

Q6 no implementa F11 ni propone un algoritmo improvisado. Si los resultados exigen troceado, el siguiente artefacto debe definir y evaluar:

- límites de corte basados en segmentos, no en reescritura clínica;
- preservación de citas/segmentos entre bloques;
- estrategia de unión que no duplique ni invente campos;
- comportamiento de `NOT_STATED` y conflictos entre bloques;
- evaluación de anclas finales y hechos no respaldados sobre cada bloque y la nota combinada.

Hasta entonces, la decisión correcta es «chunking required — diseño pendiente», no un resumen automático.

## Bloqueos

**BLOCKED — NEEDS TARGET HARDWARE:** no hay SDK/hardware, transcript largo validado, corrida LLM ni error de contexto observado.

**BLOCKED — NEEDS HUMAN REVIEW:** el ground truth y las anclas del caso largo deben revisarse antes de evaluar omisiones.

Q6 no establece una ventana de contexto, no certifica rendimiento ni autoriza aumentar memoria. Sólo decide la estrategia después de evidencia reproducible.

## Fuentes

1. Tether/QVAC. [API Summary — v0.17.x](https://docs.qvac.tether.io/reference/api/). Consultado el 2026-08-22.
2. Tether/QVAC. [JS/TS SDK](https://docs.qvac.tether.io/js-ts-sdk/). Consultado el 2026-08-22.
3. [D1](./D1-qvac-api-audit.md), [Q2](./Q2-stt-default-constant.md), [Q3](./Q3-json-schema-600m.md), [Q4](./Q4-llm-rss-peak.md) y [Q5](./Q5-loadmodel-latency.md).
