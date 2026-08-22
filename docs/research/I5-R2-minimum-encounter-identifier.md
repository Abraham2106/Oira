# I5 / R2 — Identificador mínimo del encuentro

**Estado:** decisión P0 para New Consultation  
**Fecha de acceso a fuentes:** 22 de agosto de 2026  
**Pregunta:** ¿qué necesita un médico para reconocer una nota local, de un solo usuario y sin EHR, sin solicitar PHI innecesaria?

## Decisión

**P0 debe permitir iniciar con el formulario vacío. No se requiere ningún identificador del paciente.** La pantalla ofrece solamente: **etiqueta opcional del encuentro**, **tipo de consulta opcional** y **marca de tiempo local automática**. Nombre, documento, fecha de nacimiento, teléfono, seguro, dirección, MRN, correo y otros identificadores quedan fuera de P0.

La evidencia revisada justifica la minimización, no una lista universal de campos. La Ley argentina 25.326 exige que los datos recogidos sean adecuados, pertinentes y no excesivos para su finalidad, y que se destruyan cuando dejen de ser necesarios [S1]. La LGPD brasileña define datos de salud como sensibles y tratamiento como un conjunto amplio de operaciones [S2]. Las normas de expediente clínico de México y Argentina tratan la historia clínica como un registro regulado y contextual [S3, S4], pero **no demuestran que un borrador local, previo a exportación, requiera todos los identificadores de una historia/EHR**.

Por ello, esta es una elección de UX y reducción de datos, no una afirmación de que cualquier médico puede prescindir legalmente de identificación en su expediente definitivo. Cuando el médico exporte o transcriba la información al sistema que usa, ese destino puede exigir otros campos; NotaLocal no debe simularlos ni recolectarlos por anticipado.

## Alcance y criterio

- Usuario: médico ambulatorio, una computadora, una consulta a la vez.
- NotaLocal no es EHR, no tiene multiusuario, cuentas ni integración de expediente.
- La nota es un borrador revisable. El médico decide si la copia/exporta a su sistema actual.
- “Reconocer” significa recuperar el contexto de una sesión local durante el uso P0; no significa cumplir auditoría, facturación, interoperabilidad, retención o identificación normativa.
- Cada dato adicional puede ser sensible o conectar la nota con una persona identificable. I1 prohíbe convertir la postura de minimización en claim de cumplimiento.

## Campos P0

| field_id | label_en | label_es | required | type | synthetic example | por qué se necesita | por qué no añade PHI innecesaria | fuente |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `encounter_label` | Optional encounter label | Etiqueta opcional del encuentro | No | Texto libre, máximo recomendado 80 caracteres | “Control de presión — mañana” | Ayuda al médico a distinguir la sesión en la misma jornada sin forzar un identificador paciente. | Es opcional y no prescribe nombre/ID. Placeholder debe advertir: “Evita datos identificables si no son necesarios.” El médico puede usar un rótulo neutro. | [S1], [S2]; decisión UX P0. |
| `visit_type` | Visit type (optional) | Tipo de consulta (opcional) | No | Lista corta: “Consulta”, “Seguimiento”, “Otro” | “Seguimiento” | Ofrece una pista organizativa y puede ayudar a escoger un formato de borrador más adelante, sin declarar diagnóstico. | No identifica por sí solo al paciente; permanece opcional y no crea plantilla por especialidad P0. | Decisión UX; [S1] como criterio de pertinencia. |
| `local_started_at` | Started on this device | Inicio en este equipo | No para iniciar; sí generado por sistema | Marca local de fecha/hora, solo lectura | “22 ago 2026, 09:40” | Permite ordenar sesiones y distinguir dos notas con etiquetas parecidas. | No se solicita al paciente; es metadato de sesión. Su retención y visibilidad dependen de backend/Settings. | Decisión UX; [S1] exige limitar conservación a necesidad; validar con Justin. |
| `patient_identifier` | — | — | **No existe en P0** | — | — | El flujo local no demostró necesidad de un campo obligatorio para comenzar un borrador. | Evita pedir nombre, DNI, CURP, MRN, DOB, teléfono, seguro, dirección o correo sin finalidad demostrada. | [S1], [S2], [S3], [S4]. |

## Reglas de UI

