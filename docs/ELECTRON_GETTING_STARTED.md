# Electron en NotaLocal — de cero (para Justin)

> Para quien **no conoce Electron**. Lee §0–§3 antes de tocar código.
> Después: arrancar la app, entender `config/`, y seguir el plan agile I01→I12.
>
> No sustituye la [arquitectura backend](BACKEND_DESKTOP_ARCHITECTURE_GUIDE.md).

---

## 0. Electron en lenguaje llano

### ¿Qué es?

**Electron** es un framework para hacer **apps de escritorio** (como VS Code o Slack) usando:

- **Chromium** → pinta la interfaz (HTML/CSS/React), igual que un navegador.
- **Node.js** → puede leer disco, abrir bases de datos, usar APIs del sistema.

En NotaLocal eso importa porque **todo el “backend” vive en el PC del médico**. No hay servidor en la nube para el MVP.

### Analogía rápida

Imagina un restaurante:

| Pieza Electron | Analogía | En NotaLocal |
| --- | --- | --- |
| **Renderer** | Sala / carta que ve el cliente | Pantallas React (Antonio) |
| **Main** | Cocina + almacén | Backend local: archivos, SQLite, lógica (tú) |
| **Preload** | Ventanilla del camarero | Solo pasa pedidos permitidos; no deja entrar a la cocina |
| **IPC** | El ticket del pedido | Mensajes tipados entre UI y Main |

La UI **nunca** debería abrir la base de datos ni llamar a QVAC directamente. Pide algo a Main a través del preload.

### Las tres palabras que vas a oír siempre

1. **Main** — proceso Node. Arranca la app, crea ventanas, tiene poder de sistema.
2. **Renderer** — “pestaña” de Chromium con React. Solo UI.
3. **Preload** — script que corre **antes** de la página y expone una API mínima segura (`window.notalocal`).

**IPC** = *Inter-Process Communication*: cómo Main y Renderer se hablan (`invoke` / `handle`, eventos).

### Por qué hay “aislamiento”

En código verás:

```ts
contextIsolation: true
nodeIntegration: false
```

Significa: la página React **no** tiene `require('fs')` ni acceso libre a Node. Si un bug o contenido raro llegara al renderer, no puede leer el disco a su antojo. Solo lo que el preload exponga a propósito.

---

## 1. Quién hace qué en NotaLocal

| Proceso | Carpeta | Quién | Qué hace |
| --- | --- | --- | --- |
| **Main** | `apps/desktop/src/main/` | **Tú** | Ventana, IPC, SQLite, audio temp, servicios, adapters |
| **Preload** | `apps/desktop/src/preload/` | **Tú** | Lista blanca de métodos hacia la UI |
| **Renderer** | `apps/desktop/src/renderer/` | Antonio | React. Sin Node, sin `@qvac/sdk`, sin SQL |

Hoy el prototipo usa un **mock dentro del renderer** para demos. Tu trabajo (I03–I04) es que la UI pase a `window.notalocal.*` real vía preload + IPC.

---

## 2. Qué ya está hecho (no crees otro proyecto)

El monorepo **ya tiene** Electron + React + TypeScript en `apps/desktop/`.

| Pieza | Estado |
| --- | --- |
| `electron-vite` + `pnpm dev:desktop` | Listo |
| `src/main/index.ts` | Abre la ventana con aislamiento seguro |
| `src/main/config/` | Rutas, entorno, settings con Zod |
| `src/preload/index.ts` | Stub mínimo (aún no es el contrato final) |
| UI + flujo mock | Antonio — no lo reescribas |

