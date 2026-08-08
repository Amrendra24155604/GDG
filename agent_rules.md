# AI Operational Rules & Confidence Scoring Guidelines (`agent_rules.md`)

This document defines the core responsibilities, one-line summary of work, operational rules, and exact **confidence scoring math formulas** for all AI Agents across the **Procurement**, **Leave**, and **Expense Reimbursement** workflows.

---

## 🛒 1. Procurement Workflow AI Agents

| Agent Name | One-Line Summary of Work | Operational Rules Followed | Confidence Score Calculation Rules |
| :--- | :--- | :--- | :--- |
| **Requirement Analysis Agent** | Categorizes requested items and estimates unit cost/priority. | Evaluates description & specs into standard categories (*Laptop, Monitor, Software, Furniture, Cloud, Office Supplies*). | Baseline: **85%** if context provided, **100%** if item specs match exact catalog. |
| **Employee Context Agent** | Fetches employee profile, designation, department & active assets from DB. | Verifies employee identity, official designation title (e.g. *Software Engineer, Director of Engineering*), department, and active hardware assignment. | **Designation is CORE**: **100%** confidence when employee official designation is matched and verified in DB; **50%** if designation title is unassigned or missing. |
| **Inventory Agent** | Checks internal stock for reusable available assets. | Scans `Asset` database for items with `status: "Available"`. Reallocation evaluated based on standard hardware lifecycle. | **90%** if stock checked. Reduced to **60%** if requested item is in stock but new purchase requested. |
| **Budget Agent** | Verifies departmental budget allocation and remaining funds. | Checks `DepartmentBudget` model for fiscal year balance. Verifies `remainingBudget >= requestedAmount`. | **95%** if budget >= cost. Reduced by **30%** if department budget is exceeded. |
| **Vendor Intelligence Agent** | Evaluates vendor ratings, warranty, prices, and delivery times. | Scans approved vendor catalog and bids. Matches technical specifications against vendor offerings. | **92%** for approved vendors with rating >= 4.0. Deduct **10%** if vendor rating < 3.5. |
| **Policy Agent** | Validates company procurement policies and approval tiers. | Verifies max budget caps, quotation requirements, role minimums, and approved vendor lists from `ProcurementPolicy`. | **98%** if all policy rules pass. Deduct **30%** if policy validation fails. |
| **Risk Agent** | Computes overall risk score (0-100) and checks for duplicates. | Scans for recent duplicate submissions, vendor blacklisting, and budget overruns to compute Risk Level (*LOW, MEDIUM, HIGH*). | Baseline: **94%**. Risk Score calculated from 0-100: Low Risk (<30), Medium Risk (30-60), High Risk (>60). |
| **Recommendation Agent** | Synthesizes all agent audits into final APPROVE / REJECT recommendation. | Aggregates findings from all 8 upstream procurement agents into a structured decision brief for the manager. | **Formula**:<br>• Start at **100%**<br>• Deduct **30%** if invalid justification<br>• Deduct **30%** if policy validation fails<br>• Deduct **25%** if budget is insufficient<br>• Deduct **15%** if Risk Level is HIGH (or **5%** if MEDIUM)<br>• Deduct **10%** for warnings/duplicates<br>• Deduct **10%** if vendor rating < 3.5 |
| **Notification Agent** | Dispatches real-time status updates and email alerts. | Creates audit log entries and notifies assigned manager / employee. | Always **100%** upon notification dispatch. |

---

## 🏖️ 2. Leave Approval Workflow AI Agents

