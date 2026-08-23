# R-12 — Fine-tuning de Whisper en español clínico frente a modelo base + postproceso restringido

**Estado:** investigación documental completada; decisión para prototipo.  
**Fecha de consulta de fuentes:** 2026-08-22.  
**Dependencias:** D2 (elegibilidad y pin `@qvac/sdk@0.17.1`, política de constantes de catálogo); Q1/Q2 (viabilidad `language: 'es'` y criterios bloqueantes); R-2 (formato/captura de audio); R-4 (presupuesto de memoria).  
**Objetivo:** decidir el camino para mejorar la transcripción médico-española: (i) fine-tuning de modelos de la familia Whisper, o (ii) modelo base + postprocesado restringido (normalización por glosario determinista + pase de corrección LLM «no inventor»), considerando coste, escasez de datos clínicos españoles, riesgo de regresión catastrófica, límites de despliegue on-device y metodología de evaluación centrada en términos médicos.

## 1. Restricciones del producto

- Todo on-device; sin nube en inferencia; presupuesto de memoria pequeño compartido con el LLM de estructuración (R-4).
- Política D2: solo constantes del catálogo auditado de QVAC (`WHISPER_SPANISH_TINY_Q8_0`, `WHISPER_TINY`, escalado a `WHISPER_SMALL_Q8_0` si Q2 lo exige). Un fine-tune propio estaría fuera del catálogo y rompería el comparativo reproducible.
- Principio rector: «el agente documenta; el médico decide» — ninguna corrección automática puede alterar contenido sin dejar rastro visible.
- Fase de prototipo: este documento no afirma calidad, cumplimiento ni rendimiento de Oira.

## 2. Evidencia externa

### 2.1 Escasez de datos: español general sobra, español clínico falta

