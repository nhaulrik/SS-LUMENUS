# Full-Slide Content Generation — Quick Start Guide

**Status**: 📋 Planning Complete  
**Effort**: 2–3 days  
**Priority**: 🔴 CRITICAL  
**Impact**: High — Enables template-based variant generation

---

## What is Full-Slide Content Generation?

Allow users to mark an entire slide for AI generation, generating all content at once based on the existing structure.

### Before (Zone-by-Zone)
1. Select zone 1 → Generate → Paste JSON → Apply
2. Select zone 2 → Generate → Paste JSON → Apply
3. Select zone 3 → Generate → Paste JSON → Apply
4. Select zone 4 → Generate → Paste JSON → Apply
5. ❌ 4 rounds of manual work

### After (Full-Slide)
1. Click "Generate Full Slide" → Paste JSON → Apply
2. ✅ 1 round of work for entire slide

---

## Use Case

**Product Card Template** with zones:
- `product_title` (title)
- `product_description` (description)
- `product_price` (price)
- `product_image_url` (image)

**Goal**: Generate 5 completely different product cards from the same template

**Current Workflow**: 4 zones × 5 cards = 20 manual operations  
**New Workflow**: 5 "Generate Full Slide" clicks = 5 operations

---

## Implementation Checklist

### Phase 1: UI (0.5 days)
- [ ] Add "Generate Full Slide" button to SlideControlBar
- [ ] Create handler in HtmlRecipeStep
- [ ] Add visual indicator for full-slide mode

### Phase 2: Backend (1 day)
- [ ] Create `generateFullSlideRecipe()` function
- [ ] Update `validateHtmlJson()` for full-slide mode
- [ ] Create `/api/html-flow/generate-full-slide` endpoint

### Phase 3: Frontend Integration (0.5 days)
- [ ] Update recipe display
- [ ] Update apply content handler
- [ ] Add loading states and error handling

### Phase 4: Testing (1 day)
- [ ] Unit tests (recipe generation, validation)
- [ ] E2E tests (full workflow)
- [ ] Edge cases (repeatable slides, ignored zones)

---

## Key Files to Modify

### Backend
- `server/lib/html-recipe-builder.js` — Add `generateFullSlideRecipe()` and update validation
- `server/routes/html-flow.js` — Add `/api/html-flow/generate-full-slide` endpoint

### Frontend
- `client/src/components/SlideControlBar.jsx` — Add button
- `client/src/steps/HtmlRecipeStep.jsx` — Add handler and visual indicator

### Tests
- `server/__tests__/html-recipe-builder.test.js` — Unit tests
- `e2e/html-full-slide-generation.spec.js` — E2E tests (new file)

---

## API Contract

### Request
```json
{
  "projectId": "project-123",
  "slideIndex": 0
}
```

### Response
```json
{
  "recipe": "INSTRUCTIONS:\n...",
  "slideIndex": 0,
  "zoneCount": 5,
  "zones": [
    { "key": "product_title", "prompt": "Product name" },
    { "key": "product_description", "prompt": "2-3 sentence description" }
  ]
}
```

---

## Recipe Format Example

```
INSTRUCTIONS:
- Return ONLY valid JSON, no explanations or markdown
- Generate content for ALL zones listed below
- Maintain consistency with slide structure

GENERATE ALL ZONES FOR THIS SLIDE:

1. BLOCK ZONES (generate full innerHTML for each container):
{
  "blocks": {
    "product_title": {
      // Prompt: Product name
      "value": "<!-- AI-generated title -->"
    },
    "product_description": {
      // Prompt: 2-3 sentence description
      "value": "<!-- AI-generated description -->"
    },
    "product_price": {
      // Prompt: Price in USD
      "value": "<!-- AI-generated price -->"
    },
    "product_image_url": {
      // Prompt: URL to product image
      "value": "<!-- AI-generated URL -->"
    }
  }
}
```

---

## Acceptance Criteria

### Functionality ✅
- [ ] Button visible in slide control bar
- [ ] Recipe includes ALL zones on slide
- [ ] Ignored zones excluded from generation
- [ ] Validation ensures all zones present
- [ ] Apply fills entire slide at once
- [ ] Works with repeatable slides

### User Experience ✅
- [ ] Clear visual indicator
- [ ] Helpful error messages
- [ ] Loading states
- [ ] Works smoothly with existing workflow

### Testing ✅
- [ ] 100% unit test coverage
- [ ] E2E test: full workflow
- [ ] E2E test: validation failures
- [ ] E2E test: repeatable slides
- [ ] E2E test: ignored zones respected

---

## Timeline

| Phase | Task | Effort | Days |
|-------|------|--------|------|
| 1 | UI Components | 0.5d | Day 1 AM |
| 2 | Backend Recipe Gen | 1d | Day 1 PM + Day 2 AM |
| 3 | Frontend Integration | 0.5d | Day 2 PM |
| 4 | Testing & Polish | 1d | Day 3 |
| **Total** | | **2–3 days** | |

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Large slides (50+ zones) | Limit to <50 zones, add warning |
| Validation complexity | Reuse existing logic, comprehensive tests |
| Repeatable slide handling | Generate each instance separately |
| User confusion | Clear button label, tooltip, documentation |

---

## Success Metrics

**Quantitative**:
- Users generate full slides in <5 seconds
- 95%+ validation success rate
- 0 bugs in first 100 uses

**Qualitative**:
- Users report faster workflow
- Feature adoption >50% within 2 weeks
- Positive feedback in testing

---

## Questions?

See full implementation plan: `IMPLEMENTATION_PLAN_FULL_SLIDE_GENERATION.md`

---

## Quick Links

- 📋 Full Plan: `IMPLEMENTATION_PLAN_FULL_SLIDE_GENERATION.md`
- 📚 Backlog: `backlog.md` (line 488)
- 🎯 Priority: `PRIORITIZED_FEATURES.md` (line 58)
- 🗺️ Roadmap: `ROADMAP.md` (line 57)
