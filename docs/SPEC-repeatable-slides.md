# Spec: Repeatable Slides — Multi-Instance Content Generation

**Status**: Planned  
**Author**: nch  
**Last Updated**: 2026-04-14  
**Depends on**: SPEC-visual-flow.md (Stage 1 implemented, Stage 2 recipe flow implemented)

---

## Problem

The current recipe model generates a single, fixed output from a template. There is no way for the user to say "generate one slide per car brand" and receive N slide instances in a single AI interaction. Every slide in the output is filled exactly once. This makes the tool unsuitable for data-driven decks where the same slide layout must be repeated with different content for each item in a collection.

---

## Goal

Allow one or more `<section>` elements in the HTML template to be marked as **repeatable**. The user provides a natural-language prompt describing what the instances should represent. The AI decides how many instances to generate. Zones on the repeatable slide are individually marked as **unique** (different value per instance) or **non-unique** (same value stamped into every clone). The patcher clones the section N times, fills unique zones from each instance object, and stamps non-unique zones from a single shared value. Static slides appear exactly once. The output is a single, complete HTML document.

---

## Concept

### Repeatable Slide

A `<section>` is designated repeatable at the **slide level** — not at the zone level. The user marks the entire slide, not individual elements. The slide-level designation carries:

1. A **slide key** — snake_case identifier used in the AI JSON (e.g. `brand_slide`)
2. A **generation prompt** — natural-language instruction to the AI (e.g. `"Generate one slide per car brand found in your context"`)

### Unique vs Non-Unique Zones

Every zone assigned to a repeatable slide is independently marked by the user as either:

| Uniqueness | Meaning | Recipe placement | Patch behaviour |
|---|---|---|---|
| **Unique** | Value differs per instance | Inside each instance object in the `slides[key]` array | Each clone receives its own value |
| **Non-unique** | Value is the same across all clones | In a `shared` block, generated once | Identical value stamped into every clone |

**Example:** A car brand slide might have:
- `brand_name` — **unique** (BMW, Mercedes, Audi, …)
- `brand_description` — **unique** (different text per brand)
- `model_table` — **unique** (different rows per brand)
- `slide_footer` — **non-unique** ("Confidential — Q3 2026" on every clone)
- `currency_note` — **non-unique** ("All prices in EUR" on every clone)

The uniqueness flag is set in the zone assignment panel for each zone on a repeatable slide. It defaults to **unique**.

### Output Structure

For a template with 3 sections where slide 2 is repeatable with 3 instances:

```
[Slide 1 — static]
[Slide 2 — instance A (BMW)]
[Slide 2 — instance B (Mercedes)]
[Slide 2 — instance C (Audi)]
[Slide 3 — static]
```

The output is a single HTML document. The repeatable section is replaced in-place by N clones. Static sections appear once, unchanged in position.

### Instance Content

Each instance object contains values for all **unique** zones on the repeatable slide. **Non-unique** zones are generated once and applied to every clone:

