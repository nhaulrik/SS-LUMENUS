# Plan: Propagate Patch Entries Across Slides

## Summary

When the same key is tagged on multiple slides, the user can explicitly configure how the AI treats that key:

- **Non-unique**: AI generates one value, injected into all matching slides (recipe treats it as `static`)
- **Unique**: AI generates a different value per slide, using another field on that same slide as context (recipe treats it as `contextual` with a linked-key hint)

Without explicit configuration, shared keys continue to behave as today: auto-detected and placed in `contextual` with slide-specific hints.

---

## User Experience

### 1. Visual Indicator

When the current slide's patch table contains a key that also exists on at least one other non-repeatable slide, show a small icon in that patch row's Key column (inline, next to the key input).

- Hover tooltip: "This key is used on X other slide(s)"
- Click: opens the **Propagate Modal**

### 2. Propagate Modal

```
┌────────────────────────────────────────────┐
│  Propagate "description"                    │
├────────────────────────────────────────────┤
│  This key is tagged on slides: 1, 3        │
│                                            │
│  Propagation mode:                         │
│  ○ Non-unique – same AI content on all     │
│    slides with this key (becomes static)   │
│  ○ Unique – different AI content per       │
│    slide, informed by another field        │
│                                            │
│  [If unique mode:]                         │
│  Context field key:  [product_name  ▼]     │
│  (AI uses each slide's value of this key   │
│   as context when generating description)  │
│                                            │
│  [Cancel]          [Save]                  │
└────────────────────────────────────────────┘
```

**Notes:**
- The modal does not create new tags. It only configures how existing shared-key tags are treated in the recipe.
- The context field dropdown lists all keys present on the current slide (excluding the key being configured).
- Saving with no mode selected clears any existing config (reverts to auto-detection).

---

## Data Model Changes

### New top-level app state: `propagations`

This is key-level configuration, separate from the `tags` array (which is element-level).

```typescript
interface PropagationConfig {
  key: string;        // the shared key this config applies to
  mode: 'non-unique' | 'unique';
  linkedKey?: string; // only for unique mode — key whose value provides context
}
```

`propagations: PropagationConfig[]` is owned by `App`, persisted alongside `tags` and `repeatableSlides`, and passed down through props and API calls.

No changes to the `Tag` interface.

---

## Recipe Changes

`buildRecipe` gains a fourth parameter: `propagations: PropagationConfig[]`.

### Key classification logic (updated)

```
shared key + propagation mode = 'non-unique'  →  static
shared key + propagation mode = 'unique'      →  contextual (with linkedKey hint)
shared key + no propagation config            →  contextual (current auto-detection behavior)
non-shared key                                →  static (unchanged)
```

### Non-unique output (static)

```
"description": "Product description (max 100 chars)"
```

Identical to a regular static field — one AI-generated value applied to all slides that carry that key.

### Unique output (contextual with linked key)

```
"contextual": [
  {
    "slide_index": 1,
    "description": "Product description for slide 1. Use the value of 'product_name' on slide 1 as context."
  },
  {
    "slide_index": 3,
    "description": "Product description for slide 3. Use the value of 'product_name' on slide 3 as context."
  }
]
```

The hint template is: `"<original hint>. Use the value of '<linkedKey>' on slide <n> as context."`

---

## Implementation Plan

| Step | File | Description |
|------|------|-------------|
| 1 | `App.jsx` | Add `propagations` state (`useState([])`); include in patch save snapshot (alongside `tags`, `repeatableSlides`); restore from patch on load/apply; pass `propagations` + `onSavePropagation` to `TagStep`; pass `propagations` to `handleGenerateRecipe` |
| 2 | `App.jsx` | Implement `handleSavePropagation(key, config)` — upserts into `propagations`, calls `triggerSave`; implement `handleDeleteTag` cleanup (remove stale `PropagationConfig` when a key is no longer shared) |
| 3 | `TagStep.jsx` | Import `detectSharedKeys` from `../../server/lib/recipe-builder.js` equivalent — compute shared keys for all tags; render propagate icon on patch rows where key is in shared set |
| 4 | `PropagateModal.jsx` | New component in `client/src/components/` — receives `sharedKey`, `slideList`, `allKeysOnSlide`, current `PropagationConfig|null`, `onSave(config)`, `onClose` |
| 5 | `TagStep.jsx` | Wire icon click → open `PropagateModal` with correct props; on save → call `onSavePropagation` prop |
| 6 | `server/lib/recipe-builder.js` | Update `buildRecipe(tags, repeatableSlides, globalPrompt, propagations)` — apply classification logic; update `validateJsonData(jsonString, tags, repeatableSlides, propagations)` to correctly classify non-unique shared keys as static |
| 7 | `server/pptx-utils.js` | Re-export signatures are fine — no changes needed (barrel file picks up updated exports automatically) |
| 8 | `server/routes/pptx.js` | Update `/generate-recipe` route to destructure and pass `propagations` from request body to `buildRecipe`; same for `/validate-json` route → pass to `validateJsonData` |
| 9 | `App.jsx` | Update `handleGenerateRecipe` to include `propagations` in the POST body to `/api/generate-recipe`; update RecipeStep/validate flow to send `propagations` to `/api/validate-json` |
| 10 | `e2e/fixtures.js` | Add propagation selectors to `SEL`; add `tagKeyOnSlide` helper (tags any element on a given slide with a given key); add `propagatedPage` fixture (see E2E section below) |
| 11 | `e2e/propagate.spec.js` | New spec — E2E tests (see below) |

