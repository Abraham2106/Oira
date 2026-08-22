# I4 / R4 — Secciones de nota clínica ambulatoria

**Estado:** propuesta P0 para renderer — **no es un esquema JSON ni una plantilla normativa**  
**Fecha de acceso a fuentes:** 22 de agosto de 2026  
**Alcance:** títulos y orden genéricos de `ClinicalNoteSection` para una nota-borrador de consulta ambulatoria. No determina requisitos de expediente por país ni qué campos debe generar IA.

## Decisión

**Usar siete secciones genéricas y editables, en este orden: Motivo y contexto → Relato clínico → Antecedentes relevantes → Hallazgos comunicados → Evaluación documentada por el médico → Plan e indicaciones documentados por el médico → Seguimiento.** Cada sección puede quedar en **“No consta en la consulta”** o **“Sin determinar”**; ninguna se rellena con una conclusión plausible.

La propuesta adopta la utilidad de una estructura secuencial —presentación, información relevante, hallazgos, evaluación y plan— sin llamar a la nota “SOAP”, sin exportarla como formato oficial y sin convertir sus títulos en un conjunto obligatorio. La NOM mexicana regula la integración del expediente clínico para prestadores y consultorios en México [S1], mientras la Ley argentina 26.529 reconoce que la historia clínica puede estar en soporte electrónico bajo condiciones de integridad y recuperabilidad [S2]. Esas fuentes muestran que el registro clínico es sensible y contextual; **no autorizan trasladar una plantilla regulatoria de un país a un borrador local y transnacional.**

## Método y límites de la evidencia

Se revisaron fuentes oficiales de historia/expediente clínico en español y el patrón de revisión humana de documentación asistida. No se encontró evidencia primaria comparativa que demuestre que SOAP sea universalmente el mejor orden para médicos ambulatorios hispanohablantes. Por eso, la propuesta es una decisión de producto reversible, no un estándar médico.

Theme A aporta un límite: copiar “borrador revisable por profesional” y no importar decisiones, órdenes, codificación o EHR writeback. I1 aporta otro: no presentar la nota como compliant, oficial o legalmente suficiente.

## Propuesta de secciones

| orden | section_id | title_en | title_es | propósito | permitido | prohibido | empty_state | source_evidence | p0_or_later |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `visit_context` | Visit context | Motivo y contexto de la consulta | Encadrar por qué se atendió y, si fue dicho, tipo/razón de la visita. | Motivo expresado, contexto temporal o de seguimiento mencionado. | Identificadores obligatorios, inferir motivo, nombre del paciente como requisito. | “No consta en la consulta.” | IDs de segmentos que expresan el motivo; si no existen, “Sin origen identificado”. | P0 |
| 2 | `clinical_narrative` | Clinical narrative | Relato clínico | Registrar síntomas, evolución, preocupaciones y hechos narrados durante la conversación. | Paráfrasis fiel del relato, duración solo si fue mencionada. | Diagnóstico de IA, completar negaciones no dichas, resumir como hecho algo incierto. | “No consta en la consulta.” / “Sin determinar.” | Segmentos de paciente y médico relacionados. | P0 |
| 3 | `relevant_history` | Relevant history | Antecedentes relevantes | Separar antecedentes que el médico/paciente menciona como pertinentes al encuentro. | Antecedentes explícitos, alergias/medicación solo si se verbalizan y son relevantes. | Recuperar de otra consulta, exigir lista completa, inferir ausencias. | “No consta en la consulta.” | Segmentos donde se mencionan antecedentes. | P0 |
| 4 | `reported_findings` | Reported findings | Hallazgos comunicados | Distinguir resultados de exploración, mediciones, estudios o observaciones que se expresaron. | Hallazgos dictados por el médico, resultados referidos, límites de incertidumbre. | Fabricar examen físico, normalidad, valores o resultados. | “No consta en la consulta.” / “Sin determinar.” | Segmentos de dictado o discusión de hallazgos. | P0 |
| 5 | `clinician_documented_assessment` | Clinician-documented assessment | Evaluación documentada por el médico | Documentar la valoración, impresión o razonamiento **que el médico dijo**. | Texto dicho por el médico, hipótesis expresamente atribuidas a él, incertidumbre. | “Diagnóstico sugerido por IA”, diferencial generado, conclusión autónoma. | “No consta en la consulta.” | Segmentos del médico; no anclar a inferencia del modelo. | P0 |
| 6 | `clinician_documented_plan` | Clinician-documented plan | Plan e indicaciones documentados por el médico | Recoger acciones, indicaciones, derivaciones o estudios que el médico comunicó/documentó. | Plan expresado por el médico; mantener condición y pendiente. | Medicamentos/dosis inventados, prescripción o recomendaciones de IA, orden clínica ejecutada automáticamente. | “No consta en la consulta.” | Segmentos donde el médico declara el plan. | P0 |
| 7 | `follow_up` | Follow-up | Seguimiento | Registrar fecha/condición de retorno, alerta o acción futura solo cuando se comunicó. | “Revisar en…”, retorno/derivación mencionados. | Calendarizar automáticamente, convertir en recordatorio clínico o deducir urgencia. | “No consta en la consulta.” | Segmentos de cierre/plan. | P0 |

## Alternativas consideradas

