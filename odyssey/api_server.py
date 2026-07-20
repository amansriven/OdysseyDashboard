"""Flask API server to proxy chatbot requests to ADK agents.

Run with:
    python3 -m odyssey.api_server

Then the UI can POST to http://localhost:5000/api/chat
"""

from __future__ import annotations

import asyncio
import json
import os
from typing import Any

from flask import Flask, request, jsonify
from flask_cors import CORS
from google.adk.runners import InMemoryRunner
from google.genai import types

# Import the three agent entry points
from .agents import claim_spine, benefits_navigator, compliance_sentinel
from .orchestrator import create_orchestrator
from .call_path import call_assist

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend requests

APP_NAME = "odyssey"

# Create a persistent event loop for async operations
# This prevents "Event loop is closed" errors with ADK cleanup
import threading
_event_loop = None
_loop_thread = None

def get_or_create_event_loop():
    """Get or create a persistent event loop running in a background thread."""
    global _event_loop, _loop_thread

    if _event_loop is None or _event_loop.is_closed():
        _event_loop = asyncio.new_event_loop()

        def run_loop():
            asyncio.set_event_loop(_event_loop)
            _event_loop.run_forever()

        _loop_thread = threading.Thread(target=run_loop, daemon=True)
        _loop_thread.start()

    return _event_loop

# Available agents
AGENTS = {
    "orchestrator": create_orchestrator(),
    "call_assist": call_assist,  # ROI gate + representative call handling
}

# Session storage for conversation memory
# Format: {session_id: {"agent_type": str, "runner": InMemoryRunner, "session": Session}}
_sessions = {}


async def run_agent(agent_type: str, user_message: str, session_id: str | None = None,
                    initial_state: dict | None = None) -> dict[str, Any]:
    """Run the selected agent with the user's message.

    Args:
        agent_type: Type of agent (claim, benefits, compliance, call_assist)
        user_message: User's message
        session_id: Optional session ID for conversation continuity
        initial_state: Optional initial state (used for ROI gate: member_id, caller_name)

    Returns:
        Dict with response, structured_output, state, and session_id
    """
    agent = AGENTS.get(agent_type)
    if not agent:
        return {"error": f"Unknown agent type: {agent_type}"}

    # Get or create session
    if session_id and session_id in _sessions and not initial_state:
        # Reuse existing session (but NOT for call_assist with initial_state)
        session_data = _sessions[session_id]
        runner = session_data["runner"]
        adk_session = session_data["session"]
    else:
        # Create new session
        import uuid
        session_id = session_id or str(uuid.uuid4())
        runner = InMemoryRunner(agent=agent, app_name=APP_NAME)

        # For call_assist with initial_state, pass state during creation
        if initial_state:
            adk_session = await runner.session_service.create_session(
                app_name=APP_NAME, user_id=session_id, state=initial_state
            )
        else:
            adk_session = await runner.session_service.create_session(
                app_name=APP_NAME, user_id=session_id
            )

        _sessions[session_id] = {
            "agent_type": agent_type,
            "runner": runner,
            "session": adk_session
        }

    msg = types.Content(role="user", parts=[types.Part(text=user_message)])

    # Collect agent responses - especially important for orchestrator
    all_text = ""
    async for event in runner.run_async(
        user_id=session_id, session_id=adk_session.id, new_message=msg
    ):
        if event.content and event.content.parts:
            for part in event.content.parts:
                if part.text and part.text.strip():
                    all_text += part.text + "\n"

    # Get final state
    state = (
        await runner.session_service.get_session(
            app_name=APP_NAME, user_id=session_id, session_id=adk_session.id
        )
    ).state

    # Orchestrator handles all routing internally - just return the text response
    response_text = all_text.strip()
    structured_output = None

    return {
        "response": response_text.strip() or "Agent completed with no output.",
        "structured_output": structured_output,
        "state": state,
        "session_id": session_id,
    }


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
            "response": """Hi! I'm your Odyssey AI assistant. I can help you with:

**Claims** - Check status, explain denials, and identify issues

**Benefits & Coverage** - Answer questions about prior authorization, procedures, and plan coverage

**Compliance & Operations** - Surface ROI gaps, operational risks, and stalled claims

Ask me anything about your claims, benefits, or coverage - I'll route your question to the right specialist!""",
            "structured_output": None,
            "state": {}
        }

    return None  # Pass through to orchestrator


@app.route("/api/chat", methods=["POST"])
def chat():
    """Handle chat requests from the frontend."""
    data = request.json
    agent_type = data.get("agent_type", "claim")
    message = data.get("message", "")
    session_id = data.get("session_id")  # Optional session ID for conversation continuity
    initial_state = data.get("initial_state")  # For ROI gate: {member_id, caller_name}

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
            run_agent(agent_type, message, session_id, initial_state), loop
        )
        # Longer timeout for orchestrator with sub-agent calls (5 stages × ~15s each = 75s per claim)
        timeout = 300 if agent_type == "orchestrator" else 120  # 5 minutes for orchestrator, 2 for others
        result = future.result(timeout=timeout)
        return jsonify(result)
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Error in chat endpoint: {error_details}")  # Log to console
        return jsonify({"error": str(e), "details": error_details}), 500


@app.route("/api/health", methods=["GET"])
def health():
    """Health check endpoint."""
    return jsonify({"status": "ok", "agents": list(AGENTS.keys())})


