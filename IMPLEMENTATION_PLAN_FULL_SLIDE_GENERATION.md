# Implementation Plan: Full-Slide Content Generation

**Feature**: Full-Slide Content Generation (Critical)  
**Priority**: 🔴 CRITICAL  
**Effort**: Medium (2–3 days)  
**Impact**: High — Enables variant/template-based generation  
**Phase**: 2.1 (Advanced Zone Management)  
**Created**: 2026-04-15  
**Status**: Planning

---

## 1. Overview

Currently, users must manually select individual zones to generate content. "Full-Slide Content Generation" allows users to mark an entire slide for AI generation, generating all content at once based on the existing structure.

### Use Case
User has a "Product Card" slide template with zones:
- `product_title` (title)
- `product_description` (description)
- `product_price` (price)
- `product_image_url` (image URL)

Instead of selecting each zone individually, they want to generate 5 completely different product cards from the same template in one operation.

### Expected Workflow
1. User clicks "Generate Full Slide" button in slide control bar
2. System generates a recipe that includes ALL zones on the slide
3. User receives a single JSON payload with all zones
4. User pastes AI-generated JSON
5. System validates all zones are present
6. User clicks "Apply" to fill entire slide at once

---

## 2. Current State Analysis

### Existing Architecture
- **Recipe Generation**: `server/lib/html-recipe-builder.js`
  - Currently generates recipes for user-selected zones
  - Excludes ignored zones
  - Supports both static and repeatable zones
  
- **Zone Management**: `client/src/components/HtmlTreePanel.jsx`
  - Tracks selected zones in state
  - Displays zone assignment UI
  - No "select all" functionality for a slide

- **Slide Control Bar**: `client/src/components/SlideControlBar.jsx`
  - Shows slide info and repeatable toggle
  - No full-slide generation button

- **Validation**: `server/lib/html-recipe-builder.js` - `validateHtmlJson()`
  - Validates that required zones are present in JSON response
  - Works with current zone selection model

### Current Limitations
1. No UI button to trigger full-slide generation
2. Recipe builder doesn't have a "generate all zones on slide" mode
3. Validation assumes user-selected zones, not all zones
4. No visual indicator showing which zones will be generated

---

## 3. Implementation Breakdown

### Phase 1: UI Components (0.5 days)

#### 3.1.1 Add "Generate Full Slide" Button
**File**: `client/src/components/SlideControlBar.jsx`

```jsx
// Add button next to existing controls
<button 
  onClick={handleGenerateFullSlide}
  className="btn btn-secondary"
  title="Generate content for all zones on this slide"
>
  ⚡ Generate Full Slide
</button>
```

**Requirements**:
- Button only visible when slide has at least one zone
- Button disabled if slide is marked as ignored
- Tooltip explains functionality
- Visual feedback when clicked (loading state)

#### 3.1.2 Add Full-Slide Generation Handler
**File**: `client/src/steps/HtmlRecipeStep.jsx`

```javascript
const handleGenerateFullSlide = async (slideIndex) => {
  // 1. Identify all zones on this slide
  // 2. Call API to generate recipe with all zones
  // 3. Display recipe
  // 4. Show visual indicator (highlight slide)
}
```

**Requirements**:
- Identify all non-ignored zones on the slide
- Call new API endpoint `/api/html-flow/generate-full-slide`
- Handle errors gracefully
- Update recipe display

### Phase 2: Backend Recipe Generation (1 day)

#### 3.2.1 Create `generateFullSlideRecipe()` Function
**File**: `server/lib/html-recipe-builder.js`

```javascript
export function generateFullSlideRecipe(
  zones,        // All zones
  slideIndex,   // Target slide
  globalPrompt = '',
  repeatableSlides = []
) {
  // 1. Filter zones for this slide only
  // 2. Exclude ignored zones and their descendants
  // 3. Generate recipe with all zones
  // 4. Return recipe string
}
```

