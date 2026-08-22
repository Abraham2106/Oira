# Observaciones: esqueleto Main (`config` + `ipc`)

Revisión del código en `apps/desktop/src/main/` (y contrato `shared/`).
**Auditoría del propio documento:** 22 ago 2026, contra `origin/main` @ `94d34fd`.

**Veredicto de la auditoría:** la conclusión original (“esqueleto bueno, comportamiento de teatro”) **sigue en pie**. Los cortes 1–4 y 6 son correctos y accionables. La **§5 original estaba desactualizada** tras el merge del prototipo Electron + IPC: sí hay shell `electron-vite`, sí hay preload, pero **IPC no está cableado** a Main ni expuesto en `window.notalocal`.

**Conclusión (vigente):** no tirar el árbol de carpetas ni la idea (Zod en la puerta, `Result` al Renderer, QVAC fuera de IPC). Eso coincide con la guía de Justin. Lo que está mal es que **parte del código parece producto y es teatro**.

Anclas de verificación (no inventar firmas):

| Pieza | Ruta |
| --- | --- |
| Auth stub | `apps/desktop/src/main/auth/auth.service.ts` |
| Catch-all de errores | `apps/desktop/src/main/ipc/withValidation.ts` |
| `isAppError` | `apps/desktop/src/main/utils/app-error.ts` |
| Notes / export stubs | `apps/desktop/src/main/notes/notes.service.ts`, `…/export/export.service.ts` |
| Registro IPC (sin callers) | `apps/desktop/src/main/ipc/index.ts` → `registerIpc` |
| Entry Main | `apps/desktop/src/main/index.ts` (carga config + ventana; **no** llama `registerIpc`) |
| Preload | `apps/desktop/src/preload/index.ts` (solo `notalocalPrototype`) |
| Contrato paralelo UI | `packages/types/src/index.ts` (`NotaLocalBridge`) |

---

## Qué no está mal

- Inyectar `handle` en vez de importar Electron en cada archivo IPC.
- No importar `@qvac/sdk` fuera de una capa de aislamiento (hoy ni siquiera está).
- `safeParse` en IPC; `toSerializableError` no expone `stack`, `cause` ni rutas.
- Carpetas por dominio (`config`, `ipc`, `encounters`, `notes`, `auth`, `export`, `shared`).
- `encounter.service` con máquina de estados y un solo encounter activo (esto **no** es teatro vacío).
- Shell Electron real: `electron-vite`, `contextIsolation: true`, `nodeIntegration: false`.

---

## 1. El auth es una mentira peligrosa — **sigue válido**

`unlock(pin)` **ignora el pin** y deja `authenticated = true`.

Si alguien cablea la UI, parece que hay candado y no hay ninguno. Peor que no tener auth: enseña al equipo (y a la demo) un flujo falso.

Encima, `startEncounter` / `stop` / `generateNote` / `saveNote` / `exportNote` **no pasan `requiresSession: true`**. Solo `lock` exige sesión. Cualquiera que hable IPC (cuando se cablee) saca una nota “aprobada” por el stub.

Choca con la guía §9 (“sencillo y **honesto**”) y con el entregable agile: **Auth PIN está fuera de alcance** de I01–I12. Tener un canal `auth.unlock` que siempre pasa es peor que no tenerlo.

**Corte concreto:** no fingir unlock. O el stub rechaza siempre (`NOT_AUTHENTICATED` / pin no implementado), o no se registra el canal hasta §9 / P1.

---

## 2. Los errores mienten — **sigue válido**

Cualquier excepción que no parezca `AppError` se convierte en **`DATABASE_ERROR`** (`withValidation` catch).

Falla el mic, el disco, un stub, QVAC… el Renderer verá “base de datos”. El médico actúa mal. Eso no es un detalle de tipos; es un fallo de producto.

`isAppError` acepta **cualquier** `{ code, message }` string. No comprueba `code ∈ APP_ERROR_CODES` ni un brand/`name`. Un objeto raro puede colarse como error “oficial”.

**Corte concreto:** `isAppError` debe comprobar `code ∈ APP_ERROR_CODES` (y un brand/`name` propio). Errores desconocidos: código honesto o genérico que **no** diga SQLite (p. ej. un `INTERNAL_ERROR` tipado, o reutilizar un código neutro ya listado con mensaje genérico).

---

## 3. Los stubs simulan éxito clínico — **sigue válido**

- `generateNote` → `{ draft: { body: "" } }` implícito vía `ok: true` del wrapper.
- `saveNote` inventa un `noteId` y “aprueba”.
- `exportNote` dice `{ exported: true }` **sin escribir nada**.

Si Antonio conecta pantallas al IPC real, la UI dirá “listo / exportado / guardado” sobre el vacío. En una app clínica eso es peor que un crash.

Hoy el renderer **aún** usa `bridge/mock.ts` (datos sintéticos honestos como demo). El riesgo aparece en el momento en que se cablee Main.

**Corte concreto:** stubs que aún no hacen el trabajo deben devolver `ok: false` con un código del estilo “no implementado”, o no registrarse. Nunca `ok: true` en save/export/generate vacío. Alineación agile: I09/I10 piden mock **determinista con contenido**, no éxito vacío.

