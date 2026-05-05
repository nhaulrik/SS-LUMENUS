# Initiative Slide — Zone Refactor Plan

## Problem Summary

The current pipeline produces three coarse zones per slide: `auto_div_header`, `auto_div_body`,
`auto_div_slide_footer`. The body zone covers the entire right-hand panel including scroll wrappers.
The AI regenerates all of it, inevitably breaking structural HTML (scroll containers, filter
buttons, JS-wired IDs). More features = more card HTML = more tokens = more breakage.

---

## Goal

> The AI generates and returns as little as possible. Structure, styling, and interactivity are
> never touched by the AI. Only data values change between slides.

**Target AI output per initiative slide:**

| Zone | What the AI generates | Approx tokens |
|---|---|---|
| `auto_div_header` | ~6 HTML field values inside fixed elements | ~200 |
| `auto_div_strategic` | 3 reason titles + 3 reason texts | ~150 |
| `auto_json_features` | A JSON array of feature data rows | ~100 × N features |

The AI never generates card markup, wrappers, filter chips, scrollbars, or any structural HTML.

---

## Changes Required

### 1. Fix Zone Auto-Discovery — `server/lib/zones/selections-to-zones.js`

**Current behaviour:** `autoDiscoverZonesForFullSlide` walks the element tree and registers every
interesting non-leaf node. For a typical slide this yields the coarsest structural divs
(`div.header`, `div.body`, `div.slide-footer`).

**New behaviour:** Before walking the tree, scan the parsed template HTML for all elements that
carry a `data-block` attribute. Register those directly as zones (with their `innerHTML` as
`exampleHtml`). Only fall back to tree-walking if no `data-block` elements are found.

**Why this is safe:** Template authors already mark exactly which zones they want filled by adding
`data-block="key"` to the right elements. Auto-discovery should respect that intent rather than
override it with coarse structural guesses.

**Affected function:** `autoDiscoverZonesForFullSlide`  
Add a `templateHtml` parameter. If present, parse it with `node-html-parser`, query all
`[data-block]` elements, and build one selection per element. Skip the tree walk entirely for that
slide.

---

### 2. Add JSON Features Zone — `templates/Initiative/initiative_template_v5.html`

Replace the hardcoded `featureData` JS array with a `<script type="application/json">` element
that the patcher fills, and the existing JS reads from.

**Before (current):**
```html
<script>
  var featureData = [["IRM-xxx", "1,200", ...], ...];  // hardcoded, AI cannot target this
```

**After:**
```html
<!-- Patcher fills this; JS reads from it -->
<script type="application/json" id="featureDataSource" data-block="auto_json_features">
[
  ["IRM-41016","1,200","Hexagonal Architecture Refactor","Restructure revenue-management...",
   "#4A90D9","#2a70b8","In Design","req-grc","GRC",100]
]
</script>

<script>
  var featureData = JSON.parse(
    document.getElementById('featureDataSource').textContent || '[]'
  );
```

The existing card-rendering loop and guard logic remain unchanged. The `#featureGrid` still has
the 3 static example cards as `exampleHtml` for zone preview in the UI, but the AI no longer
fills that zone — it fills `auto_json_features` instead.

**Remove** `data-block="auto_div_feature_grid"` from `#featureGrid` since the AI no longer
generates card HTML.

---

### 3. Update the Slicer Output Template — `server/templates/slice-output/initiative.txt`

The `auto_json_features` zone expects a JSON array, not HTML. The slicer must output feature
data in the exact array format the JS expects.

Replace the current `{{#EACH_FEATURE}} ... {{/EACH_FEATURE}}` HTML-oriented block with a
**JSON array block** that maps each feature to a 10-element array:

```
[irm, effort, name, description, dotColor, textColor, statusLabel, reqClass, reqLabel, barPct]
```

Example output from slicer:
```json
[
  ["IRM-41016","1,200","Hexagonal Architecture Refactor","Restructure ...","#4A90D9","#2a70b8","In Design","req-grc","GRC",100],
  ["IRM-29268","2,240","POC/Fixed effort - Config Items","Enable delivery ...","#F0A500","#b07800","Waiting Analysis Approval","req-other","Other",100]
]
```

All existing extraction rules (STATUS COLOR RULE, REQUESTER CLASS RULE, BAR PERCENTAGE RULE)
remain unchanged — they now map to array positions instead of HTML attributes.

---

### 4. Update Instance Prompt Builder — `server/lib/ai/agentic-prompts.js`

**Current:** `buildInstancePrompt` treats every zone as an HTML zone — shows `exampleHtml` and
instructs the AI to replicate element types, class names, and nesting.

**New:** Detect JSON zones by key suffix `_json_` (or a new `type: "json"` field on the zone).
For JSON zones, show the array schema and field mapping instead of an HTML template instruction.

```
ZONE: auto_json_features
OUTPUT: A JSON array — one row per feature, sorted by Estimate descending.
Row format: [irm, effort, name, description, dotColor, textColor, statusText, reqClass, reqLabel, barPct]
See initiative.txt for colour and percentage rules.
Do NOT output HTML. Do NOT wrap in markdown fences.
```

The patcher's `set_content()` call already works for JSON — it sets the `textContent` of the
`<script type="application/json">` element to whatever string the AI returns.

---

## File Change Summary

| File | Change |
|---|---|
| `server/lib/zones/selections-to-zones.js` | `autoDiscoverZonesForFullSlide`: scan `data-block` attrs first, skip tree walk if found |
| `templates/Initiative/initiative_template_v5.html` | Add `<script type="application/json" data-block="auto_json_features">`, update JS to read from it, remove `data-block` from `#featureGrid` |
| `server/templates/slice-output/initiative.txt` | Replace HTML feature block with JSON array output format |
| `server/lib/ai/agentic-prompts.js` | Detect JSON zones, emit array schema prompt instead of HTML template prompt |
| `server/projects/v3/flows/flow-28-non-func/flow.json` | Re-run auto-discovery after above changes (or manually replace `auto_div_body` with `auto_div_strategic` + `auto_json_features`) |

---

## What Stays Unchanged

- `server/lib/html/html-patcher.js` — no changes needed; `set_content()` already handles plain text/JSON
- All CSS in the template
- Card rendering JS (loop + guard)
- Filter chip JS
- Scroll fade JS
- The `auto_div_header` and `auto_div_strategic` zones and their HTML approach — these are
  fixed-size and the AI handles them well

---

## Migration for Existing Flows

Any flow using the old `auto_div_body` zone will continue to work (patcher will try nodeId
fallback, find `div.body`, fill it). The fix only applies when zones are re-discovered or a new
flow is created. For the `flow-28-non-func` flow specifically, replace the `auto_div_body` entry
in `flow.json` with `auto_div_strategic` + `auto_json_features` after the template is updated.
