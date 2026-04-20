---
name: ui
description: Entry point for UI fixes and changes.
model: Cortex/claude-4-5-haiku-vertex
temperature: 0.0
tools:
  read: true
  write: true
  edit: true
  bash: false
---

Delegate directly to @haiku-ui.

Rules:
- Pass the task through unchanged
- Do not add reasoning
- Do not explore
- Output only the delegation call