# Q1 — Viabilidad de STT español con `language: 'es'`

> **Tipo:** protocolo de laboratorio P0.  
> **Estado:** **BLOCKED — NEEDS TARGET HARDWARE**. No se ejecutó el SDK ni se declara una ruta viable.  
> **Dependencias:** [D1 — auditoría de API](./D1-qvac-api-audit.md) y [D2 — elegibilidad Whisper](./D2-whisper-spanish-finetunes.md).  
> **Pin requerido:** `@qvac/sdk@0.17.1`.

## Pregunta y resultado permitido

¿La instalación objetivo de QVAC permite una transcripción de prueba en español mediante `language: 'es'` con `WHISPER_TINY` y `WHISPER_SPANISH_TINY_Q8_0`, conservando texto y timestamps útiles?

Q1 sólo podrá terminar con una de estas conclusiones, sustentada por resultados completos:

- **VIABLE:** al menos una constante satisface todos los criterios de aceptación definidos aquí.
- **NOT VIABLE:** ninguna de las dos satisface los criterios, con errores y salidas conservados.
- **BLOCKED:** faltan SDK, modelo, audio sintético, hardware o evidencia de los tipos.

El estado actual es **BLOCKED**. No se infiere una conclusión de los nombres de catálogo ni de documentación de otra versión.

## Hipótesis de trabajo

La hipótesis no comprobada es que alguna de las dos candidatas de D2 podrá procesar un clip médico sintético en español cuando se solicite `language: 'es'`, `translate: false` y `metadata: true`. La prueba busca viabilidad de ruta, no calidad clínica: no estima WER, no elige modelo y no sustituye Q2.

