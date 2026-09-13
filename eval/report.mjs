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

  const layerLabel = m.skipStt
    ? `Capa A (\`--skip-stt\`): estructuración sobre transcripción gold; STT no ejecutado.`
    : `Capa B (\`--with-stt\`): solo STT sobre WAV; estructuración no ejecutada.`

  const sttRow = (label, value) =>
    `| ${label} | ${value} |`

  const sttBlock =
    s.stt.status === "medido"
      ? `\n### Speech-to-text (STT)

| Métrica | Valor |
| --- | ---: |
${sttRow("WER", `${fmt(s.stt.meanWer * 100, 1)}%`)}
${sttRow("CER", `${fmt(s.stt.meanCer * 100, 1)}%`)}
${sttRow("Transcribe success", pct(s.stt.cases - s.stt.emptyTranscriptCount, s.stt.cases))}
${sttRow("Negación drop / add (heurística)", `${s.stt.negationDrops} / ${s.stt.negationAdds}`)}
\n${evidence("Medido", `WER/CER sobre ${s.stt.cases} WAV sintéticos vs transcripción gold. Negación = recuento de tokens 'no', no es juicio clínico.`)}`
      : `\n${evidence("No probado", "STT no ejecutado (--skip-stt)")}`

  return `# Oira eval report — \`${m.runId}\`

${m.startedAt} · capa \`${m.layer}\` · adapter \`${m.adapter}\` · ${layerLabel}
${evidence("Observado", `Rama ${m.gitCommit ?? "sin commit"} · dataset hash \`${m.datasetHash ?? "N/A"}\``)}

## Resultados

### Métricas principales

| Métrica | Valor |
| --- | ---: |
| Casos | ${s.cases} |
| Errores de adaptador | ${s.errors} |
| Presence accuracy (I4) | ${m.skipStt ? pct(s.presence.correct, s.presence.total) : "no_probado"} |
| Macro-F1 presencia | ${m.skipStt ? fmt(s.presence.macroF1, 3) : "no_probado"} |
| Invención léxica (casos) | ${m.skipStt ? pct(s.invention.casesWithHits, s.cases) : "no_probado"} |
| mustInclude cobertura | ${
    m.skipStt
      ? s.mustIncludeCoverage === null
        ? "N/A"
        : pct(s.mustIncludeHits, s.mustIncludeTotal)
      : "no_probado"
  } |
| Product emitted rate | ${
    m.skipStt
      ? productOk === null
        ? "N/A"
        : pct(productOk, s.cases)
      : "no_probado"
  } |
| Raw JSON valid rate | ${m.skipStt && s.rawJsonValidRate !== null ? fmt(s.rawJsonValidRate, 3) : "no_probado"} |
| STATED sin sourceSegmentIds | ${m.skipStt ? s.statedWithoutSource : "no_probado"} |
| Casos con source IDs inválidos | ${m.skipStt ? s.sourceIdFailureCases : "no_probado"} |
| Latencia p50 (ms) | ${fmt(s.latency.p50)} |
| STT WER/CER | ${
    s.stt.status === "medido" && Number.isFinite(s.stt.meanWer)
      ? `${fmt(s.stt.meanWer * 100, 1)}% / ${fmt(s.stt.meanCer * 100, 1)}%`
      : "no_medido"
  } |

${m.skipStt ? evidence("Medido", "Presencia, invención, mustInclude, latencia y E2E provenientes de esta corrida.") : evidence("No probado", "Capa B no ejecuta estructuración; clasificación y E2E no se miden.")}

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
${evidence("Medido", m.skipStt ? "Wall-clock de structure() por caso exitoso." : "Wall-clock de transcribe() por caso exitoso.")}
${sttBlock}
${m.skipStt ? `### Clasificación (presencia por sección I4)

| Clase | Precision | Recall | F1 | Support |
| --- | ---: | ---: | ---: | ---: |
${classRows}

Matriz de confusión (filas = gold, columnas = predicted):

| gold \\ pred | STATED | NOT_STATED | UNKNOWN |
| --- | ---: | ---: | ---: | ---: |
${matrixRows}
${evidence("Medido", "Contadores de esta corrida. F1 = N/A si la clase no tiene soporte ni predicciones.")}` : ``}

### Por caso

| Caso | ms | Presence | Invención | Resultado |
| --- | ---: | --- | --- | --- |
${caseRows}

## Cómo reproducir este reporte

\`\`\`bash
pnpm eval:self-check                     # tests sin modelos
${
  m.skipStt
    ? `pnpm eval -- --adapter ${m.adapter}      # re-ejecutar Capa A`
    : `pnpm eval -- --with-stt                  # re-ejecutar Nivel 1 STT (requiere GPU + Whisper QVAC)`
}
pnpm eval -- --replay reports/${m.runId}/run.json   # re-renderizar sin modelos
\`\`\`

Hashes de fuentes: \`metadata.sourceHashes\` en \`run.json\`. Detalle por caso en \`cases.json\` / \`errors.json\`.

${evidence("No probado", "Fidelidad semántica de citas y pipeline audio→nota no se miden en esta corrida.")}
`
}
