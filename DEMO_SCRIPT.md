# Quick Demo Guide - 3 New Features

## 🚀 Setup (2 minutes)

### Terminal 1: API Server
```bash
cd ~/OdysseyDashboard
source ~/odyssey/QUICKSTART.sh
python3 -m odyssey.api_server
```

### Terminal 2: UI
```bash
cd ~/ui
npm run dev -- --port 8080
```

### Open Browser
Web Preview → Port 8080

---

## ✅ Feature 1: ROI Gate UI (Use Case 3)

### Where to Find:
1. Click **"Provider View"** button (top nav, blue)
2. Look for **blue panel** at top: "Call Assist - ROI Verification"

### Demo Flow (2 minutes):

#### Test 1: Blocked Caller ❌
```
Caller Name:  David
Member ID:    MBR00175
[Click "Verify ROI Authorization"]
```

Test Scenarios (transcript_04):

• Blocked: Caller "David", Member "Kelly Foster", DOB "1977-01-07"
• Authorized: Caller "Douglas Wilson", Member "Kelly Foster", DOB "1977-01-07"
• Self: Caller "John Rodriguez", Member "John Rodriguez", DOB "1954-10-02"

**Expected Result:** 🔴 Red box with message:
> "I'm not able to share MBR00175's information with you. For the protection of our members, I need a Release of Information authorisation on file for you, and I'm not showing one..."

**Say to Judges:**
> "This is our ROI gate - it runs BEFORE any agent touches member data. The before_agent_callback prevents PHI disclosure at the gate, not after the fact. This is HIPAA-compliant by design."

#### Test 2: 

Based on the hackathon prompt and your demo guide, here are the best questions for your demo (in order):

🎯 Core Demo Questions (All 4 Use Cases)
1️⃣ Claim Story (Use Case 1)

What does claim CLM000377 entail?
Expected: Explains the knee surgery denial, missing prior auth, suggests provider resubmit with clinical notes

2️⃣ Benefits Question (Use Case 2)

Does CPT 29881 need prior auth on DSNP?
Expected: Answers with rule_id citation from the prior_auth_rules table

3️⃣ ROI Gate (Use Case 3) - Not chatbot, use Representative View
Click Representative View
Enter: David / Kelly Foster / 1977-01-07 → Blocked
Enter: Douglas Wilson / Kelly Foster / 1977-01-07 → Authorized
4️⃣ Compliance (Use Case 4)

What ROI gaps need attention?
Expected: Lists 70 members with ROI_AUTHORIZATION_GAP flags

🌟 Bonus Questions (If Time Allows)
Show Orchestrator Routing:

I'm member MBR00070, what claims do I have?
Expected: Orchestrator uses get_claims_by_member tool directly (not a sub-agent)

Follow-up Conversation:

[After previous question]
What benefits do I have access to?
Expected: Orchestrator remembers you're MBR00070, looks up your plan type (HMO), calls get_plan_benefits_summary("HMO")

Another Claim:

Tell me about claim CLM000380
Expected: Routes to claim_spine, explains the diabetes medication claim

CPT Code Lookup:

What is CPT 99213?
Expected: Routes to benefits_navigator, explains it's an office visit code

📊 Quick Reference Card for Demo
Print this or keep it open:

Use Case	Question	Where
1. Claim Story	What does claim CLM000377 entail?	Chatbot
2. Benefits	Does CPT 29881 need prior auth on DSNP?	Chatbot
3. ROI Gate	David / Kelly Foster / 1977-01-07	Representative View
4. Compliance	What ROI gaps need attention?	Chatbot

## ✅ Feature 3: Call Risk Score (Already Working)

### Where to Find:
**Every claim card** in the dashboard

### Demo Flow (30 seconds):

#### Point Out Risk Indicators
1. In Member View, scroll to **"Claims"** tab
2. Point to claim cards:
   - 🔴 Red "HIGH" badge = risk score ≥ 60
   - 🟡 Yellow "MEDIUM" badge = risk score 30-59
   - 🟢 Green "LOW" badge = risk score < 30

**Say:**
> "See the risk indicators? This is a deterministic heuristic - denied claims, prior auth gaps, compliance flags - weighted and summed to 0-100."

#### Show Code
**Open:** `odyssey/tools.py` lines 419-468

**Point out:**
- Line 432-438: Denied + fixable = +30
- Line 440-442: Prior auth gap = +20
- Line 450-458: Compliance flags = +15 each
- Line 460-465: ROI issues = +10

