# I13 — Idiomas e i18n

**Estado:** decisión P2 de arquitectura y copy público  
**Fecha de acceso a fuentes:** 22 de agosto de 2026

## Decisión

**No incorporar un framework de i18n en P2 todavía.** Mantener español como idioma único de interfaz y website, pero preparar el código con copy centralizado y declaraciones de idioma correctas. Reabrir la decisión al primer requisito real de una segunda interfaz o contenido mantenido en más de un idioma.

Esto no decide ni promete idiomas de STT. El idioma de interfaz, el idioma hablado, el idioma de exportación y el idioma del website son dimensiones distintas. W3C recomienda declarar el idioma principal de la página para que tecnologías de asistencia y agentes de usuario procesen correctamente el contenido [S1, S2]. Esa obligación técnica no demuestra soporte de reconocimiento de voz para ningún idioma.

## Las cuatro dimensiones

| Dimensión | Estado P0/P2 | Fuente de verdad | Copy permitido |
| --- | --- | --- | --- |
| **Idioma de interfaz desktop** | Español. | `uiLocale = "es"` fijo. | “La interfaz está disponible en español.” |
| **Idioma del website** | Español. | Contenido de rutas públicas. | “El sitio está disponible en español.” |
| **Idioma hablado de la consulta** | **DESCONOCIDO / no configurado públicamente.** | IA + modelo/capacidades verificadas. | No afirmar idiomas de transcripción hasta validación. |
| **Idioma de exportación** | Español si el borrador está en español; no es traducción. | Contenido revisado por médico. | “La exportación conserva el contenido de la nota.” No decir “traduce” o “adapta idiomas”. |

## Reglas P0

1. Establecer `lang="es"` en website y renderer HTML; marcar con `lang="en"` las frases inglesas de documentación/demos cuando se rendericen.
2. Centralizar copy de website en `content/` y copy de app en módulos por pantalla/estado; no dejar cadenas clínicas dispersas en componentes.
3. Usar formato de fecha/hora acorde con español pero no convertir automáticamente contenido clínico.
4. No mostrar selector de idioma, bandera, lista de idiomas hablados ni “soporte multilingüe”.
5. No traducir transcript, borrador, exportación ni campos clínicos mediante la UI. La traducción sería una función clínica/documental nueva, no i18n de interfaz.
6. Mantener `NOT_STATED`, `UNKNOWN` y estados de privacidad como tokens internos; sus etiquetas se localizan en un único lugar.

## Disparadores para adoptar i18n

| Disparador verificable | Acción |
| --- | --- |
| Se aprueba una segunda interfaz completa (no sólo tres frases de marketing). | Adoptar catálogo de mensajes con IDs estables, fallback y pruebas de cobertura. |
| Website y desktop divergen en textos/ciclos de traducción. | Compartir catálogo o pipeline editorial versionado; no copiar/pegar strings. |
| Se necesitan formatos regionales de fecha/número/teclado. | Añadir locale explícito y pruebas por locale. |
| Se ofrece exportación en otra lengua o traducción clínica. | Abrir investigación separada de IA/calidad/consentimiento; no resolverla con biblioteca i18n. |
| Se admite idioma hablado configurable por modelo. | IA debe publicar matriz de modelo-versión-idioma y evaluación; UI presenta sólo capacidades confirmadas. |
| Se realizan pruebas con médicos no hispanohablantes que no pueden operar la interfaz. | Priorizar segundo idioma con alcance y mantenimiento definidos. |

## Propuesta de estructura sin framework

```text
packages/types/
  locale.ts                 # UiLocale = "es" por ahora; no afirma idioma STT
apps/desktop/src/copy/
  es.ts                     # etiquetas UI y estados
apps/website/src/content/
  ...                       # copy editorial ES
```

No crear carpetas de 15 locales ni un selector vacío. La abstracción mínima evita que una futura traducción obligue a buscar cadenas clínicas por el renderer, sin fingir que el producto ya es internacionalizado.

## Afirmaciones públicas

| Superficie | Permitida hoy | No permitida hoy |
| --- | --- | --- |
| Website / FAQ | “La interfaz de Oira está disponible en español.” | “Oira transcribe español”, “funciona en varios idiomas”, “traduce la consulta”. |
| Download | “El texto de la aplicación se presenta en español.” | “Compatible con cualquier idioma.” |
| Desktop | “Idioma de interfaz: Español.” | Selector de idiomas que no modifica toda la interfaz. |
| Export | “Revisa el contenido antes de exportar.” | “El idioma de la exportación coincide siempre con el idioma hablado.” |

## Caveats

- El producto puede tener UI española aunque el modelo no tenga soporte comprobado de STT español; no son el mismo hecho.
- Las fuentes W3C son estándares de accesibilidad/web. Para Electron aplican como práctica de renderer; no certifican toda la app.
- La ausencia de estadísticas sobre médicos usuarios de lector de pantalla o de otros idiomas no justifica omitir lenguaje semántico ni imponer una nueva localización.
- I15 cubre conformidad de accesibilidad; I13 sólo cubre separación de idiomas y disparadores de i18n.

## Fuentes

- **[S1] CONFIRMADO — W3C WAI.** *Understanding Success Criterion 3.1.1: Language of Page*. https://www.w3.org/WAI/WCAG22/Understanding/language-of-page.html (acceso: 22-08-2026).
- **[S2] CONFIRMADO — W3C Internationalization.** *Declaring language in HTML*. https://www.w3.org/International/questions/qa-html-language-declarations (acceso: 22-08-2026).
- **[S3] CONFIRMADO — W3C WAI.** *Web Content Accessibility Guidelines 2.2*, criterios 3.1.1 y 3.1.2. https://www.w3.org/TR/WCAG22/ (acceso: 22-08-2026).
