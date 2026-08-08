Architecture — AI Enterprise Operations Platform
1. What the platform does
Our platform helps employees handle common internal company processes such as:
🛒Procurement requests
💰Expense reimbursement
🏖️Leave requests
Instead of employees having to understand complicated company procedures, search through policies, contact different departments, and wait for manual verification, they submit a request through one platform.
The system then collects the information it needs, checks company records and policies, uses specialized AI agents to analyze the request, and sends a concise recommendation to the appropriate manager.
The AI does the analysis and preparation — the manager remains responsible for the final decision.

2. How a request moves through the system
The overall idea is:



Employee → Web App → Request Created → Workflow Orchestrator → Specialized AI Agents → Company Data & Policies → AI Recommendation → Manager Review → Approve / Reject / Clarify → Database Updated → Employee Notified

Frontend and API
Frontend: Next.js + React + TypeScript + CSS Modules.

API layer: Next.js API routes handle request creation, validation, authentication, manager actions, and notification updates.
ondemandenv

Orchestrator and Multi‑Agent Workflow
A Python workflow orchestrator receives each request and decides which specialized agents to invoke and in what order, following a supervisor-style multi‑agent pattern.
truefoundry
+1

For a procurement request, the orchestrator runs:

Requirement Analysis Agent: understands what is being requested (e.g., “high‑performance laptop for AI development”), extracts category, purpose, and rough specs.

Employee Context Agent: fetches role, department, existing devices, and other employee data from MongoDB.

Inventory Agent: checks whether suitable assets already exist to avoid unnecessary purchases.

Budget Agent: verifies available departmental budget against the requested amount.

Vendor Intelligence Agent: compares approved vendors (price, delivery, warranty, rating).

Policy Agent: checks procurement rules (amount limits, eligibility, approved vendors, required approvals).

Risk Agent: looks for duplicate requests, unusual patterns, or vendor/budget concerns.

Recommendation Agent: synthesizes all findings into a structured recommendation (e.g., APPROVE, confidence 96%).

Notification Agent: streams status updates back to the employee dashboard (submitted, checking inventory, validating policy, waiting for manager).

Each agent has a narrow responsibility, making the workflow easier to test, monitor, and extend.
truefoundry
+1

Data Layer (MongoDB)
MongoDB acts as the platform’s memory, with collections such as:

Users – employees and managers.

Assets – company hardware and other resources.

Vendors, VendorQuotations – supplier catalog and quotations.

DepartmentBudgets – per‑department budget state.

ProcurementPolicies – rules used by the Policy Agent.

AIWorkflowLogs – per‑agent actions, confidence, evidence, reasoning.

ManagerApprovals – final human decisions and comments.

This structured data is what agents query; the LLM is not expected to “know” company information on its own.
learn.microsoft
+1

Transparency and Human‑in‑the‑Loop
Every agent writes a log entry (who ran, what was checked, confidence, reasoning) into AIWorkflowLogs, so both employees and managers can see how the AI reached its recommendation.
geeksforless

Managers receive a compact approval card summarizing:

Employee, item, cost.

Key findings (inventory, budget, vendor, policy, risk).

AI recommendation + confidence.

They can Approve, Reject, or Request Clarification. Approval triggers budget updates and downstream actions (e.g., purchase order); rejection records the reason and notifies the employee; clarification creates a feedback loop where the workflow re‑evaluates with the new information. This keeps AI as decision support, not decision maker.
cloud.google
+1

Backend, Models, and Tech Stack
Next.js backend:

Serves frontend, API endpoints, authentication, dashboards, notifications.

Writes initial requests and updates to MongoDB.

Python worker:

Orchestrates agents, queries MongoDB, calls the LLM, and logs workflow steps.

Agents are implemented as Python components with clear inputs/outputs.

LLM:

OpenAI GPT‑4o‑mini used for requirement understanding, semantic checks, policy validation, risk scoring, and generating recommendations.

Always grounded in retrieved company data and policies to reduce hallucinations.
cloud.google
+1

Technologies:

Frontend: Next.js + React (TypeScript), CSS Modules.

Backend/API: Next.js API.

Workflow: Python 3.13, typed with Pyrefly.

Database: MongoDB.

LLM: GPT‑4o‑mini via OpenAI API.

Why This Architecture
Using multiple specialized agents instead of one monolithic prompt provides:

Reliability: Each agent has a limited, well-defined task (e.g., budget checking, policy validation), which can be independently tested.

Transparency: Agent logs and workflow summaries make AI decisions auditable and explainable.

Extensibility: New workflows (leave, expenses, other internal processes) can reuse the same orchestrator, data layer, and logging, with domain-specific agent sets plugged in on top of a shared platform.