1. **Comenzar sin completar.** El botón “Preparar grabación” no depende de la etiqueta ni del tipo de consulta. Solo dependen de estado de modelo/micrófono y del preflight de I2.
2. **Nada se autocompleta con PHI.** No extraer nombre, fecha de nacimiento, identificador o diagnosis desde el audio para llenar campos administrativos.
3. **No disfrazar una etiqueta como anonimización.** Una etiqueta opcional puede contener información identificable; no llamarla “anónima”.
4. **Timestamp honesto.** Mostrarlo como “Inicio en este equipo” y no como fecha certificada, firma, auditoría o sello normativo. Si el backend no lo persiste, no prometer historial.
5. **Sin campos ocultos.** No solicitar ID, teléfono o seguro “por si luego hace falta”; si un futuro flujo los exige, debe declarar finalidad, dueño, retención y jurisdicción.
6. **Pantalla vacía real.** La vista inicial permite un encuentro sin etiqueta ni tipo; los valores `NOT_STATED` y `UNKNOWN` siguen siendo válidos en la nota.

## Alternativas rechazadas

| Alternativa | Motivo de rechazo P0 |
| --- | --- |
| Nombre completo obligatorio | Aumenta identificabilidad sin evidencia de que sea necesario para crear un borrador de sesión única. Puede inducir a creer que NotaLocal es el expediente definitivo. |
| Documento nacional, MRN, seguro o teléfono | Son identificadores de alto impacto para el caso P0 y no añaden valor a la grabación/revisión local. Requieren propósito, políticas y probablemente integración externa. |
| Fecha de nacimiento obligatoria | Es dato personal adicional; no se justifica por el reconocimiento local de una nota. |
| Selección obligatoria de especialidad/plantilla | No existe validación con médicos ni esquema IA por especialidad. Puede terminar fabricando estructura o expectativas clínicas. |
| Sin etiqueta ni timestamp | Reduce datos, pero hace difícil diferenciar dos sesiones locales; una etiqueta opcional y timestamp es un compromiso reversible. |
| Generar pseudónimo/ID interno como sustituto | Añade complejidad y puede crear una falsa sensación de anonimización. Si backend necesita un ID técnico, debe ser interno y no mostrarse como identificador clínico. |

## Implicaciones de producto

- **New Consultation:** dos controles opcionales y un timestamp informativo; no formulario de paciente.
- **Review/Export:** la nota muestra solo contenido que se generó o editó; no añadir identificadores ausentes al exportar.
- **Settings/retención:** si se guardan etiquetas/timestamps, I8 y Justin deben definir borrado, error y alcance. Un control de borrar debe decir qué elimina.
- **Integración futura:** si el médico conecta un EHR o se desarrolla historial multi-encuentro, reabrir I5: cambian finalidad, riesgo y necesidad de identificación.
- **Website:** no afirmar “cumple minimización”, “no recopilamos datos personales” ni “anónimo”. En particular, audio y texto clínico pueden ser datos sensibles aunque los campos administrativos sean opcionales.

## Dependencias y caveats

- **I1:** aplicado como guardrail. La minimización no libera de obligaciones ni permite declaraciones legales públicas.
- **I2:** el aviso/preflight de grabación no debe pedir ni guardar un identificador de paciente para aparentar consentimiento.
- **I4 / IA:** las secciones de nota no convierten automáticamente sus contenidos en datos de New Consultation.
- **Justin:** confirmar la generación, zona horaria, persistencia y borrado de `local_started_at`; sin confirmación, no publicarlo como historial recuperable.
- **Asesoría local / organización:** una clínica o jurisdicción puede exigir identificación en su expediente o sistema definitivo. Este documento no lo contradice ni decide su cumplimiento.
- No existe evidencia empírica específica de que “etiqueta + tipo + timestamp” sea la combinación óptima; es una decisión proporcional y fácilmente revisable. **Confianza: media para la minimización, baja para la UX exacta.**

## Fuentes

- **[S1] CONFIRMADO — Argentina.gob.ar.** *Ley 25.326 — Protección de los Datos Personales*, art. 4 (calidad, pertinencia, no exceso y destrucción cuando dejan de ser necesarios) y art. 7. https://www.argentina.gob.ar/normativa/nacional/ley-25326-64790/texto (acceso: 22-08-2026).
- **[S2] CONFIRMADO — Presidência da República do Brasil.** *Lei nº 13.709, de 14 de agosto de 2018 (LGPD), texto compilado*, arts. 5 y 6. https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/L13709compilado.htm (acceso: 22-08-2026).
- **[S3] CONFIRMADO — Diario Oficial de la Federación, México.** *NOM-004-SSA3-2012, Del expediente clínico*. https://dof.gob.mx/nota_detalle_popup.php?codigo=5272787 (acceso: 22-08-2026). Fuente de expediente clínico en su ámbito, no lista de campos para el borrador de NotaLocal.
- **[S4] CONFIRMADO — Argentina.gob.ar.** *Ley 26.529 — Derechos del Paciente, Historia Clínica y Consentimiento Informado*, texto actualizado, art. 13. https://www.argentina.gob.ar/normativa/nacional/ley-26529-160432/actualizacion (acceso: 22-08-2026).
