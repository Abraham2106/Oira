# R-15 — Prueba de empaquetado Electron + QVAC basada en Warden

Fecha: 2026-09-15

Repositorio revisado: [Wardenlabs/warden](https://github.com/Wardenlabs/warden)

Commit revisado: `52bbecac4ed7c3911acf98499fb789ae9060894e`

## Hallazgos reproducibles de Warden

Warden genera sus ejecutables con Electron Forge:

```json
"app:make": "pnpm run build && electron-forge make"
```

Su `forge.config.cjs`:

- usa `@qvac/sdk/electron-forge`;
- fuerza la inclusión de `qvac/`, `dist/`, `desktop/` y `node_modules/`;
- configura `authors` para Squirrel;
- genera `Warden-Setup.exe`;
- corrige el worker QVAC en `packageAfterCopy`;
- evita que el worker Bare quede dentro de `asar`;
- valida el worker con un smoke test de la aplicación empaquetada.

El primer arranque no mete los modelos dentro del instalador. `desktop/first-run.ts`
los descarga al directorio de datos del usuario con HTTPS, `Range`, reanudación y
reintentos. Después inicia el gateway Electron y configura `QVAC_WORKER_PATH`.

La variable `ELECTRON_RUN_AS_NODE=1` se establece dentro del gateway, porque ese
proceso se ejecuta como `utilityProcess`. No se establece en el proceso principal
antes de crear el gateway.

## Evidencia de Oira antes de este cambio

El artefacto fue creado con:

```powershell
pnpm make:desktop
```

Artefacto:

```text
apps/desktop/out/make/squirrel.windows/x64/Oira-Setup-x64.exe
```

SHA-256 observado:

```text
1F08C59B57252B9A7704E7956770F481199E9C9613F8FCB8D60B4B3B4DAE10AB
```

El `.nupkg` contiene `Oira.exe`, Main, preload, renderer y `qvac/worker.entry.mjs`.
El `.nuspec` contiene `authors`, heredado del campo `author` de `package.json`.

La instalación sí escribió:

```text
C:\Users\solan\AppData\Local\Oira\Oira.exe
C:\Users\solan\AppData\Local\Oira\Update.exe
C:\Users\solan\AppData\Local\Oira\app-0.0.3\Oira.exe
```

Squirrel no instala en `Program Files` y no muestra un wizard tradicional.
El log de Squirrel también registró:

```text
Couldn't run Squirrel hook ... OperationCanceledException
```

La causa era que Oira arrancaba normalmente durante `--squirrel-install` y no
terminaba el hook.

## Cambio aplicado en Oira

`apps/desktop/src/main/index.ts` ahora detecta los argumentos `--squirrel-*` en
Windows y termina inmediatamente. Así Squirrel puede finalizar el hook y crear
el acceso directo sin esperar a que arranque la aplicación clínica.

`apps/desktop/forge.config.cjs` ahora declara `authors` explícitamente para que
el contrato de Squirrel no dependa de la transformación del `package.json`.

El instalador regenerado después del cambio produjo:

```text
SHA-256: E4842E044D4B23555092D2D907A4BC4AE4E7F40AAF7F3EC98815665412D72407
Authenticode: NotSigned
```

La prueba local con `Oira-Setup-x64.exe --silent` terminó con código `0`, creó
el acceso directo `Desktop\Oira.lnk` y el log terminó en `Finished Squirrel
Updater` sin repetir `Couldn't run Squirrel hook`. La instalación quedó en
`%LOCALAPPDATA%\Oira\app-0.0.3\Oira.exe`.

La prueba del candidato final también confirmó una página renderer real:

```text
title: Oira
url: file:///.../resources/app/dist/renderer/index.html
```

`ModelSetupScreen` ya está conectada después de `StartupScreen`. Main expone
`getSetupStatus`, `provisionModels` y progreso por IPC. Los artefactos se
descargan desde dos URLs HTTPS fijadas y se verifican con tamaño y SHA-256 antes
de renombrarse al archivo final. QVAC recibe las rutas locales del caché.

La firma Authenticode, la aprobación legal de redistribución y los umbrales
publicables de hardware siguen bloqueados: el candidato es unsigned y esos
hechos no se declaran como resueltos.

También se corrigió el cierre de ventana del Main: el identificador de
`webContents` se captura antes de `BrowserWindow` se destruya, evitando el
diálogo `Object has been destroyed` al cerrar la aplicación.

## Cómo repetir la prueba

### Alcance de la corrección de preparación de modelos

La verificación SHA-256 consume el archivo por chunks sin acumular una salida
de stream sin lector. Una descarga parcial ya completa se verifica y promueve
antes de pedir otro rango HTTP. La prueba sintética usa 2 MiB, por encima del
buffer del stream, e incluye alteración del contenido y recuperación del parcial.

La preparación bloquea plataformas no Windows y espacio libre conocido menor
que el tamaño total de modelos pendientes. La reserva es conservadora: no
descuenta parciales ya descargados. RAM, conectividad y firma permanecen como
desconocidas cuando no existe validación; conocer la RAM libre no certifica
aptitud para inferencia. El bloqueo también se aplica al iniciar la preparación
desde Main. No se cambian módulos, contratos IPC ni relaciones del atlas.

Estas pruebas sintéticas no acreditan una descarga real de ambos modelos ni
inferencia en el instalador. Los hashes de instalador anteriores corresponden
a los candidatos históricos; una compilación con esta corrección requiere
nueva evidencia. Firma, autorización de redistribución y mínimos de hardware
siguen pendientes de evidencia externa.

```powershell
pnpm typecheck
pnpm test
pnpm lint:desktop
pnpm atlas:check
pnpm --filter oira-desktop build
pnpm make:desktop

$setup = "apps/desktop/out/make/squirrel.windows/x64/Oira-Setup-x64.exe"
Get-FileHash $setup -Algorithm SHA256
Get-AuthenticodeSignature $setup
```

Para confirmar la instalación por usuario:

```powershell
Get-Item "$env:LOCALAPPDATA\Oira\Oira.exe"
Get-Item "$env:LOCALAPPDATA\Oira\app-0.0.3\Oira.exe"
Get-Content "$env:LOCALAPPDATA\SquirrelTemp\Squirrel-Install.log"
```

Estado esperado mientras no exista certificado:

```text
Authenticode: NotSigned
```

`NotSigned` no significa que el paquete esté incompleto; sí significa que
Windows puede mostrar SmartScreen y que el artefacto no está listo para release.

## Diagnóstico de «Preparar grabación» en instalación Windows — 2026-09-15

Se compararon dos ejecuciones de la versión 0.1.0 mediante
`scripts/qvac-packaged-gpu-smoke.mjs`, que invoca el IPC real de warm-up sin
capturar audio ni descargar pesos:

- El ejecutable bajo `out/Oira-win32-x64` cargó Whisper (`warmed: true`).
- La copia instalada bajo `%LOCALAPPDATA%/Oira/app-0.1.0` falló con
  `Could not load the Bare runtime binary for win32-x64`.
- `bare.exe` sí existía. Un `require` desde la instalación reveló la causa
  inmediata: `Cannot find module 'require-asset'`.
- Tras incluir esa dependencia, el worker falló con
  `Cannot find module 'bare-os'` al importar el núcleo del SDK.

La causa común fue el empaquetado incompleto del árbol pnpm. El ejecutable en
el repositorio resolvía enlaces hacia `.pnpm`; la instalación contenía paquetes
directos sin sus dependencias transitivas. La prueba dentro del repositorio
daba un falso positivo. Forge documenta que su recolección de dependencias no
resuelve correctamente árboles basados en symlinks y recomienda un árbol
hoisted: <https://www.electronforge.io/cli>.

Los errores anteriores de asignación a `child_process.spawn` constan en el
registro local, pero el gateway actual ya no ejecuta ese parche. Las rutas
explícitas de modelos y la caché común también estaban implementadas antes de
esta investigación; no resolvían las dependencias ausentes del instalador.

### Corrección y guardia de empaquetado

`package-production-dependencies.cjs` ejecuta el deploy moderno de pnpm 10
con un lockfile derivado y congelado, `--prod`, `--ignore-scripts` y
`node-linker=hoisted` únicamente en staging temporal. No modifica el modo de
instalación del workspace. No usa el deploy legacy, que con hoisting vuelve a
resolver versiones sin respetar el lockfile en pnpm 10.33.3.

`verify-packaged-runtime.cjs` rechaza symlinks, comprueba que el binario Bare se
resuelve dentro del artefacto y carga en Bare el núcleo del SDK y ambos plugins.
La guardia se ejecuta fuera del repositorio antes de entregar `node_modules`
a Forge. No inicializa la exclusión mutua global del worker ni carga modelos.
Con el árbol hoisted, se habilita el pruning estándar de Forge y el hook
`afterPrune` de QVAC elimina prebuilds de otras plataformas/arquitecturas.
El campo `files` limita el deploy a `dist` y `qvac`, evitando copiar builds
anteriores. El atlas refleja el nuevo paso de distribución; no cambia el IPC
ni la arquitectura de inferencia.

### Resultado de validación local

- Se reparó el árbol de dependencias de la instalación existente sin modificar
  los modelos, notas ni ajustes del usuario. El mismo smoke sobre
  `%LOCALAPPDATA%/Oira/app-0.1.0/Oira.exe` pasó: respuesta IPC
  `{"ok":true,"data":{"warmed":true}}` y `PACKAGED_SMOKE_PASS`.
- Los SHA-256 de ambos archivos en `model-cache` coincidieron con el manifiesto:
  Whisper `1fc70f774d38eb169993ac391eea357ef47c88757ef72ee5943879b7e8e2bc69`,
  Qwen `f6f851777709861056efcdad3af01da38b31223a3ba26e61a4f8bf3a2195813a`.
- `pnpm test`: 80 archivos, 393 pruebas aprobadas. Typecheck, lint y
  `atlas:check` aprobados. `test:packaging` aprobó el paquete reconstruido.

Esta validación demuestra preparación de Whisper en este equipo y carga de
los módulos nativos de ambos plugins. No constituye una prueba de transcripción
con audio, generación clínica con Qwen ni compatibilidad con todo hardware.
