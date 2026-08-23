# I12 / Theme F — Deltas de UI para teleconsulta

**Estado:** definición P0/P2 — no autoriza construir teleconsulta  
**Fecha de acceso a fuentes:** 22 de agosto de 2026

## Decisión

**P0 queda limitado a consulta presencial con una fuente de audio local. Teleconsulta es posterior y no debe habilitarse, anunciarse ni inferirse hasta que existan capacidades de captura, aviso, consentimiento y manejo de dos fuentes confirmadas.**

La telemedicina añade una distancia, un canal remoto, posibles terceros, dispositivos y normas del entorno que no existen en P0. Guías oficiales insisten en adaptar consentimiento, privacidad y confidencialidad al contexto [S1–S4]. Esas fuentes no aportan un texto legal latinoamericano ni sustituyen un análisis por país; justifican no reutilizar ciegamente el aviso presencial de I2.

## Escenarios

| Escenario | Definición de producto | Estado |
| --- | --- | --- |
| **P0 presencial** | Médico y paciente en la misma consulta; Oira captura una fuente de micrófono local después del preflight de I2. Sin bot, enlace de reunión, captura de audio de sistema ni mezcla de fuentes. | Único escenario soportado. |
| **P2 remoto tipo Zoom** | Médico y paciente participan mediante una plataforma ajena; pueden existir micrófono local, audio de sistema, auriculares, terceros o grabación nativa de la plataforma. | No soportado; requiere diseño y validación separados. |

## Matriz de deltas

| Pantalla | Presencial P0 | Teleconsulta P2 | ¿Debe cambiar? | Riesgo si no cambia |
| --- | --- | --- | --- | --- |
| Device Ready | Modelo y micrófono local listos. | Micrófono local + permiso/captura de audio remoto + mezcla/origen de dos fuentes. | Sí. | Grabar sólo al médico, perder al paciente o representar una fuente inexistente. |
| New Consultation | Aviso de que la grabación no ha iniciado. | Declarar que la app no se conecta a Zoom/Meet ni agrega bot; elegir/confirmar fuente sólo si el backend la soporta. | Sí. | Usuario asume integración o captura remota. |
| Preflight | Médico informa al paciente antes de grabar. | Explicar modalidad remota, fuente(s), posibles terceros y política del servicio de videollamada; proceso jurisdiccional/organizacional separado. | Sí. | El aviso presencial omite cambios materiales del canal. |
| Recording | Indicador de micrófono local, temporizador, detener. | Indicadores distintos por micrófono/audio de sistema/mezcla, pérdida de fuente y parada verificable de todas las capturas. | Sí. | Señal “grabando” falsa o incompleta; captura residual. |
| Processing | Audio único y contrato de transcript. | Metadatos de fuente, separación/mezcla, hablantes y errores de canal. | Sí. | Atribución equivocada y notas sin origen fiable. |
| Review | Transcript/nota y evidencia por segmento. | Evidencia debe mostrar fuente/canal y ambigüedad; no asumir diarización. | Sí. | El médico confunde quién dijo qué. |
| Settings/Privacy | Estado de micrófono, retención y almacenamiento local. | Estado por fuente, permisos de SO, aplicación externa y limitaciones de lo que Oira no controla. | Sí. | Promesas falsas sobre privacidad/borrado. |
| Export / FAQ | Exportación manual del borrador. | Debe declarar qué se puede exportar y qué sigue bajo control de la plataforma de videollamada. | Sí. | Se confunde Oira con proveedor de teleconsulta. |

## FAQ: frases permitidas ahora

| Pregunta | Copy público permitido hoy |
| --- | --- |
| “¿Funciona con Zoom, Meet o Teams?” | **“Oira está diseñado para consultas presenciales en esta versión. No se conecta a plataformas de videollamada.”** |
| “¿Graba el audio de una llamada?” | **“La captura de audio de videollamadas no está disponible en esta versión.”** |
| “¿Puedo invitar un bot a mi reunión?” | **“Oira no añade bots ni participa en reuniones.”** |
| “¿Qué pasa con el audio del paciente remoto?” | **“Esta versión no ofrece captura remota de pacientes.”** |

Estas frases describen el alcance actual; deben retirarse o versionarse si cambia la implementación.

## Frases permitidas sólo después de P2 verificado

- “Esta versión puede capturar [fuente exacta] cuando el estado del sistema la confirma.”
- “Antes de iniciar, revisa qué fuentes de audio están activas.”
- “Oira no controla las grabaciones, transcripciones ni políticas de la plataforma de videollamada.”
- Cualquier texto sobre consentimiento, retención o proveedores requiere país/organización y comportamiento técnico confirmados; no publicar una plantilla legal.

## Dependencias

| Dependencia | Estado actual |
| --- | --- |
| Captura de audio de sistema | **CONDITIONAL — Justin.** No asumir API, permisos ni compatibilidad por SO. |
| Mezcla/separación de fuentes y speaker labels | **CONDITIONAL — IA/Justin.** No asumir diarización ni atribución. |
| Detección de plataforma/reunión | **NO P2 por defecto.** No construir bot, integración marketplace ni detector de Zoom. |
| Consentimiento/aviso remoto | **PENDIENTE — asesoría y política local.** I2 no se transfiere sin cambios. |
| Retención/borrado por fuente | **CONDITIONAL — Justin; I8.** |
| Calidad/latencia de STT remoto | **CONDITIONAL — IA, hardware y red.** |

## Caveats

- La decisión no aconseja usar teleconsulta ni prohíbe su estudio; protege P0 de una capacidad no verificada.
- Las guías de HHS/GMC/OMS son contextos profesionales internacionales, no una norma aplicable automáticamente a LATAM.
- No hay bots, integración con marketplace, texto de consentimiento legal ni promesa de audio del sistema en este documento.

## Fuentes

- **[S1] CONFIRMADO — World Health Organization.** *How to plan and conduct telehealth consultations with children and adolescents and their families*. https://iris.who.int/server/api/core/bitstreams/dadc019c-dd69-4fc7-8da6-dd15d94f8b08/content (acceso: 22-08-2026). El principio de adaptación a privacidad/consentimiento es general; no se usa como protocolo pediátrico P0.
- **[S2] CONFIRMADO — Telehealth.HHS.gov.** *Develop a privacy and security telehealth strategy*. https://telehealth.hhs.gov/providers/best-practice-guides/privacy-and-security-telehealth/develop-privacy-and-security (acceso: 22-08-2026).
- **[S3] CONFIRMADO — General Medical Council (Reino Unido).** *Remote consultations*. https://www.gmc-uk.org/professional-standards/ethical-hub/remote-consultations (acceso: 22-08-2026).
- **[S4] CONFIRMADO — General Medical Council (Reino Unido).** *Recordings made as part of a patient’s care*. https://www.gmc-uk.org/professional-standards/the-professional-standards/making-and-using-visual-and-audio-recordings-of-patients/recordings-made-as-part-of-a-patients-care-including-investigation-or-treatment-of-a-condition (acceso: 22-08-2026).
