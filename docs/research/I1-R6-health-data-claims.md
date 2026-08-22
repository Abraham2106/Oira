# I1 / R6 / Theme C — Registro de afirmaciones sobre datos de salud

**Estado:** decisión de producto P0  
**Fecha de acceso a fuentes:** 22 de agosto de 2026  
**Ámbito:** website y renderer de NotaLocal; MVP de escritorio, sin cuenta, sin inferencia remota y con un médico por equipo.  
**No es asesoría jurídica.** Este documento no determina qué legislación aplica, quién es responsable/controlador en una jurisdicción concreta ni si una implementación cumple una norma.

## Decisión

**P0: publicar únicamente afirmaciones conductuales, acotadas a la versión y verificables en el producto; no nombrar leyes, certificaciones ni “cumplimiento”.** En especial, *local* no equivale a “anónimo”, “sin tratamiento de datos” ni “fuera de la regulación”. Las fuentes oficiales revisadas tratan los datos de salud como sensibles o especialmente protegidos y regulan operaciones amplias de tratamiento, incluidas recolección, almacenamiento y eliminación [S1–S5].

La interfaz debe expresar los estados reales que entregue el backend. Cuando no exista confirmación técnica, se usa `DESCONOCIDO`; no se rellena con una promesa de privacidad. El médico conserva la decisión clínica y de exportación, pero NotaLocal no debe afirmar que una pantalla por sí sola satisface sus deberes profesionales o legales.

## Alcance, hechos y método

Se evaluaron fuentes primarias y autoridades públicas de Brasil, México, Colombia y Costa Rica como muestra iberoamericana; no son un análisis exhaustivo de LATAM. La muestra sirve para dos conclusiones prudentes: los datos de salud merecen protección reforzada y la aplicabilidad concreta depende de territorio, actor, finalidad y operación. No permite emitir un aviso legal regional único.

Se distinguen:

- **CONFIRMADO:** hecho expresamente documentado por las fuentes o hecho de producto entregado para este MVP.
- **CONDICIONAL:** texto utilizable solo cuando Justin o IA confirmen el comportamiento en la versión distribuida.
- **NO PUBLICAR:** frase que sería absoluta, legal, ambigua o inconsistente con el flujo de exportación.
- **ASUNCIÓN:** decisión de producto que requiere política operativa además de interfaz.

## Hallazgos

1. **El dato clínico no deja de ser sensible porque el procesamiento sea local.** La LGPD brasileña incluye los datos de salud dentro de los datos personales sensibles y define “tratamiento” de modo amplio, incluyendo recolección, acceso, almacenamiento, eliminación y transferencia [S1]. La autoridad colombiana también trata los datos relativos a la salud como sensibles [S3], y la autoridad costarricense recuerda que los datos de salud son sensibles bajo su ley [S5].

2. **La ubicación local limita una ruta de circulación, no prueba cumplimiento.** La legislación examinada se aplica a operaciones de tratamiento bajo criterios territoriales y de oferta/servicio; no se desprende una exención general para software de escritorio [S1]. Por tanto, “no hay nube” no autoriza “cumplimos la ley X”.

3. **El producto no puede atribuir roles jurídicos sin el despliegue real.** La LGPD distingue controlador —quien toma decisiones sobre el tratamiento— y operador —quien trata por cuenta del controlador— [S1]. El mismo binario puede involucrar decisiones distintas según quién lo distribuya, configure, soporte o use. No publicar “el médico es el único responsable” ni “NotaLocal no trata datos” sin revisión jurídica y operativa específica.

4. **La privacidad debe hablar de observables.** La vía defendible es describir qué hace esta versión: si se inició la grabación, dónde se procesa, si existe proveedor de IA remoto, qué se guarda, qué se puede borrar y qué ocurre al exportar. Las afirmaciones de almacenamiento/borrado/cifrado requieren confirmación del backend; una política comercial de no venta o no entrenamiento requiere dueño, alcance y cumplimiento operativo.

## Registro de afirmaciones

Las frases en inglés se incluyen porque el prompt las exige; el copy de producto P0 es español.