**Say:**
> "This is NOT a trained model. It's a weighted function. We're transparent about the weights so you can argue with them. The key insight: denial_fixable is a pure function of denial_code - we measured it on 212 claims."

---

## 🎯 Quick Test Cases

### Use Case 1: Claim Story
**Chatbot:** `What does claim CLM000377 entail?`
- Should explain issue, owner, next steps

### Use Case 2: Benefits
**Chatbot:** `Does CPT 29881 need prior auth on DSNP?`
- Should answer with rule_id citation

### Use Case 3: ROI Gate ⭐ **NEW**
**ROI Panel:** David → MBR00175
- Should block with HIPAA explanation

### Use Case 4: Compliance
**Chatbot:** `What ROI gaps need attention?`
- Should list 70 ROI_AUTHORIZATION_GAP flags

---

## 📊 Success Metrics to Highlight

**During demo, say:**

> "We can measure this. The dataset has 212 denied claims with a ground-truth `denial_fixable` label. We could batch all 212 through the Solvability Router and calculate accuracy - that's a number other teams won't have because they're generating code, not reading deterministic data through tools."

> "Business impact: 156 of those 212 denials are fixable. That's 156 provider resubmissions that could've been prevented if we caught the prior-auth gap or modifier mismatch before adjudication. Each prevented denial saves a 30-60 day reprocessing cycle and member frustration."

---

## 🛑 If Something Breaks

### API Server Not Responding
```bash
# Check if running
lsof -ti:5000 | xargs kill -9
python3 -m odyssey.api_server
```

### UI Not Loading
```bash
# Check if running
lsof -ti:8080 | xargs kill -9
cd ~/OdysseyDashboard/ui && npm run dev -- --port 8080
```

### ROI Gate Returns Error
- Check browser console (F12)
- Verify API server is running
- Test health endpoint: `curl http://localhost:5000/api/health`

### Dashboard Refresh Does Nothing
- Open DevTools Network tab
- Click refresh, check for `/api/dashboard` request
- If 404: API server may not be running
- If 500: Check API server terminal for error logs

---

## 💡 Talking Points

### ROI Gate Differentiator:
> "Most teams would implement ROI as a check INSIDE an agent - after data is loaded. We gate it with a before_agent_callback. The LLM never runs, the data is never fetched. It's compliance by design, not compliance by prompt."

### Dashboard Live Data:
> "We built two surfaces: precomputed for instant demos, live for production. The chatbot runs live because it's single-query. The dashboard uses precomputed because batching 7 claims through a 5-stage pipeline would take 10 minutes."

### Call Risk Score:
> "This is a deterministic heuristic, not a trained model, and we're explicit about that. The reason: denial_fixable is a pure function in this dataset - 10 denial codes, zero mixed cases. An LLM 'predicting' it would just be doing a join. So we use code for facts, LLMs for explanations."

### Architecture:
> "5 LLM hops per claim: Summarizer → Issue Detector → two Researchers → Mediator → Solvability Router. The Router isn't an LLM - it reads the boolean the Mediator already produced. Adding an LLM there would add latency for zero intelligence gain."

---

## ⏱️ Time Budget

| Demo Section | Time |
|--------------|------|
| ROI Gate (blocked + authorized tests) | 2 min |
| Dashboard refresh + network tab | 1 min |
| Call risk score indicator + code | 1 min |
| Chatbot 4 use cases | 4 min |
| Architecture walkthrough | 3 min |
| Q&A buffer | 4 min |
| **Total** | **15 min** |

---

## 🎬 Opening Line

> "Call centers handle thousands of preventable contacts daily. Members lack visibility, providers don't know what to fix, and representatives waste time on calls that shouldn't happen. We built a multi-agent ADK system that identifies, explains, and routes issues before anyone picks up the phone. Let me show you all four use cases, starting with our HIPAA-compliant ROI gate..."

**[Switch to Provider View, show ROI panel]**

---

## 🏁 Closing Line

> "To summarize: we've covered all four prompt use cases - claim prediction, benefits with grounded citations, ROI compliance at the gate, and operational monitoring. The architecture uses deterministic code for facts and LLMs for explanation. We can measure accuracy on 212 denied claims with ground-truth labels. And we designed it to prevent calls, not just handle them better. Questions?"

---

**Good luck with the demo! 🚀**
