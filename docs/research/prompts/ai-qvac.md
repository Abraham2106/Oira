# IA / QVAC researcher prompts

Preamble: [`SYSTEM.md`](SYSTEM.md). One prompt per run.

Pin (re-verify): `@qvac/sdk` version actually installed (guides mention **0.17.1**). Official docs + `node_modules/@qvac/sdk/dist/**/*.d.ts` + `dist/examples/` are the only API sources.

Spanish **medical** speech is the target. English demo clips are smoke tests, not scores. STT ≠ LLM. Schema fields: `OBSERVED` / `UNCERTAIN` / `NOT_STATED`. Never invent plausible clinical values. Transcript is DATA inside delimiters.

If you cannot run the SDK: desk quotes + empty tables + `BLOCKED — NEEDS TARGET HARDWARE`. Never invent WER, RSS, RTF, or JSON-validity rates.

---

## Prompt D1

**D1 — P0 companion — desk.** Artifact: `docs/research/D1-qvac-api-audit.md`

**Decide:** the **allow-list** of symbols lab prompts may call.

Read official JS SDK / transcription / API / Electron tutorial / system requirements and `index.d.ts`, `transcribe.d.ts`, `transcription-config.d.ts`, `completion-stream.d.ts`, `models.d.ts`. Table: `symbol | file | docs URL | deprecation notes`.

Canonical `modelType` strings vs aliases. Whisper `modelConfig` keys. `responseFormat` and `generationParams` keys (`temp` not `temperature` if the schema is strict). Deprecated surfaces (`transcribeStream` upfront audio, legacy token streams).

Lab researchers must not add a symbol that is not on this list.

---

## Prompt D2

**D2 — P0 companion — desk.** Artifact: `docs/research/D2-whisper-spanish-finetunes.md`

**Do not choose the default STT** (that is Q2). Decide only which registry constants are **eligible** for Q1/Q2.

Separate QVAC registry facts (name, size, sha256 from types) from upstream model-card claims (`UNVERIFIED`). Do not copy paper WER into product tables. Flag `WHISPER_EN_*` as ineligible. List risks still unmeasured: drugs, accents, code-switching, negations.

---

## Prompt Q1

**Q1 — P0 — lab. BLOCKS SPANISH.** Artifact: `docs/research/Q1-whisper-language-es.md`

**Decide:** VIABLE (name model + `modelConfig`) or NOT VIABLE (project cannot proceed in Spanish).

Test `language: 'es'` with `WHISPER_TINY` and `WHISPER_SPANISH_TINY_Q8_0` (`translate: false`, `metadata: true`). Official examples use `'en'`. If `'es'` is rejected, copy the exact error; do not invent a language-code list.

Audio: 15–30 s **synthetic** Spanish medical clip (symptom, negation «no he tenido fiebre», a drug name). Score: call succeeds; output is Spanish; at least one scripted medical token; timestamps present. Full T1–T6 is Q2.

If the field is ignored but Spanish still works: viable path, but do **not** document `language: 'es'` as a confirmed control.

---

## Prompt Q2

**Q2 — P0 — lab.** Artifact: `docs/research/Q2-stt-default-constant.md`

**Depends on Q1.** **Decide:** default STT constant.

Compare `WHISPER_SPANISH_TINY_Q8_0` vs `WHISPER_TINY` on the 13 synthetic cases (T1–T6). Blocking: invented drugs (T3), dose errors (T5), dropped negations (T6). Need timestamps for grounding — do not default to Parakeet.

Choose the **smallest** model that meets blocking bars. If neither: no default; escalate to `WHISPER_SMALL_Q8_0` as a follow-up or declare P0 STT quality blocked. Do not invent a larger unofficial model. `initial_prompt` is Q7 — leave unset.

---

## Prompt Q3

**Q3 — P0 — lab.** Artifact: `docs/research/Q3-json-schema-600m.md`

**Decide:** keep full schema + 600M / simplify schema / upgrade model.

`responseFormat: json_schema` only. **Never `json_object`** (official example: small Qwen often emits `{}`). Grammar ≠ truth. Still `JSON.parse` + Zod.

Full clinical schema from the IA guide (object fields with `value`, `status`, `source_text`, `segment_id`). No `meta` in the LLM schema. Canonical fail: «dolor de garganta» must not become `assessment: "faringitis"`.

