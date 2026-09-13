/** Render REPORT.md + metrics/cases/errors.json from a completed run artifact. */

function pct(n, d) {
  if (d === 0 || d === null || d === undefined || n === null || n === undefined) {
    return "N/A"
  }
  return `${((100 * n) / d).toFixed(1)}% (${n}/${d})`
}

function fmt(n, digits = 1) {
  if (n === null || n === undefined || Number.isNaN(n)) return "N/A"
  return typeof n === "number" ? n.toFixed(digits) : String(n)
}

function evidence(kind, text) {
  return `**${kind}.** ${text}`
}

export function buildArtifacts(run) {
  const s = run.summary
  const metrics = {
    evidence_rule: "medido | observado | inferido | no_probado",
    run_id: run.metadata.runId,
    layer: run.metadata.layer,
    presence: s.presence,
    invention: s.invention,
    mustIncludeCoverage: s.mustIncludeCoverage,
    productEmittedRate: s.productEmittedRate,
    rawJsonValidRate: s.rawJsonValidRate,
    statedWithoutSource: s.statedWithoutSource,
    sourceIdFailureCases: s.sourceIdFailureCases,
    latency: s.latency,
    stt: s.stt,
    cases: s.cases,
    errors: s.errors,
  }

  const cases = run.results.map((r) => ({
    id: r.id,
    category: r.category,
    error: r.evaluation.error,
    latencyMs: r.evaluation.latencyMs,
    productEmitted: r.evaluation.productEmitted,
    rawJsonValid: r.evaluation.rawJsonValid,
    presenceAccuracy: r.evaluation.presence.accuracy,
    inventionHits: r.evaluation.mustNotContainHits,
    mustInclude: r.evaluation.mustInclude,
    statedWithoutSource: r.evaluation.statedWithoutSource,
    sourceIdsOk: r.evaluation.verifySourceOk,
    presencePairs: r.evaluation.presencePairs,
  }))

  const errors = run.results
    .filter(
      (r) =>
        r.evaluation.error ||
        r.evaluation.invention ||
        !r.evaluation.verifySourceOk,
    )
    .map((r) => ({
      id: r.id,
      error: r.evaluation.error,
      inventionHits: r.evaluation.mustNotContainHits,
      invalidSourceIds: r.evaluation.invalidSourceIds,
      presenceMismatches: r.evaluation.presencePairs.filter((row) => row.gold !== row.pred),
    }))

  return { metrics, cases, errors, reportMarkdown: renderReport(run) }
}

