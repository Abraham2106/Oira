# Q13 — Ensamblado de segmentos STT en español

**Estado:** protocolo P1 de laboratorio  
**Fecha:** 22 de agosto de 2026  
**SDK fijado:** **BLOCKED — NEEDS TARGET HARDWARE**. Verificar versión instalada de @qvac/sdk y tipos/ejemplos antes de ejecutar.

## Decisión

**No aprobar todavía una regla de concatenación de producción.** La única regla segura antes de la corrida es preservar los límites y usar **sourceSegmentIds: string[]** para toda sección que derive de más de un segmento. La concatenación de texto debe ser mecánica: no corregir palabras clínicas, negaciones, mayúsculas ni puntuación. La elección exacta de separador y la caminata de verifySource quedan **BLOCKED — NEEDS TARGET HARDWARE** porque dependen de la forma real de .stt.json con metadata: true.

El prompt del repositorio indica que ejemplos oficiales usan join(''); antes de convertirlo en código hay que confirmar ese ejemplo en la versión instalada. No se debe sustituir por join(' '), trimming, heurísticas de puntuación ni normalización “inteligente”: un corte VAD puede estar en mitad de oración y un cambio mecánico puede alterar palabras médicas.

## Alcance

- Audio sintético español médico, sin datos de pacientes.
- Objetivo: transcript por segmento, uniones de segmentos consecutivos y trazabilidad de evidencia.
- Fuera de alcance: WER, calidad clínica general, diarización y transcripción en vivo.
- No se presupone la forma de segments, id, timestamps ni respuesta de verifySource: leer tipos instalados y registrar el JSON observado.

## Hechos de escritorio

| Hecho | Estado | Fuente |
| --- | --- | --- |
| QVAC declara capacidad de speech-to-text y ejecución local. | CONFIRMADO, genérico | [S1], [S2] |
| El prompt del proyecto exige metadata: true y señala ejemplos con join(''). | CONFIRMADO para la investigación, no para la API instalada | [S3] |
| La forma de .stt.json, las claves de segmentos y el comportamiento de VAD en español. | **UNVERIFIED / BLOCKED** | Debe comprobarse con SDK/hardware. |

## Diseño de datos recomendado

- Una evidencia debe conservar sourceSegmentIds: string[] en orden observado.
- Para una evidencia de un segmento, sourceSegmentIds contiene un solo ID; no exponer una superficie distinta llamada segment_id.
- Para una evidencia que atraviesa límites, conservar todos los IDs consecutivos, sin deduplicar ni reordenar.
- La representación de texto se almacena como joinedText mecánico; el renderer puede abrir cada ID y resaltar el rango.
- No persistir un “texto arreglado” como transcript fuente. Una edición del médico pertenece a la nota, no al transcript.

## Método de laboratorio

### Fixtures

Crear tres WAV sintéticos de 16 kHz mono, sin datos reales:

| Fixture | Guion de control | Objetivo |
| --- | --- | --- |
| A | “El paciente refiere dolor de garganta y no ha tenido fiebre.” | Detectar negación y corte potencial dentro de oración. |
| B | “Toma paracetamol, cinco miligramos, por la noche.” | Observar fármaco/dosis sin corregirlo. |
| C | “El dolor empezó ayer. Hoy está un poco mejor.” | Observar frontera natural y puntuación. |

### Ejecución

1. Registrar plataforma, SO, CPU/GPU, versión exacta del SDK, checksum del fixture, constante STT y configuración completa.
2. Cargar modelo sólo con símbolos presentes en tipos/ejemplos de esa versión.
3. Ejecutar transcripción con metadata: true si y sólo si el tipo instalado admite esa clave.
4. Guardar respuesta bruta como .stt.json en directorio de evaluación excluido de commits; no incluir audio ni transcript sintético completo en logs de producción.
5. Imprimir vista estructural: claves de nivel superior, cantidad de segmentos y tipos observados de ID/texto/tiempo, sin inventar nombres de campo.
6. Para cada par de segmentos consecutivos, registrar texto emitido, join('') si el ejemplo oficial instalado lo usa, y cualquier alternativa sólo como columna experimental.
7. Implementar temporalmente verifySource(ids) que recorra IDs consecutivos según orden observado; registrar faltantes, duplicados y contigüidad.
8. Borrar WAV y JSON de trabajo según el protocolo de retención del equipo.

## Tabla de resultados

| run_id | fecha | SDK / modelo | fixture | metadata aceptada | forma observada de segmento | N segmentos | texto mecánico observado | join('') confirmado por ejemplo instalado | IDs consecutivos verificables | fallo / error exacto | decisión |
| --- | --- | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- |
| **BLOCKED — NEEDS TARGET HARDWARE** | — | — | A | — | — | — | — | — | — | — | — |
| **BLOCKED — NEEDS TARGET HARDWARE** | — | — | B | — | — | — | — | — | — | — | — |
| **BLOCKED — NEEDS TARGET HARDWARE** | — | — | C | — | — | — | — | — | — | — | — |

## Criterio de decisión posterior

| Resultado de laboratorio | Regla de producción |
| --- | --- |
| El ejemplo oficial de la versión instalada usa join('') y el JSON conserva IDs ordenados. | Usar join('') sólo como representación mecánica de evidencia; conservar sourceSegmentIds[]. |
| El tipo/ejemplo difiere o metadata no entrega IDs trazables. | No implementar verifySource por rango; mostrar “Sin origen identificado” y abrir incidencia con versión/error exactos. |
| Hay cortes VAD en mitad de frase. | No aplicar corrección lingüística; conservar segmentos y revisar el borrador manualmente. |
| IDs no son únicos o no pueden ordenarse. | No construir una caminata por índice asumida; solicitar documentación oficial. |

## Caveats

- Un join correcto no demuestra exactitud de STT ni fidelidad clínica.
- No inventar una API de append o streaming a partir de este protocolo; Q13 trabaja sobre salida batch observada.
- Métricas de español, latencia y recursos quedan fuera de esta corrida.

## Fuentes

- **[S1] CONFIRMADO — QVAC/Tether.** *QVAC — Decentralized, Local AI in a Single API*. https://qvac.tether.io/ (acceso: 22-08-2026).
- **[S2] CONFIRMADO — Tether.** *tetherto/qvac*, repositorio oficial. https://github.com/tetherto/qvac (acceso: 22-08-2026).
- **[S3] CONFIRMADO — Oira.** *Prompt Q13 — IA/QVAC researcher prompts*. docs/research/prompts/ai-qvac.md (acceso: 22-08-2026).
