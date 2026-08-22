# R-6 — Autenticación del sistema operativo y directorios restrictivos

**Estado:** investigación documental completada. Los prompts reales de autenticación, la inspección de permisos efectivos y la portabilidad están **BLOCKED — NEEDS TARGET HARDWARE**.  
**Fuentes consultadas:** 2026-08-22.  
**Dependencias:** R-5 para las reglas de clave y cifrado; R-1 para las versiones reales de Electron.

## 1. Resumen y decisión

La API oficial de Electron documenta autenticación Touch ID únicamente para macOS mediante systemPreferences. La función de prompt resuelve si la persona se autentica, pero Electron advierte expresamente que esa API por sí sola no protege los datos; una app nativa tendría que asociar un secreto con controles de acceso del Keychain [Electron, systemPreferences](https://www.electronjs.org/docs/latest/api/system-preferences).

No se encontró en la superficie oficial de Electron consultada una API equivalente documentada para Windows Hello o autenticación biométrica Linux. La ausencia en esta página no demuestra que sea imposible con módulos nativos o integraciones específicas; demuestra que no existe una base oficial de Electron suficiente para implementarla en P0 sin investigación adicional.

Para directorios, Node permite establecer modos POSIX, pero documenta que en Windows solo puede manipularse el permiso de escritura y no distingue owner, group y others. Windows usa descriptores de seguridad y DACLs; su control correcto requiere ACLs, no una llamada portable a chmod [Node.js, File system](https://nodejs.org/api/fs.html), [Microsoft, File Security and Access Rights](https://learn.microsoft.com/en-us/windows/win32/fileio/file-security-and-access-rights).

**Decisión: P0 = PIN local; no ofrecer desbloqueo biométrico/OS en el MVP.** Crear los directorios de datos desde Main con permisos restrictivos en POSIX, pero no afirmar equivalencia Windows hasta aplicar y verificar una DACL en equipos reales. Touch ID queda como posible trabajo posterior, separado del PIN y nunca como almacenamiento de biometría por NotaLocal.

## 2. Alcance de seguridad

El PIN local gobierna la sesión de la aplicación; no sustituye cifrado en reposo y no almacena biometría. El sistema operativo es quien realiza cualquier autenticación biométrica. Las credenciales biométricas no se solicitan, transmiten ni persisten por NotaLocal.

La autenticación de SO no debe presentarse como protección frente a una sesión de usuario ya comprometida. Si el usuario ya está autenticado en el sistema, una app maliciosa o proceso con los mismos privilegios puede estar fuera del modelo que un simple prompt de UI resuelve. Electron recomienda, además, aislamiento de contexto, no exponer Node a contenido no confiable y validar IPC [Electron, Security](https://www.electronjs.org/docs/latest/tutorial/security).

## 3. Evidencia por plataforma

| Plataforma | Hecho documental | Conclusión permitida | No se puede afirmar |
|---|---|---|---|
| macOS | Electron documenta canPromptTouchID y promptTouchID en Main/Utility; el segundo resuelve cuando hay autenticación. | Puede investigarse como desbloqueo opcional posterior. | Que el prompt cifre datos o que sustituya un PIN. |
| Windows | La API systemPreferences consultada no documenta Windows Hello. | No se implementa Windows Hello en P0 con esta evidencia. | Que Windows Hello no sea posible por ningún otro mecanismo. |
| Linux | La API systemPreferences consultada no documenta PAM/keyring/biometría como desbloqueo. | No se implementa biometría Linux en P0. | Que no exista ninguna integración nativa fuera de Electron. |
| POSIX | Node expone modos de archivo/directorio y chmod. | Se puede diseñar creación restrictiva en POSIX desde Main. | Que el resultado efectivo sea idéntico bajo toda umask, volumen o distribución. |
| Windows ACL | Microsoft documenta que archivos/directorios tienen descriptor de seguridad y que una DACL decide el acceso. | El endurecimiento Windows requiere aplicar/leer una ACL real. | Que chmod de Node cree una ACL privada equivalente. |

## 4. Touch ID: alcance exacto

Electron documenta que canPromptTouchID informa si el dispositivo puede solicitar Touch ID y que promptTouchID recibe un motivo y resuelve si la autenticación tiene éxito. La misma documentación especifica que la API no protege datos; para que leer una clave dispare consentimiento biométrico, una app nativa necesita un elemento de Keychain con controles de acceso adecuados [Electron, systemPreferences](https://www.electronjs.org/docs/latest/api/system-preferences).

Por ello, el flujo futuro no sería “Touch ID desbloquea notas” como promesa genérica. Sería, si se implementa y se prueba: el usuario conserva un PIN; el SO confirma presencia; un almacén de claves probado autoriza recuperar una clave concreta. Esa clave y su relación con R-5 no se diseñan aquí ni se asumen disponibles.

## 5. Directorios y permisos

En POSIX, el helper de aplicación puede crear la carpeta de datos con un modo restrictivo y después comprobarlo. Es una medida de defensa local que acompaña, no reemplaza, la protección del sistema y el cifrado cuando exista.

En Windows, Node advierte que chmod solo modifica escritura y no implementa la distinción owner/group/others. Microsoft describe que la DACL contiene entradas por trustee y derechos, y que los descriptores se consultan/modifican con APIs de seguridad de Windows. Por tanto, una DACL vacía o equivocada no es un detalle de implementación: puede producir denegación total o acceso demasiado amplio [Microsoft, Access Control Lists](https://learn.microsoft.com/en-us/windows/win32/secauthz/access-control-lists).

**Recomendación provisional de helper propio:**

1. Resolver una única ruta de datos desde Main; nunca aceptar una ruta arbitraria del renderer.
2. En POSIX, crear directorio y archivos nuevos con modo restrictivo y verificar sus metadatos tras crear.
3. En Windows, conservar por defecto el descriptor heredado del perfil de usuario hasta disponer de una biblioteca/API revisada que aplique una DACL mínima.
4. Exponer al renderer solo resultados de alto nivel, no handles, rutas de clave ni APIs de permisos.
5. Registrar errores técnicos sin nombres de pacientes ni contenido clínico.

No se aporta código de ACL ni de Touch ID porque un sketch no verificado podría sugerir portabilidad o semántica que las fuentes no garantizan.

## 6. Protocolo bloqueado

| Caso | Resultado requerido |
|---|---|
| macOS con Touch ID | Disponibilidad, éxito/cancelación/error del prompt y que el PIN siga siendo obligatorio según la política. **BLOCKED — NEEDS TARGET HARDWARE** |
| Windows | Verificar que no se ofrece Windows Hello sin una integración validada; inspeccionar DACL de directorio y herencia. **BLOCKED — NEEDS TARGET HARDWARE** |
| Linux | Crear directorio, inspeccionar modo/propietario, probar con otra cuenta cuando sea posible y registrar umask. **BLOCKED — NEEDS TARGET HARDWARE** |
| macOS/Linux POSIX | Crear archivos nuevos, reiniciar, comprobar que el modo restrictivo no se relaja por migración o recuperación. **BLOCKED — NEEDS TARGET HARDWARE** |
| Windows ACL | Aplicar solo una DACL revisada, volver a leerla y probar acceso con usuario distinto; conservar logs no clínicos. **BLOCKED — NEEDS TARGET HARDWARE** |

## 7. Afirmaciones prohibidas

No usar “biometría segura” o “Windows Hello compatible”; no decir que NotaLocal almacena biometría; no indicar que el PIN cifra la base; no llamar a chmod una solución ACL de Windows; ni prometer que otros usuarios del equipo nunca podrán leer archivos hasta ejecutar las pruebas correspondientes.

## 8. Pendientes

- TODO: VERIFY FROM TARGET HARDWARE: Touch ID real, cancelación, errores y versión Electron fijada.
- TODO: VERIFY FROM TARGET HARDWARE: modo POSIX efectivo bajo umask y volúmenes reales.
- TODO: VERIFY FROM TARGET HARDWARE: DACL/ACL de Windows, herencia y acceso de otra cuenta.
- TODO: VERIFY FROM R-5: si un secreto de clave necesita safeStorage/Keychain.
- TODO: VERIFY FROM SECURITY REVIEW: cualquier binding nativo para Windows Hello, Keychain avanzado o ACL.

## 9. Decisión

**PIN local obligatorio; autenticación del SO y biometría fuera de P0.**  
En POSIX se preparará creación restrictiva de directorios desde Main y se verificará en laboratorio. En Windows se evita prometer endurecimiento portado por chmod; la DACL será investigación/implementación posterior y validada. Touch ID solo puede volver como desbloqueo adicional tras una prueba de Keychain y UX real, nunca como sustituto automático del PIN ni como afirmación de cifrado.

## Bibliografía

1. Electron. [systemPreferences](https://www.electronjs.org/docs/latest/api/system-preferences). Consultado el 2026-08-22.
2. Electron. [Security](https://www.electronjs.org/docs/latest/tutorial/security). Consultado el 2026-08-22.
3. Node.js. [File system](https://nodejs.org/api/fs.html). Consultado el 2026-08-22.
4. Microsoft. [File Security and Access Rights](https://learn.microsoft.com/en-us/windows/win32/fileio/file-security-and-access-rights). Consultado el 2026-08-22.
5. Microsoft. [Access Control Lists](https://learn.microsoft.com/en-us/windows/win32/secauthz/access-control-lists). Consultado el 2026-08-22.
