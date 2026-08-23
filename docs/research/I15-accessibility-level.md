# I15 — Objetivo de accesibilidad

**Estado:** decisión de objetivo interno P2  
**Fecha de acceso a fuentes:** 22 de agosto de 2026

## Decisión

**Adoptar WCAG 2.2 nivel AA como objetivo interno de diseño, implementación y prueba para website y renderer Electron; no afirmar públicamente “conforme”, “certificado” o “accesible” hasta completar una evaluación documentada.**

WCAG 2.2 define que una declaración de conformidad AA requiere todos los criterios A y AA, no una selección conveniente [S1]. Para software no web, WCAG2ICT 2.2 ofrece una guía informativa de aplicación; no es por sí sola una certificación de una app Electron [S2]. Por eso el objetivo es una referencia de ingeniería y QA, no un badge de marketing ni un requisito legal declarado.

## Alcance y postura pública

| Ámbito | Objetivo interno | Postura pública ahora |
| --- | --- | --- |
| Website | WCAG 2.2 AA, evaluado por páginas/rutas y flujos de descarga. | No afirmar conformidad hasta auditoría. |
| Renderer desktop Electron | Aplicar WCAG 2.2 A/AA y WCAG2ICT como guía al contenido/renderizado web. | No afirmar certificación ni accesibilidad total. |
| Captura/permiso de micrófono y diálogo nativo | Pruebas manuales por SO; criterios web no cubren por sí solos el sistema operativo. | Documentar límites si existen. |
| Contenido generado/transcript | Semántica, texto plano, foco y estados; no garantizar que el contenido clínico sea comprensible o exacto. | No usar un claim de calidad clínica. |

**Frase interna recomendada:** “Objetivo de trabajo: WCAG 2.2 AA para website y renderer; evaluar antes de declarar conformidad.”  
**Frases prohibidas hoy:** “WCAG AA certified”, “100% accessible”, “cumple toda la accesibilidad”, “apto para todos los médicos”.

## Reglas P0 ya cubiertas

La guía frontend ya exige contraste, texto base legible, teclado, foco visible, no usar sólo color, indicador de grabación redundante, anuncios de estado, diálogos con foco y reducción de movimiento. Esas reglas deben conservarse y probarse; no son evidencia de AA completo.

## Mapa de criterios A/AA restantes

| Área WCAG 2.2 | Deltas para Oira | Ejemplos de aceptación |
| --- | --- | --- |
| 1.1 Texto alternativo (A) | Iconos de grabar, privacidad, errores y “ver origen” reciben nombre accesible; capturas del website llevan alt útil. | Lectura con nombre y propósito; icono decorativo se oculta correctamente. |
| 1.3 Estructura y relaciones (A/AA) | Encabezados, listas de transcript, labels de campos, tabla de PrivacyStatus y relaciones error-control. | Navegación por encabezados/listas; label anuncia campo y estado. |
| 1.3.4 Orientación (AA) | No bloquear portrait/landscape en website; desktop no depende de una orientación no disponible. | Función disponible en tamaños/rotación pertinentes. |
| 1.3.5 Identificar propósito de entrada (AA) | Si más adelante aparecen campos personales, usar semántica/autocomplete cuando aplique; P0 no recoge formularios de paciente. | No inventar atributos para texto clínico. |
| 1.4.3/1.4.11 Contraste (AA) | Medir tokens para texto y controles, incluidos focus, disabled informativo y recording. | 4.5:1 texto normal, 3:1 texto grande y componentes/indicadores pertinentes. |
| 1.4.4/1.4.10 Resize/Reflow (AA) | Website a 200%/400%; renderer con zoom sin pérdida de acciones, tabs para columnas estrechas. | Review conserva borrador, transcript y acciones sin scroll bidimensional esencial. |
| 1.4.12 Espaciado de texto (AA) | No romper transcript/nota al ajustar altura de línea, letra, palabras/párrafos. | Campos y diálogos siguen operables. |
| 1.4.13 Contenido al hover/focus (AA) | EvidencePopover/tooltip permanece visible, alcanzable con teclado y cerrable con Escape sin perder control. | No depende sólo de hover. |
| 2.1 Teclado (A) | Inicio/detención, revisión, marcar revisada, aceptar, exportar, settings y diálogo. | Flujo IDLE→EXPORTED sólo con teclado; sin trampa. |
| 2.2 Tiempo (A) | No usar temporizador de sesión ni autoaceptación. El timer de grabación es informativo, no una cuota. | Ninguna acción vence por tiempo. |
| 2.3 Convulsiones/físico (A) | Sin parpadeos intensos; recording usa estado estable y `prefers-reduced-motion`. | Auditoría visual de animaciones. |
| 2.4 Navegable/foco (A/AA) | Orden lógico entre borrador/transcript; skip link website; títulos descriptivos; foco no oculto. | Tab y lector de pantalla preservan significado [S3]. |
| 2.5 Input modalities (A/AA) | Targetes grandes, no gestos complejos; alternativa a arrastre si aparece; no depender de puntero. | Botones críticos operables con ratón, teclado y táctil donde aplique. |
| 3.1 Idioma (A/AA) | `lang="es"`; marcar partes EN en documentación/copy si se renderizan. | Lector de pantalla usa pronunciación correcta [S4]. |
| 3.2 Predecible (A/AA) | Foco no inicia grabación, no cambia pantalla inesperadamente; settings no cambian con sólo recibir foco. | Cambio de contexto sólo por acción explícita. |
| 3.3 Ayuda de entrada (A/AA) | Errores dicen qué hacer; confirmación antes de destruir/exportar; no pedir PHI P0. | Error de micrófono asociado y recuperable. |
| 4.1 Compatible (A/AA) | Componentes semánticos primero; ARIA sólo donde haga falta; announcements de estados sin ruido del timer. | axe sin violaciones críticas + prueba con lector de pantalla. |
| 2.4.11 Focus Not Obscured (AA, nuevo 2.2) | Headers/cookies/dialog overlays no cubren elemento con foco. | Todo foco queda al menos parcialmente visible [S5]. |
| 2.5.7 Dragging Movements (AA, nuevo 2.2) | Si se añade reordenamiento/separadores, proveer botón/teclado alternativo. | No es bloqueo actual; requisito antes de introducir drag. |
| 2.5.8 Target Size (Minimum) (AA, nuevo 2.2) | Verificar controles críticos de grabación, aceptar, cerrar, tabs y “Ver origen”. | Objetivo mínimo del criterio o separación suficiente. |
| 3.2.6 Consistent Help (A, nuevo 2.2) | Cuando exista ayuda/contacto, mantener ubicación/orden consistentes. | No aplicable si aún no hay ayuda; probar al añadirla. |
| 3.3.7 Redundant Entry (A, nuevo 2.2) | No pedir reiteradamente la misma información; coherente con I5. | No reintroducir identificador si ya está disponible y es necesario. |
| 3.3.8 Accessible Authentication (AA, nuevo 2.2) | No hay login P0. Evaluar antes de añadir cuenta/activación. | No aplicable actualmente; no marcar “pasado” permanentemente. |

