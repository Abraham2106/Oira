# Q19 — Reintentos con caché KV

**Tipo:** investigación documental + protocolo de laboratorio  
**Estado:** DEFER — requiere hardware objetivo  
**Fecha de consulta:** 2026-08-22

## Pregunta y decisión buscada

Determinar si los reintentos de generación deben usar caché KV y, si lo hacen, bajo qué salvaguardas. La decisión depende de dos propiedades que aún no están medidas: el efecto real sobre el tiempo de reintento y la preservación de la validez del esquema sin filtración de JSON inválido previo.

## Evidencia documental

La documentación de QVAC indica que `kvCache` permite almacenar y reutilizar contexto en turnos posteriores. Acepta una cadena administrada por la aplicación o el valor `true` para una clave automática; con `false` o sin valor no se utiliza caché. La documentación también describe `deleteCache({ kvCacheKey })` para limpiar una clave administrada por la aplicación.

Esta evidencia documenta una capacidad de caché, pero no prueba aceleración para esta instrucción, modelo, dispositivo o política de reintento. Tampoco especifica que la reutilización de caché preserve siempre la validez de un esquema ni que elimine cualquier fragmento de salida inválida anterior. Esas afirmaciones requieren experimento.

Fuentes oficiales:

- [QVAC: generación de texto — historial y kvCache](https://docs.qvac.tether.io/ai-capabilities/text-generation/)
- [QVAC: resumen de API — deleteCache](https://docs.qvac.tether.io/reference/api/)

## Hipótesis a probar

| ID | Hipótesis | Estado |
|---|---|---|
| H1 | Un reintento con clave KV administrada conserva el contexto necesario para la corrección solicitada. | Sin comprobar |
| H2 | El tiempo de reintento con caché mejora o no empeora frente a una ejecución equivalente sin caché. | Sin comprobar |
| H3 | El resultado de reintento sigue validando contra el esquema. | Sin comprobar |
| H4 | Un resultado inválido anterior no aparece como fragmento o contenido filtrado en la salida validada de reintento. | Sin comprobar |
| H5 | La caché de un encuentro puede eliminarse al cerrarlo conforme al protocolo Q16. | Sin comprobar |

## Decisión provisional

**DEFER.** No activar la caché KV específicamente para reintentos hasta que H2, H3, H4 y H5 tengan evidencia en el hardware objetivo. Si se ensaya, usar una clave administrada por la aplicación y vinculada solo a una sesión sintética de prueba; no asumir que `true` provee una clave recuperable para limpieza.

## Protocolo de laboratorio

Precondiciones:

- Versiones exactas de QVAC, aplicación, modelo, sistema operativo y hardware registradas.
- Casos sintéticos con un oráculo de esquema y una política de reintento definida antes de medir.
- Misma instrucción, historial inicial, modelo, parámetros verificados y condiciones de carga para las comparaciones.
- Claves KV únicas de prueba, sin datos clínicos ni identificadores de pacientes.

Pasos:

1. Seleccionar casos que cubran una primera salida válida y una primera salida que la política del producto considere no aceptable. No fabricar ni inyectar JSON inválido en el historial salvo que dicha política lo haga de forma explícita y segura.
2. Medir la primera finalización sin caché y registrar el resultado de validación.
3. Ejecutar el reintento equivalente sin caché, aplicando la misma corrección y midiendo desde la solicitud hasta la finalización.
4. Repetir el escenario con una clave KV administrada, manteniendo constantes todos los elementos no sujetos a prueba.
5. Validar cada salida completa con el mismo esquema; conservar por separado el diagnóstico interno del validador y no mostrarlo como contenido clínico.
6. Buscar en la salida de reintento fragmentos o campos procedentes de una salida previa inválida según una regla de detección acordada.
7. Registrar tiempos, resultados de esquema y errores, sin convertir una observación aislada en promesa de aceleración.
8. Cerrar el encuentro sintético y ejecutar el protocolo Q16 para verificar la eliminación por clave antes de considerar la caché apta para un flujo de encuentro.

## Resultados de laboratorio

**BLOCKED — NEEDS TARGET HARDWARE**

| Caso | Primera finalización sin caché | Reintento sin caché | Reintento con clave KV | Esquema válido en reintento | Fuga de JSON inválido previo | Resultado |
|---|---|---|---|---|---|---|
| — | — | — | — | — | — | Pendiente |

| Ejecución | Modelo/versión | Clave de prueba | Tiempo primera finalización | Tiempo reintento sin caché | Tiempo reintento con caché | Observación de rendimiento |
|---|---|---|---|---|---|---|
| — | — | — | — | — | — | Pendiente |

| Cierre de encuentro sintético | Eliminación por clave según Q16 | Reutilización posterior no esperada | Estado |
|---|---|---|---|
| — | — | — | Pendiente |

## Criterio de cierre

Habilitar caché KV para reintentos solo si:

1. la comparación controlada registra un beneficio o, como mínimo, una ausencia de perjuicio que justifique su complejidad;
2. todas las salidas de reintento cumplen el esquema;
3. no se detecta filtración de contenido de una salida inválida previa; y
4. Q16 demuestra la limpieza por clave al cierre del encuentro.

Si cualquiera falla, mantener reintentos sin caché o devolver la decisión a **DEFER**. No comunicar aceleraciones, garantías de aislamiento ni eliminación de datos sin los resultados de este protocolo.