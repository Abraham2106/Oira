# I7 / R10 — Revisión y prevención de aceptación automática

**Estado:** recomendación P1 para `canAccept`  
**Fecha de acceso a fuentes:** 22 de agosto de 2026  
**No es una atestación legal.** “Aceptar” expresa la acción de revisión del médico dentro de NotaLocal; no certifica cumplimiento, exactitud ni una firma normativa.

## Decisión

**Adoptar un paquete de dos patrones: (1) revisión explícita por sección con estado visible y (2) confirmación final en dos pasos.** No imponer lectura forzada del transcript completo, checklist legal ni cinco barreras acumuladas.

La evidencia de documentación asistida converge en que el profesional debe revisar, editar y aprobar la información antes de incorporarla al registro [S1, S2]. La literatura sobre *automation bias* advierte que la sobreconfianza puede reducir la vigilancia y que los digital scribes introducen el riesgo de aceptar documentos sin comprobarlos [S3–S5]. Ningún patrón de interfaz demuestra que una persona realmente leyó o comprendió un texto; la meta P1 es crear una pausa proporcional, exponer incertidumbre/origen y hacer que el acto de aceptar no sea reflejo de que el pipeline terminó.

## Paquete recomendado

### 1. Revisión explícita por sección

Cada sección con contenido, `UNKNOWN`, `NOT_STATED` o ausencia de origen muestra uno de estos estados: **Pendiente de revisión**, **Revisada**, **Sin origen identificado**. El médico puede editar y pulsar “Marcar como revisada”; si edita de nuevo, vuelve a pendiente. No exigir marcar secciones que no existen ni tratar una ausencia legítima como fallo.

Este patrón no asegura lectura. Sí transforma “procesamiento terminado” en una lista pequeña de decisiones clínicas visibles y permite señalar secciones sin evidencia. El transcript permanece accesible por “Ver origen”; no se obliga a recorrer cada segmento.

### 2. Confirmación final en dos pasos

Al pulsar “Aceptar revisión”, si ya se cumplieron las condiciones, abrir un diálogo breve:

> **Revisar antes de aceptar**  
> La nota sigue siendo tu responsabilidad clínica. Puedes volver a editarla o confirmar que terminaste tu revisión.  
> **[Volver a editar] [Confirmar revisión]**

No usar “aprobado por IA”, “firma legal”, “certifico cumplimiento”, ni una casilla preseleccionada. La confirmación no debe aparecer si quedan secciones pendientes: primero debe orientar al médico hacia ellas.

## Evaluación de patrones

| Patrón | Evidencia / razonamiento | Coste de tiempo | Riesgo residual | Accesibilidad | Decisión |
| --- | --- | ---: | --- | --- | --- |
| Checklist de atestaciones legales | Puede producir pausa, pero no demuestra comprensión ni corresponde a una obligación determinada. | Medio | Marcado mecánico; falsa suficiencia jurídica. | Muchos controles pequeños y lenguaje legal aumentan carga. | Rechazar. |
| Exposición forzada de todo el contenido/transcript | Asegura que el scroll ocurrió, no la lectura; penaliza notas largas y lectores de pantalla. | Alto | Scroll automático sin verificación sustantiva. | Mala: foco, lectura lineal extensa y timeouts. | Rechazar. |
| **Estado y marcado por sección** | Hace visibles unidades editables y permite revisar incertidumbre/origen de forma localizada. Coherente con revisión/edición humana [S1, S2]. | Medio | Puede marcarse sin leer. | Botones reales, estado textual, no solo color; conservar orden de tabulación. | **Adoptar.** |
| Puerta por campo sin origen | La ausencia de origen es una señal útil, pero bloquear toda aceptación puede impedir documentar lo que el médico conoce y añade manualmente. | Bajo–medio | Puede llevar a ignorar/forzar evidencia falsa. | Debe anunciarse como estado, no modal repetitivo. | Adaptar: advertir y requerir marcado de revisión, no bloquear por sí sola. |
| **Confirmación final en dos pasos** | Separa “pipeline listo” de “decisión del médico” con una pausa breve. | Bajo | Puede confirmarse mecánicamente. | Diálogo semántico, foco atrapado, Escape, foco devuelto. | **Adoptar.** |
| Retraso temporal o contador | Agrega fricción sin relación con contenido; el tiempo no es revisión. | Bajo | Espera pasiva. | Puede ser problemático con lectores de pantalla y prisa clínica. | Rechazar. |
| Doble clic en el botón | Es un patrón mecánico y fácil de activar por reflejo. | Bajo | No genera comprensión. | Riesgo de interacción accidental y ambigüedad. | Rechazar. |

## Lista para desarrolladores

