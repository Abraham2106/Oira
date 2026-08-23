# I8 / Theme E — Matriz de retención local

**Estado:** matriz de consecuencias P1 — **no decide el valor por defecto**  
**Fecha de acceso a fuentes:** 22 de agosto de 2026  
**Ámbito:** audio, transcripción, borrador/nota y sus controles locales en Oira.

## Decisión

**No elegir A, B ni C todavía.** Antes de activar cualquier opción, Justin debe confirmar qué objetos existen, dónde se guardan, cuánto persisten, qué operación de borrado es real y cómo se informa un fallo. La interfaz debe describir comportamiento observado, no intención.

La recolección, almacenamiento y eliminación de datos son operaciones de tratamiento en la LGPD [S1]; la Ley argentina 25.326 exige pertinencia/no exceso y destruir datos cuando dejan de ser necesarios para su finalidad [S2]. Estas fuentes orientan a hacer la retención visible, limitada y controlable; no determinan cuál opción cumple una obligación clínica de conservación en cada país. La eventual obligación del médico de conservar su expediente pertenece al contexto jurídico/profesional y **no convierte automáticamente a Oira en custodio del registro definitivo**.

## Objetos y estados que el backend debe aclarar

| Objeto | Preguntas obligatorias para Justin | Estado de copy hasta confirmar |
| --- | --- | --- |
| Audio bruto / temporal | ¿Existe? ¿ruta? ¿cifra? ¿cuándo se borra? ¿puede sobrevivir fallo/cierre? | `DESCONOCIDO`; no decir “se borra al cerrar”. |
| Archivo de transcripción | ¿Se persiste o es memoria? ¿contiene timestamps/hablantes? | `DESCONOCIDO`. |
| Borrador de nota | ¿Se guarda antes de aceptar? ¿versionado/autoguardado? | `DESCONOCIDO`. |
| Nota aceptada | ¿Dónde vive? ¿formato? ¿qué hace eliminar? | `DESCONOCIDO`. |
| Copia/exportación | ¿Portapapeles, archivo local, EHR o respaldo? | Fuera del alcance de un botón de borrar interno, salvo objeto expresamente gestionado. |
| Logs, caché, crash reports | ¿contienen audio, transcript o texto clínico? ¿a dónde van? | `DESCONOCIDO`; no decir “todo es local”. |

## Matriz de consecuencias

| Tema | A. Sin retención | B. Notas solamente | C. Notas + audio |
| --- | --- | --- | --- |
| **Propósito de producto** | Preparar, revisar y exportar una sesión; luego no conservar dentro de Oira. | Permitir revisar/reabrir notas locales; audio no queda como colección local. | Permitir reconsulta de nota y audio; aumenta superficie y expectativas de control. |
| **PrivacyStatusPanel** | **CONDICIONAL — Justin:** “Audio temporal: no retenido” solo si se prueba borrado real; “Notas guardadas: no”. Mostrar una fila de estado de transcripción si existe temporalmente. | **CONDICIONAL — Justin:** “Audio temporal: no retenido”; “Notas guardadas en este equipo: sí/no” con ubicación y alcance confirmados. | **CONDICIONAL — Justin:** “Audio guardado en este equipo: sí”, cuándo/por qué; “Notas guardadas: sí”; mostrar tamaño/fecha si el backend los entrega. Nunca traducir a “privado” o “cumple”. |
| **Settings / controles** | No mostrar interruptor de retención. Ofrecer “Ver qué se elimina al cerrar” si hay semántica confirmada. | Control real de conservar/eliminar notas, con explicación de alcance; no control de audio si no existe. | Controles separados para notas y audio; no unirlos bajo “Privacidad” si sus efectos difieren. Toda preferencia debe modificar backend, no solo UI. |
| **Qué puede borrar Oira** | La sesión temporal que el backend controle, si existe y confirma éxito. | Notas locales y temporales definidos por backend; distinguir borrar una nota vs todas. | Audio, notas y temporales gestionados por la app, por objeto y alcance explícitos. |
| **Qué no puede borrar** | Archivos que el médico guardó, texto pegado en otro sistema, copias del SO, respaldos ajenos, capturas y destinatarios externos. | Igual. | Igual; el riesgo de duplicados/respaldos es mayor y debe ser visible. |
| **Fallo durante Recording / Processing** | No prometer limpieza: “No pudimos confirmar si se eliminó el audio temporal.” Ofrecer reintentar/consultar estado. | Igual para audio; distinguir nota local preservada de audio no confirmado. | Informar objeto y resultado: “No pudimos borrar el audio de esta consulta”; no mostrar éxito optimista. |
| **Website: qué almacenamos** | Solo tras verificación: “Esta versión no conserva audio ni notas en Oira después de [evento confirmado].” | Solo tras verificación: “Esta versión guarda notas en este equipo.” Nombrar audio separadamente. | Solo tras verificación: “Esta versión guarda notas y audio en este equipo.” Añadir control y límites de borrado. |
| **Control deshabilitado** | “La retención no está disponible en esta versión.” | “El guardado de notas está disponible cuando el almacenamiento local esté listo.” Si no está listo, explicar el motivo técnico. | “El control de audio está deshabilitado porque el backend no confirmó su estado.” Nunca mostrar un switch activo sin efecto. |
| **Riesgo dominante** | Pérdida de una sesión / expectativas confusas si el borrado falla. | Persistencia de contenido clínico y confusión entre nota local y registro definitivo. | Mayor exposición si el equipo, cuenta de SO o respaldos se comprometen; complejidad de borrado y retención. |
| **Dependencias** | Lifecycle de proceso, errores, cleanup, logs. | SQLite/almacenamiento local, listado, borrado atómico, mensajes de error. | Todo B + gestión segura de archivos grandes, recuperación, disponibilidad, borrado verificable y política sobre copias. |