| Alternativa | Razón para no adoptarla como P0 |
| --- | --- |
| **SOAP con títulos “Subjective / Objective / Assessment / Plan”** | Es familiar en muchos contextos, pero no hay evidencia suficiente de universalidad para este usuario objetivo; “Objective” invita a inventar exploración no presente en la conversación y “Assessment” puede confundirse con diagnóstico generado. La estructura propuesta conserva conceptos útiles con títulos que atribuyen la evaluación/plan al médico. |
| **Historia clínica completa de admisión** | Introduce identificación, antecedentes extensos, documentos y requisitos que pertenecen al expediente/EHR o a jurisdicciones concretas. Contradice el mínimo PHI de I5 y el alcance de una consulta local. |
| **Una sola caja de texto “Nota”** | Evita imponer estructura, pero hace difícil verificar el origen, distinguir ausencia de información y revisar/editar con atención. |
| **Plantillas por especialidad** | Pueden aportar valor después de validación con médicos; P0 no dispone de evidencia ni contrato IA por especialidad. Marcar como posterior. |

## Reglas de representación

1. **Contenido atribuido, no generado como hecho.** “Evaluación documentada por el médico” y “Plan e indicaciones documentados por el médico” significan que la UI solo reproduce/edita contenido anclado a lo dicho; no autoriza deducciones.
2. **Ausencia es dato válido.** `NOT_STATED` se presenta como “No consta en la consulta”; `UNKNOWN` como “Sin determinar”. No convertirlos en guiones silenciosos.
3. **El origen acompaña a la sección.** Cada campo puede abrir `SourceEvidencePopover`; si no hay evidencia, se muestra el estado y se conserva la edición manual.
4. **No título oficial.** La cabecera de la pantalla es “Borrador de nota”, no “Historia clínica”, “nota final”, “SOAP oficial” ni un nombre regulatorio.
5. **No requieren todos contenido.** La aceptación/revisión será decisión de I7; I4 no convierte cada sección vacía en error.
6. **Los títulos se pueden mapear, no fijar como schema.** El adapter IA puede entregar otro JSON, siempre que el mapeo sea explícito, versionado y revise estados `NOT_STATED`/`UNKNOWN`.

## Propuesta de mapeo para IA (no contrato)

| Concepto de salida IA | Sección de renderer propuesta | Regla de mapeo |
| --- | --- | --- |
| `reason_for_visit` o equivalente | `visit_context` | Mapear solo si el modelo conserva fuente; de otro modo, estado sin origen. |
| Narrativa/síntomas/evolución | `clinical_narrative` | No fusionar con una evaluación clínica. |
| Antecedentes explícitos | `relevant_history` | Omitir los no mencionados; no pedir la lista completa. |
| Exploración/estudios relatados | `reported_findings` | Mantener mediciones y calificadores textuales exactos cuando sea posible. |
| Valoración manifestada por médico | `clinician_documented_assessment` | Requiere atribución y evidencia; no aceptar contenido sugerido por modelo. |
| Plan comunicado por médico | `clinician_documented_plan` | No ejecutar ni transformar en orden/prescripción. |
| Retorno o siguiente paso | `follow_up` | No crear calendario ni alerta automáticamente. |

**PENDIENTE — IA/Justin:** validar qué campos, IDs de segmento, hablante, incertidumbre y cambios manuales están presentes en el contrato real. Si el JSON no contiene evidencia por campo, el renderer no debe afirmar que sí la tiene.

## Caveats

- La NOM-004 es obligatoria en México para el expediente clínico de su ámbito; no es la especificación de NotaLocal ni una licencia para publicar “cumplimiento NOM” [S1].
- La Ley 26.529 argentina regula una historia clínica, no el flujo de un borrador de software; se cita para reconocer integridad/recuperabilidad como responsabilidades del contexto que la UI no puede certificar [S2].
- Esta investigación no decide campos de identificación, retención, firma, historial, receta ni EHR. I5 y backend/IA deben resolverlos por separado.
- Validar con médicos ambulatorios hispanohablantes antes de fijar títulos; los dos títulos con “documentada por el médico” son deliberadamente conservadores.

## Fuentes

- **[S1] CONFIRMADO — Diario Oficial de la Federación, México.** *Norma Oficial Mexicana NOM-004-SSA3-2012, Del expediente clínico*. https://dof.gob.mx/nota_detalle_popup.php?codigo=5272787 (acceso: 22-08-2026). La fuente regula expedientes de su ámbito; no se usa como plantilla transnacional.
- **[S2] CONFIRMADO — Argentina.gob.ar.** *Ley 26.529 — Derechos del Paciente, Historia Clínica y Consentimiento Informado*, texto actualizado, art. 13. https://www.argentina.gob.ar/normativa/nacional/ley-26529-160432/actualizacion (acceso: 22-08-2026).
- **[S3] CONFIRMADO — Centers for Medicare & Medicaid Services (EE. UU.).** *Ensuring Proper Use of Electronic Health Record Features and Capabilities Decision Table*, Dictation/Voice to Text. https://www.cms.gov/files/document/ehrdecisiontable062816pdf (acceso: 22-08-2026).
- **[S4] CONFIRMADO — Abridge.** *Ambient AI for Clinicians*. https://www.abridge.com/platform/clinicians (acceso: 22-08-2026). Fuente de proveedor; se usa solo para describir el patrón declarado de nota para revisión.
