# Oira — Visión de producto

Referencia de concepto: **oira.doctor** (landing analizada; tema visual en `DESIGN.md`).

## La idea principal (destilada de oira.doctor)

> *"You're a doctor. Not a machine."* — AI that runs the doctor's clinical notes.

Oira propone un agente ambient: escucha la conversación clínica en silencio,
transcribe en el dispositivo, estructura lo hablado en una nota profesional
(síntomas, hallazgos, evaluación, plan) y la entrega **lista para revisión del
médico**, quien aprueba con un clic y la pasa al sistema que ya usa (en Costa
Rica: EDUS y similares) **sin cambiar de EHR**. Tres promesas: redacta la nota,
mantiene al médico al mando, responde con contexto del paciente.

## Nuestro giro (Oira)

El mismo flujo, pero **local-first en el PC del médico** y con entrada flexible:

1. **Conectar fuente**: micrófono del equipo o celular por Bluetooth — el que
   tenga a mano. Sin nube obligatoria.
2. **Hablar natural**: consulta normal; nadie dicta plantillas.
3. **IA local organiza**: transcripción on-device + estructuración que prepara,
   acomoda y redacta mejor lo dicho (normaliza terminología, separa hablantes,
   reparte en las 7 secciones de la historia).
4. **El médico decide**: revisa junto a la transcripción literal con orígenes
   clicables, corrige, marca secciones y acepta.
5. **Copiar y pegar**: texto de calidad listo para EDUS / Expediente digital /
   Word. Lo que pase después sale del control de Oira.

Principio innegociable (README): **el agente documenta; el médico decide.**

## Prompt maestro — agente de estructuración (v2)

Sustituye/complementa `docs/research/prompts/SYSTEM.md`. Texto canónico:

```text
Eres el agente de documentación de Oira. Recibes la transcripción cruda de
una consulta médica (segmentos con hablante Médico/Paciente y marca de tiempo)
y produces UN BORRADOR de historia clínica en español médico formal, dividido
en 7 secciones: visit_context, clinical_narrative, relevant_history,
reported_findings, clinician_documented_assessment, clinician_documented_plan,
follow_up.

Reglas inviolables:
1. Documentas; el médico decide. Tu salida es siempre un borrador sujeto a
   revisión humana; nunca un documento final.
2. Fidelidad radical: escribe únicamente lo que se dijo en la consulta. No
   infieras diagnósticos, no inventes datos, no completes huecos, no aconsejes.
3. Presencia honesta por campo: STATED (dicho explícitamente), NOT_STATED (el
   tema no salió), UNKNOWN (salió pero ambiguo o incompleto). Jamás transformes
   NOT_STATED en contenido; esas secciones quedan vacías.
4. Trazabilidad: cada sección lista los ids de los segmentos que la respaldan
   (sourceSegmentIds). Si no hay respaldo, la lista va vacía.
5. Redacción: español clínico profesional, terminología normalizada, tercera
   persona, sin juicios de valor. Mejora claridad y orden, nunca el contenido.
6. Formato de salida: JSON estricto contra el schema acordado (ClinicalNote).
   Ningún texto fuera del JSON.
```

## Roadmap hacia ese flujo

| # | Workstream | Zona | Estado |
| --- | --- | --- | --- |
| 1 | Captura de audio real (mic/Bluetooth) | `renderer/audio` | en construcción |
| 2 | Seam STT local (puerto + motor fake/QVAC) | `main/stt` | en construcción |
| 3 | Motor de estructuración (prompt v2 + ensamblador + léxico RAG) | `main/structure` | en construcción |
| 4 | Investigación RAG y fine-tuning (ES clínico) | `docs/research/R-11`, `R-12` | en construcción |
| 5 | Persistencia local de notas aceptadas | `main/storage` | en construcción |
| 6 | Integración vertical (cableado IPC/bridge/useEncounter) | main+preload+bridge | siguiente sesión |

Las piezas llegan como puertos con implementaciones falsas deterministas: el
flujo completo corre hoy sin modelo, y cambiar a QVAC/STT real es reemplazar el
adaptador, no reescribir la app.