- **Unique leaf zones** → different text/number value per instance
- **Unique block zones** → different innerHTML per instance (AI fills the container using the template's example structure)
- **Non-unique leaf zones** → one text/number value, same across all clones
- **Non-unique block zones** → one innerHTML value, same across all clones

### Element-Built Graphics

Some slides contain visual elements — donut charts, progress bars, stat grids, icon-based indicators — that are constructed entirely from HTML and CSS rather than `<canvas>` or SVG chart libraries. The visual output is encoded in the HTML structure itself: `<div>` elements with specific widths, colours, and CSS custom properties carry the data.

**Example** (from `test_slide.html`):
```html
<div class="donut-chart">
  <div class="donut-segment" style="--pct:42; --color:#4CAF80; --label:'Platform'"></div>
  <div class="donut-segment" style="--pct:33; --color:#64a0ff; --label:'Mobile'"></div>
  <div class="donut-segment" style="--pct:25; --color:#ffa050; --label:'Other'"></div>
  <div class="donut-legend">
    <span class="legend-dot" style="background:#4CAF80"></span>Platform 42%
    <span class="legend-dot" style="background:#64a0ff"></span>Mobile 33%
  </div>
</div>
```

This is a block zone. The recipe includes the **full innerHTML** of the container. The AI reads the structure, understands that `--pct` is the percentage and `--color` is the segment colour, and returns a new innerHTML with different values for the new context. The patcher replaces the container's innerHTML with the AI response. The CSS that drives the visual rendering is unchanged — only the data-carrying attributes and text change.

**This is already supported** by the block zone model. The key requirement is that the full innerHTML is always included in the recipe — not truncated — so the AI has complete structural context. See the `structural` flag below.

### Full innerHTML Always Included

Block zones always include the **complete innerHTML** of the container in the recipe — no character limit, no truncation. This is essential for element-built graphics where every `<div>`, class name, and CSS custom property carries structural meaning. Truncating the example would cause the AI to guess at the structure and produce malformed or visually broken output.

For large data tables with many rows, the full innerHTML is still included. The AI is capable of inferring the repeating row pattern from the complete example and will not be confused by extra rows — it simply uses them as additional evidence of the schema.

---

## Scope

### In scope for this spec

- Marking a `<section>` as repeatable at the slide level
- Slide-level key and prompt assignment
- Per-zone uniqueness flag (unique / non-unique) set in the assignment panel
- Recipe generation: unique zones in instance array, non-unique zones in shared block
- Block zone example HTML included in recipe for both unique and non-unique block zones
- **Element-built graphics:** full innerHTML always included in recipe — no truncation
- JSON validation for repeatable slide arrays and shared block
- Patching: cloning sections, filling unique zones per instance, stamping non-unique zones
- Single repeatable slide per template (data model supports multiple; UI exposes one)
- Full E2E and unit test coverage

### Out of scope

- Multiple repeatable slides exposed simultaneously in the UI (data model supports it, deferred)
- Nested repeatable structures (repeatable within repeatable)
- PDF/export of multi-instance output (export spec is separate)
- AI instance count override (AI decides based on context and prompt)
- Renaming the slide key after project creation

---

## User Journey

### Step 1 — Template & Zones (Stage 1, modified)

The user uploads their HTML template. The DOM tree panel shows each slide's element hierarchy grouped by slide index.

**New: Slide header row.** Above the tree node list for each slide, a dedicated slide-level control bar appears:

```
┌─────────────────────────────────────────────────────┐
│ Slide 2   [ ] Make repeatable                       │
└─────────────────────────────────────────────────────┘
[tree nodes for slide 2...]
```

When the user checks **Make repeatable**, the header expands inline:

```
┌─────────────────────────────────────────────────────┐
│ Slide 2   [✓] Repeatable                           │
│ Key:     [brand_slide________________]              │
│ Prompt:  [Generate one slide per car brand______]   │
│          [found in your context________________]    │
└─────────────────────────────────────────────────────┘
```

A `repeatable` pill badge appears on the slide header. The slide tab button (for multi-slide templates) also shows the badge.

**New: Uniqueness flag in the assignment panel.** When the user opens the assignment panel for a zone on a repeatable slide, a new toggle appears below the zone type selector:

```
[ Zone type: leaf / block ]
[ Key: brand_name ]
[ Hint: ... ]

Across slide instances:
  (●) Unique — different value per instance
  (○) Non-unique — same value on every clone
```

The flag defaults to **Unique**. The user can change it to **Non-unique** for zones like footers, disclaimers, currency notes, or any content that is constant across all instances.

The `repeatableSlides` array and the per-zone `unique` flag are sent to `create-project` alongside `selections`.

**Validation:** A repeatable slide must have at least one zone marked unique (otherwise every clone would be identical and there is no point repeating). If all zones are non-unique, an inline warning is shown: *"All zones are non-unique — each clone will be identical. Mark at least one zone as unique."*

---

### Step 2 — Recipe + JSON (Stage 2, modified)

The recipe has two sub-sections for each repeatable slide:

**Sub-section A — Shared values (non-unique zones):**
Generated once. The AI returns a single object. Stamped into every clone at patch time.

**Sub-section B — Instance array (unique zones):**
The AI returns an array of N objects. Each object has values for all unique zones. The AI decides N based on the generation prompt and its context.

The user copies the recipe, pastes it to their AI, and pastes the JSON response back. The JSON validator checks:
- `data.slides[slideKey].shared` exists and has all non-unique zone keys
- `data.slides[slideKey].instances` is a non-empty array
- Each instance has all unique zone keys
- Block zone values are strings

---

### Step 3 — Preview (Stage 3, modified)

The patcher:
1. Reads `chain.repeatableSlides` to identify which sections to clone
2. Reads `data.slides[key].shared` for non-unique zone values
3. Reads `data.slides[key].instances` for per-instance unique zone values
4. For each instance: clones the `<section>`, fills unique zones from the instance object, fills non-unique zones from the shared object
5. Replaces the original section with all N clones in sequence

Static sections are filled once as before. The preview iframe shows the full multi-slide output.

---

## Data Model Changes

### `chain.json` — new field: `repeatableSlides`

```json
{
  "repeatableSlides": [
    {
      "slideIndex": 2,
      "key": "brand_slide",
      "prompt": "Generate one slide per car brand found in your context"
    }
  ]
}
```

### Selection object — new field: `unique`

```json
{
  "nodeId": "div.slide-footer",
  "slideIndex": 2,
  "zoneType": "leaf",
  "key": "slide_footer",
  "hint": "Confidential disclaimer",
  "autoGenerate": true,
  "type": "text",
  "unique": false
}
```

`unique` defaults to `true` when not set (backward compatible). Only meaningful for zones on repeatable slides; ignored for zones on static slides.

### Zone object — new fields: `isRepeatable`, `unique`

`selectionsToZones` is updated to:
- Set `isRepeatable: true` for zones whose `slideIndex` matches a repeatable slide
- Propagate `unique: true/false` from the selection (default `true`)

---

## Recipe Format

### Example

Template:
- Slide 1: `deck_title` (static leaf)
- Slide 2 (repeatable, key: `brand_slide`, prompt: "Generate one slide per car brand"):
  - `brand_name` — unique leaf
  - `brand_description` — unique leaf
  - `model_table` — unique block
  - `slide_footer` — non-unique leaf
  - `currency_note` — non-unique leaf

### Generated recipe

```
INSTRUCTIONS:
- Return ONLY valid JSON, no explanations or markdown
- Use EXACT key names as provided
- For block zones marked [HTML BLOCK], return the full innerHTML string
- For repeatable slides, return both a "shared" object and an "instances" array

GENERATE THE FOLLOWING DATA:

1. STATIC FIELDS (appear once in the output):
{
  "static": {
    "deck_title": "title of the presentation"
  }
}

2. REPEATABLE SLIDE — brand_slide
PROMPT: "Generate one slide per car brand found in your context"

2a. SHARED VALUES (same on every clone — generate once):
{
  "slides": {
    "brand_slide": {
      "shared": {
        "slide_footer": "confidential disclaimer text",
        "currency_note": "currency/pricing note"
      }
    }
  }
}

2b. INSTANCE VALUES (unique per clone — generate one object per instance):
Each instance must follow this structure exactly:
{
  "brand_name": "the car brand name",
  "brand_description": "2-3 sentence brand overview",
  "model_table": "[HTML BLOCK] fill the table body with model/price data"
}

Example HTML structure for model_table (populate with real data, preserve all tags and classes):
<tbody>
  <tr>
    <td class="model-name">Model X</td>
    <td class="model-price">€45,000</td>
    <td class="model-range">580 km</td>
  </tr>
</tbody>

Return the full structure as:
{
  "slides": {
    "brand_slide": {
      "shared": {
        "slide_footer": "...",
        "currency_note": "..."
      },
      "instances": [
        {
          "brand_name": "BMW",
          "brand_description": "...",
          "model_table": "<tbody><tr>...</tr></tbody>"
        },
        {
          "brand_name": "Mercedes",
          "brand_description": "...",
          "model_table": "<tbody><tr>...</tr></tbody>"
        }
      ]
    }
  }
}

IMPORTANT:
- static: one value per key
- slides.brand_slide.shared: one value per non-unique key — same on every clone
- slides.brand_slide.instances: array of N objects (AI decides N from context)
- Each instance must include ALL unique keys listed above
- model_table: valid innerHTML only — no surrounding <table> tags
```

---

## API Changes

### `POST /api/html-flow/create-project`

**Request body — new field:**
```json
{
  "templateId": "...",
  "selections": [...],
  "projectName": "...",
  "repeatableSlides": [
    {
      "slideIndex": 2,
      "key": "brand_slide",
      "prompt": "Generate one slide per car brand found in your context"
    }
  ]
}
```

`selections` now carry a `unique` field per zone (default `true`).

**chain.json:** `repeatableSlides` persisted. Zones derived via `selectionsToZones` carry `isRepeatable` and `unique` fields.

---

### `POST /api/html-flow/generate-recipe`

No new parameters. Server reads `chain.repeatableSlides` and `chain.zones` (which carry `unique` flags).

**`buildHtmlRecipe` changes:**
1. Accepts `repeatableSlides` alongside `zones`
2. Partitions repeatable zones into `uniqueZones` and `sharedZones` per slide
3. Emits the generation prompt, shared sub-section, instance sub-section, and block zone example HTML
4. Specifies the `{ shared: {}, instances: [] }` JSON structure

---

### `POST /api/html-flow/validate-json`

No new parameters. Server reads `chain.repeatableSlides` and `chain.zones`.

**`validateHtmlJson` changes:**
1. For each repeatable slide: validate `data.slides[key].shared` has all non-unique zone keys
2. Validate `data.slides[key].instances` is a non-empty array
3. Validate each instance has all unique zone keys
4. Report `instanceCount` (length of instances array)
5. Report `missingFields` with instance index: `"brand_slide.instances[2].brand_name"`

---

### `POST /api/html-flow/apply-content`

No new parameters. Server reads `chain.repeatableSlides` and `chain.zones`.

**`applyHtmlContent` changes:**
1. Accepts `repeatableSlides` alongside `zones` and `data`
2. For each repeatable section:
   - Reads `data.slides[key].shared` for non-unique zone values
   - Reads `data.slides[key].instances` for per-instance unique zone values
   - Clones the section N times (N = instances.length)
   - For each clone: fills unique zones from `instances[i]`, fills non-unique zones from `shared`
3. Replaces the original section with all N clones

---

## Implementation Plan

### Phase A — Tree Panel: slide header + repeatable toggle + uniqueness flag

**Files:** `HtmlTreePanel.jsx`, `HtmlUploadStep.jsx`, `App.jsx`

1. **Slide header row.** Add a control bar above the tree node list for each slide (one per slide index). Contains: "Slide N" label, repeatable toggle, and when active: key input + prompt textarea.

2. **Uniqueness toggle in AssignmentPanel.** When the zone being assigned belongs to a repeatable slide, show a radio group: `(●) Unique` / `(○) Non-unique`. Defaults to unique. The toggle is hidden for zones on static slides.

3. **State.** `repeatableSlides` array managed in `HtmlUploadStep` alongside `selections`. Synced via `onSessionChange`. Sent to `create-project`.

4. **Validation.** Warn if a repeatable slide has no unique zones (every clone would be identical).

5. **Visual.** The slide tab button shows a `repeatable` badge. Non-unique zones in the tree show a distinct badge (`shared`) alongside the zone key badge.

---

### Phase B — Server: `create-project` + `chain.json`

**Files:** `server/routes/html-flow.js`, `server/lib/selections-to-zones.js`

1. Accept and validate `repeatableSlides` in `create-project`
2. Persist to `chain.json`
3. In `selectionsToZones`: set `isRepeatable: true` and propagate `unique` from selection for zones on repeatable slides

---

### Phase C — Recipe builder

**Files:** `server/lib/html-recipe-builder.js`

1. Accept `repeatableSlides` as a parameter to `buildHtmlRecipe`
2. For each repeatable slide:
   - Partition zones into `uniqueZones` and `sharedZones`
   - Emit shared sub-section (non-unique zones, generated once)
   - Emit instance sub-section (unique zones, array format)
   - For block zones in either partition: emit the full `exampleHtml` (no truncation)
3. Emit the `{ shared: {}, instances: [] }` JSON structure example

---

### Phase D — Validation

**Files:** `server/lib/html-recipe-builder.js`

1. Accept `repeatableSlides` alongside `zones`
2. Validate `data.slides[key].shared` has all non-unique keys
3. Validate `data.slides[key].instances` is a non-empty array with all unique keys per instance
4. Report `instanceCount` and meaningful `missingFields`

---

### Phase E — Patcher

**Files:** `server/lib/html-patcher.js`

1. Accept `repeatableSlides` alongside `zones` and `data`
2. For each repeatable section: read `shared` and `instances` from `data.slides[key]`
3. Clone N times; per clone: fill unique zones from `instances[i]`, non-unique zones from `shared`
4. Strip authoring attributes from all clones

---

### Phase F — `HtmlRecipeStep` UI

**Files:** `client/src/steps/HtmlRecipeStep.jsx`

1. Show instance count in validation status: "3 instances × 2 unique zones + 1 shared zone"
2. No structural changes — recipe remains a copyable string, JSON response pasted into textarea

---

### Phase G — Tests

#### Unit tests

**`html-recipe-builder.test.js`:**
- `buildHtmlRecipe` with `repeatableSlides` generates REPEATABLE SLIDE section
- Generation prompt appears in the recipe
- Shared sub-section lists non-unique zones
- Instance sub-section lists unique zones
- Block zone example HTML appears for both unique and non-unique block zones
- `{ shared: {}, instances: [] }` JSON structure is emitted correctly
- `validateHtmlJson`: valid when shared and all instances are correct
- `validateHtmlJson`: invalid when `shared` is missing a non-unique key
- `validateHtmlJson`: invalid when `instances` is missing or empty
- `validateHtmlJson`: invalid when an instance is missing a unique key
- `validateHtmlJson`: reports `instanceCount` correctly
- `validateHtmlJson`: reports `missingFields` with instance index

**`html-patcher.test.js`:**
- Clones section N times (one per instance)
- Unique zones differ per clone
- Non-unique zones are identical across all clones
- Static slides before/after repeatable section are preserved
- Zero instances → repeatable section removed entirely
- Block zones (unique and non-unique) are filled correctly

**`html-flow.test.js`:**
- `create-project` accepts and persists `repeatableSlides`
- `create-project` propagates `unique` flag from selections to zones
- `generate-recipe` includes shared + instance sub-sections
- `validate-json` validates shared block and instance array
- `apply-content` produces correct number of sections
- `apply-content` stamps non-unique values identically across clones

#### E2E tests (`html-flow.spec.js`)

**UC-RS-01:** Slide header row is visible above the tree for each slide  
**UC-RS-02:** Repeatable toggle appears on the slide header  
**UC-RS-03:** Enabling toggle shows key input and prompt textarea  
**UC-RS-04:** Slide header shows `repeatable` badge when active  
**UC-RS-05:** Disabling toggle removes badge and clears key/prompt  
**UC-RS-06:** Assignment panel shows unique/non-unique toggle for zones on repeatable slides  
**UC-RS-07:** Assignment panel does NOT show unique/non-unique toggle for zones on static slides  
**UC-RS-08:** Non-unique zones show `shared` badge in the tree  
**UC-RS-09:** Warning shown when repeatable slide has no unique zones  
**UC-RS-10:** `create-project` API receives `repeatableSlides` and `unique` flags  
**UC-RS-11:** Generated recipe contains "REPEATABLE SLIDE" section with prompt  
**UC-RS-12:** Generated recipe contains shared sub-section for non-unique zones  
**UC-RS-13:** Generated recipe contains instance sub-section for unique zones  
**UC-RS-14:** Generated recipe includes block zone example HTML  
**UC-RS-15:** Validation passes for correct `{ shared, instances }` JSON  
**UC-RS-16:** Validation fails when `shared` is missing a non-unique key  
**UC-RS-17:** Validation fails when `instances` is empty  
**UC-RS-18:** Validation fails when an instance is missing a unique key  
**UC-RS-19:** Apply produces correct number of `<section>` elements  
**UC-RS-20:** Non-unique zone values are identical across all clones  
**UC-RS-21:** Unique zone values differ across clones  
**UC-RS-22:** Static slides before/after repeatable section are preserved  
**UC-RS-23:** State preserved when navigating back from recipe to template  

---

## Open Questions

**Q1: Slide header placement**

The tree currently shows children of each `<section>` grouped by slide tabs. The repeatable toggle must live at the slide level, not the node level. Recommendation: a slide control bar above the tree scroll area — one row per slide, separate from the node list. This avoids mixing slide-level and element-level interactions.

**Q2: Uniqueness default for block zones**

Block zones are almost always unique (different table rows per brand, different chart data per region). Should the default be unique for all zones, or should block zones specifically default to unique with a stronger visual hint? Recommendation: default unique for all zones; no special-casing for block zones.

**Q3: What if `shared` is empty (all zones are unique)?**

The recipe omits the shared sub-section entirely. The JSON structure simplifies to `{ instances: [...] }`. The validator accepts either `{ shared: {}, instances: [...] }` or `{ instances: [...] }` when there are no non-unique zones.

**Q4: What if `instances` is empty (all zones are non-unique)?**

This is prevented by the UI validation in Phase A (warn if no unique zones). At the API level, `apply-content` would produce zero clones and remove the section entirely — a valid but almost certainly unintended outcome. The validator should reject `instances: []` and report a clear error.

**Q5: Block zone example HTML — truncation**

Not truncated. The full innerHTML is always included. Element-built graphics require the complete structure. Large data tables are handled correctly by the AI even with many example rows.

**Q6: Can the user set uniqueness after project creation?**

Not in this spec. Uniqueness is a property of the selection, set before `create-project`. Changing it post-creation would require updating `chain.json` and invalidating the recipe. Deferred.

---

## Key Files Summary

| File | Change |
|---|---|
| `client/src/components/HtmlTreePanel.jsx` | Slide header row with repeatable toggle, key, prompt; uniqueness toggle in AssignmentPanel; `shared` badge on non-unique zones |
| `client/src/steps/HtmlUploadStep.jsx` | `repeatableSlides` state; sync to session; send to `create-project` |
| `client/src/App.jsx` | Include `repeatableSlides` in `htmlUploadSession` |
| `server/routes/html-flow.js` | Accept `repeatableSlides` in `create-project`; persist; pass to recipe/validate/apply |
| `server/lib/selections-to-zones.js` | Propagate `isRepeatable` and `unique` from selections to zones |
| `server/lib/html-recipe-builder.js` | Partition unique/non-unique zones; emit shared + instance sub-sections; include block zone example HTML |
| `server/lib/html-patcher.js` | Read `shared` + `instances` from `data.slides[key]`; fill unique per clone, stamp non-unique across all clones |
| `server/__tests__/html-recipe-builder.test.js` | New unique/non-unique recipe and validation test cases |
| `server/__tests__/html-patcher.test.js` | New unique/non-unique patching test cases |
| `server/__tests__/html-flow.test.js` | New API contract tests |
| `e2e/html-flow.spec.js` | UC-RS-01 through UC-RS-23 |
