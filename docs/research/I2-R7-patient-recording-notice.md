# I2 / R7 / Theme G — Aviso al paciente antes de grabar

**Estado:** decisión de experiencia P0  
**Fecha de acceso a fuentes:** 22 de agosto de 2026  
**Escenario:** consulta ambulatoria presencial, un médico, un equipo, sin teleconsulta.  
**No es asesoría jurídica ni un instrumento de consentimiento.** Este informe no decide qué consentimiento o autoridad exige un país, centro, aseguradora o colegio profesional.

## Decisión

**P0 debe incorporar una pantalla breve y explícita antes de `RECORDING`: un preflight dirigido al médico, sin casilla marcada por defecto, sin firma, sin almacenar una “prueba de consentimiento” y con una salida inequívoca de no grabar.**

La pantalla tiene una función ética y operativa: recuerda que la grabación todavía no comenzó, pide al médico confirmar que ya informó al paciente y que cuenta con la autorización o base aplicable, y permite cancelar. **No certifica consentimiento, no sustituye el juicio profesional ni produce un documento legal.** La recomendación está alineada con guías profesionales que exigen explicar el propósito de una grabación de cuidado, su forma y almacenamiento, evitar presión y detenerla cuando el paciente lo solicite [S1–S3]. Un producto ambient comercial de referencia también instruye obtener consentimiento antes de grabar y remite la determinación a la ley y política organizacional pertinentes [S4].

La recomendación no define el texto jurídico que el médico deba pronunciar. Sin un país de lanzamiento y sin políticas del consultorio, ese texto debe permanecer como orientación opcional, marcada claramente **“orientación de UX — no asesoría legal”**.

## Alcance y hechos de producto

- NotaLocal genera un **borrador**; el médico revisa, corrige y confirma.
- El flujo P0 puede procesar audio de la conversación, por lo que la grabación no es un detalle técnico invisible.
- La pantalla `New Consultation` debe declarar “La grabación no ha comenzado”.
- No hay teleconsulta, portal del paciente, firma electrónica, verificación de identidad, cuenta ni integración EHR en P0.
- La edad, capacidad, representante, finalidad secundaria y requisitos del país son **desconocidos para la interfaz**; no se resuelven con un checkbox.

## Evidencia y lectura prudente

El General Medical Council del Reino Unido indica que, al realizar o usar grabaciones de pacientes, se debe respetar privacidad, dignidad y la participación del paciente; la guía enumera informar el propósito, contar con consentimiento o autoridad apropiada, no presionar y detener cuando sea practicable si el paciente lo pide [S1]. Para grabaciones que contribuyen al cuidado, la misma entidad pide consentimiento y explicar por qué ayudaría, qué forma tendrá y que se guardará de manera segura; también pide comunicar usos secundarios posibles cuando resulte practicable [S2].

Estas reglas son profesionales y británicas, **no una ley latinoamericana aplicable automáticamente**. Su valor para NotaLocal es de patrón ético de interfaz: la aplicación debe hacer visible la decisión humana antes de capturar audio, sin adueñarse de la decisión legal.

La Ley chilena 20.584 protege el derecho de las personas a recibir información y participar en decisiones vinculadas a su atención; es relevante como marco de derechos del paciente, pero este informe no extrae de ella una regla específica sobre audio [S5]. Microsoft, como proveedor de una herramienta de documentación ambiental, indica obtener consentimiento antes de grabar y deja la guía sobre el modo de obtenerlo a las leyes y políticas de la organización [S4]. Esto refuerza la separación correcta: producto = recordatorio y controles; profesional/organización = proceso y autoridad aplicables.

## Opciones de UX

