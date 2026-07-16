"""Odyssey tools — the deterministic layer.

Every function here is a plain lookup or arithmetic over CSVs. Nothing
generates text. The agents wrap these; they never decide a fact themselves.

Routing and remedies are deterministic BY DESIGN: denial_fixable is a pure
function of denial_code (verified: 10 codes, 10 reasons, zero mixed cases),
so an LLM "predicting" it on a denied claim would be doing a join, not
reasoning. The real inference lives on pre-adjudication claims, where no
denial code exists yet -- see predict_denial_risk().
"""

from __future__ import annotations

from datetime import date

import pandas as pd

from . import data

# --------------------------------------------------------------------------
# The Error-Fixer lookup. 10 CARC codes -> owner + remedy.
# This is a table, not an agent. The LLM only renders it into member-specific
# prose; it never chooses the remedy.
# --------------------------------------------------------------------------
REMEDIES: dict[str, dict[str, str]] = {
    "CO-109": {
        "owner": "Member",
        "next_step": "Confirm which insurance is primary. Call the number on your card to update "
                     "your coordination of benefits, then ask the provider to resubmit.",
    },
    "CO-11": {
        "owner": "Provider",
        "next_step": "Provider must correct the diagnosis code so it is consistent with the "
                     "procedure performed, then resubmit.",
    },
    "CO-16": {
        "owner": "Provider",
        "next_step": "Provider must supply the missing information the claim needs for "
                     "adjudication and resubmit.",
    },
    "CO-167": {
        "owner": "Provider",
        "next_step": "Provider should review the diagnosis coding, or submit an appeal with "
                     "clinical documentation supporting medical necessity.",
    },
    "CO-29": {
        "owner": None,
        "next_step": "The filing deadline has passed. This cannot be corrected by resubmission "
                     "and needs representative review.",
    },
    "CO-4": {
        "owner": "Provider",
        "next_step": "Provider must correct the procedure modifier so it matches the procedure "
                     "code, then resubmit.",
    },
    "CO-50": {
        "owner": None,
        "next_step": "This service is not covered under the plan. A representative can explain "
                     "options, including appeal rights.",
    },
    "CO-97": {
        "owner": "Provider",
        "next_step": "Payment for this service was included in another service on the same visit. "
                     "Provider may appeal if it was separately billable.",
    },
    "CO-B7": {
        "owner": "Provider",
        "next_step": "Provider is not certified for this service on the date of service. Provider "
                     "must resolve credentialing before resubmitting.",
    },
    "PR-1": {
        # fixable=False, but the owner is the MEMBER. This is not a broken claim --
        # it is a bill. Do not route it to escalation as if something went wrong.
        "owner": "Member",
        "next_step": "This amount applies to your annual deductible. It is not a claim error. "
                     "Payment is due to the provider.",
    },
}


def _clean(rec: dict) -> dict:
    """Make a row JSON-safe for an LLM tool response."""
    out = {}
    for k, v in rec.items():
        if v is None or (not isinstance(v, (list, dict)) and pd.isna(v)):
            out[k] = None
        elif isinstance(v, pd.Timestamp):
            out[k] = v.date().isoformat()
        elif hasattr(v, "item"):
            out[k] = v.item()
        else:
            out[k] = v
    return out


def get_claim(claim_id: str) -> dict:
    """Look up one claim by claim_id.

    Returns the full claim record including the fields needed to predict a
    denial before adjudication: referral_on_file, prior_auth_required,
    prior_auth_obtained, modifier_mismatch, service_date, submitted_date.

    Durations are PRE-COMPUTED here (days_since_service, days_since_submitted,
    filing_lag_days) because models do date arithmetic badly. An earlier version
    exposed only raw dates and the agent told a member their claim had been in
    review for "103 days" -- a number matching nothing in the data (the real
    figures were 144 and 139). If a duration is needed, it comes from here.
    """
    rec = data.row("claims", "claim_id", claim_id)
    if rec is None:
        return {"error": f"No claim {claim_id}"}
    out = _clean(rec)

    today = date.today()
    if out.get("service_date"):
        out["days_since_service"] = (today - date.fromisoformat(out["service_date"])).days
    if out.get("submitted_date"):
        out["days_since_submitted"] = (today - date.fromisoformat(out["submitted_date"])).days
        if out.get("service_date"):
            out["filing_lag_days"] = (
                date.fromisoformat(out["submitted_date"])
                - date.fromisoformat(out["service_date"])
            ).days
    return out


def get_member(member_id: str) -> dict:
    """Look up one member by member_id. Includes plan_type, needed for coverage rules."""
    rec = data.row("members", "member_id", member_id)
    if rec is None:
        return {"error": f"No member {member_id}"}
    rec = _clean(rec)
    return {k: rec[k] for k in ("member_id", "first_name", "last_name", "dob", "age",
                                "plan_type", "plan_id", "language_preference") if k in rec}


