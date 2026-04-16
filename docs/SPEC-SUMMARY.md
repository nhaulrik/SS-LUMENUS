# Hierarchical Projects Feature — Summary of Changes

## Overview

Transform SOLON from a single-file download tool into a **hierarchical project system** with **multi-iteration support** and **automatic web app generation**.

---

## Key Changes to User Experience

### Current Flow
```
Upload → Zones → Recipe → Apply → Preview → Download HTML (single file)
```

### New Flow
```
Upload → Zones → Recipe → Apply → Preview → [NEW] Define Hierarchy & Metadata → [Two Actions]
                                                     ↓
                                    ┌─────────────────┴─────────────────┐
                                    ↓                                     ↓
                            "Generate More Content"              "Package & Publish"
                            (Save iteration, continue)           (Save all, generate app, download)
```

---

## New Step: Define Hierarchy & Metadata

A **dedicated, isolated step** appears after preview and before the action buttons.

**Purpose:**
1. Assign metadata to each slide (slideId, name, type, custom fields)
2. Define parent-child relationships (hierarchy)
3. Visualize the resulting hierarchy structure
4. Review and confirm before saving

**Layout: Split Panels**

```
┌─────────────────────────────────────────────────────────┐
│ Define Hierarchy & Metadata — Slide 1 of 3              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ [Left: Metadata Form]    [Right: Hierarchy Preview]     │
│                                                         │
│ Slide ID: audi           Root                           │
│ Name: Audi               ├─ Audi (◐ editing)            │
│ Type: manufacturer       │  ├─ A4 (pending)             │
│ Parent: [None ▼]         │  └─ A6 (pending)             │
│                          ├─ BMW                         │
│ Custom Metadata:         │  └─ 3 Series (pending)       │
│ country: Germany         └─ Mercedes                    │
│ founded: 1909               └─ C-Class (pending)        │
│                                                         │
│ ← Previous  [1/3]  Next →                               │
│                                                         │
├─────────────────────────────────────────────────────────┤
│ ← Back to preview  [Generate more content] [Package & Publish] │
└─────────────────────────────────────────────────────────┘
```

**Features:**
- **Left Panel:** Metadata form (slideId, name, type, parent, custom fields)
- **Right Panel:** Real-time hierarchy preview with visual tree
- **Navigation:** Previous/Next buttons to move between slides
- **Status Indicators:** ◐ editing, ✓ confirmed, ○ pending
- **Parent Dropdown:** Only populated if slides from previous iterations exist

---

## Project Structure

### Single-Iteration Project
```
german-automotive-database/
├── manifest.json                 # Project index
├── README.md                     # How to use
├── slides/
│   ├── audi.html
│   ├── bmw.html
│   └── mercedes.html
└── app/                          # Interactive web app
    ├── index.html
    ├── app.js
    ├── styles.css
    └── manifest.json
```

### Multi-Iteration Project
```
german-automotive-database/
├── manifest.json                 # Contains all iterations
├── README.md
├── slides/
│   ├── audi.html                 # Iteration 1
│   ├── bmw.html
│   ├── mercedes.html
│   ├── audi-a4.html              # Iteration 2
│   ├── audi-a6.html
│   ├── bmw-3-series.html
│   └── mercedes-c-class.html
└── app/                          # Auto-generated
    ├── index.html
    ├── app.js
    ├── styles.css
    └── manifest.json
```

---

## Metadata Embedded in Each Slide

Each HTML slide contains metadata:

```html
<script type="application/json" id="solon-metadata">
{
  "slideId": "audi-a4",
  "name": "Audi A4",
  "type": "model",
  "hierarchyLevel": 1,
  "parentSlideId": "audi",
  "customMetadata": {
    "class": "Compact Executive",
    "manufacturer": "Audi"
  }
}
</script>
```

---

## Multi-Iteration Linking

### Scenario: User adds "Models" to "Manufacturers" project

**Iteration 1 Complete:**
1. User uploads manufacturer template
2. Generates 3 slides (Audi, BMW, Mercedes)
3. Clicks "Generate More Content"
4. Assigns metadata
5. Project saved to disk
6. User returned to Flow Selector

**Iteration 2 Starts:**
1. **NEW:** Prompt appears: "Continue with 'German Automotive Database'?" [Yes/No]
2. User clicks Yes
3. Uploads car models template
4. Generates 4 slides (2 Audi models, 1 BMW, 1 Mercedes)
5. Clicks "Package & Publish"
6. **NEW:** Metadata modal shows parent dropdown with Audi, BMW, Mercedes
7. User assigns:
   - Audi A4 → parent: "audi"
   - Audi A6 → parent: "audi"
   - BMW 3 Series → parent: "bmw"
   - Mercedes C-Class → parent: "mercedes"
