"""Odyssey agents.

Design rule, learned the hard way from this dataset: the LLM explains,
answers, and synthesises. It never decides a fact. Routing, remedies, and
risk scoring are deterministic lookups in tools.py, because:

  - denial_fixable is a pure function of denial_code (10 codes, zero mixed)
  - modifier_mismatch is biconditional with CO-4 -- it IS the label
  - the only honest pre-adjudication signal is the prior-auth rule:
    prior_auth_required AND NOT prior_auth_obtained -> will be denied.
    10 pending claims carry it; zero paid claims do.

There is no validation loop. Two researchers reading deterministic CSVs do
not produce conflicting findings, so a Mediator retrying them would be
ceremony that costs latency and buys nothing.
"""

from __future__ import annotations

from typing import AsyncGenerator

from google.adk.agents import BaseAgent, LlmAgent, SequentialAgent
from google.adk.agents.invocation_context import InvocationContext
from google.adk.events import Event
from google.adk.models.google_llm import Gemini
from google.genai import types
from typing_extensions import override

from . import tools
from .schemas import ClaimSummary, DetectedIssue, ResearchFinding, Verdict


def _model() -> Gemini:
    """Gemini with 429 retry that actually fires.

    NOTE: LlmAgent also has a `retry_config` field. Do not use it -- it is only
    consumed by ADK's workflow node runner (tools/_node_tool.py), so under a
    plain Runner it is silently dead config. This was verified the hard way: a
    pipeline with retry_config on all 9 agents still died on a 429.

    retry_options here reaches the underlying genai client, which is the layer
    that actually sees the HTTP 429.

    This project's Vertex quota is a rolling per-minute window: sequential calls
    are fine (12 in 9s, zero failures), bursts above ~4 concurrent get dropped,
    and it recovers within ~30s. Measured, not guessed.
    """
    return Gemini(
        model="gemini-2.5-flash",
        retry_options=types.HttpRetryOptions(
            attempts=6,
            initial_delay=2.0,
            max_delay=45.0,
            exp_base=2.0,
            jitter=0.4,
            http_status_codes=[429, 502, 503, 504],
        ),
    )


MODEL = _model()


# --------------------------------------------------------------------------
# 1. Claim-Summarizer
# --------------------------------------------------------------------------
claim_summarizer = LlmAgent(
    name="Claim_Summarizer",
    model=MODEL,
    description="Turns a raw claim row into a plain-language summary.",
    instruction="""You summarise one health-insurance claim for a member who has no
industry knowledge.

Call get_claim with the claim_id you are given, then get_member for its member_id.

Write `what_happened` as two short sentences in plain English. No jargon, no CPT
codes, no denial codes -- say "an MRI of the lower back", not "72148". Never invent
a fact that is not in the tool output.
""",
    tools=[tools.get_claim, tools.get_member],
    output_schema=ClaimSummary,
    output_key="claim_summary",
)


# --------------------------------------------------------------------------
# 2. Issue-Detector
# --------------------------------------------------------------------------
issue_detector = LlmAgent(
    name="Issue_Detector",
    model=MODEL,
    description="Identifies the claim's problem. Predicts it when adjudication has not happened yet.",
    instruction="""You identify what is wrong with a claim. You detect only -- you never
decide who fixes it or how.

Call predict_denial_risk with the claim_id.

If `pre_adjudication` is TRUE, there is no denial code yet and you must infer the issue
from `signals`. This is the real work. The rule that matters:
  - prior_auth_gap present -> this claim WILL be denied unless authorisation is obtained.
    Set issue_type=PRIOR_AUTH_GAP and is_prediction=true. This is a preventable denial.
Treat `filing_lag_days` as informational only -- it does not predict denial in this data.
If no signal is present, set issue_type=NONE. Do not manufacture a problem. Most
pre-adjudication claims are simply progressing normally, and saying so is correct.

If `pre_adjudication` is FALSE, the claim is already adjudicated. Read the denial_code
from the claim and report it. Set is_prediction=false. You are classifying a known fact,
not predicting.

Put the exact field names and values you relied on in `evidence`.
""",
    tools=[tools.predict_denial_risk, tools.get_claim],
    output_schema=DetectedIssue,
    output_key="issue",
)


# --------------------------------------------------------------------------
# 3. Researchers -- two lenses on the same claim, run one after the other
# --------------------------------------------------------------------------
researcher_claim = LlmAgent(
    name="Researcher_Claim_Coverage",
    model=MODEL,
    description="Investigates the claim and coverage side.",
    instruction="""You investigate the CLAIM AND COVERAGE side of a claim's problem.
Set lens="claim_coverage".

Call get_claim, then get_coverage_rule using the member's plan_type and the claim's
cpt_code. Establish: is this service covered under this plan, does the plan require
prior authorisation for it, and what is the member's cost share?

Report only what the tool output states. Put every field value you actually inspected
in `fields_checked`. If something cannot be determined, say so in `unresolved` rather
than guessing.
""",
    tools=[tools.get_claim, tools.get_member, tools.get_coverage_rule],
    output_schema=ResearchFinding,
    output_key="finding_claim",
)

