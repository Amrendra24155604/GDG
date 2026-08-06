# Constitution - Project Rules and Guidelines

This document outlines the core principles and constraints that guide all development and automated behaviors in the Procurement Platform.

---

## 1. Core Principles
* **Transparency**: AI agent decisions must log their reasoning, confidence levels, and database evidence in `AIWorkflowLog`.
* **Consistency**: All costs, budgets, and policies must be expressed in Rupees (`₹`) and scaled appropriately.
* **Separation of Concerns**: Python AI agents must query external configuration files (`agent.md`) for prompts and operational rules, avoiding hardcoded prompts in source files.

---

## 2. Coding Guidelines

### TypeScript/React (Next.js)
* Use CSS Modules for maximum encapsulation.
* Ensure type safety by running `npx tsc --noEmit` before commits.
* Rely on active session data (`currentUser.role`) to toggle UI elements rather than testing simulation dropdown selectors.

### Python Backend
* Maintain compatibility with Python 3.13.
* Run linter checks before committing code: `venv/Scripts/pyrefly check agents/workflow.py`.
* Handle `None` response checks explicitly on all external API requests (e.g. OpenAI completions) to prevent type errors.
