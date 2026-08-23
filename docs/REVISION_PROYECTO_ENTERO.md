# Revisión: proyecto entero

Antes: revisión del esqueleto Main (`config` + `ipc`). Reescrito el 23 ago 2026 para cubrir el desktop entero.

**Alcance:** `apps/desktop` + `packages/types`. No “solo el backend”.

**Conclusión:** el esqueleto de Main es una base razonable de hackathon. La app que se ve al arrancar **no es esa base**. Son dos productos que conviven en el mismo repo y **no hablan**. Tratar el conjunto como un producto ya unido es lo que está mal.

La versión anterior de este archivo hablaba de un Main que ya no existe: auth que ignoraba el PIN, stubs con `ok: true` vacío, y sin Electron. Eso quedó atrás; no hay un segundo review paralelo.

---

## Qué no está mal

No hay que tirar Main. Encuentros, IPC + Zod, PIN/scrypt, audio PCM, `DraftNote` ≠ `ApprovedNote`, SQLite, isolation de Renderer y `Result` serializable son el contrato correcto para un backend local.

Tampoco está mal el prototipo de Antonio **como prototipo**. `ClinicalNote` por secciones, presencia y `sourceSegmentIds` son un diseño de revisión médica coherente **consigo mismo**.

Lo que está mal es **soldar ambos sin un adaptador** y seguir añadiendo pantallas, persistencia o QVAC como si el médico ya usara Main.

---

## 1. Hay dos contratos, no uno

| | UI (`@notalocal/types` + mock) | Main (`window.notalocal` + `shared/`) |
|---|---|---|
| Entrada | `getBridge()` → `createMockBridge()` | Preload `NotaLocalAPI` (no se usa) |
| Nota | `ClinicalNote` (7 secciones, `presence`, `sourceSegmentIds`) | `DraftNote` (`facts` + `body` plano) |
| Encounter | `id`, `label`, `visitType`, transcript embebido | `id`, status, timestamps UTC; sin cuerpo clínico |
| Errores | `throw new Error(...)` | `{ ok: false, error }` |
| Estados | `IDLE` / `RECORDING` / `TRANSCRIBING` / `READY_FOR_REVIEW` / … | `created` / `recording` / `transcribing` / `drafted` / `completed` / … |

**Por qué está mal:** TypeScript no te va a avisar. Cada lado typecheckea. El fallo aparece en runtime: argumentos que Zod rechaza, notas que la UI no puede pintar, estados que no existen en el otro lado.

**Si construyes encima:** cada pantalla nueva fija el contrato equivocado. El merge no es “cambiar un import”; es reescribir el modelo de la nota y la máquina de estados.

---

## 2. `getBridge()` nunca llega a Main

`apps/desktop/src/renderer/bridge/notalocal.ts` exporta `getMainApi()` y **no lo usa**. `getBridge()` siempre devuelve `createMockBridge()`. `useEncounter` solo habla con ese mock.

**Por qué está mal:** la UI de demo parece el producto. El médico pulsa “iniciar / parar / guardar” y todo “funciona”. Main (SQLite, PIN, audio, export real) no se entera.

**Si construyes encima:** cualquier feature de UI se prueba contra timers y texto sintético. El día que alguien ponga `window.notalocal` en `getBridge()`, **todo el flujo se rompe a la vez** (firmas, errores, nota, audio, auth).

No hay que cablear `getBridge()` a Main sin un mapper `ClinicalNote` ↔ `DraftNote`. Eso rompería el prototipo de Antonio a propósito.

---

## 3. `startEncounter` no es la misma función

- **UI / mock:** `startEncounter({ label, visitType })` → `{ encounterId, startedAt }`.
- **Main / preload:** `startEncounter()` → `Result<{ encounterId }>`. Input Zod: `{}`. `label` y `visitType` no existen en el schema.

**Por qué está mal:** aunque conectes el preload, el Renderer mandaría un objeto que Main **rechaza** (`strict()`). El médico vería “no se pudo iniciar la consulta” con un backend que sí sabe crear encuentros.

**Si construyes encima:** o inventas `label`/`visitType` en Main sin decisión de producto, o tiras los campos de la pantalla de inicio. Hay que elegir un contrato, no acumular ambos.

---

## 4. El pipeline clínico de la UI es un `wait(800)`

Tras `stopEncounter`, `useEncounter` espera 800 ms, finge transcripción, espera otros 800 ms y llama `generateNote`. No hay `onEvent`, no hay poll de status, no hay cancelación.

Main, en cambio, pasa `recording` → `transcribing` (trabajo real, timeout, retry, `transcription.progress`) → `transcribed`, y **después** se puede generar la nota. Sin transcript no hay draft.

**Por qué está mal:** la UI asume que “parar” ≈ “ya hay nota”. Main asume que parar solo cierra audio y arranca STT. Son dos semánticas del mismo botón.

**Si construyes encima:** o la UI se queda colgada esperando un `ClinicalNote` que Main no devuelve, o Main se fuerza a ser síncrono y se tira el diseño de jobs/cancel/progress.

