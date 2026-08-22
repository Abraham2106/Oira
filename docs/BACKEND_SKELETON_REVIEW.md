# Observaciones: esqueleto Main (`config` + `ipc`)

Estado al 22 ago 2026. No es una guía de producto; es una revisión del código actual en `apps/desktop/`.

**Conclusión:** no tirar el árbol de carpetas ni la idea (Zod en la puerta, `Result` al Renderer, QVAC fuera de IPC). Eso coincide con la guía de Justin. Lo que está mal es que **parece producto y es teatro**.

---

## Qué no está mal

- Inyectar `handle` en vez de importar Electron en cada archivo.
- No importar `@qvac/sdk` fuera de una capa de aislamiento (hoy ni siquiera está).
- `safeParse` en IPC; no devolver `stack`, `cause` ni rutas al Renderer.
- Carpetas por dominio (`config`, `ipc`, `encounters`, `notes`, `auth`, `export`, `shared`).

---

## 1. El auth es una mentira peligrosa

`unlock(pin)` **ignora el pin** y deja `authenticated = true`.

Si alguien cablea la UI, parece que hay candado y no hay ninguno. Peor que no tener auth: enseña al equipo (y a la demo) un flujo falso.

Encima, `startEncounter` / `stop` / `generateNote` / `saveNote` **no piden sesión**. El PIN solo cubre `lock`. Cualquiera que hable IPC saca una nota “aprobada” por el stub.

Eso choca con §9 y con “el médico decide”: aquí ni siquiera hay médico autenticado.

**Corte concreto:** no fingir unlock. O el stub rechaza siempre (`NOT_AUTHENTICATED` / pin no implementado), o no se registra el canal hasta §9.

---

## 2. Los errores mienten

Cualquier excepción que no parezca `AppError` se convierte en **`DATABASE_ERROR`**.

Falla el mic, el disco, un stub, QVAC… el Renderer verá “base de datos”. El médico actúa mal. Eso no es un detalle de tipos; es un fallo de producto.

`isAppError` acepta **cualquier** `{ code, message }` string. Un objeto raro (o basura del modelo) puede colarse como error “oficial” y llegar a la UI.

**Corte concreto:** `isAppError` debe comprobar `code ∈ APP_ERROR_CODES` (y un brand/`name` propio). Errores desconocidos: código honesto o genérico que no diga SQLite.

---

## 3. Los stubs simulan éxito clínico

- `generateNote` devuelve un draft con `body: ""` y `ok: true`.
- `saveNote` inventa un `noteId` y “aprueba”.
- `exportNote` dice `{ exported: true }` **sin escribir nada**.

Si Antonio conecta pantallas, la UI dirá “listo / exportado / guardado” sobre el vacío. En una app clínica eso es peor que un crash.

**Corte concreto:** stubs que aún no hacen el trabajo deben devolver `ok: false` con un código del estilo “no implementado”, o no registrarse. Nunca `ok: true` en save/export/generate vacío.

---

## 4. Dos (luego tres) sitios para el mismo contrato

Canales y Zod de IPC están en `shared/` (bien). Settings Zod está en `main/config/` (la guía también los pone en `shared/schemas`). Más adelante `packages/types` del frontend será **el tercer** contrato.

Tres formas de `Encounter` = merge eterno, no flexibilidad.

Settings en **JSON** y la guía con tabla **SQLite** `settings`: o se migra después, o hay dos fuentes de verdad.

**Corte concreto:** un solo dueño del contrato (Justin / `shared`). Frontend reexporta; no redefine.

---

## 5. No hay la app para la que existe IPC

No hay Electron, ni preload, ni un test que llame `startEncounter({})`. I04 no está cerrado. Hay una frontera de confianza **sin proceso Main**.

`apps/desktop/package.json` no es el scaffold QVAC (`electron-vite`). Esto no arranca una ventana.

Eso no justifica borrar `ipc`; justifica no tratarlo como entregable de app hasta I01 + preload.

---

## 6. El logger no es el logger de la guía

`console.info(JSON.stringify(...))` no es `LogEntry` (§12). Hoy no filtra PHI porque no loguea payload. El día que alguien pase `meta` “por si acaso”, no hay redaction.

**Corte concreto:** no ampliar este logger. El real vive en `main/logging` (`logger.ts`, `redact.ts`). IPC solo le pasa escalares: canal, status, latencia, `errorCode`.

---

## Qué destruir vs qué no tocar

| Destruir (comportamiento) | No tocar (esqueleto) |
| --- | --- |
| Stub de auth que acepta cualquier pin | `shared` + lista de canales |
| Mapeo ciego a `DATABASE_ERROR` | `withValidation` como patrón |
| `isAppError` de pato | `config` (rutas inyectables) |
| export / save / generate con `ok: true` vacío | Separación ipc → puertos de servicio |

Si se tira todo ahora, no se corrige el diseño; se borra la única parte que ya coincide con Justin.
