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

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend requests

APP_NAME = "odyssey"

# Map agent types to their respective agents
AGENTS = {
    "claim": claim_spine,
    "benefits": benefits_navigator,
    "compliance": compliance_sentinel,
}


async def run_agent(agent_type: str, user_message: str) -> dict[str, Any]:
    """Run the selected agent with the user's message."""
    agent = AGENTS.get(agent_type)
    if not agent:
        return {"error": f"Unknown agent type: {agent_type}"}

    runner = InMemoryRunner(agent=agent, app_name=APP_NAME)
    session = await runner.session_service.create_session(
        app_name=APP_NAME, user_id="chatbot"
    )

    msg = types.Content(role="user", parts=[types.Part(text=user_message)])

    # Collect all agent responses
    response_text = ""
    async for event in runner.run_async(
        user_id="chatbot", session_id=session.id, new_message=msg
    ):
        if event.content and event.content.parts:
            for part in event.content.parts:
                if part.text and part.text.strip():
                    response_text += part.text + "\n"

    # Get final state for structured output
    state = (
        await runner.session_service.get_session(
            app_name=APP_NAME, user_id="chatbot", session_id=session.id
        )
    ).state

    # Try to extract structured output based on agent type
    structured_output = None
    if agent_type == "claim":
        # Check for verdict, resolution, or case_summary
        if "verdict" in state:
            try:
                structured_output = json.loads(state["verdict"]) if isinstance(state["verdict"], str) else state["verdict"]
            except:
                pass
        elif "resolution" in state:
            structured_output = {"resolution": state["resolution"]}
        elif "case_summary" in state:
            structured_output = {"case_summary": state["case_summary"]}
    elif agent_type == "benefits":
        if "benefits_answer" in state:
            structured_output = {"benefits_answer": state["benefits_answer"]}
    elif agent_type == "compliance":
        if "ops_feed" in state:
            structured_output = {"ops_feed": state["ops_feed"]}

    return {
        "response": response_text.strip() or "Agent completed with no text output.",
        "structured_output": structured_output,
        "state": state,
    }


@app.route("/api/chat", methods=["POST"])
def chat():
    """Handle chat requests from the frontend."""
    data = request.json
    agent_type = data.get("agent_type", "claim")
    message = data.get("message", "")

    if not message:
        return jsonify({"error": "No message provided"}), 400

    try:
        # Run the async agent call
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(run_agent(agent_type, message))
        loop.close()

        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/health", methods=["GET"])
def health():
    """Health check endpoint."""
    return jsonify({"status": "ok", "agents": list(AGENTS.keys())})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