| Recurso | Contenido | Estado / limitación |
| --- | --- | --- |
| [Common Voice 26.0 — español](https://mozilladatacollective.com/datasets/cmqim2spa00synr071fcp7av0) | 2 278,66 h grabadas; 595,45 h validadas; clips de lectura | Habla leída no clínica; ~68 % sin validar |
| [Common Voice Spontaneous Speech 4.0 — español](https://mozilladatacollective.com/datasets/cmqi28y2v004imf076oh7e5zs) | 1,21 h totales; 0,07 h validadas | Irrelevante como corpus de entrenamiento |
| [MedTranscripts/MedTitles (CSIC/Zenodo)](https://digital.csic.es/handle/10261/398113) | 30 h de audio médico español alineado; 20 h gold revisadas por dos anotadores | Público desde 2026-08-02; grabaciones de proveedores autorizados, no consultas espontáneas masivas |
| [TEME-v1 (Zenodo)](https://zenodo.org/records/17280661) | 90 diálogos médicos españoles con audio | Tamaño pequeño; más benchmark de evaluación que corpus de entrenamiento |
| [ClInt](https://clic.ub.edu/corpus/en/clint) | 15 h de entrevistas clínicas español-catalán | No disponible |

El estudio de referencia en español latinoamericano médico usó solo 10 vídeos de consultas y sus autores señalan que eso cae muy por debajo de las cientos de horas típicamente requeridas para entrenar STT robusto en dominios especializados, y que esa carencia probablemente atenuó a su modelo ajustado [medRxiv 2026](https://www.medrxiv.org/content/10.64898/2026.07.14.26358062v1.full). Conclusión factual: **hoy no existe un corpus público conversacional clínico en español de tamaño suficiente para un fine-tuning serio**, y construir uno propio con audio real de pacientes está excluido por regla del proyecto (los fixtures deben ser sintéticos).

### 2.2 Fine-tuning: puede no ayudar y puede regredir

- En ese benchmark, Whisper Large v3 sin ajustar logró WER 18,6 % sobre los diez vídeos y ninguna iteración de fine-tuning lo superó (el mejor ajuste quedó en 19,7 %); en la validación externa el modelo ajustado tampoco superó a los modelos cerrados [medRxiv 2026](https://www.medrxiv.org/content/10.64898/2026.07.14.26358062v1.full).
- El análisis por capas de adaptación médica multilingüe concluye que el fine-tuning mejora sobre zero-shot, pero el mejor modelo depende del escenario de adaptación: con datos pequeños y desbalanceados la transferencia es inconsistente y los resultados con corpora mínimos no deben leerse como generalización [arXiv:2608.18825](https://arxiv.org/html/2608.18825). Este es exactamente el patrón de regresión catastrófica: adaptar fuerte a un subdominio pequeño puede degradar el comportamiento general que ya funcionaba.
- Los trabajos que combinan fine-tune + corrector operan fuera de nuestro régimen: United-MedASR usa Whisper medium ajustado con datos sintéticos más un BART corrector sobre Faster Whisper/CTranslate2 [arXiv:2412.00055](https://arxiv.org/html/2412.00055v1); Pharma-Speak aplica LoRA sobre Whisper-Large con rescoring de LLaMA 3 [OpenReview](https://openreview.net/forum?id=gpKEDj9Dgg). Ninguno valida el patrón dentro de whisper.cpp con constantes de un catálogo cerrado como el de QVAC.

### 2.3 Corrección LLM directa: eficaz con modelos grandes, peligrosa con prompts simples

- Con prompting simple, la corrección ASR por LLM a menudo introduce tantos o más errores de los que corrige; RLLM-CF documenta alucinaciones fieles (continuar el texto, corregir gramática no pedida) y fácticas, y necesita pre-detección de errores, corrección iterativa por subtareas y verificación obligatoria para reducir CER/WER de forma fiable [RLLM-CF, arXiv:2505.24347](https://doi.org/10.48550/arxiv.2505.24347).
- La evidencia positiva más clara (WhisperX seguido de GPT-4o redujo WER entre 4,52 y 6,89 puntos en habla clínica inglesa) proviene de un LLM remoto de gran tamaño; sus autores advierten además que WER y Levenshtein no capturan del todo los errores clínicamente relevantes [npj Digital Medicine](https://www.nature.com/articles/s41746-026-02490-z).
- En diálogo médico, los LLM usados para limpiar ruido de ASR pueden inyectar síntomas o fármacos irrelevantes en el transcript; MEDSAGE recuerda además que el denoising por prompting sin fine-tuning solo resulta efectivo con modelos muy grandes (del orden de más de 100 B de parámetros según Yang et al., citado allí), justo lo que no cabe on-device [MEDSAGE, AAAI](https://ojs.aaai.org/index.php/AAAI/article/view/34518/36673).

**Tensión central para Oira:** casi toda la evidencia favorable a la corrección LLM viene de modelos remotos enormes; nuestros LLM locales son de escala pequeña (contexto Q3/Q18). Que un LLM local pequeño corrija más de lo que rompe en español clínico es **UNVERIFIED** y debe medirse antes de activarse jamás.

### 2.4 Métricas: el WER agregado no basta

- WER se correlaciona pobremente con el impacto clínico asignado por clínicos expertos: sustituciones triviales y cambios graves de sentido pueden pesar igual [WER is Unaware, IWSDS/ACL 2026](https://aclanthology.org/2026.iwsds-1.39/).
- Un WER bajo puede ocultar alucinaciones peligrosas y viceversa; se propone la métrica HER (hallucination error rate) como complemento obligatorio en dominios de alto riesgo [Demystifying Hallucination in Speech Foundation Models, Findings ACL 2025](https://aclanthology.org/2025.findings-acl.1190.pdf).
- Traducción a nuestro contexto: la evaluación debe heredar los bloqueadores de Q2 (cero fármacos inventados, cero errores de dosis, cero negaciones omitidas o invertidas, timestamps utilizables) y añadir un **term-WER** desagregado sobre nombres de fármacos, dosis, unidades y negaciones, medido sobre fixtures sintéticos guionizados. Nunca publicar un único número de WER como resumen de calidad.

## 3. Comparación de caminos

| Criterio | Fine-tune Whisper | Base + glosario determinista | Base + pase LLM restringido |
| --- | --- | --- | --- |
| Datos necesarios | Cientos de horas clínicas; hoy inexistentes en público | Solo curación de léxico | Fixtures + léxico + protocolo de verificación |
| Coste de desarrollo | Alto (entrenamiento, evaluación continua, MLOps) | Ya construido como seam | Medio (prompt + verificación + eval) |
| Riesgo de regresión general | Alto con corpus pequeño; exige set de regresión permanente | Nulo (determinista) | Medio-alto sin verificación; controlable con restricción fuerte |
| Compatibilidad on-device / catálogo QVAC | Fuera del catálogo auditado; conversión ggml propia sin validar | Total | Total si reutiliza el LLM ya cargado |
| Auditabilidad de cada cambio | Baja (pesos opacos) | Total (sustituciones literales) | Alta si cada cambio es diff-visible y verificable |

## 4. Diseño del pase de corrección «no inventor» (si se llega a activar)

Si algún día se activa una corrección LLM local, el diseño debe heredar las lecciones de la literatura:

1. **Pre-detección antes que corrección**: si no hay error detectado, el texto pasa intacto (patrón RLLM-CF).
2. **Selección cerrada, no generación libre**: ante un término sospechoso, el LLM solo elige entre candidatos fonéticamente cercanos del léxico curado (misma fuente que R-11); nunca propone palabras fuera de la lista.
3. **Campos intocables sin marca**: dosis, unidades y negaciones no se reescriben; como mucho se marcan como dudosas para revisión humana.
4. **Diff visible y reversible**: cada cambio queda registrado junto al transcript original; la vista de revisión muestra ambos y el médico decide. El transcript literal nunca es sobrescrito.
5. **Verificación obligatoria**: toda salida del pase se valida contra reglas (el término final pertenece al léxico; longitud y tokens no crecen injustificadamente) antes de aceptarse.
6. **Medición previa obligatoria**: MEASURE-ONLY sobre fixtures sintéticos con term-WER y chequeo de alucinaciones; sin resultados reproducibles, el pase permanece desactivado.

## 5. Condiciones para reabrir el fine-tuning

El fine-tuning queda bloqueado hasta cumplir **todas** estas puertas, en este orden:

1. **Datos**: existencia de un corpus clínico conversacional español suficiente, con licencia y consentimiento claros (público hoy solo hay fragmentos: MedTranscripts 20 h gold; TEME-v1 90 diálogos). El mínimo de horas necesario se acuerda con IA/clinical safety antes de medir — este documento no fija el número.
2. **Harness de evaluación**: term-WER por categoría (fármacos, dosis, unidades, negaciones), chequeo tipo HER sobre silencios/ruido, y set de regresión de español general (split de test de Common Voice) para detectar olvido catastrófico.
3. **Ruta de empaquetado**: demostración de que pesos ajustados pueden distribuirse y cargarse dentro del pin QVAC sin romper la política D2 de catálogo auditado; si no, el fine-tune sigue excluido por diseño.
4. **Beneficio demostrado**: comparación pareada contra el modelo base ganador de Q2 sobre los mismos fixtures, mostrando mejora en term-WER **sin** regresión en el set general ni violación de ningún bloqueador.

## 6. Qué no prueba este documento y preguntas abiertas

- No se ejecutó ningún fine-tune ni corrección: todo resultado cuantitativo sobre Oira queda **BLOCKED — NEEDS TARGET HARDWARE**.
- Los números citados (WER 18,6 %/19,7 %, reducciones de 4,52–6,89 puntos, horas de Common Voice) son hallazgos publicados de otros sistemas y otros entornos; no predicen el comportamiento de los modelos tiny/small del catálogo QVAC en español clínico.
- **ABIERTA:** ¿rendimiento real de `WHISPER_SPANISH_TINY_Q8_0` frente a `WHISPER_TINY` en los fixtures T1–T6? Eso lo resuelve Q1/Q2, no este documento.
- **ABIERTA:** ¿un LLM local pequeño puede aplicar la pre-detección de errores de forma fiable, o genera demasiados falsos positivos/negativos? Requiere experimento propio.
- **ABIERTA:** ¿la métrica HER propuesta para ASR puede operacionalizarse localmente sin un juez LLM grande? Alternativa a explorar: reglas léxicas sobre categorías críticas.
- **ABIERTA:** licencias y condiciones de uso de MedTranscripts y TEME-v1 como benchmarks (solo evaluación, nunca entrenamiento con audio real de pacientes).

## 7. Fuentes primarias

Todas consultadas el 2026-08-22.

1. medRxiv (2026). [Benchmarking Speech Recognition Models for Medical Consultations in Latin American Spanish: A Comparative Evaluation with Fine-Tuning](https://www.medrxiv.org/content/10.64898/2026.07.14.26358062v1.full).
2. npj Digital Medicine (2026). [Accent related errors in clinical speech transcription and a LLM-based remedy](https://www.nature.com/articles/s41746-026-02490-z).
3. arXiv:2505.24347 (2025). [Fewer Hallucinations, More Verification: A Three-Stage LLM-Based Framework for ASR Error Correction (RLLM-CF)](https://doi.org/10.48550/arxiv.2505.24347).
4. Findings of ACL 2025. [Demystifying Hallucination in Speech Foundation Models](https://aclanthology.org/2025.findings-acl.1190.pdf).
5. IWSDS / ACL Anthology (2026). [WER is Unaware: Assessing How ASR Errors Distort Clinical Understanding in Patient-Facing Dialogue](https://aclanthology.org/2026.iwsds-1.39/).
6. Mozilla Data Collective. [Common Voice Scripted Speech 26.0 — Spanish (datasheet)](https://mozilladatacollective.com/datasets/cmqim2spa00synr071fcp7av0).
7. Mozilla Data Collective. [Common Voice Spontaneous Speech 4.0 — Spanish (datasheet)](https://mozilladatacollective.com/datasets/cmqi28y2v004imf076oh7e5zs).
8. Campillos-Llanos, L. (2025). [MedTitles/MedTranscripts — dataset multimodal de audio médico español (CSIC / Zenodo, DOI 10.5281/zenodo.16729213)](https://digital.csic.es/handle/10261/398113).
9. Zenodo (2026). [TEME-v1 — Spanish Medical Dialogue Dataset](https://zenodo.org/records/17280661).
10. CLiC-UB. [ClInt — corpus bilingüe español-catalán de entrevistas clínicas](https://clic.ub.edu/corpus/en/clint).
11. arXiv:2412.00055 (2024). [High-Precision Medical Speech Recognition Through Synthetic Data and Semantic Correction: United-MedASR](https://arxiv.org/html/2412.00055v1).
12. OpenReview (2024). [Optimizing LLMs with ASR for Medication Corpus in Low-Resource Healthcare Settings (Pharma-Speak, LoRA + rescoring)](https://openreview.net/forum?id=gpKEDj9Dgg).
13. arXiv:2608.18825 (2026). [Understanding Multilingual Medical ASR Adaptation Through Layer-Wise Analysis](https://arxiv.org/html/2608.18825).
14. AAAI (2025). [MEDSAGE: Enhancing Robustness of Medical Dialogue Summarization against ASR Noise via LLM Synthetic Dialogue Augmentation](https://ojs.aaai.org/index.php/AAAI/article/view/34518/36673).

## Decisión de producto

**Prototipo: modelo base del catálogo (según decida Q2) + postproceso determinista por glosario como única corrección activa; nada de fine-tuning ahora.** El fine-tuning de Whisper queda DEFERRED hasta que existan datos clínicos españoles suficientes con licencia clara, un harness de evaluación con term-WER y regresión de español general, una ruta de empaquetado compatible con el pin QVAC/D2 y beneficio reproducible sobre los mismos fixtures; con los corpus públicos actuales (decenas de horas, no cientos) y la evidencia de que ajustar sobre poco datos puede empeorar al modelo base, el riesgo de regresión catastrófica supera al beneficio esperado. El pase de corrección LLM queda DEFERRED y, si se activa, solo en su forma «no inventor»: pre-detección, selección cerrada entre candidatos del léxico curado, campos de dosis/unidades/negación intocables, diff visible y reversible para el médico, y verificación obligatoria — jamás una reescritura libre del transcript. Mientras Oira sea prototipo, no se publica ninguna cifra de WER ni afirmación de precisión médica derivada de este análisis.
