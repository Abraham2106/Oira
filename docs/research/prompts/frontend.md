# Frontend / UX researcher prompts

Preamble: [`SYSTEM.md`](SYSTEM.md). One prompt per run.

---

## Prompt I1

**I1 / R6 / Theme C — P0 — desk.** Artifact: `docs/research/I1-R6-health-data-claims.md`

You are writing a **claims register** for Privacy and Security pages. You are not writing those pages and you are not counsel.

**Blocks:** until this file exists, the website must not name any law or claim compliance.

**Decide:** sentences Antonio may publish now; sentences he must never publish; sentences that are conditional on an unconfirmed backend fact (name the owner: Justin or IA).

**Questions**
1. For a local-only desktop tool, no account, no vendor cloud, used by one ambulatory physician: what is a defensible *general* way to talk about health-data protection?
2. Which LATAM-relevant duties fall on the **physician**, not on a local software vendor? Do not turn that into a badge.
3. Which sentences are true of observable MVP behavior only (local inference; this version does not send the consult to an AI provider; no sale; no training on the doctor’s data; doctor-controlled export and deletion)?
4. Which competitor sentences are forbidden (named-law compliance, “anonymous”, absolute non-egress, security superlatives)?

**Method:** official data-protection / health-ministry texts and Ibero-American DPA materials. Cite title, issuer, date, URL. HIPAA may appear **only** in the forbidden table. A claim without a source is forbidden.

**Output tables** (EN + ES exact sentences):

`| ID | Surface | Sentence | ALLOWED / FORBIDDEN / CONDITIONAL | Why | Source | Limitation that must travel with it |`

Do **not** authorize naming a law in the UI.

---

## Prompt I2

**I2 / R7 / Theme G — P0 — desk.** Artifact: `docs/research/I2-R7-patient-recording-notice.md`

**Decide:** whether P0 needs a step **before** `RECORDING`, and which **UX** option (not a legal instrument).

**Context:** in-person ambulatory consult only. Teleconsult is I12. New Consultation must make it obvious recording has **not** started. The doctor — not the app — is the professional actor in the room.

**Do not** invent statutory consent text, HIPAA authorization, patient portals, e-sign, or “this UI satisfies the law.”

**Questions**
1. What do professional ethics / medical-college sources expect when a clinician records a visit for documentation?
2. What can a local desktop app ethically prompt the **doctor** to do vs what it must not pretend to have done?
3. Which notice elements are jurisdiction-specific and therefore must not be hardcoded?
4. If sources are insufficient, recommend a reserved empty UI — do not invent copy.

**Output:** ≥3 options (placement, doctor actions, spoken guidance labeled `NOT LEGAL ADVICE — UX ONLY`, risks, sources) + one recommendation + a table of doctor-facing microcopy with legal status = “not a legal notice.”

---

## Prompt I3

**I3 / R1 / Theme B — P0 — desk.** Artifact: `docs/research/I3-R1-post-structuring-landing.md`

**Decide:** after `STRUCTURING`, land on **transcript-first**, **draft-first**, or **split with a named primary pane and default focus**.

**Facts:** Review always has transcript (source, not the chart), draft with permanent badge “Borrador — requiere revisión médica”, and source evidence. Two columns when wide. Accept is I7; section order is I4. Do not hide the draft badge. Do not auto-land on Export.

**Method:** evidence on when ambulatory notes are written; ambient-scribe / human-scribe post-visit order; HCI on summary-first vs source-first and automation bias. Weak evidence: still pick a default and mark `LOW` confidence.

**Output:** decision paragraph first; options compared; UI spec table (`element | primary/secondary | default focus | visible without scroll | EN/ES copy`); one-screen wireframe in text.

---

## Prompt I4

**I4 / R4 — P0 — desk.** Artifact: `docs/research/I4-R4-clinical-note-sections.md`

**Decide:** P0 default **ordered section list and titles** (EN + ES) for `ClinicalNoteSection`. Do **not** decide the IA JSON schema — only a mapping proposal.

