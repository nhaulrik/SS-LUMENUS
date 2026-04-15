# Implementation Plans

This folder contains detailed, step-by-step implementation plans for major features and initiatives. Each plan uses Test-Driven Development (TDD) methodology and includes:

- Comprehensive test cases with code examples
- Implementation details for each component
- Timeline estimates
- Success criteria and definition of done
- File modification checklist

## Current Plans

### [IMPLEMENTATION_PLAN_IGNORE_ZONES.md](./IMPLEMENTATION_PLAN_IGNORE_ZONES.md)

**Feature:** Ignore/Exclude Zones
**Status:** In Progress (Phase 1)
**Timeline:** 3-4 days
**Priority:** High

Allows users to mark elements as "ignored" so they will NOT receive AI-generated content, even if a parent element is marked for generation.

- **Phase 1:** Server-side implementation (selections-to-zones, recipe builder, patcher, API)
- **Phase 2:** Frontend implementation (CSS, ignore button, component tests)
- **Phase 3:** E2E tests and final verification

---

## How to Use This Folder

1. **Planning Phase:** Create a new implementation plan file before starting development
2. **During Development:** Update the plan with progress and any discovered changes
3. **Completion:** Archive completed plans or move to a historical folder if needed

## Plan Template

When creating a new implementation plan, follow this structure:

```markdown
# Implementation Plan: [Feature Name]

**Feature:** [Description]
**Methodology:** Test-Driven Development (TDD)
**Timeline:** [X days]
**Branch:** `feature/[feature-name]`

## Overview
[High-level description of the feature]

## Data Model Changes
[Any schema or object structure changes]

## Requirements
[Numbered list of requirements]

## Phase 1: [Component 1]
- Tests
- Implementation

## Phase 2: [Component 2]
- Tests
- Implementation

## Phase 3: E2E Tests
- Test cases

## Definition of Done
- [ ] All tests pass
- [ ] No regressions
- [ ] Code review completed
- [ ] Merged to main branch

## Timeline
[Table showing phases and duration]

## Files Modified
[List all files that will be changed]

## Success Criteria
[Numbered list of measurable success criteria]
```

---

## Notes

- All plans should include concrete test code examples (not pseudocode)
- Plans should follow the existing codebase patterns and conventions
- Estimated timelines should be realistic and include buffer time
- Plans are living documents — update them as you learn more during implementation