8. Saves metadata
9. Web app auto-generated with all 7 slides + hierarchy
10. Download dialog appears
11. User downloads ZIP

---

## Manifest.json Structure

```json
{
  "version": "1.0",
  "projectId": "german-automotive-database",
  "projectName": "German Automotive Database",
  "projectMetadata": {
    "createdAt": "2024-04-16T10:00:00Z",
    "updatedAt": "2024-04-16T11:30:00Z"
  },
  "iterations": [
    {
      "iterationId": "iteration-1",
      "iterationName": "Manufacturers",
      "type": "manufacturer",
      "slideCount": 3,
      "slides": [
        {
          "slideId": "audi",
          "name": "Audi",
          "type": "manufacturer",
          "hierarchyLevel": 0,
          "fileName": "audi.html",
          "parentSlideId": null,
          "customMetadata": { "country": "Germany", "founded": "1909" }
        }
      ]
    },
    {
      "iterationId": "iteration-2",
      "iterationName": "Models",
      "type": "model",
      "slideCount": 4,
      "slides": [
        {
          "slideId": "audi-a4",
          "name": "Audi A4",
          "type": "model",
          "hierarchyLevel": 1,
          "fileName": "audi-a4.html",
          "parentSlideId": "audi",
          "customMetadata": { "class": "Compact Executive" }
        }
      ]
    }
  ],
  "slideIndex": {
    "audi": { "iterationId": "iteration-1", "fileName": "audi.html" },
    "audi-a4": { "iterationId": "iteration-2", "fileName": "audi-a4.html" }
  }
}
```

---

## Interactive Web App (Auto-Generated)

When user clicks "Package & Publish", a web app is automatically generated in `app/` folder.

### Features
- **Tree Navigation:** Expand/collapse hierarchy
- **Slide Viewer:** Display selected slide in iframe
- **Metadata Sidebar:** Show slide info and relationships
- **Search:** Find slides by name or content
- **Filtering:** Filter by type, hierarchy level, custom metadata
- **Breadcrumbs:** Navigate parent → child

### Example Usage
1. End user opens `german-automotive-database/app/index.html` in browser
2. Sees tree: "Manufacturers" (Audi, BMW, Mercedes)
3. Clicks "Audi" → sees Audi slide
4. Expands "Audi" → sees child slides (A4, A6)
5. Clicks "A4" → sees Audi A4 slide with parent breadcrumb
6. Uses search to find all "A" models
7. Filters to show only "model" type slides

---

## API Changes

### New Endpoint: `POST /api/html-flow/save-iteration`

Replaces the old "Download HTML" endpoint.

**Request:**
```json
{
  "chainId": "chain-uuid",
  "projectName": "German Automotive Database",
  "projectId": null,  // null for first iteration
  "action": "save-and-continue",  // or "save-and-publish"
  "slides": [
    {
      "index": 0,
      "slideId": "audi",
      "name": "Audi",
      "type": "manufacturer",
      "hierarchyLevel": 0,
      "parentSlideId": null,
      "customMetadata": { "country": "Germany", "founded": "1909" }
    }
  ]
}
```

**Response (save-and-continue):**
```json
{
  "ok": true,
  "projectId": "german-automotive-database",
  "projectPath": "/path/to/project",
  "action": "save-and-continue",
  "downloadUrl": null,
  "appPath": null
}
```

**Response (save-and-publish):**
```json
{
  "ok": true,
  "projectId": "german-automotive-database",
  "projectPath": "/path/to/project",
  "action": "save-and-publish",
  "downloadUrl": "/api/html-flow/download-project/german-automotive-database",
  "appPath": "/path/to/german-automotive-database/app/index.html"
}
```

### New Endpoint: `GET /api/html-flow/download-project/:projectId`

Downloads entire project folder as ZIP.

### New Endpoint: `GET /api/html-flow/project/:projectId`

Returns project metadata for "Continue with project?" prompt.

---

## Implementation Phases

### Phase 1: Hierarchy Definition Step (Weeks 1-3)
- Metadata schema and injection
- HierarchyDefinitionStep component (new dedicated step)
- Hierarchy preview panel with real-time tree visualization
- Metadata form with validation
- `save-iteration` endpoint
- Folder structure and manifest generation