researcher_auth = LlmAgent(
    name="Researcher_Authorization",
    model=MODEL,
    description="Investigates the prior-authorisation and operational-risk side.",
    instruction="""You investigate the AUTHORISATION side of a claim's problem.
Set lens="auth_risk".

Call get_claim and check prior_auth_required against prior_auth_obtained. A gap between
them is the single most important finding available on a pre-adjudication claim: it means
the claim will be denied unless authorisation is obtained, and it is preventable now.

Call get_compliance_flags with entity_id set to the claim_id, and again with the
member_id, to surface open operational risk on this claim.

Do NOT investigate Release of Information. ROI governs whether a third-party CALLER may
receive a member's information. This is a dashboard request by the member about their own
claim -- there is no caller, and ROI has no bearing on why a claim was denied. Raising it
here buries the real issue under an irrelevant one.

Put every field value you actually inspected in `fields_checked`.
""",
    tools=[tools.get_claim, tools.get_compliance_flags],
    output_schema=ResearchFinding,
    output_key="finding_auth",
)

researchers = SequentialAgent(
    name="Researchers",
    description="Claim/coverage and authorisation lenses.",
    sub_agents=[researcher_claim, researcher_auth],
)
# Deliberately SEQUENTIAL, not ParallelAgent.
#
# Running these two in parallel was the original design and it was the sole cause
# of our 429s. Each researcher makes 2-3 tool round-trips, so two in flight puts
# 6-8 requests on the wire at once -- measured to be exactly where this project's
# quota starts dropping them (2 and 4 concurrent are fine; 8 loses half).
#
# The cost is about five seconds of latency. The benefit is a demo that does not
# die in front of judges. If this ever runs against production-tier quota,
# ParallelAgent is a one-word change back.


# --------------------------------------------------------------------------
# 4. Mediator -- reconciles the two lenses into one verdict
# --------------------------------------------------------------------------
mediator = LlmAgent(
    name="Mediator",
    model=MODEL,
    description="Reconciles both research lenses into a single verdict.",
    instruction="""You reconcile two independent investigations into ONE verdict.

Detected issue:   {issue}
Claim/coverage:   {finding_claim}
Authorisation:    {finding_auth}

Apply this precedence when the lenses disagree about what is blocking:
  1. Prior-auth gap     (claim will be denied without it -- preventable now)
  2. Coverage exclusion (service is not covered under the plan)
  3. Coding error       (modifier or diagnosis mismatch)
The highest applicable rank wins. Name exactly one owner.

REAL CONFLICT YOU MUST HANDLE -- this is your main job, not a formality:
The two lenses read different sources and genuinely disagree on 6% of claims.
  - Researcher_Claim_Coverage reads coverage_rules: the PLAN-LEVEL rule for this
    plan and CPT ("does this plan generally require prior auth for this service?")
  - Researcher_Authorization reads the claim record: the CLAIM-LEVEL flag that
    adjudication actually applied to THIS claim.
When claims.prior_auth_required disagrees with coverage_rules.prior_auth_required,
the CLAIM-LEVEL flag wins. It is what the adjudication system actually used, and
prior-auth requirements legitimately vary case by case (medical necessity, place
of service). The plan rule is the general case; the claim flag is this case.
Say so explicitly in `evidence`, cite both values, and drop confidence to 0.7 --
a member should not be told "no prior auth needed" by the rulebook and "you
needed prior auth" by their claim without someone noticing the discrepancy.

`issue` must describe what is wrong WITH THE CLAIM. Never report a Release of Information
gap as the claim's issue: ROI governs whether a third-party caller may receive
information, it is not a reason a claim fails, and it belongs to the call path rather
than this dashboard. If a lens raises it, disregard it.

Setting `solvable`:
  true  -> a member or provider can resolve this themselves
  false -> needs a representative
Do NOT guess at solvability for a denied claim. Call get_remedy with the denial_code;
its `owner` field is authoritative. owner=null means it is not self-resolvable.
Note PR-1: owner is Member and it is NOT solvable -- a deductible is a bill to pay,
not a broken claim. Do not route it as an error.

Set accepted=true and gap=null. Set confidence honestly: below 0.6 if either lens
left anything in `unresolved`.

Cite the field values you relied on in `evidence`.
""",
    tools=[tools.get_remedy],
    output_schema=Verdict,
    output_key="verdict",
)


