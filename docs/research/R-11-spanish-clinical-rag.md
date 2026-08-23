# R-11 — ¿Debe usar RAG la etapa de estructuración, y en qué forma?

**Estado:** investigación documental completada; decisión incremental para prototipo.  
**Fecha de consulta de fuentes:** 2026-08-22.  
**Dependencias:** presupuesto de memoria (R-4); binding SQLite (R-3); prompt maestro v2 (`VISION.md`); cifrado/retención (R-5, I8); seam de glosario estático ya construido en `main/structure`.  
**Objetivo:** decidir si la etapa de estructuración incorpora recuperación de información (RAG) y en qué forma: (a) glosario estático de terminología + coincidencia por subcadenas (ya construido como seam de código), (b) índice léxico tipo BM25 sobre un léxico clínico español curado, (c) recuperación por embeddings local sobre terminología específica de la clínica y notas previas aceptadas.

## 1. Pregunta y alcance

El agente de estructuración recibe segmentos crudos del transcript (hablante + marca de tiempo) y produce un borrador de `ClinicalNote` en JSON estricto, con presencia honesta por campo (STATED/NOT_STATED/UNKNOWN) y trazabilidad (`sourceSegmentIds`). La pregunta es si esa etapa debe además *recuperar* conocimiento local (léxico clínico, terminología propia de la clínica, notas anteriores) para hacer mejor su trabajo.

Restricciones innegociables del producto en esta etapa:

- todo on-device, sin red en inferencia;
- presupuesto de memoria pequeño compartido con STT y LLM (ver R-4);
- español con habla médica coloquial y ruido de ASR;
- fase de prototipo: nada de este documento afirma calidad clínica, cumplimiento ni rendimiento de Oira;
- principio rector: «el agente documenta; el médico decide».

## 2. Marco: qué puede y qué no puede hacer RAG aquí

Por la regla de fidelidad radical del prompt v2, la recuperación **no puede ser una fuente de contenido clínico**: ningún texto recuperado puede convertirse en afirmación de la nota si no está respaldado por segmentos del transcript. El único papel coherente de RAG en esta etapa es:

1. **Propuesta de normalización de terminología**: dado un término hablado (colloquial, abreviado, mal reconocido por ASR), proponer candidatos del léxico curado para que el agente redacte con terminología normalizada — seleccionando entre candidatos, nunca generando fuera de la lista.
2. **Selección de contexto**: elegir fragmentos relevantes de material ya aceptado por el médico (p. ej., terminología habitual de la clínica) para informar la redacción, no el contenido.

