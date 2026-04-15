# Prioritized Features — Next Sprint

**Last Updated**: 2026-04-15  
**Sprint Focus**: Template & Zones Step Enhancements  
**Target Timeline**: 1–2 sprints (2–3 weeks)  
**Relevant Links**: [ROADMAP.md](./ROADMAP.md), [TECHNICAL_DEBT.md](./TECHNICAL_DEBT.md)

---

## Overview

High-priority features for the next sprint, ranked by impact and effort. All are focused on improving the Template & Zones step (HtmlUploadStep) based on user feedback and workflow analysis.

---

## 🔴 Critical Features (Next Sprint)

### 1. Ignore/Exclude Zones

**Priority**: 🔴 CRITICAL  
**Effort**: Medium (3–4 days)  
**Impact**: High — Enables selective content generation  
**Phase**: 2.1 (Advanced Zone Management)

**Description**:
Allow users to mark elements as "ignored" so they will NOT receive AI-generated content, even if a parent element is marked for generation.

**Why This Matters**:
Users often need to generate content for a large section but keep specific sub-elements original. Currently impossible without splitting zones.

**Use Case**:
User marks a `<div class="hero-section">` for block zone generation, but wants to keep `<img class="logo">` inside it unchanged.

**Acceptance Criteria**:
- [ ] Add "Ignore" button to AssignmentPanel (alongside Assign/Edit)
- [ ] Mark ignored elements with visual indicator in tree (e.g., strikethrough, muted color)
- [ ] Include ignored elements in zone data structure (`ignored: true`)
- [ ] Recipe generation skips ignored zones
- [ ] HTML patching respects ignored zones (never patch them)
- [ ] Ignored status persists in project chain.json
- [ ] Can unignore elements (toggle behavior)
- [ ] E2E test: mark parent for generation, ignore child, verify child unchanged
- [ ] Unit tests for conflict resolution (ignored child under generated parent)

**Implementation Notes**:
- Add `ignored: boolean` field to zone model
- Update `selectionsToZones.js` to handle ignored zones
- Update `applyHtmlContent.js` to skip ignored zones during patching
- Update recipe builder to exclude ignored zones
- Add visual styling in index.css for ignored tree nodes

**Dependencies**: None (Phase 1 ✅ complete)

**Blocking**: None

---

### 2. Full-Slide Content Generation

**Priority**: 🔴 CRITICAL  
**Effort**: Medium (2–3 days)  
**Impact**: High — Enables variant generation  
**Phase**: 2.1 (Advanced Zone Management)

**Description**:
Allow users to mark an entire slide for AI generation, generating all content at once based on the existing structure.

**Why This Matters**:
Users want to generate completely new instances or variants of a slide while keeping the same layout and zone structure. Currently requires manually selecting each zone.

**Use Case**:
User has a "Product Card" slide template with zones for title, description, image, price. They want to generate 5 completely different product cards from the same template.

**Acceptance Criteria**:
- [ ] Add "Generate Full Slide" button in slide control bar (SlideControlBar component)
- [ ] Generates a recipe that includes ALL zones on the slide
- [ ] User pastes AI JSON with all zones filled
- [ ] Validation ensures all zones are present
- [ ] Apply content fills the entire slide at once
- [ ] Works with repeatable slides (each instance generated fully)
- [ ] E2E test: generate full slide, verify all zones filled
- [ ] Unit test: recipe generation includes all slide zones

**Implementation Notes**:
- Add button to SlideControlBar component
- Create `generateFullSlideRecipe()` function in recipe builder
- Update validation to handle full-slide JSON structure
- Add visual indicator showing which slide is selected for generation

**Dependencies**: None (Phase 1 ✅ complete)

**Blocking**: None

---

### 3. Auto-Expand to Show Assigned Zones

**Priority**: 🔴 CRITICAL  
**Effort**: Small (1–2 days)  
**Impact**: Medium — Improves discoverability  
**Phase**: 2.1 (Advanced Zone Management)

**Description**:
When loading an HTML file, automatically expand tree nodes to reveal which elements already have zones assigned.

**Why This Matters**:
Users need immediate visual feedback on what's already configured, especially when re-opening a project. Currently requires manual expansion to find pre-assigned zones.

**Use Case**:
User uploads an HTML file that already has `data-zone` attributes. The tree should expand to show these pre-assigned zones without clicking manually.

**Acceptance Criteria**:
- [ ] On tree load, detect all nodes with pre-existing zones (data-zone, data-block, data-label-for)
- [ ] Auto-expand parent nodes to reveal assigned zones
- [ ] Highlight/badge assigned zones in the tree
- [ ] Scroll to first assigned zone (optional, nice-to-have)
- [ ] Works with repeatable slides
- [ ] E2E test: upload file with data-zone attrs, verify tree auto-expands
- [ ] Unit test: tree expansion logic for pre-assigned zones

**Implementation Notes**:
- Add `autoExpandForAssignedZones()` function in HtmlTreePanel
- Track which nodes have pre-assigned zones during tree build
- Expand parent nodes in `expandedIds` state on initial load
- Optional: Use `useEffect` to scroll to first assigned zone

**Dependencies**: None (Phase 1 ✅ complete)

**Blocking**: None

---

## 🟠 High Priority Features (After Critical)

### 4. Zone Conflict Resolution UI

**Priority**: 🟠 HIGH  
**Effort**: Small (1–2 days)  
**Impact**: Medium — Improves UX clarity  
**Phase**: 2.2 (Bulk Operations)

