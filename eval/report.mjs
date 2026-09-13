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
    extractionFidelity: s.extractionFidelity,
    mustNotInclude: s.mustNotInclude,
    unsupportedFact: s.unsupportedFact,
    latency: s.latency,
    sttLatency: s.sttLatency,
    structureLatency: s.structureLatency,
    coldHot: s.coldHot,
    repeatability: s.repeatability,
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

  const categoryRows =
    s.stt.werPerCategory && Object.keys(s.stt.werPerCategory).length
      ? Object.entries(s.stt.werPerCategory)
          .map(([category, c]) => ({
            category,
            cases: c.cases,
            wer: Number.isFinite(c.meanWer) ? `${fmt(c.meanWer * 100, 1)}%` : "N/A",
            cer: Number.isFinite(c.meanCer) ? `${fmt(c.meanCer * 100, 1)}%` : "N/A",
          }))
          .sort((a, b) => {
            const w = (v) => (v === "N/A" ? -Infinity : parseFloat(v))
            return w(b.wer) - w(a.wer)
          })
          .map(
            (c) =>
              `| ${c.category} | ${c.cases} | ${c.wer} | ${c.cer} |`,
          )
          .join("\n")
      : ""

  const categoryBlock = categoryRows
    ? `\n### WER/CER por categoría

| Categoría | Casos | WER | CER |
| --- | ---: | ---: | ---: |
${categoryRows}
${evidence("Medido", "Agregado del WER/CER por caso (run.results[].stt), agrupado por la categoría del fixture.")}`
    : ""

  const confusionRows =
    s.stt.topConfusions && s.stt.topConfusions.length
      ? s.stt.topConfusions
          .map((c) => `| ${c.ref} | ${c.hyp} | ${c.count} |`)
          .join("\n")
      : ""

  const confusionBlock = confusionRows
    ? `\n### Top confusiones léxicas (Whisper vs gold)

| Palabra gold | Whisper transcribió | Veces |
| --- | --- | ---: |
${confusionRows}
${evidence("Medido", "Solo sustituciones token-a-token (ins/del excluidas).")}`
    : ""

  const sttBlock =
    s.stt.status === "medido"
      ? `\n### Speech-to-text (STT)

| Métrica | Valor |
| --- | ---: |
${sttRow("WER", `${fmt(s.stt.meanWer * 100, 1)}%`)}
${sttRow("CER", `${fmt(s.stt.meanCer * 100, 1)}%`)}
${sttRow("Transcribe success", pct(s.stt.cases - s.stt.emptyTranscriptCount, s.stt.cases))}
${s.stt.transcribeRetryRate !== undefined ? `${sttRow("Transcribe retry rate", `${pct(s.stt.transcribeRetryCases, s.stt.cases)} (${s.stt.transcribeRetries} reintentos)`)}\n${sttRow("Transcribe 1er intento", `${fmt(s.stt.transcribeFirstTryRate * 100, 1)}%`)}` : ""}
${sttRow("Negación drop / add (heurística)", `${s.stt.negationDrops} / ${s.stt.negationAdds}`)}
\n${evidence("Medido", `WER/CER sobre ${sttDenom} casos (WAV). Negación = recuento de tokens 'no', no es juicio clínico.`)}
${categoryBlock}
${confusionBlock}`
      : skipStt
        ? `\n${evidence("No probado", "STT no ejecutado (--skip-stt)")}`
        : `\n${evidence("No probado", "Sin transcripción STT medida en esta corrida.")}`

  const presenceLabel = e2e ? "Presence accuracy (I4, sobre hipótesis STT)" : "Presence accuracy (I4)"

  const latencyRows = e2e
    ? `| Latency STT p50 (ms) | ${fmt(s.sttLatency?.p50)} |\n| Latency structure p50 (ms) | ${fmt(s.structureLatency?.p50)} |\n| Latency E2E p50 (ms) | ${fmt(s.latency.p50)} |`
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

  // --- Fase 4: Repeatability (N runs) ---
  // Helper to format with unit only when not N/A
  function fmtUnit(value, digits, unit) {
    const formatted = fmt(value, digits)
    if (formatted === "N/A") return "N/A"
    return formatted + unit
  }
  // Helper for N column: show N/A if the metric itself is null/absent
  function fmtN(metric) {
    if (!metric || metric.n === undefined || metric.n === null) return "N/A"
    return String(metric.n)
  }
  const repeatabilityBlock = s.repeatability
    ? `\n### Repeatability (${run.repetitions?.length ?? "N/A"} runs)

| Métrica | Media | Std Dev | CV (%) | N |
| --- | ---: | ---: | ---: | ---: |
| Presence accuracy | ${fmtUnit(s.repeatability.presenceAccuracy?.mean * 100, 1, "%")} | ${fmtUnit(s.repeatability.presenceAccuracy?.std * 100, 2, "pp")} | ${fmt(s.repeatability.presenceAccuracy?.cv, 1)} | ${fmtN(s.repeatability.presenceAccuracy)} |
| Latency E2E p50 (ms) | ${fmt(s.repeatability.latencyP50?.mean, 1)} | ${fmt(s.repeatability.latencyP50?.std, 1)} | ${fmt(s.repeatability.latencyP50?.cv, 1)} | ${fmtN(s.repeatability.latencyP50)} |
| WER | ${fmtUnit(s.repeatability.sttWer?.mean * 100, 1, "%")} | ${fmtUnit(s.repeatability.sttWer?.std * 100, 2, "pp")} | ${fmt(s.repeatability.sttWer?.cv, 1)} | ${fmtN(s.repeatability.sttWer)} |
| Latency structure p50 (ms) | ${fmt(s.repeatability.structureLatencyP50?.mean, 1)} | ${fmt(s.repeatability.structureLatencyP50?.std, 1)} | ${fmt(s.repeatability.structureLatencyP50?.cv, 1)} | ${fmtN(s.repeatability.structureLatencyP50)} |
| Cold/Hot steady p50 (ms) | ${fmt(s.repeatability.coldHotSteadyP50?.mean, 1)} | ${fmt(s.repeatability.coldHotSteadyP50?.std, 1)} | ${fmt(s.repeatability.coldHotSteadyP50?.cv, 1)} | ${fmtN(s.repeatability.coldHotSteadyP50)} |
${evidence("Observado", `${run.repetitions?.length ?? "N/A"} corridas consecutivas sin warmup intermedio; mismo hardware/adapter.`)}`
    : ""

  // --- Fase 3: breakdown frío/caliente (warmup vs steady-state) ---
  const coldHotBlock = s.coldHot
    ? `\n### Breakdown frío/caliente

| Componente | ms |
| --- | ---: |
| Warmup (carga modelo) — frío | ${fmt(s.coldHot.warmupMs)} |
| 1er caso (tras warmup) | ${fmt(s.coldHot.firstLatencyMs)} |
| p50 steady-state (resto) | ${fmt(s.coldHot.steadyP50)} |
| Caliente / frío | ${fmt(s.coldHot.ratio)}× |
${evidence("Medido", "Warmup wall-clock de esta corrida; el modelo ya estaba cargado al medir los casos.")}`
    : ""

  // --- Fase 2: fidelity + unsupported fact blocks ---
  const fidelityQuoteRows =
    classify && s.extractionFidelity?.quoteTotal > 0
      ? results
          .map((r) => {
            const q = r.evaluation.quoteCoverage
            if (q.aggregate.total === 0) return null
            return `| ${r.id} | ${q.aggregate.total} | ${q.aggregate.found} | ${
              q.aggregate.recall !== null ? `${fmt(q.aggregate.recall * 100, 1)}%` : "N/A"
            } |`
          })
          .filter(Boolean)
          .join("\n")
      : ""

  const fidelityBlock =
    classify && s.extractionFidelity?.quoteTotal > 0
      ? `\n### Fidelidad de extracción (sourceQuotes)

| Caso | Quotes | Encontradas | Recall |
| --- | ---: | ---: | ---: |
${fidelityQuoteRows}
${evidence("Medido", "Match literal normalizado (no semántico); parafraseo del modelo frente a la cita literal produce falsos negativos.")}`
      : ""

  const unsupportedRows =
    classify && s.unsupportedFact?.facts > 0
      ? results
          .map((r) => {
            if (r.evaluation.unsupportedFactCount === 0) return null
            const kinds = [...new Set(r.evaluation.unsupportedFacts.map((f) => f.kind))].join(", ")
            const details = r.evaluation.unsupportedFacts
              .map((f) => (f.term ? `${f.term}` : f.sectionId ?? "—"))
              .join("; ")
            return `| ${r.id} | ${r.evaluation.unsupportedFactCount} | ${kinds} | ${details} |`
          })
          .filter(Boolean)
          .join("\n")
      : ""

  const unsupportedFactBlock =
    classify && (s.unsupportedFact?.facts ?? 0) > 0
      ? `\n### Unsupported clinical facts

| Caso | Nº | Tipo(s) | Detalle |
| --- | ---: | --- | --- |
${unsupportedRows}
${evidence("Medido", `§15.1: must_not_contain + mustNotInclude + STATED sin source + fuente sin respaldo literal. La componente 4 (revisión manual) no está medida.`)}`
      : ""

  const notProbedFooter = classify
    ? e2e
      ? evidence("No probado", `Fidelidad semántica de citas (cualitativa) fuera de los ${results.length}/${datasetCases} casos con WAV. sourceQuotes se puntúan por match literal; la verificación semántica aún falta (NOTE_VERIFIER).`)
      : evidence("No probado", "Fidelidad semántica de citas y pipeline audio→nota no se miden en esta corrida.")
    : evidence("No probado", "Capa B no ejecuta estructuración; clasificación, fidelidad de citas y pipeline audio→nota no se miden.")

  // Code block for reproduction instructions (avoids backtick nesting in main template)
  const reproCodeBlock =
    "`" + "`" + "`bash\n" +
    "pnpm eval:self-check                     # tests sin modelos\n" +
    reproducedFlag + "\n" +
    "pnpm eval -- --replay reports/" + m.runId + "/run.json   # re-renderizar sin modelos\n" +
    "`" + "`" + "`"

  const parts = [
    "# Oira eval report — `" + m.runId + "`\n\n",
    m.startedAt + " · capa `" + m.layer + "` · adapter `" + m.adapter + "` · " + layerLabel + "\n",
    evidence("Observado", "Rama " + (m.gitCommit ?? "sin commit") + " · dataset hash `" + (m.datasetHash ?? "N/A") + "`") + "\n",
    "Prompt hash: `" + (m.promptHash ?? "N/A") + "` · Schema hash: `" + (m.schemaHash ?? "N/A") + "`\n\n",
    "## Resultados\n\n",
    "### Métricas principales\n\n",
    "| Métrica | Valor |\n",
    "| --- | ---: |\n",
    casesRow + skippedRow + "\n",
    "| Errores de adaptador | " + s.errors + " |\n",
    "| " + presenceLabel + " | " + (classify ? pct(s.presence.correct, s.presence.total) : "no_probado") + " |\n",
    "| Macro-F1 presencia | " + (classify ? fmt(s.presence.macroF1, 3) : "no_probado") + " |\n",
    "| Invención léxica (casos) | " + (classify ? pct(s.invention.casesWithHits, s.cases) : "no_probado") + " |\n",
    "| mustInclude cobertura | " + (
      classify
        ? s.mustIncludeCoverage === null
          ? "N/A"
          : pct(s.mustIncludeHits, s.mustIncludeTotal)
        : "no_probado"
    ) + " |\n",
    "| Product emitted rate | " + (
      classify
        ? productOk === null
          ? "N/A"
          : pct(productOk, s.cases)
        : "no_probado"
    ) + " |\n",
    "| Raw JSON valid rate (primer intento) | " + (classify && s.rawJsonValidRate !== null ? fmt(s.rawJsonValidRate, 3) : "no_probado") + " |\n",
    "| Source quote fidelity (recall) | " + (
      classify && s.extractionFidelity?.quoteTotal > 0
        ? pct(s.extractionFidelity.quoteHits, s.extractionFidelity.quoteTotal)
        : s.extractionFidelity?.quoteTotal === 0
          ? "N/A (sin sourceQuotes en el run)"
          : "no_probado"
    ) + " |\n",
    "| mustNotInclude hits | " + (classify && s.mustNotInclude ? s.mustNotInclude.hits : "no_probado") + " |\n",
    "| Unsupported clinical fact rate | " + (
      classify && s.unsupportedFact
        ? s.unsupportedFact.casesWithFacts > 0
          ? "⛔ " + pct(s.unsupportedFact.casesWithFacts, s.cases)
          : pct(0, s.cases)
        : "no_probado"
    ) + " |\n",
    "| STATED sin sourceSegmentIds | " + (classify ? s.statedWithoutSource : "no_probado") + " |\n",
    "| Casos con source IDs inválidos | " + (classify ? s.sourceIdFailureCases : "no_probado") + " |\n",
    latencyRows + "\n",
    "| STT WER/CER | " + (
      s.stt.status === "medido" && Number.isFinite(s.stt.meanWer)
        ? fmt(s.stt.meanWer * 100, 1) + "% / " + fmt(s.stt.meanCer * 100, 1) + "%"
        : "no_medido"
    ) + " |\n\n",
    (classify ? evidence("Medido", "Presencia, invención, mustInclude y source IDs" + (e2e ? " sobre la hipótesis STT (" + results.length + "/" + datasetCases + " casos con WAV)" : "") + "; latencia " + (e2e ? "E2E" : "de structure()") + " de esta corrida.") : evidence("No probado", "Capa B no ejecuta estructuración; clasificación y E2E no se miden.")) + "\n\n",
    "### Latencia\n\n",
    "| Stat | ms |\n",
    "| --- | ---: |\n",
    "| n (éxitos) | " + s.latency.samples + " |\n",
    "| p50 | " + fmt(s.latency.p50) + " |\n",
    "| p95 | " + fmt(s.latency.p95) + " |\n",
    "| p99 | " + fmt(s.latency.p99) + " |\n",
    "| mean | " + fmt(s.latency.mean) + " |\n",
    "| min | " + fmt(s.latency.min) + " |\n",
    "| max | " + fmt(s.latency.max) + " |\n",
    evidence("Medido", sttOnly ? "Wall-clock de transcribe() por caso exitoso." : e2e ? "Wall-clock E2E (transcribe + structure) por caso exitoso (p50 E2E)." : "Wall-clock de structure() por caso exitoso.") + "\n",
    coldHotBlock,
    repeatabilityBlock,
    sttBlock,
    fidelityBlock,
    unsupportedFactBlock,
    classificationBlock,
    deltaBlock + "\n\n",
    "### Por caso\n\n",
    "| Caso | ms | Presence | Invención | Resultado |\n",
    "| --- | ---: | --- | --- | --- |\n",
    caseRows + "\n\n",
    "## Cómo reproducir este reporte\n\n",
    reproCodeBlock + "\n\n",
    "Hashes de fuentes: `metadata.sourceHashes` en `run.json`. Detalle por caso en `cases.json` / `errors.json`.\n\n",
    notProbedFooter + "\n"
  ]
  return parts.join("")
}
