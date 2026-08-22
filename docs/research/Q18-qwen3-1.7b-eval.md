# Q18 — Evaluación de Qwen3 1.7B

**Tipo:** investigación documental + protocolo de laboratorio  
**Estado:** MEASURE-ONLY / DEFER — requiere hardware objetivo  
**Fecha de consulta:** 2026-08-22

## Pregunta y decisión buscada

Decidir entre mantener el modelo de referencia más pequeño, evaluar una variante Qwen3 identificada como 1.7B o escalar a una alternativa mayor. Esta investigación no confirma que una variante esté disponible en el paquete instalado, ni fija constantes, identificadores o parámetros de QVAC: la disponibilidad debe comprobarse contra la versión exacta y el registro de modelos del entorno.

## Evidencia documental

QVAC documenta generación de texto y conversación por historial, junto con eventos de salida y una caché KV opcional. Esa documentación no aporta una comparación clínica entre variantes Qwen3, ni garantiza calidad, memoria, latencia o disponibilidad de una variante concreta en esta aplicación.

Los requisitos de sistema de QVAC ofrecen orientación general de instalación y recursos, pero no sustituyen una medición con el modelo, la aplicación y el hardware de destino. Por ello, los nombres “600M”, “1.7B” y “4B” se usan aquí exclusivamente como columnas de experimento solicitadas, no como resultados o compromisos de empaquetado.

Fuentes oficiales:

- [QVAC: generación de texto](https://docs.qvac.tether.io/ai-capabilities/text-generation/)
- [QVAC: requisitos de sistema](https://docs.qvac.tether.io/system-requirements/)

## Hipótesis a probar

| ID | Hipótesis | Estado |
|---|---|---|
| H1 | La variante candidata 1.7B está disponible y se carga de forma compatible en el entorno objetivo. | Sin comprobar |
| H2 | La misma instrucción y el mismo esquema producen salidas válidas en los 13 casos bajo comparación. | Sin comprobar |
| H3 | La variante 1.7B resuelve bloqueadores de calidad que el modelo menor no resuelve. | Sin comprobar |
| H4 | El coste de memoria y operación de 1.7B es aceptable frente a la alternativa menor. | Sin comprobar |
| H5 | Si 1.7B y 4B fallan las mismas barreras, el problema puede estar en la instrucción o el esquema, no en el tamaño. | Hipótesis de diagnóstico |

## Decisión provisional

**MEASURE-ONLY / DEFER.** No se elige ningún tamaño todavía. El modelo más pequeño que cumpla los bloqueadores definidos gana por defecto. Si la variante menor ya los cumple, 1.7B debe justificar un beneficio reproducible y una viabilidad de memoria documentada en la investigación de presupuesto. Si tanto 1.7B como una alternativa mayor fallan los mismos bloqueadores, se debe depurar la instrucción y el esquema antes de atribuir la falla al tamaño del modelo.

## Protocolo de laboratorio

Precondiciones:

- Hardware objetivo y versiones exactas de aplicación, QVAC, modelo y sistema operativo registradas.
- Confirmación en el paquete instalado de los identificadores/modelos realmente disponibles; no copiar identificadores de ejemplos sin verificar.
- Conjunto sintético fijo de 13 casos, con la misma instrucción, historial, esquema y oráculo de validación para cada columna.
- Barreras de aceptación acordadas por IA/clinical safety antes de ejecutar; ningún caso con información clínica real.

Pasos:

1. Validar que cada candidato se puede seleccionar y cargar en el entorno objetivo; anotar cualquier indisponibilidad como resultado, sin sustituirlo silenciosamente.
2. Ejecutar los 13 casos con el candidato menor, 1.7B y la alternativa mayor, manteniendo constante la instrucción, el esquema, el conjunto y la política de reintentos.
3. Para cada salida, evaluar validez de esquema, presencia de contenido no sustentado, cumplimiento de campos obligatorios y los bloqueadores acordados.
4. Registrar memoria y estabilidad mediante el protocolo de presupuesto correspondiente; no extrapolar de otro ordenador.
5. Revisar fallas por patrón: si se repiten entre 1.7B y la alternativa mayor, abrir una hipótesis sobre instrucción/esquema.
6. Repetir las ejecuciones necesarias según el protocolo de evaluación acordado y documentar versiones y configuración efectiva.
7. Elegir solo cuando los datos permitan aplicar los criterios de cierre.

## Matriz de resultados

**BLOCKED — NEEDS TARGET HARDWARE**

| Caso | Candidato menor: esquema/bloqueadores | 1.7B: esquema/bloqueadores | Alternativa mayor: esquema/bloqueadores | Observaciones |
|---|---|---|---|---|
| 1 | — | — | — | — |
| 2 | — | — | — | — |
| 3 | — | — | — | — |
| 4 | — | — | — | — |
| 5 | — | — | — | — |
| 6 | — | — | — | — |
| 7 | — | — | — | — |
| 8 | — | — | — | — |
| 9 | — | — | — | — |
| 10 | — | — | — | — |
| 11 | — | — | — | — |
| 12 | — | — | — | — |
| 13 | — | — | — | — |

| Métrica registrada en hardware | Candidato menor | 1.7B | Alternativa mayor | Estado |
|---|---|---|---|---|
| Identificador disponible/verificado | — | — | — | Pendiente |
| Carga estable | — | — | — | Pendiente |
| Memoria y estabilidad | — | — | — | Pendiente |
| Cumplimiento de bloqueadores | — | — | — | Pendiente |
| Decisión | — | — | — | Pendiente |

## Criterio de cierre

- Seleccionar el candidato más pequeño que supere todos los bloqueadores y cuya carga sea viable en el hardware objetivo.
- Exigir a 1.7B evidencia de beneficio cuando el candidato menor ya cumple.
- Si los candidatos 1.7B y mayor fallan la misma barrera, crear una tarea de corrección de instrucción/esquema y mantener la decisión en **DEFER**.
- No publicar comparativas, requisitos de RAM ni afirmaciones de calidad hasta registrar resultados reproducibles.