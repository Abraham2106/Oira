# I11 / R3 — Transcripción en vivo durante la consulta

**Estado:** decisión P2  
**Fecha de acceso a fuentes:** 22 de agosto de 2026

## Decisión

**Mantener la transcripción en vivo oculta y no añadirla —ni como opt-in— hasta contar con evidencia de uso con médicos y capacidades confirmadas de IA/Justin.** P0 conserva el indicador de grabación, temporizador y estado de micrófono, pero no muestra texto generado durante la conversación.

La evidencia disponible es indirecta: el uso de pantallas para documentar durante una visita puede reducir el contacto visual y alterar la interacción médico-paciente [S1, S2]; el diseño ambiental busca precisamente desplazar documentación fuera del foco de la conversación [S3]. No hay evidencia suficiente de que corregir STT en vivo mejore la consulta ambulatoria presencial de NotaLocal, ni una confirmación de que el SDK entregue streaming estable, segmentos/correcciones y límites de recursos aceptables.

## Opciones evaluadas

| Opción | Beneficio supuesto | Riesgo | Decisión |
| --- | --- | --- | --- |
| Oculta durante Recording | Mantiene la pantalla como instrumento de estado, no de redacción; el médico puede centrarse en paciente. | El médico no detecta errores hasta Review. | **Mantener P0 y P2 actual.** |
| Opt-in “Ver transcripción en vivo” | Puede ayudar a algunos médicos a seguir la captura. | Incentiva mirar/corregir pantalla, expone errores parciales y requiere controles de privacidad/capacidad no confirmados. | No adoptar sin estudio y spike. |
| Mostrar siempre | Da sensación de actividad. | Convierte la consulta en tarea de supervisión de texto y puede confundir transcript parcial con nota. | Rechazar. |

## Razón de UX

La pantalla Recording debe responder “¿está grabando?” con señales redundantes, no competir con la conversación. AHRQ describe que documentar en EHR durante la visita puede afectar contacto visual y relación; en un estudio de entorno de consulta, configuraciones que facilitan alternar mirada/pantalla redujeron carga percibida, sin demostrar que más pantalla mejore el cuidado [S1]. La AMA resume hallazgos de que asistencia de documentación puede aumentar el tiempo de cara al paciente [S2]. Esto respalda una postura conservadora, no una prohibición clínica universal.

## Requisitos antes de reabrir

| Área | Evidencia mínima | Dueño |
| --- | --- | --- |
| Streaming STT | API oficial, latencia medida, parciales/finales, reintentos y errores; sin APIs inventadas. | IA |
| Recursos | RSS/CPU/GPU durante captura + STT y comportamiento en hardware objetivo. | IA / Justin |
| Audio y privacidad | Qué se almacena mientras se transmite, limpieza ante error y estado del micrófono. | Justin |
| Interacción | Prueba con médicos: mirada a pantalla, interrupciones, correcciones, confianza y relación con paciente. | Antonio / equipo |
| Accesibilidad | Actualizaciones no verbosas, pausa/reanudación, teclado y lector de pantalla; no anunciar cada token. | Antonio |
| Consentimiento | Revisar I2: la interfaz no convierte aviso en consentimiento para una función nueva. | Equipo |

## Protocolo de validación P2

Comparar tres prototipos con audio/transcript **sintéticos**: oculto, opt-in y visible. Pedir al médico realizar una consulta simulada y luego revisar el borrador. Registrar: activación del modo, tiempo de mirada a pantalla, número de correcciones en vivo, errores descubiertos en Review, percepción del paciente simulado y preferencia razonada. No medir ni prometer precisión de STT sin modelo/hardware definidos.

## Copy permitido hoy

- “Grabando — micrófono activo.”
- “La transcripción estará disponible para revisión cuando termine la consulta.”
- No decir: “Revisa la transcripción en tiempo real”, “corrige en vivo”, “transcripción instantánea” o “sin distracciones”.

## Caveats

- Esto no afirma que la transcripción en vivo sea dañina; afirma que no hay evidencia/capacidad suficiente para introducirla en P0.
- Las fuentes estudian EHR y diseño de consulta, no el layout exacto de NotaLocal.
- La decisión de aceptación y revisión permanece en I7; mostrar texto en vivo no sustituye Review.

## Fuentes

- **[S1] CONFIRMADO — AHRQ.** *Ambulatory Clinic Exam Room Design With Respect to Computing Devices to Enhance Patient-Centered Care*. https://digital.ahrq.gov/ahrq-funded-projects/ambulatory-clinic-exam-room-design-respect-computing-devices-enhance-patient (acceso: 22-08-2026).
- **[S2] CONFIRMADO — American Medical Association.** *Clicks and keyboards stealing face time with patients*. https://www.ama-assn.org/practice-management/digital-health/clicks-and-keyboards-stealing-face-time-patients (acceso: 22-08-2026).
- **[S3] CONFIRMADO — Abridge.** *Ambient AI for Clinicians*. https://www.abridge.com/platform/clinicians (acceso: 22-08-2026). Fuente de proveedor; se usa sólo para describir su patrón declarado de documentación posterior.
