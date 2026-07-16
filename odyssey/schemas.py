
"""Odyssey schemas.

DashboardPayload is the team contract: the UI is built against it and it is
frozen before the agents exist. The rest are agent-to-agent state objects
passed via ADK output_key.
"""

from __future__ import annotations

from enum import StrEnum

from pydantic import BaseModel, Field


class Owner(StrEnum):
    MEMBER = "Member"
    PROVIDER = "Provider"
    PLAN = "Plan"


class RoiStatus(StrEnum):
    SELF = "Member (self)"
    ON_FILE = "On File"
    NOT_ON_FILE = "Not On File"
    EXPIRED = "Expired"


# --------------------------------------------------------------------------
# The contract. Seven fields. UI builds against this.
# --------------------------------------------------------------------------
class DashboardPayload(BaseModel):
    claim_id: str
    member_id: str

    claim_status: str = Field(description="Verbatim from claims.claim_status. Never generated.")
    issue_identified: str = Field(description="Plain-language issue, or 'None' if clean.")
    owner: Owner | None = Field(description="Who must act. None if no action needed.")
    next_step: str = Field(description="Plain-language instruction for the owner.")
    estimated_resolution: str = Field(description="e.g. '30-60 business days'.")
    roi_status: RoiStatus
    call_risk_score: int = Field(ge=0, le=100, description="Deterministic heuristic, not a model.")

    escalated: bool = Field(default=False, description="True when routed to a human rep.")
    case_summary: str | None = Field(default=None, description="Rep-facing summary when escalated.")


# --------------------------------------------------------------------------
# Agent state objects
# --------------------------------------------------------------------------
class ClaimSummary(BaseModel):
    claim_id: str
    member_id: str
    status: str
    what_happened: str = Field(description="Two plain sentences a member would understand.")
    service: str = Field(description="CPT description + service date.")
    provider_name: str


class DetectedIssue(BaseModel):
    issue_type: str = Field(description="e.g. PRIOR_AUTH_GAP, MODIFIER_MISMATCH, NONE")
    plain_language: str
    is_prediction: bool = Field(
        description="True when the claim is pre-adjudication and no denial code exists yet. "
        "This is the real inference; on a denied claim the code is already known."
    )
    evidence: list[str] = Field(description="Field names and values relied on.")


class ResearchFinding(BaseModel):
    lens: str = Field(description="'claim_coverage' or 'auth_roi'")
    findings: list[str]
    fields_checked: list[str] = Field(description="Actual field values inspected, not assumptions.")
    unresolved: list[str] = Field(default_factory=list)


class Verdict(BaseModel):
    issue: str
    owner: Owner | None
    solvable: bool = Field(description="Can member/provider fix this without a rep?")
    confidence: float = Field(ge=0.0, le=1.0)
    evidence: list[str]
    accepted: bool = Field(description="False rejects the researchers and reruns the loop.")
    gap: str | None = Field(
        default=None,
        description="Required when accepted=False. Names the specific missing check, e.g. "
        "'Researcher2 reported ROI on file but did not check auth_expired.' "
        "A rejection without a named gap reruns identical input and wastes an iteration.",
    )
