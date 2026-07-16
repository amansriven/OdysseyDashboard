#!/usr/bin/env bash
# Odyssey -- run it yourself in Cloud Shell.
#
#   source ~/odyssey/QUICKSTART.sh     <- sets env + prints what to run
#
# Everything already lives in ~/odyssey and ~/adk_apps. Nothing to install.

export GOOGLE_GENAI_USE_VERTEXAI=TRUE
export GOOGLE_CLOUD_PROJECT=qwiklabs-gcp-03-73322a4eafa0
export GOOGLE_CLOUD_LOCATION=us-central1
export PYTHONPATH=$HOME

cat <<'BANNER'

  ODYSSEY -- ready. Environment set.

  1) RUN THE CLAIM PIPELINE (terminal, ~75s)
     -----------------------------------------------------------------
     cd ~ && python3 -m odyssey.run CLM000377      # THE HERO CLAIM:
                                                   # MAPD, Total Knee Arthroplasty,
                                                   # pending, prior auth required but
                                                   # not obtained -> denial caught
                                                   # BEFORE it happens.
                                                   # Rulebook RULE0075 agrees, so the
                                                   # story holds up under scrutiny.
     Other claims worth trying:
       CLM000003   a DENIED claim -> deterministic remedy lookup
       CLM000493   another consistent pending prior-auth gap
       CLM000001   a clean claim -> Issue_Detector correctly says NONE

     AVOID as demo claims (data contradicts itself, 6% of claims do):
       CLM000163 / CLM000831  claim says prior auth required, rulebook says not

  2) SEE THE AGENTS IN A UI (the demo surface)
     -----------------------------------------------------------------
     cd ~ && adk web ~/adk_apps --port 8080 --allow_origins="*"

     --allow_origins IS REQUIRED IN CLOUD SHELL. Web Preview serves your browser
     from https://8080-cs-....cloudshell.dev while the server listens on
     127.0.0.1, so every request is cross-origin. Without the flag ADK returns
     403 Forbidden on session creation and nothing runs. Safe here: dev server,
     bound to localhost, only reachable through Google's authenticated proxy.

     Then: click "Web Preview" (top-right, the <> icon)
           -> "Preview on port 8080"

     If the port is already taken:  fuser -k 8080/tcp

     Pick an app from the dropdown:
       odyssey_claim       "Process claim CLM000377."
       odyssey_benefits    "Does CPT 29881 need prior auth on a DSNP plan?"
       odyssey_compliance  "What ROI_AUTHORIZATION_GAP flags need attention today?"

     The left panel draws the agent tree and lights each node as it runs.
     Click a node to see its tool calls and structured output.

  3) CHECK THE TOOLS WITHOUT BURNING QUOTA (instant, no LLM)
     -----------------------------------------------------------------
     cd ~ && python3 -m odyssey.smoke_test

  NOTE ON 429 ERRORS
  -----------------------------------------------------------------
  This project's Vertex quota is a rolling per-minute window. Sequential
  calls are fine; bursts get dropped. Every agent has retry with backoff,
  so the pipeline rides it out. If you see a 429 from a bare script, wait
  30s -- it recovers.

BANNER