**No ejecutes** `npm create @quick-start/electron…` aquí: generarías un segundo proyecto. El [tutorial de QVAC](https://docs.qvac.tether.io/tutorials/electron/) es **referencia**, no el arranque de este repo.

---

## 3. Primer día: arrancar y mirar

### Requisitos

- Node `>= 22.17` y npm `>= 10.9`
- pnpm 10 (ver `packageManager` en el `package.json` raíz)

### Comandos

```bash
pnpm install
pnpm dev:desktop
```

Debería abrirse una ventana **NotaLocal**. Eso ya es Electron funcionando.

### ¿Qué mirar en la terminal?

- Logs del proceso **Main** (Node) salen en la terminal donde corriste el comando.
- Logs del **Renderer** (React) salen en las DevTools de la ventana (clic derecho → Inspect, o el atajo de Chromium).

Si en Linux la app no abre por el sandbox de Chromium, el script `dev` puede ser:

```bash
electron-vite dev -- --no-sandbox
```

Solo en Linux cuando haga falta (documentado por QVAC). No lo copies en macOS “por si acaso”.

### Criterio “Electron corre” (I01)

1. Se abre la ventana.
2. No hay `@qvac/sdk` en dependencias ni imports del Main.
3. Entiendes que Main ≠ la pantalla React.

---

## 4. Recorrido del código que ya tienes (sin miedo)

### 4.1 Main — `apps/desktop/src/main/index.ts`

Flujo real al arrancar:

1. `app.whenReady()` — Electron te avisa: “ya puedo crear ventanas”.
2. `loadAppConfig(...)` — resuelve carpetas del usuario (DB, temp, settings).
3. `createWindow()` — crea un `BrowserWindow` (la ventana de escritorio).
4. Carga la UI: en dev una URL de Vite; en build un `index.html` empaquetado.
5. `webPreferences.preload` — apunta al script puente.
6. `contextIsolation: true` + `nodeIntegration: false` — la UI no tiene Node libre.

**Tu rol:** ampliar este proceso (handlers IPC, servicios), no “aprender a pintar botones”.

### 4.2 Preload — `apps/desktop/src/preload/index.ts`

Hoy solo expone un stub:

```ts
contextBridge.exposeInMainWorld("notalocalPrototype", {
  usesMockBridge: true,
})
```

Eso pone un objeto en `window` del renderer. Más adelante (I04) será algo como:

```ts
contextBridge.exposeInMainWorld("notalocal", {
  startEncounter: (...),
  stopEncounter: (...),
  generateNote: (...),
  saveNote: (...),
})
```

Cada método hará `ipcRenderer.invoke('canal-fijo', datos)` → Main responde. **Sin** exponer `ipcRenderer` entero.

### 4.3 Renderer — `apps/desktop/src/renderer/`

React. Antonio. Tú no rediseñas pantallas; defines el **contrato** que la UI llamará.

---

## 5. Configuración: qué es y cómo la gestionas

Vive en `apps/desktop/src/main/config/`. Se carga al arrancar desde Main:

```ts
loadAppConfig({
  userData: app.getPath("userData"), // carpeta de datos de la app en el SO
  temp: app.getPath("temp"),
  isPackaged: app.isPackaged,        // ¿app instalada o modo dev?
  nodeEnv: process.env.NODE_ENV,
})
```

| Archivo | Para qué |
| --- | --- |
| `env.ts` | ¿Estamos en dev? ¿Se pueden descargar modelos sin preguntar? |
| `paths.ts` | **Una** fuente de rutas: SQLite, caché de modelos, audio temp, logs, settings |
| `settings.schema.ts` | Forma válida de los ajustes (Zod) + defaults |
| `settings.service.ts` | Leer/guardar `settings.json` de forma segura |

**Reglas simples**

1. ¿Nueva carpeta en disco? → `paths.ts`, no `app.getPath` suelto por el código.
2. ¿Nuevo ajuste de usuario? → schema Zod + default + `load`/`save`.
3. ¿Un servicio necesita rutas? → le pasas `AppConfig` (inyección), no relee el disco a lo loco.

Hoy, si la config falla, el prototipo **igual abre** la ventana (catch vacío). Más adelante eso debe fallar de forma visible.

---

## 6. Cómo se “gestiona” Electron día a día

No hay un panel de admin. “Gestionar” = **ser dueño del proceso Main**:

1. Arrancar con `pnpm dev:desktop`.
2. Añadir lógica en carpetas de dominio bajo `src/main/` (encounters, storage, …).
3. Conectar UI ↔ Main solo por preload + IPC validados con Zod.
4. Probar con `pnpm test` / `pnpm typecheck`.
5. **No** poner Firebase, Express “por costumbre”, ni telemetría con datos clínicos.

Orden de trabajo (no saltes a empaquetar ni a QVAC):

| Paso | Qué | Doc |
| --- | --- | --- |
| I01 | App abre sin QVAC | Ya casi |
| I02 | Carpetas Main + stubs | [Agile](BACKEND_AGILE_DELIVERABLE.md) |
| I03 | Schemas / errores compartidos | ídem |
| I04 | Preload `notalocal` + IPC | ídem |
| I05+ | SQLite, audio, mocks, export, seguridad | ídem |

**Reglas de higiene**

- Negocio → servicios; IPC solo valida y traduce.
- Preload = lista blanca; nada de `invoke` genérico.
- Renderer no importa `electron`, `node:*` ni `@qvac/sdk`.

---

## 7. Mapa de archivos (día 1)

```text
apps/desktop/
├── electron.vite.config.ts   # compila Main + Preload + Renderer
├── package.json              # scripts dev / build / test
└── src/
    ├── main/
    │   ├── index.ts          # ciclo de vida + ventana  ← empiezas a leer aquí
    │   └── config/           # rutas y settings
    ├── preload/
    │   └── index.ts          # puente a window.*
    └── renderer/             # UI (Antonio)
```

| Comando (raíz del repo) | Uso |
| --- | --- |
| `pnpm dev:desktop` | Abrir la app en desarrollo |
| `pnpm test` | Tests del paquete desktop |
| `pnpm typecheck` | Comprobar tipos |
| `pnpm --filter notalocal-desktop build` | Bundle en `apps/desktop/out/` |

---

## 8. Mini-glosario

| Término | Significado |
| --- | --- |
| `BrowserWindow` | Una ventana de escritorio (contiene el renderer) |
| `app` | Ciclo de vida de la aplicación Electron |
| `preload` | Script puente seguro antes de cargar la UI |
| `contextBridge` | API oficial para exponer objetos a `window` sin romper el aislamiento |
| `ipcMain` / `ipcRenderer` | Lado Main / lado renderer del mensajería |
| `userData` | Carpeta del SO donde la app guarda datos del usuario |
| `electron-vite` | Tooling que desarrolla/compila los tres procesos juntos |
| ASAR / Forge | Empaquetado para distribuir el instalador — **después** (R-1) |

---

## 9. Tutorial QVAC: qué copiar y qué no

Fuente: <https://docs.qvac.tether.io/tutorials/electron/>

| Idea del tutorial | ¿Ahora? |
| --- | --- |
| Main + preload + IPC | Sí |
| Aislamiento del renderer | Sí (ya está) |
| Instalar `@qvac/sdk` y cargar modelos | Pin 0.17.1; Whisper small en `generateNote` (`language: es`) |
| UI chat del tutorial | **No** (renderer de Antonio) |
| Empaquetar con Forge + plugin QVAC | **Después** |

Cuando toque IA real: un solo sitio de import bajo `src/main/qvac/` (o `inference/`).

---

## 10. Checklist “ya entiendo Electron lo suficiente”

- [ ] Sé que Electron = Chromium (UI) + Node (poder de sistema) en escritorio.
- [ ] Distingo Main / Preload / Renderer y sé qué carpeta es cada uno.
- [ ] Abrí la app con `pnpm dev:desktop`.
- [ ] Sé que `config/` define rutas y settings, no la UI.
- [ ] Sé que el siguiente trabajo útil es I02–I04, no empaquetar ni QVAC.
- [ ] Sé que Antonio consume `window.notalocal`; yo no meto lógica clínica en React.

Si falta una firma de QVAC en docs oficiales o `.d.ts`: **no la inventes** — `TODO: VERIFY FROM OFFICIAL QVAC DOCUMENTATION`.

---

## 11. Dónde seguir (en este orden)

1. **Este doc** (conceptos + arranque).
2. [BACKEND_AGILE_DELIVERABLE.md](BACKEND_AGILE_DELIVERABLE.md) — tareas medibles.
3. [BACKEND_DESKTOP_ARCHITECTURE_GUIDE.md](BACKEND_DESKTOP_ARCHITECTURE_GUIDE.md) — detalle técnico.
4. Docs oficiales Electron (opcional, cuando necesites profundidad): [Process model](https://www.electronjs.org/docs/latest/tutorial/process-model), [IPC](https://www.electronjs.org/docs/latest/tutorial/ipc), [Security](https://www.electronjs.org/docs/latest/tutorial/security).
5. [R-1](research/R-1-qvac-electron-tutorial.md) — empaquetado / laboratorio, cuando haya hardware.
