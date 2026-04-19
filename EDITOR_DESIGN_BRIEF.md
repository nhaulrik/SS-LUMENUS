# Editor Tab — Design Brief

## 1. Feature Summary

The **Editor tab** is a dedicated workspace for content creators to refine AI-generated slides after export. It provides a unified view of all exported slides across all flows in a project, allowing users to edit content (text and HTML), preview changes in real-time, and save edits either to the current export or fork into a new one. This bridges the gap between AI generation and final publication, supporting 5–20 slide editing sessions.

---

## 2. Primary User Action

**Open a slide from the export tree → edit its content (text or HTML) → see the change live in the preview → save with a choice of destination (patch current export or create new).**

The editor should make this flow frictionless: one click to open, real-time feedback, and a clear save decision point.

---

## 3. Design Direction

**Efficiency + Control.** The Editor should feel like a professional tool — fast, focused, and transparent about what you're changing. It's not playful or exploratory; it's task-oriented. The three-panel layout (navigation | code | preview) mirrors professional code editors (VS Code, WebStorm) and is familiar to power users.

Visual style: Clean, high-contrast, minimal decoration. Dark theme for code editing (Monaco default). Subtle highlights for dirty state (unsaved changes). The preview should feel like a real device/canvas, not just a rendered iframe.

---

## 4. Layout Strategy

**Three-column layout with clear visual separation:**

| Column | Width | Role | Visual Weight |
|--------|-------|------|---|
| **Left (Navigation)** | ~20% | Export tree + slide list + checkboxes | Secondary (supports picking what to edit) |
| **Middle (Editor)** | ~50% | Monaco HTML editor, full-height, monospace | Primary (where work happens) |
| **Right (Preview)** | ~30% | Iframe rendering, same click-to-edit as preview step | Feedback (shows impact of edits) |

**Key spatial principles:**
- Navigation panel is scrollable independently (tall export trees should not push the Save/Export buttons off-screen)
- Editor and preview are synchronized height (both scroll in tandem when a single slide is taller than viewport)
- Save/Export buttons are sticky at the bottom of the left panel, always visible
- Dirty indicator (● dot) appears next to slide name in tree when unsaved changes exist

**Visual hierarchy:**
1. The editor is the primary focus (largest, most space)
2. Preview is secondary feedback (right column)
3. Navigation is tertiary (left, for picking what to edit)

---

## 5. Key States

### **Default State**
- Export tree is expanded/collapsed (user preference)
- No slide is selected
- Editor is empty with placeholder text: "Select a slide from the export tree to begin editing"
- Preview is empty

### **Slide Open (No Changes)**
- Slide is highlighted in tree
- Editor shows the slide's HTML
- Preview renders the slide
- Save button is disabled (no changes)
- Dirty indicator is absent

### **Slide Open (With Unsaved Changes)**
- Editor shows modified HTML
- Preview updates in real-time (debounced 600ms)
- Dirty indicator (●) appears next to slide name in tree
- Save button is enabled
- If user navigates away: "You have unsaved changes. Save before leaving?" dialog appears

### **Multiple Slides Selected for Export**
- Checkboxes are checked in tree
- "Export selected" button shows count: "Export 3 slides"
- Button is enabled only if ≥1 checkbox is checked

### **Save Dialog**
- After clicking Save, modal appears:
  - Option 1: "Patch current export" (PATCH endpoint, overwrites slide-N.html)
  - Option 2: "Create new export" (POST fork endpoint, copies all checked slides to new export-N)
  - Cancel button
- After save, dirty indicator disappears, editor state is cleared if user navigates

### **Empty State (No Exports)**
- Message: "No exports yet. Create one from the Publish tab."
- Navigation panel is empty

### **Loading State**
- Skeleton loaders in navigation tree while exports are fetching
- Editor and preview remain empty

### **Error State**
- Toast notification: "Failed to load slide. Please try again."
- Slide remains in tree but cannot be selected

---

## 6. Interaction Model

### **Navigation Tree**
- **Expand/collapse** export nodes (▼ / ▶) to see slides
- **Click slide name** → opens it (loads HTML into editor + preview)
- **Click checkbox** → marks slide for batch export (independent of which slide is open)
- **Dirty indicator (●)** shows which slides have unsaved changes
- **Hover** on export node shows: export date, slide count, source flow name

### **Editor (Monaco)**
- **Type freely** — all changes are tracked
- **Debounced save to preview** — 600ms after last keystroke, preview iframe refreshes
- **Syntax highlighting** — HTML/CSS/JS if present
- **Line numbers** — always visible
- **Word wrap** — enabled for long lines
- **Keyboard shortcuts** — Ctrl+S to save (opens save dialog)

### **Preview (Iframe)**
- **Click any text element** → activates inline editing (same as preview step)
- **Blur or Enter** → saves text change back to editor (postMessage)
- **Hover text** → highlights with blue outline (indicates clickable)
- **Scroll sync** — preview scrolls to match editor (if slide is taller than viewport)

### **Save Flow**
1. User clicks Save button or presses Ctrl+S
2. Modal dialog appears: "Save to current export" or "Create new export"
3. User chooses
4. Endpoint is called (PATCH or POST fork)
5. Success toast: "Slide saved" or "New export created (Export #7)"
6. Dirty indicator disappears
7. If "Create new export", tree is refreshed to show new export

### **Export Selected Flow**
1. User checks ≥1 slide checkbox
2. "Export selected" button becomes enabled
3. User clicks button
4. POST fork endpoint is called with selected slide list
5. Success toast: "New export created with 3 slides (Export #8)"
6. Tree is refreshed, new export appears at top
7. Checkboxes are cleared

