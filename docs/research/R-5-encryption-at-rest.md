# R-5 — Cifrado en reposo y gestión de claves

**Estado:** investigación de escritorio completada; validación por sistema operativo, empaquetado y QVAC está **BLOCKED — NEEDS TARGET HARDWARE**.  
**Fuentes consultadas:** 2026-08-22.  
**Dependencias:** R-1 debe fijar el stack Electron/QVAC y R-3 debe seleccionar o descartar el binding SQLite empaquetado.  
**Límite de este documento:** no declara que NotaLocal cifra datos de usuario. Describe qué está documentado, qué falta medir y qué copy es defendible mientras tanto.

## 1. Resumen y decisión

Para un MVP clínico local, un PIN de interfaz no equivale a cifrado de datos en reposo. La opción safeStorage de Electron protege cadenas mediante mecanismos del sistema operativo y debe ejecutarse en Main; no es un cifrador de base de datos ni una justificación para afirmar que un archivo SQLite es ilegible. El comportamiento cambia materialmente por plataforma: macOS usa Keychain; Windows usa DPAPI; y Linux puede carecer de un almacén de secretos, caso en el cual Electron advierte que el backend basic_text no ofrece protección [Electron, safeStorage](https://www.electronjs.org/docs/latest/api/safe-storage).

Hay dos familias técnicas investigables: cifrado completo de base SQLite mediante SQLCipher, o cifrado de campos/artefactos controlado por la aplicación con primitivas de Node. Ambas requieren una prueba de empaquetado junto a QVAC y una evaluación real de la disponibilidad de keyring. SQLCipher Community permite uso comercial cerrado sujeto a avisos BSD; eso no prueba que la combinación de binding, Electron, QVAC y plataforma funcione [Zetetic, SQLCipher Community Edition](https://www.zetetic.net/sqlcipher/community/).

**Decisión de escritorio: DEFER encryption, PIN-only lock mientras no exista evidencia de laboratorio.** En consecuencia, la UI y README deben decir que el acceso se bloquea con PIN local, pero no deben sugerir que la base o los archivos estén cifrados. No se implementará SQLCipher ni cifrado por columnas como afirmación de MVP hasta superar los laboratorios K1–K4 de este documento.

## 2. Modelo de amenaza

Esta investigación distingue cuatro situaciones:

| Amenaza | PIN local sin cifrado | safeStorage para secreto pequeño | Base/artefactos cifrados y clave protegida |
|---|---|---|---|
| Persona que usa una sesión ya desbloqueada | No protege | No protege el contenido abierto | No protege el contenido abierto |
| Otro usuario del mismo equipo | Depende de permisos; los archivos pueden ser legibles | Puede proteger el secreto según el SO | Puede proteger si la clave no es accesible |
| Copia del perfil o disco sin FDE | No protege el archivo SQLite | No cifra por sí solo la base | Puede elevar la barrera, sujeto a diseño y clave |
| Malware/app en misma sesión | No se debe prometer protección | Electron documenta límites en Windows | No se debe prometer protección total |

El objetivo de un MVP no es transformar una app de escritorio en defensa completa ante una estación comprometida. La decisión debe ser explícita sobre qué protección hay para archivos persistentes y qué no cubre. Además, Electron advierte que la seguridad depende del framework, Chromium, Node, dependencias y código propio, por lo que cifrar datos no elimina la necesidad de aislamiento de renderer, CSP, permisos mínimos y validación de IPC [Electron, Security](https://www.electronjs.org/docs/latest/tutorial/security).

## 3. Datos documentados sobre safeStorage

Electron define safeStorage como cifrado/descifrado de cadenas para almacenamiento local, mediante criptografía provista por el sistema operativo; el módulo se usa desde el proceso Main. Electron recomienda las APIs asíncronas por no bloquear, admitir rotación de claves y manejar indisponibilidad temporal [Electron, safeStorage](https://www.electronjs.org/docs/latest/api/safe-storage).

| Plataforma | Hecho documentado | Consecuencia para NotaLocal | Estado empírico |
|---|---|---|---|
| macOS | Claves almacenadas en Keychain; la documentación dice que protege frente a otros usuarios y otras apps en el mismo userspace salvo override del usuario. | Puede ser un candidato para proteger una pequeña clave de datos, no una conclusión de cifrado de DB. | BLOCKED — NEEDS TARGET HARDWARE |
| Windows | Claves generadas mediante DPAPI; Electron indica protección frente a otros usuarios, pero no frente a otras apps en el mismo userspace. | Prohibido afirmar protección contra malware/procesos bajo la misma cuenta. | BLOCKED — NEEDS TARGET HARDWARE |
| Linux con secret store | Electron menciona proveedores variables por entorno: Portal Secret y Secret Service, entre otros. | Se debe detectar disponibilidad y documentar el backend. | BLOCKED — NEEDS TARGET HARDWARE |
| Linux sin secret store | Electron indica que basic_text usa una contraseña plaintext hardcodeada y los elementos quedan sin protección; se detecta por getSelectedStorageBackend. | Es una condición de no cifrado para MVP, no un fallback aceptable que pueda ocultarse. | BLOCKED — NEEDS TARGET HARDWARE |

La API asíncrona permite consultar disponibilidad y devuelve un buffer de cifrado; tras descifrar puede indicar que debe recifrarse por rotación de clave. Nada en esta API cifra automáticamente una base SQLite, archivos de audio, exportaciones o caches. Por tanto, su posible función sería encapsular un secreto pequeño de la app, previa comprobación de backend y disponibilidad.

## 4. Opciones de implementación

### Opción A — SQLCipher de base completa

SQLCipher es una opción de cifrado de SQLite. La edición Community permite software abierto o cerrado comercial si se incluyen de forma visible la licencia BSD, avisos de copyright y notices de dependencias; Zetetic enumera como ubicaciones válidas la pantalla About/Licenses, documentación o README/NOTICE [Zetetic, SQLCipher Community Edition](https://www.zetetic.net/sqlcipher/community/).

**Ventaja conceptual:** protege la base completa si se abre con una clave válida y la integración es correcta.  
**Riesgo decisivo:** la investigación R-3 aún no ha demostrado qué binding SQLite carga en un Electron empaquetado con addons QVAC. Añadir SQLCipher puede alterar el pipeline de módulos nativos, rebuild, rutas y package.  
**Estado:** no recomendado para MVP antes de una prueba real dev + package + QVAC por plataforma.

### Opción B — cifrado de campos/artefactos con Node

Node documenta el módulo crypto, incluyendo scrypt, createCipheriv y modos de cifrado autenticado cuyos tags se recuperan tras finalizar el cifrado. Es una base técnica disponible, no un diseño listo para copiar [Node.js, Crypto](https://nodejs.org/api/crypto.html). Un diseño de aplicación tendría que especificar, revisar y versionar: derivación de clave, salts, nonces, algoritmo autenticado, tag, formato de sobre, rotación, borrado de buffers, recuperación de crash, migraciones y errores.

**Ventaja conceptual:** puede evitar un addon SQLCipher y depender de primitivas de Node.  
**Riesgo decisivo:** aumenta la superficie de implementación criptográfica propia y no resuelve dónde guardar/proteger la clave. Un PIN no debe guardarse ni convertirse por sí solo en evidencia de seguridad.  
**Estado:** posible plan B técnico, pero no se aprueba para MVP sin una especificación de seguridad revisada, pruebas de roundtrip y prueba de empaquetado.

### Opción C — sin cifrado en reposo en MVP

Esta opción conserva el PIN como control de acceso a la app, aplica permisos restrictivos de directorio por R-6 y exige copy transparente. No proporciona confidencialidad de archivos a nivel de disco y debe acompañarse de una recomendación clara de protección del dispositivo/sistema operativo.

**Estado:** única opción actualmente defendible si se necesitara lanzar el MVP antes de K1–K4.

## 5. Interacción con QVAC y empaquetado

El tutorial oficial de QVAC documenta que su plugin Forge fuerza asar desactivado porque el worker Bare necesita archivos reales de addons; también obliga builds macOS separados por arquitectura [QVAC, Build an Electron app](https://docs.qvac.tether.io/tutorials/electron/). Esta limitación no es una razón para no cifrar datos, pero vuelve imprescindible probar cualquier binding nativo adicional junto a QVAC.

Antes de recomendar SQLCipher se deben comprobar, en dev y package: carga de QVAC, apertura de DB, migración, cierre, reinicio, y errores. Si se usa solo crypto de Node, se debe probar que la estrategia de clave (safeStorage o alternativa) funciona sin bloquear el inicio ni degradar a basic_text sin aviso.

## 6. Matriz safeStorage y pruebas K1–K4

| Prueba | macOS | Windows | Linux con keyring | Linux sin keyring |
|---|---|---|---|---|
| K1: consultar disponibilidad/backend | BLOCKED — NEEDS TARGET HARDWARE | BLOCKED | BLOCKED | BLOCKED |
| K2: cifrar, reiniciar y descifrar | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| K3: manejar cancelación/indisponibilidad y rotación | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| K4: package con QVAC y opción de almacenamiento elegida | BLOCKED | BLOCKED | BLOCKED | BLOCKED |

Protocolo: registrar versiones fijadas por R-1; ejecutar APIs asíncronas tras app ready; guardar solo texto de prueba no clínico; registrar backend seleccionado, disponibilidad, errores y resultado después de reinicio; en Linux sin keyring comprobar la detección de basic_text y tratarla como no apta para una afirmación de cifrado. Si SQLCipher se evalúa, repetir CRUD, migración y package junto a QVAC. Si se evalúa cifrado de campos, probar tampering, tag inválido, versión desconocida y recuperación de crash.

## 7. Copy permitido y prohibido

### Si el MVP no cifra datos

Texto permitido para README/UI:

> “NotaLocal usa un PIN local para bloquear la aplicación. En esta versión no afirmamos cifrado de los archivos clínicos en reposo; proteja el dispositivo con una cuenta de sistema, bloqueo de pantalla y cifrado de disco cuando esté disponible.”

Texto prohibido:

- “Tus notas están cifradas” o “imposibles de leer en disco”.
- “safeStorage protege toda la base”.
- “El PIN cifra la base de datos”.
- “Cumple HIPAA” o cualquier certificación/regulación no evaluada.
- “asar desactivado protege tus archivos”.

### Si una futura versión supera K1–K4

Solo tras documentar el algoritmo, el almacenamiento de clave, plataformas probadas, versiones y límites, se podría decir:

> “Esta versión cifra [alcance exacto] en reposo en las plataformas verificadas. La protección depende de la seguridad de la cuenta y del sistema operativo; no protege datos ya abiertos ni una sesión comprometida.”

El texto debe sustituir el alcance entre corchetes por evidencia real; no se rellenará anticipadamente.

## 8. Pendientes

- TODO: VERIFY FROM TARGET HARDWARE: backend y disponibilidad de safeStorage en cada plataforma.
- TODO: VERIFY FROM TARGET HARDWARE: comportamiento de Linux sin keyring y manejo de basic_text.
- TODO: VERIFY FROM TARGET HARDWARE: package con QVAC más SQLite/SQLCipher, si se elige.
- TODO: VERIFY FROM TARGET HARDWARE: ciclo de reinicio, rotación, errores y recuperación.
- TODO: VERIFY FROM SECURITY REVIEW: especificación completa si se elige cifrado de campos.
- TODO: VERIFY FROM R-3: binding SQLite ganador o Plan B.

## 9. Decisión

**DEFER encryption; PIN-only lock para el MVP hasta completar laboratorio.**  
No se afirma cifrado en reposo. Se puede preparar la interfaz y el copy honesto, pero no se añade SQLCipher ni criptografía propia sin que R-1/R-3 y K1–K4 produzcan evidencia reproducible. Si se exige una entrega antes de esas pruebas, la decisión se mantiene: PIN local, permisos restrictivos según R-6 y declaración explícita de que los archivos no están verificados como cifrados.

## Bibliografía

1. Electron. [safeStorage](https://www.electronjs.org/docs/latest/api/safe-storage). Consultado el 2026-08-22.
2. Electron. [Security](https://www.electronjs.org/docs/latest/tutorial/security). Consultado el 2026-08-22.
3. Node.js. [Crypto](https://nodejs.org/api/crypto.html). Consultado el 2026-08-22.
4. Zetetic. [SQLCipher Community Edition — Open Source Information](https://www.zetetic.net/sqlcipher/community/). Consultado el 2026-08-22.
5. QVAC by Tether. [Build an Electron app](https://docs.qvac.tether.io/tutorials/electron/). Consultado el 2026-08-22.
