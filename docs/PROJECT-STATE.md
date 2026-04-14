# Project State

**Branch**: html-flow  
**Date**: 2026-04-14  
**Base commit**: 594dc25 (Robust PPTX chart cloning)

---

## What Has Been Built

### PPTX Native Flow (pre-existing, on `master`)
The original flow. Users upload a `.pptx` template, tag elements, generate a recipe, fill JSON, preview, and apply patches in a chain. Fully functional. Key capabilities:
- Tag elements with keys, hints, AI toggle, max-char constraints
- Repeatable slides (one slide → N clones per data instance)
- Propagation (sync a key across multiple slides: non-unique or unique mode)
- Patch chains: each apply creates a versioned round, downloadable, restorable, renameable
- Patch persistence across page reloads
- Preview panel in the Tag step showing current output

### Visual Flow — Stage 1 (on `html-flow` branch, partially committed)

**Committed (2 commits on html-flow):**
- Flow selector entry screen routing users to PowerPoint Native or Visual
- HTML upload: `data-zone` parsing, type inference, validation, zone review UI
- Zone review: editable IDs, type select, AI toggle, hint editor, remove
- Slide preview: half-page iframe with `ResizeObserver` scaling
- Bidirectional highlight: hover row → preview (injected CSS); hover preview → row (`postMessage`)
- `POST /api/html-flow/upload-template`, `PATCH /api/html-flow/update-zones`, `POST /api/html-flow/create-project`
- HTML editor: CodeMirror 6 split-pane, live preview, Reset/Apply, zone-aware cursor sync
- `mergeZoneEdits` utility for preserving user edits across Apply cycles
- 59 + 16 e2e tests for upload flow and editor

**Uncommitted (working tree — NOT yet committed, pending review):**

| File | Change |
|---|---|
| `server/routes/html-flow.js` | Added `data-label-for` parsing; fixed hint encoding (en-dash corruption) |
| `client/src/components/HtmlEditorPanel.jsx` | Zone Assignment Modal; `injectAttributeIntoSource`; `dispatchRef` StrictMode-safe message handler; `handleModalClose`/`handleModalConfirm`; removed stale `Compartment` import |
| `client/src/steps/HtmlUploadStep.jsx` | Label sub-zone rendering (indented under parent); `isLabel` badge; AI fix prompt in validation panel; `buildFixPrompt` / `handleCopyPrompt` |
| `client/src/index.css` | Zone Assignment Modal CSS; label child row CSS; violations panel CSS (enhanced); AI prompt section CSS |
| `e2e/click-to-zone.spec.js` | New — 20 tests for Zone Assignment Modal (untracked) |
| `input/test_slide_v2.html` | Untracked scratch file — can be deleted |

---

## Test Status

### Unit tests (`npx vitest run`)
**120 passing, 6 failing (all pre-existing, none introduced by html-flow work)**

| Test | Status | Root cause |
|---|---|---|
| `chart-copy > original template has exactly one chart` | FAIL (pre-existing) | `product_catalog.pptx` not present in CI fixture path |
| `chart-copy > each cloned slide gets its own unique chart file` | FAIL (pre-existing) | Same — depends on `product_catalog.pptx` |
| `pptx-utils > parses a basic text element with correct bounds` | FAIL (pre-existing) | Bounds calculation logic mismatch |
| `pptx-utils > resolves preset background color` | FAIL (pre-existing) | Preset colour resolver not implemented |
| `pptx-utils > includes [AI] marker only for autoGenerate tags` | FAIL (pre-existing) | buildRecipe format changed, test not updated |
| `pptx-utils > numbers the REPEATABLE SLIDES section correctly` | FAIL (pre-existing) | Same |

### E2E tests (`npx playwright test`)
**103 passing, 3 failing**

