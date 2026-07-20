# Orchestrator Setup - Single Unified Chat

This replaces the separate agent tabs with one smart orchestrator that automatically routes questions.

## Changes Summary

### New File: `odyssey/orchestrator.py`
Create this entire file - see content below.

### Modified: `odyssey/api_server.py`
1. Add import for orchestrator
2. Add orchestrator to AGENTS dict
3. Update preprocessing for unified greetings

### Modified: `ui/src/app/components/ChatBot.tsx`
1. Remove agent selector UI
2. Always use "orchestrator" agent type
3. Simplify header and placeholders

---

## 1. Create `odyssey/orchestrator.py`

Copy this entire file to Cloud Shell:

```python
"""Orchestrator agent - routes questions to the right specialist."""

from __future__ import annotations

from google.adk.agents import LlmAgent
from google.genai import types

from .agents import claim_spine, benefits_navigator, compliance_sentinel, MODEL


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
benefits, and compliance questions. You have access to three specialized tools:

1. **check_claim** - Use when the user asks about a specific claim (mentions a claim ID like CLM000377)
2. **check_benefits** - Use for coverage, prior authorization, or cost questions (mentions CPT codes, plan types, or asks "is it covered", "do I need prior auth", "what will I pay")
3. **check_compliance** - Use for operational/compliance questions (ROI gaps, stalled claims, credentialing issues)

**Decision process:**
- If you see a claim ID (CLM followed by numbers), use check_claim
- If you see a CPT code, plan type (MAPD, DSNP, Commercial), or coverage question, use check_benefits
- If the question is about compliance, ROI, operational risk, or system issues, use check_compliance
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

User: "What does claim CLM000377 entail?"
→ Use check_claim("CLM000377")

User: "Does CPT 29881 need prior auth on DSNP?"
→ Use check_benefits("Does CPT 29881 need prior auth on DSNP?")

User: "What ROI gaps need attention?"
→ Use check_compliance("What ROI gaps need attention?")

User: "I had knee surgery and haven't heard back"
→ Ask: "I can help! Do you have a claim ID? It would start with CLM followed by numbers."
""",
        tools=[check_claim, check_benefits, check_compliance],
    )

    return orchestrator
```

---

## 2. Update `odyssey/api_server.py`

### Change 1: Add import (around line 22)

Change:
```python
from .agents import claim_spine, benefits_navigator, compliance_sentinel
```

To:
```python
from .agents import claim_spine, benefits_navigator, compliance_sentinel
from .orchestrator import create_orchestrator
```

### Change 2: Update AGENTS dict (around line 30)

Change:
```python
AGENTS = {
    "claim": claim_spine,
    "benefits": benefits_navigator,
    "compliance": compliance_sentinel,
}
```

To:
```python
AGENTS = {
    "orchestrator": create_orchestrator(),  # Smart router - figures out which specialist to use
    "claim": claim_spine,
    "benefits": benefits_navigator,
    "compliance": compliance_sentinel,
}
```

### Change 3: Update preprocess_message function

Replace the entire `preprocess_message` function with:

```python
def preprocess_message(agent_type: str, message: str) -> dict[str, Any] | None:
    """Preprocess user messages to handle greetings and provide helpful responses.

    Returns a dict with response if message should be handled without calling agent,
    or None if message should be passed to the agent.
    """
    message_lower = message.lower().strip()

    # Greetings and casual messages - unified for orchestrator
    greetings = ["hi", "hello", "hey", "help", "what can you do"]
    if any(greeting in message_lower for greeting in greetings):
        return {
            "response": """Hi! I'm your Odyssey AI assistant. I can help with:

**Claims** - Check status, explain denials, identify issues
Example: "What does claim CLM000377 entail?"

**Benefits & Coverage** - Prior auth, CPT codes, plan coverage
Example: "Does CPT 29881 need prior auth on DSNP?"

**Compliance** - ROI gaps, operational risks, stalled claims
Example: "What ROI gaps need attention?"

Just ask your question naturally - I'll figure out how to help!""",
            "structured_output": None,
            "state": {}
        }

    return None  # Pass through to orchestrator
```

---

## 3. Update `ui/src/app/components/ChatBot.tsx`

### Remove unused types and state

Remove this line (around line 10):
```typescript
type AgentType = "claim" | "benefits" | "compliance";
```

Remove this line (around line 12-28):
```typescript
const AGENT_INFO = {
  claim: { ... },
  benefits: { ... },
  compliance: { ... },
};
```

Remove `selectedAgent` state (keep sessionId):
```typescript
const [sessionId, setSessionId] = useState<string | null>(null);
// Remove: const [selectedAgent, setSelectedAgent] = useState<AgentType>("claim");
```

### Update fetch call

Change `agent_type` to always use "orchestrator":
```typescript
body: JSON.stringify({
  agent_type: "orchestrator", // Always use orchestrator
  message: userMessage.content,
  session_id: sessionId,
}),
```

### Update UI elements

**Header subtitle:**
```typescript
<p className="text-emerald-50 text-xs">Healthcare Assistant</p>
```

**Remove agent selector** - replace entire agent selector div with:
```typescript
{/* Welcome Message */}
<div className="p-3 border-b border-slate-200 bg-slate-50">
  <p className="text-xs text-slate-600">
    Ask me about claims, benefits, coverage, or compliance issues. I'll figure out how to help!
  </p>
</div>
```

**Update empty state:**
```typescript
{messages.length === 0 && (
  <div className="text-center text-slate-400 text-sm mt-8">
    <Bot className="w-12 h-12 mx-auto mb-3 text-slate-300" />
    <p className="font-medium">How can I help you today?</p>
    <div className="text-xs mt-3 space-y-1 text-left max-w-xs mx-auto">
      <p className="text-slate-500 font-medium">Try asking:</p>
      <p className="text-slate-400">• "What does claim CLM000377 entail?"</p>
      <p className="text-slate-400">• "Does CPT 29881 need prior auth on DSNP?"</p>
      <p className="text-slate-400">• "What ROI gaps need attention?"</p>
    </div>
  </div>
)}
```

**Update placeholder:**
```typescript
placeholder="Ask about claims, benefits, or compliance..."
```

**Remove handleAgentChange function** - keep only `clearChat`:
```typescript
const clearChat = () => {
  setMessages([]);
  setSessionId(null);
};
```

---

## Testing

After applying all changes and restarting both servers, test:

1. **"What does claim CLM000377 entail?"** → Should route to claim agent
2. **"Does CPT 29881 need prior auth on DSNP?"** → Should route to benefits agent
3. **"What ROI gaps need attention?"** → Should route to compliance agent
4. **"hi"** → Should show unified greeting with all examples

The orchestrator will automatically figure out which specialist to call!
