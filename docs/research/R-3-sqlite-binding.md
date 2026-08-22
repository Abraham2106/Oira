# R-3 — Binding SQLite junto a addons QVAC

**Estado:** análisis documental completado; la selección de binding está **BLOCKED — NEEDS TARGET HARDWARE**.  
**Dependencias:** R-1 debe producir pins y package QVAC funcional.  
**Fuentes consultadas:** 2026-08-22.

## 1. Resumen y decisión

Node documenta node:sqlite como módulo para trabajar con bases SQLite; la versión actual de la documentación lo describe como release candidate. Electron documenta que los módulos nativos deben recompilarse contra el ABI de Electron y que una incompatibilidad puede impedir su carga; Electron Forge usa electron-rebuild para módulos nativos [Node.js, SQLite](https://nodejs.org/api/sqlite.html), [Electron, Native Node Modules](https://www.electronjs.org/docs/latest/tutorial/using-native-node-modules).

QVAC añade un límite de empaquetado: su plugin Forge fuerza asar desactivado y empaqueta prebuilds de sus addons [QVAC, Build an Electron app](https://docs.qvac.tether.io/tutorials/electron/). La documentación no demuestra el resultado de node:sqlite ni de better-sqlite3 dentro del mismo paquete que QVAC.

**Decisión: DEFER.** No se selecciona node:sqlite ni better-sqlite3 hasta comprobar CRUD en dev y en paquete, con QVAC cargado antes y después de abrir la base. Si ambos fallan, el plan B de MVP será persistencia de archivos JSON controlados, sin presentarla como SQLite ni como base cifrada.

## 2. Opciones y evidencia

| Opción | Evidencia documental | Límite |
|---|---|---|
| node:sqlite | Node lo documenta como API de SQLite integrada y release candidate. | No se ha probado dentro de la versión de Node embebida por Electron ni con QVAC. |
| better-sqlite3 | Es un binding de tercero; cualquier binario nativo queda sujeto al ABI/packaging de Electron. | Su presencia, rebuild y carga no se deben inferir sin instalarlo. |
| JSON de MVP | No introduce un binding SQLite adicional. | Tiene límites funcionales y no resuelve cifrado; solo es contingencia si SQLite no sobrevive el paquete. |

La comparación no se hace por preferencia de API. El criterio es que el candidato abra, cree esquema, escriba, lea y cierre dentro del binario que ya cargó el worker/addons QVAC.

## 3. Reglas arquitectónicas

- SQLite vive en Main; el renderer no abre archivos de base ni recibe objetos de driver.
- Los IPC aceptan tipos de dominio validados y devuelven errores propios; nunca SQL arbitrario.
- La prueba de R-3 no decide cifrado. R-5 gobierna claves/cifrado.
- La existencia de asar desactivado no protege los datos y no se usará como argumento de seguridad.
- No se declara que node:sqlite evita módulos nativos: esa es una hipótesis que la prueba empaquetada debe confirmar o refutar.

## 4. Matriz de pruebas

| Binding | Dev CRUD | Package CRUD | Package + QVAC primero | SQLite primero + QVAC | Rebuild/ABI | Decisión |
|---|---|---|---|---|---|---|
| node:sqlite | BLOCKED — NEEDS TARGET HARDWARE | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| better-sqlite3 | BLOCKED — NEEDS TARGET HARDWARE | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| JSON plan B, solo si ambos fallan | BLOCKED | BLOCKED | BLOCKED | BLOCKED | N/A | BLOCKED |

## 5. Protocolo bloqueado

1. Partir del lockfile/package exitosos de R-1; no cambiar simultáneamente Electron, QVAC y el binding.
2. Crear una base no clínica en Main con dos tablas, foreign keys y un caso de cascada.
3. Probar abrir/escribir/leer/cerrar en dev; registrar ruta, versión, error y resultado.
4. Empaquetar el mismo proyecto con QVAC y ejecutar CRUD con dos órdenes de carga: QVAC→SQLite y SQLite→QVAC.
5. Inspeccionar artefacto, asar efectivo y presencia/ruta de binarios; no manipular el plugin de QVAC para “hacerlo pasar”.
6. Repetir por OS/arquitectura soportados. Elegir el ganador solo si sobrevive package con QVAC.

Todos los resultados son **BLOCKED — NEEDS TARGET HARDWARE**.

## 6. Afirmaciones prohibidas

No decir que node:sqlite funciona sin rebuild dentro de Electron, que better-sqlite3 es compatible, que SQLite se cifra, ni que el paquete funciona hasta completar la matriz. Tampoco llamar a JSON una base de datos transaccional.

## 7. Decisión

**DEFER.** La decisión admisible será USE node:sqlite o USE better-sqlite3 solo con éxito reproducible en paquete junto a QVAC. Si ningún candidato supera la matriz, PLAN B JSON para MVP y SQLite se reintenta después.

## Bibliografía

1. Node.js. [SQLite](https://nodejs.org/api/sqlite.html). Consultado el 2026-08-22.
2. Electron. [Native Node Modules](https://www.electronjs.org/docs/latest/tutorial/using-native-node-modules). Consultado el 2026-08-22.
3. QVAC by Tether. [Build an Electron app](https://docs.qvac.tether.io/tutorials/electron/). Consultado el 2026-08-22.
