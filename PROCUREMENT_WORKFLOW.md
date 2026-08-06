# Multi-Agent AI Procurement System: Technical Workflow Documentation

This document describes the complete architecture, database schemas, AI agent capabilities, policy validations, API endpoints, and live UI dashboard lifecycle for the corporate Procurement Agent system.

---

## 1. System Overview & Problem Statement

In traditional corporate environments, procurement is a bottleneck. Employees requesting equipment (laptops, monitors, software licenses) go through a slow sequence of manual handoffs:
1. Employee submits a text request.
2. Manager reviews it.
3. Procurement team checks if similar items are already in inventory.
4. Finance reviews the department's remaining budget.
5. Vendors and quotations are compared manually.
6. Policies are checked (e.g., spending limits by role).
7. Risk is assessed (duplicate orders, non-approved vendors).
8. A Purchase Order (PO) is generated.

This manual chain leads to delayed approvals, human error, inconsistent decisions, and zero visibility. 

Our system solves this by **coordinating 9 specialized AI Agents** to run all verification checks in parallel-sequence under 10 seconds. It presents the manager with a synthesized **Decision Brief** and a **Live Agent Timeline** for full transparency while keeping the manager in control of the final click.

---

## 2. System Architecture & Database Design

The system runs on **Next.js 16 (Turbopack)**, **Mongoose (MongoDB Atlas)**, and **OpenAI (GPT-4o-mini)**. Rather than monolithic tables, the database is divided into 13 modular collections.

```mermaid
graph TD
    PR[Procurement Request] --> RA[Requirement Analysis Agent]
    RA --> EC[Employee Context Agent]
    EC --> IA[Inventory Agent]
    IA --> BA[Budget Agent]
    BA --> VI[Vendor Intelligence Agent]
    VI --> PA[Policy Agent]
    PA --> Rsk[Risk Agent]
    Rsk --> Rec[Recommendation Agent]
    Rec --> NA[Notification Agent]
    NA --> Mgr[Manager Review]
    Mgr -- Approved -- > PO[Purchase Order Issued]
    Mgr -- Clarify --> PR
```

### The 13 MongoDB Collections

| Collection Name | Mongoose Schema | Purpose & Fields |
| :--- | :--- | :--- |
| **1. Users** | `User` | Stores corporate identity. Fields: `employeeId`, `name`, `email`, `role` (Employee/Manager/Procurement/Admin), `designation`, `department`, `managerId`, `joiningDate`, `location`, `avatar`, `isActive`. |
| **2. Procurement Requests** | `ProcurementRequest` | The core request tracking state. Fields: `requestNumber`, `employeeId`, `managerId`, `itemName`, `category`, `quantity`, `justification`, `priority`, `preferredVendor`, `estimatedCost`, `currentStatus` (Submitted, AI Processing, Pending Manager, Approved, Rejected, Purchase Ordered), `aiRecommendation`, `confidence`. |
| **3. Request Attachments** | `RequestAttachment` | Uploaded quotations, requirement PDFs, or images. Fields: `requestId`, `uploadedBy`, `fileName`, `fileType`, `fileUrl`, `extractedText`, `uploadedAt`. |
| **4. Assets** | `Asset` | Company inventory of hardware. Fields: `assetId`, `assetName`, `category`, `serialNumber`, `assignedTo` (employeeId), `department`, `purchaseDate`, `warrantyExpiry`, `condition` (New/Good/Fair/Poor), `status` (Available/Assigned/Under Repair/Retired). |
| **5. Vendors** | `Vendor` | Corporate approved vendor directory. Fields: `vendorName`, `email`, `phone`, `address`, `gstNumber`, `rating` (1.0-5.0), `averageDeliveryDays`, `warrantySupport` (boolean), `approved` (boolean), `products` (categories). |
| **6. Vendor Quotations** | `VendorQuotation` | Actual quotations/prices submitted by vendors. Fields: `vendorId`, `itemName`, `specification`, `price`, `currency`, `deliveryDays`, `warranty`, `quotationDocument`. |
| **7. Department Budgets** | `DepartmentBudget` | Financial limits for each team. Fields: `department`, `fiscalYear`, `allocatedBudget`, `usedBudget`, `remainingBudget`. |
| **8. Procurement Policies** | `ProcurementPolicy` | Rules instead of hardcoded criteria. Fields: `policyName`, `category`, `description`, `minRole`, `maxBudget`, `requiresQuotation` (boolean), `approvalLevels`, `allowedVendors` (array). |
| **9. AI Workflow Logs** | `AIWorkflowLog` | Detailed transparency logs for each agent. Fields: `requestId`, `agentName`, `action`, `status` (Completed/Failed), `confidence` (%), `reasoning` (markdown text), `evidence` (raw JSON fetched), `executionTime` (ms), `timestamp`. |
| **10. Manager Approvals** | `ManagerApproval` | Logs of manager decisions. Fields: `requestId`, `managerId`, `aiRecommendation`, `decision` (Approved/Rejected/Clarified), `comments`, `approvedAt`. |
| **11. Notifications** | `Notification` | In-app alerts for users. Fields: `userId`, `title`, `description`, `type` (Info/Alert/Success), `read`, `createdAt`. |
| **12. Audit Logs** | `AuditLog` | Full system audit trail. Fields: `requestId`, `actor`, `action`, `details`, `ip`, `timestamp`. |
| **13. Purchase Orders** | `PurchaseOrder` | Generated upon approval. Fields: `requestId`, `vendorId`, `poNumber`, `totalAmount`, `expectedDelivery`, `status` (Issued/Delivered), `createdAt`. |