| ID | Superficie | Frase exacta (ES / EN) | Estado | Por qué | Fuente | Límite que debe acompañarla |
| --- | --- | --- | --- | --- | --- | --- |
| C-01 | Badge / Settings | **ES:** “Inferencia local: confirmada por esta aplicación.” **EN:** “Local inference: confirmed by this app.” | CONDICIONAL — Justin | Describe un estado, no una certificación. | Hecho de producto; [S1] evita inferir una exención legal. | Mostrar solo si el bridge confirma ejecución local; si no, “Estado de inferencia: desconocido”. |
| C-02 | Processing | **ES:** “Transcribiendo la consulta en este equipo.” **EN:** “Transcribing the consultation on this device.” | CONDICIONAL — Justin/IA | Es una afirmación verificable de ejecución. | Hecho de producto. | No usar si una versión activa un proveedor remoto o una cola externa. |
| C-03 | Privacy | **ES:** “En esta versión, la consulta no se envía a un proveedor de IA.” **EN:** “In this version, the consultation is not sent to an AI provider.” | CONDICIONAL — Justin/IA | Acota versión y destinatario. | Hecho de producto. | Requiere prueba de red, configuración y ausencia de fallback remoto; no significa que el médico no pueda exportar. |
| C-04 | Review | **ES:** “La nota es un borrador y requiere revisión médica.” **EN:** “The note is a draft and requires clinician review.” | CONFIRMADO | Refleja el principio del producto; no es un claim legal. | SYSTEM.md del repositorio; coherente con [S6]. | Mantener visible antes de aceptar o exportar. |
| C-05 | Export | **ES:** “Al copiar o guardar, eliges enviar este contenido a otro sistema.” **EN:** “When you copy or save, you choose to send this content to another system.” | CONFIRMADO | Describe la acción explícita del usuario. | Flujo del producto. | Añadir que el destino tiene sus propias prácticas; no decir “nunca sale del dispositivo”. |
| C-06 | Privacy | **ES:** “El estado de almacenamiento se muestra aquí.” **EN:** “Storage status is shown here.” | CONDICIONAL — Justin | Promete visibilidad, no una cualidad de seguridad. | Principio de información; [S1–S5]. | Las filas deben derivar del backend y admitir “desconocido”. |
| C-07 | Privacy | **ES:** “Puedes solicitar borrar los datos que esta versión muestra como guardados localmente.” **EN:** “You can request deletion of data this version shows as stored locally.” | CONDICIONAL — Justin | Evita prometer que se borren copias ajenas. | [S1] incluye eliminación como tratamiento. | Debe especificar qué se borra, resultado real y límites: archivos exportados, copias del SO y respaldos no son alcanzables automáticamente. |
| C-08 | Privacy | **ES:** “No usamos el contenido de tus consultas para entrenar modelos.” **EN:** “We do not use your consultation content to train models.” | CONDICIONAL — titular de política/IA | Es una política, no una inferencia de “local”. | Hecho de producto declarado; [S1] sobre tratamiento. | Requiere política publicada, alcance de telemetría/soporte y control operativo verificable. |
| C-09 | Privacy | **ES:** “No vendemos datos de consultas.” **EN:** “We do not sell consultation data.” | CONDICIONAL — titular de política | Es una promesa comercial verificable, no una garantía legal. | Hecho de producto declarado. | Definir “venta”, subsidiarias, analítica, soporte y cambios de versión en política. |
| C-10 | Security | **ES:** “La seguridad del equipo, sus copias de respaldo y los sistemas a los que exportes siguen requiriendo tus propias medidas.” **EN:** “Device security, backups, and systems you export to still require your own safeguards.” | CONFIRMADO | Evita atribuir protección absoluta al producto. | [S1–S5] reconocen tratamiento/seguridad; flujo de exportación. | No desplaza responsabilidades legales: es una advertencia operativa. |
| C-11 | Privacy | **ES:** “NotaLocal no tiene cuenta ni inicio de sesión en este MVP.” **EN:** “NotaLocal has no account or sign-in in this MVP.” | CONDICIONAL — Justin | Hecho de producto específico. | SYSTEM.md. | No afirmar si se añade activación, crash reporting identificable o soporte con cuenta. |
| C-12 | Recording | **ES:** “La grabación no ha comenzado.” **EN:** “Recording has not started.” | CONFIRMADO / estado | Es un estado observable, útil para consentimiento. | Flujo del producto; [S7]. | Debe cambiar únicamente al entrar en `RECORDING`. |
| F-01 | Website / app | “Cumple HIPAA / LGPD / Ley 1581 / Ley 8968.” | NO PUBLICAR | Cada régimen y despliegue exige análisis propio; una referencia legal no es evidencia de cumplimiento. | [S1–S5]. | No sustituir por una lista de leyes. |
| F-02 | Website / app | “Tus datos nunca salen del dispositivo.” | NO PUBLICAR | El médico puede copiar, guardar o exportar contenido. | Flujo del producto. | Usar C-03 y C-05, si se verifican. |
| F-03 | Website / app | “Tus datos son anónimos.” | NO PUBLICAR | Los datos de salud y una voz pueden identificar; anonimización tiene requisitos técnicos y contextuales. | [S1], [S4]. | No usar “anónimo” para datos clínicos de un encuentro. |
| F-04 | Website / app | “100% seguro”, “privacidad total”, “imposible de hackear”, “cifrado militar”. | NO PUBLICAR | Son absolutos o adjetivos sin comportamiento verificable. | [S1–S5]. | Si existe cifrado, nombrar solo el mecanismo, alcance y estado confirmados. |
| F-05 | Website / app | “No tratamos datos de salud porque todo es local.” | NO PUBLICAR | Recolectar, guardar, acceder o borrar son operaciones de tratamiento en las fuentes revisadas. | [S1], [S3], [S5]. | Ninguna. |
| F-06 | Website / app | “El médico es el único responsable legal de los datos.” | NO PUBLICAR | La asignación de roles depende de decisiones y jurisdicción; no la resuelve la UI. | [S1]. | Revisión jurídica para país y modelo de distribución. |
| F-07 | Website / app | “El botón de borrar elimina todas las copias.” | NO PUBLICAR | No controla exportaciones, copias del sistema operativo ni respaldos externos. | [S1]. | Mostrar alcance y resultado por objeto borrado. |
| F-08 | Website / app | “No se requiere consentimiento porque la IA es local.” | NO PUBLICAR | El carácter local no determina la base/autoridad aplicable ni la ética de grabar. | [S7], [S8]. | I2 define solo un patrón UX, no una conclusión legal. |

