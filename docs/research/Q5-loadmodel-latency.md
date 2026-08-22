# Q5 — Latencia de `loadModel()` y viabilidad de carga secuencial

> **Tipo:** protocolo de laboratorio P0.  
> **Estado:** **BLOCKED — NEEDS TARGET HARDWARE**. No se midió latencia ni se eligió política de carga.  
> **Depende de:** [D1](./D1-qvac-api-audit.md), [D2](./D2-whisper-spanish-finetunes.md), [Q2](./Q2-stt-default-constant.md) y [Q4](./Q4-llm-rss-peak.md).  
> **Pin requerido:** `@qvac/sdk@0.17.1`.

## Pregunta y decisión diferida

¿La carga de un modelo por vez permite una experiencia de demostración aceptable, en especial en la transición STT → LLM, sin mantener ambos residentes?

La prueba no presupone un presupuesto temporal. Antes de correr, el equipo debe escribir el presupuesto de demo que quiere evaluar y por qué. Q5 sólo podrá decidir:

- mantener política de carga secuencial;
- mantener 4B residente **sólo** si Q4 demuestra que la memoria lo permite;
- excluir 4B del P0;
- no decidir por falta de métricas.

No se inventará una API de `preload`, ni se cargará durante la grabación salvo que la instalación/documentación del pin exponga una ruta inequívoca y se registre por separado.

## Hipótesis

La hipótesis es que las cargas en caché tienen una latencia distinta de una primera descarga y que la transición `unload(STT) + load(LLM)` puede ser el coste perceptible más relevante. Esta hipótesis se comprueba con cronómetro, no con tamaño del modelo ni descripciones de catálogo.

## Evidencia oficial

