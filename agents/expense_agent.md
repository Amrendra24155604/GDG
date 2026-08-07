# Operational Rules for AI Expense Reimbursement Agents

This document defines the roles, prompts, and output structures for all AI agents in the expense reimbursement multi-agent workflow.

---

## Employee Context Agent
Retrieve and evaluate employee info, department, role, monthly expense limit, and current monthly claimed amount.

Expected JSON output format:
```json
{
  "monthlyLimit": number,
  "currentMonthClaimed": number,
  "remainingLimit": number,
  "confidenceScore": number,
  "reasoning": "string"
}
```

---

## Receipt Agent
Use OCR / Multimodal vision capabilities to extract structured receipt details:
- Merchant Name
- Transaction Date
- Total Amount
- Category / Line Items
- Tax Amount
- Invoice / Receipt Number

Compare extracted receipt values with manual submission entries and highlight any mismatches.

Expected JSON output format:
```json
{
  "extractedMerchant": "string",
  "extractedAmount": number,
  "extractedDate": "string",
  "extractedCategory": "string",
  "receiptNumber": "string",
  "amountMatches": boolean,
  "confidenceScore": number,
  "reasoning": "string"
}
```

---

## Expense Classification Agent
Classify the expense item and categorize business purpose automatically (e.g. AWS -> Cloud / Software, Uber -> Travel / Client Visit).

Expected JSON output format:
```json
{
  "category": "string",
  "businessPurpose": "string",
  "confidenceScore": number,
  "reasoning": "string"
}
```

---

## Expense History Agent
Scan past expense submissions for spending pattern anomalies, frequent repetitive submissions, or unusual spending velocity.

Expected JSON output format:
```json
{
  "historicalClaimCount": number,
  "frequentPatternDetected": boolean,
  "reasoning": "string",
  "confidenceScore": number
}
```

---

## Policy Agent (RAG Knowledge Retrieval)
Retrieve relevant corporate expense rules using semantic retrieval over Expense Policy knowledge base.
Check trip limits, receipt requirements, and role eligibility.

Expected JSON output format:
```json
{
  "policyPassed": boolean,
  "maxLimitPerTrip": number,
  "violations": ["string"],
  "reasoning": "string",
  "confidenceScore": number
}
```

---

## Duplicate Detection Agent
Perform high-precision fuzzy matching across active & previous claim receipts, amounts, dates, and invoice numbers to flag potential duplicates.

Expected JSON output format:
```json
{
  "isDuplicate": boolean,
  "duplicateClaimId": "string or null",
  "similarityPercentage": number,
  "reasoning": "string",
  "confidenceScore": number
}
```

---

## Risk Agent
Compute overall risk score (0-100) and risk level (LOW, MEDIUM, HIGH) combining receipt validity, policy compliance, duplicate checks, and spending history.

Expected JSON output format:
```json
{
  "riskScore": number,
  "riskLevel": "LOW | MEDIUM | HIGH",
  "warnings": ["string"],
  "reasoning": "string",
  "confidenceScore": number
}
```

---

## Reimbursement Recommendation Agent
Consolidate findings from all agents and issue final recommendation: APPROVE, REJECT, or CLARIFY.

Expected JSON output format:
```json
{
  "recommendation": "APPROVE | REJECT | CLARIFY",
  "confidence": number,
  "reimbursementAmount": number,
  "reasoning": "string"
}
```