**Requirements**:
- Filter zones by `slideIndex`
- Respect ignored zones (don't include in recipe)
- Include all zone types (block, repeatable)
- Generate clear, concise recipe
- Add instruction: "Generate all zones for this slide"

**Example Recipe Output**:
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
      "value": "<!-- AI-generated product title -->"
    },
    "product_description": {
      // Prompt: 2-3 sentence product description
      "value": "<!-- AI-generated description -->"
    },
    "product_price": {
      // Prompt: Price in USD
      "value": "<!-- AI-generated price -->"
    },
    "product_image_url": {
      // Prompt: URL to product image (use placeholder if unavailable)
      "value": "<!-- AI-generated image URL -->"
    }
  }
}
```

#### 3.2.2 Create API Endpoint
**File**: `server/routes/html-flow.js`

```javascript
// POST /api/html-flow/generate-full-slide
router.post('/html-flow/generate-full-slide', (req, res) => {
  const { projectId, slideIndex } = req.body;
  
  // 1. Load project
  // 2. Get all zones for this slide
  // 3. Call generateFullSlideRecipe()
  // 4. Return recipe
});
```

**Requirements**:
- Accept `projectId` and `slideIndex`
- Return generated recipe
- Handle errors (slide not found, no zones, etc.)
- Log generation for analytics

#### 3.2.3 Update Validation Logic
**File**: `server/lib/html-recipe-builder.js` - `validateHtmlJson()`

Currently validates that user-selected zones are present. For full-slide generation:

```javascript
export function validateHtmlJson(
  json,
  zones,
  options = {}
) {
  const { fullSlide = false, slideIndex = null } = options;
  
  if (fullSlide) {
    // Validate ALL zones on slide are present
    const slideZones = zones.filter(z => z.slideIndex === slideIndex);
    // Check each zone in response
  } else {
    // Validate user-selected zones (existing logic)
  }
}
```

**Requirements**:
- Accept `fullSlide` flag in options
- When true, validate all slide zones are present
- Provide clear error messages if zones missing
- Support both static and repeatable zones

### Phase 3: Frontend Integration (0.5 days)

#### 3.3.1 Update Recipe Display
**File**: `client/src/components/HtmlRecipeStep.jsx`

```jsx
// Show visual indicator when full-slide generation is active
{fullSlideMode && (
  <div className="full-slide-indicator">
    🎯 Full-Slide Generation Mode
    <p>All zones on this slide will be generated</p>
  </div>
)}
```

**Requirements**:
- Show which zones will be generated
- Display slide thumbnail/preview
- Allow user to cancel and go back
- Clear visual distinction from normal generation

#### 3.3.2 Update Apply Content Handler
**File**: `client/src/steps/HtmlRecipeStep.jsx`

```javascript
const handleApplyContent = async () => {
  // If fullSlideMode, validate all zones
  // Then apply content to entire slide
}
```

**Requirements**:
- Validate full-slide JSON structure
- Apply content to all zones on slide
- Show success message
- Update preview automatically

### Phase 4: Testing (1 day)

#### 3.4.1 Unit Tests
**File**: `server/__tests__/html-recipe-builder.test.js`

```javascript
describe('generateFullSlideRecipe', () => {
  it('generates recipe with all zones on slide', () => {
    // Test: slide with 5 zones generates recipe with all 5
  });
  
  it('excludes ignored zones from recipe', () => {
    // Test: slide with 3 zones, 1 ignored = recipe has 2 zones
  });
  
  it('includes repeatable zones for full-slide generation', () => {
    // Test: repeatable slide generates recipe with all instances
  });
  
  it('includes zone prompts and examples', () => {
    // Test: recipe includes helpful context for AI
  });
});

