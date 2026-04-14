# Spec: Dual-Flow Architecture — Visual HTML Flow

**Status**: In Progress — Stage 1 implemented, Stages 2–4 pending  
**Author**: nch  
**Last Updated**: 2026-04-14

---

## Problem

The PPTX-based flow is constrained by the fragility of the PPTX format. Templates carry complex internal state (chart tracking GUIDs, shape IDs, notes slide relationships) that breaks under programmatic manipulation. The design ceiling is low and there is no live preview.

---

## Goal

A second flow — the **Visual Flow** — uses HTML as the authoring and rendering format. Users upload an HTML file, define content zones visually, have AI generate content, preview live in-browser, and export to PDF (primary) or PPTX (best-effort). The PPTX flow is unchanged. Both flows share the AI content generation engine.

---

## Concepts

### Flow
Permanent per project. Two options:
- **PowerPoint Native** — `.pptx` template → editable `.pptx` output
- **Visual** — `.html` template → PDF output (PPTX best-effort)

### Zone
A named region in the HTML template that receives AI-generated content. Identified by `data-zone="key"`.

| Field | Description |
|---|---|
| `key` | Unique snake_case identifier, user-editable in the UI |
| `htmlKey` | Original `data-zone` value before any user rename — used by `mergeZoneEdits` |
| `type` | `text` / `number` / `chart` / `image` / `repeatable` |
| `hint` | Description shown to AI (from `data-hint` attr or element text) |
| `autoGenerate` | Whether AI fills this zone |
| `isLabel` | True if this is a `data-label-for` label sub-zone |
| `labelFor` | Key of the parent zone this labels |

### Label Zone
Element marked `data-label-for="zone_key"`. Paired with its parent in the UI. Generates `zone_key__label` in the AI JSON output so section headers like "Business Value" can be AI-driven alongside the content they label.

### Repeatable Block
Zone with `data-repeatable="true"`. Cloned once per data instance to produce multiple output slides from a single template section.

### Slide
A top-level `<section>` element. Each section = one slide, rendered at 1280×720px.

---

## HTML Template Authoring Contract

### Required structure
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <style>
    section { width: 1280px; height: 720px; position: relative; overflow: hidden; }
    /* All CSS inline — no external stylesheets required */
  </style>
</head>
<body>
  <section><!-- one per slide --></section>
