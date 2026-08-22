# I3 / R1 / Theme B — Pantalla de aterrizaje tras la estructuración

**Estado:** decisión UX P0 — **confianza BAJA**  
**Fecha de acceso a fuentes:** 22 de agosto de 2026  
**Pregunta:** al terminar `STRUCTURING`, ¿debe Review mostrar primero transcript, borrador o una vista dividida?

## Decisión

**Adoptar una vista dividida con “Borrador de nota” como panel primario y “Transcripción de la consulta” como panel secundario, ambos visibles sin scroll cuando el ancho lo permita.** El foco inicial de teclado va al encabezado de Review y la jerarquía visual/landmark primario recae en el borrador; no se enfoca automáticamente un campo editable. En una ventana estrecha, el borrador es la pestaña inicial y el transcript permanece a una acción/tecla de distancia, con “Ver origen” por sección.

La elección es de **confianza baja** porque no se halló una comparación experimental directa entre transcript-first, draft-first y split para una aplicación local de un solo médico. La evidencia sí converge en tres restricciones: la documentación asistida debe ser revisada y aprobada por el profesional [S1, S2]; productos ambientales presentan una nota para revisión al finalizar [S3]; y la sobreconfianza en automatización puede reducir la vigilancia sobre errores [S4, S5]. El diseño divide eficacia (leer el borrador) y verificabilidad (ver fuente) sin tratar al transcript como el expediente ni hacer de la nota una salida final.

## Alcance y restricciones

- El resultado es siempre **“Borrador — requiere revisión médica”**.
- Transcript es fuente de evidencia, no instrucción ni documento oficial.
- Hay evidencia por sección cuando el contrato de IA la entregue; si no, se muestra “Sin origen identificado”.
- No se aterriza automáticamente en Export, no se oculta el badge y no se infiere diagnóstico/prescripción.
- I4 decidirá títulos/orden definitivos de sección; I7 decidirá reglas de aceptación. Esta decisión solo define jerarquía y foco.

## Evidencia y lectura

CMS recomienda que información dictada, convertida por voz a texto o introducida por otra persona se revise, edite y apruebe oportunamente [S1]. El modelo de scribe humano de la AMA se describe bajo supervisión médica [S2]. Abridge describe una nota estructurada lista para revisión al acabar la visita y declara que sus clínicos la revisan/editan antes de incorporarla al EHR [S3, S6]. Son patrones útiles, pero el material de proveedor no prueba que su interfaz sea óptima para NotaLocal.

La literatura sobre *automation bias* advierte sobre una tendencia a sobrerreliar en la automatización y a no detectar errores nuevos [S4]. El trabajo sobre digital scribes identifica específicamente el riesgo de aceptar documentos del scribe sin comprobarlos [S5]. La consecuencia de interfaz no es hacer el transcript dominante ni obligar a leerlo entero: es **mantener la evidencia accesible en el mismo contexto del borrador**, preservar el badge y evitar un salto a la exportación.

## Opciones comparadas

| Opción | Beneficio | Riesgo principal | Encaje con “el agente documenta; el médico decide” | Resultado |
| --- | --- | --- | --- | --- |
| Transcript-first | Prioriza la fuente literal y desalienta tratar el borrador como verdad. | Obliga al médico a navegar un material largo antes de ver qué debe corregir; aumenta cambio de contexto. | Parcial: la revisión de nota queda retrasada. | Rechazada para el P0 por defecto. |
| Draft-first sin transcript visible | Rápida para editar el objeto de trabajo. | Oculta el contexto que permite cuestionar el borrador; favorece aceptación superficial. | Insuficiente. | Rechazada. |
| Split con **borrador primario** y transcript secundario visible | Facilita editar y contrastar; hace explícita la fuente sin convertirla en documento final. | Puede verse densa en pantallas pequeñas; requiere buena semántica y responsive. | Mejor equilibrio. | **Adoptada.** |
| Split con transcript primario | Maximiza exposición de fuente. | La nota parece secundaria aun cuando es el objeto de revisión/edición. | No mejora de manera demostrada la verificación. | No adoptar por defecto. |

## Especificación de Review

| Elemento | Primario / secundario | Foco / estado por defecto | Visible sin scroll | Copy ES / EN |
| --- | --- | --- | --- | --- |
| Encabezado de Review | Primario de navegación | Foco inicial programático al `h1`; no abrir un editor automáticamente. | Sí | **ES:** “Revisa el borrador” / **EN:** “Review the draft” |
| Badge de estado | Primario | Persistente, junto al título del borrador. | Sí | **ES:** “Borrador — requiere revisión médica” / **EN:** “Draft — clinician review required” |
| Panel Borrador de nota | **Primario** | Landmark/columna principal; primera región tras encabezado. | Sí | **ES:** “Borrador de nota” / **EN:** “Draft note” |
| Sección clínica editable | Primario | No recibe foco automático; al activarla, muestra origen/estado. | Al menos la primera sección. | **ES:** “Editar” / **EN:** “Edit” |
| Acción “Ver origen” | Secundaria contextual | Disponible por sección con evidencia; abre popover y permite saltar al segmento. | Sí, cuando existe evidencia. | **ES:** “Ver origen” / **EN:** “View source” |
| Estado sin evidencia | Secundario de seguridad | Visible junto a la sección afectada. | Sí, cuando aplica. | **ES:** “Sin origen identificado. Revisa antes de aceptar.” / **EN:** “No source identified. Review before accepting.” |
| Panel Transcripción | Secundario, persistente | Segunda columna en ancho amplio; pestaña secundaria en estrecho. | Su encabezado y primer segmento, sí. | **ES:** “Transcripción de la consulta” / **EN:** “Consultation transcript” |
| Acciones de Review | Secundarias hasta que I7 defina guardas | “Seguir editando” y aceptar explícito; no resaltar exportar. | Sí | **ES:** “Seguir revisando” / **EN:** “Keep reviewing” |
| Exportar | No disponible por defecto | Oculto/deshabilitado hasta `ACCEPTED`. | No | **ES:** “Exportar” / **EN:** “Export” |

