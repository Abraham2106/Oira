# R-9 — Empaquetado, plataformas y firma

**Estado:** investigación documental completada; builds, instalación y firma reales están **BLOCKED — NEEDS TARGET HARDWARE**.  
**Dependencias:** R-1 debe confirmar el paquete QVAC y sus pins.  
**Fuentes consultadas:** 2026-08-22.

## 1. Resumen y decisión

QVAC documenta que su plugin Forge fuerza asar desactivado, poda prebuilds para el objetivo y bloquea macOS universal; los builds arm64 y x64 se deben generar por separado [QVAC, Build an Electron app](https://docs.qvac.tether.io/tutorials/electron/). Electron recomienda firmar distribuciones y explica que Windows y macOS pueden dificultar el lanzamiento de apps sin firma; Apple describe Developer ID y notarización como pasos para distribución macOS fuera de App Store [Electron, Code Signing](https://www.electronjs.org/docs/latest/tutorial/code-signing), [Apple, Developer ID](https://developer.apple.com/developer-id/).

Estos documentos definen restricciones y rutas posibles; no prueban que NotaLocal tenga certificados, artefactos ejecutables, firma válida, notarización, instalación sin advertencias ni soporte multiplataforma.

**Decisión: DEFER soporte de plataforma y firma.** La demo debe limitarse a los hosts/arquitecturas que R-1 empaquete y ejecute. Sin artefacto firmado probado, el README debe dar instrucciones honestas y anticipar que el SO puede advertir o impedir la ejecución.

## 2. Matriz documental

| Tema | Evidencia | Estado de NotaLocal |
|---|---|---|
| asar | QVAC lo fuerza desactivado para worker/addons. | Documentado como restricción; package real bloqueado. |
| macOS universal | QVAC lo bloquea por prebuilds de arquitectura. | No soportado como objetivo único. |
| macOS arm64/x64 | QVAC documenta builds separados. | BLOCKED — NEEDS TARGET HARDWARE |
| Linux/Windows | QVAC documenta empaquetado por plataforma/arquitectura según prebuilds. | BLOCKED — NEEDS TARGET HARDWARE |
| Firma Windows/macOS | Electron documenta code signing como vía para autenticar origen y reducir avisos. | No ejecutado, no afirmable. |
| Notarización macOS | Apple documenta proceso posterior a firma Developer ID. | No ejecutado, no afirmable. |

Asar desactivado no equivale a código oculto, protección de datos, firma ni seguridad.

## 3. Plan de demo provisional

La única promesa defendible antes de laboratorio es: “La plataforma de demo se anunciará según el artefacto que se haya probado.” No se incluyen todas las combinaciones de escritorio solo porque la documentación enumere soporte potencial.

La firma certifica origen/integridad según el esquema del SO; no certifica privacidad clínica, cifrado, cumplimiento regulatorio ni ausencia de vulnerabilidades. Notarización tampoco debe convertirse en esas afirmaciones.

## 4. Protocolo bloqueado

1. Partir de R-1 exitoso y repetir package por plataforma/arquitectura requerida.
2. Registrar configuración, lockfile, asar efectivo, prebuilds, tamaño y hash.
3. Instalar y lanzar en equipo limpio/no de desarrollo; guardar advertencias, errores y pasos reales.
4. Para macOS, crear arm64/x64 por separado y probar firma/notarización solo con credenciales autorizadas.
5. Para Windows, firmar instalador/artefacto solo con certificado autorizado y registrar UX.
6. Publicar en README únicamente soporte y pasos que hayan sido probados.

Todos los pasos están **BLOCKED — NEEDS TARGET HARDWARE**; no se dispone de certificados ni se intenta firmar.

## 5. Afirmaciones prohibidas

No decir que el binario está firmado, notarizado, libre de advertencias, listo para producción o soportado en macOS/Linux/Windows. No decir que asar desactivado protege archivos ni que firma implica HIPAA o seguridad de datos.

## 6. Decisión

**DEFER.** Soporte para demo y firma quedan pendientes de builds instalados. Si no existe firma, se distribuye solo como demo explícitamente sin afirmar UX limpio o confianza del sistema.

## Bibliografía

1. QVAC by Tether. [Build an Electron app](https://docs.qvac.tether.io/tutorials/electron/). Consultado el 2026-08-22.
2. Electron. [Code Signing](https://www.electronjs.org/docs/latest/tutorial/code-signing). Consultado el 2026-08-22.
3. Electron. [Application Packaging](https://www.electronjs.org/docs/latest/tutorial/application-distribution). Consultado el 2026-08-22.
4. Apple. [Developer ID — Signing Your Apps for Gatekeeper](https://developer.apple.com/developer-id/). Consultado el 2026-08-22.
