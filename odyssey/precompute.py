"""Precompute the dashboard JSON the UI loads.

    python3 -m odyssey.precompute            -> writes ui/src/data/claims.json

Why precompute rather than serve a live API: one claim takes ~75s through the
pipeline, and this project's Vertex quota drops bursts. A dashboard that spins
for a minute per row, or 429s mid-demo, is worse than one that loads instantly
from real agent output captured ahead of time. The JSON here IS what the agents
produced -- nothing is written by hand.

Shape matches the UI's existing consts exactly (id/member/service/issue/fix/risk),
so App.tsx swaps `const CLAIMS = [...]` for an import and no component changes.
"""

from __future__ import annotations

import asyncio
import json
from pathlib import Path

from google.adk.runners import InMemoryRunner
from google.genai import types

from . import data, tools
from .agents import claim_spine

APP = "precompute"
DEMO_MEMBER = "MBR00070"          # John Rodriguez, HMO -- 7 claims, all 4 statuses
REP_EXTRA = ["CLM000005", "CLM000010"]  # other members, escalated -> for the rep view

# Their UI's status vocabulary differs from the data's.
STATUS = {"Paid": "completed", "In Review": "inprogress", "Pending": "pending", "Denied": "denied"}


def risk_band(score: int) -> str:
    """Their UI wants high/medium/low; compute_call_risk_score returns 0-100."""
    return "high" if score >= 60 else "medium" if score >= 30 else "low"


def needs_agents(c: dict) -> bool:
    """Only run the pipeline where there is something to reason about.

    A Paid claim has no issue and no fix -- running six LLM agents over it to
    conclude "nothing is wrong" costs 75s and quota to produce two nulls.
    """
    if c["claim_status"] == "Denied":
        return True
    if c["claim_status"] in ("Pending", "In Review"):
        return bool(c["prior_auth_required"]) and not bool(c["prior_auth_obtained"])
    return False


async def run_spine(claim_id: str) -> dict:
    runner = InMemoryRunner(agent=claim_spine, app_name=APP)
    s = await runner.session_service.create_session(app_name=APP, user_id="p")
    msg = types.Content(role="user", parts=[types.Part(text=f"Process claim {claim_id}.")])
    async for _ in runner.run_async(user_id="p", session_id=s.id, new_message=msg):
        pass
    return (await runner.session_service.get_session(
        app_name=APP, user_id="p", session_id=s.id)).state


def as_json(v):
    if isinstance(v, str):
        try:
            return json.loads(v)
        except Exception:
            return {}
    return v or {}


async def build_claim(claim_id: str) -> dict:
    c = tools.get_claim(claim_id)
    m = data.row("members", "member_id", c["member_id"])
    risk = tools.compute_call_risk_score(claim_id)["call_risk_score"]

    issue = fix = owner = case_summary = None
    escalated = False
    if needs_agents(c):
        print(f"    {claim_id}  running agents...", flush=True)
        st = await run_spine(claim_id)
        verdict = as_json(st.get("verdict"))
        issue = verdict.get("issue")
        owner = verdict.get("owner")
        escalated = bool(st.get("escalated"))
        fix = (st.get("resolution") or "").strip() or None
        case_summary = (st.get("case_summary") or "").strip() or None
        await asyncio.sleep(5)  # stay off the rolling per-minute quota window
    else:
        print(f"    {claim_id}  clean ({c['claim_status']}) -- no agents needed", flush=True)

    billed = float(c["billed_amount"] or 0)
    paid = float(c["paid_amount"] or 0)
    if c["claim_status"] == "Paid":
        you_owe = round(billed - paid, 2)
    elif c["claim_status"] == "Denied":
        you_owe = 0
    else:
        you_owe = None  # not adjudicated yet -- do not invent a number

    return {
        "id": claim_id,
        "member": f"{m['first_name']} {m['last_name']}",
        "dob": str(m["dob"].date()) if hasattr(m["dob"], "date") else str(m["dob"]),
        "service": c["cpt_description"],
        "date": c["service_date"],
        "status": STATUS.get(c["claim_status"], "pending"),
        "provider": c["provider_name"],
        "billed": round(billed, 2),
        "planPaid": round(paid, 2) if c["claim_status"] == "Paid" else (0 if c["claim_status"] == "Denied" else None),
        "youOwe": you_owe,
        "issue": issue,
        "fix": fix,
        "risk": risk_band(risk),
        # extras beyond the UI's current consts -- the rep view can use these
        "riskScore": risk,
        "owner": owner,
        "escalated": escalated,
        "caseSummary": case_summary,
        "denialCode": c["denial_code"] or None,
        "estimatedResolution": (f"{int(float(c['reprocessing_days_est']))} days"
                                if c.get("reprocessing_days_est") else None),
    }


def build_benefits(plan_type: str) -> dict:
    """Real copays from coverage_rules, and NOTHING ELSE.

    An earlier version emitted outOfPocketMax: 4900 -- copied from the UI's mock
    data because the field existed in the component. The dataset has no
    out-of-pocket figures. Inventing one and shipping it inside a payload
    labelled "real agent output" is the same failure as the agent inventing
    "103 days": a plausible number, stated as fact, that nothing supports.
    If the dataset does not have it, this does not emit it, and the UI shows a
    dash. A missing field is honest; a made-up one is not.
    """
    def copay(cpt: str):
        r = tools.get_coverage_rule(plan_type, cpt)
        return None if "error" in r else int(float(r["copay"]))

    return {
        "primaryCare": copay("99213"),   # Office Visit - Established, Level 3
        "specialist": copay("99214"),    # Office Visit - Established, Level 4
        "_source": f"coverage_rules.csv, plan_type={plan_type}. Fields absent from "
                   f"the dataset (out-of-pocket max/used, ER, drug tiers) are omitted "
                   f"rather than estimated.",
    }


async def main() -> None:
    m = data.row("members", "member_id", DEMO_MEMBER)
    claims_df = data.table("claims")
    mine = list(claims_df[claims_df["member_id"] == DEMO_MEMBER]["claim_id"])

    print(f"Demo member: {DEMO_MEMBER} {m['first_name']} {m['last_name']} ({m['plan_type']})")
    print(f"  their claims: {len(mine)} | rep-view extras: {len(REP_EXTRA)}\n")

    out = []
    for cid in mine + REP_EXTRA:
        out.append(await build_claim(cid))

    payload = {
        "member": {
            "name": f"{m['first_name']} {m['last_name']}",
            "first": m["first_name"],
            "id": DEMO_MEMBER,
            "plan": f"Humana {m['plan_type']}",
        },
        "claims": out,
        "benefits": build_benefits(m["plan_type"]),
        "_generated": "odyssey.precompute -- every issue/fix/caseSummary is real agent output",
    }

    dest = Path(__file__).resolve().parents[1] / "ui" / "src" / "data"
    dest.mkdir(parents=True, exist_ok=True)
    (dest / "claims.json").write_text(json.dumps(payload, indent=2))
    print(f"\nwrote {dest / 'claims.json'}")
    print(f"  {len(out)} claims | {sum(1 for c in out if c['issue'])} with issues "
          f"| {sum(1 for c in out if c['escalated'])} escalated")


if __name__ == "__main__":
    asyncio.run(main())
