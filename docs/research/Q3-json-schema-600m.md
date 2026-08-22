# Q3 — `json_schema` con Qwen 600M y esquema clínico completo

> **Tipo:** protocolo de laboratorio P0.  
> **Estado:** **BLOCKED — NEEDS TARGET SDK/HARDWARE**. No se declara JSON válido, no se simplifica el esquema y no se elige modelo.  
> **Depende de:** [D1](./D1-qvac-api-audit.md), [D3](./D3-structured-output-literature.md), transcript viable de Q1/Q2 y el schema clínico de la guía IA/QVAC.  
> **Pin requerido:** `@qvac/sdk@0.17.1`.

## Pregunta y decisiones permitidas

¿La instalación objetivo puede ejecutar `responseFormat: json_schema` con `QWEN3_600M_INST_Q4` y el esquema clínico completo de NotaLocal, obteniendo una salida que pase parseo, Zod, reglas de consistencia y source grounding?

Al concluir, y sólo con resultados reproducibles, Q3 puede decidir una de tres rutas:

1. mantener schema completo + 600M;
2. simplificar el schema eliminando grupos anidados concretos;
3. escalar a un modelo permitido y documentado.

No se permite declarar éxito por tener JSON superficialmente bien formado. Tampoco se permite cambiar a `json_object` ni a texto libre para ocultar una incompatibilidad.

## Hipótesis

La hipótesis es que la restricción de esquema puede hacer que la salida de estructuración tenga la forma requerida por NotaLocal. Esa hipótesis no afirma que el modelo sea fiel al transcript: la gramática no prueba negaciones, hechos clínicos ni citas de origen. D3 fija precisamente esa separación. [D3](./D3-structured-output-literature.md)

El protocolo prueba compatibilidad de formato y validaciones posteriores. La decisión sobre calidad clínica requiere que la evaluación incluya casos de invención, `NOT_STATED`, negaciones y source grounding.

## Evidencia y precondiciones