def get_coverage_rule(plan_type: str, cpt_code: str) -> dict:
    """Benefits rulebook lookup: is this CPT covered under this plan, does it need
    prior auth, and what does it cost?

    Keyed by plan_type + cpt_code -- no member and no claim involved. This answers
    the prospective question ("will this be covered?"). The same rule is read
    retrospectively by the claim researcher to explain a denial.
    """
    df = data.table("coverage_rules")
    hit = df[(df["plan_type"] == plan_type) & (df["cpt_code"] == str(cpt_code))]
    if hit.empty:
        return {"error": f"No rule for plan={plan_type} cpt={cpt_code}"}
    return _clean(hit.iloc[0].to_dict())


def check_roi(member_id: str, caller_name: str) -> dict:
    """Release-of-Information check: may this caller receive this member's information?

    This is NOT identity verification and NOT a login. It answers whether a caller
    is permitted to receive PHI. It belongs on the call path -- a member viewing
    their own dashboard never needs it.

    Returns status one of:
      SELF            - caller is the member; no ROI required
      ON_FILE         - authorised third party, unexpired
      EXPIRED         - authorisation exists but has lapsed (the subtle case:
                        auth_on_file reads True, but the date has passed)
      NOT_ON_FILE     - no authorisation; caller may not receive information
    """
    member = data.row("members", "member_id", member_id)
    if member is None:
        return {"status": "NOT_ON_FILE", "reason": f"No member {member_id}"}

    full = f"{member['first_name']} {member['last_name']}".strip().lower()
    if caller_name.strip().lower() == full:
        return {"status": "SELF", "member_id": member_id,
                "reason": "Caller is the member; no ROI required."}

    df = data.table("roi_authorizations")
    hits = df[(df["member_id"] == member_id)
              & (df["authorized_caller_name"].str.strip().str.lower() == caller_name.strip().lower())]
    if hits.empty:
        return {"status": "NOT_ON_FILE", "member_id": member_id, "caller_name": caller_name,
                "reason": "No Release of Information on file for this caller.",
                "remedy": "A signed ROI form is required. Verbal consent is not sufficient. "
                          "The form can be mailed, or completed in the member portal. "
                          "The member may also call directly and act on their own behalf."}

    rec = _clean(hits.iloc[0].to_dict())
    lapsed = bool(rec.get("auth_expired")) or (
        rec.get("expiration_date") is not None
        and date.fromisoformat(rec["expiration_date"]) < date.today()
    )
    if not rec.get("auth_on_file"):
        return {"status": "NOT_ON_FILE", **rec,
                "reason": "An ROI record exists but no authorisation is on file."}
    if lapsed:
        return {"status": "EXPIRED", **rec,
                "reason": f"Authorisation expired on {rec.get('expiration_date')}.",
                "remedy": "A renewed ROI form is required before information can be shared."}
    return {"status": "ON_FILE", **rec,
            "reason": f"Authorised as {rec.get('relationship')}, valid to {rec.get('expiration_date')}."}


def get_roi_summary(member_id: str) -> dict:
    """Who is authorised to call on this member's behalf?

    This is the DASHBOARD view of ROI, and it is a different question from check_roi.
    check_roi answers "may this caller receive information?" on the call path.
    This answers "who could call for me, and is anything about to lapse?" -- the
    proactive half of the ROI use case: telling a member their authorisation is
    missing BEFORE a family member calls and gets refused.
    """
    member = data.row("members", "member_id", member_id)
    if member is None:
        return {"error": f"No member {member_id}"}

    df = data.table("roi_authorizations")
    rows = [_clean(r) for r in df[df["member_id"] == member_id].to_dict("records")]

    active, expired = [], []
    for r in rows:
        lapsed = bool(r.get("auth_expired")) or (
            r.get("expiration_date") is not None
            and date.fromisoformat(r["expiration_date"]) < date.today()
        )
        if r.get("auth_on_file") and not lapsed:
            active.append(r)
        elif r.get("auth_on_file") and lapsed:
            expired.append(r)

    if active:
        status = "On File"
        note = ", ".join(f"{r['authorized_caller_name']} ({r['relationship']})" for r in active)
    elif expired:
        status = "Expired"
        note = ("Authorisation lapsed for "
                + ", ".join(f"{r['authorized_caller_name']} (expired {r['expiration_date']})"
                            for r in expired)
                + ". A renewed ROI form is needed before they can be helped.")
    else:
        status = "Not On File"
        note = ("Nobody is authorised to call on this member's behalf. If a family member "
                "needs to call, a signed ROI form must be filed first -- verbal consent "
                "is not sufficient.")

    return {"member_id": member_id, "status": status, "detail": note,
            "authorized_callers": [r["authorized_caller_name"] for r in active],
            "expired_count": len(expired)}