---

## 5. La nota del médico y la nota de Main no son el mismo objeto

**Antonio** (`packages/types`):

- Siete secciones fijas (`visit_context` … `follow_up`).
- Cada campo tiene `text`, `presence` (`STATED` / `NOT_STATED` / `UNKNOWN`), `sourceSegmentIds`, `reviewed`.
- La pantalla de Review edita **por sección**. `saveNote(encounterId, ClinicalNote)` manda el objeto entero.

**Main:**

- `DraftNote`: `facts` (schema IA, todo opcional) + `body` string.
- `saveNote({ encounterId, body })`: un string. Las secciones no viajan.
- `ApprovedNote` es otro tipo. Export **solo** de aprobada.
- El schema clínico es un placeholder del rol IA. No hay `presence` ni `reviewed`.

**Por qué está mal:** el valor del producto es “el médico revisa y decide”. Si Main solo guarda un `body`, la UI de secciones es teatro: al persistir se pierde presencia, trazas al transcript y qué editó el médico. Si la UI ignora `DraftNote`/`ApprovedNote`, se puede exportar un borrador (Main lo prohíbe) o “aceptar” sin sesión.

**Si construyes encima:** o se aplanan las secciones a un string (se mata el diseño clínico) o se inventa un mapper silencioso que miente en `presence`/`sourceSegmentIds`. Ninguna de las dos es “conectar el bridge”.

---

## 6. Los errores no se pueden mostrar igual

El mock **lanza**. `useEncounter` hace `catch` y pone un string genérico.

Main **nunca lanza por IPC**. Devuelve `{ ok: false, error: { code, message } }`. Códigos (`NOT_AUTHENTICATED`, `INVALID_STATE_TRANSITION`, `ENCOUNTER_ACTIVE`, `MODEL_NOT_READY`, …) son la UI honesta del médico.

**Por qué está mal:** si pegas Main sin cambiar el hook, `ok: false` se ve como éxito (no hay throw) y la máquina de UI avanza a `READY_FOR_REVIEW` / `ACCEPTED` sobre un fallo. Peor que un crash: el médico cree que hay nota.

**Si construyes encima:** cada `try/catch` de pantalla enseña el patrón incorrecto. Hay que ramificar `Result` en el adaptador, no en cada botón.

---

## 7. La UI no captura audio; Main no acepta otra cosa

Renderer: no hay `getUserMedia`, ni `MediaRecorder`, ni `pushAudioChunk`. El mock no graba.

Main: WAV PCM mono 16 kHz 16-bit. El Renderer **manda chunks**, nunca una ruta. Tope 200 MB / 60 min. `userData/tmp-audio/<uuid>/`.

**Por qué está mal:** “iniciar consulta” en pantalla no produce PCM. “Parar” en Main no tiene nada que transcribir (o transcribe silencio / falla). El claim “consulta → audio → STT local” no ocurre en la app que se ve.

**Si construyes encima:** STT y QVAC se “integran” contra archivos de test o el mock `"[mock transcript]"`. El path del médico (micrófono → WAV → modelo) sigue sin existir.

---

## 8. Main exige PIN; la UI no tiene candado

IPC clínico (`start`, `stop`, `generate`, `save`, `export`, audio, inventory) usa `requiresSession: true`. Auth es scrypt + salt + `timingSafeEqual`, backoff, idle 15 min (`idleLockMs`), sesión solo en memoria.

No hay pantalla de `setPin` / `unlock` / `lock`. El prototipo entra directo al flujo.

**Por qué está mal:** con Main cableado a pelo, el primer clic clínico devuelve `NOT_AUTHENTICATED`. La demo “deja de funcionar” aunque auth esté bien. O, peor, alguien desactiva `requiresSession` “para la demo” y el candado vuelve a ser teatro.

**Si construyes encima:** o se construye la pantalla de PIN **antes** de unir el flujo, o se documenta un modo demo explícito. No se “omite el PIN un fin de semana”.

---

## 9. QVAC está documentado como real y el runtime es un stub

`@qvac/sdk` **no está** en `package.json`. `qvac.sdk.ts` es un stub local. El boot usa `createOfflineQvacRuntime()`:

- transcribe → `"[mock transcript]"` (sí lee el WAV, no infiere);
- completion → `"{}"`.

Los docs marcan varias APIs QVAC como `CONFIRMED`. Eso no significa que esta app las ejecute.

**Por qué está mal:** el pipeline Main “pasa tests” sin un modelo. Un reviewer o un juez de hackathon puede creer que hay Whisper/LLM locales. No los hay. Empaquetar Electron + addons nativos QVAC (`asar`, binding SQLite, memoria) **no está probado** (R-3).

**Si construyes encima:** prompts, schema clínico y “calidad de nota” se afinan contra `"{}`". Instalar el SDK sin spike de packaging puede romper el build. El siguiente paso no es más servicio de notes; es el spike QVAC + un runtime de verdad.