| Agent Name | One-Line Summary of Work | Operational Rules Followed | Confidence Score Calculation Rules |
| :--- | :--- | :--- | :--- |
| **Employee Context Agent** | Fetches profile, designation and current leave balance counts from DB. | Retrieves user record and extracts official designation title and remaining leave balances. | **Designation is CORE**: **100%** confidence upon official designation verification in DB; **50%** if designation is unverified. |
| **Leave Balance Check Agent** | Verifies requested leave duration against available balance. | Calculates requested working days. Sets `sufficient: true` if `availableBalance >= requestedDays`. | **100%** if balance >= requested. Output `sufficient: false` if deficit exists. |
| **Policy Agent** | Checks advance notice requirements and max consecutive day limits. | Enforces Casual Leave (max 3 days, 2 days notice), Sick Leave (max 5 days without cert), Earned Leave (14 days notice). | **95%** if compliant. Set `policyPassed: false` if any rule is violated. |
| **Team Availability Agent** | Calculates department attendance percentage and operational risk. | Counts team members on leave during dates. If **>= 50%** of team is unavailable, sets `operationalRisk: "HIGH"`. | **90%** if team availability >= 50%. Deduct **15%** if operational risk is HIGH. |
| **Calendar / Conflict Agent** | Identifies overlaps with company milestones and release dates. | Scans corporate calendar for product launches, milestone releases, or critical project deadlines. | **92%** if no conflicts found. Deduct **10%** if milestone clash exists. |
| **Recommendation Agent** | Synthesizes leave findings into final manager decision brief. | Combines balance, policy, coverage, and milestone checks to recommend **Approve**, **Reject**, or **Need Review**. | **Formula**:<br>• Set confidence directly to **0%** if requested days exceed available balance OR if request start date is in the past (`isExpired`).<br>• Otherwise start at **100%**:<br>• Deduct **30%** if non-expired policy validation fails<br>• Deduct **15%** if team operational risk is HIGH<br>• Deduct **10%** if milestone release conflict exists |

---

## 💰 3. Expense Reimbursement Workflow AI Agents

| Agent Name | One-Line Summary of Work | Operational Rules Followed | Confidence Score Calculation Rules |
| :--- | :--- | :--- | :--- |
| **Employee Context Agent** | Checks monthly spending limit and current month claimed total. | Retrieves employee's policy group limit (e.g. ₹25,000/month) and calculates remaining claimable allowance. | Always **100%** upon DB record lookup. |
| **Receipt Agent (OCR)** | Vision OCR extraction of merchant name, amount, date & receipt #. | Parses uploaded receipt (`.jpg`, `.pdf`) and compares extracted values against manually entered figures. | **98%** if extracted amount matches submitted claim. Deduct **38%** (to **60%**) if amount mismatch detected. |
| **Expense Classification Agent** | Automatically categorizes expense and determines business purpose. | Maps merchant names (e.g. *Uber ➔ Travel / Client Visit*, *AWS ➔ Cloud / Infrastructure*) to standard expense categories. | Baseline: **97%** accuracy for recognized merchants. |
| **Expense History Agent** | Analyzes spending velocity and past claims for anomalies. | Scans employee's previous claims to detect repetitive spending spikes or high-frequency submissions. | **95%** if spending pattern is normal. |
| **Policy Agent (RAG)** | Performs RAG semantic policy search for category limits. | Queries `ExpensePolicy` collection to check max trip limits (e.g. Taxi limit ₹2,000), receipt requirement, and role rules. | **99%** if within policy limits. Set `policyPassed: false` if trip limit exceeded. |
| **Duplicate Detection Agent** | Cross-references receipt numbers & hashes to flag duplicates. | Scans active claims for matching receipt numbers, dates, and amounts to prevent double reimbursement. | **99%** if no duplicate found. Set `isDuplicate: true` with **90%** confidence if match found. |
| **Risk Agent** | Calculates multi-factor Risk Score (0-100) and Risk Level. | Aggregates receipt validity, amount match, policy pass, and duplicate checks. Computes Risk Score: *LOW (<30), MEDIUM (30-60), HIGH (>60)*. | **96%** confidence in risk calculation based on mathematical weighting. |
| **Reimbursement Recommendation Agent** | Consolidates all 7 agent checks into final APPROVE / REJECT / CLARIFY decision. | Outputs concise recommendation brief detailing receipt verification, policy compliance, duplicate checks, and final payout. | **Formula**:<br>• Start at **100%**<br>• Deduct **40%** if receipt amount mismatches claim<br>• Deduct **30%** if expense policy limit exceeded<br>• Deduct **45%** if duplicate claim detected<br>• Deduct **15%** if Risk Level is HIGH |
