# Electron en NotaLocal — cómo empezar (Justin)

> Guía corta para quien debe **configurar y gestionar** el proceso Main.
> No sustituye la [arquitectura backend](BACKEND_DESKTOP_ARCHITECTURE_GUIDE.md) ni el [plan agile](BACKEND_AGILE_DELIVERABLE.md).
> Si nunca tocaste Electron: empieza aquí, luego sigue I01 → I12 del entregable.

---

## 1. En una frase

Electron = tres procesos en una sola app de escritorio:

| Proceso | Carpeta | Quién | Qué hace aquí |
| --- | --- | --- | --- |
| **Main** | `apps/desktop/src/main/` | **Tú (Justin)** | Backend local: ventana, IPC, SQLite, audio temp, adapters |
| **Preload** | `apps/desktop/src/preload/` | **Tú** | Puente cerrado: solo métodos explícitos hacia el renderer |
| **Renderer** | `apps/desktop/src/renderer/` | Antonio | React / UI. **Sin Node, sin `@qvac/sdk`, sin SQL** |

El renderer solo debe hablar con `window.notalocal.*` (hoy el prototipo usa un mock en el renderer; tu trabajo es sustituirlo por preload + IPC reales).

---

## 2. Qué ya está hecho (no vuelvas a scaffoldizar)

El monorepo **ya tiene** el shell Electron + React + TypeScript en `apps/desktop/`.

| Pieza | Estado |
| --- | --- |
| `electron-vite` + scripts | Listo (`pnpm dev:desktop`) |
| `src/main/index.ts` | Abre ventana; `contextIsolation: true`, `nodeIntegration: false` |
| `src/main/config/` | Rutas, env, `settings.json` (Zod) |
| `src/preload/index.ts` | Stub (`notalocalPrototype`); **aún no** es el contrato IPC |
| Renderer + flujo mock | Antonio; no lo reescribas |

**No ejecutes** `npm create @quick-start/electron…` en este repo: eso crearía un proyecto paralelo. El scaffold oficial de QVAC sirve de **referencia** (ver §7), no de arranque desde cero aquí.

---

## 3. Arrancar y comprobar en 2 minutos

Requisitos: Node `>= 20` (para QVAC más adelante, el tutorial pide `>= 22.17` y npm `>= 10.9`), pnpm 10.

```bash
pnpm install
pnpm dev:desktop
```

Criterio de “Electron ya corre”:

1. Se abre la ventana de NotaLocal.
2. En Main no hay import de `@qvac/sdk` (el entregable agile lo prohíbe hasta más tarde).
3. `package.json` de desktop **no** lista `@qvac/sdk`.

Linux: si Chromium falla por sandbox, en `apps/desktop/package.json` el script `dev` puede pasar a:

```bash
electron-vite dev -- --no-sandbox
```

y, en Main, `app.commandLine.appendSwitch('no-sandbox')` (como el tutorial QVAC). Solo si lo necesitas; no lo copies “por si acaso” en macOS.

---

## 4. Cómo se gestiona la configuración (ya existe)

Todo vive en `apps/desktop/src/main/config/`. Main lo carga al arrancar:

```ts
loadAppConfig({
  userData: app.getPath("userData"),
  temp: app.getPath("temp"),
  isPackaged: app.isPackaged,
  nodeEnv: process.env.NODE_ENV,
})
```

| Módulo | Responsabilidad |
| --- | --- |
| `env.ts` | `isDev` / empaquetado; flag de descarga desatendida de modelos (solo dev) |
| `paths.ts` | Una sola fuente de rutas: DB, caché de modelos, audio temp, logs, `settings.json` |
| `settings.schema.ts` | Zod + defaults (retención, locale, `sttModelId`) |
| `settings.service.ts` | Leer/escribir settings de forma atómica |

**Cómo usarlo día a día**

1. Necesitas una ruta nueva → añádela en `paths.ts` (no esparzas `app.getPath` por servicios).
2. Necesitas un setting de usuario → amplía el schema Zod y los defaults; valida siempre al leer/guardar.
3. Un servicio pide config → recibe `AppConfig` (o subcampos) por inyección; no vuelvas a leer el disco ad hoc.

Hoy, si `loadAppConfig` falla, el prototipo **sigue abriendo** la ventana (catch vacío en `index.ts`). Eso es temporal: cuando cierres I05+, el fallo de rutas/settings debe ser visible y bloquear arranque corrupto.

---

## 5. Qué tienes que construir tú (orden)

