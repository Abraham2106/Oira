# Q17 — Forma de salida de Sortformer: ¿objeto tipado o texto?

> **Estado:** investigación de escritorio; sin corrida de SDK.  
> **Fecha de acceso:** 22 de agosto de 2026.  
> **Versión objetivo que debe revalidarse:** `@qvac/sdk@0.17.1`.

## Decisión

Para Oira, la salida de diarización Sortformer se trata como **texto a parsear con el formato del ejemplo oficial**, no como objeto estructurado tipado. No existe evidencia oficial revisada de una operación `diarize()`, ni de un retorno público de `transcribe()` con campos de hablante, inicio y fin para Sortformer.

La única forma admitida, y sólo para el experimento posterior Q11, es reconocer líneas completas con el patrón que usa el ejemplo oficial:

```text
Speaker <índice numérico>: <inicio>s - <fin>s
```

Cualquier diferencia de forma, línea no reconocida, valor temporal no finito, fin anterior al inicio o índice fuera de la política de la UI debe abortar la ruta opcional y no asignar hablantes. La app no debe inferir automáticamente «médico» ni «paciente».

## Evidencia oficial

- **CONFIRMED:** QVAC describe Sortformer como la variante de Parakeet para diarización de hablantes; la documentación señala una secuencia de dos pasos: Sortformer diariza y TDT transcribe cada segmento. [Transcription de QVAC](https://docs.qvac.tether.io/ai-capabilities/transcription/)
- **CONFIRMED:** el ejemplo oficial carga `PARAKEET_SORTFORMER_4SPK_V2_1_Q8_0` y llama a `transcribe({ modelId, audioChunk })`; a la variable resultante la denomina `diarization`. [Ejemplo oficial Sortformer](https://docs.qvac.tether.io/ai-capabilities/transcription/)
- **CONFIRMED:** el mismo ejemplo entrega ese resultado a una función local `parseDiarization(text)`. La función divide por saltos de línea y aplica la expresión regular `/Speaker (\\d+): ([\\d.]+)s - ([\\d.]+)s/`. No recibe un objeto del SDK. [Ejemplo oficial Sortformer](https://docs.qvac.tether.io/ai-capabilities/transcription/)
- **CONFIRMED:** la referencia pública v0.17.x declara que `transcribe()` sin `metadata: true` retorna `Promise<string>`; con `metadata: true` retorna segmentos de transcripción con `text`, `startMs`, `endMs`, `append` e `id`. La documentación de transcripción especifica que la metadata de segmentos es Whisper-only. [API Summary v0.17.x](https://docs.qvac.tether.io/reference/api/) y [Transcription](https://docs.qvac.tether.io/ai-capabilities/transcription/)
- **CONFIRMED, snapshot oficial actual:** la implementación pública de `transcribe` documenta su retorno metadata como «Whisper engine only»; ninguna de sus sobrecargas añade un tipo `DiarizationSegment` o un campo speaker. [Código fuente oficial de `transcribe`](https://github.com/tetherto/qvac/blob/975b36ea3975e98cff8e1d00354bdfaa8da5c93a/packages/sdk/client/api/transcribe.ts)
- **CONFIRMED, snapshot oficial actual:** el contrato de modelos contiene `PARAKEET_SORTFORMER_4SPK_V2_1_Q8_0` como modelo con addon `parakeet` y engine `parakeet-transcription`. [Contrato de modelos de QVAC](https://github.com/tetherto/qvac/blob/975b36ea3975e98cff8e1d00354bdfaa8da5c93a/packages/sdk/contract/models.json)

## Contrato de integración adoptado

Este contrato es una **adaptación de aplicación**, no una firma de QVAC:

```ts
type ParsedDiarizationSegment = {
  speakerIndex: number
  startSeconds: number
  endSeconds: number
}
```

Sólo se construye después de validar una línea textual completa del formato oficial. Se conserva el texto bruto de salida para depuración controlada en datos sintéticos; no se le atribuye semántica clínica ni identidad humana.

| Elemento | Tratamiento |
| --- | --- |
| Índice `Speaker N` | Identificador numérico opaco; no es rol clínico. |
| Inicio/fin en segundos | Intervalo candidato para recortar audio sintético y transcribir con TDT en Q11. |
| Texto del hablante | No lo genera Sortformer en el ejemplo; lo añade la transcripción TDT por cada recorte. |
| Médico/paciente | **Nunca** se deduce desde `N`; sólo vínculo humano explícito, si Q11 resulta viable. |
| Metadatos `TranscribeSegment` | No reutilizar como tipo de Sortformer: la fuente oficial los limita a Whisper. |

## Implementación permitida y prohibida

### Permitida para Q11

- utilizar la constante oficial que exista en el SDK pineado;
- llamar a `transcribe()` de acuerdo con el ejemplo oficial;
- parsear exclusivamente el formato de línea expuesto por ese ejemplo;
- ordenar por inicio y validar intervalos antes de generar recortes;
- mostrar índices como «Hablante 0», «Hablante 1», etc.;
- borrar los WAV temporales sintéticos tras el experimento.

### Prohibida hasta nueva evidencia oficial

- inventar `diarize()`, `getSpeakerSegments()`, `speakerId`, `role`, `confidence`, JSON de diarización o callbacks de hablante;
- asumir que `metadata: true` devuelve hablantes de Parakeet;
- aplicar una regex más permisiva que transforme texto inesperado en datos clínicos;
- etiquetar roles DOCTOR/PATIENT automáticamente;
- usar la salida del parser como evidencia de precisión, idioma, estabilidad o calidad clínica.

## Smoke test diferido

Un smoke test de forma —imprimir `typeof diarization` y una muestra de salida sobre audio **sintético**— sería útil para detectar una divergencia de versión, pero no se ejecutó.

**BLOCKED — NEEDS TARGET SDK/HARDWARE.** Debe realizarse sólo tras confirmar el pin 0.17.1 y no mide calidad. Sus resultados admisibles son:

| Resultado | Acción |
| --- | --- |
| `string` con líneas que cumplen el formato oficial | Mantener este parser estricto; pasar a Q11. |
| `string` con formato distinto | No ampliar el parser por intuición; abrir `TODO: VERIFY FROM OFFICIAL QVAC DOCUMENTATION`. |
| Objeto/array inesperado | Guardar `typeof` y claves, pero no asumir contrato; revisar tipos/docs de esa versión. |
| Error/carga fallida | Registrar error exacto; no cambiar API ni prometer diarización. |

## Consecuencia para el producto

La diarización no pertenece a P0. El producto puede construir su transcript y nota borrador sin roles automáticos. Si Q11 se ejecuta posteriormente, la interfaz puede permitir que una persona vincule un índice visible a «yo» para una consulta, pero debe preservar que la asociación es humana y temporal.

Así se evita el peor error de esta funcionalidad: convertir una asignación numérica o un parser frágil en una atribución clínica incorrecta.

## Límite de versión

Las fuentes de código/contrato del repositorio oficial corresponden al snapshot actual, no demuestran por sí solas la instalación 0.17.1 de Oira. Antes de integrar o ejecutar, se deben revisar los `.d.ts` y el ejemplo distribuidos con ese pin. Si no reproducen la forma textual, el estado vuelve a **TODO: VERIFY FROM OFFICIAL QVAC DOCUMENTATION**.

## Fuentes primarias

1. Tether/QVAC. [Transcription](https://docs.qvac.tether.io/ai-capabilities/transcription/). Consultado el 2026-08-22.
2. Tether/QVAC. [API Summary — v0.17.x](https://docs.qvac.tether.io/reference/api/). Consultado el 2026-08-22.
3. Tether/QVAC. [Código fuente oficial: `transcribe.ts`](https://github.com/tetherto/qvac/blob/975b36ea3975e98cff8e1d00354bdfaa8da5c93a/packages/sdk/client/api/transcribe.ts). Consultado el 2026-08-22.
4. Tether/QVAC. [Contrato de modelos oficial](https://github.com/tetherto/qvac/blob/975b36ea3975e98cff8e1d00354bdfaa8da5c93a/packages/sdk/contract/models.json). Consultado el 2026-08-22.
