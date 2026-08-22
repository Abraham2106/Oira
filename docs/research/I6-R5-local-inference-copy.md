# I6 / R5 / Theme D — Copy para inferencia local

**Estado:** propuesta P1 de copy — requiere validación con médicos  
**Fecha de acceso a fuentes:** 22 de agosto de 2026  
**Ámbito:** Home, Privacy y `PrivacyStatusPanel`.

## Decisión

**Recomendar la Variante B:** describe el procesamiento como un estado visible y verificable de esta aplicación, no como una cualidad absoluta de privacidad. Debe renderizarse únicamente cuando el bridge confirme `LOCAL`; ante ausencia, error o discrepancia se muestra el fallback `UNKNOWN`.

La propuesta no usa “cifrado”, “seguro”, “privado”, “anónimo”, “nunca sale del dispositivo” ni ninguna ley. Las fuentes revisadas tratan el dato de salud y operaciones de almacenamiento/eliminación como tratamiento sensible o regulado [S1–S3]. Por tanto, una frase sobre ejecución local no autoriza una promesa sobre cumplimiento, anonimato, exportación, backups o cualquier versión futura.

## Hechos que el copy puede representar

| ID | Hecho / estado | Dueño de confirmación | Puede alimentar copy |
| --- | --- | --- | --- |
| F1 | La versión informa que la inferencia se ejecuta localmente. | Justin / IA | Sí, solo si el estado vivo es `LOCAL`. |
| F2 | No se configuró proveedor de IA remoto para la consulta. | Justin / IA | Sí, solo si el backend confirma la configuración de esta versión. |
| F3 | El producto genera un **borrador** que revisa el médico. | Producto | Sí, siempre. |
| F4 | La app conoce el destino de audio/nota y retención. | Justin | Solo para la fila exacta de PrivacyStatusPanel; no inferir. |
| F5 | El estado no llega, es incompatible o falló. | Bridge | Sí: usar `UNKNOWN`; nunca sustituir con “local”. |

## Variante A — directa y orientada al resultado

| Superficie | ES | EN | Mapea a |
| --- | --- | --- | --- |
| Home, una línea | **Esta versión prepara el borrador en este equipo.** | **This version prepares the draft on this device.** | F1 + F3 |
| Privacy, párrafo corto | **Cuando el estado indica “Procesamiento local”, esta versión prepara la transcripción y el borrador en este equipo. Revisa el estado de almacenamiento y borrado antes de iniciar.** | **When the status says “Local processing,” this version prepares the transcript and draft on this device. Review storage and deletion status before starting.** | F1 + F3 + F4 |
| PrivacyStatusPanel, ayuda | **Confirmado por la aplicación para esta consulta.** | **Confirmed by the app for this consultation.** | F1 |
| Fallback UNKNOWN | **No podemos confirmar desde esta aplicación dónde se procesó esta consulta. No asumas procesamiento local.** | **This app cannot confirm where this consultation was processed. Do not assume local processing.** | F5 |

**Riesgo:** “prepara el borrador” puede comunicar con claridad el beneficio, pero aún debe acompañarse de “requiere revisión médica” para no sugerir automatización clínica completa.

## Variante B — recomendada, centrada en el estado

| Superficie | ES | EN | Mapea a |
| --- | --- | --- | --- |
| Home, una línea | **Comprueba aquí cuándo el procesamiento local está activo.** | **See here when local processing is active.** | F1 |
| Privacy, párrafo corto | **El estado de esta aplicación indica si el procesamiento local está activo para la consulta. Si no puede confirmarlo, mostrará “Desconocido”. El borrador sigue requiriendo tu revisión.** | **This app’s status indicates whether local processing is active for the consultation. If it cannot confirm it, it shows “Unknown.” The draft still requires your review.** | F1 + F3 + F5 |
| PrivacyStatusPanel, ayuda | **Procesamiento local confirmado para esta consulta.** | **Local processing confirmed for this consultation.** | F1 |
| Fallback UNKNOWN | **Procesamiento local: desconocido. Revisa la configuración y el estado del modelo antes de continuar.** | **Local processing: unknown. Review the configuration and model status before continuing.** | F5 |

**Por qué recomendarla:** explica una conducta observable y su degradación honesta. No convierte “local” en sinónimo de seguridad, confidencialidad ni cumplimiento.