## Copy de estado por comportamiento (plantillas; no publicar hasta confirmar)

| Situación | Copy ES permitido si el backend lo confirma | Copy que no usar |
| --- | --- | --- |
| Audio temporal eliminado | “El audio temporal de esta consulta se eliminó.” | “Tu audio nunca se guardó.” |
| Eliminación fallida | “No pudimos confirmar la eliminación del audio temporal. Revisa el estado antes de cerrar.” | “El audio se eliminó” tras un error. |
| Nota local guardada | “Esta nota se guarda en este equipo.” | “Tu historial está seguro” / “es un expediente clínico oficial”. |
| Nota local eliminada | “Esta nota se eliminó de los datos gestionados por Oira.” | “Eliminamos todas las copias.” |
| Exportación | “Lo que copies o guardes fuera de Oira puede permanecer en el sistema de destino.” | “Exportar no afecta la privacidad.” |
| Estado no disponible | “No podemos confirmar el estado de retención en esta versión.” | “No se guarda nada” por ausencia de datos. |
| Control no implementado | “Este control estará disponible cuando el almacenamiento local lo admita.” | Un interruptor que aparenta funcionar. |

## Requisitos de interfaz comunes

1. **Estado antes que marketing.** PrivacyStatusPanel enseña inferencia, proveedor remoto, micrófono, audio temporal y almacenamiento con valores de backend o `DESCONOCIDO`.
2. **Borrado por objeto.** La acción nombra exactamente el objeto: “Eliminar audio de esta consulta”, “Eliminar esta nota”, “Eliminar todas las notas locales”. No usar un único “Borrar datos” sin alcance.
3. **Confirmación de resultado.** Éxito solo después de confirmación de backend; fallo conserva estado/diagnóstico en lenguaje humano y una acción concreta.
4. **Deshabilitado y explicado.** Si una capacidad depende de backend, deshabilitar con ayuda textual; no ocultar la diferencia ni simular persistencia.
5. **Exportación visible.** Copiar/guardar crea una frontera: Oira no debe declarar control sobre el destino.
6. **Sin default encubierto.** No seleccionar A/B/C por copy, valor de switch, ejemplo o comportamiento de mock. El valor debe llegar como política/configuración real.

## Secuencias de error

### Recording

- Si falla inicio: “No pudimos iniciar la grabación. La grabación no ha comenzado.” No crear una fila de audio retenido.
- Si falla durante grabación: “La grabación se detuvo. No pudimos confirmar el estado del audio temporal.” Mostrar `DESCONOCIDO` hasta respuesta de backend.
- Si el médico solicita borrar: enviar intención; no reemplazar la fila por “eliminado” antes de confirmación.

### Processing

- Si transcripción falla: conservar únicamente los objetos que el backend confirme. “No pudimos transcribir esta consulta. [estado confirmado de audio/nota]”.
- Si estructuración falla: el transcript puede seguir disponible según backend; no decir que se guarda ni que se elimina sin estado.
- Si cerrar aplicación interrumpe operación: explicar que el resultado de retención es desconocido si no se recibió confirmación.

## Dependencias y criterios para decidir después

| Decisión pendiente | Evidencia mínima antes de elegir A/B/C | Dueño |
| --- | --- | --- |
| Existencia de audio y temporales | Prueba de lifecycle normal, error, cierre brusco y reintento; tabla de objetos/rutas sin datos reales. | Justin |
| Persistencia de notas | Contrato SQLite/archivo, recuperación, borrado por objeto/todo y fallos. | Justin |
| Telemetría/logs | Inventario y prueba de que no contienen texto clínico/audio, o copy que declare lo contrario. | Justin / IA |
| Necesidad clínica/operativa de reabrir audio | Investigación con médicos y asesoría contextual; no asumir “mina de oro”. | Equipo |
| Copy web publicable | Hechos comprobados en release y versión. | Justin + Antonio |
| Elección de default | Matriz completa, pruebas de UX y política de retención firmada por el equipo. | Equipo |

## Caveats

- Esta matriz no declara un periodo de retención, requisito de expediente, cifrado ni cumplimiento normativo.
- “Local” no equivale a “sin riesgo”: el acceso al equipo, los respaldos, portapapeles, archivos exportados y logs pueden alterar la superficie real.
- No se decide si la opción C es aceptable; su mayor complejidad es un hecho de producto, no una prohibición legal.
- I1 sigue bloqueando cualquier afirmación legal y I6 solo puede expresar inferencia como estado; ninguno autoriza copy sobre retención sin confirmación.

## Fuentes

- **[S1] CONFIRMADO — Presidência da República do Brasil.** *Lei nº 13.709/2018 (LGPD), texto compilado*, definición de tratamiento y datos sensibles. https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/L13709compilado.htm (acceso: 22-08-2026).
- **[S2] CONFIRMADO — Argentina.gob.ar.** *Ley 25.326 — Protección de los Datos Personales*, art. 4. https://www.argentina.gob.ar/normativa/nacional/ley-25326-64790/texto (acceso: 22-08-2026).
- **[S3] CONFIRMADO — General Medical Council (Reino Unido).** *Recordings made as part of a patient’s care*, almacenamiento, divulgación y tratamiento de grabaciones como parte del registro. https://www.gmc-uk.org/professional-standards/the-professional-standards/making-and-using-visual-and-audio-recordings-of-patients/recordings-made-as-part-of-a-patients-care-including-investigation-or-treatment-of-a-condition (acceso: 22-08-2026). Patrón profesional, no regla jurídica regional.
