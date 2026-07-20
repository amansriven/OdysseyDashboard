# Conversation Memory Update

This document contains the changes needed to add conversation memory to the chatbot.

## Backend Changes (odyssey/api_server.py)

### 1. Add session storage (after line 35, after `AGENTS = {...}`)

```python
# Session storage for conversation memory
# Format: {session_id: {"agent_type": str, "runner": InMemoryRunner, "session": Session}}
_sessions = {}
```

### 2. Update `run_agent` function signature and implementation

Replace the entire `async def run_agent(...)` function with:

```python
async def run_agent(agent_type: str, user_message: str, session_id: str | None = None) -> dict[str, Any]:
    """Run the selected agent with the user's message.

    Args:
        agent_type: Type of agent (claim, benefits, compliance)
        user_message: User's message
        session_id: Optional session ID for conversation continuity

    Returns:
        Dict with response, structured_output, state, and session_id
    """
    agent = AGENTS.get(agent_type)
    if not agent:
        return {"error": f"Unknown agent type: {agent_type}"}

    # Get or create session
    if session_id and session_id in _sessions:
        # Reuse existing session
        session_data = _sessions[session_id]
        runner = session_data["runner"]
        adk_session = session_data["session"]
    else:
        # Create new session
        import uuid
        session_id = session_id or str(uuid.uuid4())
        runner = InMemoryRunner(agent=agent, app_name=APP_NAME)
        adk_session = await runner.session_service.create_session(
            app_name=APP_NAME, user_id=session_id
        )
        _sessions[session_id] = {
            "agent_type": agent_type,
            "runner": runner,
            "session": adk_session
        }

    msg = types.Content(role="user", parts=[types.Part(text=user_message)])

    # Run the agent (don't collect intermediate outputs)
    async for event in runner.run_async(
        user_id=session_id, session_id=adk_session.id, new_message=msg
    ):
        pass  # Just let it run, we'll get the final state below

    # Get final state
    state = (
        await runner.session_service.get_session(
            app_name=APP_NAME, user_id=session_id, session_id=adk_session.id
        )
    ).state

    # Extract the final human-readable response based on agent type
    response_text = ""
    structured_output = None

    if agent_type == "claim":
        # For claim agent: prioritize resolution > case_summary > verdict
        if "resolution" in state:
            response_text = state["resolution"]
            structured_output = {"resolution": state["resolution"]}
        elif "case_summary" in state:
            response_text = state["case_summary"]
            structured_output = {"case_summary": state["case_summary"]}
        elif "verdict" in state:
            try:
                verdict = json.loads(state["verdict"]) if isinstance(state["verdict"], str) else state["verdict"]
                structured_output = verdict
                # Format verdict into readable text
                response_text = f"**Issue:** {verdict.get('issue', 'Unknown')}\n\n"
                if verdict.get('owner'):
                    response_text += f"**Owner:** {verdict['owner']}\n\n"
                if verdict.get('solvable'):
                    response_text += "**Status:** This issue can be resolved.\n\n"
            except:
                pass

        # Also include claim summary for context
        if "claim_summary" in state:
            try:
                summary = json.loads(state["claim_summary"]) if isinstance(state["claim_summary"], str) else state["claim_summary"]
                if not response_text:  # If we didn't get resolution/case_summary
                    response_text = f"**Claim {summary.get('claim_id')}**\n\n{summary.get('what_happened', '')}"
            except:
                pass

    elif agent_type == "benefits":
        if "benefits_answer" in state:
            response_text = state["benefits_answer"]
            structured_output = {"benefits_answer": state["benefits_answer"]}

    elif agent_type == "compliance":
        if "ops_feed" in state:
            response_text = state["ops_feed"]
            structured_output = {"ops_feed": state["ops_feed"]}

    return {
        "response": response_text.strip() or "Agent completed with no output.",
        "structured_output": structured_output,
        "state": state,
        "session_id": session_id,
    }
```

### 3. Update chat() endpoint to handle session_id

Find the `@app.route("/api/chat", methods=["POST"])` function and replace it with:

```python
@app.route("/api/chat", methods=["POST"])
def chat():
    """Handle chat requests from the frontend."""
    data = request.json
    agent_type = data.get("agent_type", "claim")
    message = data.get("message", "")
    session_id = data.get("session_id")  # Optional session ID for conversation continuity

    if not message:
        return jsonify({"error": "No message provided"}), 400

    # Check if we should handle this without calling the agent
    preprocessed = preprocess_message(agent_type, message)
    if preprocessed:
        # For preprocessed responses, generate a session ID if needed
        if not session_id:
            import uuid
            session_id = str(uuid.uuid4())
        preprocessed["session_id"] = session_id
        return jsonify(preprocessed)

    try:
        # Use persistent event loop to avoid cleanup issues
        loop = get_or_create_event_loop()
        future = asyncio.run_coroutine_threadsafe(
            run_agent(agent_type, message, session_id), loop
        )
        result = future.result(timeout=120)  # 2 minute timeout
        return jsonify(result)
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Error in chat endpoint: {error_details}")  # Log to console
        return jsonify({"error": str(e), "details": error_details}), 500
```

## Frontend Changes (ui/src/app/components/ChatBot.tsx)

### 1. Add sessionId state (in the component, around line 36)

```typescript
const [sessionId, setSessionId] = useState<string | null>(null);
```

### 2. Update sendMessage to include and track session_id

In the fetch call (around line 60-66), update to:

```typescript
body: JSON.stringify({
  agent_type: selectedAgent,
  message: userMessage.content,
  session_id: sessionId, // Include session ID for conversation continuity
}),
```

After `const data = await response.json();` (around line 73), add:

```typescript
// Store session ID for conversation continuity
if (data.session_id) {
  setSessionId(data.session_id);
}
```

### 3. Add helper functions (after handleKeyPress, around line 106)

```typescript
const handleAgentChange = (agent: AgentType) => {
  setSelectedAgent(agent);
  // Clear session when switching agents to start fresh conversation
  setSessionId(null);
  setMessages([]);
};

const clearChat = () => {
  setMessages([]);
  setSessionId(null);
};
```

### 4. Update agent selector button (around line 160)

Change:
```typescript
onClick={() => setSelectedAgent(agent)}
```

To:
```typescript
onClick={() => handleAgentChange(agent)}
```

## Testing Conversation Memory

Try this sequence:

1. **User**: "Is CPT 27447 covered?"
2. **Bot**: "I need your plan type or member ID"
3. **User**: "MAPD"
4. **Bot**: Should remember the CPT code and answer about coverage

Or:

1. **User**: "Does CPT 29881 need prior auth?"
2. **Bot**: "I need your plan type"
3. **User**: "I'm on DSNP"
4. **Bot**: Should remember the CPT and answer the prior auth question

The session_id is now tracked across messages, so the agent maintains context!
