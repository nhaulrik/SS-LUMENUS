# Spec: Dual-Flow Architecture — Visual HTML Flow

**Status**: Draft
**Author**: nch
**Date**: 2026-04-13

---

## Problem

The existing PPTX-based flow is constrained by the fragility of the PPTX format. Templates produced by PowerPoint carry complex internal state — chart tracking references, shape GUIDs, notes slide relationships, layout inheritance — that breaks when manipulated programmatically. The result is a tight coupling between template quality and system reliability: a poorly structured or complex template can make the entire patching pipeline fail in ways that are difficult to diagnose and fix.

Beyond reliability, the PPTX format is a poor medium for AI-assisted design. AI models generate visually coherent HTML/CSS in one shot; generating valid, renderable PPTX XML requires deep format knowledge and produces fragile output. The design ceiling of the PPTX flow is therefore low: the system can populate content into an existing template but cannot help users create a great-looking template in the first place.

There is also no way for users to preview output before downloading. The round-trip of generate → download → open → inspect → adjust is slow and opaque.

---

## Goal

Introduce a second flow — the **Visual Flow** — that uses HTML as the authoring and rendering format. The Visual Flow allows users to upload an HTML file as their slide template, have the AI generate content for it, preview the result live in the browser, and export to PDF (primary) or PPTX (best-effort secondary).

The existing PPTX-based flow becomes the **PowerPoint Native Flow** and is unchanged. Users choose which flow to use when starting a new project. The choice is permanent for that project.

Both flows share the AI content generation engine: the recipe builder, the AI call, and the JSON validation layer are the same system, fed different input representations.

---

## Concepts

### Flow

A **Flow** determines how a project's template is defined, how content is patched into it, and how the output is delivered. There are two flows:

- **PowerPoint Native** — template is a `.pptx` file, output is a `.pptx` file
- **Visual** — template is an `.html` file, output is PDF or best-effort PPTX

The flow is selected once at project creation and stored on the project. It cannot be changed after creation.

### Zone

A **Zone** is the Visual Flow equivalent of a tag. It is a named region in the HTML template that will receive AI-generated or user-provided content. Zones are identified by `data-zone` attributes on HTML elements.

A zone has:
- A **key** — the unique identifier used in the recipe and JSON
- A **type** — `text`, `number`, `chart`, `image`, or `repeatable`
- A **hint** — a human-readable description of what content belongs here (derived from surrounding context or set explicitly)
- An **autoGenerate** flag — whether the AI should generate this value or the user provides it manually

### Repeatable Block

A **Repeatable Block** is a zone of type `repeatable`. It is an HTML element marked with `data-zone="..."` and `data-repeatable="true"`. The system clones this element once per data instance returned by the AI, filling each clone with the instance's field values. This is the Visual Flow equivalent of a repeatable slide.

### Slide

In the Visual Flow, a **Slide** is a top-level `section` element within the HTML template. Each `section` represents one slide in the output. The system renders each section at 1280×720px (16:9) for preview and export.

Slides can be static (rendered once) or contain a repeatable block (rendered once per data instance, producing multiple output slides from a single template section).

### Template

The **Template** is the user-uploaded `.html` file. It defines the visual structure of all slides. The system does not modify the template itself — it is the source of truth for layout, typography, and visual design. Content is injected into zones at patch time, producing a separate rendered output.

---

## Flow Selector

### Entry Point

When a user starts a new project (currently: uploads a file), they first see a **Flow Selector** screen with two options:

---

**PowerPoint Native**

> Start from your existing PowerPoint template. Output is a fully editable `.pptx` file.

Best for: enterprise delivery, client handoffs, teams that work in PowerPoint daily.

→ Proceeds to the existing PPTX upload screen. No change to the current flow.

---

**Visual**

> Upload an HTML file you have designed. Output is a beautiful, presentation-ready PDF.

Best for: polished decks, screen presentations, design-first workflows, when visual quality matters most.

→ Proceeds to the Visual Flow: Stage 1 (HTML upload).

---

The selector is the first screen of the app. It is not a settings page — it is the starting gate. The user cannot reach either flow without passing through it.

The current PPTX upload screen becomes the first screen of the PowerPoint Native flow, reached only after selecting that option.

---

## Visual Flow — Stage 1: HTML Upload and Validation

### What the user does

The user uploads an `.html` file. This is their slide template — a complete, self-contained HTML document they have designed or obtained. The system does not provide presets or AI generation of the template in Stage 1. The user is responsible for the template design.

The file must be self-contained: all CSS must be inline or in `<style>` tags within the file. External stylesheet links and external image URLs are supported but not required. No JavaScript is executed.

### What the system does

**Step 1 — Parse the HTML file**

The server receives the uploaded file and parses it to extract:

- The number of `<section>` elements (one per slide)
- All elements carrying a `data-zone` attribute
- All elements carrying `data-repeatable="true"`
- The text content of each zone element (used as the hint)
- The inferred type of each zone (see Zone Type Inference below)

