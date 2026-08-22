# I9 / R8 — Formatos de exportación

**Estado:** investigación de escritorio.  
**Decisión:** portapapeles primero, archivo TXT después; JSON más adelante para interoperabilidad técnica; no PDF, integración EHR ni conversores cloud en MVP.  
**Fuentes consultadas:** 2026-08-22.

## 1. Pregunta y límite de evidencia

El encargo solicita qué pegan médicos ambulatorios independientes de práctica hispanohablante. No se localizó una fuente primaria que mida de forma fiable la cuota de portapapeles, TXT, PDF o JSON en ese mercado específico. Por ello no se atribuyen porcentajes ni se presenta un formato como “el habitual” de toda la región.

FHIR ilustra que una nota clínica puede ser un documento o contenido referenciado con formatos reconocidos, pero no implica que una clínica pequeña reciba FHIR ni que NotaLocal tenga una integración EHR [HL7 FHIR, DocumentReference](https://hl7.org/fhir/R4/documentreference.html). La seguridad del paciente exige no tratar el texto generado como una decisión clínica automática; el médico mantiene revisión y destino [WHO, Patient safety](https://www.who.int/news-room/fact-sheets/detail/patient-safety).

## 2. Priorización

| Orden | Formato/superficie | Fidelidad al pegar | Familiaridad | Riesgo de aspecto “oficial” | Costo Justin | Decisión |
|---|---|---|---|---|---|---|
| 1 | Portapapeles, texto plano | Alta para texto; pierde estilo complejo | Alta, sin alegar cuota | Bajo: no pretende ser documento firmado | Bajo | MVP |
| 2 | Archivo TXT UTF-8 | Alta para texto; transparente | Alta para archivo simple, sin alegar cuota | Bajo | Bajo | MVP |
| 3 | JSON explícitamente técnico | Alta para datos estructurados, no para lectura clínica | Baja para uso manual | Medio si se confunde con export clínico | Medio | Después de MVP / diagnóstico |
| 4 | PDF local | Fija aspecto pero exige plantilla y pruebas | Indeterminado | Alto: puede parecer final/oficial | Medio/alto | P2, sujeto a R-10 |
| No | Integración EHR | Requiere contrato, mapeo y validación por destino | No generalizable | Alto: “enviado” sería una promesa | Alto | No en MVP |
| No | Convertidor cloud | Añade transferencia de datos | No procede para el alcance local | Alto | Alto | No |

## 3. Reglas de contenido y UX

Los formatos de MVP contienen exactamente el texto aprobado por el médico. Se conservan secciones vacías y el literal NOT_STATED cuando aplique; no se rellenan para “mejorar” apariencia. Todo export exige selección explícita de una nota aprobada: no existe autoexport ni export de draft.

Antes de copiar/guardar, la pantalla debe advertir: “Al copiar o guardar fuera de NotaLocal, el destino y sus permisos quedan bajo control del usuario.” Esta frase no implica que NotaLocal posea o controle el EHR de destino.

El botón no debe decir “Enviar al EHR” ni “Sincronizar”. Etiquetas aceptables: “Copiar nota”, “Guardar como TXT” y, cuando exista, “Exportar JSON técnico”. El JSON debe etiquetarse como “para integración/soporte técnico; no es una carga automática a una historia clínica”.

## 4. Limitaciones

La evidencia no demuestra compatibilidad de pegado con ningún EHR, portal o producto particular. Diferencias de campos, codificación, políticas locales y permisos del navegador/app de destino quedan fuera de NotaLocal. Tampoco se afirma que TXT preservará estilo visual, firmas, plantillas o atributos legales.

## 5. Decisión

**MVP: Portapapeles y TXT UTF-8 de notas aprobadas.**  
**Después: JSON técnico solo con esquema/versionado y documentación.**  
**No: EHR directo, PDF en MVP, convertidores cloud o cualquier mensaje de “enviado”.** Esta priorización maximiza transparencia y minimiza una falsa apariencia de integración u oficialidad, sin pretender describir cuotas de mercado no medidas.

## Bibliografía

1. HL7. [FHIR R4 DocumentReference](https://hl7.org/fhir/R4/documentreference.html). Consultado el 2026-08-22.
2. World Health Organization. [Patient safety](https://www.who.int/news-room/fact-sheets/detail/patient-safety). Consultado el 2026-08-22.
