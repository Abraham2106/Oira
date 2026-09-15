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
SHA-256: E50E37C794500CD60B3CA39659C4911C667EB39885A49E6C365CF1993B18AFDF
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

## Cómo repetir la prueba

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
