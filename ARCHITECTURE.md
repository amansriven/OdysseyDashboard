# Odyssey — Agent Architecture

**Prompt 1: Call Center "Claim Story AI: Proactive Member & Claims Intelligence System"**
Built on the Google Agent Development Kit (ADK).

---

## One-Line Pitch

We proactively identify claim, ROI, and compliance issues, explain them through an Amazon-style member journey dashboard, generate provider action summaries, and equip representatives with AI-generated context when escalation is required.

## Goal

Reduce preventable member and provider contacts by providing visibility, explanations, and next steps **before a call is needed**. For contacts that still occur, equip representatives with AI-generated context so they can begin resolving the issue immediately.

---

## Use Case Coverage

The prompt requires a minimum of one use case. We cover all four, because three of them are inexpensive once the shared tools layer exists.

| # | Prompt use case | Our surface | Owner agent |
|---|---|---|---|
| 1 | Predict and explain claims ("Claim Story" timeline) | Member dashboard | Claim Spine |
| 2 | Answer benefits and coverage questions | Member self-service + rep-assist Q&A | Benefits-Navigator |
| 3 | Pre-screen for ROI gaps | Data-access check before any member data is fetched | ROI Gate |
| 4 | Monitor for compliance and operational risk | Ops dashboard | Compliance-Sentinel |

**Four stakeholder groups are served:** members (dashboard), providers (action summaries), representatives (escalation case summaries), operations (compliance sentinel).

---

## Data Foundation

All figures below were verified directly against `data/structured/`.

### Scope: the dataset is shared across hackathon prompts

The provided dataset serves multiple prompts. Roughly half of it belongs to a different one (care-gap closure / Stars quality performance) and is **out of scope for Prompt 1**.

**The dividing line is exact: if a table is keyed by `measure_id`, it is not ours.** Prompt 1's tables are keyed by `claim_id`, `auth_id`, `rule_id`, and `flag_id`.

**In scope — 6 tables:**

| File | Rows | Key | Role |
|---|---|---|---|
| `claims.csv` | 880 | `claim_id` | Core claim records — status, denial codes, prior-auth flags |
| `roi_authorizations.csv` | 352 | `auth_id` | Release-of-Information authorizations |
| `compliance_flags.csv` | 312 | `flag_id` | Operational + compliance risk flags |
| `members.csv` | 200 | `member_id` | Demographics, plan type |
| `coverage_rules.csv` | 80 | `rule_id` | Plan + CPT → covered, prior auth, cost share, copay |
| `providers.csv` | 50 | `provider_id` | Provider directory, network status |

**Out of scope — keyed by `measure_id`, belongs to the care-gap / Stars prompt:**
`care_gaps.csv` · `appointment_slots.csv` · `stars_performance.csv` · `segment_performance.csv` · `historical_interventions.csv` · `campaign_dispositions.csv` · `stars_performance_report.md`

> **Care gaps are not in Prompt 1.** The four use cases are claims, benefits, ROI, and compliance. Care-gap alerts and appointment booking appeared in an early draft of this architecture; they were scope drift from the dataset, not from the ask. They are cut.

**Unstructured, in scope:** 10 of 12 call transcripts map onto Prompt 1 use cases — `denied_claim_inquiry` (×2), `prior_auth_question` (×2), `roi_missing` (×2), `benefits_question` (×2), `claim_status_check` (×2). The 2 `care_gap_outreach` transcripts belong to the other prompt.

### Distributions that drive the design