```ts
canAccept === true solo cuando:
  productState es READY_FOR_REVIEW o EDITING;
  no hay transcripción/estructuración/guardado/errores de pipeline pendientes;
  existe un borrador cargado y el badge “Borrador — requiere revisión médica” sigue visible;
  cada sección renderizada que contiene texto, UNKNOWN, NOT_STATED
    o “Sin origen identificado” tiene reviewStatus === "reviewed";
  no existe una edición sin guardar posterior a su reviewStatus;
  el bridge confirmó que el estado actual del borrador sigue disponible.
```

Al activar `canAccept`, el botón abre el diálogo de confirmación; **no** cambia directamente a `ACCEPTED`. Sólo `Confirmar revisión` dispara la transición. Si una sección cambia después, `canAccept` se vuelve falso y la confirmación debe cerrarse/invalidarse con explicación.

### Reglas complementarias

- No convertir `NOT_STATED` en un bloqueo: el médico puede revisarlo y decidir mantenerlo.
- “Sin origen identificado” tampoco bloquea por sí mismo: es una advertencia fuerte que necesita revisión explícita y edición si procede.
- El producto nunca infiere revisión porque pasó tiempo, porque el médico abrió Review o porque el modelo terminó.
- El texto de la sección y el origen son datos; ningún contenido del transcript puede cambiar `canAccept`, abrir exportación o editar ajustes.
- `ACCEPTED` no equivale a “nota oficial” ni activa envío automático. Exportar sigue siendo una acción separada.

## Prueba de seguridad y usabilidad

Usar fixtures sintéticos para verificar:

1. Una nota con dos secciones no habilita aceptar hasta que ambas se marquen revisadas.
2. Editar una sección revisada la devuelve a pendiente y deshabilita aceptar.
3. Una sección `NOT_STATED` es revisable sin obligar a completar un valor.
4. Una sección sin origen muestra advertencia, permite ver transcript cuando exista y no genera evidencia falsa.
5. El diálogo final puede operarse sólo con teclado, anuncia título, mantiene foco, cierra con Escape y devuelve foco al botón.
6. El lector de pantalla anuncia el cambio de “pendiente” a “revisada” sin leer el transcript completo.
7. Una falla/actualización del bridge antes de confirmar cancela la acción y no cambia a `ACCEPTED`.

Medir además el número de secciones y tasa de retorno a edición en pruebas con médicos. Si el marcado por sección se convierte en marcaje indiscriminado, probar una variante con resumen de cambios/orígenes, no añadir barreras legales.

## Caveats

- El patrón no prueba lectura, comprensión ni exactitud clínica. La responsabilidad clínica permanece en el médico.
- La evidencia de *automation bias* se concentra en sistemas de soporte de decisiones y simulaciones, no en esta pantalla exacta; se usa como justificación de prudencia, no de una métrica de reducción de error.
- I3 fija la jerarquía borrador/fuente; I7 no cambia la decisión de layout.
- I4/IA deben definir qué constituye una sección renderizada y qué actualización invalida revisión.
- Justin debe proporcionar señal fiable de guardado/disponibilidad. Sin ella, el UI debe bloquear por estado técnico, no inventar éxito.

## Fuentes

- **[S1] CONFIRMADO — Centers for Medicare & Medicaid Services (EE. UU.).** *Ensuring Proper Use of Electronic Health Record Features and Capabilities Decision Table*, sección Dictation/Voice to Text. https://www.cms.gov/files/document/ehrdecisiontable062816pdf (acceso: 22-08-2026).
- **[S2] CONFIRMADO — Centers for Medicare & Medicaid Services (EE. UU.).** *FAQ 19061: scribes may document when physician delegates, signs and verifies*. https://www.cms.gov/Regulations-and-Guidance/Legislation/EHRIncentivePrograms/Downloads/General_2018.pdf (acceso: 22-08-2026).
- **[S3] NO VERIFICADO PARA ESTE PATRÓN — Goddard K, Roudsari A, Wyatt JC.** *Automation bias — a hidden issue for clinical decision support system use*. PubMed PMID 21335682. https://pubmed.ncbi.nlm.nih.gov/21335682/ (acceso: 22-08-2026).
- **[S4] NO VERIFICADO PARA ESTE PATRÓN — Lyell D, Coiera E.** *Automation bias and verification complexity: a systematic review*. PubMed PMID 27516495. https://pubmed.ncbi.nlm.nih.gov/27516495/ (acceso: 22-08-2026).
- **[S5] NO VERIFICADO PARA ESTE PATRÓN — Denecke K, et al.** *The digital scribe*. PubMed PMID 31304337. https://pubmed.ncbi.nlm.nih.gov/31304337/ (acceso: 22-08-2026).