</body>
</html>
```

### Zone attributes

| Attribute | Required | Description |
|---|---|---|
| `data-zone="key"` | Yes | Content zone. Key unique per slide, snake_case. |
| `data-label-for="key"` | No | Label sub-zone for the named zone. Generates `key__label` in JSON. |
| `data-type="number"` | No | Overrides type inference. |
| `data-hint="..."` | No | Overrides AI hint (otherwise derived from element text). |
| `data-repeatable="true"` | No | Marks this element as a repeatable block. |
| `data-auto="false"` | No | Excludes this zone from AI generation. |

### Type inference (when `data-type` absent)
- `canvas` / contains `svg` → `chart`
- `img` → `image`
- `data-repeatable="true"` → `repeatable`
- Text matches `/^\d[\d,.\s%$€£]*$/` → `number`
- All other cases → `text`

### Validation rules

| Rule | Condition |
|---|---|
| `NO_SECTIONS` | No `<section>` element found |
| `NO_ZONES` | No `data-zone` attributes found |
| `DUPLICATE_ZONE_KEY` | Same key appears twice within one slide |
| `EMPTY_REPEATABLE` | Repeatable block contains no child zones |
| `FILE_TOO_LARGE` | File exceeds 5MB |

### Reference template
`input/test_slide.html` — a fully annotated slide with all eight zones correctly attributed. Use as an authoring guide.

---

## Flow Selector

Entry point for all new projects. Two cards route to the correct flow. Choice is permanent per project.

---

## Stage 1 — Template Upload, Zone Review, HTML Editor

**Status: Implemented (1 failing e2e test, 2 pre-existing e2e failures — see Known Issues)**

### 1a. Upload
User uploads `.html`. Server parses with `node-html-parser`, extracts `[data-zone]` and `[data-label-for]` elements, infers types, validates. Returns `templateId`, `slideCount`, `zones[]`, `previewHtml` (first slide for iframe).

### 1b. Zone Review
Zone list grouped by slide. Each row:
- Editable key badge (click → inline input, sanitised to snake_case)
- Slide index badge
- Type `<select>`
- AI toggle checkbox
- Expand button → hint input + original text
- Remove button

Label sub-zones render indented under their parent with a blue `label` tag badge.

**Slide preview:** 16:9 iframe, half page width, scaled via `ResizeObserver`. Bidirectional hover highlight:
- Hover zone row → green glow on matching element in preview (injected CSS via `srcDoc`)
- Hover element in preview → highlights matching zone row (via `postMessage`)

### 1c. HTML Editor (opt-in)
Opened via "✎ Edit HTML" button. Full-screen split-pane overlay.

**Left — CodeMirror 6:**
- HTML + embedded CSS syntax highlighting (app dark theme)
- Line numbers, fold gutter, bracket matching, undo/redo history
- `data-zone` / `data-type` / `data-hint` / `data-repeatable` / `data-auto` autocomplete
- Cursor on `data-zone` line → highlights that element in preview
- Resizable divider (20–80%, drag)

**Right — Live preview:**
- 200ms debounced `srcDoc` update
- Hover → highlights zone row via `postMessage`
- Click any element → Zone Assignment Modal

**Zone Assignment Modal:**
- Triggered by clicking any element (including static, non-zoned elements)
- Clicking an already-zoned element scrolls the editor to that line instead
- Elements with < 2 chars of text are ignored
- Two modes:
  - **Content zone** → injects `data-zone="key"` into the element's opening tag
  - **Label for a zone** → injects `data-label-for="zone_key"`
- Key auto-suggested from element text (snake_case)
- Source injection via `injectAttributeIntoSource`: matches by (tag + class + textContent), patches opening tag
- Ambiguous match (multiple elements with same fingerprint) → shows warning, user must edit HTML directly

**Apply changes:**
- Sends draft HTML to `POST /api/html-flow/upload-template`
- Re-parses zones server-side
- `mergeZoneEdits` (in `client/src/utils/mergeZoneEdits.js`) preserves user key renames, hint edits, type overrides from old zone list → new zones, matched by `htmlKey`
- Returns to zone review with updated zone list

**Reset:** Reverts to `uploadedHtml`, CodeMirror transaction (undoable), no server call.

**Inline validation (500ms debounce):** `NO_SECTIONS`, `NO_ZONES`, `DUPLICATE_KEY` shown as warning pills. Blocking errors disable Apply.

### 1d. Validation Error Panel with AI Fix Prompt
When upload fails validation:
- Structured list of violations with rule codes and human-readable messages
- "Fix with AI" section: copyable prompt instructing an AI assistant to fix the HTML structure while preserving visual design
- One-click clipboard copy with ✓ Copied feedback

### 1e. Project Creation
User fills project name (pre-filled from filename). Server:
1. Creates `server/patch-chains/chain-{uuid}/`
2. Writes `template.html`
3. Writes `chain.json` with `flow: "html"`, zones, metadata

Confirmation screen → "Start a new project" returns to flow selector.

---

## Stage 2 — Recipe and Content Generation

**Status: Not implemented**

Zone list → recipe builder → AI prompt → JSON response → user review/edit.
Label zones generate `zone_key__label` alongside `zone_key` in the JSON.

---

## Stage 3 — Content Patching and Live Preview

**Status: Not implemented**

JSON applied to HTML template. `[data-zone]` elements receive their values. `[data-label-for]` elements receive `__label` values. Repeatable blocks cloned per data instance. Result rendered as scrollable multi-slide deck.

---

## Stage 4 — Export

**Status: Not implemented**

- **PDF (primary):** Puppeteer renders each slide at 1280×720
- **PPTX (secondary, best-effort):** HTML-to-PPTX compiler
- **Present in browser:** Full-screen HTML presentation mode

---

## Data Model

### chain.json (Visual Flow)
```json
{
  "id": "chain-{uuid}",
  "flow": "html",
  "projectName": "string",
  "templateFile": "test_slide.html",
  "templatePath": "/abs/path/to/template.html",
  "slideCount": 1,
  "createdAt": "ISO",
  "updatedAt": "ISO",
  "zones": [],
  "rounds": []
}
```

### Zone object
```json
{
  "key": "business_value",
  "htmlKey": "business_value",
  "slideIndex": 1,
  "type": "text",
  "hint": "3-4 bullet points on business value",
  "autoGenerate": true,
  "isRepeatable": false,
  "repeatableKey": null,
  "isLabel": false,
  "labelFor": null,
  "originalText": "Enables end-to-end...",
  "elementOrder": 6
}
```

---

## API Endpoints

### POST /api/html-flow/upload-template
Body: `{ html: string, fileName: string }`  
Success: `{ ok: true, templateId, slideCount, zones[], previewHtml }`  
Failure: `{ ok: false, error: "VALIDATION_FAILED", violations[] }` (HTTP 422)  
Session stored in memory, 2-hour TTL.

### PATCH /api/html-flow/update-zones
Body: `{ templateId, zones[] }`  
Persists zone edits to in-memory session.

### POST /api/html-flow/create-project
Body: `{ templateId, zones[], projectName }`  
Creates chain directory, writes `template.html` and `chain.json`.  
Returns: `{ ok: true, chainId, projectName, zones[], templatePath }`

---

## Key Files

| File | Purpose |
|---|---|
| `server/routes/html-flow.js` | Stage 1 API. Zone parser, type inference, `data-label-for` parsing, hint encoding sanitisation. |
| `client/src/steps/HtmlUploadStep.jsx` | Upload UI, zone list, label sub-zone rendering, validation panel with AI prompt, editor opt-in. |
| `client/src/components/HtmlEditorPanel.jsx` | CodeMirror editor, live preview, Zone Assignment Modal, `injectAttributeIntoSource`, `dispatchRef` message handler pattern. |
| `client/src/utils/mergeZoneEdits.js` | Smart zone merge — preserves user edits across Apply cycles via `htmlKey` matching. |
| `client/src/steps/FlowSelectStep.jsx` | Flow selector entry screen. |
| `input/test_slide.html` | Reference HTML template with all `data-zone` attributes. Authoring guide. |
| `e2e/html-flow.spec.js` | 59 tests — upload, zone detection, validation, project creation API. |
| `e2e/html-editor.spec.js` | 16 tests — editor open/close, dirty state, Apply, Reset, validation. |
| `e2e/click-to-zone.spec.js` | 20 tests — Zone Assignment Modal, label-for mode, key sanitisation, guard rails. |

---

## Known Issues

See `PROJECT-STATE.md`.

---

## Open Questions

1. **Template storage** — HTML stored on filesystem in chain directory. No database storage.
2. **External assets** — external image URLs not fetched/inlined at upload. Preview breaks if URL goes away.
3. **Zone key naming** — server preserves keys exactly as written. Only the UI key edit input sanitises to snake_case.
4. **Multi-repeatable blocks** — only one repeatable block per section is supported.
5. **Preview fidelity** — no explicit warning that PPTX export will differ from browser preview.