---

## 10. El log puede guardar texto clínico en `meta.channel`

`redact.ts` solo deja pasar claves de `LOG_META_KEYS`. `channel` es una de ellas. `redactScalar` no trata el valor como PHI: si el texto no parece ruta ni el canario `XYZZY-…`, **se escribe tal cual**.

`sensitive-log.test.ts` mete el transcript sintético en `meta.channel` y espera que **no** aparezca. Eso falla: el allowlist protege el nombre de la clave, no el contenido.

**Por qué está mal:** el producto promete “no loguear payload clínico”. El test ya documenta el hueco. Un `logger.log({ meta: { channel: transcript } })` (o un copy-paste de debug) escribe la consulta en disco.

**Si construyes encima:** más `meta` “por si acaso” agranda el agujero. Hay que redactar/rechazar strings largos o no allowlistear `channel` como texto libre **antes** de añadir más logging.

---

## 11. SQLite y transcripts están en claro

No hay SQLCipher ni cifrado de ficheros. El PIN bloquea IPC, no el disco. Quien copie `userData` lee encuentros y texto clínico.

**Por qué está mal:** “100 % local” no es “protegido en reposo”. Es honesto decirlo. Es mentira de producto decir que el PIN “cifra la historia clínica”.

**Si construyes encima:** features de retención/export no arreglan esto. O se declara “plaintext, el OS es el perímetro” o se hace el trabajo de cifrado. No se implica lo segundo con código de lo primero.

---

## 12. Si el boot de Main falla, la ventana igual se abre

En `main/index.ts`, el `catch` de `whenReady` loguea y **sigue** a `createWindow()`. Si SQLite o el wiring fallan, el Renderer carga sin handlers IPC.

**Por qué está mal:** la UI mock ni se entera (no usa IPC). El día que use Main, cada clic falla de forma opaca: “no se pudo iniciar” sin “el backend no arrancó”.

**Si construyes encima:** se debuggea la pantalla en vez del boot. La ventana no debería abrirse (o debería ser una pantalla de fallo fatal) si `registerIpc` no corrió.

---

## 13. Export en la UI no exporta

`exportNote` en `useEncounter` solo hace `apply("EXPORT")` y `setCopied(true)`. No llama al mock (el mock no tiene export) ni a Main (`txt` / `json` / `clipboard` sobre `ApprovedNote`).

**Por qué está mal:** el estado `EXPORTED` es cosmética. Main sí escribe fichero o portapapeles, y **rechaza** draft.

**Si construyes encima:** “exportar” en Review enseña al médico un éxito falso. Igual que los stubs viejos del review anterior, pero ahora en la UI.

---

## Qué sí se puede construir encima (Main)

- Adaptador **único** Renderer → `window.notalocal` (mapea tipos y `Result`; no expone `invoke` genérico).
- Captura PCM en Renderer + `pushAudioChunk`.
- Pantalla PIN (`setPin` / `unlock`) antes de IPC clínico.
- Sustituir `wait(800)` por `onEvent` / poll de status.
- Spike `@qvac/sdk` + packaging (`asar`, nativos).
- Cerrar el hueco de PHI en `meta.channel`.
- No abrir ventana si el boot falla.

Eso es trabajo de **unión**, no de más esqueleto.

## Qué no hacer

- No apuntar `getBridge()` a Main sin mapper.
- No “alinear tipos” duplicando `ClinicalNote` dentro de `shared/` y `DraftNote` en `packages/types`.
- No instalar QVAC “para que compile” sin spike de empaquetado.
- No desactivar `requiresSession` para la demo.
- No tratar la versión anterior de este archivo (esqueleto `config` + `ipc` sin Electron) como foto del código actual.

---

## Resumen

| Cosa | Por qué está mal |
|---|---|
| Dos contratos de nota / encounter / error | Compilan aparte; fallan al unirse |
| `getBridge()` → mock | La UI demo no ejercita Main |
| `startEncounter` distinto | Zod `strict` rechaza `label`/`visitType` |
| `wait(800)` vs job STT | El mismo botón significa otra cosa |
| `ClinicalNote` vs `DraftNote`/`body` | Se pierde la revisión por sección al persistir |
| `throw` vs `Result` | Fallo de Main se lee como éxito |
| Sin mic / sin chunks | No hay pipeline audio → STT en la app visible |
| PIN en Main, no en UI | Unir a pelo = todo `NOT_AUTHENTICATED` |
| Runtime QVAC offline | Tests verdes ≠ modelo local |
| `meta.channel` | PHI puede ir al log; el test de seguridad falla |
| DB en claro | PIN ≠ cifrado en reposo |
| Boot catch + `createWindow` | UI viva sin backend |
| Export de UI | Estado `EXPORTED` sin fichero |

El esqueleto de backend no está podrido. **La app completa aún no es una sola app.** El siguiente trabajo útil es el contrato de unión, no más pantallas ni más servicios que fingen que esa unión ya existe.