---

## 3. The 9 AI Agents: Tiniest Details of Execution

When a request is submitted, the workflow coordinator (`src/lib/workflow.ts`) instantiates the agents sequentially. Below is the exact step-by-step detailing of what each agent does, where it gets data, how it evaluates policies, and its logic.

---

### Agent 1: Requirement Analysis Agent
*   **What it tries to do:** Understand the employee's request text, standardize the product name, categorize it, analyze the business justification, recommend a priority, and estimate the cost if the user left it blank.
*   **Data Fetched:** None from DB. It operates directly on the `ProcurementRequest` document submitted by the employee (specifically `itemName`, `quantity`, `justification`, `preferredVendor`, and `estimatedCost`).
*   **AI Logic (LLM Prompt):**
    ```
    Analyze this request: Item: [itemName], Justification: [justification], Preferred Vendor: [preferredVendor], Estimated Cost: [estimatedCost].
    Categorize the item into one of: Laptop, Monitor, Furniture, Software, Cloud Credits, Office Supplies, or Other.
    Evaluate justification, recommend priority (Low, Medium, High, Critical) and estimate unit cost if 0.
    Return JSON { category, recommendedPriority, estimatedUnitCost, confidenceScore, analysis }
    ```
*   **Policy Connection:** Standardizes the `category` tag (e.g. mapping "Dell XPS screen" to "Monitor" or "MacBook" to "Laptop"), which is critical because subsequent policy and vendor rules are category-specific.
*   **Output:** Updates the Request category, priority, and estimatedCost in the DB, and commits an `AIWorkflowLog`.

---

### Agent 2: Employee Context Agent
*   **What it tries to do:** Retrieve the employee's full organizational profile to check seniority and check what assets they currently hold.
*   **Data Fetched:**
    1.  Queries the `users` collection matching `employeeId`.
    2.  Queries the `assets` collection matching `assignedTo: employeeId`.
*   **Logic:** Assembles user parameters (department, designation, role, joiningDate, location) and list of assigned devices.
*   **Policy Connection:** Fetches `role` (e.g., "Employee", "Manager") to evaluate if they meet the `minRole` requirements of procurement policies. It also checks device ages (e.g., if their current laptop is 4 years old, it qualifies for replacement).
*   **Output:** Generates a structured JSON profile and saves it to the workflow log.