| Opción | Ubicación y acción del médico | Ventajas | Riesgos y límites | Decisión |
| --- | --- | --- | --- | --- |
| A. Recordatorio persistente | En New Consultation, junto al botón “Comenzar grabación”: “La grabación no ha comenzado. Informa al paciente antes de iniciar.” | Mínima fricción; deja claro el estado. | Es fácil ignorarlo; no crea un momento de decisión; no orienta qué informar. | **No suficiente sola.** Mantener como señal de estado. |
| B. Preflight no registrable **(recomendada)** | Al pulsar “Comenzar grabación”, modal/pantalla: propósito, forma/estado de almacenamiento si está confirmado, acción “He informado al paciente y puedo continuar”, “No grabar” y “Volver”. | Hace visible el punto de control antes de capturar; respeta que el médico es el actor; no simula evidencia legal. | La acción del médico no prueba consentimiento. No sirve cuando debe intervenir representante o protocolo local. Requiere que los hechos técnicos no sean inventados. | **Adoptar P0.** |
| C. Formulario de consentimiento electrónico del paciente | Antes de cada consulta: identidad, firma, fecha, representante, idioma, texto legal y retención de evidencia. | Podría encajar en un flujo jurídicamente validado para un país/organización. | Alto riesgo de falsa suficiencia; exige jurisdicción, capacidad, conservación, seguridad y apoyo legal; fuera de alcance del MVP. | **No construir P0.** Reservar para una iniciativa legal y de producto separada. |
| D. Iniciar grabación y mostrar aviso durante la consulta | Aviso solo tras activar micrófono. | Menor número de pantallas. | El aviso llega después del evento que necesitaba decisión; contradice la transparencia pregrabación. | **Descartar.** |

## Especificación P0 recomendada

### Secuencia

1. En `New Consultation`: mostrar **“La grabación no ha comenzado.”**
2. El médico pulsa **“Preparar grabación”**, no “grabar” de inmediato.
3. Aparece el preflight B. El foco inicia en el título; el botón de continuación no está preseleccionado.
4. Si elige **“No grabar”** o cierra el diálogo, volver a `New Consultation`; el micrófono sigue inactivo.
5. Si elige **“He informado al paciente y puedo continuar”**, entrar en `RECORDING` y activar el indicador redundante de grabación.
6. Durante `RECORDING`, ofrecer **“Detener grabación”** siempre visible. Una solicitud del paciente requiere que el médico pueda detenerla de inmediato; la UI no debe ocultar esa acción.

### Hechos técnicos en el preflight

Solo se muestran si el backend los confirma:

- “La aplicación procesará el audio en este equipo.” — **CONDICIONAL — Justin/IA**.
- “El audio temporal se borra al cerrar esta consulta.” — **CONDICIONAL — Justin**.
- “No se envía la consulta a un proveedor de IA en esta versión.” — **CONDICIONAL — Justin/IA**.
- Si cualquiera falta: “Consulta el estado de privacidad de esta aplicación antes de iniciar.” No completar la frase con “local”, “seguro” o “privado”.

No mencionar “cumple”, “autorización legal válida”, “consentimiento documentado” ni un país/ley en el preflight.

## Microcopy para el médico

| Superficie | Microcopy ES | Microcopy EN | Estado jurídico / de producto |
| --- | --- | --- | --- |
| Estado previo | **La grabación no ha comenzado.** | **Recording has not started.** | CONFIRMADO — estado de producto. |
| Título del preflight | **Antes de grabar** | **Before recording** | CONFIRMADO — UX. |
| Instrucción principal | **Antes de iniciar, informa al paciente y verifica que puedes grabar esta consulta según el contexto y las reglas aplicables.** | **Before starting, inform the patient and verify that you may record this consultation under the applicable context and rules.** | ORIENTACIÓN DE UX — NO ASESORÍA LEGAL. |
| Propósito, si el backend lo confirma | **La grabación se usa para preparar un borrador de nota que tú revisarás.** | **The recording is used to prepare a draft note that you will review.** | CONFIRMADO — principio de producto. |
| Orientación oral opcional | **“Quisiera grabar el audio de esta consulta para preparar un borrador de mi nota. Yo la revisaré antes de usarla. ¿Podemos continuar?”** | **“I would like to record this consultation’s audio to prepare a draft of my note. I will review it before using it. May we continue?”** | ORIENTACIÓN DE UX — NO ES TEXTO LEGAL; adaptar/no usar si el protocolo local exige otra forma. |
| Acción de continuación | **He informado al paciente y puedo continuar** | **I have informed the patient and can continue** | Confirmación operativa del médico; **no** prueba, registra ni certifica consentimiento. |
| Salida | **No grabar** | **Do not record** | CONFIRMADO — control de producto. |
| Ayuda | **Si hay dudas sobre autorización, capacidad o representación, sigue el protocolo de tu consultorio antes de grabar.** | **If there are questions about authorization, capacity, or representation, follow your practice’s protocol before recording.** | ORIENTACIÓN DE UX — NO ASESORÍA LEGAL. |
| Grabando | **Grabando — micrófono activo** | **Recording — microphone active** | CONFIRMADO — se muestra solo en `RECORDING`. |
| Solicitud de detención | **Detener grabación** | **Stop recording** | CONFIRMADO — acción de producto; debe ser inmediata y accesible. |

