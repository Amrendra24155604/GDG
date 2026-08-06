# Project Agents and Skills Documentation

This document describes the custom AI agents and custom developer skills implemented in this repository.

---

## 1. Custom Agent: Multi-Agent AI Procurement Auditor

### Architecture
Located in [workflow.py](file:///c:/GDG/agents/workflow.py). This is a custom background worker orchestrated using 9 specialized cooperative agents:
1. **Requirement Analysis Agent**: Categorizes items and estimates baseline unit costs.
2. **Employee Context Agent**: Evaluates employee devices and joins dates.
3. **Inventory Agent**: Checks inventory stocks for reassignments.
4. **Budget Agent**: Validates remaining department budgets.
5. **Vendor Intelligence Agent**: Compares quotations and selects the best vendor.
6. **Policy Agent**: Audits policy limits (cost caps, role eligibility, allowed vendors).
7. **Risk Agent**: Scans duplication history, blacklist status, and budgets.
8. **Recommendation Agent**: Generates final recommendations for the manager.
9. **Notification Agent**: Updates in-app notifications.

### Execution
The agent is launched asynchronously as a subprocess by the Next.js API whenever a request is created:
`python agents/workflow.py [requestId]`

---

## 2. Custom Skill: procurement-rules-editor

### Specification
Located in [.agents/skills/procurement-rules-editor/SKILL.md](file:///c:/GDG/.agents/skills/procurement-rules-editor/SKILL.md). This skill governs how business rules, agent system instructions, and schemas are maintained dynamically inside [agent.md](file:///c:/GDG/agents/agent.md).

### Operational Rules
* **Decoupled Architecture**: Prompts are completely separated from the codebase inside a human-editable Markdown file (`agents/agent.md`).
* **Runtime Parsing**: The Python parser dynamically matches the `## [agent_name]` sections from `agent.md` and appends current database states as context.
* **Validation Guidelines**: Changes are validated using Pyrefly type checking and test executions.