SOAP is a hypothesis, not the truth. Users are ambulatory, not inpatient. Frontend renders generic ordered sections. No “AI-suggested diagnosis”, meds, doses, or official-note titles. Assessment/plan, if present, document **what the doctor said**, not model conclusions.

**Method:** outpatient documentation studies and Spanish-speaking professional sources when available. Propose one default list + rejected alternatives.

**Table:** `| order | section_id | title_en | title_es | purpose | allowed | forbidden | empty_state | source_evidence | p0_or_later |`

---

## Prompt I5

**I5 / R2 — P0 — desk.** Artifact: `docs/research/I5-R2-minimum-encounter-identifier.md`

**Decide:** New Consultation field list. Default posture: **ask for as little as possible.**

**Do not invent PHI requirements.** Do not require full name, national ID, DOB, phone, insurance, or MRN unless sourced evidence shows a doctor cannot recognize a **local, single-user, non-EHR** note without it. No legal “required by HIPAA.” Empty-form start must be considered.

**If evidence is thin:** optional label + optional visit type + automatic local timestamp.

**Table:** `| field_id | label_en | label_es | required | type | synthetic example | why needed | why not extra PHI | source |`

---

## Prompt Theme A

**Theme A — P0 companion — desk.** Artifact: `docs/research/THEME-A-ambient-scribes-patterns.md`

Write **1–2 pages** (plus sources): how human scribes and ambient documentation products work; what the physician still does; **copy / adapt / forbid** for NotaLocal.

Test every pattern against: *The agent documents. The doctor decides.* Do not decide I3/I7/I11/I12 here — only tag patterns those prompts must not import blindly. No HIPAA badges, no EHR writeback, no diagnosis widgets as “copy.”

**Table:** `| pattern | human scribe | ambient products | copy/adapt/forbid | why | source |`

---

## Prompt I6

**I6 / R5 / Theme D — P1 — desk.** Artifact: `docs/research/I6-R5-local-inference-copy.md`

**Produce 3 complete, distinct copy variants** (Home one-liner, Privacy short paragraph, PrivacyStatusPanel helper, plus an `UNKNOWN` fallback) in EN + ES.

**Do not use** “encrypted / secure / private” as empty adjectives. No HIPAA, “never leaves the device”, “100%”, “anonymous.” Local inference is a **behavior** (this version / live backend state), not a legal claim.

Each sentence must map to a product fact or a panel state. If untested with physicians, mark `UNTESTED` and include a 5-question test protocol. Recommend a default anyway.

---

## Prompt I7

**I7 / R10 — P1 — desk.** Artifact: `docs/research/I7-R10-automation-bias-review.md`

**Decide:** P1 `canAccept` rules and checklist behavior so accept cannot be a reflex.

Facts: accept is explicit and irreversible in meaning; no “Approve with AI”; cannot reach `ACCEPTED` without `READY_FOR_REVIEW`. Do not enable accept because time passed or processing succeeded. Do not invent statutory attestation.

Evaluate ≥5 patterns (checklist, forced exposure of content, unsourced-field gate, two-step accept, disable while pending, etc.) with evidence, time cost, residual risk, a11y. Recommend a **bundle of 1–2**, not five stacked gates.

**Output a developer list:** `canAccept` is true only when …

---

## Prompt I8

**I8 / Theme E — P1 — desk.** Artifact: `docs/research/I8-local-retention-matrix.md`

**Do not decide the default.** Produce the consequence matrix for: (A) no retention, (B) notes only, (C) notes + audio.

Any retention must be visible and controllable. Copy describes **actual** behavior. A control that does nothing is worse than no control. Failed delete must never show optimistic success. Doctor’s legal record-retention duty is not NotaLocal’s.

**Matrix topics:** PrivacyStatusPanel rows; Settings controls; what is deletable; what delete cannot reach (OS copies, pasted EHR); Recording/Processing error copy; website “what we store”; disabled-control copy. Mark backend-unknowns `CONDITIONAL — Justin`.

