# Q4 — Pico de RSS de LLM y política de residencia

> **Tipo:** protocolo de laboratorio P0.  
> **Estado:** **BLOCKED — NEEDS TARGET HARDWARE**. No se midió RAM ni se estableció requisito mínimo.  
> **Dependencias:** [D1](./D1-qvac-api-audit.md), [Q2](./Q2-stt-default-constant.md), [Q3](./Q3-json-schema-600m.md).  
> **Pin requerido:** `@qvac/sdk@0.17.1`.

## Pregunta y decisión diferida

¿Cuál es el consumo pico real de memoria residente (RSS) al cargar y ejecutar los LLM candidatos, y permite la máquina de demostración mantener modelos de forma secuencial o simultánea?

La decisión al finalizar sólo podrá ser:

- requisito de RAM **medido, no certificado**, y política secuencial;
- requisito de RAM medido y política dual-resident;
- 4B fuera de P0 por no cargar o por superar el presupuesto de la máquina;
- bloqueo, si no hay mediciones comparables.

No se publicará «funciona con X GB» hasta que exista un registro de hardware, tres corridas por configuración y los picos del sistema operativo.

## Hipótesis

La hipótesis de ingeniería es que cargar simultáneamente STT y un LLM puede elevar el RSS respecto a cada carga aislada, y que esa diferencia puede decidir entre descargar el STT antes de cargar el LLM o mantener ambos residentes. El tamaño en disco del descriptor no es una medida de RSS y no se usará como sustituto.

## Fuentes y límites

