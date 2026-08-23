# Extra — Explicación médica de prompt injection

**Estado:** investigación de escritorio.  
**Decisión:** incluir una explicación breve en Seguridad/FAQ durante P1; no mostrar una alerta dentro de cada nota ni omitir el riesgo.  
**Fuentes consultadas:** 2026-08-22.

## 1. Decisión y alcance

NIST describe prompt injection directa e indirecta como un riesgo para sistemas de IA generativa: instrucciones colocadas en entradas o datos pueden orientar el comportamiento del sistema de maneras no previstas [NIST AI 600-1](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf). Esto no significa que el paciente sea un atacante ni que una nota sea intrínsecamente sospechosa. La interfaz debe enseñar una práctica clínica y técnica razonable: contrastar cada borrador con la fuente, el contexto y el juicio del profesional.

La Security page y FAQ son el lugar adecuado en P1: son persistentes, explicables y no interrumpen documentación con una alerta de seguridad que podría aumentar carga cognitiva. No se afirma inmunidad. El aviso no abre configuración editable desde una nota, no interpreta URLs y no presenta pruebas de explotación.

## 2. Controles ya decididos

Este texto no reabre decisiones del producto:

- el transcript se delimita como evidencia;
- la fuente se identifica cuando existe y se muestra “Sin origen identificado” cuando no;
- ajustes no se editan desde la nota;
- URLs son inertes;
- no se renderiza HTML proveniente del modelo;
- el contenido no puede autoexportar ni aprobar una nota.

Estas barreras reducen capacidad de acción automática, pero no autorizan afirmar que eliminan el riesgo.

## 3. Copy exacto

### Español

**Título:** “Por qué se revisan los borradores”

> “Los borradores generados a partir de una conversación pueden incluir texto que intente parecer una instrucción para el sistema. Oira trata ese texto como contenido de la conversación, no como una orden clínica. Verifique el borrador contra la fuente identificada y su criterio profesional antes de aprobarlo o exportarlo.”

**Límite:**

> “Estas medidas reducen riesgos, pero no sustituyen la revisión clínica ni garantizan que toda salida sea correcta.”

### English

**Title:** “Why drafts require review”

> “Drafts generated from a conversation can contain text that attempts to look like an instruction to the system. Oira treats that text as conversation content, not as a clinical order. Verify the draft against the identified source and your professional judgment before approving or exporting it.”

**Limit:**

> “These measures reduce risk, but they do not replace clinical review or guarantee that every output is correct.”

## 4. UX y tono

La explicación usa “texto” y “fuente”, no “ataque del paciente”. No pide al médico desconfiar de la persona; pide verificar la evidencia. Debe aparecer junto al recordatorio central “el agente documenta; el médico decide”, con enlace a FAQ para más detalle. No se debe presentar como un error del usuario ni como una advertencia que bloquee el trabajo por sí sola.

## 5. Afirmaciones prohibidas

No usar “immune”, “proof against prompt injection”, “the model cannot follow malicious instructions” ni sus equivalentes en español. Tampoco enumerar payloads, PoCs o instrucciones para evadir controles.

## 6. Decisión

**Incluir en Seguridad/FAQ en P1, no como alarma in-app por nota.** El copy bilingüe anterior es el texto aprobado de producto mientras se mantengan los controles ya definidos y la revisión humana antes de aprobar/exportar.

## Bibliografía

1. National Institute of Standards and Technology. [Artificial Intelligence Risk Management Framework: Generative AI Profile](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf). Consultado el 2026-08-22.