### Phase 2: Multi-Iteration Support (Weeks 4-6)
- Project continuation prompt in FlowSelectStep
- Parent slide dropdown in hierarchy step
- Parent-child validation
- Manifest updates for new iterations
- Hierarchy preview showing existing and new slides
- Web app auto-generation on "Package & Publish"

### Phase 3: Web App Features (Weeks 7-8)
- Tree navigation, search, filtering
- Metadata display and breadcrumbs
- Multiple view modes (tree, list, grid)
- E2E tests

---

## Backward Compatibility

- Old `GET /api/html-flow/download/:chainId/:file` endpoint remains unchanged
- Existing projects (without metadata) can still be downloaded as single files
- New feature is opt-in (users choose which button to click)

---

## Benefits

✅ **Multi-iteration support:** Build complex hierarchies over time  
✅ **Semantic relationships:** Define parent-child links between slides  
✅ **Interactive browsing:** End users can explore content hierarchically  
✅ **Metadata-driven:** Slides carry rich metadata for filtering/grouping  
✅ **Automatic web app:** No manual work to create browsable interface  
✅ **Extensible:** Easy to add new metadata fields and app features  
✅ **Backward compatible:** Existing workflows unchanged  

---

## Example User Journeys

### Journey 1: Single-Iteration Project
1. Upload manufacturer template
2. Generate 3 slides
3. Click "Next" → Hierarchy Definition Step
4. Assign metadata (slideId, name, type, customMetadata)
5. Review hierarchy preview (flat list)
6. Click "Package & Publish"
7. Web app auto-generated
8. Download ZIP
9. End users browse the 3 manufacturer slides in web app

### Journey 2: Multi-Iteration Project
1. Upload manufacturer template → generate 3 slides → click "Next"
2. Hierarchy Definition Step: assign metadata → review flat hierarchy
3. Click "Generate More Content" → return to Flow Selector
4. Upload car models template → generate 4 slides → click "Next"
5. Hierarchy Definition Step: assign metadata + parent links
6. Hierarchy preview shows:
   ```
   ├─ Audi ✓
   │  ├─ A4 ✓
   │  └─ A6 ✓
   ├─ BMW ✓
   │  └─ 3 Series ✓
   └─ Mercedes ✓
      └─ C-Class ✓
   ```
7. Click "Package & Publish"
8. Web app generated with full hierarchy
9. Download ZIP
10. End users browse manufacturers, expand to see models

### Journey 3: Continuous Expansion
1. Generate manufacturers (Iteration 1) → Hierarchy Definition Step → "Generate More Content"
2. Generate models (Iteration 2) → Hierarchy Definition Step with parent links → "Generate More Content"
3. Generate features/specs (Iteration 3) → Hierarchy Definition Step with parent links → "Package & Publish"
4. Final hierarchy preview shows complete 3-level structure
5. Web app generated with all levels
6. End users browse complete automotive hierarchy

---

## Questions & Decisions

**Q: Should "Generate More Content" require the user to name the iteration?**
A: Yes, auto-suggest based on template name or slide type, but allow user to edit.

**Q: Can users delete or reorder slides after saving?**
A: Phase 1: No. Phase 2: Yes, via manifest editing or UI.

**Q: Should there be a limit to hierarchy depth?**
A: No hard limit, but UI should handle deep nesting gracefully.

**Q: Can the web app be customized (theme, colors, layout)?**
A: Phase 1: No. Phase 3+: Yes, via app config.

**Q: What if user closes browser after "Generate More Content" but before starting next iteration?**
A: Project ID stored in localStorage; user can resume by selecting project from list.

---

## Files to Create/Modify

### New Files
- `docs/SPEC-hierarchical-projects.md` (comprehensive spec)
- `client/src/components/MetadataModal.jsx` (new modal component)
- `server/lib/manifest-builder.js` (generate manifest.json)
- `server/lib/web-app-generator.js` (generate interactive app)

### Modified Files
- `client/src/steps/HtmlPreviewStep.jsx` (replace buttons, add modal trigger)
- `client/src/steps/FlowSelectStep.jsx` (add project continuation prompt)
- `server/routes/html-flow.js` (new endpoints, remove old download logic)
- `server/lib/html-patcher.js` (inject metadata into slides)

---

## References

- Full Specification: `docs/SPEC-hierarchical-projects.md`
- Current Preview Step: `client/src/steps/HtmlPreviewStep.jsx`
- Current Download Endpoint: `server/routes/html-flow.js:696`
- Current Apply-Content Endpoint: `server/routes/html-flow.js:631`
