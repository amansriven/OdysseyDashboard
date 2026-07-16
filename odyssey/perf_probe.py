"""Where does the 75 seconds go? Test the two big levers."""

import time

from google import genai
from google.genai import types

MODEL = "gemini-2.5-flash"
c = genai.Client()

PROMPT = (
    "Claim CLM000163: status Pending, CPT 29881 Knee Arthroscopy, plan DSNP, "
    "prior_auth_required True, prior_auth_obtained False, service_date 2025-12-15. "
    "In two plain sentences, tell the member what happened."
)


def timed(label: str, **cfg) -> float:
    t = time.time()
    r = c.models.generate_content(
        model=MODEL, contents=PROMPT,
        config=types.GenerateContentConfig(**cfg) if cfg else None,
    )
    dt = time.time() - t
    usage = r.usage_metadata
    think = getattr(usage, "thoughts_token_count", None) or 0
    print(f"  {label:32} {dt:5.2f}s   out={usage.candidates_token_count:4} thinking={think:4}")
    return dt


print("LEVER 1: thinking budget (Gemini 2.5 reasons internally by default)")
a = timed("default (thinking on)")
b = timed("thinking_budget=0", thinking_config=types.ThinkingConfig(thinking_budget=0))
print(f"  -> thinking costs {a-b:.2f}s per call ({(a-b)/a*100:.0f}%)\n")

print("LEVER 2: tool round-trips")


def get_claim(claim_id: str) -> dict:
    """Look up a claim."""
    return {"claim_id": claim_id, "status": "Pending", "cpt": "29881"}


t = time.time()
c.models.generate_content(
    model=MODEL,
    contents="Look up claim CLM000163 with get_claim, then say its status in one sentence.",
    config=types.GenerateContentConfig(
        tools=[get_claim],
        thinking_config=types.ThinkingConfig(thinking_budget=0),
    ),
)
with_tool = time.time() - t

t = time.time()
c.models.generate_content(
    model=MODEL,
    contents="Claim CLM000163 has status Pending. Say its status in one sentence.",
    config=types.GenerateContentConfig(thinking_config=types.ThinkingConfig(thinking_budget=0)),
)
prefetched = time.time() - t

print(f"  {'with tool call':32} {with_tool:5.2f}s")
print(f"  {'data prefetched into prompt':32} {prefetched:5.2f}s")
print(f"  -> each tool round-trip costs ~{with_tool-prefetched:.2f}s")

print(f"\nPipeline has ~6 agents and ~8 tool calls.")
print(f"  est. saving from thinking off : {(a-b)*6:5.1f}s")
print(f"  est. saving from prefetching  : {(with_tool-prefetched)*8:5.1f}s")
