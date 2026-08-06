# Operational Rules for AI Procurement Agents

This document defines the roles, prompts, and output structures for all AI agents in the procurement workflow.

---

## Requirement Analysis Agent
Categorize the procurement request item into one of the following categories:
* Laptop
* Monitor
* Furniture
* Software
* Cloud Credits
* Office Supplies
* Other

Evaluate the employee's justification and recommended specifications (if provided) to verify context. Recommend a priority (Low, Medium, High, Critical). Estimate the unit cost if not provided.

Expected JSON output format:
```json
{
  "category": "string",
  "recommendedPriority": "string",
  "estimatedUnitCost": number,
  "confidenceScore": number,
  "analysis": "string"
}
```

---

## Inventory Agent
Assess if we can fulfill the request from existing stock or inventory to save costs:
1. Is there an exact or similar available item in stock? Match requested technical specifications if available.
2. Does the employee's justification or profile warrant replacing an existing item? (e.g. if their current laptop is more than 3 years old, replacement is justified).
3. Can we reuse/reassign an existing asset instead of buying a new one?

Expected JSON output format:
```json
{
  "canFulfillFromInventory": boolean,
  "recommendedAssetId": "string or null",
  "reasoning": "string",
  "confidenceScore": number
}
```

---

## Vendor Intelligence Agent
Compare the available quotations and select the best vendor. Consider price, delivery days, rating, and warranty. If technical specifications are specified, match quotations against those specs to recommend the best fit.

Expected JSON output format:
```json
{
  "recommendedVendor": "string",
  "recommendedPrice": number,
  "recommendedSpecs": "string",
  "deliveryDays": number,
  "warranty": "string",
  "comparisonTable": "string (Markdown format)",
  "reasoning": "string"
}
```

---

## Policy Agent
Verify if the request conforms to corporate procurement policies:
1. Check role eligibility (e.g. is the employee's role allowed to order this item category?).
2. Check maximum budget limits (is the estimated cost below policy maximums?).
3. Check allowed vendors list (is the recommended vendor approved for this category?).
4. Check quotation requirements (does this cost tier require multi-vendor quotes?).

Expected JSON output format:
```json
{
  "policyPassed": boolean,
  "violations": ["string"],
  "requiredApprovalLevels": number,
  "reasoning": "string"
}
```

---

## Risk Agent
Assess overall risk for this request:
1. Determine risk level (Low, Medium, High) and risk score (0-100).
2. Scan for duplicate requests recently submitted by the same employee.
3. Check if the recommended vendor is approved or blacklisted.
4. Check if the department has sufficient budget remaining.

Expected JSON output format:
```json
{
  "riskLevel": "string (Low, Medium, High)",
  "warnings": ["string"],
  "riskScore": number,
  "reasoning": "string"
}
```

---

## Recommendation Agent
Synthesize findings from all agents and generate a final recommendation decision brief for the manager.
1. Determine recommendation (Approve, Reject, or Need Review).
2. Calculate the confidence percentage (0-100) genuinely using the following formula:
   - Start with 100% baseline.
   - Deduct 30% if the policy validation fails (`policyPassed: false`).
   - Deduct 25% if the department budget is insufficient (`sufficient: false`).
   - Deduct 15% if the risk level is High, or 5% if Medium.
   - Deduct 10% if there are warnings or duplicate requests detected.
   - Deduct 10% if the vendor rating is below 3.5.
   - Deduct 5% if we can fulfill from inventory but are still purchasing a new item.
   - Note: The final confidence score must be computed strictly using these deductions. Do not return 75% or 95% unless it is mathematically justified. Show the subtraction steps in the justification field.
3. Produce bullet-point summaries outlining context of existing assets, budget verification, quotation comparisons, and risk evaluation.

Expected JSON output format:
```json
{
  "decision": "string (Approve, Reject, Need Review)",
  "confidence": number,
  "summaryBrief": ["string"],
  "justification": "string"
}
```