**Step 2 — Zone type inference**

The system infers zone type from context when not explicitly declared:

| Signal | Inferred type |
|---|---|
| `data-type="chart"` attribute present | `chart` |
| `data-type="image"` attribute present | `image` |
| `data-type="number"` attribute present | `number` |
| `data-repeatable="true"` attribute present | `repeatable` |
| Element is `<canvas>` or contains `<svg>` | `chart` |
| Element is `<img>` | `image` |
| Element text matches a numeric pattern | `number` |
| All other cases | `text` |

Explicit `data-type` always overrides inference.

**Step 3 — Validation**

The system validates the uploaded file against the following rules. Validation failures are shown to the user with clear error messages; the user must fix and re-upload.

| Rule | Error message |
|---|---|
| File must be valid HTML (parseable) | "The file could not be parsed as HTML. Check for unclosed tags or malformed markup." |
| File must contain at least one `<section>` element | "No slides found. Wrap each slide in a `<section>` element." |
| File must contain at least one `data-zone` attribute | "No content zones found. Add `data-zone=\"your-key\"` to elements that should receive content." |
| All `data-zone` values must be unique within a section | "Duplicate zone key '{key}' found in slide {n}. Zone keys must be unique within a slide." |
| A repeatable block must contain at least one non-repeatable zone | "Repeatable block '{key}' contains no content zones. Add `data-zone` attributes inside it." |
| File size must not exceed 5MB | "File is too large. Maximum size is 5MB." |

**Step 4 — Zone list display**

After successful validation, the system displays:

- A live preview of the first slide, rendered in an iframe at 1280×720px
- A list of all detected zones, grouped by slide, showing key, inferred type, and hint text
- A count: "{n} slides, {m} zones detected"

The user reviews the zone list and can:

- Edit the hint text for any zone
- Override the inferred type for any zone
- Mark a zone as `autoGenerate: false` (user will provide the value manually)
- Remove a zone from the list (the element remains in the HTML but is excluded from the recipe)

The user cannot add zones through the UI — zones must exist in the HTML file. If a zone is missing, the user must edit their HTML file and re-upload.

**Step 5 — Proceed**

When the user is satisfied with the zone list, they proceed to Stage 2 (Recipe and Content Generation), which is the existing recipe/AI flow adapted to zones instead of PPTX tags.

---

## Visual Flow — Stages 2 onwards (summary)

These stages are not fully specified here. They follow the same structure as the existing PPTX flow with zones substituted for tags. A separate spec will cover them in detail.

**Stage 2 — Recipe and content generation**
The recipe builder generates a prompt from the zone list. The AI returns a JSON object with values for each zone key. The user reviews and edits the JSON.

**Stage 3 — Patching and preview**
The system injects the JSON values into the HTML template zones. Repeatable blocks are cloned once per data instance. The result is rendered live in the browser as a scrollable multi-slide deck. The user can edit inline, reorder slides, and regenerate individual zones.

**Stage 4 — Export**
The user exports to PDF (primary, via headless browser rendering) or PPTX (secondary, best-effort via the HTML-to-PPTX compiler). Browser presentation mode is also available.

---

## HTML Template Authoring Guide

This section specifies what a valid Visual Flow HTML template looks like. It is intended for users authoring templates and for AI agents generating them.

### Document structure

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <style>
    /* All CSS here. No external stylesheets. */
    section {
      width: 1280px;
      height: 720px;
      position: relative;
      overflow: hidden;
    }
  </style>
</head>
<body>
  <section> <!-- Slide 1 --> </section>
  <section> <!-- Slide 2 --> </section>
  <!-- One <section> per slide -->
</body>
</html>
```

### Zone attributes

| Attribute | Required | Values | Description |
|---|---|---|---|
| `data-zone` | Yes | Any unique string | The zone key. Used in the recipe and JSON. |
| `data-type` | No | `text`, `number`, `chart`, `image`, `repeatable` | Overrides type inference. |
| `data-repeatable` | No | `"true"` | Marks this element as a repeatable block. |
| `data-hint` | No | Any string | Overrides the hint shown in the zone list and recipe. |
| `data-auto` | No | `"false"` | Excludes this zone from AI generation. User provides value manually. |

### Minimal example

```html
<section>
  <!-- Static slide: one title, one body -->
  <h1 data-zone="title" data-hint="Presentation title">Your Title Here</h1>
  <p data-zone="subtitle" data-hint="One-sentence summary">Subtitle goes here</p>
</section>

<section>
  <!-- Repeatable slide: cloned once per initiative -->
  <div data-zone="initiative_block" data-repeatable="true">
    <h2 data-zone="initiative_name" data-hint="Name of the initiative">Initiative Name</h2>
    <p data-zone="initiative_summary" data-hint="Two-sentence summary">Summary here</p>
    <span data-zone="effort_hours" data-type="number" data-hint="Estimated hours">0</span>
  </div>
