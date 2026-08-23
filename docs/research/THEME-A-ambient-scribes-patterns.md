# Theme A — Patrones de scribes humanos y documentación ambiental

**Estado:** investigación complementaria P0  
**Fecha de acceso a fuentes:** 22 de agosto de 2026  
**Alcance:** identificar patrones transferibles de scribes humanos y productos de documentación ambiental para Oira.  
**No decide:** I3 (pane inicial tras estructurar), I4 (secciones de nota), I7 (reglas de aceptación) ni I11/I12.  
**Principio de evaluación:** **el agente documenta; el médico decide.**

## Decisión

**Copiar el patrón de “borrador para revisión humana” y adaptar la trazabilidad hacia el origen; prohibir cualquier patrón que transforme la salida en decisión clínica, finalización automática, órdenes/prescripciones o integración EHR ficticia.**

Las fuentes profesionales y regulatorias describen al scribe como apoyo de documentación bajo supervisión, no como sustituto de quien valida. CMS recomienda que la información dictada, introducida por scribe o convertida por voz a texto sea revisada, editada y aprobada oportunamente [S2]. Los proveedores de documentación ambiental revisados describen también notas generadas como borradores para revisión del profesional [S4–S6]. Es una convergencia útil, aunque los proveedores son fuentes de producto, no evidencia independiente de eficacia.

Para Oira, el patrón más seguro no es “la nota se termina sola”, sino: **captura visible → procesamiento → borrador marcado → revisión/editado por el médico → aceptación explícita → exportación elegida por el médico**. El transcript conserva el rol de fuente, no de instrucción; la salida no puede convertirse en diagnóstico, orden o recomendación.

## Cómo operan los patrones observados

Un **scribe humano** acompaña la consulta para documentar en tiempo real dentro del expediente bajo supervisión del médico. La AMA lo caracteriza como asistente de documentación que transcribe durante visitas clínicas y menciona que libera al médico de parte de la tarea de documentar para centrarse en el paciente [S1]. La aportación de Oira no cambia la responsabilidad de revisión: sustituye parte de la transcripción por un pipeline local, no al médico como autor clínico.

La **documentación ambiental** captura la conversación y genera una nota estructurada después o al final de la visita. Abridge describe una nota lista para revisión al terminar y herramientas de edición; Microsoft describe generación de documentación clínica en borrador para revisión del clínico [S4, S5]. Abridge además presenta evidencia enlazada para facilitar la validación, pero declara que sus notas son revisadas y editadas por quien realizó el encuentro antes de entrar al EHR [S6]. En consecuencia, “revisión” no debe ser una palabra decorativa: necesita badge permanente, edición real y vínculo al origen.

## Matriz de transferencia

| Patrón | Scribe humano | Productos ambientales | Copiar / adaptar / prohibir | Por qué para Oira | Fuente |
| --- | --- | --- | --- | --- | --- |
| Documentar bajo supervisión del médico | El scribe registra durante la visita bajo supervisión. | La IA genera documentación en borrador. | **COPIAR** | El output conserva la condición de borrador y la responsabilidad clínica no se desplaza. | [S1], [S3], [S5] |
| Médico presente con el paciente | El scribe reduce la atención al EHR. | La captura ocurre en segundo plano durante conversación. | **ADAPTAR** | Durante `RECORDING`, Oira debe minimizar distracciones y hacer inequívoco el estado del micrófono; no mostrar live transcript P0. | [S1], [S4] |
| Nota disponible al terminar | El scribe puede adelantar el registro. | Nota estructurada lista para revisar post-visita. | **ADAPTAR** | Llevar a `READY_FOR_REVIEW`, nunca a exportación automática. El orden exacto de transcript/nota se deja a I3. | [S4], [S5] |
| Revisión, edición y aprobación | El médico revisa y firma/valida. | Proveedores indican revisión/edición por clínico. | **COPIAR** | Botón de aceptación explícito, sin “aprobado por IA”, y campos editables. I7 definirá barreras concretas. | [S2], [S3], [S6] |
| Evidencia o fuente de cada afirmación | No es una característica de UI; el scribe puede aclarar contexto. | Un proveedor ofrece evidencia enlazada para revisión. | **ADAPTAR** | `SourceEvidencePopover` y “Sin origen identificado” ayudan a revisar; no prueban exactitud ni sustituyen juicio clínico. | [S6] |
| EHR como destino directo | El scribe escribe en el EHR de la organización. | Productos integran o preparan contenido para EHR. | **PROHIBIR en P0** | Oira no es EHR ni tiene integración. Copiar al portapapeles/archivo y advertir que el destino queda fuera de alcance. | [S1], [S4] |
| Órdenes, codificación o recomendaciones | Algunos flujos de scribe pueden apoyar tareas delegadas. | Algunos productos anuncian datos/órdenes discretos. | **PROHIBIR** | Rompe el alcance: Oira no diagnostica, prescribe ni recomienda. El producto documenta lo dicho; no crea decisiones clínicas. | [S3], [S5] |
| Nota “finalizada” por automatización | El scribe no sustituye validación. | Los proveedores aún plantean revisión clínica. | **PROHIBIR** | El estado final pertenece al médico; nunca aceptar por tiempo, éxito de pipeline o ausencia de ediciones. | [S2], [S6] |
| Consentimiento para grabar | Un scribe humano está visible, pero la captura de audio añade un acto distinto. | Productos ambientales piden obtener consentimiento antes de grabar. | **ADAPTAR** | Usar el preflight de I2, sin fingir que la aplicación obtiene consentimiento legal. | [S5], [S7] |
| Cloud, cuenta, analítica o entrenamiento | No son inherentes al scribe. | Algunos productos dependen de ecosistemas institucionales. | **PROHIBIR como patrón importado** | El MVP local no debe añadirlos para imitar a un competidor. Se comunica el comportamiento real, no una marca de “ambient AI”. | SYSTEM.md; [S4], [S5] |