- **CONFIRMED:** `loadModel()` carga un descriptor y la API devuelve una operación que resuelve con un identificador de modelo. [QVAC API v0.17.x](https://docs.qvac.tether.io/reference/api/)
- **CONFIRMED:** el ciclo de descarga/caché oficial distingue provisionar un asset y posteriormente cargarlo desde la caché; una descarga no debe confundirse con carga de modelo cacheado. [QVAC Download lifecycle](https://docs.qvac.tether.io/models/download-lifecycle/)
- **CONFIRMED:** `unloadModel()` forma parte del ciclo documentado de transcripción. [QVAC Transcription](https://docs.qvac.tether.io/ai-capabilities/transcription/)
- **TODO: VERIFY FROM OFFICIAL QVAC DOCUMENTATION:** cualquier API de precarga, carga en segundo plano o callback de estado no presente en los tipos 0.17.1.

## Precondiciones

| Requisito | Evidencia | Estado |
| --- | --- | --- |
| SDK pin | 0.17.1 y hash de tipos | **BLOCKED — NEEDS TARGET SDK** |
| Cache | Todos los modelos candidatos ya descargados y checksums locales verificados | **BLOCKED — NEEDS TARGET HARDWARE/NETWORK SETUP** |
| STT | Constante elegida en Q2; si Q2 no decide, medir candidatas por separado sin declarar política final | **BLOCKED — NEEDS TARGET HARDWARE** |
| Memoria | Q4 evaluó la residencia secuencial/dual | **BLOCKED — NEEDS TARGET HARDWARE** |
| Presupuesto UX | Valor/criterio acordado antes de observar métricas | **BLOCKED — NEEDS PRODUCT DECISION** |

Las corridas que descarguen archivos se invalidan para la métrica de carga cacheada, pero se conservan como diagnóstico separado.

## Configuraciones

| ID | Operación medida | Modelos | Estado |
| --- | --- | --- | --- |
| S1 | `loadModel(STT)` cacheado | Cada candidata STT elegible | **BLOCKED — NEEDS TARGET HARDWARE** |
| S2 | `loadModel(600M)` cacheado | `QWEN3_600M_INST_Q4` | **BLOCKED — NEEDS TARGET HARDWARE** |
| S3 | `loadModel(1.7B)` cacheado | Sólo si el registry local lo expone | **BLOCKED — NEEDS TARGET HARDWARE** |
| S4 | `loadModel(4B)` cacheado | `QWEN3_4B_Q4_K_M` | **BLOCKED — NEEDS TARGET HARDWARE** |
| T1 | `unload(STT) → load(600M)` | STT elegido por Q2 + 600M | **BLOCKED — NEEDS TARGET HARDWARE** |
| T2 | `unload(STT) → load(4B)` | STT elegido por Q2 + 4B | **BLOCKED — NEEDS TARGET HARDWARE** |
| T3 | retorno LLM → STT | sólo si el flujo de demo lo necesita | **BLOCKED — NEEDS TARGET HARDWARE** |

## Procedimiento

1. Registrar host, SDK, versión de Node, modelo/descriptor/checksum y ruta de caché.
2. Proveer todos los modelos antes de iniciar las mediciones. Confirmar que ninguna corrida inicia descarga; conservar logs de progreso si ocurre.
3. Reiniciar el runner o restablecer un estado comparable entre corridas. Documentar la política de warm/cold process.
4. Medir tiempo monótono desde inmediatamente antes de invocar `loadModel` hasta su resolución.
5. Para transición, medir por separado: inicio de unload, fin de unload, inicio de load LLM, fin de load LLM; además reportar el hueco completo.
6. Ejecutar tres corridas cacheadas por configuración.
7. Registrar error exacto, descarga inesperada, cancelación o fallo de memoria; no convertirlos en cero segundos.
8. Calcular mínimo/mediana/máximo una vez llenas las tablas.

## Tabla de medición vacía

| Configuración | Corrida | ¿Cache verificada? | Inicio carga | Fin carga | Duración carga | Inicio unload | Fin unload | Hueco unload+load | ¿Descarga inesperada? | Error exacto |
| --- | ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S1 STT | 1 | **BLOCKED — NEEDS TARGET HARDWARE** |  |  |  | N/A | N/A | N/A |  |  |
| S2 600M | 1 | **BLOCKED — NEEDS TARGET HARDWARE** |  |  |  | N/A | N/A | N/A |  |  |
| S3 1.7B | 1 | **BLOCKED — NEEDS TARGET HARDWARE** |  |  |  | N/A | N/A | N/A |  |  |
| S4 4B | 1 | **BLOCKED — NEEDS TARGET HARDWARE** |  |  |  | N/A | N/A | N/A |  |  |
| T1 STT→600M | 1 | **BLOCKED — NEEDS TARGET HARDWARE** |  |  |  |  |  |  |  |  |
| T2 STT→4B | 1 | **BLOCKED — NEEDS TARGET HARDWARE** |  |  |  |  |  |  |  |  |

Cada configuración requiere tres corridas. No se rellenan números de demostración.

## Resumen vacío

| Operación | Mínimo | Mediana | Máximo | Cumple presupuesto UX acordado | Compatible con Q4 | Decisión |
| --- | ---: | ---: | ---: | --- | --- | --- |
| STT cacheado | **BLOCKED — NEEDS TARGET HARDWARE** |  |  |  |  | No decidir |
| 600M cacheado | **BLOCKED — NEEDS TARGET HARDWARE** |  |  |  |  | No decidir |
| 4B cacheado | **BLOCKED — NEEDS TARGET HARDWARE** |  |  |  |  | No decidir |
| STT→600M | **BLOCKED — NEEDS TARGET HARDWARE** |  |  |  |  | No decidir |
| STT→4B | **BLOCKED — NEEDS TARGET HARDWARE** |  |  |  |  | No decidir |

## Reglas de decisión posteriores

- Una carga que descargue no cuenta como carga cacheada.
- Si la transición secuencial cumple el presupuesto acordado y Q4 no recomienda dual residence, mantener carga de uno en uno.
- Si 4B supera el presupuesto o falla, se excluye de P0 o se evalúa residencia sólo si Q4 la permite.
- Si 4B necesita mantenerse residente pero Q4 lo desaconseja, no se promete la configuración en la demo.
- La carga del LLM durante grabación requiere evidencia de API/documentación independiente; no se deduce de esta medición.

## Bloqueos

**BLOCKED — NEEDS TARGET HARDWARE:** faltan modelos cacheados, cronómetro de host, tres corridas y resultado de Q4.

Q5 no evalúa fidelidad STT, validez JSON, consumo de RSS ni exactitud clínica. Una carga rápida no vuelve seguro el producto.

## Fuentes

1. Tether/QVAC. [API Summary — v0.17.x](https://docs.qvac.tether.io/reference/api/). Consultado el 2026-08-22.
2. Tether/QVAC. [Download lifecycle](https://docs.qvac.tether.io/models/download-lifecycle/). Consultado el 2026-08-22.
3. Tether/QVAC. [Transcription](https://docs.qvac.tether.io/ai-capabilities/transcription/). Consultado el 2026-08-22.
4. [D1](./D1-qvac-api-audit.md), [D2](./D2-whisper-spanish-finetunes.md), [Q2](./Q2-stt-default-constant.md) y [Q4](./Q4-llm-rss-peak.md).