| Test | Status | Root cause |
|---|---|---|
| `UC-CZ-03 > the HTML source contains the new data-zone attribute` | FAIL | CodeMirror virtualises long documents; `cmContent` DOM doesn't contain text far down the file. Fix: assert via `iframe.srcdoc` instead — partially done but assertion still uses `cmContent`. |
| `UC-HF-20/21 > file with no <section> shows NO_SECTIONS error` | FAIL | Validation error panel was redesigned (new CSS classes). The test looks for `.html-violations` but the new structure uses `.html-violations-list` inside the panel. Selector needs updating. |
| `UC-HF-20/21 > file with no data-zone shows NO_ZONES error` | FAIL | Same cause as above. |

---

## Known Issues

### Issue 1 — UC-CZ-03 e2e test uses wrong assertion for CodeMirror content
**File**: `e2e/click-to-zone.spec.js:153`  
**Symptom**: Test asserts `cmContent` contains `business_value_header` but CodeMirror virtualises the document — the DOM only renders visible lines and the injected attribute is far down the file.  
**Fix needed**: Change assertion to check `iframe[srcdoc]` attribute (which contains the full `draftHtml`) instead of `.cm-content` text. The `srcDoc` is already updated from `draftHtml` after injection.  
**Effort**: 2 lines.

### Issue 2 — UC-HF-20/21 validation error tests use stale selectors
**File**: `e2e/html-flow.spec.js:362`, `e2e/html-flow.spec.js:380`  
**Symptom**: Tests look for `.html-violations` containing text, but the violations panel was redesigned to use `.html-violations-list` with individual `.html-violation-item` elements.  
**Fix needed**: Update selectors in `html-flow.spec.js` to match the new panel structure. The test should look for `.html-violations` (the wrapper still exists) but the text is now inside `.html-violation-message` spans.  
**Effort**: 2 lines per test.

### Issue 3 — `injectAttributeIntoSource` may produce ambiguous result for elements with shared class + text
**File**: `client/src/components/HtmlEditorPanel.jsx`  
**Symptom**: If two elements have the same tag, class, and text content (e.g. two `<div class="value-col-title">Business Value</div>`), the function returns `{ ambiguous: true }` and shows a warning. The user must edit the HTML directly to disambiguate.  
**Current behaviour**: Correct — the ambiguous warning is shown and no injection is attempted.  
**Potential improvement**: Add a `data-zone-id` fingerprint attribute during parsing so each element has a unique identifier the injection can target. Deferred.

### Issue 4 — React StrictMode double-invoke of `useEffect` message handler
**File**: `client/src/components/HtmlEditorPanel.jsx`  
**Symptom**: In development (StrictMode), `useEffect([], [])` runs twice. The `dispatchRef` pattern was introduced to work around this: a stable wrapper function always delegates to `dispatchRef.current`. This is correct and working in production. However, the test suite uses the dev server (StrictMode active) and must use `new MessageEvent(...)` + `window.dispatchEvent(...)` rather than `window.postMessage(...)` to trigger the handler synchronously within `page.evaluate`.  
**Current behaviour**: Tests work correctly with `dispatchEvent`. No action needed.

### Issue 5 — `input/test_slide_v2.html` untracked scratch file
**File**: `input/test_slide_v2.html`  
**Action**: Delete before committing.

### Issue 6 — 6 pre-existing unit test failures on `pptx-utils` and `chart-copy`
These have existed since before the `html-flow` branch was created. They are not regressions. The `chart-copy` failures require `product_catalog.pptx` to be present in a specific path. The `pptx-utils` failures are due to unimplemented features (preset colour resolver, bounds calculation) and stale recipe format tests. They should be fixed in a dedicated cleanup pass, not as part of the Visual Flow work.

---

## Uncommitted Work — What to Do Before Merging

The following items are in the working tree but not committed. They need to be reviewed, then committed or discarded:

1. **Review `client/src/components/HtmlEditorPanel.jsx`** — the largest change. Contains the Zone Assignment Modal, `injectAttributeIntoSource`, `handleModalClose`, `handleModalConfirm`, and the `dispatchRef` StrictMode-safe message handler. All functional. The `Compartment` import from `@codemirror/state` was removed (it was imported but unused).

2. **Review `client/src/steps/HtmlUploadStep.jsx`** — label sub-zone rendering, `isLabel` badge, AI fix prompt in the validation panel.

