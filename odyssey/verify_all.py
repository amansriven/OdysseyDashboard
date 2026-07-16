"""Run every entry point once. Prove what works instead of assuming."""

import asyncio
import sys

from google.adk.runners import InMemoryRunner
from google.genai import types

from .agents import benefits_navigator, compliance_sentinel

APP = "verify"


async def ask(agent, question: str) -> str:
    runner = InMemoryRunner(agent=agent, app_name=APP)
    s = await runner.session_service.create_session(app_name=APP, user_id="v")
    msg = types.Content(role="user", parts=[types.Part(text=question)])
    out, tools_used = [], []
    async for e in runner.run_async(user_id="v", session_id=s.id, new_message=msg):
        if e.content and e.content.parts:
            for p in e.content.parts:
                if p.function_call:
                    tools_used.append(p.function_call.name)
                elif p.text and p.text.strip():
                    out.append(p.text.strip())
    return " | tools: " + (",".join(tools_used) or "NONE") + "\n" + (out[-1] if out else "(no text)")


async def main() -> None:
    checks = [
        ("BENEFITS  (use case 2)", benefits_navigator,
         "Does CPT 29881 need prior authorization on a DSNP plan, and what will it cost?"),
        ("BENEFITS  grounding test", benefits_navigator,
         "Is CPT 99999 covered on a PPO plan?"),  # no rule exists -- must refuse, not invent
        ("COMPLIANCE (use case 4)", compliance_sentinel,
         "What are the highest priority ROI_AUTHORIZATION_GAP flags today? Name 2."),
    ]
    failures = 0
    for label, agent, q in checks:
        print("=" * 72)
        print(f"{label}\nQ: {q}")
        try:
            r = await ask(agent, q)
            print(f"A: {r[:600]}")
        except Exception as e:
            failures += 1
            print(f"FAILED: {type(e).__name__}: {str(e)[:180]}")
        print()
        await asyncio.sleep(8)  # stay under the rolling per-minute window
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    asyncio.run(main())