describe('validateHtmlJson with fullSlide option', () => {
  it('validates all zones are present', () => {
    // Test: missing any zone fails validation
  });
  
  it('validates full-slide JSON structure', () => {
    // Test: JSON must have all required zones
  });
  
  it('provides clear error messages', () => {
    // Test: error indicates which zones are missing
  });
});
```

**Acceptance Criteria**:
- ✅ Recipe generation includes all zones on slide
- ✅ Validation ensures all zones present
- ✅ Ignored zones excluded from generation
- ✅ Works with repeatable slides

#### 3.4.2 E2E Tests
**File**: `e2e/html-full-slide-generation.spec.js` (new)

```javascript
test.describe('Full-Slide Content Generation', () => {
  test('user can generate full slide', async ({ page }) => {
    // 1. Upload HTML with zones
    // 2. Click "Generate Full Slide" button
    // 3. Verify recipe includes all zones
    // 4. Paste AI JSON with all zones
    // 5. Apply content
    // 6. Verify all zones filled
  });
  
  test('validation fails if zones missing', async ({ page }) => {
    // 1. Generate full slide
    // 2. Paste incomplete JSON (missing 1 zone)
    // 3. Verify validation error
  });
  
  test('works with repeatable slides', async ({ page }) => {
    // 1. Create repeatable slide with zones
    // 2. Generate full slide for each instance
    // 3. Verify each instance generated separately
  });
  
  test('excluded ignored zones from generation', async ({ page }) => {
    // 1. Mark zone as ignored
    // 2. Generate full slide
    // 3. Verify recipe doesn't include ignored zone
  });
});
```

**Acceptance Criteria**:
- ✅ Full slide generation workflow works end-to-end
- ✅ Validation prevents incomplete submissions
- ✅ Works with repeatable slides
- ✅ Respects ignored zones

---

## 4. Technical Details

### Data Structures

#### Full-Slide Generation Request
```javascript
{
  projectId: "project-123",
  slideIndex: 0  // Which slide to generate
}
```

#### Full-Slide Generation Response
```javascript
{
  recipe: "INSTRUCTIONS:\n...",
  slideIndex: 0,
  zoneCount: 5,
  zones: [
    { key: "product_title", prompt: "Product name" },
    { key: "product_description", prompt: "2-3 sentence description" },
    // ...
  ]
}
```

#### Full-Slide JSON Validation
```javascript
{
  fullSlide: true,
  slideIndex: 0,
  expectedZones: ["product_title", "product_description", "product_price", "product_image_url"]
}
```

### State Management

**Client State** (HtmlRecipeStep.jsx):
```javascript
const [fullSlideMode, setFullSlideMode] = useState(false);
const [fullSlideIndex, setFullSlideIndex] = useState(null);
const [fullSlideZones, setFullSlideZones] = useState([]);
```

---

## 5. Implementation Order

### Sprint Timeline: 2–3 days

**Day 1: Backend**
- [ ] Create `generateFullSlideRecipe()` function
- [ ] Update `validateHtmlJson()` for full-slide mode
- [ ] Create `/api/html-flow/generate-full-slide` endpoint
- [ ] Unit tests for recipe generation and validation

**Day 2: Frontend**
- [ ] Add "Generate Full Slide" button to SlideControlBar
- [ ] Create handler in HtmlRecipeStep
- [ ] Update recipe display with full-slide indicator
- [ ] Update apply content handler

**Day 3: Testing & Polish**
- [ ] E2E tests for full workflow
- [ ] Error handling and edge cases
- [ ] Visual polish and UX refinement
- [ ] Documentation

---

## 6. Acceptance Criteria Checklist

### Functionality
- [ ] "Generate Full Slide" button visible in slide control bar
- [ ] Button generates recipe with ALL zones on slide
- [ ] Recipe includes helpful prompts and examples
- [ ] Ignored zones excluded from generation
- [ ] Validation ensures all zones present in JSON
- [ ] Apply content fills entire slide
- [ ] Works with repeatable slides (each instance generated separately)
- [ ] Works with mixed zone types (block + repeatable)

### User Experience
- [ ] Clear visual indicator showing full-slide generation mode
- [ ] Button disabled when no zones on slide
- [ ] Helpful error messages if validation fails
- [ ] Loading states and feedback
- [ ] Tooltip explaining functionality
- [ ] Works smoothly with existing workflow

### Testing
- [ ] 100% unit test coverage for recipe generation
- [ ] 100% unit test coverage for validation
- [ ] E2E test: generate full slide, verify all zones filled
- [ ] E2E test: validation fails with incomplete JSON
- [ ] E2E test: works with repeatable slides
- [ ] E2E test: respects ignored zones

### Documentation
- [ ] Code comments explaining full-slide logic
- [ ] Updated README with new feature
- [ ] User guide for full-slide generation
- [ ] API documentation

---

## 7. Potential Risks & Mitigation

### Risk 1: Performance with Large Slides
**Issue**: Slides with 50+ zones might generate very long recipes

**Mitigation**:
- Limit initial implementation to slides with <50 zones
- Add warning if slide exceeds limit
- Optimize recipe formatting for size

### Risk 2: Validation Complexity
**Issue**: Ensuring all zones are present in JSON is complex

**Mitigation**:
- Reuse existing validation logic
- Add comprehensive unit tests
- Provide clear error messages

### Risk 3: Repeatable Slide Complexity
**Issue**: Full-slide generation for repeatable slides needs careful handling

**Mitigation**:
- Generate recipe for each instance separately
- Or generate one template recipe with `{N}` instances
- Test thoroughly with repeatable slides

### Risk 4: User Confusion
**Issue**: Users might not understand when to use full-slide vs. zone-by-zone

**Mitigation**:
- Clear button label and tooltip
- Visual indicator in recipe display
- Documentation and examples

---

## 8. Success Metrics

### Quantitative
- [ ] Users can generate full slides in <5 seconds
- [ ] 95%+ validation success rate
- [ ] 0 bugs in first 100 uses

### Qualitative
- [ ] Users report faster workflow
- [ ] Feature adoption >50% of users within 2 weeks
- [ ] Positive feedback in user testing

---

## 9. Future Enhancements

After initial release, consider:

1. **Batch Full-Slide Generation**
   - Generate multiple slide instances at once
   - Useful for template-based projects

2. **Smart Zone Grouping**
   - Group related zones (e.g., "product info" vs. "pricing")
   - Generate each group with separate prompt

3. **Template-Based Generation**
   - Save successful full-slide generations as templates
   - Reuse for similar slides

4. **Variant Generation**
   - Generate 5 variants of same slide
   - Compare and choose best

---

## 10. Dependencies & Blockers

### Dependencies
- ✅ Phase 1 (Block-Only Zones) — COMPLETE
- ✅ Recipe builder — Already exists
- ✅ Validation system — Already exists

### Blockers
- None identified

---

## 11. Rollout Plan

### Phase 1: Development
- Implement all features
- 100% test coverage
- Code review

### Phase 2: Beta Testing
- Release to internal users
- Gather feedback
- Fix issues

### Phase 3: Production
- Merge to main
- Release notes
- Monitor usage

---

## 12. Related Issues & PRs

- Backlog: `backlog.md` line 488
- Feature Priority: `PRIORITIZED_FEATURES.md` line 58
- Roadmap: `ROADMAP.md` line 57

---

## 13. Questions & Discussion Points

1. **Repeatable Slide Handling**: Should we generate all instances at once, or one at a time?
   - Recommendation: One at a time (simpler, clearer)

2. **Zone Ordering**: Should recipe include zones in a specific order?
   - Recommendation: DOM order (left-to-right, top-to-bottom)

3. **Error Recovery**: If validation fails, should user be able to edit JSON?
   - Recommendation: Yes, show JSON in editable textarea

4. **Visual Indicator**: Where should full-slide indicator appear?
   - Recommendation: Top of recipe area (prominent, clear)

---

## Summary

This implementation plan provides a clear roadmap for adding "Full-Slide Content Generation" to SOLON Slide Studio. The feature will:

✅ **Enable faster workflows** by generating entire slides at once  
✅ **Maintain consistency** with existing architecture  
✅ **Respect user choices** (ignored zones, zone selection)  
✅ **Provide clear feedback** with visual indicators  
✅ **Ensure quality** with comprehensive testing  

**Estimated Timeline**: 2–3 days  
**Estimated Complexity**: Medium  
**Expected Impact**: High (enables template-based generation)

Ready to begin implementation!
