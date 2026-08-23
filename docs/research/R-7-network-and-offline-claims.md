# R-7 — Comportamiento de red y afirmaciones offline

**Estado:** evidencia documental completada; destinos, puertos, tráfico y cierre están **BLOCKED — NEEDS TARGET HARDWARE**.  
**Dependencias:** R-1 (SDK/package), modelos cacheados y R-2 (pipeline de audio).  
**Fuentes consultadas:** 2026-08-22.

## 1. Resumen y decisión

QVAC documenta que la descarga inicial de un modelo necesita acceso al registry. También documenta que, tras una descarga completa y usando la misma cacheDirectory, una carga posterior del mismo modelo puede usar caché sin contactar el registry [QVAC, Download lifecycle](https://docs.qvac.tether.io/models/download-lifecycle/). Esta es una afirmación estrecha sobre loadModel y el registry: no prueba que el pipeline completo de Oira no realice conexiones, que no haya P2P, ni qué puertos/dominios se usen.

**Decisión: DEFER toda alegación pública general de “offline”.** Hasta observar el tráfico en el artefacto empaquetado, solo puede describirse el requisito documental de caché previa; no se afirma cero egress durante inferencia ni que close detenga toda actividad residual.

## 2. Evidencia documental

QVAC describe descargas reanudables y cancelables; downloadAsset/loadModel escriben parciales y la descarga completa puede dejar un modelo disponible para una carga posterior desde caché. El mismo documento aclara que el aprovisionamiento inicial necesita registry accesible. La referencia de API menciona explícitamente descargas P2P/Hyperdrive para downloadAsset, pero no ofrece en esta evidencia una hoja de firewall de destinos o puertos [QVAC, API Summary](https://docs.qvac.tether.io/reference/api/).

Por tanto, hay tres estados distintos:

1. primera descarga: red requerida por documentación;
2. modelo ya preparado: la carga desde esa caché puede evitar el registry según documentación;
3. afirmación sobre la aplicación completa: sin evidencia hasta captura de tráfico.

## 3. Hoja de firewall

| Dato requerido | Resultado |
|---|---|
| Hosts/dominios registry | BLOCKED — NEEDS TARGET HARDWARE / documentación específica no localizada |
| Puertos/protocolos | BLOCKED — NEEDS TARGET HARDWARE |
| Participación P2P efectiva | BLOCKED — NEEDS TARGET HARDWARE |
| DNS/telemetría/actualizaciones de la app | BLOCKED — NEEDS TARGET HARDWARE |
| Egress durante inferencia cacheada | BLOCKED — NEEDS TARGET HARDWARE |
| Tráfico después de close y después de salir | BLOCKED — NEEDS TARGET HARDWARE |

No se inventa una allow-list de hospital.

## 4. Protocolo bloqueado

1. Con stack R-1 y modelos ya cacheados, capturar tráfico de primera descarga, carga y transcripción/inferencia no clínica.
2. Repetir con interfaz de red desactivada tras comprobar la caché; registrar éxito/fallo y errores.
3. Repetir con red activa y capturar DNS/TCP/UDP/HTTPS/P2P para definir destinos reales.
4. Ejecutar close si la firma está confirmada en los tipos instalados; medir tráfico residual y repetir tras salida del proceso.
5. Repetir en paquete y por plataforma de demo.
6. Redactar una hoja de firewall solo a partir de las capturas y versiones registradas.

Todos los pasos están **BLOCKED — NEEDS TARGET HARDWARE**.

## 5. Copy permitido y prohibido

Permitido, solo con referencia a preparación previa:

> “QVAC documenta que un modelo descargado completamente puede cargarse desde la misma caché sin contactar el registry.”

Prohibido hasta laboratorio:

- “Oira nunca usa internet.”
- “La inferencia no genera tráfico.”
- “No hay P2P.”
- “Funciona offline desde el primer inicio.”
- “close elimina toda actividad de red.”
- Cualquier lista de puertos/dominios hospitalarios.

## 6. Decisión

**DEFER.** El copy de producto queda restringido a la caché preparada y debe evitar la palabra “offline” como promesa integral hasta finalizar pruebas de red empaquetadas.

## Bibliografía

1. QVAC by Tether. [Download lifecycle](https://docs.qvac.tether.io/models/download-lifecycle/). Consultado el 2026-08-22.
2. QVAC by Tether. [API Summary](https://docs.qvac.tether.io/reference/api/). Consultado el 2026-08-22.
