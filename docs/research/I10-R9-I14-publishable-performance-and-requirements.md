# I10 / R9 / I14 — Rendimiento y requisitos publicables

**Estado:** protocolo de medición; no hay resultados.  
**Decisión:** antes de medir, la UI solo puede describir el procesamiento local y que los requisitos dependen del modelo/equipo; cualquier tiempo, requisito concreto o promesa de disponibilidad queda diferida.  
**Fuentes consultadas:** 2026-08-22.

## 1. Registro de afirmaciones

| Afirmación | Estado ahora | Condición para publicarla |
|---|---|---|
| “El procesamiento se realiza localmente” | Permitida solo si R-7/R-1 la documentan para el flujo mostrado | Mantener alcance preciso; no convertirla en claim de red cero. |
| “El tiempo depende del audio, modelo y equipo” | Permitida | No añadir estimaciones. |
| “Compatible con [hardware/SO]” | No permitida | Resultado reproducible de R-1/R-4. |
| “Usa/No usa GPU” | No permitida | Fuente oficial + prueba de la configuración exacta. |
| “Listo cuando sale el paciente” | No permitida | Estudio definido y resultados publicados. |
| “Instantáneo” | Prohibida | No se transforma en claim medible. |
| Tiempo de transcripción/estructura | Plantilla vacía | Múltiples corridas sintéticas registradas. |
| Pico RAM | Plantilla vacía | Medición de proceso/worker en máquina objetivo. |

QVAC publica requisitos generales y una herramienta de diagnóstico, pero los mínimos del proveedor no son una medida de rendimiento de NotaLocal ni una garantía de capacidad clínica [QVAC, System requirements](https://docs.qvac.tether.io/system-requirements/).

## 2. Copy antes de resultados

Texto permitido:

> “El tiempo de procesamiento depende de la duración del audio, los modelos seleccionados y las capacidades del equipo. NotaLocal muestra el estado de la operación; revise el borrador antes de aprobarlo.”

Texto prohibido: “instantáneo”, “en segundos”, “listo al terminar la consulta”, “funciona en cualquier computadora”, “GPU no requerida” o “GPU obligatoria”, salvo que una fuente y la tabla de resultados correspondan exactamente al claim.

## 3. Protocolo de medición

1. Seleccionar máquinas de clase clínica mediante criterios de uso real (sistema operativo, CPU/GPU, RAM y disco), no un BOM ficticio ni marcas inventadas.
2. Usar solo audio sintético/no clínico, con duración y guion documentados.
3. Fijar versiones de app, SDK, STT y LLM; conservar lockfile y configuración.
4. Ejecutar corridas repetidas con calentamiento definido, orden aleatorio cuando haya más de un modelo y registro de fallos/cancelaciones.
5. Medir transcripción, estructuración y pico de memoria con método descrito; separar descarga inicial de inferencia ya preparada.
6. Publicar métricas solo con rango, contexto y fecha; no extrapolar a equipos no medidos.

## 4. Tabla de resultados

| run_id | date | cpu/gpu | ram | os | stt_model | llm_model | audio_min | t_transcribe | t_structure | peak_ram | outcome |
|---|---|---|---|---|---|---|---:|---:|---:|---:|---|
| BLOCKED — NEEDS TARGET HARDWARE | | | | | | | | | | | |

## 5. Plantillas posteriores

Cuando existan resultados:

> “En [configuración exacta], con audio sintético de [duración], la mediana observada fue [métrica]. Los resultados no garantizan el mismo tiempo en otros equipos.”

No se publicará una media aislada sin variabilidad, modelo, versión y resultado de fallos.

## 6. Decisión

**No publicar números ni requisitos concretos antes de medir.** La pantalla Processing debe dar estado y posibilidad de esperar/cancelar; Requirements solo puede remitir a compatibilidad documentada tras R-1/R-4. Este protocolo es la precondición de cualquier claim cuantitativo.

## Bibliografía

1. QVAC by Tether. [System requirements](https://docs.qvac.tether.io/system-requirements/). Consultado el 2026-08-22.
2. QVAC by Tether. [Download lifecycle](https://docs.qvac.tether.io/models/download-lifecycle/). Consultado el 2026-08-22.