---

### Agent 3: Inventory Agent
*   **What it tries to do:** Check if the request can be fulfilled using available, unassigned assets in company inventory instead of purchasing new.
*   **Data Fetched:** Queries the `assets` collection for items matching `category: [analyzedCategory]` and `status: "Available"`.
*   **AI Logic (LLM Prompt):**
    ```
    Assess if we can fulfill this request from inventory:
    Request: [itemName] (Qty: [quantity], Category: [category])
    Employee Current Assets: [currentAssets]
    Available Inventory in DB: [availableAssets]
    Analyze:
    1. Is there an exact or similar available item in stock?
    2. Does the employee's justification warrant a replacement? (e.g. is their current laptop > 3 years old?)
    3. Can we reuse/reassign an existing asset?
    Return JSON { canFulfillFromInventory, recommendedAssetId, reasoning, confidenceScore }
    ```
*   **Policy Connection:** Optimizes company expenditures by blocking purchases of new hardware if identical, functioning hardware is sitting idle in the warehouse.
*   **Output:** Logs inventory status and recommendation details.

---

### Agent 4: Budget Agent
*   **What it tries to do:** Verify if the department has enough remaining budget in the current fiscal year to absorb the request cost.
*   **Data Fetched:** Queries the `department_budgets` collection matching `department: [employeeDepartment]`.
*   **Logic:**
    *   Finds `remainingBudget`.
    *   Compares `cost = estimatedCost * quantity` with `remainingBudget`.
    *   Sets `sufficient = remainingBudget >= cost`.
*   **Policy Connection:** Checks if the department is running in the red. If budget is insufficient, it flags a warning which triggers the risk and recommendation agents to suggest rejection or manager review.
*   **Output:** Returns a pass/fail budget status, allocated, used, and remaining figures.

---

### Agent 5: Vendor Intelligence Agent
*   **What it tries to do:** Match the requested item against vendor quotations to find the best deal based on price, delivery time, vendor rating, and warranty.
*   **Data Fetched:**
    1.  Queries the `vendors` collection matching `approved: true`.
    2.  Queries the `vendor_quotations` collection matching a regex search of the request's `itemName`.
*   **AI Logic (LLM Prompt):**
    ```
    Compare the available quotations and select the best vendor:
    Request: [itemName]
    Quotations found: [quotations]
    Approved Vendors details: [vendors]
    Recommend the best quotation based on:
    1. Total Price
    2. Delivery Days
    3. Vendor Rating
    4. Warranty & Support
    Return JSON { recommendedVendor, recommendedPrice, recommendedSpecs, deliveryDays, warranty, comparisonTable, reasoning }
    ```
*   **Policy Connection:** Checks pricing from multiple authorized vendors, ensuring the purchase comes from an approved partner and at the best market rate.
*   **Output:** Recommended vendor name, optimal price, specs, and a markdown comparison table.

---

### Agent 6: Policy Agent
*   **What it tries to do:** Validate the request against corporate policy thresholds (budget caps, role permissions, mandatory quotes).
*   **Data Fetched:** Queries the `procurement_policies` collection matching `category: [category]`.
*   **AI Logic (LLM Prompt):**
    ```
    Verify if this request conforms to corporate procurement policies:
    Request: [itemName], Cost: [cost], Vendor: [vendor], Employee Role: [role]
    Policies: [policies]
    Check:
    1. Does cost exceed maxBudget for this policy category?
    2. Is the employee role allowed (minRole check)?
    3. Is the selected vendor in the allowedVendors list?
    4. Does it require quotation uploads (requiresQuotation) and is a quote compared?
    Return JSON { policyPassed, violations, requiredApprovalLevels, reasoning }
    ```
*   **Policy Connection:** Reads dynamic policy documents (e.g. standard laptops are capped at $1500 for normal employees, and Apple is only allowed if role >= Manager).
*   **Output:** Policy pass/fail indicator and list of violations (if any).

---

