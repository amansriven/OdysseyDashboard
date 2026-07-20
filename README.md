# Odyssey — Multi-Agent Claims Intelligence System

Odyssey is a multi-agent AI system that helps health-plan members, providers, and
call-center representatives understand claims **before a phone call is needed**. It
predicts and explains claim outcomes in plain language, answers benefits and
coverage questions, pre-screens for missing authorizations, and surfaces
operational risk — shifting a claims operation from reactive explanation to
proactive prevention and self-service.

Built on the [Google Agent Development Kit (ADK)](https://google.github.io/adk-docs/)
with Gemini, a deterministic Python tool layer, a Flask API, a React dashboard, and
MongoDB.

> The dataset is fully synthetic. No real member data is used.

---

## Why it's built this way

The core design rule: **the LLM explains, answers, and reconciles — it never decides
a fact.** Routing, remedies, risk scoring, and authorization checks are deterministic
code in the tool layer. Agents reason over and narrate those results but cannot
invent them. This keeps member-facing output grounded and auditable — the numbers
and decisions come from data, not from a language model's guess.

---

## What it does

| # | Capability | Description |
|---|---|---|
| 1 | **Predict & explain claims** | Generates a plain-language "claim story" — what happened, who needs to act, and the next step. Predicts likely denials on pending claims *before* adjudication. |
| 2 | **Answer benefits questions** | Instant, grounded answers on coverage, prior-authorization requirements, and cost-sharing. Every answer cites the coverage rule it used. |
| 3 | **Pre-screen authorization gaps** | A Release-of-Information (ROI) gate verifies a caller is permitted to receive a member's information *before* any data is fetched. |
| 4 | **Monitor compliance & operational risk** | Triages a live queue of operational and compliance flags, prioritizing by severity. |

---

## Architecture

```
  ROI GATE  (before_agent_callback — no member data fetched until the caller is authorized)
       │
       ▼
  ORCHESTRATOR  ── routes a request to the right specialist ──┐
       │                                                      │
       ▼                                                      ▼
  CLAIM SPINE (SequentialAgent)                 BENEFITS-NAVIGATOR   COMPLIANCE-SENTINEL
       │                                        (grounded Q&A)       (ops risk triage)
  Claim-Summarizer  → plain-language summary
       ▼
  Issue-Detector    → predicts/classifies the problem
       ▼
  Researchers       → claim/coverage lens + authorization lens
       ▼
  Mediator          → reconciles findings into one verdict
       ▼
  Solvability-Router (deterministic gate)
       ├─ solvable ──► Error-Fixer      → step-by-step instructions for the member/provider
       └─ not      ──► Escalation-Flag  → rep-ready case summary
```

A **deterministic tool layer** sits beneath every agent: claim/member/coverage
lookups, the ROI check, denial-remedy tables, and a call-risk heuristic. Agents call
these tools; they never compute facts themselves.

---

## Tech stack

- **Agents:** Google Agent Development Kit (ADK), Gemini 2.5 Flash (via Vertex AI or an API key)
- **Backend:** Python 3.12, Flask + Flask-CORS
- **Data:** MongoDB (Atlas or self-hosted), with a CSV fallback; pandas
- **Frontend:** React, TypeScript, Vite, Tailwind, shadcn/ui
- **Config:** python-dotenv (single `.env`, nothing hardcoded)

---

## Project structure

```
odyssey/                 # Python backend
  config.py              # central .env loader — the one place secrets are read
  data.py                # data access: MongoDB when configured, else CSV
  load_mongo.py          # loads the CSV tables into MongoDB
  tools.py               # deterministic tool layer (lookups, ROI check, remedies, risk)
  agents.py              # the specialized agents + the claim pipeline
  orchestrator.py        # routes a request to the right agent
  call_path.py           # inbound-call flow with the ROI gate
  api_server.py          # Flask API (chat + dashboard endpoints)
  precompute.py          # precompute dashboard data for fast/offline demos
  schemas.py             # Pydantic contracts (dashboard payload, agent state)
  run.py                 # run the claim pipeline on a single claim
adk_apps/                # ADK web apps (claim / benefits / compliance) for the trace UI
ui/                      # React + Vite dashboard
training_data/           # synthetic CSV dataset
.env.example             # config template — copy to .env
requirements.txt
```

### Dataset (synthetic)

| Table | Rows |
|---|---|
| claims | 880 |
| roi_authorizations | 352 |
| compliance_flags | 312 |
| members | 200 |
| coverage_rules | 80 |
| providers | 50 |

---

## Getting started

### 1. Configure

```bash
cp .env.example .env
```

Edit `.env` with your own values:

```ini
# Google / Vertex AI (serves Gemini)
GOOGLE_GENAI_USE_VERTEXAI="TRUE"
GOOGLE_CLOUD_PROJECT="your-gcp-project-id"
GOOGLE_CLOUD_LOCATION="us-central1"
# Or use an AI Studio key instead of Vertex:
# GOOGLE_GENAI_USE_VERTEXAI=""
# GOOGLE_API_KEY="your-api-key"

# MongoDB (leave MONGO_URI blank to use the local CSV data)
MONGO_URI="mongodb+srv://USER:PASSWORD@cluster.xxxxx.mongodb.net/"
MONGO_DB="odyssey"
```

`.env` is gitignored and never committed.

### 2. Install

```bash
pip install -r requirements.txt
```

### 3. (Optional) Load the data into MongoDB

```bash
python3 -m odyssey.load_mongo
```

With `MONGO_URI` blank, the system reads the CSVs directly — no database required.

### 4. Run

**The agent trace UI (see agents run step by step):**
```bash
adk web adk_apps
# open the printed URL, pick an app, e.g. ask odyssey_claim: "Process claim CLM000377."
```

**One claim through the pipeline, in the terminal:**
```bash
python3 -m odyssey.run CLM000377
```

**The API server:**
```bash
python3 -m odyssey.api_server        # serves on :5000
```

**The dashboard:**
```bash
cd ui && npm install && npm run dev  # serves on :5173, proxies /api to :5000
```

---

## Design principles

- **Authorization gates data access.** The ROI check runs before any tool fetches
  member data — not as an afterthought.
- **Deterministic where correctness matters.** Routing, remedies, and risk scores are
  code, not model output.
- **Grounded, not generated.** Benefits answers cite the rule they came from.
- **Single responsibility per agent.** No agent both detects a problem and routes it.
- **Defined exit paths.** Every claim resolves to instructions, escalation, or a
  clear "no action needed."

---

## License

MIT