## Implicaciones para interfaz y website

- **Privacy y Security P0:** pueden explicar estados y límites, pero no llevar un bloque de “cumplimiento” ni logos/regímenes regulatorios.
- **Fuente única de verdad:** `PrivacyStatusPanel` debe recibir datos del bridge: inferencia, modelo remoto, micrófono, audio temporal y almacenamiento. Un valor ausente se renderiza `DESCONOCIDO`.
- **Exportación:** la advertencia debe ser descriptiva y visible; copiar al portapapeles no equivale a “enviar al EHR”.
- **Borrado y retención:** no habilitar controles decorativos. Hasta que Justin confirme semántica y fallos, usar estado condicionado o no exponer la promesa.
- **Política comercial:** “no vender” y “no entrenar” necesitan responsable, versión, mecanismo de cumplimiento y tratamiento de soporte/telemetría antes de publicarse.

## Límites y pendientes

- **PENDIENTE — asesoría jurídica local:** país(es) de lanzamiento, distribuidor, rol de cada parte, edad/capacidad de pacientes, contrato y política de soporte.
- **PENDIENTE — Justin:** verificación del tráfico, fallback, ubicación/retención de audio y nota, borrado, logs y telemetría.
- **PENDIENTE — IA:** uso de datos para evaluación/entrenamiento, envío de prompts/modelos y contenido de diagnósticos.
- Este registro no autoriza una ley nombrada, una certificación ni una declaración de cumplimiento.

## Fuentes

- **[S1] CONFIRMADO — Presidência da República do Brasil.** *Lei nº 13.709, de 14 de agosto de 2018 (LGPD), texto compilado*, arts. 3 y 5. https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/L13709compilado.htm (acceso: 22-08-2026).
- **[S2] CONFIRMADO — Cámara de Diputados de México.** *Ley Federal de Protección de Datos Personales en Posesión de los Particulares*, texto oficial. https://www.diputados.gob.mx/LeyesBiblio/doc/LFPDPPP.doc (acceso: 22-08-2026).
- **[S3] CONFIRMADO — Superintendencia de Industria y Comercio, Colombia.** *Tratamiento de datos sensibles relativos a la salud*, boletín jurídico. https://sedeelectronica.sic.gov.co/publicaciones/boletin-juridico/concepto/tratamiento-de-datos-sensibles-relativos-la-salud (acceso: 22-08-2026).
- **[S4] CONFIRMADO — Superintendencia de Industria y Comercio, Colombia.** *Guía de tratamiento de datos personales*, definición de datos sensibles. https://rnbd.sic.gov.co/sisi/consultaTitulares/archivo/7ed93322-d77e-4a62-ac14-d654197bae16 (acceso: 22-08-2026).
- **[S5] CONFIRMADO — PRODHAB, Costa Rica.** *Preguntas frecuentes* y comunicación institucional sobre Ley N.° 8968. https://www.prodhab.go.cr/preguntasfrecuentes.aspx ; https://www.prodhab.go.cr/noticias/comunicados/2021/20211104_%20Sobre%20decreto%20de%20vacunacion%20obligatoria.pdf (acceso: 22-08-2026).
- **[S6] CONFIRMADO — Centers for Medicare & Medicaid Services (EE. UU.).** *Ensuring Proper Use of Electronic Health Record Features and Capabilities Decision Table*, sección Dictation/Voice to Text: revisión, edición y aprobación de documentación ingresada por terceros. https://www.cms.gov/files/document/ehrdecisiontable062816pdf (acceso: 22-08-2026).
- **[S7] CONFIRMADO — General Medical Council (Reino Unido).** *Principles of making and using visual and audio recordings of patients*. https://www.gmc-uk.org/professional-standards/the-professional-standards/making-and-using-visual-and-audio-recordings-of-patients/principles (acceso: 22-08-2026).
- **[S8] CONFIRMADO — General Medical Council (Reino Unido).** *Recordings made as part of a patient’s care*, párrs. 13–17. https://www.gmc-uk.org/professional-standards/the-professional-standards/making-and-using-visual-and-audio-recordings-of-patients/recordings-made-as-part-of-a-patients-care-including-investigation-or-treatment-of-a-condition (acceso: 22-08-2026).