Sigue [BACKEND_AGILE_DELIVERABLE.md](BACKEND_AGILE_DELIVERABLE.md). Resumen operativo:

| Iteración | Objetivo práctico |
| --- | --- |
| **I01** | Ya casi cumplido: app abre sin QVAC. Cierra el checklist (logs “ready”, script estable). |
| **I02** | Carpetas bajo `src/main/` (`ipc`, `encounters`, `storage`, `inference` mock, …) + stubs. |
| **I03** | Schemas compartidos + errores tipados (contrato de los 4 métodos). |
| **I04** | Preload real: `contextBridge.exposeInMainWorld('notalocal', { startEncounter, stopEncounter, generateNote, saveNote })` + handlers IPC con Zod. |
| **I05+** | SQLite, encounters, audio temp, mocks de STT/nota, export, logging, seguridad. |

**Regla de gestión diaria**

- Lógica de negocio → `services` (carpetas de dominio), **nunca** dentro de handlers IPC.
- IPC → solo validar (Zod), llamar servicio, devolver `Result` serializable.
- Preload → **lista blanca** de métodos; nunca `ipcRenderer` crudo ni `invoke` genérico.
- Renderer → Antonio; tú solo defines el contrato `window.notalocal`.

---

## 6. Mapa mental de archivos (día 1)

```text
apps/desktop/
├── electron.vite.config.ts     # builds Main / Preload / Renderer
├── package.json                # scripts: dev | build | test | typecheck
└── src/
    ├── main/
    │   ├── index.ts            # ciclo de vida app + createWindow  ← empiezas aquí
    │   └── config/             # ya hecho; amplía, no forks
    ├── preload/
    │   └── index.ts            # hoy stub; I04 = contrato notalocal
    ├── renderer/               # Antonio (no editar desde backend)
    └── shared/                 # I03: schemas/constants (cuando lo crees)
```

Comandos útiles desde la raíz del monorepo:

| Comando | Uso |
| --- | --- |
| `pnpm dev:desktop` | Desarrollo con hot reload |
| `pnpm test` | Tests del paquete desktop |
| `pnpm typecheck` | Types de packages + desktop |
| `pnpm --filter notalocal-desktop build` | Bundle en `apps/desktop/out/` |

---

## 7. Tutorial QVAC: qué copiar y qué no

Fuente: <https://docs.qvac.tether.io/tutorials/electron/>

| Del tutorial | En NotaLocal ahora |
| --- | --- |
| Idea Main + preload + IPC | **Sí** — es nuestra arquitectura |
| `contextIsolation` / sin Node en renderer | **Sí** — ya está |
| Instalar `@qvac/sdk` y `loadModel` en Main | **No** en el primer entregable (solo `InferencePort` + mock) |
| UI chat Tailwind del tutorial | **No** — el renderer es de Antonio |
| Empaquetado Forge + `QvacForgePlugin` | **Después** (investigación R-1; no bloquea I01–I12 mock) |

Cuando toque QVAC: un solo import bajo `src/main/qvac/` (o `inference/`), nunca desde renderer.

---

## 8. Checklist “ya sé gestionarlo”

- [ ] Sé abrir la app con `pnpm dev:desktop` y reconocer Main vs Renderer en DevTools.
- [ ] Sé dónde vivirían rutas y settings (`config/`) y por qué no van en React.
- [ ] Sé que el siguiente trabajo útil es **I02–I04** (carpetas + contrato + preload), no empaquetar ni QVAC.
- [ ] Sé que Antonio consume `window.notalocal`; yo no empujo lógica clínica a la UI.
- [ ] Sé qué está prohibido: Firebase, Express “por costumbre”, fallback cloud, telemetría con PHI.

Si algo de la API de QVAC no está en docs oficiales o en los `.d.ts` instalados: **no inventes la firma** — márcalo `TODO: VERIFY FROM OFFICIAL QVAC DOCUMENTATION`.

---

## 9. Dónde seguir

1. Este doc (arrancar + config + orden).
2. [BACKEND_AGILE_DELIVERABLE.md](BACKEND_AGILE_DELIVERABLE.md) — criterios pass/fail por iteración.
3. [BACKEND_DESKTOP_ARCHITECTURE_GUIDE.md](BACKEND_DESKTOP_ARCHITECTURE_GUIDE.md) — detalle de carpetas, IPC, storage, seguridad.
4. [R-1 tutorial Electron / QVAC](research/R-1-qvac-electron-tutorial.md) — empaquetado y laboratorio (cuando haya hardware).
