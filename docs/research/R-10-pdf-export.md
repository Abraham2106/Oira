# R-10 — Exportación PDF mediante printToPDF

**Estado:** evidencia documental completada; la generación, apariencia y seguridad de una plantilla real están **BLOCKED — NEEDS TARGET HARDWARE**.  
**Propiedad compartida:** decisión conjunta de Justin (Main/IPC) y Antonio (UI/plantilla).  
**Fuentes consultadas:** 2026-08-22.

## 1. Resumen y decisión

Electron documenta que webContents.printToPDF genera un Buffer del PDF de una página. La API tiene opciones de orientación, fondos, tamaño de página, márgenes, encabezado/pie y opciones experimentales para PDF etiquetado y outline; Electron advierte que las opciones experimentales pueden no cumplir plenamente PDF/UA o WCAG [Electron, webContents](https://www.electronjs.org/docs/latest/api/web-contents).

La existencia de la API no prueba que la plantilla de NotaLocal genere páginas correctas, que las fuentes se incluyan, que no haya contenido remoto, que el PDF sea accesible, ni que se escriba de forma segura. Tampoco autoriza a exportar un borrador no aprobado.

**Decisión: DEFER PDF; fuera de P0.** P0 conserva TXT, JSON y portapapeles de una nota aprobada. PDF solo entra después de un spike local con plantilla de Antonio, ventana de impresión aislada y revisión conjunta.

## 2. Alcance de seguridad

El PDF debe derivar de una nota aprobada por el médico, no de bytes generados por un LLM ni de HTML de terceros. La ventana o contenido de impresión carga solo recursos empaquetados, sin Node en renderer, sin CDN/fonts remotas y con política de contenido restrictiva. Electron recomienda aislamiento de contexto, no habilitar integración Node para contenido remoto y validar IPC [Electron, Security](https://www.electronjs.org/docs/latest/tutorial/security).

Main recibe un identificador de nota aprobada, vuelve a cargarla desde almacenamiento propio, genera una representación de impresión local y ofrece al usuario un destino explícito. No hay autoexport, subida cloud ni rutas elegidas por el renderer.

## 3. Opciones documentadas

| Capacidad | Evidencia documental | Estado |
|---|---|---|
| Generar PDF | printToPDF resuelve con Buffer. | API documentada; no ejecutada. |
| Diseño | tamaño, orientación, márgenes, fondo, header/footer. | Requiere plantilla/probabilidad de layout real. |
| Accesibilidad | generateTaggedPDF y outline son experimentales. | No se afirmará PDF/UA/WCAG. |
| Pagos/red | La API no exige nube. | La ausencia de red de nuestra plantilla debe probarse. |
| Privacidad | Depende de contenido, rutas y permisos propios. | No confirmada por la API. |

## 4. Protocolo bloqueado

1. Antonio crea una plantilla local mínima con datos sintéticos, estilo de impresión y fuentes incluidas.
2. Justin crea desde Main una ventana/contenido de impresión aislado y una llamada IPC de mínimo privilegio.
3. Generar PDF en dev y paquete; registrar tamaño, número de páginas, saltos, fuentes, idiomas, márgenes y errores.
4. Verificar que no se carguen URLs remotas, que no haya Node en la superficie de impresión y que la CSP bloquee recursos no permitidos.
5. Probar solo notas aprobadas, cancelación, destino elegido por usuario y fallos de escritura.
6. Antonio y Justin firman la decisión de alcance; solo entonces actualizar el flujo UI.

| Prueba | Resultado |
|---|---|
| Plantilla local con datos sintéticos | BLOCKED — NEEDS TARGET HARDWARE |
| PDF dev | BLOCKED — NEEDS TARGET HARDWARE |
| PDF empaquetado | BLOCKED — NEEDS TARGET HARDWARE |
| Auditoría de recursos/CSP | BLOCKED — NEEDS TARGET HARDWARE |
| Layout, tipografías, páginas | BLOCKED — NEEDS TARGET HARDWARE |
| Revisión conjunta Antonio/Justin | BLOCKED — NEEDS TARGET HARDWARE |

## 5. Afirmaciones prohibidas

No decir que el PDF está implementado, es accesible, está libre de red, es legalmente válido, contiene una firma clínica o protege datos. No exportar automáticamente ni permitir exportar borradores. No cargar HTML o fuentes cloud para resolver diseño.

## 6. Decisión

**DEFER PDF; fuera de P0.** Su única vía de entrada es printToPDF desde un contenido local, aislado y probado, con una decisión conjunta de UI y backend. Hasta entonces, el alcance de export es TXT/JSON/portapapeles para notas aprobadas.

## Bibliografía

1. Electron. [webContents](https://www.electronjs.org/docs/latest/api/web-contents). Consultado el 2026-08-22.
2. Electron. [Security](https://www.electronjs.org/docs/latest/tutorial/security). Consultado el 2026-08-22.
