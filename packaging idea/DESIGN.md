# Slide Packager — Design Document

> Convert a folder of HTML slide files into a single self-contained interactive presentation web app.

---

## 1. Overview

The application outputs a collection of HTML files where each file represents one slide. Slides are organised in a tree: every slide has an optional parent, and a parent can have many children. The goal of this packager is to consume that folder and produce a single `index.html` file that can be opened in any browser — no server, no build tools, no dependencies.

---

## 2. Metadata Convention

Each slide HTML file declares its relationship via `<meta>` tags in the `<head>`:

```html
<meta name="slide-id"     content="architecture-overview">
<meta name="slide-title"  content="Architecture Overview">
<meta name="slide-parent" content="technical-section">
<meta name="slide-order"  content="2">
```

| Field           | Required | Description                                                      |
|-----------------|----------|------------------------------------------------------------------|
| `slide-id`      | Yes      | Unique identifier for this slide. Used for linking and routing.  |
| `slide-title`   | Yes      | Human-readable title shown in navigation.                        |
| `slide-parent`  | No       | The `slide-id` of the parent slide. Omit for root-level slides.  |
| `slide-order`   | No       | Integer controlling sibling sort order. Defaults to file order.  |

Slides with no `slide-parent` are treated as **top-level (deck) slides**.
Slides that reference a parent become **sub-deck slides** under that parent.

---

## 3. Navigation Model: Deck + Sub-Deck

The UI is split into two layers of navigation:

### Primary Deck (top bar)
- Displays all root-level slides as the main navigation strip.
- Clicking a deck slide loads it in the main viewport.
- If the active deck slide has children, the sub-deck bar appears below.

### Sub-Deck (secondary strip)
- Displays the children of the currently active deck slide.
- Clicking a sub-deck slide loads it in the viewport.
- Sub-deck slides can themselves have children, rendered as a further nested strip or collapsible panel.

### Visual Layout

```
+-----------------------------------------------------------+
|  [Intro]  [Technical]  [Roadmap]  [Q&A]                  |  <- Primary deck
+-----------------------------------------------------------+
|    [Overview]  [Architecture]  [Security]                 |  <- Sub-deck (children of "Technical")
+-----------------------------------------------------------+
|                                                           |
|                  SLIDE VIEWPORT                           |
|              (active slide rendered here)                 |
|                                                           |
+-----------------------------------------------------------+
```

---

## 4. Build Pipeline

The packager is a Node.js CLI script (zero runtime dependencies) that runs as a build step.

### Steps

1. **Scan** — Walk the input folder, collect all `.html` files.
2. **Parse** — For each file, extract `<meta>` tags to read `slide-id`, `slide-title`, `slide-parent`, `slide-order`.
3. **Build tree** — Construct an in-memory tree of slide nodes, sorted by `slide-order`.
4. **Inline assets** — Detect external assets referenced in each slide (images, fonts, local scripts/styles). Encode binary assets as base64 data URIs. Inline local CSS/JS directly.
5. **Serialize** — Emit the slide tree as a JSON data structure embedded in a `<script>` tag.
6. **Emit** — Write a single `index.html` containing the shell app + embedded data.

---

## 5. Asset Handling Strategy

Slides may reference external assets (images, stylesheets, scripts, fonts). The packager handles these in priority order:

| Asset type         | Strategy                                                              |
|--------------------|-----------------------------------------------------------------------|
| Local images       | Read from disk, base64-encode, replace `src` with data URI.          |
| Local CSS          | Read and inline into a `<style>` block scoped to that slide.         |
| Local JS           | Read and inline into a `<script>` block.                             |
| Local fonts        | Base64-encode, embed as `@font-face` data URIs.                      |
| Remote URLs (CDN)  | Left as-is (require internet access at view time). Optionally warn.  |

Slide HTML is stored as a string in the JSON payload. Each slide is rendered inside an `<iframe srcdoc="...">` to guarantee full style and script isolation between slides.

---

## 6. Routing & Deep Linking

Navigation state lives in the URL hash, enabling shareable links and browser back/forward.

- Format: `index.html#slide-id`
- On load: parse the hash and navigate directly to that slide.
- On navigation: update the hash without a page reload.
- Fallback: if no hash or unknown id, load the first root slide.

---

## 7. Shell Application Structure

The output `index.html` contains three embedded sections:

### 7.1 Data Layer (`<script type="application/json">`)

```json
{
  "slides": [
    {
      "id": "intro",
      "title": "Introduction",
      "parent": null,
      "order": 1,
      "html": "<html>...</html>"
    },
    {
      "id": "architecture-overview",
      "title": "Architecture Overview",
      "parent": "technical-section",
      "order": 2,
      "html": "<html>...</html>"
    }
  ]
}
```

### 7.2 Shell CSS (embedded `<style>`)
- Minimal reset
- Primary deck strip styles
- Sub-deck strip styles
- Viewport / iframe styles
- Transition animations between slides
- Responsive breakpoints (collapses deck strips on small screens)