@app.route("/api/dashboard/<member_id>", methods=["GET"])
def get_member_dashboard(member_id):
    """Get dashboard data for a member.

    Query params:
        - live=true: Run agents live (slow, ~75s per claim)
        - live=false (default): Return precomputed data from ui/src/data/claims.json
    """
    use_live = request.args.get("live", "false").lower() == "true"

    if use_live:
        # Run live agents (expensive)
        try:
            loop = get_or_create_event_loop()
            future = asyncio.run_coroutine_threadsafe(
                generate_dashboard_data(member_id), loop
            )
            result = future.result(timeout=600)  # 10 minute timeout
            return jsonify(result)
        except Exception as e:
            import traceback
            error_details = traceback.format_exc()
            print(f"Error in live dashboard endpoint: {error_details}")
            return jsonify({"error": str(e), "details": error_details}), 500
    else:
        # Return precomputed data (fast, for demos)
        from pathlib import Path
        import json

        # Path to precomputed data
        ui_data_path = Path(__file__).resolve().parents[1] / "ui" / "src" / "data" / "claims.json"

        try:
            with open(ui_data_path, "r") as f:
                data = json.load(f)

            # Precomputed data only has one member (John Rodriguez)
            # If requesting a DIFFERENT member, we MUST use live data
            precomputed_member_id = data.get("member", {}).get("id", "")

            if member_id != precomputed_member_id:
                # Requested member not in precomputed data - must run live agents
                return jsonify({
                    "error": f"Member {member_id} not in precomputed data. Use live=true to fetch from database.",
                    "precomputed_member": precomputed_member_id,
                    "requested_member": member_id
                }), 404

            # Return precomputed data for the default member
            return jsonify({
                "member": data.get("member", {}),
                "claims": data.get("claims", []),
                "total_claims": len(data.get("claims", [])),
                "source": "precomputed"
            })
        except FileNotFoundError:
            return jsonify({"error": "Precomputed data not found. Run: python3 -m odyssey.precompute"}), 404
        except Exception as e:
            return jsonify({"error": str(e)}), 500


async def generate_dashboard_data(member_id: str) -> dict[str, Any]:
    """Run claim_spine for each claim belonging to member and assemble payloads."""
    from . import tools, data
    import json

    # Get member's claims
    claims_result = tools.get_claims_by_member(member_id)
    if "error" in claims_result:
        return {"error": claims_result["error"]}

    # Extract claim IDs from the claims list
    claim_ids = [c["claim_id"] for c in claims_result.get("claims", [])]

    # Get member info
    member_row = data.row("members", "member_id", member_id)
    if not member_row:
        return {"error": f"Member {member_id} not found"}

    member_info = {
        "id": member_id,
        "name": f"{member_row.get('first_name', '')} {member_row.get('last_name', '')}".strip(),
        "first": member_row.get("first_name", ""),
        "plan": member_row.get("plan_type", ""),
        "dob": str(member_row.get("dob", "")) if member_row.get("dob") else ""
    }

    results = []

    # Process each claim through claim_spine
    for claim_id in claim_ids[:5]:  # Limit to 5 claims to avoid timeout
        try:
            claim_data = tools.get_claim(claim_id)
            if not claim_data:
                continue

            # Run claim_spine agent
            runner = InMemoryRunner(agent=claim_spine, app_name=APP_NAME)
            session = await runner.session_service.create_session(
                app_name=APP_NAME, user_id=f"dashboard_{member_id}"
            )

            msg = types.Content(role="user", parts=[types.Part(text=f"Process claim {claim_id}")])

            async for _ in runner.run_async(
                user_id=f"dashboard_{member_id}",
                session_id=session.id,
                new_message=msg
            ):
                pass  # Just run to completion

            # Get final state
            final_session = await runner.session_service.get_session(
                app_name=APP_NAME,
                user_id=f"dashboard_{member_id}",
                session_id=session.id
            )
            state = final_session.state

            # Assemble payload (same logic as run.py)
            def js(v):
                if isinstance(v, str):
                    try:
                        return json.loads(v)
                    except:
                        return {}
                return v or {}

            verdict = js(state.get("verdict"))
            risk = tools.compute_call_risk_score(claim_id)
            escalated = bool(state.get("escalated"))
            roi = tools.get_roi_summary(claim_data["member_id"])

            # Map status for UI
            status_map = {"Paid": "completed", "In Review": "inprogress", "Pending": "pending", "Denied": "denied"}
            ui_status = status_map.get(claim_data["claim_status"], "pending")

            # Calculate youOwe
            billed = float(claim_data.get("billed_amount") or 0)
            paid = float(claim_data.get("paid_amount") or 0)
            if claim_data["claim_status"] == "Paid":
                you_owe = round(billed - paid, 2)
            elif claim_data["claim_status"] == "Denied":
                you_owe = 0
            else:
                you_owe = None

            results.append({
                "id": claim_id,
                "member": member_info["name"],
                "dob": member_info["dob"],
                "service": claim_data.get("cpt_description", ""),
                "date": str(claim_data.get("service_date", "")) if claim_data.get("service_date") else "",
                "status": ui_status,
                "issue": verdict.get("issue") if verdict.get("issue") != "None" else None,
                "owner": verdict.get("owner"),
                "fix": (state.get("resolution") or "").strip() or None,
                "risk": "high" if risk["call_risk_score"] >= 60 else "medium" if risk["call_risk_score"] >= 30 else "low",
                "callRiskScore": risk["call_risk_score"],
                "escalated": escalated,
                "caseSummary": (state.get("case_summary") or "").strip() or None,
                "youOwe": you_owe,
                "billed": billed,
                "paid": paid
            })

        except Exception as e:
            print(f"Error processing claim {claim_id}: {e}")
            # Continue with other claims even if one fails
            continue

    return {
        "member": member_info,
        "claims": results,
        "total_claims": len(claim_ids),
        "processed_claims": len(results)
    }


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