| Hecho o requisito | Fuente / comprobación | Estado |
| --- | --- | --- |
| `completion()` existe y sus salidas canónicas son `events` y `final` | [D1](./D1-qvac-api-audit.md) y [API QVAC](https://docs.qvac.tether.io/reference/api/) | CONFIRMED para superficie general |
| `json_schema` es el contrato decidido para P0 | [D3](./D3-structured-output-literature.md) | DECISIÓN |
| Tipo exacto de `responseFormat`, `json_schema`, `strict` y parámetros de generación en 0.17.1 | Tipos instalados, no memoria | **TODO: VERIFY FROM OFFICIAL QVAC DOCUMENTATION** |
| `QWEN3_600M_INST_Q4` exportado y cargable en 0.17.1 | Registro/tipos locales y `loadModel` | **BLOCKED — NEEDS TARGET SDK/HARDWARE** |
| Transcripts de entrada válidos y sintéticos | Resultados Q1/Q2 o fixtures revisados | **BLOCKED — NEEDS TARGET HARDWARE/DATASET** |
| Schema Zod y JSON Schema derivados del mismo contrato | Revisión de código; hash de schema | **BLOCKED — NEEDS IMPLEMENTATION** |

Antes de correr, registrar `npm ls @qvac/sdk`, hash del archivo de tipos de completion, SO/arquitectura, checksum de la constante local y hash del schema. Si cualquiera no coincide con el pin, detener y actualizar la evidencia antes de probar.

## Contrato de entrada y salida

### Entrada

El prompt recibe únicamente un transcript sintético delimitado como datos. El transcript nunca puede elevarse a instrucciones. Incluir el identificador de segmento y sus tiempos cuando estén disponibles; esos metadatos son insumos para validar grounding, no una autorización para inventar hechos.

### Salida solicitada al LLM

Usar el **schema clínico completo** de la guía: campos de observación con `value`, `status`, `source_text` y `segment_id`, donde aplique. Los estados permitidos son `OBSERVED`, `UNCERTAIN` y `NOT_STATED`. No incluir un objeto `meta` dentro del schema enviado al LLM.

Reglas del contrato:

- `NOT_STATED` implica valor nulo y ausencia de cita inventada;
- `OBSERVED` debe conservar cita literal y segmento existente;
- `UNCERTAIN` requiere evidencia pero señala ambigüedad;
- ningún campo de diagnosis o prescription forma parte del schema;
- exportar la nota sólo ocurre tras validación y revisión médica; Q3 no exporta.

### Validación posterior obligatoria

```text
Completion final
  → JSON.parse
  → Zod / JSON Schema de aplicación
  → consistencia de status/value
  → source grounding contra transcript y segmentos
  → accept | retry (máximo 2) | EXTRACTION_FAILED
```

Una salida que cumple la gramática y falla grounding es un fallo. No se «repara» añadiendo un diagnóstico o una cita plausible.

## Configuración que debe verificarse, no suponerse

| Elemento | Regla |
| --- | --- |
| Modelo | `QWEN3_600M_INST_Q4`, sólo si la constante aparece en el pin local. |
| Formato | `responseFormat: json_schema` exclusivamente, si la firma exacta está confirmada por tipos. |
| Prompt | SYSTEM + extracción versionados; transcript delimitado; sin instrucciones clínicas autónomas. |
| Parámetros de generación | Usar sólo claves que aparezcan en tipos 0.17.1. No inventar `temperature`, `temp`, `seed` ni controles de razonamiento. |
| Reintentos | Máximo 2 tras fallo validable; conservar primera salida y causa. |
| Datos | Sólo fixtures/transcripts sintéticos. |

Si no se puede construir el request con tipos reales, el resultado correcto es **BLOCKED**, no una aproximación de API.

## Casos mínimos de evaluación

La suite puede reutilizar fixtures de los 13 casos de Q2 tras recibir un transcript trazable. Debe contener al menos:

| Caso | Propósito | Resultado que debe detectarse | Estado |
| --- | --- | --- | --- |
| C1 | Hecho explícito | Campo `OBSERVED` con cita y segmento existentes | **BLOCKED — NEEDS DATASET/HARDWARE** |
| C2 | Negación | La negación no se convierte en afirmación | **BLOCKED — NEEDS DATASET/HARDWARE** |
| C3 | Dato no dicho | `NOT_STATED`, no relleno plausible | **BLOCKED — NEEDS DATASET/HARDWARE** |
| C4 | Ambigüedad | `UNCERTAIN` con evidencia | **BLOCKED — NEEDS DATASET/HARDWARE** |
| C5 | Canónico | «dolor de garganta» no se transforma en `assessment: "faringitis"` | **BLOCKED — NEEDS DATASET/HARDWARE** |
| C6 | Inyección en transcript | El contenido se mantiene como datos; no altera el contrato | **BLOCKED — NEEDS DATASET/HARDWARE** |
| C7 | Output largo/schema completo | Detecta truncación o llaves/tipos inválidos | **BLOCKED — NEEDS DATASET/HARDWARE** |

## Procedimiento

1. Congelar schema Zod, JSON Schema derivado, SYSTEM prompt, prompt de extracción y fixtures; calcular hashes.
2. Verificar que la API exacta de `responseFormat` existe en 0.17.1.
3. Cargar la constante autorizada y ejecutar una corrida por fixture con `json_schema`.
4. Consumir `run.events` y `run.final` conforme a la superficie confirmada por D1; guardar contenido crudo y terminación.
5. Aplicar la cadena completa de validación.
6. Ante fallo, guardar causa y permitir como máximo dos reintentos configurados. No modificar schema/prompt durante una misma celda.
7. Generar tabla de validez separada de la tabla de hechos clínicos no respaldados.
8. Sólo después de completar la suite, decidir mantener, simplificar o escalar.

## Métricas

| Métrica | Fórmula / criterio | Requisito P0 | Estado |
| --- | --- | --- | --- |
| JSON parseable | `JSON.parse` concluye | 100% | **BLOCKED — NEEDS TARGET HARDWARE** |
| Schema válido | Zod acepta sin coerciones clínicas | 100% | **BLOCKED — NEEDS TARGET HARDWARE** |
| Consistencia interna | status/value/cita cumplen reglas | 100% | **BLOCKED — NEEDS TARGET HARDWARE** |
| Source grounding | Campos `OBSERVED` tienen cita y segmento verificables | 100% | **BLOCKED — NEEDS TARGET HARDWARE** |
| Hecho clínico no respaldado | Afirmación sin soporte literal | 0 | **BLOCKED — NEEDS TARGET HARDWARE** |
| Not-stated correcto | C3 y casos equivalentes no rellenan datos | 100% de dichos casos | **BLOCKED — NEEDS TARGET HARDWARE** |
| Negación correcta | C2 y casos equivalentes preservan polaridad | 100% de dichos casos | **BLOCKED — NEEDS TARGET HARDWARE** |

La validez de JSON no compensa una invención. Reportar por separado ambas tasas evita confundir forma con seguridad clínica.

## Tablas de resultados vacías

### Resultado por fixture y tentativa

| Fixture | Tentativa | ¿Completion final? | JSON parseable | Zod válido | Grounding válido | Hecho no respaldado | Negación/NOT_STATED | Error o finish reason | Acción |
| --- | ---: | --- | --- | --- | --- | --- | --- | --- | --- |
| C1 | 1 | **BLOCKED — NEEDS TARGET HARDWARE** |  |  |  |  |  |  |  |
| C1 | 2 | No ejecutada |  |  |  |  |  |  |  |
| C1 | 3 | No ejecutada |  |  |  |  |  |  |  |
| … | … | **BLOCKED — NEEDS TARGET HARDWARE** |  |  |  |  |  |  |  |

### Resumen de decisión

| Configuración | Fixtures | JSON válido | Zod válido | Grounding | Hechos no respaldados | Resultado | Decisión |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| Schema completo + 600M | **BLOCKED — NEEDS TARGET HARDWARE** |  |  |  |  | No medido | No decidir |
| Schema simplificado | No ejecutado |  |  |  |  | No medido | No decidir |
| Modelo mayor permitido | No ejecutado |  |  |  |  | No medido | No decidir |

## Árbol de decisión posterior

| Observación reproducible | Decisión |
| --- | --- |
| Todo cumple, incluido grounding y cero hechos no respaldados | Mantener schema completo + 600M. |
| JSON/schema fallan, pero grounding no es el problema | Simplificar grupos anidados de forma explícita y repetir suite. |
| Schema simplificado sigue fallando | Escalar a un modelo permitido tras medir RAM/carga en Q4/Q5. |
| Aparece un hecho no respaldado o diagnóstico inventado | No enviar el componente; corregir prompt/schema/validación y repetir. |
| API de `json_schema` no existe en tipos del pin | Marcar `TODO: VERIFY FROM OFFICIAL QVAC DOCUMENTATION`; no sustituir con `json_object`. |

## Bloqueos y límites

**BLOCKED — NEEDS TARGET SDK/HARDWARE:** no hay ejecución de Qwen, porcentajes, RSS, latencia, JSON válido ni decisión de modelo.

**BLOCKED — NEEDS IMPLEMENTATION:** se necesita una única fuente de schema Zod y su derivación a JSON Schema, además del validador/grounder de aplicación. Escribir esos componentes corresponde a implementación posterior; este protocolo no los inventa.

Q3 tampoco acredita que la app sea diagnóstica, que sea precisa en producción ni que se pueda exportar sin médico. La única salida aceptable sigue siendo un borrador para revisión humana.

## Fuentes

1. Tether/QVAC. [API Summary — v0.17.x](https://docs.qvac.tether.io/reference/api/). Consultado el 2026-08-22.
2. Tether/QVAC. [HTTP server / structured output](https://docs.qvac.tether.io/cli/http-server/). Consultado el 2026-08-22.
3. [D1 — Auditoría de API QVAC](./D1-qvac-api-audit.md).
4. [D3 — Structured output](./D3-structured-output-literature.md).
5. [Guía IA/QVAC](../AI_QVAC_TRANSCRIPTION_GUIDE.md).