Este patrón coincide con la literatura reciente de normalización clínica: los sistemas que restringen la elección del LLM a candidatos recuperados de un conjunto cerrado reducen la invención respecto del LLM sin recuperación [NEJM AI](https://ai.nejm.org/doi/full/10.1056/AIcs2401161); la sustitución *selectiva* — corregir solo términos ambiguos y dejar intacto lo correcto — preserva la estructura y evita sobre-corrección [DiRAG, MDPI Electronics](https://www.mdpi.com/2079-9292/14/18/3676); y la mejora más grande se observa cuando el modelo elige entre candidatos recuperados frente a generar en zero-shot (normalización HPO: 62 % sin recuperación frente a 85 % con lista de candidatos, con GPT-4o en la nube) [Frontiers in Digital Health](https://www.frontiersin.org/journals/digital-health/articles/10.3389/fdgth.2025.1495040/full). Estos resultados son de otros sistemas y otros entornos (mayoría con LLM remotos): **no se trasladan como métricas esperadas de Oira**; solo fijan el patrón arquitectónico.

## 3. Las tres opciones

### (a) Glosario estático + coincidencia por subcadenas (estado actual)

Hechos de diseño (CONFIRMED por inspección del repositorio): existe un seam de código donde la normalización por glosario se aplica de manera determinista sobre el texto del transcript.

| Ventaja | Coste |
| --- | --- |
| Determinista y auditable: cada sustitución es inspeccionable línea a línea | No cubre morfología española (género/número, flexiones) |
| Coste de RAM/CPU despreciable; sin modelos adicionales | Frágil ante variantes de ASR y errores ortográficos |
| Trivialmente testeable contra fixtures sintéticos | Sin sinónimos: «azúcar en la sangre» no llega a «glucemia» |
| Coherente con la revisión humana: el médico ve exactamente qué se cambió | Cobertura limitada por el trabajo manual de curación |

### (b) Índice léxico tipo BM25 sobre léxico clínico curado

- **CONFIRMED:** BM25 sigue siendo un baseline fuerte en recuperación zero-shot; los recuperadores densos suelen rendir por debajo de BM25 justo cuando hay cambio de dominio respecto de su entrenamiento (p. ej., BioASQ), que es exactamente nuestra situación: consultas ruidosas de ASR en español coloquial contra un corpus pequeño y específico. [BEIR, Thakur et al.](https://arxiv.org/abs/2104.08663)
- **CONFIRMED:** SQLite incluye FTS5 compilado por defecto en la mayoría de builds: tabla virtual con índice invertido, operador `MATCH` y función auxiliar `bm25()` integrada; las tablas de contenido externo evitan duplicar el texto indexado. Encaja con la dirección SQLite de R-3 sin añadir un runtime nuevo. [SQLite FTS5](https://www.sqlite.org/fts5.html)
- **Matiz:** los híbridos densos superan a BM25 puro en muchos datasets, pero al precio de añadir un encoder; dentro de las opciones puramente léxicas, BM25 es el escalado natural del mismo léxico curado. [Resources for Brewing BEIR](https://arxiv.org/abs/2306.07471)
- **Limitación conocida:** FTS5 no trae stemming español por defecto; la variante morfológica hay que resolverla con tokenizador configurado o pre-generando variantes en el léxico. Sigue fallando en sinonimia genuina («me quema al orinar» → disuria).

### (c) Recuperación por embeddings local

- **CONFIRMED (superficie del candidato):** `multilingual-e5-small` es un encoder multilingüe de 12 capas, embedding de 384 dimensiones, ~0.1 B de parámetros, cobertura de 100 idiomas incluido español, diseñado para recuperación asimétrica con prefijos `query:` / `passage:`. [Model card HF](https://huggingface.co/intfloat/multilingual-e5-small), [informe técnico mE5](https://arxiv.org/abs/2402.05672). Que *exista* el modelo no implica que quepa ni que sea rápido en el hardware objetivo: eso es **UNVERIFIED** hasta pasar el protocolo de R-4/Q4.
- **Fortaleza esperada:** sinonimia y paráfrasis — el caso paciente-coloquial → término clínico que el léxico + BM25 no cubren.
- **Riesgos propios:**
  - los recuperadores densos degradan fuera de su dominio de entrenamiento [BEIR](https://arxiv.org/abs/2104.08663);
  - la sugerencia es menos auditable: un vecino semántico erróneo es más difícil de explicar al médico que una entrada literal del glosario;
  - añade un tercer modelo a cargar (RAM, latencia de carga — ver Q5);
  - si el corpus incluye notas previas aceptadas, los embeddings derivan de datos de pacientes: superficie de retención/cifrado que pertenece a R-5/I8, no a esta decisión.

## 4. Comparación resumida

| Criterio | (a) Subcadenas | (b) BM25/FTS5 | (c) Embeddings local |
| --- | --- | --- | --- |
| Determinismo / auditabilidad | Total | Alta (ranking explicable) | Media (similitud opaca) |
| RAM/CPU añadida | ~nula | Baja (índice en disco, SQLite) | Alta (encoder residente) — por verificar en R-4 |
| Morfología/variantes | No | Parcial (sin stemming nativo) | Sí |
| Sinonimia/paráfrasis | No | No | Sí (esperado, no medido aquí) |
| Nuevas dependencias | Ninguna | Ninguna (SQLite ya previsto) | Runtime de embeddings + almacenamiento vectorial |
| Riesgo de contaminar la nota | Bajo (lista cerrada literal) | Bajo-medio (lista cerrada rankeada) | Medio (candidatos semánticos; exige restricción fuerte) |
| Madurez para prototipo | Actual | Alcanzable sin hardware nuevo | Requiere medición de memoria y diseño de auditoría |

## 5. Camino de adopción incremental con criterios explícitos

Las tres etapas comparten el mismo puerto/seam: la etapa de estructuración consume «candidatos de normalización» sin saber quién los produjo. Retroceder de etapa es cambiar configuración, no reescribir.

**Etapa 0 — hoy (prototipo): opción (a).**
El glosario por subcadenas es el mecanismo por defecto. Instrumentar desde ya un registro de *oportunidades de normalización no cubiertas*: cada término detectado como entidad clínica sin entrada de glosario aplicable, con el segmento de origen. Sin este registro no hay criterio para moverse de etapa.

**Criterio para pasar a Etapa 1 (BM25):**
- el registro de Etapa 0 acumula fallos recurrentes de flexión/variante que la curación por subcadenas no escala (cada término exige mantener N variantes escritas a mano), constatados sobre los fixtures sintéticos T1–T6 y no sobre intuición;
- el léxico curado supera el tamaño donde la coincidencia literal produce falsos negativos visibles;
- el umbral numérico de «tasa de fallo aceptable» se acuerda con IA/clinical safety **antes** de medir, igual que los bloqueadores de Q2. Este documento no fija ese número.

**Etapa 1 — opción (b).**
Añadir índice FTS5 sobre el mismo léxico curado (única fuente de verdad; BM25 solo cambia *cómo* se rankean candidatos, no de dónde salen). Continúa sin modelos neuronales.

**Criterios para pasar a Etapa 2 (embeddings), todos obligatorios:**
1. casos registrados de sinonimia/paráfrasis que el léxico + BM25 no cubren y que un curador humano confirma como equivalentes clínicos válidos;
2. presupuesto de memoria verificado: el encoder cabe junto a STT + LLM según el protocolo de R-4/Q4 en el hardware objetivo (**BLOCKED — NEEDS TARGET HARDWARE**);
3. diseño de auditoría listo: cada candidata recuperada se persiste con su score junto al borrador y se muestra al médico; la elección queda restringida a la lista recuperada;
4. decisión previa de privacidad sobre el corpus: Etapa 2 arranca solo sobre terminología curada; extenderlo a notas previas aceptadas exige pase previo por R-5/I8.

**Reglas invariantes en todas las etapas:**
- la recuperación propone, nunca inserta: nada recuperado entra a la nota sin respaldo en `sourceSegmentIds`;
- lo que no tiene respaldo sigue siendo NOT_STATED;
- toda normalización aplicada es visible y reversible en la vista de revisión;
- ninguna métrica de estos sistemas se publica como prestación de Oira mientras sea prototipo.

## 6. Qué no prueba este documento y preguntas abiertas

- No se midió RAM, latencia ni calidad de recuperación en el hardware objetivo: todo lo cuantitativo sobre Oira queda **BLOCKED — NEEDS TARGET HARDWARE**.
- **ABIERTA:** ¿qué encoder multilingüe pequeño cabe en el presupuesto de R-4? Candidato inicial `multilingual-e5-small`, sin confirmación.
- **ABIERTA:** tokenizador español adecuado para FTS5 (`unicode61` con reglas de diacríticos vs tokenizador propio con variantes pre-generadas). Requiere spike de laboratorio.
- **ABIERTA:** fuente del léxico curado y su licencia (terminologías normalizadas en español, diccionarios de pronunciación médica, léxico propio de la clínica piloto). Decisión separada, con revisión de licencias.
- **ABIERTA:** ¿se permite construir índice sobre notas previas aceptadas? Depende de I8 (retención) y R-5 (cifrado); hasta entonces, excluido.
- **ABIERTA:** definición operativa de «oportunidad de normalización» para poder contar fallos sin ambigüedad.

## 7. Fuentes primarias

Todas consultadas el 2026-08-22.

1. Thakur, N. et al. [BEIR: A Heterogeneous Benchmark for Zero-shot Evaluation of Information Retrieval Models](https://arxiv.org/abs/2104.08663). arXiv:2104.08663 / NeurIPS 2021 Datasets & Benchmarks.
2. Kamalloo, E. et al. [Resources for Brewing BEIR: Reproducible Reference Models and an Official Leaderboard](https://arxiv.org/abs/2306.07471). arXiv:2306.07471.
3. SQLite. [FTS5 Extension (función `bm25()`, tablas de contenido externo)](https://www.sqlite.org/fts5.html).
4. Wang, L. et al. [Multilingual E5 Text Embeddings: A Technical Report](https://arxiv.org/abs/2402.05672). arXiv:2402.05672.
5. Hugging Face. [intfloat/multilingual-e5-small — model card](https://huggingface.co/intfloat/multilingual-e5-small).
6. Journal of Medical Internet Research (2026). [CNTRAM: mapeo RAG de registros de enfermería a terminología estandarizada](https://www.jmir.org/2026/1/e89850).
7. NEJM AI. [Assessing Retrieval-Augmented Large Language Models for Medical Coding](https://ai.nejm.org/doi/full/10.1056/AIcs2401161).
8. Frontiers in Digital Health (2025). [A simplified retriever to improve accuracy of phenotype normalizations by large language models](https://www.frontiersin.org/journals/digital-health/articles/10.3389/fdgth.2025.1495040/full).
9. MDPI Electronics (2025). [Enhancing Clinical NER via Fine-Tuned BERT and Dictionary-Infused RAG (DiRAG)](https://www.mdpi.com/2079-9292/14/18/3676).

## Decisión de producto

**Sí a RAG, pero en forma restringida y por etapas.** La etapa de estructuración mantiene hoy el glosario estático por subcadenas (etapa 0) como único mecanismo activo de normalización; se adoptará un índice léxico BM25 vía SQLite FTS5 sobre el mismo léxico curado (etapa 1) solo cuando el registro de fallos sobre fixtures demuestre que la coincidencia literal no escala; y la recuperación por embeddings local (etapa 2) queda **DEFERRED** hasta que la etapa léxica sea insuficiente en sinonimia/paráfrasis, el presupuesto de memoria esté verificado en hardware objetivo y exista diseño de auditoría. En todas las etapas, la recuperación es generación de candidatos sobre conjuntos cerrados y curados — jamás inyección de contenido: lo no dicho en la consulta permanece NOT_STATED, y toda normalización queda visible y reversible para el médico revisor. Mientras Oira sea prototipo, ninguno de estos mecanismos se presenta con afirmaciones de calidad clínica ni de rendimiento.