**Description**:
When a user selects a block zone that contains leaf zones, show a warning and offer to auto-resolve (remove descendants).

**Why This Matters**:
Currently conflicts are silently resolved on the backend; users don't know what happened.

**Acceptance Criteria**:
- [ ] Conflict detection in AssignmentPanel
- [ ] Warning modal with "auto-resolve" button
- [ ] Confirmation of removed zones
- [ ] E2E test for conflict flow

**Dependencies**: None

---

### 5. Recipe Improvements

**Priority**: 🟠 HIGH  
**Effort**: Small (2–3 days)  
**Impact**: Medium — Improves user understanding  
**Phase**: 3.2 (Recipe History)

**Description**:
Enhance recipe generation with better formatting, examples, and guidance.

**Why This Matters**:
Users struggle to understand what JSON structure to return.

**Acceptance Criteria**:
- [ ] Add "Example JSON" section to recipe
- [ ] Highlight required vs optional fields
- [ ] Add copy-to-clipboard for example
- [ ] E2E test for recipe display

**Dependencies**: None

---

### 6. Zone Type Inference

**Priority**: 🟠 HIGH  
**Effort**: Small (1–2 days)  
**Impact**: Medium — Reduces manual work  
**Phase**: 2.2 (Bulk Operations)

**Description**:
Auto-detect zone type (text/number/image) from HTML attributes and element context.

**Why This Matters**:
Currently defaults to "text"; users must manually override.

**Acceptance Criteria**:
- [ ] Detect `<img>` tags → image type
- [ ] Detect `<input type="number">` → number type
- [ ] Detect `data-type` attribute → use that
- [ ] Unit tests for inference logic

**Dependencies**: None

---

### 7. Slide Thumbnails in Zone Panel

**Priority**: 🟠 HIGH  
**Effort**: Medium (3–4 days)  
**Impact**: Medium — Improves navigation  
**Phase**: 2.2 (Bulk Operations)

**Description**:
Show small thumbnail previews of each slide in the tree panel.

**Why This Matters**:
Large templates are hard to navigate without visual context.

**Acceptance Criteria**:
- [ ] Thumbnail generation from previewHtml
- [ ] Thumbnails in slide tabs
- [ ] Lazy-load thumbnails
- [ ] E2E test for navigation

**Dependencies**: None

---

## 📊 Sprint Planning Guide

### Sprint 1 (Recommended: 2 weeks)
**Focus**: Critical zone management features  
**Items**: Features 1-3 (Ignore, Full-Slide, Auto-Expand)  
**Effort**: ~8 days  
**Team**: 1-2 developers  
**Testing**: E2E + unit tests for each feature

**Deliverables**:
- Improved zone assignment workflow
- Better visibility of pre-configured zones
- Support for selective generation within blocks

### Sprint 2 (Recommended: 1-2 weeks)
**Focus**: UX polish and type inference  
**Items**: Features 4-7 (Conflict UI, Recipe, Type Inference, Thumbnails)  
**Effort**: ~9 days  
**Team**: 1-2 developers  
**Testing**: E2E + unit tests

**Deliverables**:
- Better error handling and user guidance
- Smarter zone type detection
- Visual navigation improvements

---

## Effort Breakdown

| Feature | Effort | Dev Days | QA Days | Total |
|---------|--------|----------|---------|-------|
| 1. Ignore Zones | 3-4 days | 3 | 1 | 4 |
| 2. Full-Slide Generation | 2-3 days | 2 | 1 | 3 |
| 3. Auto-Expand Zones | 1-2 days | 1 | 0.5 | 1.5 |
| 4. Conflict UI | 1-2 days | 1 | 0.5 | 1.5 |
| 5. Recipe Improvements | 2-3 days | 2 | 1 | 3 |
| 6. Type Inference | 1-2 days | 1 | 0.5 | 1.5 |
| 7. Thumbnails | 3-4 days | 3 | 1 | 4 |
| **Total** | | **13 days** | **5 days** | **18 days** |

---

## Testing Strategy

### Unit Tests (Required)
- Zone model updates (ignored, type inference)
- Recipe generation logic (full-slide, ignored zones)
- Tree expansion logic (auto-expand)
- Conflict resolution logic

### E2E Tests (Required)
- Full workflow: upload → assign → generate → apply
- Ignore zones: parent marked, child ignored, verify unchanged
- Full-slide: select all zones, generate, apply
- Auto-expand: upload file with data-zone, verify expansion
- Conflict: block + leaf conflict, verify resolution

### Manual Testing (Required)
- Large templates (100+ nodes)
- Complex nesting (5+ levels)
- Edge cases (empty slides, single-zone slides)

---

## Definition of Done

Each feature must have:
- [ ] Code implemented and reviewed
- [ ] Unit tests passing (100% coverage for new code)
- [ ] E2E tests passing
- [ ] No regressions in existing tests (227 unit, 142 E2E)
- [ ] Code merged to `html-flow` branch
- [ ] Backlog updated with completion date
- [ ] Release notes drafted

---

## Notes

### User Feedback
These features were identified from:
- User interviews (workflow analysis)
- Support tickets (common pain points)
- Feature requests (GitHub issues)

### Design Considerations
- Maintain dark theme and design system
- Keep UI minimal and focused
- Ensure keyboard accessibility (WCAG AA)
- Test with screen readers

### Performance
- No regressions in parse time (<100ms)
- Tree rendering stays <50ms
- Recipe generation stays <50ms

---

**Next Review**: 2026-04-22 (sprint planning)  
**Questions?** See [README.md](./README.md) or open a GitHub issue.
