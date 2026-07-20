"""The CALL path -- use case 3, "Pre-Screen for ROI Gaps".

This is a different entry point from the dashboard, with a different population.

The dashboard is a member looking at their own claim: no caller, no ROI question.
The call path is someone phoning in who may be ANYONE. That is where ROI lives,
and it is the reason the prompt says "notify users proactively BEFORE reaching
an agent" -- these calls consume representative time with no clinical value.

The gate is a before_agent_callback, not an agent, because the design principle
is that authorisation is checked BEFORE data is fetched. An agent five steps deep
that checks ROI is an audit, not a gate: by then the PHI is already disclosed.

Demo: transcript_04_roi_missing.txt -- a son calls about his 78-year-old mother's
claim, has no ROI on file, and must be refused. Note that MBR00175 DOES have
authorised callers (Douglas Wilson, Michael Estrada) -- just not David. The gate
is per-caller, not per-member.
"""

from __future__ import annotations

from typing import Optional

from google.adk.agents import LlmAgent
from google.adk.agents.callback_context import CallbackContext
from google.genai import types

from . import tools
from .agents import MODEL, NO_MATH


def roi_gate(callback_context: CallbackContext) -> Optional[types.Content]:
    """Runs BEFORE the agent. No member data is fetched unless this passes.

    Returning Content short-circuits the agent entirely -- the LLM never sees the
    claim, because it never runs. That is what makes this a gate rather than a
    policy the model is asked to respect.
    """
    state = callback_context.state
    member_name = (state.get("member_name") or "").strip()
    member_dob = (state.get("member_dob") or "").strip()
    caller_name = (state.get("caller_name") or "").strip()

    if not member_name or not member_dob or not caller_name:
        return types.Content(role="model", parts=[types.Part(
            text="I need the member's full name, date of birth, and your name before I can look anything up."
        )])

    # First, find the member by name and DOB
    member_lookup = tools.find_member_by_name_dob(member_name, member_dob)
    if "error" in member_lookup:
        state["roi_cleared"] = False
        return types.Content(role="model", parts=[types.Part(
            text=f"I couldn't find a member with name '{member_name}' and date of birth '{member_dob}'. "
                 "Please verify the information is correct."
        )])

    member_id = member_lookup["member_id"]
    state["member_id"] = member_id  # Store for agent to use

    # Now check ROI for this member
    roi = tools.check_roi(member_id, caller_name)
    state["roi_check"] = roi
    status = roi["status"]

    if status in ("SELF", "ON_FILE"):
        state["roi_cleared"] = True
        return None  # proceed: the agent runs

    # BLOCKED. The agent never runs; no claim data is fetched.
    state["roi_cleared"] = False
    if status == "EXPIRED":
        msg = (
            f"I'm not able to share {member_name}'s information with you. "
            f"{roi.get('reason', '')} "
            "A renewed Release of Information form is needed first. I can send the form, "
            "or the member can call us directly and act on their own behalf."
        )
    else:
        msg = (
            f"I'm not able to share {member_name}'s information with you. "
            "For the protection of our members, I need a Release of Information "
            "authorisation on file for you, and I'm not showing one. "
            "Verbal consent isn't sufficient under our compliance guidelines, even if "
            "the member is with you. I can mail the form to the address on file or you "
            "can complete it in the member portal. The member may also call us directly "
            "and we can act on their verbal authorisation as the member themselves."
        )
    return types.Content(role="model", parts=[types.Part(text=msg)])


call_assist = LlmAgent(
    name="Call_Assist",
    model=MODEL,
    description="Handles an inbound caller. ROI is screened before any data is fetched.",
    before_agent_callback=roi_gate,
    instruction="""You are helping an authorised caller with a member's claim.

The ROI gate has already cleared this caller -- you would not be running otherwise.
Do not re-litigate authorisation.

Look up what they ask about with get_claim, get_roi_summary, or get_compliance_flags.
Answer in plain language. Be brief and warm; this person is on a phone call.
""" + NO_MATH + """
""",
    tools=[tools.get_claim, tools.get_roi_summary, tools.get_compliance_flags],
    output_key="call_answer",
)