export function renderReport(run) {
  const { metadata: m, summary: s, results } = run
  if (run.error) {
    return `# Oira eval report — \`${m.runId}\`

${m.startedAt} · capa \`${m.layer}\` · adapter \`${m.adapter}\`

> ⛔ **Run bloqueado** — ${run.error}

${evidence("No probado", "La corrida no produjo resultados; ningún número de esta capa es 'medido'.")}
`
  }

  const matrix = s.presence.matrix

  const matrixRows = ["STATED", "NOT_STATED", "UNKNOWN"]
    .map((actual) => {
      const cells = ["STATED", "NOT_STATED", "UNKNOWN"]
        .map((predicted) => matrix[actual][predicted])
        .join(" | ")
      return `| ${actual} | ${cells} |`
    })
    .join("\n")

  const classRows = ["STATED", "NOT_STATED", "UNKNOWN"]
    .map((label) => {
      const c = s.presence.byClass[label]
      return `| ${label} | ${fmt(c.precision, 3)} | ${fmt(c.recall, 3)} | ${fmt(c.f1, 3)} | ${c.support} |`
    })
    .join("\n")

  const caseRows = results
    .map((r) => {
      const pa =
        r.evaluation.presence.n === 0
          ? "N/A"
          : pct(r.evaluation.presence.correct, r.evaluation.presence.n)
      return `| ${r.id} | ${fmt(r.evaluation.latencyMs)} | ${pa} | ${
        r.evaluation.mustNotContainHits.join(", ") || "—"
      } | ${r.evaluation.error ?? "ok"} |`
    })
    .join("\n")

  const productOk =
    s.productEmittedRate === null ? null : Math.round(s.productEmittedRate * s.cases)

  const stage = m.stage ?? (m.skipStt ? "off" : "sttOnly")
  const skipStt = stage === "off"
  const sttOnly = stage === "sttOnly"
  const e2e = stage === "e2e"
  const classify = skipStt || e2e // presencia/invención/etc. medidos
  const datasetCases = m.datasetCases ?? s.cases
  const skippedNoAudio = s.skippedNoAudio ?? 0

  const layerLabel = skipStt
    ? `Capa A (\`--skip-stt\`): estructuración sobre transcripción gold; STT no ejecutado.`
    : sttOnly
      ? `Capa B (\`--with-stt\`): solo STT sobre WAV; estructuración no ejecutada.`
      : `Capa C (\`--e2e\`, default): audio → STT → estructuración sobre la hipótesis de Whisper.`

  const sttRow = (label, value) =>
    `| ${label} | ${value} |`

  const sttDenom = m.datasetCases
    ? `${s.stt.cases}/${m.datasetCases}`
    : `${s.stt.cases}`

  const sttBlock =
    s.stt.status === "medido"
      ? `\n### Speech-to-text (STT)

| Métrica | Valor |
| --- | ---: |
${sttRow("WER", `${fmt(s.stt.meanWer * 100, 1)}%`)}
${sttRow("CER", `${fmt(s.stt.meanCer * 100, 1)}%`)}
${sttRow("Transcribe success", pct(s.stt.cases - s.stt.emptyTranscriptCount, s.stt.cases))}
${sttRow("Negación drop / add (heurística)", `${s.stt.negationDrops} / ${s.stt.negationAdds}`)}
\n${evidence("Medido", `WER/CER sobre ${sttDenom} casos (WAV). Negación = recuento de tokens 'no', no es juicio clínico.`)}`
      : skipStt
        ? `\n${evidence("No probado", "STT no ejecutado (--skip-stt)")}`
        : `\n${evidence("No probado", "Sin transcripción STT medida en esta corrida.")}`

  const presenceLabel = e2e ? "Presence accuracy (I4, sobre hipótesis STT)" : "Presence accuracy (I4)"

  const latencyRows = e2e
    ? `| Latency structure p50 (ms) | ${fmt(s.structureLatency?.p50)} |\n| Latency E2E p50 (ms) | ${fmt(s.latency.p50)} |`
    : `| Latencia p50 (ms) | ${fmt(s.latency.p50)} |`

  const deltaBlock = e2e
    ? `\n### Delta presence gold-fed → STT-fed

Mismos casos, mismo gold; la única diferencia es si Qwen recibe la transcripción gold o la hipótesis de Whisper.

| Caso | STT-fed acc | gold-fed acc | Δ |
| --- | ---: | ---: | ---: |
${results
  .map((r) => {
    const sttAcc = r.evaluation.presence.n === 0 ? "N/A" : pct(r.evaluation.presence.correct, r.evaluation.presence.n)
    const goldAcc = r.baselinePresence?.n
      ? pct(r.baselinePresence.correct, r.baselinePresence.n)
      : "N/A"
    const delta =
      r.evaluation.presence.n && r.baselinePresence?.n
        ? `${((r.evaluation.presence.accuracy - r.baselinePresence.accuracy) * 100).toFixed(1)}pp`
        : "N/A"
    return `| ${r.id} | ${sttAcc} | ${goldAcc} | ${delta} |`
  })
  .join("\n")}

Agregado: macro-F1 STT-fed ${fmt(s.presence.macroF1, 3)} · gold-fed ${fmt(s.baselinePresence?.macroF1, 3)}
\n${evidence("Medido", `Sobre los ${results.length} casos con WAV en esta corrida.`)}`
    : ""

  const classificationBlock =
    classify && s.presence.matrix
      ? `### Clasificación (presencia por sección I4)

| Clase | Precision | Recall | F1 | Support |
| --- | ---: | ---: | ---: | ---: |
${classRows}

Matriz de confusión (filas = gold, columnas = predicted):

| gold \\ pred | STATED | NOT_STATED | UNKNOWN |
| --- | ---: | ---: | ---: | ---: |
${matrixRows}
${evidence("Medido", `Contadores de esta corrida. F1 = N/A si la clase no tiene soporte ni predicciones.${e2e ? ` Presencia sobre hipótesis STT (${results.length}/${datasetCases} casos con WAV).` : ""}`)}`
      : ""

  const casesRow = skipStt
    ? `| Casos | ${s.cases} |`
    : `| Casos | ${s.cases}/${datasetCases} |`

  const skippedRow =
    !skipStt && skippedNoAudio > 0
      ? `\n| Sin WAV (omitidos) | ${skippedNoAudio} |`
      : ""

  const reproducedFlag = skipStt
    ? `pnpm eval -- --adapter ${m.adapter}      # re-ejecutar Capa A`
    : sttOnly
      ? `pnpm eval -- --with-stt                  # re-ejecutar Nivel 1 STT (requiere GPU + Whisper QVAC)`
      : `pnpm eval                               # re-ejecutar Capa C --e2e (default; requiere GPU + Whisper QVAC + Qwen)`

  const notProbedFooter = classify
    ? e2e
      ? evidence("No probado", `Fidelidad semántica de citas fuera de los ${results.length}/${datasetCases} casos con WAV.`)
      : evidence("No probado", "Fidelidad semántica de citas y pipeline audio→nota no se miden en esta corrida.")
    : evidence("No probado", "Capa B no ejecuta estructuración; clasificación, fidelidad de citas y pipeline audio→nota no se miden.")

  return `# Oira eval report — \`${m.runId}\`

${m.startedAt} · capa \`${m.layer}\` · adapter \`${m.adapter}\` · ${layerLabel}
${evidence("Observado", `Rama ${m.gitCommit ?? "sin commit"} · dataset hash \`${m.datasetHash ?? "N/A"}\``)}

