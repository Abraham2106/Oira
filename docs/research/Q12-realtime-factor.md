# Q12 — Protocolo P1: factor de tiempo real (RTF)

> Estado inicial: **BLOCKED — NEEDS TARGET HARDWARE**. Este documento define una medición; no informa un RTF medido ni promete subtítulos en directo.

## Pregunta de investigación

En el hardware objetivo de demostración, ¿la transcripción por lotes con el STT predeterminado que resulte de Q2 mantiene un factor de tiempo real inferior a 1,0, incluida la pista de caso 10 de Q6? Si se evalúa una ruta de *streaming*, ¿esa ruta produce evidencia independiente suficiente para considerarla candidata, sin extrapolar desde el RTF por lotes?

Los únicos desenlaces permitidos tras ejecutar y revisar los registros son:

1. **batch OK + candidato streaming**;
2. **batch OK, streaming no viable**; o
3. **estadística ausente; usar solo tiempo de pared**, indicándolo explícitamente.

No se elige aquí el modelo STT ni se declara un desenlace.

## Fuentes y dependencias

- [QVAC Transcription](https://docs.qvac.tether.io/ai-capabilities/transcription/) documenta las rutas de transcripción por lotes y por flujo, y muestra que las estadísticas de una sesión pueden ser opcionales.
- [QVAC API reference](https://docs.qvac.tether.io/reference/api/) es la fuente para contrastar la versión instalada, los tipos y la forma de invocación.
- [Q2 — constante STT predeterminada](Q2-stt-default-constant.md) debe identificar y validar la constante a ensayar.
- [Q6 — caso 10 de contexto](Q6-context-case10.md) aporta la pista de caso 10 y su protocolo de reproducibilidad.
- [D1 — auditoría de API QVAC](D1-qvac-api-audit.md) exige contrastar la firma disponible antes de integrar rutas no verificadas.

Antes de medir, registrar versión de QVAC/SDK, commit de la aplicación, modelo y cuantización seleccionados en Q2, SO, CPU, RAM disponible, configuración de energía y cargas concurrentes. La documentación actual muestra estadísticas como `audioDuration` y `realTimeFactor`, pero la disponibilidad y forma exacta en la versión instalada quedan **TODO — VERIFY** con sus tipos y durante la sesión.

## Hipótesis y definición de la métrica

**Hipótesis de trabajo, no resultado:** la combinación que Q2 valide como STT predeterminado podría completar las pistas de demostración con RTF < 1,0 en el hardware objetivo. La hipótesis requiere falsación experimental.

Para una ejecución por lotes, calcular cuando haya datos:

```
RTF de pared = tiempo transcurrido de procesamiento / duración de audio
```

Un valor menor que 1,0 significa que, para ese ensayo, el procesamiento terminó antes que la duración de su audio. Guardar también el `realTimeFactor` que exponga el SDK si está disponible, sin sustituir el cálculo de pared ni asumir que ambos son equivalentes.

La transcripción por lotes y `transcribeStream` son rutas distintas. Un RTF por lotes inferior a 1,0 **no** demuestra que haya subtítulos en vivo, latencia interactiva aceptable ni comportamiento de flujo. Cualquier afirmación sobre *streaming* exige el ensayo separado descrito abajo.

## Corpus y controles

1. Usar las mismas pistas de español aprobadas para Q2, con duración conocida y licencia/consentimiento registrado.
2. Incluir obligatoriamente la pista de **caso 10** definida por Q6.
3. Preservar hash de cada entrada, formato, frecuencia de muestreo, canales y duración medida.
4. Ejecutar calentamiento no contabilizado si la carga inicial forma parte de otra métrica; registrar por separado una carga fría si se desea caracterizarla.
5. Repetir cada condición al menos tres veces, sin cambiar modelo, parámetros, audio ni carga del equipo entre repeticiones.

## Método: transcripción por lotes

1. Resolver el modelo únicamente desde la salida validada de Q2; si Q2 sigue bloqueado, detener este protocolo.
2. Confirmar con la referencia y los tipos instalados el método por lotes y los campos de estadísticas disponibles.
3. Iniciar un reloj monotónico justo antes de la llamada de transcripción y detenerlo al resolver o fallar.
4. Guardar duración de audio, tiempo de pared, estado, salida/errores y, cuando existan, estadísticas reportadas por la sesión.
5. Calcular RTF de pared para cada repetición. No imputar campos ausentes.
6. Repetir con caso 10 y el resto del corpus; conservar trazas suficientes para auditoría sin publicar audio clínico.

### Resultados por lotes

| Pista / caso | Repetición | Duración de audio | Tiempo de pared | RTF de pared | `realTimeFactor` SDK | Estado / evidencia |
|---|---:|---:|---:|---:|---:|---|
| Caso 10 | — | — | — | — | — | **BLOCKED — NEEDS TARGET HARDWARE** |
| Pista adicional | — | — | — | — | — | **BLOCKED — NEEDS TARGET HARDWARE** |
| Pista adicional | — | — | — | — | — | **BLOCKED — NEEDS TARGET HARDWARE** |

## Método: ruta de streaming, separada

Ejecutar esta parte solo después de verificar en los tipos y ejemplos instalados la interfaz de flujo aplicable. No inventar una firma ni adaptar una llamada por lotes.

1. Preparar la entrada incremental según la interfaz verificada de `transcribeStream`.
2. Inyectar el mismo audio (incluido caso 10) a ritmo controlado y registrar hora de envío, eventos recibidos, errores, finalización y estadísticas opcionales.
3. Medir por separado: primer evento útil, finalización y comportamiento ante fragmentos; no derivarlos del RTF por lotes.
4. Marcar “no viable” solo con evidencia de fallo, ausencia de interfaz compatible, o criterio de producto previamente acordado. Marcar “candidato” solo si las ejecuciones independientes satisfacen ese criterio y quedan registradas.

### Resultados de streaming

| Pista / caso | Interfaz verificada | Repetición | Primer evento útil | Finalización | Estadísticas disponibles | Estado / evidencia |
|---|---|---:|---:|---:|---|---|
| Caso 10 | — | — | — | — | — | **BLOCKED — NEEDS TARGET HARDWARE** |
| Pista adicional | — | — | — | — | — | **BLOCKED — NEEDS TARGET HARDWARE** |

## Regla de decisión y bloqueos

- Elegir **batch OK + candidato streaming** únicamente si el lote alcanza el umbral predefinido en el corpus, incluido caso 10, y las pruebas de flujo independientes cumplen sus criterios.
- Elegir **batch OK, streaming no viable** si el lote alcanza el umbral, pero la ruta de flujo no supera su evaluación o no existe una interfaz verificada compatible.
- Elegir **estadística ausente; usar solo tiempo de pared** si `session.stats`, `realTimeFactor` u otros campos no están disponibles: conservar la fórmula de RTF de pared y consignar la ausencia, sin fabricar estadísticas.
- Si Q2 no ha validado el STT por defecto, Q6 no ha preparado caso 10, faltan tipos de la versión instalada o no hay hardware objetivo, mantener el estado **BLOCKED — NEEDS TARGET HARDWARE**.

## Límites

Este protocolo no mide calidad de transcripción, consumo de memoria, latencia clínica de interfaz ni robustez de red. Esas preguntas corresponden a protocolos separados. El resultado tampoco autoriza a afirmar que un flujo es “en vivo” a partir de una medición por lotes.
