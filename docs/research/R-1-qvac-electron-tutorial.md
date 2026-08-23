# R-1 — Tutorial oficial de QVAC con Electron y empaquetado

**Estado:** investigación documental completada; toda prueba empírica está **BLOCKED — NEEDS TARGET HARDWARE**.  
**Fuentes consultadas:** 2026-08-22.  
**Alcance:** Oira, aplicación Electron local de documentación clínica. Este informe no prueba la compatibilidad, el rendimiento ni el empaquetado en una máquina concreta.

## 1. Resumen ejecutivo

QVAC publica un tutorial vigente para una app de escritorio basada en Electron, React, TypeScript, electron-vite y QVAC. Para reproducirlo literalmente pide Node.js 22.17 o posterior, npm 10.9 o posterior y Linux/macOS; Windows requiere adaptar órdenes de Bash. El tutorial usa QVAC desde Main y comunica el renderer por preload/IPC con aislamiento de contexto y sin integración directa de Node [QVAC, Build an Electron app](https://docs.qvac.tether.io/tutorials/electron/).

También hay una ruta oficial de empaquetado mediante Electron Forge y el plugin de QVAC. La documentación indica que el plugin fuerza asar desactivado y que los builds universales de macOS están bloqueados: arm64 y x64 deben construirse por separado. Es evidencia de un camino de integración, no de que el conjunto instale, cargue un modelo o genere un artefacto funcional en los equipos de Oira.

La decisión documental es **DEFER**. No se fija ningún pin y no se emite GO/GO WITH WORKAROUNDS/NO-GO hasta ejecutar el tutorial, cargar un modelo y empaquetar en cada plataforma objetivo. Esta investigación bloquea las decisiones finales de R-2, R-3 y R-4.

## 2. Regla de evidencia

Se usaron fuentes primarias de QVAC y Electron. Cada enunciado se trata como:

- **Documentado:** declarado por el proveedor.
- **Pendiente de validación:** solo demostrable mediante instalación y ejecución local.
- **No afirmable:** no puede derivarse de la documentación ni se simulará.

En particular, no se inventan firmas del SDK, errores, APIs, versiones transitivas, cifras de memoria ni resultados de package.

## 3. Hallazgos documentales

### 3.1 Tutorial, runtime y scaffold

El tutorial identifica Electron como runtime, React como UI y QVAC para inferencia local. Indica crear el proyecto con el template React/TypeScript de electron-vite, rechazar los prompts de updater y mirror, instalar dependencias y configurar el script de desarrollo con la opción no-sandbox. QVAC describe ese flag como necesario en Linux cuando no está configurado el helper SUID [QVAC, Build an Electron app](https://docs.qvac.tether.io/tutorials/electron/).

**Implicación:** la primera reproducción debe ser literal. No se añadirán SQLite, módulos nativos adicionales, APIs de Oira ni una abstracción nueva antes de que el scaffold corra y empaquete.

**Pendiente:** la versión concreta instalada por el comando de scaffold, los paquetes transitivos, la versión de Electron y el comportamiento de no-sandbox en cada host. El mínimo del tutorial no es un pin.

### 3.2 Aislamiento del renderer

El ejemplo de QVAC mantiene las operaciones de modelo en Main y expone un puente de preload. Electron recomienda no habilitar Node en contenido remoto, habilitar aislamiento de contexto y validar el remitente de los mensajes IPC [Electron, Security](https://www.electronjs.org/docs/latest/tutorial/security).

**Decisión arquitectónica provisional:** Oira conserva su regla interna: el único import de QVAC vivirá bajo src/main/qvac y el renderer accederá solo a operaciones permitidas de window.oira. La regla es nuestra arquitectura; no debe presentarse como una API adicional de QVAC.

**Pendiente:** confirmar que el renderer puede seguir sandboxed con el conjunto real de dependencias y que no-sandbox es realmente necesario para cada Linux de destino.

### 3.3 Sistemas y requisitos

QVAC documenta macOS 14 o posterior arm64 con Metal; Linux Ubuntu 22 o posterior en arm64/x64, con Vulkan 1.4 o posterior para GPU y fallback a CPU cuando no esté disponible; y Windows 10 o posterior x64, donde Vulkan 1.4 o posterior se requiere incluso para inferencia solo CPU [QVAC, System requirements](https://docs.qvac.tether.io/system-requirements/). Asimismo lista los hosts de CLI darwin arm64/x64, linux arm64/x64 y win32 x64.

La misma página permite comprobar un subconjunto mediante qvac doctor y su salida JSON. Declara al menos 2 GB de RAM total, recomienda 4 GB y advierte que bajo 4 GB la mayoría de LLM no cargará. No se convierte esa cifra en un presupuesto de Oira: el modelo, los workers y la coexistencia con STT pertenecen al laboratorio R-4.

**Pendiente:** SO real, CPU, RAM, disco, driver/GPU, Vulkan/Metal, salida de qvac doctor y compatibilidad con el modelo seleccionado.

### 3.4 Descarga, caché y primer arranque

QVAC documenta que downloadAsset y loadModel reanudan descargas, mantienen parciales y ofrecen un identificador de solicitud para cancelación. Tras una descarga completa, una carga posterior desde la misma cacheDirectory puede usar la caché sin contactar el registry; la descarga inicial sí requiere acceso al registry [QVAC, Download lifecycle](https://docs.qvac.tether.io/models/download-lifecycle/).

**Implicación:** la primera ejecución debe tener progreso, cancelación/reintento y una explicación de la descarga. No se puede usar este texto para prometer ausencia total de red: R-7 debe medirlo.

### 3.5 Empaquetado

La guía recomienda Electron Forge y el plugin de QVAC. Describe que package compila los procesos, genera el worker, verifica prebuilds, empaqueta y poda addons no usados. Establece tres limitaciones:

1. El plugin obliga a desactivar asar porque el worker Bare necesita rutas reales a los addons.
2. Los builds universales de macOS no se admiten por prebuilds específicos de arquitectura.
3. El empaquetado cruzado depende de los prebuilds disponibles para la plataforma/arquitectura solicitada.

Estas son restricciones documentadas [QVAC, Build an Electron app](https://docs.qvac.tether.io/tutorials/electron/). Asar desactivado no cifra ni protege datos de usuario, y no debe describirse como una propiedad de seguridad.

**Pendiente:** plugin resuelto en el lockfile, prebuilds detectados, resultado de verifyBundle, estructura del artefacto, arranque y coexistencia futura con SQLite.

## 4. Matriz de hardware

| Objetivo | SO/versión | CPU/arch | GPU/runtime | Doctor | Dev + modelo | Package |
|---|---|---|---|---|---|---|
| macOS arm64 | BLOCKED — NEEDS TARGET HARDWARE | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| macOS x64 | BLOCKED — NEEDS TARGET HARDWARE | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| Linux arm64/x64 | BLOCKED — NEEDS TARGET HARDWARE | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| Windows x64 | BLOCKED — NEEDS TARGET HARDWARE | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED |

## 5. Protocolo de laboratorio

1. Registrar SO, CPU/arquitectura, RAM, disco, GPU/driver, Node, npm y qvac doctor en JSON.
2. Crear exactamente el scaffold oficial, sin SQLite ni addons extra.
3. Instalar, conservar package.json y lockfile, y listar versiones efectivas de QVAC, Electron, electron-vite y Forge.
4. Ejecutar desarrollo, descargar/cargar el modelo tutorial y completar una inferencia no clínica.
5. Configurar Forge como el tutorial, ejecutar package y guardar consola, artefactos, configuración asar y errores completos.
6. Lanzar el artefacto empaquetado y repetir por plataforma/arquitectura que se pretenda soportar.

**Resultado de los seis pasos:** BLOCKED — NEEDS TARGET HARDWARE. Ningún comando se declara ejecutado.

## 6. Pins

| Componente | Pin | Estado |
|---|---|---|
| Node.js | No fijado; el tutorial exige 22.17 o posterior | BLOCKED |
| npm | No fijado; el tutorial exige 10.9 o posterior | BLOCKED |
| Electron | No fijado; debe salir del lockfile sobreviviente | BLOCKED |
| SDK de QVAC | No fijado; debe salir del lockfile sobreviviente | BLOCKED |
| electron-vite | No fijado | BLOCKED |
| Forge y plugin QVAC | No fijado | BLOCKED |

No se debe convertir una etiqueta latest en una versión reproducible. El pin aceptable es el conjunto exacto del lockfile que haya superado desarrollo, carga de modelo y package.

## 7. Pendientes

- TODO: VERIFY FROM OFFICIAL QVAC DOCUMENTATION / installed types: firmas y tipos del SDK efectivamente instalado.
- TODO: VERIFY FROM TARGET HARDWARE: necesidad de no-sandbox y su alcance.
- TODO: VERIFY FROM TARGET HARDWARE: descarga, carga, inferencia y errores reales.
- TODO: VERIFY FROM TARGET HARDWARE: prebuilds, asar efectivo, rutas del worker y lanzamiento del paquete.
- TODO: VERIFY FROM TARGET HARDWARE: compatibilidad por arquitectura y coexistencia futura con SQLite.

## 8. Afirmaciones prohibidas

No afirmar que QVAC funciona en todos los equipos, que Oira se probó en los tres sistemas, que se fijaron versiones compatibles, que funciona offline desde el primer inicio, ni que asar desactivado protege datos. Tampoco llamar seguro, firmado o listo para producción a un artefacto no ejecutado.

## 9. Decisión

**DEFER — laboratorio obligatorio.** Existe un camino oficial con límites de empaquetado conocidos, pero no hay evidencia empírica de viabilidad de Oira en su hardware. No se inicia una decisión final de R-2/R-3/R-4 hasta registrar una corrida exitosa o un fallo reproducible con pins exactos.

## Bibliografía

1. QVAC by Tether. [Build an Electron app](https://docs.qvac.tether.io/tutorials/electron/). Consultado el 2026-08-22.
2. QVAC by Tether. [System requirements](https://docs.qvac.tether.io/system-requirements/). Consultado el 2026-08-22.
3. QVAC by Tether. [Download lifecycle](https://docs.qvac.tether.io/models/download-lifecycle/). Consultado el 2026-08-22.
4. Electron. [Security](https://www.electronjs.org/docs/latest/tutorial/security). Consultado el 2026-08-22.
