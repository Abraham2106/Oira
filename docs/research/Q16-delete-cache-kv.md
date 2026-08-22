# Q16 — Eliminación de caché KV al cerrar el encuentro

**Tipo:** investigación documental + protocolo de laboratorio  
**Estado:** DEFER — requiere validación en hardware objetivo  
**Fecha de consulta:** 2026-08-22

## Pregunta y decisión buscada

Determinar si el cierre de un encuentro debe borrar la caché KV asociada mediante una clave específica. La decisión no se adopta todavía: el uso de una eliminación por clave queda condicionado a que el laboratorio demuestre su alcance y a que no afecte los artefactos del modelo necesarios para operar.

## Evidencia documental

La documentación oficial de QVAC describe el parámetro `kvCache` como una caché para reutilizar contexto entre turnos. Cuando se proporciona una cadena no vacía, la clave es administrada por la aplicación y la documentación indica que puede reutilizarse o limpiarse con `deleteCache({ kvCacheKey })`. El mismo documento distingue `true` (clave automática, sin una clave estable que la aplicación gestione) de `false` o ausencia de parámetro (sin caché).

La referencia de API documenta que `deleteCache` elimina archivos de caché KV y admite dos formas: una eliminación amplia con `{ all: true }` o una eliminación por `kvCacheKey`, opcionalmente acotada a un modelo. La referencia no establece en esta evidencia que la eliminación amplia borre pesos del modelo; por tanto, no se puede afirmar ni descartar ese efecto sin observación controlada. Su alcance más amplio es motivo suficiente para no recomendarla para un cierre de encuentro.

Fuentes oficiales:

- [QVAC: generación de texto — kvCache](https://docs.qvac.tether.io/ai-capabilities/text-generation/)
- [QVAC: resumen de API — deleteCache](https://docs.qvac.tether.io/reference/api/)

## Hipótesis a probar

| ID | Hipótesis | Estado |
|---|---|---|
| H1 | Una clave KV administrada por la aplicación puede identificarse y eliminarse al cerrar un encuentro. | Sin comprobar |
| H2 | La eliminación por clave afecta solamente a los archivos de caché de esa clave y no obliga a redescargar o reconstruir los artefactos del modelo. | Sin comprobar |
| H3 | `{ all: true }` tiene un alcance mayor que el requerido para un único encuentro. | Documentado en la forma de la API; impacto de archivos sin comprobar |
| H4 | La desaparición de un texto marcador de la caché no demuestra borrado seguro. | Limitación de seguridad; no debe inferirse borrado seguro |

## Decisión provisional

**DEFER.** La opción candidata es una clave KV administrada por encuentro y una eliminación por esa misma clave, pero únicamente después de confirmar H1 y H2. No usar `{ all: true }` en el flujo clínico: su ámbito es más amplio y no hay prueba de que preserve los artefactos del modelo. Tampoco se afirma borrado seguro, eliminación forense ni cumplimiento regulatorio.

## Protocolo de laboratorio

Precondiciones:

- Hardware objetivo, versión exacta de QVAC, aplicación y modelo registrados.
- Entorno desechable, cuenta de prueba y entradas exclusivamente sintéticas.
- Inventario previo de directorios, tamaños, hashes cuando sea posible y estado de disponibilidad local del modelo.
- Una política explícita para asignar una clave única de prueba; no publicar ni reutilizar identificadores de pacientes.

Pasos:

1. Crear un encuentro sintético y una clave KV de prueba no clínica.
2. Ejecutar una generación con un marcador sintético único en el prefijo y con esa clave.
3. Registrar trazas de la aplicación y un inventario de archivos/directorios de caché permitido por el entorno.
4. Cerrar el encuentro y llamar a la eliminación por `kvCacheKey` solamente si la versión instalada expone la forma documentada.
5. Repetir el inventario y buscar el marcador únicamente en los artefactos de prueba autorizados.
6. Reiniciar el proceso y verificar si el modelo continúa disponible localmente, registrando cualquier descarga, reconstrucción o error.
7. En un entorno aislado distinto, evaluar `{ all: true }` solo para caracterizar su alcance; no mezclarlo con datos clínicos ni usarlo como comportamiento del producto.
8. Revisar que ninguna observación se interprete como borrado seguro.

## Resultados de laboratorio

**BLOCKED — NEEDS TARGET HARDWARE**

| Ejecución | Versión QVAC/modelo | Clave de prueba | Eliminación por clave | Marcador antes/después | Modelo preservado | Re-descarga/reconstrucción | Resultado |
|---|---|---|---|---|---|---|---|
| — | — | — | — | — | — | — | Pendiente |

| Ejecución aislada | Uso de `{ all: true }` | Archivos KV observados | Efecto sobre artefactos del modelo | Resultado |
|---|---|---|---|---|
| — | — | — | — | Pendiente |

## Criterio de cierre

Aceptar la eliminación por clave solo si el experimento identifica el efecto esperado para la clave de prueba, preserva la operación local del modelo y no introduce errores de cierre. Si cualquiera de esos puntos falla o no puede observarse, conservar **DEFER** y no activar la caché para datos de encuentro.