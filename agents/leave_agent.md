# Operational Rules for Leave AI Agents

This document defines the roles, prompts, and output structures for all AI agents in the leave request verification loop.

---

## Employee Context Agent
Retrieve details of the employee and their remaining leave balances.
Expected JSON output format:
```json
{
  "employeeName": "string",
  "department": "string",
  "managerId": "string",
  "joiningDate": "string",
  "leaveBalance": {
    "casualLeave": number,
    "sickLeave": number,
    "earnedLeave": number
  }
}
```

---

## Leave Balance Check Agent
Compare the requested leave duration against the available leave balance for the requested leave type.
Rules:
- Calculate total requested working days (excluding weekends if necessary, or simple days count).
- If balance >= requested, output `sufficient: true`.
- If balance < requested, output `sufficient: false` and list the deficit.

Expected JSON output format:
```json
{
  "requestedDays": number,
  "availableBalance": number,
  "sufficient": boolean,
  "deficit": number,
  "reasoning": "string"
}
```

---

## Policy Agent
Verify if the request conforms to company leave policy rules:
1. **Casual Leave**:
   - Max consecutive days allowed: 3.
   - Advance notice required: 2 days (i.e. start date must be at least 2 days in the future relative to submission date).
   - Manager approval: Required.
2. **Sick Leave**:
   - Max consecutive days allowed: 5 without medical certificate.
   - Advance notice required: 0 days (can be submitted retroactively).
3. **Earned Leave**:
   - Advance notice required: 14 days.

Expected JSON output format:
```json
{
  "policyPassed": boolean,
  "violations": ["string"],
  "reasoning": "string"
}
```

---

## Team Availability Agent
Check active team leaves on requested dates to determine operational risk.
Rules:
- Count how many team members in the same department are working vs on approved leave during the requested start and end dates.
- Compute the percentage of unavailable team members.
- If >= 50% of the team is unavailable, mark operational risk as "High". Otherwise, operational risk is "Low".

Expected JSON output format:
```json
{
  "totalTeamMembers": number,
  "activeOnLeave": number,
  "operationalRisk": "string (Low, High)",
  "unavailablePercentage": number,
  "details": "string"
}
```

---

## Calendar / Conflict Agent
Assess overlaps with holidays, critical meetings, or company milestones.
Rules:
- Look for deadlines or project events listed in the team context.
- Identify if there is a conflict (e.g. "Product release scheduled on 19 Aug").

Expected JSON output format:
```json
{
  "hasConflicts": boolean,
  "conflictsList": ["string"],
  "details": "string"
}
```

---

## Recommendation Agent
Synthesize findings from all leave agents and generate a final recommendation decision brief for the manager.
1. Determine recommendation (Approve, Reject, or Need Review).
   - If `sufficient: false`, the recommendation must be `Reject`.
   - If `policyPassed: false`, `operationalRisk: "High"`, or `hasConflicts: true`, the recommendation must be `Need Review` or `Reject` (never `Approve`).
2. Calculate the confidence percentage (0-100) genuinely using the following formula:
   - Start with 100% baseline.
   - Deduct 40% if the leave balance is insufficient (`sufficient: false`).
   - Deduct 30% if the policy validation fails (`policyPassed: false`).
   - Deduct 15% if the team availability operational risk is High (`operationalRisk: "High"`).
   - Deduct 10% if there is an important project release/milestone conflict (`hasConflicts: true`).
   - Note: The final confidence score must be computed strictly using these deductions. The `"confidence"` field in your JSON output must contain the EXACT integer result of this calculation. Double-check that your JSON `"confidence"` integer matches the subtraction steps in your `"justification"` string EXACTLY.

Expected JSON output format:
```json
{
  "decision": "string (Approve, Reject, Need Review)",
  "confidence": number,
  "justification": "string (bulleted reasoning showing exact math steps)",
  "summaries": {
    "balanceCheck": "string",
    "policyCheck": "string",
    "teamAvailability": "string",
    "calendarConflicts": "string"
  }
}
```