## Patrones que I3, I4, I7 e I11 no deben importar ciegamente

- **I3:** que una nota esté “lista al terminar” no decide que deba dominar visualmente al transcript. La decisión de foco requiere evidencia específica de carga cognitiva y sesgo de automatización.
- **I4:** que un proveedor use notas por especialidad no autoriza a importar su esquema, títulos oficiales o campos de evaluación/plan. Oira debe renderizar una estructura que describa lo dicho por el médico y coordinarse con IA.
- **I7:** la práctica de “firma/revisión” no justifica apilar cinco fricciones. Debe seleccionar una protección proporcionada que mantenga revisión real sin convertir la consulta en burocracia.
- **I11:** la captura ambiental de un proveedor no demuestra que el transcript en vivo ayude. P0 mantiene la atención en la conversación y no habilita live transcript.
- **I12:** que productos comerciales capturen audio remoto no resuelve consentimiento, dos fuentes, aviso ni capacidades técnicas de una teleconsulta; sigue fuera de P0.

## Implicaciones concretas de UX P0

1. **Badge permanente:** “Borrador — requiere revisión médica” visible sin scroll en Review.
2. **Fuente separada del borrador:** transcript tratado como contenido no confiable, texto plano; no ejecuta enlaces ni cambia ajustes.
3. **Edición y origen:** cada sección puede mostrar origen cuando exista; ausencia de evidencia se marca en vez de rellenarse con una inferencia plausible.
4. **Aceptación humana:** no hay estados “final”, “aprobado por IA” ni salida directa al portapapeles tras estructurar.
5. **Límite de producto:** sin cuentas, EHR writeback, diagnóstico, prescripción, codificación ni widgets de recomendación.
6. **Consentimiento/aviso:** la grabación parte de una decisión visible del médico antes de activarse (I2); no es una firma digital.

## Límites de la evidencia

- La AMA y CMS se refieren sobre todo a contextos estadounidenses y documentación EHR; se usan como patrón de responsabilidad documental, no como normativa para LATAM.
- Abridge y Microsoft son **fuentes de proveedor**: son útiles para describir cómo presentan sus productos, pero no para prometer desempeño, precisión, ahorro de tiempo ni seguridad de Oira.
- No se investigó usabilidad con médicos hispanohablantes ni se eligió una estructura de nota. Esas decisiones corresponden a I3 e I4.
- Ninguna fuente permite afirmar que la IA “elimina” errores. La necesidad de revisión permanece porque la información clínica puede ser ambigua o no verbalizada [S6].

## Fuentes

- **[S1] CONFIRMADO — American Medical Association.** *The overlooked benefits of medical scribes*. https://www.ama-assn.org/practice-management/sustainability/overlooked-benefits-medical-scribes (acceso: 22-08-2026). Fuente profesional; describe el modelo de scribe humano.
- **[S2] CONFIRMADO — Centers for Medicare & Medicaid Services (EE. UU.).** *Ensuring Proper Use of Electronic Health Record Features and Capabilities Decision Table*, sección Dictation/Voice to Text. https://www.cms.gov/files/document/ehrdecisiontable062816pdf (acceso: 22-08-2026).
- **[S3] CONFIRMADO — Centers for Medicare & Medicaid Services (EE. UU.).** *FAQ 19061: scribes may document when physician delegates, signs and verifies*, 2018. https://www.cms.gov/Regulations-and-Guidance/Legislation/EHRIncentivePrograms/Downloads/General_2018.pdf (acceso: 22-08-2026).
- **[S4] CONFIRMADO — Abridge.** *Ambient AI for Clinicians*. https://www.abridge.com/platform/clinicians (acceso: 22-08-2026). Fuente de proveedor, no evaluación independiente.
- **[S5] CONFIRMADO — Microsoft Learn.** *What is Microsoft Dragon Copilot (physicians)?*. https://learn.microsoft.com/en-us/industry/healthcare/dragon-copilot/about/ (acceso: 22-08-2026). Fuente de proveedor.
- **[S6] CONFIRMADO — Abridge.** *The Science of Confabulation Elimination: Toward Hallucination-Free AI-Generated Clinical Notes*. https://www.abridge.com/ai/science-confabulation-hallucination-elimination (acceso: 22-08-2026). Fuente de proveedor; se usa solo para describir su patrón declarado de revisión/evidencia, no para validar métricas.
- **[S7] CONFIRMADO — General Medical Council (Reino Unido).** *Principles of making and using visual and audio recordings of patients*. https://www.gmc-uk.org/professional-standards/the-professional-standards/making-and-using-visual-and-audio-recordings-of-patients/principles (acceso: 22-08-2026).
