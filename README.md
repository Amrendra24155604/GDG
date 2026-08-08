https://gdg-blush-omega.vercel.app/dashboard


for user:
username:Ankush
pass:Ankush@123
(for creating requests)

for manager:
username:Raja babu
pass:Ankush@123
(for approvals or rejections)

for developer:
username:Amrendra
pass:Ankush@123
(to add new users, handle db)



# 🏢 AI Enterprise Operations Platform

[![Live Demo](https://img.shields.io/badge/Live_Demo-gdg--blush--omega.vercel.app-0070f3?style=for-the-badge&logo=vercel&logoColor=white)](https://gdg-blush-omega.vercel.app/)
[![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript_5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB_Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![OpenAI](https://img.shields.io/badge/OpenAI_GPT--4o--mini-412991?style=for-the-badge&logo=openai&logoColor=white)](https://openai.com/)

> **Live Deployment:** [https://gdg-blush-omega.vercel.app/](https://gdg-blush-omega.vercel.app/)

---

## 📖 Overview

The **AI Enterprise Operations Platform** is an intelligent internal operations suite built to automate corporate administrative workflows:

1. 🛒 **Procurement & Hardware Requests**
2. 🏖️ **Leave & Time-Off Management**
3. 💰 **Expense Claims & Reimbursements**

Instead of employees dealing with slow manual verification, navigating through policy documents, or waiting for multiple departmental sign-offs, requests pass through a coordinated team of **specialized AI agents**. The system checks inventory, budgets, policies, calendar conflicts, and duplicate submissions in seconds, providing managers with an explainable **Decision Brief** and full **Live Agent Audit Trail** while keeping the final approval human-controlled.

---

## 🌟 Key Features

- **⚡ Real-Time Multi-Agent Orchestration**: Specialized AI agents evaluate requests in parallel-sequence and record transparent reasoning logs.
- **🎯 Explainable Confidence Scoring**: Every decision brief includes mathematical confidence ratings based on strict operational rules (`agent_rules.md`).
- **🛡️ Human-in-the-Loop Governance**: AI acts strictly as decision support—managers retain the final click with 1-click **Approve**, **Reject**, or **Request Clarification**.
- **📊 Unified Corporate Dashboard**: Modern high-fidelity UI for employees and managers to track real-time status timelines, budgets, asset allocations, and historical claims.
- **🔍 OCR & Vision Verification**: Automated receipt parsing, price extraction, and duplicate detection for expense submissions.
- **📅 Calendar & Conflict Detection**: Intelligent leave scheduling that checks against corporate milestones, releases, and team attendance thresholds ($\ge 50\%$ unavailable triggers risk alerts).

---

## 🤖 AI Workflows & Specialized Agents

```
Employee Request ➔ Multi-Agent Orchestrator ➔ Data Layer & Policies ➔ AI Decision Brief ➔ Manager Review ➔ Database Updated & Employee Notified
```

### 1. 🛒 Procurement Request Workflow

- **Requirement Analysis Agent**: Standardizes product specs, categorizes items (_Laptop, Monitor, Software, Furniture, Cloud, Office Supplies_), and estimates costs.
- **Employee Context Agent**: Verifies role, official designation, department, and active hardware assignments.
- **Inventory Agent**: Scans stock for available assets to avoid redundant purchases.
- **Budget Agent**: Checks remaining departmental budget against requested amounts.
- **Vendor Intelligence Agent**: Evaluates approved supplier catalogs, ratings ($\ge 4.0$), warranty support, and delivery timelines.
- **Policy Agent**: Enforces budget caps, role minimums, and quotation requirements.
- **Risk Agent**: Evaluates multi-factor risk score (0–100) and checks for duplicate orders.
- **Recommendation Agent**: Synthesizes upstream findings into an actionable decision brief with confidence scores.
- **Notification Agent**: Generates real-time timeline logs and alerts for employees/managers.

### 2. 🏖️ Leave Management Workflow

- **Employee Context Agent**: Retrieves employee profile and remaining leave balances.
- **Leave Balance Agent**: Validates requested duration against available balance.
- **Policy Agent**: Enforces notice periods (e.g. 14 days for Earned Leave) and maximum consecutive day limits.
- **Team Availability Agent**: Evaluates team coverage; flags `HIGH` operational risk if $\ge 50\%$ of the team is off.
- **Calendar / Conflict Agent**: Checks dates against critical project milestones, product launches, and sprint releases.
- **Recommendation Agent**: Formulates an **Approve**, **Reject**, or **Need Review** recommendation.

### 3. 💰 Expense Reimbursement Workflow

- **Employee Context Agent**: Retrieves monthly spending caps and month-to-date claimed totals.
- **Receipt Agent (OCR / Vision)**: Parses merchant names, amounts, receipt dates, and invoice numbers.
- **Expense Classification Agent**: Categorizes expenses (e.g. _Travel, Meals, Cloud, Office Supplies_).
- **Expense History Agent**: Analyzes spending velocity and detects unusual claim spikes.
- **Policy Agent (RAG)**: Validates per-item policy limits (e.g. Taxi limit ₹2,000) and required receipts.
- **Duplicate Detection Agent**: Cross-references receipt numbers and hashes to prevent double reimbursement.
- **Reimbursement Recommendation Agent**: Computes final risk score and payout recommendation.

---

## 🗄️ Database Architecture (MongoDB)

The data layer utilizes 13 modular collections to ground AI reasoning in company truth:

| Collection            | Schema Model         | Purpose                                                               |
| :-------------------- | :------------------- | :-------------------------------------------------------------------- |
| `Users`               | `User`               | Corporate profiles, roles, designations, managers, and status.        |
| `ProcurementRequests` | `ProcurementRequest` | Procurement tracking state, item specs, and AI recommendations.       |
| `RequestAttachments`  | `RequestAttachment`  | Uploaded quotations, invoices, and documents.                         |
| `Assets`              | `Asset`              | Hardware inventory, serials, assignment history, and condition.       |
| `Vendors`             | `Vendor`             | Approved vendor directory, ratings, and contact info.                 |
| `VendorQuotations`    | `VendorQuotation`    | Supplier price bids, warranty, and delivery terms.                    |
| `DepartmentBudgets`   | `DepartmentBudget`   | Departmental allocations, spent funds, and remaining balances.        |
| `ProcurementPolicies` | `ProcurementPolicy`  | Configurable rules, category limits, and approval tiers.              |
| `AIWorkflowLogs`      | `AIWorkflowLog`      | Per-agent execution logs, confidence scores, evidence, and reasoning. |
| `ManagerApprovals`    | `ManagerApproval`    | Manager decisions (Approve/Reject/Clarify) and comments.              |
| `Notifications`       | `Notification`       | Real-time user updates and system alerts.                             |
| `AuditLogs`           | `AuditLog`           | Immutable audit trail for compliance.                                 |
| `PurchaseOrders`      | `PurchaseOrder`      | Automated PO generation upon manager approval.                        |

---

## 💻 Tech Stack

- **Frontend**: [Next.js 16 (Turbopack)](https://nextjs.org/), [React 19](https://react.dev/), TypeScript, Vanilla CSS Modules.
- **Backend**: Next.js App Router API Routes (`src/app/api/`).
- **Database & ORM**: [MongoDB Atlas](https://www.mongodb.com/) with [Mongoose 9](https://mongoosejs.com/).
- **AI & LLM**: [OpenAI GPT-4o-mini](https://openai.com/) via the OpenAI Node SDK.
- **Workflows**: Dual-engine architecture featuring TypeScript node workflows (`src/lib/node_workflow.ts`) and Python agent orchestrators (`agents/workflow.py`).
- **Styling & Typography**: Vanilla CSS with custom design tokens, Google Fonts (Inter / Material Symbols), responsive layout.

---

## 📁 Repository Structure

```
├── agents/                     # Multi-agent orchestrators & rules
│   ├── agent.md                # Procurement rule definitions
│   ├── agent_rules.md          # Global confidence scoring formulas
│   ├── expense_agent.md        # Expense reimbursement rules
│   ├── expense_workflow.py     # Python expense workflow
│   ├── leave_agent.md          # Leave approval rules
│   ├── leave_workflow.py       # Python leave workflow
│   └── workflow.py             # Python procurement workflow orchestrator
├── public/                     # Static assets & icons
├── src/
│   ├── app/
│   │   ├── api/                # API routes (auth, procurement, leave, expense, etc.)
│   │   ├── dashboard/          # Unified Employee & Manager Dashboard
│   │   ├── login/              # Authentication page
│   │   ├── globals.css         # Design tokens and global CSS
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.module.css     # Landing page styles
│   │   └── page.tsx            # Landing page
│   └── lib/
│       ├── db.ts               # MongoDB Mongoose connection
│       ├── email_service.ts    # Email notification dispatcher
│       ├── expense_models.ts   # Expense schemas
│       ├── models.ts           # Core Mongoose models
│       ├── node_workflow.ts    # TypeScript AI agent execution engine
│       └── workflow.ts         # Workflow coordinator bridge
├── ARCHITECTURE.md             # Detailed system architecture document
├── PROCUREMENT_WORKFLOW.md     # In-depth technical workflow specifications
└── README.md                   # Project documentation
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: `v20+` or `v22+`
- **npm**, **yarn**, **pnpm**, or **bun**
- **MongoDB**: A running MongoDB instance or MongoDB Atlas connection string.
- **OpenAI API Key**: GPT-4o-mini access.

### 1. Clone the Repository

```bash
git clone https://github.com/Amrendra24155604/GDG.git
cd GDG
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/gdg_platform?retryWrites=true&w=majority
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@example.com
EMAIL_PASS=your-email-app-password
EMAIL_FROM="Enterprise Operations Portal <no-reply@example.com>"
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🌐 Live Deployment

The platform is deployed live on Vercel:
👉 **[https://gdg-blush-omega.vercel.app/](https://gdg-blush-omega.vercel.app/)**

---

## 📄 License & Credits

Built for enterprise workflow optimization. Powered by Next.js, MongoDB, and OpenAI.