# R-4 — Presupuesto de memoria y preflight

**Estado:** evidencia documental completada; cifras de RSS, coexistencia de modelos y latencias están **BLOCKED — NEEDS TARGET HARDWARE**.  
**Dependencias:** R-1 fija SDK/paquete; la selección de STT y LLM determina los modelos a medir.  
**Fuentes consultadas:** 2026-08-22.

## 1. Resumen y decisión

QVAC publica requisitos de host y recomienda ejecutar qvac doctor. La documentación indica un mínimo de RAM total, memoria disponible requerida para cargar modelos y espacio libre para artefactos; también describe las plataformas y requisitos GPU/runtime [QVAC, System requirements](https://docs.qvac.tether.io/system-requirements/). El API summary documenta getSystemResources, getModelInfo y loadModel, pero getSystemResources no tiene descripción en la referencia pública consultada. Por tanto, no se presume qué campos o unidades contendrá hasta contrastarlo con los tipos instalados [QVAC, API Summary](https://docs.qvac.tether.io/reference/api/).

**Decisión: DEFER la elección entre cargas secuenciales y concurrentes.** P0 debe diseñarse para cargar modelos de manera secuencial por defecto y tratar el preflight como una protección conservadora, no como garantía. Solo un laboratorio de RSS y latencia sobre hardware real puede autorizar concurrencia o fijar clases de modelo.

## 2. Evidencia documental

QVAC documenta al menos 2 GB de RAM total y recomienda 4 GB; advierte que bajo 4 GB la mayoría de LLM no cargará. Para cargar un modelo, la página menciona 2 GB de RAM disponible; además requiere 5 GB libres en el directorio de trabajo para artefactos que suelen ser de varios GB. En macOS usa Metal; en Linux/Windows establece Vulkan 1.4 o posterior, con una condición específica de Windows incluso para CPU-only [QVAC, System requirements](https://docs.qvac.tether.io/system-requirements/).

El API summary documenta getModelInfo como estado de un modelo de catálogo, incluyendo caché e instancias cargadas. Documenta getSystemResources con una firma, pero sin descripción. Documenta que loadModel devuelve un identificador y un identificador de solicitud. Estos datos permiten planear observabilidad, pero no dan consumo de RAM medido, calidad de preflight ni coste de unload/reload.

## 3. Principio de preflight

El preflight de NotaLocal será código propio en Main. Debe combinar:

1. requisitos mínimos documentados de plataforma, memoria disponible y disco;
2. información de caché/modelo solo cuando las firmas estén confirmadas en los tipos instalados;
3. medición de proceso/worker mediante herramientas del sistema;
4. margen conservador configurable;
5. un resultado propio de permitir, advertir o bloquear.

No debe convertir un valor de API en promesa de que el kernel podrá asignar memoria, ni ignorar otros procesos, GPU, cachés o workers. Cuando una llamada QVAC no esté confirmada en el paquete fijado, la verdad operativa será la medición del SO y se dejará un TODO.

## 4. Matriz de resultados

| Hardware/modelos | Preflight API/tipos | RSS antes | RSS STT | RSS LLM | RSS concurrente | Carga secuencial | Latencia unload/reload | Decisión |
|---|---|---:|---:|---:|---:|---|---|---|
| Hardware objetivo 1 | BLOCKED — NEEDS TARGET HARDWARE | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| Hardware objetivo 2 | BLOCKED — NEEDS TARGET HARDWARE | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| Hardware objetivo 3 | BLOCKED — NEEDS TARGET HARDWARE | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED |

No se insertan MB, segundos, nombre de modelo ni umbrales porque no se ejecutó ninguna carga.

## 5. Protocolo bloqueado

1. Registrar SO, arquitectura, RAM, disco, GPU/driver y salida de qvac doctor con los pins R-1.
2. Copiar de los tipos instalados únicamente las firmas de recursos/modelos que se vayan a invocar.
3. Registrar RSS de proceso principal, renderer y worker antes de cargar; después de STT; después de LLM; y con ambos, si la memoria lo permite.
4. Medir carga secuencial, unload/reload y errores; usar audio/prompts no clínicos.
5. Repetir con binario empaquetado y con procesos ajenos de carga razonable.
6. Contrastar el preflight con los resultados: falsos seguros y falsas alarmas.
7. Elegir concurrente solo si todos los dispositivos objetivo prueban margen y recuperación suficientes; en caso contrario mantener secuencial.

Todos los pasos están **BLOCKED — NEEDS TARGET HARDWARE**.

## 6. Afirmaciones prohibidas

No afirmar que un modelo cabe en una clase de hardware, que getSystemResources predice correctamente OOM, que STT y LLM pueden convivir, ni que la carga secuencial tiene una latencia aceptable. Tampoco convertir mínimos generales del proveedor en requisitos suficientes para NotaLocal.

## 7. Decisión

**DEFER; cargas secuenciales como postura de diseño provisional.** La concurrencia, clases de modelo, umbrales LOW_MEMORY y algoritmos definitivos de preflight requieren resultados RSS y de paquete real. Si no se obtienen, la app debe negar/advertir de forma conservadora y documentar que no soporta esa configuración.

## Bibliografía

1. QVAC by Tether. [System requirements](https://docs.qvac.tether.io/system-requirements/). Consultado el 2026-08-22.
2. QVAC by Tether. [API Summary](https://docs.qvac.tether.io/reference/api/). Consultado el 2026-08-22.
3. QVAC by Tether. [Download lifecycle](https://docs.qvac.tether.io/models/download-lifecycle/). Consultado el 2026-08-22.