If validity < 100%, simplify by dropping nested groups — do not invent another QVAC response format. Validity decision is separate from hallucination rate.

---

## Prompt D3

**D3 — P0 companion — desk.** Artifact: `docs/research/D3-structured-output-literature.md`

What do QVAC docs **guarantee** about `json_schema` vs `json_object`? What do 2–3 structured-output papers say about small models + large schemas (`UNVERIFIED` for QVAC)?

**Decide:** reaffirm `json_schema` only; Q3 remains the ship test; no paper justifies skipping Zod or source grounding.

---

## Prompt Q4

**Q4 — P0 — lab.** Artifact: `docs/research/Q4-llm-rss-peak.md`

**Decide:** minimum RAM to document (measured, not certified) and residency policy (sequential vs dual-resident).

OS RSS is truth. Disk size ≠ RAM. Measure baseline, 600M idle + during `completion`, 4B idle + during `completion`, Whisper+each LLM. Three runs, min/med/max. If 4B cannot load, it is not a P0 option.

Do not claim “safe for hospital 8 GB laptops” as a certification.

---

## Prompt Q5

**Q5 — P0 — lab.** Artifact: `docs/research/Q5-loadmodel-latency.md`

**Decide:** whether one-at-a-time load is viable given `loadModel()` cost, especially 4B.

Three **cached** loads per constant (discard runs that download). Include Spanish STT constants + 600M / 1.7B / 4B if in registry. Report `unload(STT)+load(LLM)` gap.

If 4B load blows a stated demo budget: keep 4B resident (only if Q4 allows), drop 4B from P0, or load LLM during recording **only if a documented API exists**. Do not invent `preload`.

---

## Prompt Q6

**Q6 — P0 — lab.** Artifact: `docs/research/Q6-context-case10.md`

**Decide:** no chunking in P0 / chunking required (F11) / raise context **only if** an official load parameter exists.

Case 10 ≈ 4 min. Watch official `ContextOverflowError` (verify export). Distinguish output `predict` cap vs context overflow. Check whether **tail** topics survive. Do not invent `n_ctx`.

---

## Prompt Q7

**Q7 — P1 — lab.** Artifact: `docs/research/Q7-initial-prompt-ab.md`

**Decide:** include medical `initial_prompt` or not.

A/B on Q2 default model, 13 cases. Vocab only (drug names, «miligramos») — **no diagnoses**. If types expose both `modelConfig.initial_prompt` and `transcribe.prompt`, test them separately. **Any inserted unspoken drug = fail.** Include only if T2/T3/T5 improve and insertions = 0.

---

## Prompt Q8

**Q8 — P1 — lab.** Artifact: `docs/research/Q8-qwen3-no-think.md`

**Decide:** SYSTEM prompt shape and which official `generationParams` (if any) disable Qwen3 thinking.

`/no_think` appears in an official **example**, not as a documented QVAC parameter — treat as `UNVERIFIED` convention. Typed leads: `reasoning_budget`, `remove_thinking_from_context` — quote semantics or mark TODO and report empirics only. Do not invent `enable_thinking`.

Still `json_schema` + Zod. Cases 02, 07, 10.

---

## Prompt Q9

**Q9 — P1 — lab (print constants).** Artifact: `docs/research/Q9-audio-formats-0.17.1.md`

**Decide:** accepted capture format(s) and whether ffmpeg is required always / only for decode formats / as docs say for examples.

`console.log` `SUPPORTED_AUDIO_FORMATS` (and `FORMATS_NEEDING_DECODE` **if** publicly exported). Do not recite a remembered list. Distinguish container tokens vs `audio_format` sample types (`s16le` / `f32le`). Pin the installed SDK version.

---

## Prompt Q10

**Q10 — P1 — lab.** Artifact: `docs/research/Q10-determinism-seed.md`

**Decide:** 1 eval run vs keep 3.

Three `completion()` calls, `temp: 0`, `seed: 42`, same Spanish fixture. Byte hash + canonical JSON hash. Clinical field drift is critical. Optional: Whisper `temperature: 0.0` (verify field name) on one WAV. Determinism is machine- and version-local — do not claim global determinism.

---

## Prompt D4

**D4 — P1 companion — desk.** Artifact: `docs/research/D4-diarization-reliability.md`