- **Claim status:** 465 Paid · 212 Denied · 116 Pending · 87 In Review
- **`denial_fixable`:** 156 True / 56 False on denied claims — **this is ground truth for the Solvability-Router** (see [Evaluation](#evaluation))
- **`denial_risk_flag`:** 17 True — proactive denial-prevention targets
- **ROI:** 293 on file / 59 missing, and **43 expired** — expired-but-present is the subtle case the Mediator exists to catch
- **Prior auth required:** 243 claims · **`modifier_mismatch`:** 18 claims

**`compliance_flags` — all 312 unresolved, and every flag type maps to a Prompt 1 use case:**

| Flag type | Count | Use case |
|---|---|---|
| `CLAIM_REVIEW_STALLED` | 191 | Claims — the prompt's "system health signals" over stalled adjudication |
| `ROI_AUTHORIZATION_GAP` | 70 | ROI — gaps identifiable *before* anyone calls |
| `PROVIDER_CREDENTIALING_ISSUE` | 24 | Operational risk |
| `HIGH_PROVIDER_DENIAL_RATE` | 15 | Denial prevention |
| `PRIOR_AUTH_BYPASS` | 12 | Prior auth |

Severity: 218 High / 94 Medium. Entities: 203 Claim · 70 Member · 39 Provider.

> **The 70 `ROI_AUTHORIZATION_GAP` flags connect use case 3 to use case 4.** The prompt asks the ROI capability to "notify users proactively before reaching an agent." The Compliance-Sentinel surfaces those gaps *before* the call; the ROI Gate catches them *at* the call. Two halves of one story, both grounded in prompt text.

### Schema corrections against the original design

1. **There is no `prior_auth` table.** Prior-auth state lives as columns: `claims.prior_auth_required` / `claims.prior_auth_obtained`, and `coverage_rules.prior_auth_required` keyed by plan_type + CPT. Researcher2 reads those columns plus `roi_authorizations`.
2. **Researchers split by question, not by table.** Both touch `claims`; they read different columns through different lenses.
3. **Call Risk Score does not exist in the data.** It is a deterministic weighted heuristic we compute (see [Call Risk Score](#call-risk-score)). It is **not** a trained model and must not be presented as one.

---

## Architecture

```
   ROI GATE  [before_agent_callback]
        │      NOT a login. No credentials, accounts, or sessions.
        │      A data-access check: does this caller have an unexpired ROI
        │      on file for this member? No member data is fetched until it passes.
        │      Fails -> refuse + log, pipeline never starts.
        ▼
   Dash-Manager  (SequentialAgent — orchestrator + state manager)
        │
        ├──────────────────┬─────────────────────┐   ParallelAgent
        ▼                  ▼                     ▼
   CLAIM SPINE       Benefits-Nav        Compliance-Sentinel
        │               Agent                  Agent
        │        (member + rep self-serve)      (ops)
        │
        ▼
   Claim-Summarizer
        │  → ClaimSummary
        ▼
   Issue-Detector
        │  → DetectedIssue
        │  Predicts on the 203 Pending / In-Review claims where no denial
        │  code exists yet. On Denied claims it classifies the existing code.
        ▼
   LoopAgent (max_iterations=2)
        │
        ├─ ParallelAgent
        │    ├─ Researcher1  (claim + coverage lens)
        │    └─ Researcher2  (auth + ROI lens)
        │       Both read state["mediator_gap"] on pass 2.
        │
        └─ Mediator
             ├─ acceptable ──► escalate=True, exit loop
             └─ rejected   ──► write named gap to state, retry
        │
        └─ loop exhausted ──► Verdict{solvable: false, reason: "no consensus"}
        ▼
   Solvability-Router  [deterministic code gate — not an LLM call]
        ├─ solvable ──► Error-Fixer      → member / provider instructions
        └─ not      ──► Escalation-Flag  → representative case summary
        ▼
   dashboard_payload.json  ──►  Claim Journey Dashboard UI
```

The top-level parallel split matters: benefits and compliance do not depend on the claim verdict, so they run alongside the spine. This cuts wall-clock latency and makes the ADK trace fan out rather than draw one long line.

---

## Agent Responsibilities

### ROI Gate — `before_agent_callback`, not an agent

**Data:** `roi_authorizations`
**Job:** Given a caller and a member, check `roi_authorizations` for a matching record with `auth_on_file = True` **and** `auth_expired = False`, before *any* tool touches member data.
**Output:** Pass, or refuse + audit log.

> **This is not a login.** There is no authentication, no credentials, no user accounts, no session management, and no login page anywhere in this system. The ROI Gate is a **data-access check** — a lookup answering "is this caller permitted to receive this member's information?" It is roughly 20 lines of Python against a CSV.
>
> **Why a callback and not an agent:** the design principle is "ROI is checked *before* data is fetched." An agent five steps deep in the pipeline is an audit, not a gate. Implementing this as an entry callback makes the principle true by construction.
>
> **This is prompt use case 3** ("Pre-Screen for ROI Gaps"), the Humana Military compliance ask, and the strongest demo moment we have — `transcript_04_roi_missing.txt`, in which a son calls on behalf of his 78-year-old mother, has no ROI on file, and the representative must refuse because verbal consent is insufficient. Do not cut it.

### Claim-Summarizer

**Data:** `claims`, `coverage_rules`
**Job:** Produce a structured summary of claim status, type, dates, and involved parties.
**Output:** `ClaimSummary`

### Issue-Detector

**Data:** Claim summary
**Job:** Identify and classify the problem — denial reason, missing auth, coverage gap, ROI issue. Detection only; no routing.
**Output:** `DetectedIssue`

> **Where the real work is:** on a Denied claim, classification is largely a `denial_reason` lookup. The genuine reasoning happens on the **203 Pending / In-Review claims** where no denial code exists yet and the issue must be *predicted* from `referral_on_file`, `prior_auth_required` vs `prior_auth_obtained`, and `modifier_mismatch`. This is the prompt's "predict and explain" requirement and the rubric's "denial prevention."

### Researcher1 · Researcher2 — run in parallel

| | Researcher1 | Researcher2 |
|---|---|---|
| **Lens** | Claim + coverage | Authorization + ROI |
| **Data** | `claims`, `coverage_rules` | `roi_authorizations`, `claims.prior_auth_*`, `coverage_rules.prior_auth_required` |
| **Output** | Claim/coverage findings | Auth/ROI findings |

Both read `state["mediator_gap"]` on iteration 2 and must address the named gap.

### Mediator — validation gate

**Inputs:** Researcher1 + Researcher2 findings
**Job:** Reconcile findings, resolve conflicts, apply precedence, emit a single verdict — or reject with a **specific, named gap**.
**Output:** `Verdict{issue, owner, solvable, confidence, evidence}`

**Precedence chain:** `ROI block > prior-auth gap > coverage exclusion > coding error`

**Acceptance criteria** (all four must hold):
1. Both researchers cited **actual field values**, not "unknown" / "unable to determine"
2. No contradiction on the blocking issue
3. Precedence resolves to exactly one owner
4. Confidence ≥ threshold

**Rejections must name the gap.** The researchers read deterministic CSV data through tools — re-running them on identical input with no feedback returns an identical answer, and the loop becomes pure latency. The rejection must be actionable:

> ✗ "Findings insufficient, try again"
> ✓ "Researcher2: you reported ROI on file but did not check `auth_expired`. Re-verify."

This is not hypothetical: **43 of 352 ROI records are expired rather than missing.** `auth_on_file = True` reads as "fine" to a careless researcher. That distinction is what the Mediator is for.

### Solvability-Router — deterministic code gate

**Input:** `Verdict.solvable`
**Job:** Route to Error-Fixer or Escalation-Flag.
**Not an LLM call** — it reads a boolean the Mediator already produced. Deterministic, unit-testable, still visible in the trace.

### Error-Fixer

**Triggered when:** solvable
**Job:** Plain-language, step-by-step resolution instructions (submit prior auth, upload ROI form, contact provider).
**Output:** Instructions → dashboard

### Escalation-Flag

**Triggered when:** not solvable, **or the validation loop exhausts without consensus**
**Job:** Rep-ready case summary — root cause, actions already taken, recommended next steps.
**Output:** Case summary → representative queue

> The exhaustion path is a feature, not a fallback. When our agents cannot reach confident consensus, we do not fabricate an answer — we hand a representative everything we found. This is the same artifact the Call Assist workflow needs, which is why the pre-call Escalation-Flag and the during-call Escalation Agent are **one agent with two render surfaces**.

### Benefits-Navigator

**Data:** `coverage_rules`
**Job:** Instant plain-language answers to CPT lookups, prior-auth requirements, coverage details, and cost-sharing — no phone call. **Every answer cites a `rule_id`** (grounded retrieval; no ungrounded generation on benefits).
**Serves two surfaces from one agent:** members self-serving on the dashboard, and representatives during a live call. The prompt names both.
**Output:** Coverage answer + citation

### Compliance-Sentinel

**Data:** `compliance_flags` only
**Job:** Surface system health signals, compliance gaps, and operational risk before they create member-facing disruption. `compliance_flags.csv` ships with `severity`, `entity_id`, `description`, and a pre-written `recommended_action` — the agent **triages and prioritizes rather than inventing**, which is what keeps it grounded.
**Output:** Ranked ops risk feed

Covers two prompt requirements at once:
- **Use case 4** directly — all 312 flags, all unresolved, all five types on-prompt.
- **Use case 3's proactive half** — the 70 `ROI_AUTHORIZATION_GAP` flags are the "notify users proactively before reaching an agent" requirement.

> Earlier drafts had this agent reading `segment_performance` and `stars_performance`. Both are `measure_id`-keyed and belong to the other prompt. Corrected to `compliance_flags` only.

---

## Call Risk Score

Not present in the data — computed deterministically from:

- Claim denied **and** `denial_fixable`
- ROI missing **or** expired
- `prior_auth_required` and not `prior_auth_obtained`
- `denial_risk_flag`
- Open `compliance_flags` on the claim or member — a member with an unresolved `ROI_AUTHORIZATION_GAP` or a claim with `CLAIM_REVIEW_STALLED` is genuinely likely to call

Weighted → 0–100. **A heuristic, not a trained model.** Label it as such in the pitch — do not let anyone say "our model predicts an 89% call risk" to a Humana judge.

---

## Claim Journey Dashboard

**Seven fields.** Every one has exactly one owner. Two never touch an LLM — deliberately, because those are the ones that must never hallucinate.

| Field | Example | Produced by |
|---|---|---|
| Claim Status | Under Review | `claims.claim_status` (raw data) |
| Issue Identified | Missing Prior Authorization | Issue-Detector → Mediator |
| Owner | Provider | Mediator |
| Next Step | Submit Authorization Form | Error-Fixer |
| Estimated Resolution | 3–5 business days | `reprocessing_days_est` + Error-Fixer |
| ROI Status | On File | ROI Gate |
| Call Risk Score | 89% | Deterministic function |

> **Changed from the original 9-field design.** *Care Gap Alerts* and *Available Appointment* are cut — care gaps are not in Prompt 1. Anyone building the UI should work from these seven.

**The `dashboard_payload` Pydantic schema is the team contract.** It is frozen first, before any agent is built, so UI work proceeds in parallel against a stable interface.

---

## Call Assist Workflow (During the Call)

```
Member / Provider calls
        ▼
Caller provides last name / member ID
        ▼
ROI Gate verifies authorization
        ▼
Escalation-Flag case summary (already generated pre-call, or on demand):
  · Root cause
  · Actions already taken
  · Recommended next steps
        ▼
Representative opens with full context — no lookup required
```

---

## Design Principles

- **Authorization gates data access.** ROI is verified at the entry callback, before any tool fetches member data — not audited mid-pipeline.
- **Single responsibility per agent.** No agent both identifies and routes.
- **Bounded validation loop, no unbounded cycles.** The Mediator may reject and re-dispatch the researchers, capped at 2 iterations with a deterministic exhaustion path to escalation. This is a controlled retry that terminates by construction — not the unbounded ping-pong the original Error-Handler design risked.
- **Deterministic where correctness matters.** Routing, risk scoring, and claim status are code, not generation. LLMs explain and reconcile; they do not decide facts.
- **Grounded, not generated.** Benefits answers cite `rule_id`. Compliance triages pre-written flags.
- **Defined exit paths.** Solvable, unsolvable, and no-consensus all have explicit destinations.
- **Parallel where possible.** Researchers run simultaneously; satellites run alongside the spine.

---

## Evaluation

**`claims.denial_fixable` is ground truth for the Solvability-Router.**

Batch the router across all **212 denied claims** and score its `solvable` verdict against the `denial_fixable` label (156 True / 56 False). This yields a real accuracy number on a real held-out label.

Secondary: replay the 12 call transcripts as end-to-end scenarios — each maps to a use case, including the ROI refusal path.

> This is the differentiator. Every team will *claim* their agents work. The measured number answers Impact-5 ("credible path to measurable business impact"), Problem-Understanding-5 ("measurable success metrics"), and Presentation-5 ("directly connects the solution to measurable business impact") with a single artifact.

**Business metrics narrative:** AHT (pre-loaded rep context), First Call Resolution (self-service dashboard + grounded benefits answers), repeat contact rate (proactive next steps), preventable denials (Issue-Detector on the 203 pending claims + 17 risk-flagged).

---

## Rubric Coverage

| Category | How this architecture answers it |
|---|---|
| **Problem Understanding** | Root causes traced to specific data (43 expired ROIs, 18 modifier mismatches, 203 pre-adjudication claims); four stakeholders; measured success metric |
| **Technical Ambition** | ADK `SequentialAgent` + `ParallelAgent` + `LoopAgent`; validation loop with feedback; callback-based governance; structured state passing |
| **Creativity** | All four Rating-5 examples: claim story generation, denial prevention, compliance risk prediction, predictive operational support |
| **Presentation** | Frozen contract enables parallel team workstreams; tradeoffs documented throughout this file |
| **Solution Impact** | Measured router accuracy on 212 claims; four metrics addressed |
| **AI Approach** | Six methods combined: structured outputs, confidence thresholds, risk scoring, agent routing, grounded retrieval, validation loop |
| **User Experience** | Four stakeholder surfaces: member dashboard, provider summary, rep case file, ops feed |
| **Feasibility / Scalability** | Modular tools layer beneath thin agents; deterministic core; ROI gate as enterprise governance; BigQuery is the production swap for the pandas demo layer |

---

## Build Sequence (8-hour budget)

| Time | Phase |
|---|---|
| 0:00–0:30 | **Freeze `dashboard_payload` schema + hand-written sample JSON** → unblocks UI teammates. Python 3.12 venv, `pip install google-adk`, Vertex AI smoke test. |
| 0:30–2:00 | **Tools layer** (pandas, no LLM): `check_roi`, `get_claim`, `get_coverage_rule`, `get_compliance_flags`, `compute_call_risk_score` |
| 2:00–5:00 | **ROI gate, then the claim spine**: Summarizer → Detector → researchers → Mediator → router → exits |
| 5:00–6:00 | **Satellites** (Benefits-Nav, Compliance-Sentinel) + payload assembly. First end-to-end run. |
| 6:00–7:00 | **Eval harness** — router vs. `denial_fixable` across 212 claims |
| 7:00–8:00 | Hero claim, rehearsal, precompute the demo cohort |

### Priority order — cut upward from the bottom if behind

1. ROI gate (~20 lines; use case 3; transcript 04 is the demo)
2. Tools layer (everything is thin wrapping over it)
3. Claim spine, straight-line — no loop yet (use case 1)
4. Benefits-Nav + Compliance-Sentinel (~40 min for use cases 2 and 4)
5. Eval harness (the number nobody else will have)
6. Validation loop (Technical Ambition — only if the feedback is real)
7. Live demo polish (precompute the cohort regardless)

### Known risks

- **ADK on Python 3.13** may fail to install → mitigated by a 3.12 venv; surfaces in the first 30 minutes by design.
- **Qwiklabs project quota** on `aiplatform.googleapis.com` → also surfaces in Phase 0.
- **Latency:** the full spine is ~5 LLM hops, ~8 with the loop (~20–40s per claim). Precompute the demo cohort; run live only on the hero claim.
- **Overreach:** the failure mode is four half-built agents instead of one working system. Items 1–5 are mostly deterministic Python with a thin LLM surface, which is what makes the budget hold. If Phase 0 slips, cut the loop before the satellites.

---

## Cuts From the Original Design, and Why

| Agent | Disposition | Rationale |
|---|---|---|
| **ROI Agent** | → ROI Gate callback | Same check in two places can disagree. It is a gate, not an agent. |
| **Escalation Agent** | → merged into Escalation-Flag | Pre-call and during-call produce an identical artifact. One agent, two render surfaces. |
| **Intervention Agent** | → deferred | A second orchestrator over all agent outputs with no demo surface of its own. Its one visible output, the Call Risk Score, is a deterministic function. |
| **Solvability-Router** | → demoted to code | It reads a boolean the Mediator already produced. An LLM call here adds latency and non-determinism, not intelligence. |
| **Compliance-Sentinel** | → **added back** | Initially cut for budget. The rubric names "compliance risk prediction" as a Rating-5 example and 312 flag rows sat unused. Restored at ~20 minutes' cost. |
| **Benefits-Navigator** | → **added** | An entire prompt use case for ~20 minutes, because `coverage_rules` is already in the tools layer. |
| **Care-Gap Agent** | → **deleted** | Not in the prompt. Care gaps came from an early draft of this architecture and from `measure_id`-keyed tables that belong to a different hackathon prompt. Scope drift from the dataset, not from the ask. Its dashboard fields are removed and the Call Risk Score now uses `compliance_flags` instead — a better-grounded signal. |