### Agent 7: Risk Agent
*   **What it tries to do:** Score the risk level of the request by scanning for duplicate requests, blacklisted vendors, or suspicious quote rates.
*   **Data Fetched:**
    1.  Queries the `procurement_requests` collection for requests by the same employee matching `itemName` keyword created within the last 30 days.
    2.  Queries the `vendors` collection matching `vendorName: [recommendedVendor]`.
*   **AI Logic (LLM Prompt):**
    ```
    Assess risk for this request:
    Request: [itemName], Cost: [cost], Vendor: [vendor]
    Vendor Blacklisted: [approved == false]
    Duplicate Requests in last 30 days: [count]
    Budget: [budgetCheck]
    Return JSON { riskLevel, warnings, riskScore, reasoning }
    ```
*   **Policy Connection:** Prevents fraud or accidental double ordering (e.g., requesting two monitors within a week) and blocks payments to non-compliant/unapproved vendors.
*   **Output:** Returns a Risk level (Low/Medium/High), score (0-100), and warning list.

---

### Agent 8: Recommendation Agent
*   **What it tries to do:** Synthesize all previous agent findings (Requirement, Context, Inventory, Budget, Vendor, Policy, Risk) into a single, cohesive brief for the manager and output a final decision recommendation.
*   **Data Fetched:** Aggregates data from the output models of Agents 1-7.
*   **AI Logic (LLM Prompt):**
    ```
    Synthesize findings from all agents and generate a final recommendation decision brief for the manager:
    Employee: [employeeName], Role: [role]
    Request: [itemName] ($[cost])
    Requirement Analysis: [Agent 1 JSON]
    Inventory Assessment: [Agent 3 JSON]
    Budget Assessment: [Agent 4 JSON]
    Vendor Intelligence: [Agent 5 JSON]
    Policy Validation: [Agent 6 JSON]
    Risk Analysis: [Agent 7 JSON]
    Determine final recommendation: Approve, Reject, or Need Review. Compute confidence (0-100).
    Produce a concise bullet-point summary summarizing the findings exactly.
    Return JSON { decision, confidence, summaryBrief, justification }
    ```
*   **Policy Connection:** Combines all criteria (budget, policy, risk, inventory) to issue the final AI judgment.
*   **Output:** Updates request status to `Pending Manager`, saves `aiRecommendation` and `confidence` to the request document.

---

### Agent 9: Notification Agent
*   **What it tries to do:** Dispatch alerts to the manager and employee regarding the status of the request.
*   **Data Fetched:** None.
*   **Logic:**
    1.  Inserts a document in `notifications` for the Employee stating that the AI assessment has completed and is sent to the manager.
    2.  Inserts a document in `notifications` for the Manager alerting them that a new request requires review.
*   **Output:** Creates Notification records and records workflow completion log.

---

## 4. End-to-End Procurement Lifecycle (How It Works in the UI)

Here is how a request traverses the system from creation to delivery:

```
[Employee submits Request]
          │
          ▼
[Workflow coordinator starts background execution]
          │
          ├──> 1. Requirement Analysis Agent
          ├──> 2. Employee Context Agent
          ├──> 3. Inventory Agent
          ├──> 4. Budget Agent
          ├──> 5. Vendor Intelligence Agent
          ├──> 6. Policy Agent
          ├──> 7. Risk Agent
          ├──> 8. Recommendation Agent
          └──> 9. Notification Agent
          │
          ▼
[Request status moves to "Pending Manager"]
          │
          ▼
[Manager logs in, reviews AI Brief, clicks "Approve"]
          │
          ▼
[1. Budget is deducted from Department]
[2. Purchase Order is generated automatically]
[3. Request status moves to "Purchase Ordered"]
[4. Notification sent to Employee]
```

### 1. Request Creation
*   An employee logs in and clicks **New Order**.
*   They fill in the modal details (Item Name, Preferred Vendor, Estimated Unit Cost, Quantity, Priority, Business Justification) and click **Initiate AI Analysis**.
*   A `POST` is sent to `/api/procurement/request`. The backend creates a new database record (e.g. `PR-2026-1-1547`) with status `Submitted` and kicks off the background workflow promise without blocking the HTTP response.