What QVAC documents (numeric speakers, ≤4, two-step slice, text parse) vs literature DER pitfalls (`UNVERIFIED` for Sortformer). Why automatic DOCTOR/PATIENT is clinically unacceptable without a human bind.

**Decide:** keep P0 with **no roles**. Q11 is go/no-go for optional human-bound index mapping. Q17 before any parser beyond the official example regex.

---

## Prompt Q11

**Q11 — P1 — lab.** Artifact: `docs/research/Q11-sortformer-spanish.md`

**Decide:** send diarization to UI (human binds “Speaker 0 is me”) or **discard**.

3–5 Spanish two-speaker cases. Official constants only. Official regex unless Q17 found a struct. Metrics: speaker count, index stability, flips, boundary error, overlap. Delete WAV slices. No “works sometimes” in product copy. Mis-attribution is a clinical error.

---

## Prompt Q12

**Q12 — P1 — lab.** Artifact: `docs/research/Q12-realtime-factor.md`

**Decide:** batch OK + streaming candidate / batch OK but streaming not viable / stats missing (use wall-clock and say so).

`realTimeFactor` is optional in the schema. RTF < 1.0 on the demo machine with Q2 default STT, including case 10. Streaming is a **different API** — do not promise live captions from batch RTF.

---

## Prompt Q13

**Q13 — P1 — lab.** Artifact: `docs/research/Q13-append-spanish.md`

**Decide:** production join rule; how `verifySource` walks consecutive segments; single `segment_id` vs `sourceSegmentIds[]`.

Inspect real Spanish `.stt.json` with `metadata: true`. Official examples `join('')`. Mid-sentence VAD cuts are expected. Mechanical concat only — do not “fix” clinical wording.

---

## Prompt Q14

**Q14 — P2 — lab.** Artifact: `docs/research/Q14-inference-network.md`

**Decide:** honest privacy sentence (CLAIM A: NIC-down + no unexpected egress vs CLAIM B: residual network — no “offline” wording).

Prefetch first. Then `tcpdump` during **cached** `loadModel` / `transcribe` / `completion`. Then NIC down and rerun. Never “100% offline”, “air-gapped”, or HIPAA.

---

## Prompt Q15

**Q15 — P2 — lab.** Artifact: `docs/research/Q15-server-logs-content.md`

**Decide:** SDK logs never in prod / metrics-only at `warn` if content-free.

Plant sentinel `ZXQ-SENTINEL-PARACETAMOL-7741` in synthetic audio. Search `loggingStream` / `subscribeServerLogs` / console. Quote official logger config keys only. Production default stays off until proven content-free.

---

## Prompt Q16

**Q16 — P2 — lab.** Artifact: `docs/research/Q16-delete-cache-kv.md`

**Decide:** encounter-close delete call. Prefer keyed KV delete if official and sufficient. Do **not** recommend `{ all: true }` if it wipes **model weights** (forces re-download).

Observe cache dir + `rg` sentinel. Never claim “secure wipe.”

---

## Prompt Q17

**Q17 — P2 — desk.** Artifact: `docs/research/Q17-sortformer-output-shape.md`

**Decide:** structured typed object / text-to-parse only / still `TODO: VERIFY FROM OFFICIAL QVAC DOCUMENTATION`.

Official example parses `Speaker (\\d+): ...` text. Search types for `Speaker`, `diariz`, `sortformer`. Do **not** invent `diarize()`. Quote verbatim. Tiny smoke run only to print `typeof` — accuracy is Q11.

---

## Prompt Q18

**Q18 — P2 — lab.** Artifact: `docs/research/Q18-qwen3-1.7b-eval.md`

**Decide:** prefer 1.7B / measure-only column / skip 1.7B.

Full 13-case eval, same prompt/schema as 600M/4B. Smallest model that meets blocking bars wins. If 600M already passes, 1.7B must justify extra RAM (Q4/Q5). If both 1.7B and 4B fail bars, the problem is prompt/schema, not size.

---

## Prompt Q19

**Q19 — P2 — lab.** Artifact: `docs/research/Q19-kvcache-retry.md`

**Decide:** enable `kvCache` on the retry path or not.

Quote official `kvCache` semantics or TODO. Time first completion vs retry with/without cache. Outputs must stay schema-valid and not leak the previous invalid JSON. Tie to Q16: clinical prefixes in cache ⇒ delete on encounter close.