## Prueba y evidencia mínima

1. Automatizada: lint semántico y axe por pantalla/diálogo; no confundir cero fallos con AA.
2. Manual de teclado: flujo completo, orden de foco, Escape y retorno de foco.
3. Manual visual: contraste de tokens, zoom, reflow, foco no oculto, estados no basados sólo en color.
4. Lector de pantalla: cambios de Recording/Processing/errores, secciones, evidencia y aceptación.
5. Prueba de SO: permisos de micrófono, menú/ventana y zoom en plataformas objetivo.
6. Registro de hallazgos: criterio, pantalla, caso, resultado, navegador/SO, severidad, arreglo y revalidación.

## Evidencia sobre médicos y lector de pantalla

**No se halló evidencia primaria suficiente sobre prevalencia o uso de lectores de pantalla específicamente entre médicos ambulatorios hispanohablantes.** No se extrapolan estadísticas de pacientes ni de población general. La ausencia de esa cifra no reduce el deber de probar semántica, teclado, contraste y estados críticos; sólo impide priorizar un ajuste sobre la base de una frecuencia inventada.

## Caveats

- WCAG aplica al contenido/interfaz; no certifica calidad clínica, privacidad, modelo de IA ni disponibilidad de hardware.
- Electron contiene componentes del sistema operativo y permisos nativos: la guía WCAG2ICT es informativa y la prueba por plataforma sigue siendo necesaria.
- AA no equivale a accesible para toda persona en toda situación; por eso no se publica una declaración antes de pruebas formales.
- I13 cubre idioma/locale y no sustituye este mapa.

## Fuentes

- **[S1] CONFIRMADO — W3C.** *How to refer to WCAG 2.2 from other documents* (requisitos de conformidad A/AA). https://www.w3.org/WAI/WCAG22/Understanding/refer-to-wcag (acceso: 22-08-2026).
- **[S2] CONFIRMADO — W3C.** *Guidance on Applying WCAG 2.2 to Non-Web Information and Communications Technologies (WCAG2ICT)*. https://www.w3.org/TR/wcag2ict-22/ (acceso: 22-08-2026).
- **[S3] CONFIRMADO — W3C WAI.** *Understanding Success Criterion 2.4.3: Focus Order*. https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html (acceso: 22-08-2026).
- **[S4] CONFIRMADO — W3C WAI.** *Understanding Success Criterion 3.1.1: Language of Page*. https://www.w3.org/WAI/WCAG22/Understanding/language-of-page.html (acceso: 22-08-2026).
- **[S5] CONFIRMADO — W3C WAI.** *What’s New in WCAG 2.2* (Focus Not Obscured). https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/ (acceso: 22-08-2026).
- **[S6] CONFIRMADO — W3C.** *Web Content Accessibility Guidelines (WCAG) 2.2*. https://www.w3.org/TR/WCAG22/ (acceso: 22-08-2026).