</section>
```

### Supported CSS for export

The following CSS properties are supported in the PDF and best-effort PPTX export. Properties outside this list are rendered in the browser preview but may not translate to PPTX.

- Layout: `position`, `top`, `left`, `width`, `height`, `margin`, `padding`, `display`, `flex`, `grid`
- Typography: `font-family`, `font-size`, `font-weight`, `font-style`, `color`, `text-align`, `line-height`, `letter-spacing`
- Background: `background-color`, `background-image` (data URIs and same-origin URLs)
- Border: `border`, `border-radius`
- Opacity: `opacity`
- Transform: `transform` (translate, rotate, scale — PDF only, not PPTX)

---

## Data Model

### Project object additions

```
flow: "pptx" | "html"
```

When `flow` is `"html"`, the project additionally stores:

```
templateHtml: string          — the raw uploaded HTML file content
templateFileName: string      — original filename
zones: Zone[]                 — parsed zone definitions
patches: HtmlPatch[]          — array of applied patch rounds
renderedHtml: string | null   — current patched HTML (cached, derived)
```

### Zone object

```
key: string                   — unique identifier (from data-zone attribute)
slideIndex: number            — which <section> this zone belongs to (1-indexed)
type: "text" | "number" | "chart" | "image" | "repeatable"
hint: string                  — description shown in recipe and UI
autoGenerate: boolean         — whether AI generates this value
isRepeatable: boolean         — true if this zone is inside a repeatable block
repeatableKey: string | null  — key of the parent repeatable block, if any
originalText: string          — text content of the element in the original HTML
```

### HtmlPatch object

```
id: string
name: string
appliedAt: string             — ISO timestamp
jsonData: object              — the JSON applied in this patch round
outputHtml: string            — the rendered HTML after this patch
exportedPdfPath: string | null
exportedPptxPath: string | null
```

---

## API Endpoints (Stage 1)

### POST /api/html-flow/upload-template

Accepts a multipart form upload with field `template` (the `.html` file).

**Response (success)**
```json
{
  "templateId": "...",
  "slideCount": 3,
  "zones": [
    {
      "key": "title",
      "slideIndex": 1,
      "type": "text",
      "hint": "Your Title Here",
      "autoGenerate": true,
      "isRepeatable": false,
      "repeatableKey": null,
      "originalText": "Your Title Here"
    }
  ],
  "previewHtml": "..."
}
```

The `previewHtml` field is the first slide's section element, extracted and wrapped in a minimal HTML document for iframe rendering.

**Response (validation failure)**
```json
{
  "error": "VALIDATION_FAILED",
  "violations": [
    { "rule": "NO_SECTIONS", "message": "No slides found. Wrap each slide in a <section> element." }
  ]
}
```

### PATCH /api/html-flow/update-zones

Accepts the user's edits to the zone list (hint overrides, type overrides, autoGenerate flags, removed zones).

**Request body**
```json
{
  "templateId": "...",
  "zones": [ /* updated Zone objects */ ]
}
```

**Response**
```json
{ "ok": true, "zones": [ /* confirmed zone list */ ] }
```

### POST /api/html-flow/create-project

Creates a project in the HTML flow using the confirmed template and zone list.

**Request body**
```json
{
  "templateId": "...",
  "zones": [ /* confirmed zone list */ ],
  "projectName": "..."
}
```

**Response**
```json
{ "projectId": "...", "chainId": "..." }
```

After this call the project enters Stage 2 (recipe generation), which reuses the existing `/api/generate-recipe` endpoint with zones substituted for tags.

---

## Out of Scope for Stage 1

The following are explicitly deferred to later stages and must not be built as part of Stage 1:

- AI generation of the HTML template
- Preset template gallery
- Inline editing of slide content in the preview
- Slide reordering
- PDF export
- PPTX export
- Per-zone regeneration
- The HTML-to-PPTX compiler

Stage 1 ends when the user has uploaded a valid HTML template, reviewed and confirmed the zone list, and created a project. Everything after that is Stage 2 onwards.

---

## Open Questions

1. **Template storage** — should the raw HTML template be stored in the database or on the filesystem alongside the chain directory? The chain directory approach is consistent with how PPTX templates are stored today.

2. **External assets** — if the HTML references external image URLs (CDN, etc.), should the server fetch and inline them at upload time to ensure the template is fully self-contained? This avoids broken previews if the external URL goes away.

3. **Zone key naming** — should zone keys be auto-sanitised to snake_case (matching the PPTX tag convention) or preserved exactly as the user wrote them in the HTML? Sanitising is more consistent but may surprise users who wrote `data-zone="initiativeName"`.

4. **Multi-section repeatable** — the current design allows one repeatable block per section. Should a section be allowed to contain multiple independent repeatable blocks (e.g., a slide with two separate lists)? This adds complexity to the cloning logic.

5. **Preview fidelity** — the iframe preview renders the HTML using the browser's own engine, which will match the PDF export closely. Should we warn users that PPTX export fidelity may differ significantly from what they see in the preview?