3. **Review `server/routes/html-flow.js`** — `data-label-for` parsing, hint encoding fix (en-dash → hyphen).

4. **Review `client/src/index.css`** — Zone Assignment Modal CSS, label child row indentation, redesigned violations panel.

5. **Fix the 3 failing e2e tests** (Issues 1 and 2 above — ~6 lines total) before committing.

6. **Delete `input/test_slide_v2.html`** — scratch file.

7. **Commit as a single commit** with message: `Add click-to-zone modal, data-label-for support, and AI fix prompt for Visual Flow Stage 1`.

---

## What Comes Next — Stage 2

Once the working tree is committed, the next development milestone is Stage 2: Recipe and Content Generation for the Visual Flow.

### What needs to be built

**Server:**
- `POST /api/html-flow/:chainId/generate-recipe` — takes the zone list, builds a recipe prompt (same structure as PPTX flow), returns it to the client
- `POST /api/html-flow/:chainId/validate-json` — validates user-provided JSON against the zone list (same validator as PPTX flow)

**Client:**
- A `HtmlRecipeStep` component (or reuse `RecipeStep` with zone-aware adaptations):
  - Shows the generated recipe prompt
  - Accepts JSON input
  - Validates in real time
  - "Preview & Apply" button
- Route from the project-created confirmation screen into this step (currently it dead-ends)

**Content injection (`HtmlPatchStep`):**
- Takes the validated JSON and the `template.html`
- Replaces `[data-zone="key"]` element inner content with `json[key]`
- Replaces `[data-label-for="key"]` element inner content with `json[key + "__label"]`
- Clones repeatable blocks per data instance
- Renders the result as a scrollable multi-slide preview

### Reuse opportunities
- `buildRecipe` in `server/lib/pptx-utils.js` — the recipe builder already works from a tag/zone list. Wire it to zones instead of PPTX tags.
- `validateJsonData` in `server/lib/pptx-utils.js` — already validates JSON against a tag list.
- `RecipeStep.jsx` — can be adapted or reused with minor changes (it already handles recipe display and JSON input).

### Key decision before starting Stage 2
The JSON structure for label zones: should `business_value__label` be a flat top-level key, or nested as `{ business_value: { label: "...", content: "..." } }`? The flat key approach is simpler and consistent with the PPTX flow. Recommend flat keys.

---

## Architecture Notes for Future Developers

### The `dispatchRef` pattern (HtmlEditorPanel)
React StrictMode double-invokes `useEffect`. If you register a `window.addEventListener` inside `useEffect(fn, [])`, the cleanup removes the listener and the second invocation registers a new one. If a `MessageEvent` fires during the gap, it is missed.

The fix used here: store the handler in `dispatchRef.current` (updated on every render via assignment, not `useEffect`). The `useEffect` registers a stable wrapper `(e) => dispatchRef.current?.(e)`. The wrapper is always active; the actual logic always reads the latest version from the ref. This is the standard React pattern for event handlers that need access to current state without re-registering.

### The `mergeZoneEdits` function
When the user applies HTML edits (via the editor's Apply button), the server re-parses zones from the new HTML. Zone keys in the new parse may differ from what the user renamed them to in the UI. `mergeZoneEdits` resolves this by matching on `htmlKey` (the original `data-zone` value from the HTML) rather than `key` (the user-facing name). When uploading a file, always stamp `htmlKey: z.key` on each zone so the merge works on the first Apply.

### `injectAttributeIntoSource`
Finds an element in the HTML string by (tag + class + textContent) fingerprint. Returns `null` if not found, `{ ambiguous, count }` if multiple matches, or `{ newHtml, from, to }` on success. The text check uses only the first 20 chars of `textContent` to handle truncation. If the element text is not unique within its class, the function returns ambiguous and the user must edit HTML directly.

### CodeMirror and virtualisation
CodeMirror 6 virtualises long documents — the `.cm-content` DOM element only renders visible lines. Do not assert on `.cm-content` text for content that is far down the document. Instead, assert on `draftHtml` state (accessible via the preview iframe's `srcdoc` attribute, which is always updated from `draftHtml`).