**Matiz (auditoría):** `encounters` ya no es stub vacío: hay transiciones y rechazo de segundo encounter activo. No meter encounters en el mismo saco que notes/export.

---

## 4. Dos (luego tres) sitios para el mismo contrato — **sigue válido; peor de lo escrito**

Canales y Zod de IPC están en `shared/` (bien). Settings Zod está en `main/config/` (la guía §2.16 los pone en `shared/schemas`). `packages/types` ya es **el tercer** contrato.

Hoy el choque es concreto, no hipotético:

| Contrato | `startEncounter` input | Nota |
| --- | --- | --- |
| `shared/schemas/ipc.schema.ts` | `{}` estricto | Main / Zod |
| `packages/types` `NotaLocalBridge` | `{ label, visitType }` | Renderer / mock |
| Mock bridge | ignora label/visitType en runtime | Demo UI |

Tres formas de encounter/nota = merge eterno, no flexibilidad.

Settings en **JSON** (`settings.service.ts`) y la guía con tabla **SQLite** `settings`: o se migra en I05, o hay dos fuentes de verdad.

**Corte concreto:** un solo dueño del contrato (Justin / `apps/desktop/src/shared`). Frontend reexporta desde ahí o desde un paquete que **Justin publica**; no redefine `NotaLocalBridge` en paralelo.

---

## 5. IPC sin proceso de confianza — **reescrito (la §5 original mentía)**

### Qué decía el doc (incorrecto tras el merge del prototipo)

> No hay Electron, ni preload… `package.json` no es electron-vite… Esto no arranca una ventana.

**Falso hoy.** Hay `electron-vite`, Electron en `package.json`, `src/main/index.ts` abre `BrowserWindow`, y existe `src/preload/index.ts`. `pnpm dev:desktop` es el camino documentado en el README.

### Qué es verdad ahora

1. **`registerIpc` no se llama** desde `main/index.ts`. La frontera Zod existe como módulo muerto.
2. Preload expone solo `window.notalocalPrototype = { usesMockBridge: true }`, **no** `window.notalocal` con los 4 métodos del entregable.
3. No hay test que invoque handlers Main (`startEncounter` vía IPC). El test de `bridge/mock.test.ts` ejercita el mock del renderer.
4. I01 parcialmente cubierto (shell). **I04 no cerrado** (preload tipado + Zod en el camino real).

Eso no justifica borrar `ipc`; justifica no tratarlo como entregable de app hasta cablear `ipcMain.handle` + preload allow-list + un smoke test.

**Corte concreto:** o se cablea I04 de verdad, o se marca el árbol IPC como “scaffolding no conectado” en README/estado del repo para que nadie demuestre “backend listo”.

---

## 6. El logger no es el logger de la guía — **sigue válido**

`createJsonIpcLogger` → `console.info(JSON.stringify(...))` no es `LogEntry` (§12). Hoy no filtra PHI porque no loguea payload. El día que alguien pase `meta` “por si acaso”, no hay redaction.

No existe `main/logging/` (`logger.ts`, `redact.ts`) todavía — coherente con I11 pendiente.

**Corte concreto:** no ampliar este logger. El real vive en `main/logging`. IPC solo le pasa escalares: canal, status, latencia, `errorCode`.

---

## Qué destruir vs qué no tocar

| Destruir (comportamiento) | No tocar (esqueleto) |
| --- | --- |
| Stub de auth que acepta cualquier pin (o registrar el canal) | `shared` + lista de canales |
| Mapeo ciego a `DATABASE_ERROR` | `withValidation` como patrón |
| `isAppError` de pato | `config` (rutas inyectables) |
| export / save / generate con `ok: true` vacío | Separación ipc → puertos de servicio |
| Contrato duplicado en `packages/types` vs `shared` | Máquina de estados de `encounters` |
| Tratar IPC como “entregado” sin `registerIpc` + preload | Shell Electron + flags de seguridad básicos |

Si se tira todo ahora, no se corrige el diseño; se borra la única parte que ya coincide con Justin.

---

## Hallazgos de auditoría sobre *este* documento

| Hallazgo | Severidad | Notas |
| --- | --- | --- |
| §5 afirmaba “no hay Electron / no arranca” | **Alta (doc stale)** | Falso desde el merge del prototipo desktop; confunde onboarding |
| Faltaba el hecho crítico: `registerIpc` nunca se registra | **Alta (omisión)** | Más importante que “falta scaffold” |
| No citaba rutas ni commit | Media | Sin anclas, el review envejece en silencio |
| Meter `encounters` junto a stubs vacíos | Baja | Encounter service ya tiene lógica real |
| No contrastaba con agile (auth fuera de I01–I12) | Media | Refuerza el corte: no fingir PIN en este entregable |
| Tono (“teatro”, “mentira”) | Baja | Útil internamente; los cortes concretos son lo accionable |
| Cortes 1–4 y 6 vs código | **OK** | Siguen reproducibles línea a línea |

**Acción recomendada tras esta auditoría:** mantener este archivo como review vivo; no crear un segundo doc paralelo. Próximo paso de código (fuera de este cambio de docs): I04 cableado **o** stubs honestos (`ok: false` / canal auth ausente) antes de conectar UI real.