### **Navigation Away (Unsaved Changes)**
- User clicks another tab or closes editor
- If unsaved changes exist: "You have unsaved changes. Save them before leaving?"
  - "Save" → opens save dialog
  - "Discard" → clears changes, navigates away
  - "Cancel" → stays in editor

---

## 7. Content Requirements

### **Labels & Buttons**
- "Editor" (tab name)
- "Export #3" (export node label, with count: "2 slides")
- "Slide 1" (slide name, from export.json metadata)
- "● Unsaved" (dirty indicator tooltip)
- "Save" (button, disabled when no changes)
- "Export selected" (button, disabled when no checkboxes)
- "Select a slide from the export tree to begin editing" (empty state)
- "You have unsaved changes. Save them before leaving?" (confirmation dialog)
- "Patch current export" (modal option)
- "Create new export" (modal option)
- "Slide saved" (success toast)
- "New export created (Export #7)" (success toast)

### **Metadata Displayed**
- Export number, creation date, slide count (in tree hover tooltip)
- Slide index, title (from export.json)
- Flow name (source flow, from flow.json)

### **Dynamic Content**
- Export list: 0 to N exports (realistic: 5–20 per project)
- Slide list per export: 1 to N slides (realistic: 1–50)
- Editor content: up to 50KB per slide (typical HTML)
- Preview: rendered iframe, real-time updates

---

## 8. Recommended References

For implementation, consult these SOLON design docs:
- **Responsive layout patterns** — three-column layout should adapt to smaller screens (stack columns on mobile, or hide navigation)
- **Monaco editor integration** — existing HtmlRecipeStep uses Monaco; follow that pattern
- **Iframe preview + postMessage** — HtmlPreviewStep has the click-to-edit script; reuse it here
- **Toast notifications** — use existing toast system from HtmlMetadataStep
- **Modal dialogs** — use existing modal patterns from the codebase

---

## 9. Implementation Checklist

### **Frontend Components**
- [ ] SlideEditorTree — export/slide navigation with checkboxes, dirty indicators
- [ ] SlideEditor — Monaco editor wrapper with debounced sync
- [ ] SlidePreview — iframe with click-to-edit support (reuse from HtmlPreviewStep)
- [ ] EditorTab — main container, wires tree + editor + preview + save/export actions
- [ ] SaveDialog — modal for choosing patch vs. fork
- [ ] UnsavedChangesDialog — confirmation when navigating away

### **Backend Endpoints**
- [ ] `PATCH /api/projects/:p/flows/:f/exports/:e/slides/:s` — update single slide
- [ ] `POST /api/projects/:p/flows/:f/exports/:e/fork` — create new export from selected slides

### **State Management**
- [ ] Track currently open slide (flowId, exportId, slideFile)
- [ ] Track unsaved changes (dirty flag per slide)
- [ ] Track selected slides for batch export (checkboxes)
- [ ] Warn on navigation if unsaved changes exist

### **Sync Behavior**
- [ ] Editor → Preview: debounced 600ms on keystroke
- [ ] Preview → Editor: postMessage on click-to-edit blur (patch editor content)
- [ ] Tree selection → Editor/Preview: load slide HTML and render

### **Error Handling**
- [ ] Gracefully handle failed slide loads (show error toast, don't break tree)
- [ ] Validate HTML before saving (warn if malformed)
- [ ] Handle network errors on save/export (retry or show error)

---

## 10. Open Questions & Decisions

1. **Mobile responsiveness**: Should Editor work on tablet/mobile, or desktop-only?
   - *Recommendation*: Desktop-only for MVP (three-column layout is hard to adapt). Can add responsive mode later.

2. **HTML validation**: Should we warn if the user's HTML edits are malformed (e.g., unclosed tags)?
   - *Recommendation*: Warn on save, don't block. Monaco can highlight syntax errors.

3. **Undo/Redo**: Should the editor support undo/redo across save boundaries?
   - *Recommendation*: Monaco's built-in undo/redo is sufficient. Once saved, that becomes the new baseline.

4. **Diff view**: Should we show what changed between the original and edited version?
   - *Recommendation*: Not in MVP. Can add as a "View changes" modal later if needed.

5. **Batch edit**: Should users be able to find-and-replace across multiple slides?
   - *Recommendation*: Not in MVP. Single-slide editing is the focus.

6. **Slide preview size**: Should the preview be a fixed size (e.g., 1280×720) or responsive?
   - *Recommendation*: Fixed 1280×720, matching the HtmlPreviewStep. Consistent experience.

---

## 11. Success Criteria

- ✅ User can open any exported slide in <2 seconds
- ✅ Editor updates preview in real-time (debounced, no lag)
- ✅ Click-to-edit in preview works and patches editor
- ✅ Save dialog is clear and unambiguous
- ✅ Unsaved changes are never silently lost
- ✅ Batch export of selected slides works end-to-end
- ✅ New exports appear in tree immediately after creation
- ✅ No broken SVG attributes or double-escaping (learned from preview step fix)

---

## 12. Design Decisions Made

| Decision | Rationale |
|----------|-----------|
| Three-column layout (nav \| editor \| preview) | Familiar to power users, efficient use of space, mirrors professional tools |
| Click to open, separate checkbox to select | Decouples navigation (which slide to edit) from batch selection (which to export) |
| Real-time preview (debounced) | Fast feedback loop, but not laggy |
| User chooses patch vs. fork on save | Preserves original exports, gives user control |
| All exports in one tree | Unified view, easier discovery |
| Warn on unsaved changes | Prevents accidental loss of work |
| Reuse click-to-edit from HtmlPreviewStep | Consistent UX, less code duplication |

---

## Ready for Implementation

This brief is ready to hand off to implementation. The feature is well-scoped, the interactions are clear, and the user needs are explicit. Proceed with the build order outlined above.