### 2. Live Agent Timeline Updates
*   The front-end detects the new request and selects it.
*   Since the request status is `Submitted` or `AI Processing`, the client dashboard initiates polling on `/api/procurement/workflow?requestId={id}` every 1.5 seconds.
*   The backend pipeline executes the agents sequentially, adding logs to `AIWorkflowLog` one by one (simulated with ~1s delays for UI flow).
*   The user sees a vertical timeline update in real-time. For completed steps, a **green checkmark** appears. Clicking any step expands it to show:
    *   Which agent ran it.
    *   What data sources it queried (Mongoose collections, APIs).
    *   Confidence score (%).
    *   Detailed reasoning text.
    *   Execution time.

### 3. Manager Summary & Decision Brief
*   Once the timeline finishes, the request status is set to `Pending Manager`.
*   If the manager logs in (or the user toggles the mode to **Manager (Sarah Jenkins)** at the top), they see the request in their review list.
*   Clicking it loads a orange-themed **AI Synthesis Decision Brief** card:
    *   Summarizes the findings: why it's needed, inventory search result, department budget clearance, vendor choice, policy match, and risk level.
    *   Displays the final recommendation (e.g. **Approve (98% confidence)**).
*   The manager has a comment field and three buttons:
    *   ✅ **Approve**
    *   ❌ **Reject**
    *   💬 **Clarify**

### 4. Decision Actions
*   **Approve (`POST /api/procurement/approve`):**
    *   Updates request status to `Approved`.
    *   Subtracts the request cost from the department budget's `remainingBudget` and adds it to `usedBudget` in `department_budgets`.
    *   Generates a `PurchaseOrder` in MongoDB with a unique code (e.g. `PO-2026-NBD`) and sets expected delivery date (5 days out).
    *   Updates the request status to `Purchase Ordered`.
    *   Creates an `AuditLog` entry.
    *   Creates a `Notification` for the employee.
    *   The UI displays a green success card showing the generated PO details.
*   **Reject / Clarify (`POST /api/procurement/reject`):**
    *   For Rejections, updates request status to `Rejected`.
    *   For Clarification, sets request status back to `Pending Manager` (or custom flag) and appends clarification notes to the justification so the employee can respond.
    *   Creates manager approvals and notification records.

---

## 5. API Routes Map

| Route | Method | Body Parameters | Response Output |
| :--- | :--- | :--- | :--- |
| `/api/seed` | `GET` | None | Clear database and seeds mock data. Returns seed counts. |
| `/api/procurement/request` | `POST` | `{ employeeId, itemName, quantity, justification, priority, preferredVendor, estimatedCost }` | Creates request, records submission audit log, and launches AI workflow. |
| `/api/procurement/request` | `GET` | None | Returns list of all procurement requests sorted by creation date descending. |
| `/api/procurement/request/[id]` | `GET` | None (URL dynamic segment) | Returns details of a specific request and the requesting employee's name. |
| `/api/procurement/my-requests` | `GET` | `?employeeId=EMP-001` | Returns list of requests belonging only to that employee. |
| `/api/procurement/workflow` | `GET` | `?requestId=...` | Returns list of `AIWorkflowLog` entries for the selected request. |
| `/api/procurement/approve` | `POST` | `{ requestId, managerId, comments }` | Approves request, updates budgets, generates PO, and sends success notification. |
| `/api/procurement/reject` | `POST` | `{ requestId, managerId, decision, comments }` | Rejects request or requests clarification. Sends alert notification. |
| `/api/vendors` | `GET` | None | Returns all corporate approved vendors. |
| `/api/inventory` | `GET` | None | Returns all inventory assets. |
| `/api/budgets` | `GET` | None | Returns department budgets. |
| `/api/policies` | `GET` | None | Returns procurement policies. |