## Qué el producto puede y no puede hacer

**El producto puede:**

- Crear un punto de decisión antes de iniciar la captura.
- Mostrar finalidad y comportamiento técnico **solo cuando estén confirmados**.
- Dar al médico una salida clara y conservar “no grabando” como estado inequívoco.
- Mantener el control de detener grabación visible durante toda la consulta.

**El producto no puede:**

- Determinar si hay consentimiento, autorización u otra base válida.
- Verificar que el paciente entendió, que no hubo presión, que existe capacidad o que un representante puede decidir.
- Convertir un clic del médico en consentimiento del paciente.
- Guardar una atestación como si fuera historia clínica o evidencia legal.
- Reutilizar el audio para investigación, entrenamiento o demostración con base en esta pantalla.

## Riesgos y mitigaciones

| Riesgo | Mitigación P0 | Límite residual |
| --- | --- | --- |
| El médico interpreta el modal como consentimiento legal | Etiqueta visible “orientación de UX — no asesoría legal”; no usar “consentimiento obtenido”. | La interpretación del usuario no puede eliminarse por completo; requiere onboarding y política. |
| Información técnica falsa | Derivar copy de estados del bridge; usar `DESCONOCIDO` ante ausencia de señal. | Depende de Justin/IA y pruebas de implementación. |
| Paciente menor, sin capacidad o con representante | Texto de remisión a protocolo local; no tomar ni guardar decisión en P0. | Requiere flujo y asesoría específicos si se incorpora. |
| Solicitud de detener | Botón accesible, visible y con parada real del backend. | Debe verificarse end-to-end; no basta la UI. |
| Se usa audio para otra finalidad | No ofrecer usos secundarios P0; cualquier futuro uso requiere diseño, políticas y revisión independientes. | No resuelto por el preflight. |

## Pendientes

- **Justin:** comportamiento real al iniciar/detener, retención, borrado, errores y señal de micrófono.
- **IA:** si audio/transcript se usa para evaluación, depuración o entrenamiento; respuesta esperada para P0: no añadir finalidad secundaria sin decisión explícita.
- **Equipo/asesoría local:** países de lanzamiento, normativa, política del consultorio, población pediátrica/capacidad y si se requiere documentación adicional.
- **I12:** teleconsulta tiene dos fuentes de audio y un aviso distinto; no se hereda esta decisión sin investigación posterior.

## Fuentes

- **[S1] CONFIRMADO — General Medical Council (Reino Unido).** *Principles of making and using visual and audio recordings of patients*, párr. 8. https://www.gmc-uk.org/professional-standards/the-professional-standards/making-and-using-visual-and-audio-recordings-of-patients/principles (acceso: 22-08-2026).
- **[S2] CONFIRMADO — General Medical Council (Reino Unido).** *Recordings made as part of a patient’s care, including investigation or treatment of a condition*, párrs. 13–17. https://www.gmc-uk.org/professional-standards/the-professional-standards/making-and-using-visual-and-audio-recordings-of-patients/recordings-made-as-part-of-a-patients-care-including-investigation-or-treatment-of-a-condition (acceso: 22-08-2026).
- **[S3] CONFIRMADO — General Medical Council (Reino Unido).** *Making and using visual and audio recordings of patients*, alcance y actualización de la guía. https://www.gmc-uk.org/professional-standards/the-professional-standards/making-and-using-visual-and-audio-recordings-of-patients (acceso: 22-08-2026).
- **[S4] CONFIRMADO — Microsoft Learn.** *What is Microsoft Dragon Copilot (physicians)?*, aviso para obtener consentimiento antes de grabar y remisión a leyes/políticas de la organización. https://learn.microsoft.com/en-us/industry/healthcare/dragon-copilot/about/ (acceso: 22-08-2026). Fuente de proveedor; no demuestra obligación jurídica regional.
- **[S5] CONFIRMADO — Biblioteca del Congreso Nacional de Chile.** *Ley N.º 20.584: derechos y deberes de las personas en relación con acciones vinculadas a su atención en salud*. https://www.bcn.cl/leychile/navegar?idNorma=1039348 (acceso: 22-08-2026). Fuente legal chilena; no se interpreta aquí como regla específica sobre grabación.
