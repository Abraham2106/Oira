# R-14 — Empaquetado Electron + React/Vite + QVAC

Fecha: 2026-09-14

## Fuentes primarias

- Electron, distribución: https://www.electronjs.org/docs/latest/tutorial/application-distribution
- Electron, firma: https://www.electronjs.org/docs/latest/tutorial/code-signing
- electron-vite, distribución: https://electron-vite.org/guide/distribution
- Vite, dependencias SSR: https://vite.dev/config/ssr-options.html#ssr-noexternal
- QVAC, Electron: https://docs.qvac.tether.io/tutorials/electron/

## Contrato adoptado

1. `electron-vite` compila Main, preload CJS y renderer React a `dist/`.
2. Los paquetes que publican TypeScript (`@oira/types`) se incluyen en Main; Electron no ejecuta `.ts` desde `node_modules`.
3. `@qvac/sdk` y sus dos árboles de Zod se incluyen en Main. Esto evita enlaces pnpm no transportables y conserva Zod 4 para QVAC junto a Zod 3 para Oira.
4. `QvacForgePlugin` genera y verifica el worker Bare, fuerza `asar: false` y lo incorpora al paquete.
5. Forge/Squirrel genera el candidato Windows x64. Authenticode se aplica después, en release; nunca desde el renderer.
6. El gate local debe arrancar el build de producción y revisar excepciones, no limitarse a observar que existe un proceso.

## Fallos observados y corrección

| Error instalado | Causa comprobada | Corrección |
| --- | --- | --- |
| `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING` | `@oira/types` quedó externo y exporta `src/index.ts`. | Excluirlo de `externalizeDepsPlugin` para integrarlo al bundle. |
| `ERR_MODULE_NOT_FOUND: @qvac/rag` | El paquete externo `@qvac/sdk` perdió dependencias transitivas al transportar el árbol pnpm. | Integrar `@qvac/sdk` al bundle Main. |
| `z.object(...).meta is not a function` | QVAC/Zod 4 quedó enlazado al Zod 3 externo de Oira. | Integrar `zod`; Rollup conserva las versiones resueltas por cada importador. |
| `__dirname is not defined` | Main es ESM y usaba una global CommonJS. | Derivar `moduleDir` con `dirname(fileURLToPath(import.meta.url))`. |

## Evidencia requerida por candidato

- `pnpm typecheck`, tests QVAC y `electron-vite preview` sin excepciones.
- Inspección del Main extraído: sin imports de paquete `@oira/types` o `@qvac/*`.
- Extracción del `.nupkg` y arranque de su `Oira.exe`; ausencia de ventana `Error` y presencia de la ventana `oira`.
- SHA-256 y estado Authenticode del `Setup.exe` exacto.

## Resultado del candidato 0.0.3

- `electron-vite preview`: runtime QVAC compatible y sin excepciones de inicio.
- `.nupkg` extraído: Main sin imports externos `@oira/*` o `@qvac/*`.
- Renderer observado mediante DevTools limitado a `127.0.0.1`: título `Oira` y URL `resources/app/dist/renderer/index.html`.
- `Oira-Setup-x64.exe`: SHA-256 `1F08C59B57252B9A7704E7956770F481199E9C9613F8FCB8D60B4B3B4DAE10AB`; Authenticode `NotSigned`.
