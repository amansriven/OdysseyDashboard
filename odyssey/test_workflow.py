"""Exercise the paths ARCHITECTURE.md describes that nothing has run yet:
the ROI call gate (use case 3) and the Escalation-Flag branch.

    python3 -m odyssey.test_workflow
"""

from __future__ import annotations

import asyncio
import json

from google.adk.runners import InMemoryRunner
from google.genai import types

from . import data, tools
from .agents import claim_spine
from .call_path import call_assist

APP = "wf"


async def call(member_id: str, caller_name: str, question: str) -> tuple[str, str]:
    """Drive the call path. Caller identity goes in state, as a real IVR would supply it."""
    runner = InMemoryRunner(agent=call_assist, app_name=APP)
    s = await runner.session_service.create_session(
        app_name=APP, user_id="c",
        state={"member_id": member_id, "caller_name": caller_name},
    )
    msg = types.Content(role="user", parts=[types.Part(text=question)])
    out, tool_calls = [], []
    async for e in runner.run_async(user_id="c", session_id=s.id, new_message=msg):
        if e.content and e.content.parts:
            for p in e.content.parts:
                if p.function_call:
                    tool_calls.append(p.function_call.name)
                elif p.text and p.text.strip():
                    out.append(p.text.strip())
    st = (await runner.session_service.get_session(app_name=APP, user_id="c", session_id=s.id)).state
    cleared = st.get("roi_cleared")
    fetched = "YES" if tool_calls else "no"
    return (f"cleared={cleared} data_fetched={fetched}", out[-1] if out else "")


async def spine(claim_id: str) -> dict:
    runner = InMemoryRunner(agent=claim_spine, app_name=APP)
    s = await runner.session_service.create_session(app_name=APP, user_id="d")
    msg = types.Content(role="user", parts=[types.Part(text=f"Process claim {claim_id}.")])
    async for _ in runner.run_async(user_id="d", session_id=s.id, new_message=msg):
        pass
    return (await runner.session_service.get_session(app_name=APP, user_id="d", session_id=s.id)).state


async def main() -> None:
    print("=" * 74)
    print("PART 1 -- ROI CALL GATE  (use case 3, never tested before now)")
    print("=" * 74)

    m = data.row("members", "member_id", "MBR00175")
    self_name = f"{m['first_name']} {m['last_name']}"
    roi = data.table("roi_authorizations")
    authorised = roi[(roi["member_id"] == "MBR00175") & (roi["auth_on_file"] == True)]  # noqa: E712
    auth_name = authorised.iloc[0]["authorized_caller_name"] if len(authorised) else "Douglas Wilson"
    expired_row = roi[roi["auth_expired"] == True].iloc[0]  # noqa: E712

    cases = [
        ("SELF -- the member herself", "MBR00175", self_name),
        ("ON_FILE -- authorised third party", "MBR00175", auth_name),
        ("NOT_ON_FILE -- transcript_04: son David", "MBR00175", "David"),
        ("EXPIRED -- lapsed authorisation", expired_row["member_id"], expired_row["authorized_caller_name"]),
    ]
    for label, mid, caller in cases:
        meta, answer = await call(mid, caller, "What's happening with my recent claim?")
        print(f"\n  {label}")
        print(f"    caller: {caller!r} -> {meta}")
        print(f"    {answer[:190]}")
        await asyncio.sleep(6)

    print("\n" + "=" * 74)
    print("PART 2 -- ESCALATION BRANCH  (not solvable -> human rep, never fired before)")
    print("=" * 74)
    for claim_id, why in [("CLM000005", "CO-29 timely filing -- owner=None"),
                          ("CLM000010", "CO-50 non-covered -- owner=None")]:
        st = await spine(claim_id)
        v = st.get("verdict")
        if isinstance(v, str):
            try:
                v = json.loads(v)
            except Exception:
                v = {}
        print(f"\n  {claim_id}  ({why})")
        print(f"    escalated       : {st.get('escalated')}")
        print(f"    verdict.solvable: {(v or {}).get('solvable')}")
        summary = (st.get("case_summary") or "").strip()
        print(f"    case_summary    : {'PRESENT' if summary else '*** MISSING ***'}")
        if summary:
            for line in summary.splitlines()[:6]:
                if line.strip():
                    print(f"      | {line[:96]}")
        await asyncio.sleep(6)


if __name__ == "__main__":
    asyncio.run(main())