### Wireframe de una pantalla

```text
┌ Review ──────────────────────────────────────────────────────────────────┐
│ Revisa el borrador      [Borrador — requiere revisión médica]            │
│                                                                            │
│ ┌ Borrador de nota (PRIMARIO) ─────────────┐ ┌ Transcripción ──────────┐ │
│ │ Motivo / contexto                         │ │ 00:00 Médico: ...      │ │
│ │ [texto editable]  [Ver origen]            │ │ 00:14 Paciente: ...    │ │
│ │                                            │ │                         │ │
│ │ Relato clínico                             │ │ [segmento resaltado]   │ │
│ │ [texto editable]  [Sin origen identificado]│ │                         │ │
│ └────────────────────────────────────────────┘ └─────────────────────────┘ │
│                                                                            │
│ [Seguir revisando]                                  [Aceptar revisión]    │
└────────────────────────────────────────────────────────────────────────────┘
```

En ancho estrecho, el encabezado, badge y borrador aparecen primero. Un control con pestañas “Borrador de nota / Transcripción” conserva la transcripción y cada “Ver origen” cambia a su segmento. No introducir un modal para lectura ordinaria ni borrar el badge al editar.

## Criterios de implementación y evaluación

- El panel de transcript renderiza texto plano; URL y contenido de conversación permanecen inertes.
- El foco visible y el orden de lectura deben reflejar la jerarquía de revisión, no el orden visual de columnas.
- Si no hay anclas de evidencia, no inventar enlaces: mostrar el estado “Sin origen identificado”.
- Validar con pruebas de tarea, usando casos sintéticos: localizar origen, corregir un dato y reconocer que la nota aún es borrador. Medir comprensión y errores, **no** prometer tiempos clínicos.
- Reabrir la decisión si pruebas con médicos muestran que la columna secundaria se ignora o dificulta la lectura; conservar la restricción de acceso inmediato a la fuente.

## Dependencias y caveats

- **I4 / IA:** títulos, orden y granularidad de secciones; este wireframe usa nombres provisionales.
- **IA / Justin:** IDs de segmento, disponibilidad y latencia de evidencia; sin ellos el UI debe degradar de forma honesta.
- **I7:** requisitos para habilitar aceptación; esta investigación no prescribe checklist ni bloqueo.
- **Theme A:** aplicado como guardrail: borrador revisable y evidencia, sin integración EHR, órdenes ni finalización automática.
- La evidencia sobre sesgo de automatización procede sobre todo de CDSS/decision support, no de la comparación exacta de tres layouts de ambient scribe. Por ello la confianza es **BAJA**.

## Fuentes

- **[S1] CONFIRMADO — Centers for Medicare & Medicaid Services (EE. UU.).** *Ensuring Proper Use of Electronic Health Record Features and Capabilities Decision Table*, sección Dictation/Voice to Text. https://www.cms.gov/files/document/ehrdecisiontable062816pdf (acceso: 22-08-2026).
- **[S2] CONFIRMADO — American Medical Association.** *The overlooked benefits of medical scribes*. https://www.ama-assn.org/practice-management/sustainability/overlooked-benefits-medical-scribes (acceso: 22-08-2026).
- **[S3] CONFIRMADO — Abridge.** *Ambient AI for Clinicians*. https://www.abridge.com/platform/clinicians (acceso: 22-08-2026). Fuente de proveedor; describe un flujo, no eficacia comparada.
- **[S4] NO VERIFICADO PARA ESTE LAYOUT — Goddard K, Roudsari A, Wyatt JC.** *Automation bias — a hidden issue for clinical decision support system use*. PubMed PMID 21335682. https://pubmed.ncbi.nlm.nih.gov/21335682/ (acceso: 22-08-2026).
- **[S5] NO VERIFICADO PARA ESTE LAYOUT — Denecke K, et al.** *The digital scribe*. PubMed PMID 31304337. https://pubmed.ncbi.nlm.nih.gov/31304337/ (acceso: 22-08-2026).
- **[S6] CONFIRMADO — Abridge.** *The Science of Confabulation Elimination: Toward Hallucination-Free AI-Generated Clinical Notes*. https://www.abridge.com/ai/science-confabulation-hallucination-elimination (acceso: 22-08-2026). Fuente de proveedor; se usa solo para su patrón declarado de revisión/evidencia.
