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
     cd ~ && python3 -m odyssey.run CLM000163      # the hero claim:
                                                   # pending, prior-auth gap,
                                                   # denial caught before it happens
     Other claims worth trying:
       CLM000003   a DENIED claim -> deterministic remedy lookup
       CLM000297   another pending prior-auth gap
       CLM000001   a clean claim -> Issue_Detector correctly says NONE

  2) SEE THE AGENTS IN A UI (the demo surface)
     -----------------------------------------------------------------
     cd ~ && adk web ~/adk_apps --port 8080

     Then: click "Web Preview" (top-right, the <> icon)
           -> "Preview on port 8080"

     Pick an app from the dropdown:
       odyssey_claim       "Process claim CLM000163."
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
