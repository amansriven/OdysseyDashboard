"""Orchestrator agent - routes questions to the right specialist."""

from __future__ import annotations

from google.adk.agents import LlmAgent
from google.genai import types

from .agents import claim_spine, benefits_navigator, compliance_sentinel, MODEL
from . import tools


def create_orchestrator() -> LlmAgent:
    """Create the orchestrator agent that routes to specialists."""

    # Define tools that call the specialist agents
    async def check_claim(claim_id: str) -> str:
        """Check the status and details of a specific claim.

        Args:
            claim_id: The claim ID (format: CLM000000)

        Returns:
            Detailed claim analysis including status, issues, and next steps
        """
        from google.adk.runners import InMemoryRunner

        runner = InMemoryRunner(agent=claim_spine, app_name="odyssey")
        session = await runner.session_service.create_session(
            app_name="odyssey", user_id="orchestrator"
        )

        msg = types.Content(role="user", parts=[types.Part(text=f"Process claim {claim_id}")])

        response_text = ""
        async for event in runner.run_async(
            user_id="orchestrator", session_id=session.id, new_message=msg
        ):
            if event.content and event.content.parts:
                for part in event.content.parts:
                    if part.text and part.text.strip():
                        response_text += part.text

        state = (await runner.session_service.get_session(
            app_name="odyssey", user_id="orchestrator", session_id=session.id
        )).state

        # Extract the resolution or case summary
        if "resolution" in state:
            return state["resolution"]
        elif "case_summary" in state:
            return state["case_summary"]

        return response_text or "Unable to process claim."

    async def check_benefits(question: str) -> str:
        """Answer questions about coverage, prior authorization, and benefits.

        Args:
            question: The benefits question (e.g., "Does CPT 29881 need prior auth on DSNP?")

        Returns:
            Coverage information with rule citations
        """
        from google.adk.runners import InMemoryRunner

        runner = InMemoryRunner(agent=benefits_navigator, app_name="odyssey")
        session = await runner.session_service.create_session(
            app_name="odyssey", user_id="orchestrator"
        )

        msg = types.Content(role="user", parts=[types.Part(text=question)])

        response_text = ""
        async for event in runner.run_async(
            user_id="orchestrator", session_id=session.id, new_message=msg
        ):
            if event.content and event.content.parts:
                for part in event.content.parts:
                    if part.text and part.text.strip():
                        response_text += part.text

        state = (await runner.session_service.get_session(
            app_name="odyssey", user_id="orchestrator", session_id=session.id
        )).state

        if "benefits_answer" in state:
            return state["benefits_answer"]

        return response_text or "Unable to answer benefits question."

    async def check_compliance(question: str) -> str:
        """Check compliance and operational risk flags.

        Args:
            question: The compliance question (e.g., "What ROI gaps need attention?")

        Returns:
            Prioritized compliance and operational risk information
        """
        from google.adk.runners import InMemoryRunner

        runner = InMemoryRunner(agent=compliance_sentinel, app_name="odyssey")
        session = await runner.session_service.create_session(
            app_name="odyssey", user_id="orchestrator"
        )

        msg = types.Content(role="user", parts=[types.Part(text=question)])

        response_text = ""
        async for event in runner.run_async(
            user_id="orchestrator", session_id=session.id, new_message=msg
        ):
            if event.content and event.content.parts:
                for part in event.content.parts:
                    if part.text and part.text.strip():
                        response_text += part.text

        state = (await runner.session_service.get_session(
            app_name="odyssey", user_id="orchestrator", session_id=session.id
        )).state

        if "ops_feed" in state:
            return state["ops_feed"]

        return response_text or "Unable to check compliance."

    orchestrator = LlmAgent(
        name="Odyssey_Orchestrator",
        model=MODEL,
        description="Smart assistant that routes questions to specialized agents",
        instruction="""You are an intelligent healthcare assistant that helps with claims,
benefits, and compliance questions. You have access to these specialized tools:

1. **tools.get_claims_by_member** - Use when user provides member ID and asks about their claims (e.g., "I'm member MBR00070, what claims do I have?")
2. **tools.get_plan_benefits_summary** - Use when user asks general "what benefits do I have?" without specifying a CPT code (use the plan type from their member record)
3. **tools.check_roi** - Use when checking if a specific person is authorized to access a member's information (e.g., "Can my son call about my claims?", "Is John Smith authorized for member MBR00070?")
4. **tools.get_roi_summary** - Use when a member asks who can access their information or what their ROI status is (e.g., "Who is authorized to call about my claims?")
5. **check_claim** - Use when the user asks about a specific claim (mentions a claim ID like CLM000377)
6. **check_benefits** - Use for coverage, prior authorization, or cost questions about SPECIFIC services (mentions CPT codes or specific procedures)
7. **check_compliance** - Use for operational/compliance questions (ROI gaps, stalled claims, credentialing issues)

**Decision process:**
- Check the conversation history for context (member ID, plan type, claim IDs mentioned earlier)
- If user provides a member ID (MBR followed by numbers) and asks about their claims, use tools.get_claims_by_member
- If user asks general "what benefits?" or "what's covered?" WITHOUT a specific CPT code, and you know their plan type from conversation history, use tools.get_plan_benefits_summary
- If user asks about ROI/authorization for a specific person to access their info, use tools.check_roi
- If user asks who is authorized or ROI status generally, use tools.get_roi_summary
- If you see a claim ID (CLM followed by numbers), use check_claim
- If you see a CPT code or specific procedure name, use check_benefits
- If the question is about compliance gaps, operational risk, or system issues (staff-facing), use check_compliance
- **IMPORTANT**: If the user asks a follow-up question, check if you already know their member ID or plan type from earlier messages and use that information
- If unclear, ask the user to clarify

**Multiple tools:**
You can call multiple tools if needed. For example:
- "I'm member MBR00087, why was my knee surgery denied?" → might need check_claim if you can find the claim ID

**Response format:**
- Answer in plain language
- Be concise and helpful
- If you call a specialist tool, present its response naturally
- Don't say "I called the benefits tool" - just give the answer

**Examples:**

User: "I'm member MBR00070. Can you tell me what claims I have?"
→ Use tools.get_claims_by_member("MBR00070")

[Next message in same conversation]
User: "What benefits do I have access to?"
→ Check history: You know they're on HMO plan (from previous message), so use tools.get_plan_benefits_summary("HMO") to show general benefits

User: "What does claim CLM000377 entail?"
→ Use check_claim("CLM000377")

User: "Does CPT 29881 need prior auth on DSNP?"
→ Use check_benefits("Does CPT 29881 need prior auth on DSNP?")

User: "What ROI gaps need attention?"
→ Use check_compliance("What ROI gaps need attention?")

User: "Who is authorized to call about my claims?"
→ Use tools.get_roi_summary("MBR00070") [if you know their member ID from history]

User: "Can my son John call about my claims?"
→ Use tools.check_roi("MBR00070", "John") [if you know their member ID from history]

User: "I had knee surgery and haven't heard back"
→ Ask: "I can help! Do you have a claim ID? It would start with CLM followed by numbers."
""",
        tools=[
            tools.get_claims_by_member,
            tools.get_plan_benefits_summary,
            tools.check_roi,
            tools.get_roi_summary,
            check_claim,
            check_benefits,
            check_compliance
        ],
    )

    return orchestrator
