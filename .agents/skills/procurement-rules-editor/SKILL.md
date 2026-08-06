---
name: procurement-rules-editor
description: Skill to manage, edit, and validate procurement rules in agent.md and ensure they are parsed correctly by workflow.py.
---

# Procurement Rules Editor

This skill provides guidelines for updating and validating procurement rules in the project.

## Guide

1. **Locating rules**: The rules are stored in `agents/agent.md`.
2. **Editing limits**: Ensure all monetary thresholds are defined in Rupees (₹).
3. **Validating changes**:
   - Check the Python code type-safety by running:
     `venv/Scripts/pyrefly check agents/workflow.py`
   - Run a basic syntax sanity execution of the workflow script:
     `venv/Scripts/python agents/workflow.py`
