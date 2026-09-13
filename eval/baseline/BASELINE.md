# Baseline canónico de evaluación

Esta carpeta es la referencia fija para detectar regresiones del pipeline local
de Oira. No representa una corrida ordinaria.

## Corrida de origen

- Directorio original: `reports/2026-09-13T13-00-31.194Z-e2e-qvac/`
- Inicio: `2026-09-13T13:00:31.194Z`
- Capa y adaptador: `C-e2e` / `qvac`
- Commit de origen: `4409d9594a0875526dd3e4227f6c9461f5e78d0f`
  (`feat(eval): Fase 5 — corpus 19 WAV, WER/CER por categoría y confusiones léxicas`)
- Dataset hash registrado: `f3b9c37f1ad4251264a5a2b2c6ae56915e6b80f4efc0ec000352bab3308ae587`

## Cobertura y métricas observadas

- 19/19 casos WAV; 0 errores de adaptador.
- Pipeline: audio sintético → Whisper QVAC → estructuración Qwen → scoring I4.
- WER/CER: 5.1% / 1.9%.
- Presence accuracy / macro-F1: 83.5% / 0.769.
- Invención léxica: 0.0% (0/19).
- Latencia E2E p50: 48,967.4 ms.

## Identidad de modelo y prompt

El reporte identifica el adaptador `qvac`; el runner de esa versión etiqueta los
modelos como `WHISPER_QVAC_LOCAL` y `QWEN3_4B_Q4_K_M`. `metrics.json` no
preserva una versión/hash de pesos ni el hash del prompt. Esos datos debían
estar en `run.json`, pero el archivo no fue conservado en la corrida de origen.

## Motivo de selección

Es la única corrida E2E completa de las siete históricas: mide STT, la
estructuración sobre la hipótesis real de STT, evidencia de fuente, latencia y
el delta gold-fed→STT-fed para el corpus completo de 19 casos, sin errores de
ejecución. Las demás corridas son parciales, heurísticas, incompletas o no
contienen métricas comparables.
