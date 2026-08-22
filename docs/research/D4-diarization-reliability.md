# D4 — Confiabilidad de diarización y roles clínicos

> **Estado:** decisión de escritorio completada; toda validación de Sortformer queda **BLOCKED — NEEDS TARGET HARDWARE**.  
> **Fecha:** 22 de agosto de 2026.

## Decisión

**P0 debe conservar una transcripción sin roles automáticos DOCTOR/PATIENT.** Si más adelante se muestra diarización, la interfaz puede presentar únicamente índices neutrales (`Speaker 0`, `Speaker 1`, …) y exigir que el médico haga un vínculo explícito y revisable antes de usar una etiqueta humana. No se inferirán roles clínicos desde el nombre del índice, tono de voz, orden de intervención ni texto.

La diarización responde a «quién habló cuándo» como segmentación e índices; no identifica por sí misma a una persona ni garantiza que un índice se mantenga estable entre conversaciones. En una nota clínica, transformar un índice de modelo en «médico» o «paciente» sin confirmación humana puede atribuir un síntoma, una negación o un plan a la persona equivocada. Esa es una falla clínica, no una mejora cosmética.

## Hechos confirmados de QVAC

La documentación oficial de QVAC describe Sortformer como diarización de hasta cuatro hablantes. Su ejemplo público sigue una ruta de dos pasos: primero diariza el audio y después transcribe los segmentos con Parakeet TDT. Por tanto, el soporte documentado no equivale a una salida clínica con roles humanos, ni a una promesa de exactitud en español, consulta ambulatoria, solapamientos o micrófonos del MVP [QVAC, 2026a; QVAC, 2026b].

La documentación consultada no ofrece una métrica de DER, WDER, estabilidad de índices, tasa de confusión ni una garantía de identidad para el caso de NotaLocal. Esas propiedades quedan como **UNVERIFIED** hasta Q11. Si los tipos del SDK instalado no exponen una salida estructurada, se debe conservar `TODO: VERIFY FROM OFFICIAL QVAC DOCUMENTATION`; Q17 es la investigación que determina si se recibe objeto tipado o texto que necesita análisis.

## Evidencia externa y límite

La literatura define el error de diarización como una combinación de confusión de hablante, habla perdida y falsas alarmas. Esto explica por qué una etiqueta aparentemente ordenada puede ser incorrecta en una consulta con interrupciones, habla simultánea o cambios de distancia al micrófono. Es evidencia general: no mide Sortformer ni autoriza a publicar una métrica de NotaLocal [Huang et al., 2025].

En diálogos clínicos, estudios de sistemas de scribe han medido errores de diarización a nivel de palabra y muestran que el rendimiento depende de datos y condiciones concretas. Esa evidencia demuestra que la atribución debe evaluarse, pero no permite transferir sus números a QVAC, al español ni al dispositivo objetivo [Tran et al., 2023]. Un trabajo reciente sobre identificación de roles en conversaciones clínicas trata los identificadores numéricos de diarización como una señal que debe evaluarse, no como una identidad fiable por defecto [Zolensky et al., 2025].

## Reglas de producto

| Elemento | P0 | Si Q11 resulta viable |
| --- | --- | --- |
| Roles «Médico»/«Paciente» automáticos | Prohibidos | Prohibidos |
| Índices de hablante | No se muestran por defecto | Se pueden mostrar como índices neutrales |
| Vínculo índice → persona | No aplica | Acción explícita del médico, reversible y visible |
| Datos de nota | No dependen de rol | La evidencia conserva transcript y segmento; el rol no sustituye la revisión |
| Copy público | No prometer «distingue médico y paciente» | Solo describir comportamiento medido y limitado |

El parser o la UI no deben convertir `Speaker 0` en «médico» porque aparezca primero. Tampoco se debe pedir al LLM que haga esa conversión: cambiaría un problema de diarización medible por una inferencia no trazable.

## Protocolo Q11 bloqueado

**BLOCKED — NEEDS TARGET HARDWARE.** Ejecutar 3–5 casos sintéticos en español, con dos hablantes, solapamiento y turnos breves. Registrar: número de índices, estabilidad por caso, confusiones, fragmentaciones, uniones erróneas, error de límites y comportamiento con solapamiento. Evaluar por separado el texto y la atribución; no usar una WER global como sustituto de diarización. Q11 decide entre: (a) mostrar índices neutros con vínculo humano, o (b) descartar diarización de la UI.

## Clasificación

| Afirmación | Estado |
| --- | --- |
| QVAC documenta Sortformer para hasta cuatro hablantes y un flujo diarizar→transcribir | CONFIRMED |
| Sortformer identifica de forma fiable a médico y paciente en español | UNVERIFIED |
| P0 no debe asignar roles automáticos | DECISIÓN |
| «La app sabe quién dijo cada cosa» | FORBIDDEN |
| Una asociación manual de índices puede evaluarse como opción posterior | CONDICIONAL — depende de Q11 y Q17 |

## Fuentes

1. **QVAC.** “Transcription — Parakeet Sortformer.” Documentación oficial, consultada el 22 de agosto de 2026. https://docs.qvac.tether.io/ai-capabilities/transcription/
2. **QVAC.** “qvac/transcription-parakeet.” Documentación oficial, consultada el 22 de agosto de 2026. https://docs.qvac.tether.io/addons/transcription-parakeet/
3. **Huang, S. et al.** “Diarization-Aware Multi-Speaker Automatic Speech Recognition.” *arXiv:2506.05796*, 2025. https://arxiv.org/abs/2506.05796
4. **Tran, B. D. et al.** “Automatic speech recognition performance for digital scribes.” *NPJ Digital Medicine*, 2023. https://pmc.ncbi.nlm.nih.gov/articles/PMC10148344/
5. **Zolensky, A. et al.** “Speaker Role Identification in Clinical Conversations.” 2025. https://pmc.ncbi.nlm.nih.gov/articles/PMC12632672/
