"""Run the Odyssey claim spine on one claim, end to end.

    python3 -m odyssey.run CLM000163
"""

from __future__ import annotations

import asyncio
import json
import sys

from google.adk.runners import InMemoryRunner
from google.genai import types

from . import tools
from .agents import claim_spine
from .schemas import DashboardPayload

APP = "odyssey"


async def run_claim(claim_id: str) -> dict:
    runner = InMemoryRunner(agent=claim_spine, app_name=APP)
    session = await runner.session_service.create_session(app_name=APP, user_id="demo")

    msg = types.Content(role="user", parts=[types.Part(text=f"Process claim {claim_id}.")])
    print(f"\n{'='*72}\nCLAIM {claim_id}\n{'='*72}")

    async for event in runner.run_async(user_id="demo", session_id=session.id, new_message=msg):
        if event.author and event.content and event.content.parts:
            for p in event.content.parts:
                if p.function_call:
                    args = dict(p.function_call.args or {})
                    print(f"  [{event.author}] -> tool {p.function_call.name}({args})")
                elif p.text and p.text.strip():
                    head = p.text.strip().replace("\n", " ")[:150]
                    print(f"  [{event.author}] {head}")

    state = (await runner.session_service.get_session(
        app_name=APP, user_id="demo", session_id=session.id)).state
    return state


def assemble(claim_id: str, state: dict) -> DashboardPayload:
    """Build the dashboard contract. Deterministic fields come from data, never the LLM."""
    def js(v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except Exception:
                return {}
        return v or {}

    verdict = js(state.get("verdict"))
    claim = tools.get_claim(claim_id)
    risk = tools.compute_call_risk_score(claim_id)
    escalated = bool(state.get("escalated"))

    roi = tools.check_roi(claim["member_id"], "")
    roi_map = {"SELF": "Member (self)", "ON_FILE": "On File",
               "EXPIRED": "Expired", "NOT_ON_FILE": "Not On File"}

    days = claim.get("reprocessing_days_est")
    return DashboardPayload(
        claim_id=claim_id,
        member_id=claim["member_id"],
        claim_status=claim["claim_status"],                    # raw data, never generated
        issue_identified=verdict.get("issue") or "None",
        owner=verdict.get("owner"),
        next_step=(state.get("resolution") or "Referred to a representative.").strip(),
        estimated_resolution=f"{int(float(days))} days" if days else "Not yet determined",
        roi_status=roi_map.get(roi["status"], "Not On File"),
        call_risk_score=risk["call_risk_score"],               # deterministic heuristic
        escalated=escalated,
        case_summary=(state.get("case_summary") or "").strip() or None,
    )


async def main() -> None:
    claim_id = sys.argv[1] if len(sys.argv) > 1 else "CLM000163"
    state = await run_claim(claim_id)
    payload = assemble(claim_id, state)
    print(f"\n{'='*72}\nDASHBOARD PAYLOAD (the team contract)\n{'='*72}")
    print(payload.model_dump_json(indent=2))


if __name__ == "__main__":
    asyncio.run(main())