La documentación oficial de QVAC muestra un ejemplo de Whisper con `language: 'en'`, `translate: false` y parámetros de timestamps. Ese ejemplo confirma que esas claves aparecen en el ejemplo actual, pero no prueba que el pin 0.17.1 acepte `'es'` ni que el campo controle la decodificación de las candidatas españolas. [QVAC Transcription](https://docs.qvac.tether.io/ai-capabilities/transcription/)

## Fuentes y límites de evidencia

- **CONFIRMED:** QVAC documenta el ciclo `loadModel()` → `transcribe()` → `unloadModel()`. [QVAC Transcription](https://docs.qvac.tether.io/ai-capabilities/transcription/)
- **CONFIRMED:** `transcribe({ metadata: true })` se documenta como retorno de segmentos con `text`, `startMs`, `endMs`, `append` e `id`; el resultado sin metadata es texto. [QVAC API v0.17.x](https://docs.qvac.tether.io/reference/api/)
- **CONFIRMED, sólo snapshot actual:** D2 registró dos descriptores oficiales de catálogo que deben contrastarse en el pin local: `WHISPER_TINY` y `WHISPER_SPANISH_TINY_Q8_0`. [D2](./D2-whisper-spanish-finetunes.md)
- **TODO: VERIFY FROM OFFICIAL QVAC DOCUMENTATION:** firma exacta de `modelConfig` en 0.17.1, aceptación de `language: 'es'`, valor/tipo de `translate` y exportación de ambas constantes. La autoridad es `node_modules/@qvac/sdk` de la máquina de prueba.

No se usarán model cards, benchmarks externos ni clips reales para decidir este protocolo.

## Preparación controlada

### 1. Verificación de instalación

Antes de crear o descargar cualquier modelo:

```bash
npm ls @qvac/sdk
node -p "require('./node_modules/@qvac/sdk/package.json').version"
```

Registrar versión, SO, arquitectura, CPU/GPU, memoria disponible, versión de Node y hash de los archivos de tipos revisados. Si la versión no es 0.17.1, detener: no trasladar este protocolo a otra versión sin actualizar D1/D2.

Inspeccionar las declaraciones distribuidas de la instalación para confirmar, sin modificar código de producto:

- exportación de `WHISPER_TINY` y `WHISPER_SPANISH_TINY_Q8_0`;
- opciones exactas de carga de Whisper;
- existencia y retorno de `transcribe` con `metadata: true`;
- literal de engine/tipo sólo si el descriptor no permite inferencia;
- errores relevantes.

### 2. Audio de prueba

Crear un WAV **sintético**, mono, 16 kHz PCM, de 15–30 segundos. Debe contener exactamente:

- un síntoma;
- una negación explícita: «no he tenido fiebre»;
- al menos un nombre de medicamento;
- ninguna instrucción para el modelo ni dato de paciente real.

Ejemplo de guion, sólo para construir ground truth: «Desde ayer tengo dolor de garganta. No he tenido fiebre. Tomé paracetamol de quinientos miligramos». Adaptar el texto sólo si la pronunciación sintética es clara; fijar el texto definitivo y su hash antes de correr.

Guardar junto al protocolo, fuera de cualquier repositorio público si el proveedor de voz impone términos incompatibles, estos metadatos: guion, generador/voz, sample rate, canales, duración, SHA-256 y licencia. No usar audio de consultas reales.

### 3. Configuraciones a comparar

| ID | Constante | Parámetros solicitados | Estado previo |
| --- | --- | --- | --- |
| Q1-A | `WHISPER_TINY` | `language: 'es'`, `translate: false`, `metadata: true` | **BLOCKED — NEEDS TARGET HARDWARE** |
| Q1-B | `WHISPER_SPANISH_TINY_Q8_0` | `language: 'es'`, `translate: false`, `metadata: true` | **BLOCKED — NEEDS TARGET HARDWARE** |

No añadir `initial_prompt`: es objeto de Q7. No activar streaming: no responde a la pregunta y D1 lo excluye de P0.

## Procedimiento de ejecución

1. Confirmar el pin y los tipos, registrando copia o hash de las definiciones pertinentes.
2. Precargar únicamente el descriptor oficial de la configuración A. Si hay descarga, registrar que ocurrió; no mezclar tiempo de descarga con esta prueba de viabilidad.
3. Ejecutar la transcripción batch con el WAV sintético y `metadata: true`.
4. Guardar el resultado bruto, incluidos todos los segmentos y el error exacto si falla.
5. Verificar mecánicamente los criterios de aceptación de A.
6. Descargar el modelo y repetir los pasos 2–5 con B.
7. No comparar calidad ni elegir default. Q1 concluye la viabilidad de la ruta, y Q2 hace la evaluación de los 13 casos.
8. Borrar los archivos temporales de audio y revisar que los artefactos archivados contienen sólo material sintético.

## Criterios de aceptación

Una configuración satisface Q1 sólo si cumple simultáneamente:

| Criterio | Método de verificación | Resultado actual |
| --- | --- | --- |
| La llamada completa sin error | Capturar código/mensaje y estado final | **BLOCKED — NEEDS TARGET HARDWARE** |
| La salida es observablemente español | Comparar con el guion; registrar salida literal | **BLOCKED — NEEDS TARGET HARDWARE** |
| Aparece al menos un token médico guionizado | Buscar token definido antes de correr, sin normalizar silenciosamente | **BLOCKED — NEEDS TARGET HARDWARE** |
| Se conserva la negación o se puede inspeccionar su ausencia | Comparar con «no he tenido fiebre» | **BLOCKED — NEEDS TARGET HARDWARE** |
| Existen segmentos con timestamps utilizables | Inspeccionar `id`, `startMs`, `endMs`, `text`, `append`; verificar intervalos finitos y ordenables | **BLOCKED — NEEDS TARGET HARDWARE** |

La negación no es aún una métrica bloqueante de calidad en Q1; se registra porque Q2 deberá evaluarla sistemáticamente. Para Q1, una salida que omita toda la negación debe quedar visible, no corregirse a mano.

## Tabla de resultados vacía

| Corrida | SDK / SO / arquitectura | Constante y checksum local | `language` / `translate` | ¿Llamada OK? | Salida literal | Token médico | Negación observada | Segmentos/timestamps | Error exacto | Conclusión |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Q1-A | **BLOCKED — NEEDS TARGET HARDWARE** |  |  |  |  |  |  |  |  |  |
| Q1-B | **BLOCKED — NEEDS TARGET HARDWARE** |  |  |  |  |  |  |  |  |  |

## Árbol de decisión

| Observación | Acción |
| --- | --- |
| Una configuración cumple todos los criterios | Marcar **VIABLE** sólo en el artefacto completado y habilitar Q2 con esa configuración como candidata, sin declararla default. |
| `language: 'es'` es rechazado | Copiar error exacto. No inventar lista de códigos ni sustituir el campo. Investigar la definición de tipo/documentación antes de reintentar. |
| El campo se acepta pero se ignora y el resultado sigue en español | Documentar ruta viable condicional; no afirmar que `language` sea un control confirmado. |
| No hay timestamps o no son utilizables | La ruta no cumple el requisito de grounding de Oira; escalar como bloqueo aunque haya texto. |
| Ambas configuraciones fallan | Marcar **NOT VIABLE** para este par de candidatas y detener el P0 de español hasta una decisión documentada. |
| No hay SDK/hardware/clip | Mantener **BLOCKED**. |

## Artefactos que deben conservarse

- `run.json`: versión, máquina, hash de tipos, configuración efectiva y timestamp;
- `input.json`: sólo referencia/hash del audio sintético y guion;
- `result.json`: salida completa o error exacto;
- `segments.json`: segmentos sin transformación;
- una breve nota de limpieza de archivos temporales.

No almacenar datos de pacientes, audio real, tokens de acceso ni logs con contenido clínico.

## Salida hacia Q2

Q2 puede comenzar sólo si Q1 registra al menos una candidata viable con timestamps utilizables. Incluso en ese caso, Q1 no prueba fármacos, dosis, negaciones, acentos ni fidelidad de transcripción: esos son criterios comparativos de Q2.

## Fuentes

1. Tether/QVAC. [Transcription](https://docs.qvac.tether.io/ai-capabilities/transcription/). Consultado el 2026-08-22.
2. Tether/QVAC. [API Summary — v0.17.x](https://docs.qvac.tether.io/reference/api/). Consultado el 2026-08-22.
3. [D1 — Auditoría de API QVAC](./D1-qvac-api-audit.md).
4. [D2 — Elegibilidad Whisper español](./D2-whisper-spanish-finetunes.md).