---

## Prompt I9

**I9 / R8 — P1 — desk.** Artifact: `docs/research/I9-R8-export-formats.md`

**Decide:** prioritized export formats (first → later → do not). MVP surfaces: clipboard + text file. No EHR integrations, no cloud converters, no fake “sent to EHR.”

Research what independent / small-clinic ambulatory physicians in Spanish-speaking practice actually paste into. Confidence-tag thin market data; do not fabricate share. Rank: paste fidelity, familiarity, official-looking risk, Justin cost (qualitative).

Every format keeps `NOT_STATED` / empty sections. Destination warning: what leaves NotaLocal is no longer our scope.

---

## Prompt I10

**I10 / R9 / I14 — P1 — protocol.** Artifact: `docs/research/I10-R9-I14-publishable-performance-and-requirements.md`

**Do not invent numbers.** Decide what Processing and Requirements may say **before** any measurement, vs only after Justin/IA fill a results table.

Forbidden: competitor times as ours; “instant”; “ready when the patient leaves” as a measured fact; GPU required/not without a source.

**Deliver:** claim register now; claim templates after measurement (empty); measurement protocol on clinic-class machines (sampling method, not a fake BOM); results table columns: `run_id, date, cpu/gpu, ram, os, stt_model, llm_model, audio_min, t_transcribe, t_structure, peak_ram, outcome`. Synthetic audio only.

---

## Prompt Extra

**Extra / Guide §9 — P1 — desk.** Artifact: `docs/research/EXTRA-prompt-injection-doctor-explanation.md`

**Decide:** whether the Security page mentions prompt-injection risk in P1, and the exact EN/ES sentences if yes.

Already decided (do not reopen): delimited transcript, source evidence, “Sin origen identificado”, settings not editable from the note, inert URLs, no HTML from the model, no auto-export from content.

Do not write exploit PoCs. Do not claim immunity. Do not tell the doctor to distrust the patient as a person — teach **verify against source**. Options: Security / FAQ only / in-app / omit from P1.

---

## Prompt I11

**I11 / R3 — P2 — desk.** Artifact: `docs/research/I11-R3-live-transcription-during-consult.md`

**Decide:** keep hidden / opt-in / do not add. P0 already hides live transcript. Recording’s job: the doctor forgets the app and talks to the patient.

Evidence on attention, eye contact, mid-visit STT correction, patient distrust of the screen. Do not assume streaming STT exists — mark capability deps `IA/JUSTIN`. Do not change P0 except to reaffirm “no live transcript.”

---

## Prompt I12

**I12 / Theme F — P2 — desk.** Artifact: `docs/research/I12-teleconsult-ui-deltas.md`

**Do not decide to build teleconsult.** Define P0 in-person vs later Zoom-like remote: system audio, two sources, remote-patient notice. No meeting bot, no Zoom marketplace app, no invented statutory remote-consent text.

**Deliver:** scenario definitions + delta table `| screen | in-person | teleconsult | must change? | risk if unchanged |` + FAQ sentences allowed **today** vs later + Justin/IA dependencies.

---

## Prompt I13

**I13 — P2 — desk.** Artifact: `docs/research/I13-languages-and-i18n.md`

Product language is **Spanish**. Separate UI language, website language, **spoken** encounter language, and export language. FAQ must not claim STT languages IA has not verified.

**Decide:** whether P2 needs an i18n framework (triggers, not a full port); exact public language claims allowed now. Do not decide model language support.

---

## Prompt I15

**I15 — P2 — desk.** Artifact: `docs/research/I15-accessibility-level.md`

**Decide:** written conformance **target** and public-claim posture (internal AA vs public “conformant”). WCAG 2.2 AA is the working reference today — do not certify the app.

P0 a11y rules already exist (contrast, keyboard, recording indicator, no color-only). Map remaining AA criteria. Evidence of screen-reader use among **physicians** (do not transfer patient AT stats). No named-statute accessibility badge (I1).
