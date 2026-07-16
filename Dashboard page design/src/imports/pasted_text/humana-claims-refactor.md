Refactor the existing Humana Odyssey claims dashboard into a modern JourneyAI experience focused on reducing member and provider calls through transparency, explanation, and guided next steps.

DESIGN REQUIREMENTS

Use Humana branding throughout:

Primary Green: #7AC143
Secondary Green: #5E9732
Dark Gray: #4A4A4A
Light Gray: #F5F5F5
White: #FFFFFF

Design principles:
- Elder-friendly accessibility
- Large touch targets
- Large typography
- High contrast
- Minimal cognitive load
- Clear hierarchy
- Plain language
- Responsive desktop-first design
- Rounded cards (16px)
- Soft shadows
- Healthcare-focused professional aesthetic

Rename the application:

Odyssey
AI-Powered Claim Journey

Support two experiences:
- Member View
- Provider View

----------------------------------------------------------------

NEW LANDING PAGE EXPERIENCE

The landing page should become a Claims Overview Dashboard.

Purpose:
Provide visibility into ALL claims before drilling into a specific claim.

Top metrics:

- Total Claims
- Open Claims
- Completed Claims
- High Risk Claims
- Claims Requiring Action

Include a claims overview table showing all claims.

Columns:
- Claim Number
- Member
- Date Submitted
- Claim Type
- Risk Level
- Status
- Provider
- Amount
- Last Updated

Filtering capabilities:
- Date Submitted
- Open vs Closed
- Risk Level
- Provider
- Claim Type
- Amount Range

Sorting capabilities:
- Newest Submitted
- Oldest Submitted
- Highest Risk
- Lowest Risk
- Highest Dollar Amount
- Lowest Dollar Amount
- Status

Search:
- Claim Number
- Member Name
- Provider Name

Include claim status chips:

Green:
Completed

Amber:
In Progress

Red:
High Risk

Gray:
Pending

----------------------------------------------------------------

CLAIM SELECTOR

Replace the single-claim experience with an expandable claim selector.

Requirements:

- Dropdown showing all claims
- Searchable dropdown
- Recent Claims section
- Pinned Claims section
- Risk indicators in dropdown
- Status badges in dropdown

Claim dropdown should display:

Claim #
Date Submitted
Status
Risk Level

Selecting a claim updates the dashboard.

----------------------------------------------------------------

MEMBER CLAIM DETAIL EXPERIENCE

After selecting a claim:

Hero Section:

Current Claim Issue
Owner
Action Required
Resolution ETA

Example:

Current Issue:
Missing Prior Authorization

Owner:
Provider

Action Required:
None

Estimated Resolution:
3–5 Business Days

Display prominently in a green-highlighted hero card.

----------------------------------------------------------------

AI EXPLANATION PANEL

Add a dedicated JourneyAI Explanation card.

Title:

What Happened?

Generate plain-language explanation:

- Why claim is delayed
- What happened
- Who owns the next step
- What member should do
- What provider should do
- Expected outcome

Add:

JourneyAI Confidence Score
Last Updated Timestamp

Buttons:

Explain Again
View Timeline

----------------------------------------------------------------

CLAIM TIMELINE

Retain existing timeline.

Enhancements:

Add horizontal top journey progress tracker:

Claim Submitted
Under Review
Issue Detected
Provider Action
Appeal
Resolved

Maintain detailed vertical timeline beneath.

Each event should display:

- Date
- Time
- Owner
- Status
- Description

----------------------------------------------------------------

ISSUE SUMMARY

Create a dedicated potential issues card.

Display:

✓ Eligibility Verified

✓ Coverage Confirmed

⚠ Authorization Missing

⚠ Documentation Delay

✓ ROI Authorization Verified

Include:

Risk Level
Impact Level
Recommended Resolution

----------------------------------------------------------------

DENIAL INTERPRETER

Keep existing denial accordion.

Enhance with:

Member Friendly Explanation

Section:
"What does this mean for me?"

Provider Explanation

Section:
"What action should the provider take?"

Use plain language.

Add:

Severity
Resolution Probability
Expected Processing Time

----------------------------------------------------------------

WHAT HAPPENS NEXT SECTION

Create a dedicated next-step card.

Display:

Current Owner
Next Required Action
Expected Outcome
Estimated Resolution Date

Show workflow progression.

Example:

Provider submits authorization
↓
Humana reviews
↓
Claim reprocesses
↓
Payment determination

----------------------------------------------------------------

PROVIDER VIEW

Provider View should transform the dashboard.

Hero Card:

Provider Action Required

Show:

Claim Impact
Issue
Priority
Member Impact
Due Date

Large callout section.

----------------------------------------------------------------

PROVIDER SUMMARY CARD

Display:

Root Cause
Required Documentation
Coverage Rules
Recommended Resolution
Expected Outcome

CTA:

View Full Provider Summary

Download Summary

----------------------------------------------------------------

PROVIDER ACTION WORKFLOW

Display stepper:

1 Review Claim
2 Upload Authorization
3 Validate Documents
4 Submit
5 Humana Review

Show completion status.

----------------------------------------------------------------

AGENT ACTIVITY FEED

Add right-side panel called:

JourneyAI Agent Activity

Display:

✓ Claim Agent
Found missing authorization

✓ ROI Agent
Verified authorization status

✓ Care Gap Agent
Reviewed preventive care opportunities

✓ Intervention Agent
Generated explanation

✓ Escalation Agent
Determined escalation status

For each entry show:

Timestamp
Confidence Score
Agent Status

----------------------------------------------------------------

LANGUAGE AND ACCESSIBILITY CONTROLS

Add accessibility toolbar in header.

Requirements:

Language Selector Dropdown

Languages:

- English
- Spanish
- French
- Chinese
- Vietnamese
- Arabic

Changing language updates all UI content.

Voice Assistance Selector

Options:

- Female Voice
- Male Voice
- Neutral Voice

Include:

Play Page Audio
Pause Audio
Replay Audio

Support text-to-speech summaries for:

- Claim Explanation
- Denial Explanation
- Next Steps
- Provider Summary

----------------------------------------------------------------

ELDER-FRIENDLY FEATURES

Add accessibility controls:

Text Size
- Small
- Medium
- Large
- Extra Large

High Contrast Toggle

Simplified View Toggle

Voice Narration Toggle

Reading Mode

When Simplified View is enabled:

- Larger text
- Fewer cards
- Plain language only
- Prominent next action
- Reduced visual clutter

----------------------------------------------------------------

OVERVIEW DASHBOARD LAYOUT

Header:
Odyssey
AI-Powered Claim Journey

Accessibility Controls
Language Selector
Voice Selector

--------------------------------------------------

Claims Overview Metrics

--------------------------------------------------

Claims Table
(Search / Sort / Filter)

--------------------------------------------------

Selected Claim

Current Issue Card
JourneyAI Explanation

--------------------------------------------------

Claim Timeline

--------------------------------------------------

Issue Summary
Denial Interpreter

--------------------------------------------------

Next Steps
Provider Summary

--------------------------------------------------

Agent Activity Feed

--------------------------------------------------

Use Humana colors consistently and make the experience feel like an Amazon-style claim tracking journey that clearly answers:

What happened?
Why did it happen?
Who owns the next step?
What action is required?
When will it be resolved?