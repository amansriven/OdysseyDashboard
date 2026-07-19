"""Phase 1 smoke test: exercise every tool against real rows."""

import csv

from odyssey import data, tools
from odyssey.schemas import DashboardPayload

_root = data._data_root() / "structured"
raw = list(csv.DictReader(open(_root / "claims.csv")))
roi_raw = list(csv.DictReader(open(_root / "roi_authorizations.csv")))

denied = next(c for c in raw if c["claim_status"] == "Denied")
pending = next(c for c in raw if c["claim_status"] in ("Pending", "In Review"))

print("=" * 72)
print("TABLES")
for k, v in data.load().items():
    print(f"  {k:22} {len(v):>4} rows")

print("=" * 72)
print("get_claim / get_member / get_coverage_rule")
c = tools.get_claim(denied["claim_id"])
m = tools.get_member(c["member_id"])
r = tools.get_coverage_rule(m["plan_type"], c["cpt_code"])
print(f"  claim   {c['claim_id']} {c['claim_status']:8} {c['denial_code']:7} {c['cpt_code']}")
print(f"  member  {m['member_id']} plan={m['plan_type']}")
print(f"  rule    {r.get('rule_id')} covered={r.get('covered')} prior_auth={r.get('prior_auth_required')} copay=${r.get('copay')}")

print("=" * 72)
print("check_roi -- all four paths")
mem = data.row("members", "member_id", "MBR00001")
self_name = f"{mem['first_name']} {mem['last_name']}"
print(f"  SELF         : {tools.check_roi('MBR00001', self_name)['status']}")

on_file = next(r for r in roi_raw if r["auth_on_file"] == "True" and r["auth_expired"] == "False")
print(f"  ON_FILE      : {tools.check_roi(on_file['member_id'], on_file['authorized_caller_name'])['status']}"
      f"  ({on_file['authorized_caller_name']}, {on_file['relationship']})")

expired = next(r for r in roi_raw if r["auth_expired"] == "True")
res = tools.check_roi(expired["member_id"], expired["authorized_caller_name"])
print(f"  EXPIRED      : {res['status']}  ({expired['authorized_caller_name']}) -> {res.get('reason')}")

res = tools.check_roi("MBR00175", "David")
print(f"  NOT_ON_FILE  : {res['status']}  (transcript_04 scenario: son calling for his mother)")

print("=" * 72)
print("predict_denial_risk -- the real inference, pre-adjudication")
p = tools.predict_denial_risk(pending["claim_id"])
print(f"  {p['claim_id']} status={p['claim_status']} pre_adjudication={p['pre_adjudication']}")
for k, v in p["signals"].items():
    print(f"    - {k}: {v}")

print("=" * 72)
print("get_remedy -- the 10-row lookup")
rem = tools.get_remedy(c["denial_code"])
print(f"  {rem['denial_code']} owner={rem['owner']}")
print(f"  {rem['next_step'][:90]}")
missing = [k for k in tools.REMEDIES if k not in {x["denial_code"] for x in raw if x["denial_code"]}]
codes_in_data = {x["denial_code"] for x in raw if x["denial_code"]}
print(f"  remedy table covers all {len(codes_in_data)} codes in data: {codes_in_data <= set(tools.REMEDIES)}")

print("=" * 72)
print("compute_call_risk_score")
s = tools.compute_call_risk_score(c["claim_id"])
print(f"  {s['claim_id']} -> {s['call_risk_score']}")
for f in s["factors"]:
    print(f"    + {f}")

print("=" * 72)
print("get_compliance_flags")
f = tools.get_compliance_flags(flag_type="ROI_AUTHORIZATION_GAP")
print(f"  ROI_AUTHORIZATION_GAP: {f['count']} returned (capped at 25)")
print(f"  sample: {f['flags'][0]['description'][:80]}")

print("=" * 72)
print("DashboardPayload contract")
payload = DashboardPayload(
    claim_id=c["claim_id"], member_id=c["member_id"],
    claim_status=c["claim_status"], issue_identified=c["denial_reason"],
    owner=rem["owner"], next_step=rem["next_step"],
    estimated_resolution=f"{c['reprocessing_days_est'] or 'N/A'} days",
    roi_status="On File", call_risk_score=s["call_risk_score"],
)
print(payload.model_dump_json(indent=2)[:420])
print("\nALL TOOLS PASS")