## Resultados

### Métricas principales

| Métrica | Valor |
| --- | ---: |
${casesRow}${skippedRow}
| Errores de adaptador | ${s.errors} |
| ${presenceLabel} | ${classify ? pct(s.presence.correct, s.presence.total) : "no_probado"} |
| Macro-F1 presencia | ${classify ? fmt(s.presence.macroF1, 3) : "no_probado"} |
| Invención léxica (casos) | ${classify ? pct(s.invention.casesWithHits, s.cases) : "no_probado"} |
| mustInclude cobertura | ${
    classify
      ? s.mustIncludeCoverage === null
        ? "N/A"
        : pct(s.mustIncludeHits, s.mustIncludeTotal)
      : "no_probado"
  } |
| Product emitted rate | ${
    classify
      ? productOk === null
        ? "N/A"
        : pct(productOk, s.cases)
      : "no_probado"
  } |
| Raw JSON valid rate | ${classify && s.rawJsonValidRate !== null ? fmt(s.rawJsonValidRate, 3) : "no_probado"} |
| STATED sin sourceSegmentIds | ${classify ? s.statedWithoutSource : "no_probado"} |
| Casos con source IDs inválidos | ${classify ? s.sourceIdFailureCases : "no_probado"} |
${latencyRows}
| STT WER/CER | ${
    s.stt.status === "medido" && Number.isFinite(s.stt.meanWer)
      ? `${fmt(s.stt.meanWer * 100, 1)}% / ${fmt(s.stt.meanCer * 100, 1)}%`
      : "no_medido"
  } |

${classify ? evidence("Medido", `Presencia, invención, mustInclude y source IDs${e2e ? ` sobre la hipótesis STT (${results.length}/${datasetCases} casos con WAV)` : ""}; latencia ${e2e ? "E2E" : "de structure()"} de esta corrida.`) : evidence("No probado", "Capa B no ejecuta estructuración; clasificación y E2E no se miden.")}

### Latencia

| Stat | ms |
| --- | ---: |
| n (éxitos) | ${s.latency.samples} |
| p50 | ${fmt(s.latency.p50)} |
| p95 | ${fmt(s.latency.p95)} |
| p99 | ${fmt(s.latency.p99)} |
| mean | ${fmt(s.latency.mean)} |
| min | ${fmt(s.latency.min)} |
| max | ${fmt(s.latency.max)} |
${evidence("Medido", sttOnly ? "Wall-clock de transcribe() por caso exitoso." : e2e ? "Wall-clock E2E (transcribe + structure) por caso exitoso (p50 E2E)." : "Wall-clock de structure() por caso exitoso.")}
${sttBlock}
${classificationBlock}
${deltaBlock}

### Por caso

| Caso | ms | Presence | Invención | Resultado |
| --- | ---: | --- | --- | --- |
${caseRows}

## Cómo reproducir este reporte

\`\`\`bash
pnpm eval:self-check                     # tests sin modelos
${reproducedFlag}
pnpm eval -- --replay reports/${m.runId}/run.json   # re-renderizar sin modelos
\`\`\`

Hashes de fuentes: \`metadata.sourceHashes\` en \`run.json\`. Detalle por caso en \`cases.json\` / \`errors.json\`.

${notProbedFooter}
`
}