### 7.3 Shell JS (embedded `<script>`)
- Reads the JSON data block
- Builds the tree in memory
- Renders primary and sub-deck navigation
- Handles click events and hash routing
- Injects slide HTML into `<iframe srcdoc>` on demand
- Keyboard navigation (arrow keys within a deck level)

---

## 8. UX Behaviours

| Behaviour            | Detail                                                                                 |
|----------------------|----------------------------------------------------------------------------------------|
| Active state         | Active deck and sub-deck items are visually highlighted.                               |
| Breadcrumb           | A breadcrumb trail above the viewport shows the path from root to current slide.       |
| Keyboard navigation  | Arrow keys move between siblings; Escape goes up one level to the parent.             |
| Slide transitions    | Subtle fade or slide-in animation when switching slides.                               |
| Empty parent slides  | If a deck slide has children but no content of its own, auto-navigate to first child. |
| Progress indicator   | Optional: a progress bar showing position within the current deck level.              |
| Full-screen mode     | A button to expand the viewport to full screen (hides navigation chrome).             |
| Search               | Since all content is in memory, a search box can filter slides by title or content.   |

---

## 9. Use Cases

### UC-1: Standard Presentation
A user generates 20 slides across 4 top-level sections. They run the packager, open `index.html`, and present using the primary deck to move between sections and the sub-deck to navigate within each section.

### UC-2: Technical Documentation
A developer generates HTML slides from a documentation pipeline. The packager bundles them. The result is shared as a single file attachment — no server required.

### UC-3: Deep-Linked Sharing
A user shares a specific slide via URL fragment (e.g. `index.html#security-model`). The recipient opens it and lands directly on that slide, with full navigation available.

### UC-4: Offline Use
The output `index.html` is fully self-contained (all local assets inlined). It works without any internet connection, provided no remote CDN assets were used in the original slides.

### UC-5: Embedded in a Portal
The `index.html` can be dropped into an existing web portal as an `<iframe>` without any modification.

### UC-6: Patching / Iterative Updates
A user edits one or more existing slide HTML files (fixing a typo, updating a diagram, revising content) or adds a brand new slide file to the input folder. They re-run the packager with the same command used originally. The packager performs a **full rebuild** — it re-scans the folder, picks up all changes and new files, and overwrites the previous `index.html`. The user can then reload the browser tab to see the updated presentation immediately, without losing their place if they use a deep link.

Key properties of this workflow:
- **Idempotent**: running the packager twice on the same unchanged input produces an identical output.
- **Additive**: new slide files are automatically included as long as they contain the required `slide-id` meta tag. No manifest or registry needs to be updated manually.
- **Non-destructive to source**: the packager only reads from the input folder and writes to the output path. Original slide files are never modified.
- **Fast feedback loop**: the rebuild is a full scan, so there is no stale cache or partial state to reason about. What is in the folder is exactly what ends up in the bundle.

---

## 10. CLI Interface (Proposed)

```
packager --input ./slides --output ./dist/index.html [options]

Options:
  --input   <dir>    Folder containing slide HTML files (required)
  --output  <file>   Output path for the bundled index.html (default: ./index.html)
  --title   <str>    Presentation title shown in <title> and header (default: "Presentation")
  --theme   <name>   Visual theme: light | dark | auto (default: auto)
  --warn-remote      Emit warnings for unresolvable remote asset references
  --no-search        Disable the in-app search feature
  --no-fullscreen    Disable the full-screen toggle button
  --watch            Watch the input folder and rebuild automatically on any file change
```

### Recommended Patch Workflow

```
# Initial build
packager --input ./slides --output ./presentation.html

# Edit slide files, add new ones, then rebuild — same command
packager --input ./slides --output ./presentation.html

# Or use watch mode during active editing sessions
packager --input ./slides --output ./presentation.html --watch
```

The `--watch` mode monitors the input folder for file additions, modifications, and deletions. On any change it triggers an immediate full rebuild and prints a timestamped confirmation. The user simply refreshes the browser to see the result.

---

## 11. Output File Constraints

- **Single file**: one `index.html`, no companion files.
- **No external runtime**: no React, Vue, or framework CDN links. Vanilla JS only.
- **No build tools to run**: the output file is already the final artifact.
- **Browser support**: modern evergreen browsers (Chrome, Firefox, Edge, Safari). No IE.
- **File size**: reasonable for typical presentations. Large images are flagged with a size warning during packaging.

---

## 12. Open Questions / Future Considerations

- **Slide templates**: should the packager support injecting a shared header/footer into each slide iframe?
- **Presenter mode**: a secondary window showing speaker notes (requires a `<meta name="slide-notes">` convention).
- **Export to PDF**: using the browser print dialog with a print stylesheet that renders one slide per page.
- **Accessibility**: ensure keyboard navigation and ARIA roles are correct for screen readers.
- **Theming API**: allow slides to declare a preferred theme via meta tag, overriding the global theme.
- **Live reload in watch mode**: instead of requiring a manual browser refresh, the shell could open a local WebSocket and push a reload signal to the open tab automatically when a rebuild completes.