## Variante C — centrada en límites

| Superficie | ES | EN | Mapea a |
| --- | --- | --- | --- |
| Home, una línea | **El procesamiento local se muestra como estado, no como promesa.** | **Local processing is shown as a status, not as a promise.** | F1 + F5 |
| Privacy, párrafo corto | **Cuando esta aplicación confirma “Procesamiento local”, muestra ese estado para la consulta actual. Copiar o exportar la nota es una acción separada que eliges tú.** | **When this app confirms “Local processing,” it shows that status for the current consultation. Copying or exporting the note is a separate action you choose.** | F1 + flujo de exportación |
| PrivacyStatusPanel, ayuda | **Estado informado por el backend de esta versión.** | **Status reported by this version’s backend.** | F1 |
| Fallback UNKNOWN | **No hay confirmación de procesamiento local para esta consulta. No mostramos una afirmación de local.** | **There is no confirmation of local processing for this consultation. We do not show a local claim.** | F5 |

**Riesgo:** es el texto más preciso para un equipo técnico, pero “no como promesa” puede resultar abstracto y defensivo para un médico. No recomendar para Home.

## Reglas de implementación

1. `LocalInferenceBadge` solo admite `local` cuando recibe confirmación de backend; con dato ausente usa `unknown`.
2. Cada frase de F1/F2 se recalcula para la consulta/versión actual; no se hardcodea en website si aún no hay mecanismo de verificación de release.
3. La Home no debe mezclar inferencia local con retención, borrado, cifrado, anonimato o cumplimiento. Son hechos distintos.
4. F2 puede aparecer como fila “Proveedor de IA remoto: desactivado” solo si Justin confirma que no hay fallback, telemetría de contenido ni otro destino relevante.
5. El copy de datos almacenados debe esperar I8 y los estados reales de retención; no inferirlos de F1.

## Validación con médicos — **UNTESTED**

Antes de fijar copy, probar las tres variantes con cinco médicos ambulatorios usando una maqueta con estado `LOCAL` y `UNKNOWN`.

1. “Con tus palabras, ¿dónde crees que se procesó esta consulta?”
2. “¿Qué entiendes que ocurre cuando el estado dice ‘Desconocido’?”
3. “¿Esta frase te hace pensar que la nota es definitiva o que todavía debes revisarla?”
4. “¿Qué esperas que ocurra al copiar la nota a otro sistema?”
5. “¿Qué palabra te resulta confusa, exagerada o te haría desconfiar?”

**Criterio de salida:** no adoptar una variante si algún participante interpreta “local” como anonimato, garantía de seguridad, prohibición de exportar o exención de revisión médica. Registrar literalmente las respuestas y volver a probar el copy ajustado; no convertir una preferencia de cinco personas en claim legal.

## Límites y dependencias

- **Justin / IA:** confirmar estados de inferencia, rutas de red, fallback y su versión. Sin ello, sólo es válido `UNKNOWN`.
- **I8:** retención/borrrado y la frase de almacenamiento. No se resuelven por este documento.
- **I1:** prohíbe leyes, superlativos, anonimato y absolutos. Este copy no modifica ese registro.
- **Website:** si no puede leer un estado vivo, debe publicar únicamente frases versionadas que el equipo haya verificado en pruebas de release; de lo contrario omitir el claim.
- La evidencia aquí sustenta prudencia sobre datos sensibles y minimización; las variantes son **decisiones de diseño**, no hallazgos clínicos.

## Fuentes

- **[S1] CONFIRMADO — Presidência da República do Brasil.** *Lei nº 13.709/2018 (LGPD), texto compilado*, arts. 5 y 6. https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/L13709compilado.htm (acceso: 22-08-2026).
- **[S2] CONFIRMADO — Argentina.gob.ar.** *Ley 25.326 — Protección de los Datos Personales*, art. 4. https://www.argentina.gob.ar/normativa/nacional/ley-25326-64790/texto (acceso: 22-08-2026).
- **[S3] CONFIRMADO — Superintendencia de Industria y Comercio, Colombia.** *Tratamiento de datos sensibles relativos a la salud*. https://sedeelectronica.sic.gov.co/publicaciones/boletin-juridico/concepto/tratamiento-de-datos-sensibles-relativos-la-salud (acceso: 22-08-2026).