# --------------------------------------------------------------------------
# 5. The two exits
# --------------------------------------------------------------------------
error_fixer = LlmAgent(
    name="Error_Fixer",
    model=MODEL,
    description="Renders the deterministic remedy into member-specific plain language.",
    instruction="""The issue is resolvable. Write the instruction the member or provider
needs.

Verdict: {verdict}
Claim:   {claim_summary}

Call get_remedy with the denial_code if there is one. THE REMEDY TEXT IS AUTHORITATIVE
-- you are rendering it, not choosing it. Never invent a step it does not contain.

Your only job is to make it specific and human: name the actual service and date
("your MRI on 17 May with Dr Thomas") instead of leaving it generic. Address the owner
directly. Keep it under four sentences. No jargon.

NEVER STATE A NUMBER YOU WERE NOT GIVEN.
Do not calculate durations, ages, totals, or dates. Do not work out how long a claim
has been open by subtracting dates -- you will get it wrong. get_claim already gives
you days_since_service, days_since_submitted and filing_lag_days; use those verbatim
or say nothing about elapsed time.
This is not a style rule. A previous version computed "in review for 103 days" when
the real figure was 139, and told a member that about their knee surgery. Every number
you write must be copied from tool output.
""",
    tools=[tools.get_remedy],
    output_key="resolution",
)

escalation_flag = LlmAgent(
    name="Escalation_Flag",
    model=MODEL,
    description="Builds a rep-ready case summary for a claim that needs a human.",
    instruction="""This claim needs a representative. Write the summary they will read
before they speak, so they open the call already knowing the situation.

Verdict: {verdict}
Claim:   {claim_summary}
Lenses:  {finding_claim} | {finding_auth}

Three short sections, nothing else:
  ROOT CAUSE      -- what is actually wrong, in one or two sentences
  ALREADY CHECKED -- what the system verified, so the rep does not redo it
  RECOMMENDED     -- the next action you would take

Be concrete. Cite claim id, dates, and codes here -- your reader is a professional, not
the member. If something is genuinely unknown, say so plainly; a rep misled by a
confident guess is worse off than one told the truth.
""",
    output_key="case_summary",
)


# --------------------------------------------------------------------------
# 6. Solvability-Router -- a code gate, deliberately not an LLM
# --------------------------------------------------------------------------
class SolvabilityRouter(BaseAgent):
    """Reads verdict.solvable and dispatches. Deterministic on purpose: the
    Mediator already produced the boolean, so an LLM here would add latency and
    a chance of contradicting it, and buy nothing."""

    fixer: LlmAgent
    escalator: LlmAgent

    def __init__(self, name: str, fixer: LlmAgent, escalator: LlmAgent):
        super().__init__(name=name, fixer=fixer, escalator=escalator,
                         sub_agents=[fixer, escalator])

    @override
    async def _run_async_impl(self, ctx: InvocationContext) -> AsyncGenerator[Event, None]:
        verdict = ctx.session.state.get("verdict") or {}
        if isinstance(verdict, str):
            import json
            try:
                verdict = json.loads(verdict)
            except Exception:
                verdict = {}
        solvable = bool(verdict.get("solvable"))
        ctx.session.state["escalated"] = not solvable
        target = self.fixer if solvable else self.escalator
        async for event in target.run_async(ctx):
            yield event


solvability_router = SolvabilityRouter(
    name="Solvability_Router", fixer=error_fixer, escalator=escalation_flag
)


# --------------------------------------------------------------------------
# 7. The spine
# --------------------------------------------------------------------------
claim_spine = SequentialAgent(
    name="Claim_Spine",
    description="Summarise -> detect -> research in parallel -> reconcile -> route.",
    sub_agents=[claim_summarizer, issue_detector, researchers, mediator, solvability_router],
)


# --------------------------------------------------------------------------
# 8. Separate entry points -- different triggers, not satellites of the spine
# --------------------------------------------------------------------------
benefits_navigator = LlmAgent(
    name="Benefits_Navigator",
    model=MODEL,
    description="Answers prospective benefits questions: is it covered, does it need "
                "prior auth, what will it cost. No claim involved.",
    instruction="""You answer benefits questions for members and representatives, before
any service happens. This is prospective -- there is no claim.

If you are given a member_id, call get_member for their plan_type. If the plan is named
directly, use it. Then call get_coverage_rule with plan_type and cpt_code.

ALWAYS cite the rule_id you relied on. Every answer is grounded in the rulebook; you
never answer coverage from memory. If no rule exists for that plan and code, say so --
do not extrapolate from a different plan.

Answer in plain English: covered or not, prior auth needed or not, and what they will
pay. Two or three sentences.
""",
    tools=[tools.get_coverage_rule, tools.get_member],
    output_key="benefits_answer",
)

compliance_sentinel = LlmAgent(
    name="Compliance_Sentinel",
    model=MODEL,
    description="Triages open operational and compliance risk for the ops team.",
    instruction="""You triage open compliance and operational risk flags for an
operations team.

Call get_compliance_flags. Filter by flag_type or severity when asked.

Every flag already carries a `recommended_action` written by the compliance team. Your
job is to TRIAGE AND RANK, not to invent remedies. Surface the highest-severity items
first and group them by what is driving them.

All 312 flags are unresolved -- this is a live work queue, not a report. The 70
ROI_AUTHORIZATION_GAP flags matter most: each is a member whose next third-party caller
will be blocked, and each can be fixed before that call happens.

Be brief and prioritised. Lead with what to do today.
""",
    tools=[tools.get_compliance_flags],
    output_key="ops_feed",
)


root_agent = claim_spine