- **CONFIRMED:** QVAC expone `getSystemResources()` y `getModelInfo()` en su referencia pública; estos son útiles como telemetría del SDK, no reemplazan la medición del sistema operativo. [API Summary v0.17.x](https://docs.qvac.tether.io/reference/api/)
- **CONFIRMED:** el SDK permite cargar y descargar modelos mediante `loadModel()`/`unloadModel()`. [QVAC JS/TS SDK](https://docs.qvac.tether.io/js-ts-sdk/)
- **CONFIRMED:** QVAC publica requisitos generales de host, pero éstos no certifican que una combinación concreta de modelos sea viable para Oira. [QVAC System requirements](https://docs.qvac.tether.io/system-requirements/)
- **TODO: VERIFY FROM OFFICIAL QVAC DOCUMENTATION:** qué campos de recursos/estadísticas aparecen exactamente en el pin 0.17.1; no se codifican nombres de campos no inspeccionados.

## Configuraciones de medición

| ID | Estado de modelos | Carga de trabajo | Estado |
| --- | --- | --- | --- |
| B0 | Ningún modelo QVAC cargado | proceso de Oira/runner en reposo | **BLOCKED — NEEDS TARGET HARDWARE** |
| L1 | `QWEN3_600M_INST_Q4` | reposo tras carga | **BLOCKED — NEEDS TARGET HARDWARE** |
| L2 | `QWEN3_600M_INST_Q4` | completion sintética de Q3 | **BLOCKED — NEEDS TARGET HARDWARE** |
| L3 | `QWEN3_4B_Q4_K_M` | reposo tras carga | **BLOCKED — NEEDS TARGET HARDWARE** |
| L4 | `QWEN3_4B_Q4_K_M` | completion sintética de Q3 | **BLOCKED — NEEDS TARGET HARDWARE** |
| C1 | STT elegido por Q2 + 600M | tras carga de ambos, sin inferencia | **BLOCKED — NEEDS TARGET HARDWARE** |
| C2 | STT elegido por Q2 + 4B | tras carga de ambos, sin inferencia | **BLOCKED — NEEDS TARGET HARDWARE** |

Las constantes se ejecutan sólo si están exportadas por el SDK pineado. Si 4B no puede cargar, se registra el error exacto y no se simula una cifra.

## Instrumentación

Medir RSS desde el sistema operativo para el proceso principal y, si la arquitectura crea procesos auxiliares, para el conjunto de procesos atribuibles a la corrida. Documentar herramienta, comando y unidades. Ejemplos de familias de herramientas aceptables: monitor de procesos del SO, `ps`/Task Manager/Activity Monitor o equivalente; no fijar una sintaxis multiplataforma sin probarla.

Registrar además, si los tipos de 0.17.1 lo exponen, recursos del SDK como observación secundaria. No sumar memoria de disco, `expectedSize` del registry, swap ni memoria libre para fabricar RSS.

## Procedimiento

1. Registrar host: SO, versión, arquitectura, CPU, GPU, RAM total/disponible, Node, SDK y hashes de los tipos.
2. Reiniciar el runner/proceso entre configuraciones; cerrar procesos no relacionados y registrar los que no puedan cerrarse.
3. Medir B0 estabilizado.
4. Para cada L1–L4, cargar sólo el modelo indicado, esperar estado inactivo definido, medir RSS; en configuraciones de inferencia medir continuamente desde antes de `completion` hasta que finalice.
5. Descargar/cerrar según la API confirmada y comprobar que la siguiente corrida parte de B0 comparable.
6. Repetir tres veces cada configuración. Reportar mínimo, mediana y máximo; no ocultar fallos de carga.
7. Repetir C1/C2 únicamente tras conocer el STT elegido o, si Q2 sigue bloqueado, marcar las filas como bloqueadas.

Todo prompt, transcript y salida deben ser sintéticos. El protocolo no necesita datos clínicos reales.

## Tabla de medición vacía

| Configuración | Corrida | RSS baseline | RSS tras carga | RSS pico inferencia | RSS tras descarga | ¿Carga OK? | Error exacto | Fuente de medición |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- | --- |
| B0 | 1 | **BLOCKED — NEEDS TARGET HARDWARE** |  |  |  |  |  |  |
| L1 (600M idle) | 1 | **BLOCKED — NEEDS TARGET HARDWARE** |  | N/A |  |  |  |  |
| L2 (600M completion) | 1 | **BLOCKED — NEEDS TARGET HARDWARE** |  |  |  |  |  |
| L3 (4B idle) | 1 | **BLOCKED — NEEDS TARGET HARDWARE** |  | N/A |  |  |  |  |
| L4 (4B completion) | 1 | **BLOCKED — NEEDS TARGET HARDWARE** |  |  |  |  |  |
| C1 (STT + 600M) | 1 | **BLOCKED — NEEDS TARGET HARDWARE** |  | N/A |  |  |  |  |
| C2 (STT + 4B) | 1 | **BLOCKED — NEEDS TARGET HARDWARE** |  | N/A |  |  |  |  |

Completar tres filas por configuración. Los campos de resumen se calculan después, no se rellenan con estimaciones.

## Resumen vacío y decisión

| Configuración | RSS mín. | RSS mediana | RSS máx. | ¿Se mantiene estable? | Política candidata | Decisión |
| --- | ---: | ---: | ---: | --- | --- | --- |
| 600M | **BLOCKED — NEEDS TARGET HARDWARE** |  |  |  | No decidir |  |
| 4B | **BLOCKED — NEEDS TARGET HARDWARE** |  |  |  | No decidir |  |
| STT + 600M | **BLOCKED — NEEDS TARGET HARDWARE** |  |  |  | No decidir |  |
| STT + 4B | **BLOCKED — NEEDS TARGET HARDWARE** |  |  |  | No decidir |  |

## Reglas de decisión posteriores

- Si un modelo no carga o falla durante inferencia, no es opción P0 en esa máquina.
- Si la residencia dual produce presión, fallos o picos incompatibles con la máquina de demo, adoptar política secuencial y medir la transición en Q5.
- Si sólo 600M es estable, no afirmar que 4B sea «soportado»; documentar 4B como fuera de P0.
- Si ambas son estables, la decisión aún depende de Q3 (validez/grounding) y Q5 (latencia).
- El requisito final se expresa como observación en una configuración medida, no como certificación hospitalaria.

## Bloqueos

**BLOCKED — NEEDS TARGET HARDWARE:** no existen medidas de RSS, hardware registrado, picos de completion ni pruebas de residencia dual.

Q4 no mide calidad de STT, JSON, red ni privacidad. Tampoco autoriza afirmar seguridad de memoria: sólo informa una política de carga en un host concreto.

## Fuentes

1. Tether/QVAC. [API Summary — v0.17.x](https://docs.qvac.tether.io/reference/api/). Consultado el 2026-08-22.
2. Tether/QVAC. [JS/TS SDK](https://docs.qvac.tether.io/js-ts-sdk/). Consultado el 2026-08-22.
3. Tether/QVAC. [System requirements](https://docs.qvac.tether.io/system-requirements/). Consultado el 2026-08-22.
4. [D1](./D1-qvac-api-audit.md), [Q2](./Q2-stt-default-constant.md) y [Q3](./Q3-json-schema-600m.md).