def get_compliance_flags(entity_id: str = "", flag_type: str = "", severity: str = "") -> dict:
    """Operational and compliance risk flags. All 312 are unresolved -- a live work queue.

    Types: CLAIM_REVIEW_STALLED (191), ROI_AUTHORIZATION_GAP (70),
    PROVIDER_CREDENTIALING_ISSUE (24), HIGH_PROVIDER_DENIAL_RATE (15),
    PRIOR_AUTH_BYPASS (12). Each row ships a pre-written recommended_action --
    triage and rank, do not invent remedies.
    """
    df = data.table("compliance_flags")
    if entity_id:
        df = df[df["entity_id"] == entity_id]
    if flag_type:
        df = df[df["flag_type"] == flag_type]
    if severity:
        df = df[df["severity"] == severity]
    df = df.head(25)
    return {
        "count": int(len(df)),
        "flags": [_clean(r) for r in df.to_dict("records")],
    }


def predict_denial_risk(claim_id: str) -> dict:
    """Feature check for a PRE-ADJUDICATION claim (Pending / In Review).

    This is where the real inference lives. 203 claims have no denial code yet;
    the issue must be inferred from raw features rather than looked up. Returns
    the derivable signals -- the agent reasons over them, this function does not
    decide.
    """
    c = data.row("claims", "claim_id", claim_id)
    if c is None:
        return {"error": f"No claim {claim_id}"}
    m = data.row("members", "member_id", c["member_id"])
    plan = m["plan_type"] if m else None
    rule = get_coverage_rule(plan, c["cpt_code"]) if plan else {}

    signals = {}
    if c["prior_auth_required"] and not c["prior_auth_obtained"]:
        signals["prior_auth_gap"] = "prior_auth_required=True but prior_auth_obtained=False"
    if not c["referral_on_file"]:
        signals["no_referral"] = "referral_on_file=False"
    if c["modifier_mismatch"]:
        signals["modifier_mismatch"] = "modifier_mismatch=True"
    if c["denial_risk_flag"]:
        signals["flagged"] = "denial_risk_flag=True"
    if rule and rule.get("covered") is False:
        signals["not_covered"] = f"coverage_rules says covered=False for {plan}/{c['cpt_code']}"
    if c["service_date"] is not None and c["submitted_date"] is not None:
        lag = (c["submitted_date"] - c["service_date"]).days
        signals["filing_lag_days"] = lag

    return {
        "claim_id": claim_id,
        "claim_status": c["claim_status"],
        "pre_adjudication": c["claim_status"] in ("Pending", "In Review"),
        "signals": signals,
        "coverage_rule": rule,
    }


def get_remedy(denial_code: str) -> dict:
    """Deterministic remedy lookup for a denied claim.

    denial_fixable is a pure function of denial_code, so this is a table, not a
    judgement. The LLM renders it into member-specific prose; it does not choose it.
    """
    r = REMEDIES.get(denial_code)
    if not r:
        return {"error": f"Unknown denial_code {denial_code}"}
    return {"denial_code": denial_code, **r}


def compute_call_risk_score(claim_id: str) -> dict:
    """Likelihood this claim generates a member call. 0-100.

    A DETERMINISTIC WEIGHTED HEURISTIC, not a trained model. Never present it as
    a prediction from a model. Weights are judgement calls, stated here so a
    reviewer can argue with them.
    """
    c = data.row("claims", "claim_id", claim_id)
    if c is None:
        return {"error": f"No claim {claim_id}"}

    score, why = 0, []

    if c["claim_status"] == "Denied":
        if c["denial_fixable"]:
            score += 30
            why.append("denied and fixable (member has something to do) +30")
        else:
            score += 20
            why.append("denied, not fixable (member will want an explanation) +20")

    if c["prior_auth_required"] and not c["prior_auth_obtained"]:
        score += 20
        why.append("prior auth required but not obtained +20")
    if c["denial_risk_flag"]:
        score += 15
        why.append("denial_risk_flag set +15")
    if c["modifier_mismatch"]:
        score += 10
        why.append("modifier mismatch +10")

    flags = data.table("compliance_flags")
    on_claim = flags[flags["entity_id"] == claim_id]
    on_member = flags[flags["entity_id"] == c["member_id"]]
    if len(on_claim):
        score += 15
        why.append(f"{len(on_claim)} open compliance flag(s) on this claim +15")
    if len(on_member):
        score += 15
        why.append(f"{len(on_member)} open compliance flag(s) on this member +15")

    roi = data.table("roi_authorizations")
    bad = roi[(roi["member_id"] == c["member_id"])
              & ((roi["auth_on_file"] == False) | (roi["auth_expired"] == True))]  # noqa: E712
    if len(bad):
        score += 10
        why.append("member has a missing or expired ROI +10")

    return {"claim_id": claim_id, "call_risk_score": min(score, 100), "factors": why,
            "note": "Deterministic heuristic, not a trained model."}