---

## Patch Persistence

`propagations` is stored inside the patch object alongside `tags` and `repeatableSlides`:

```js
// triggerSave snapshot (App.jsx line ~91)
const snapshot = JSON.stringify({
  tags: newTags,
  repeatableSlides: newRepeatableSlides,
  globalPrompt: promptToSave,
  propagations: newPropagations   // ADD
})

// patch object shape
{ ...p, tags, repeatableSlides, globalPrompt, propagations, updatedAt }
```

On load/apply (`handleApplyPatch`, auto-load effect), restore with:
```js
setPropagations(patch.propagations || [])
```

---

## Key Facts About `sample.pptx` (for E2E)

From the saved patch data, the fixture PPTX has:

| Slide | Element ID | Original Text | Notes |
|-------|-----------|---------------|-------|
| 1 | slide1-elem6 | "Netcompany" | shared across 1, 2, 3 |
| 1 | slide1-elem3 | "Feature Catalog for SteerCo" | unique to slide 1 |
| 2 | slide2-elem3 | "Netcompany" | shared, but slide 2 is repeatable in fixture |
| 2 | slide2-elem7 | "Core Revenue Management" | repeatable slide element |
| 3 | slide3-elem4 | "Netcompany" | shared across 1, 2, 3 |
| 3 | slide3-elem5 | "Business Scope" | unique to slide 3 |
| 3 | slide3-elem3 | "Core Revenue Management" | unique to slide 3 |

**For propagation tests:** slides 1 and 3 are non-repeatable. Tagging `Netcompany` on both slide 1 and slide 3 with the same key gives a naturally shared key without needing slide 2.

---

## E2E Tests — `propagate.spec.js`

### New fixture: `propagatedPage`

Builds on `doUpload`. Tags `netcompany` key with AI on, on both slide 1 and slide 3 (both non-repeatable). This gives a shared key ready for propagation testing.

```js
// fixtures.js addition
propagatedPage: async ({ page }, use) => {
  await doUpload(page);
  await selectSlide(page, 1);
  await tagElement(page, { originalText: 'Netcompany', key: 'netcompany', hint: 'Company name', ai: true });
  await selectSlide(page, 3);
  await tagElement(page, { originalText: 'Netcompany', key: 'netcompany', hint: 'Company name', ai: true });
  await use(page);
}
```

### New selectors in `SEL`

```js
propagateIcon:        '.propagate-icon',
propagateModal:       '.propagate-modal',
propagateModeNonUniq: '[data-testid="mode-non-unique"]',
propagateModeUnique:  '[data-testid="mode-unique"]',
propagateLinkedKey:   '[data-testid="linked-key-select"]',
propagateSave:        '[data-testid="propagate-save"]',
```

### Test cases

**1. Propagate icon appears when key is shared across non-repeatable slides**
- From `propagatedPage`, on slide 3 verify `.propagate-icon` is visible on the `netcompany` row
- Verify a non-shared key has no `.propagate-icon`

**2. Propagate icon not shown when only occurrence is on a repeatable slide**
- Upload, mark slide 2 repeatable, tag `Netcompany` on slide 2 only
- Select slide 2, verify no `.propagate-icon` on that row

**3. Propagate modal opens showing correct slide list**
- From `propagatedPage`, select slide 1, click `.propagate-icon` on `netcompany`
- Verify `.propagate-modal` is visible and contains text "1" and "3"

**4. Non-unique mode — recipe generates key in static section**
- From `propagatedPage`, open propagate modal on slide 1, select Non-unique, save
- Click "Generate Recipe"
- Verify recipe text contains `"netcompany"` in the static section
- Verify `"netcompany"` does NOT appear in the contextual section

**5. Unique mode — recipe generates key in contextual section with linked-key hint**
- From `propagatedPage`, also tag `"Feature Catalog for SteerCo"` on slide 1 as `catalog` (AI on)
  and `"Business Scope"` on slide 3 as `catalog` (AI on) — so there's a context field available
- Open propagate modal for `netcompany`, select Unique, pick `catalog` as context field, save
- Click "Generate Recipe"
- Verify recipe contextual entries for `netcompany` contain `"Use the value of 'catalog'"`

**6. No config — shared key falls back to auto-detected contextual**
- From `propagatedPage` with no propagation config set
- Click "Generate Recipe"
- Verify `"netcompany"` appears in the contextual section (current behavior unchanged)

**7. Clearing config reverts to auto-detected contextual**
- From `propagatedPage`, set Non-unique config, verify recipe contains `netcompany` in static
- Re-open modal, clear selection (no mode chosen), save
- Click "Generate Recipe", verify `netcompany` is back in contextual

---

## Cleanup Behavior

When a tag is deleted and the key is no longer shared:
- Remove any `PropagationConfig` for that key from `propagations` state
- This should happen in `handleDeleteTag` / any place that calls `triggerSave` after tag removal

This prevents stale config from silently affecting the recipe if the key is re-shared later with different intent.
