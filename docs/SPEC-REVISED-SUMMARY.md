# Hierarchical Projects Feature — Revised Summary

## Key Insight: Dedicated Hierarchy Definition Step

Instead of cramming metadata and hierarchy definition into a modal on the preview step, we've introduced a **dedicated, isolated step** that appears between the preview and the action buttons.

This provides:
- ✅ **Focused UX** — Users have a clear, dedicated phase for defining hierarchy
- ✅ **Visual Clarity** — Split-panel layout shows metadata form and hierarchy preview side-by-side
- ✅ **Real-Time Feedback** — Hierarchy preview updates as user edits, showing exactly how the structure is forming
- ✅ **Easy Navigation** — Previous/Next buttons to move through slides
- ✅ **Multi-Iteration Support** — Parent dropdown populated with existing slides from previous iterations

---

## Complete Flow

```
1. Upload HTML
   ↓
2. Assign Zones
   ↓
3. Generate Recipe
   ↓
4. Apply Content
   ↓
5. Preview Slides
   ↓
6. [NEW] Define Hierarchy & Metadata  ← Dedicated Step
   ├─ Metadata form (left panel)
   ├─ Hierarchy preview (right panel)
   └─ Navigation (Previous/Next)
   ↓
7. Choose Action
   ├─ "Generate More Content" → Save iteration, return to upload
   └─ "Package & Publish" → Save all, generate web app, download ZIP
```

---

## The Hierarchy Definition Step

### Layout

**Split-panel design:**

```
┌──────────────────────────────────────────────────────────────┐
│ Define Hierarchy & Metadata — Slide 1 of 3                   │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ ┌─ Metadata Form ────┐  ┌─ Hierarchy Preview ────────────┐  │
│ │                    │  │                                │  │
│ │ Slide ID: audi     │  │ Root                           │  │
│ │ Name: Audi         │  │ ├─ Audi (◐ editing)            │  │
│ │ Type: manufacturer │  │ │  ├─ A4 (pending)             │  │
│ │ Parent: [None ▼]   │  │ │  └─ A6 (pending)             │  │
│ │                    │  │ ├─ BMW ✓                       │  │
│ │ Custom Metadata:   │  │ │  └─ 3 Series ✓               │  │
│ │ country: Germany   │  │ └─ Mercedes ✓                  │  │
│ │ founded: 1909      │  │    └─ C-Class (○ pending)      │  │
│ │ [+ Add field]      │  │                                │  │
│ │                    │  │ ✓ = confirmed                 │  │
│ │                    │  │ ◐ = editing                   │  │
│ │                    │  │ ○ = pending                   │  │
│ │                    │  │                                │  │
│ └────────────────────┘  └────────────────────────────────┘  │
│                                                              │
│ ← Previous  [1 / 3]  Next →                                  │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│ ← Back to preview  [Generate more content] [Package & Publish] │
└──────────────────────────────────────────────────────────────┘
```

### Left Panel: Metadata Form

**Fields:**
- **Slide ID** — Unique identifier (auto-suggested, user can edit)
- **Name** — Human-readable name (auto-suggested, user can edit)
- **Type** — Semantic type (dropdown: manufacturer, model, product, feature, etc.)
- **Parent Slide** — Link to parent (only if previous iterations exist)
- **Custom Metadata** — Key-value pairs (optional, user can add/remove)

### Right Panel: Hierarchy Preview

**Features:**
- **Tree Visualization** — Shows all slides in hierarchy with indentation
- **Status Indicators:**
  - ✓ = confirmed (metadata complete)
  - ◐ = currently editing (highlighted)
  - ○ = pending (not yet edited)
- **Real-Time Updates** — Updates as user edits metadata and assigns parents
- **Legend** — Shows what each status indicator means
- **Collapse/Expand** — Optional, for deep hierarchies

### Navigation

- **Previous/Next Buttons** — Move between slides
- **Slide Counter** — Shows current position (e.g., "1 / 3")
- **Auto-Save** — Changes saved in memory as user edits
- **No Persistence Yet** — Changes only saved to disk when user clicks "Generate More Content" or "Package & Publish"

---

## Two Action Buttons

**"Generate More Content"**
- Validates all metadata
- Saves current iteration to project folder
- Returns to Flow Selector
- Project ID stored in session for next iteration
- User can start new template for next iteration

**"Package & Publish"**
- Validates all metadata
- Saves current iteration to project folder
- Auto-generates interactive web app in `app/` folder
- Creates `README.md` with usage instructions
- Download dialog appears
- User downloads entire project as ZIP
- Session cleared (project complete)

---

## Multi-Iteration Linking

### Scenario: Adding "Models" to "Manufacturers" Project

**Iteration 1: Manufacturers**
1. Upload template → Assign zones → Generate recipe → Apply content
2. Preview slides (3 manufacturers)
3. Click "Next" → Hierarchy Definition Step
4. Edit metadata for each slide:
   - Audi: slideId="audi", name="Audi", type="manufacturer"
   - BMW: slideId="bmw", name="BMW", type="manufacturer"
   - Mercedes: slideId="mercedes", name="Mercedes", type="manufacturer"
5. Hierarchy preview shows flat list (no parents)
6. Click "Generate More Content"
7. Project saved, user returned to Flow Selector

**Iteration 2: Models**
1. Flow Selector detects project in session
2. Prompt: "Continue with 'German Automotive Database'?" [Yes/No]
3. User clicks Yes
4. Upload template → Assign zones → Generate recipe → Apply content
5. Preview slides (4 models)
6. Click "Next" → Hierarchy Definition Step
7. **Parent dropdown populated** with Audi, BMW, Mercedes
8. Edit metadata for each slide:
   - Audi A4: slideId="audi-a4", name="Audi A4", type="model", parent="audi"
   - Audi A6: slideId="audi-a6", name="Audi A6", type="model", parent="audi"
   - BMW 3 Series: slideId="bmw-3-series", name="BMW 3 Series", type="model", parent="bmw"
   - Mercedes C-Class: slideId="mercedes-c-class", name="Mercedes C-Class", type="model", parent="mercedes"
9. Hierarchy preview updates in real-time:
   ```
   Root
   ├─ Audi ✓
   │  ├─ A4 (◐ editing)
   │  └─ A6 ✓
   ├─ BMW ✓
   │  └─ 3 Series ✓
   └─ Mercedes ✓
      └─ C-Class ✓
   ```
10. Click "Package & Publish"
11. Iteration 2 appended to project
12. Web app regenerated with all 7 slides + complete hierarchy
13. Download dialog appears
14. User downloads ZIP
15. Project complete

---

## Project Structure

After "Package & Publish":

```
german-automotive-database/
├── manifest.json                 # Complete project index
├── README.md                     # Usage instructions
├── slides/
│   ├── audi.html                 # Iteration 1
│   ├── bmw.html
│   ├── mercedes.html
│   ├── audi-a4.html              # Iteration 2
│   ├── audi-a6.html
│   ├── bmw-3-series.html
│   └── mercedes-c-class.html
└── app/                          # Auto-generated web app
    ├── index.html
    ├── app.js
    ├── styles.css
    └── manifest.json
```

### Manifest.json Structure

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
        },
        /* BMW, Mercedes */
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
        },
        /* A6, 3 Series, C-Class */
      ]
    }
  ],
  "slideIndex": {
    "audi": { "iterationId": "iteration-1", "fileName": "audi.html" },
    "audi-a4": { "iterationId": "iteration-2", "fileName": "audi-a4.html" },
    /* ... */
  }
}
```

### Metadata Embedded in Each Slide

```html
<script type="application/json" id="solon-metadata">
{
  "version": "1.0",
  "slideId": "audi-a4",
  "name": "Audi A4",
  "type": "model",
  "hierarchyLevel": 1,
  "projectId": "german-automotive-database",
  "iterationId": "iteration-2",
  "sequenceNumber": 1,
  "sequenceTotal": 2,
  "parentSlideId": "audi",
  "customMetadata": {
    "class": "Compact Executive",
    "manufacturer": "Audi"
  },
  "generatedAt": "2024-04-16T11:30:00Z"
}
</script>
```

---

## Interactive Web App

When user opens `app/index.html` in browser:

**Features:**
- **Tree Navigation** — Expand/collapse manufacturers to see models
- **Slide Viewer** — Click slide to view in iframe
- **Metadata Display** — Show slide info in sidebar
- **Breadcrumbs** — Parent → Child navigation
- **Search** — Find slides by name or content
- **Filtering** — Filter by type, hierarchy level, custom metadata

**Example Interaction:**
1. User opens app
2. Sees tree: Manufacturers (Audi, BMW, Mercedes)
3. Clicks Audi → sees Audi slide
4. Expands Audi → sees A4, A6 models
5. Clicks A4 → sees Audi A4 slide with parent breadcrumb
6. Uses search to find all "A" models
7. Filters to show only "model" type slides

---

## Implementation Roadmap

### Phase 1: Hierarchy Definition Step (Weeks 1-3)
- [ ] Create HierarchyDefinitionStep component
- [ ] Implement metadata form with all fields
- [ ] Implement HierarchyPreview component with tree visualization
- [ ] Add Previous/Next navigation
- [ ] Integrate into main flow
- [ ] Add validation logic
- [ ] Update HtmlPreviewStep with "Next" button

### Phase 2: Backend & Persistence (Weeks 3-4)
- [ ] Create `save-iteration` endpoint
- [ ] Implement folder structure creation
- [ ] Generate `manifest.json`
- [ ] Implement `download-project` endpoint
- [ ] Add project session tracking

### Phase 3: Multi-Iteration Support (Weeks 4-5)
- [ ] Add project continuation prompt in FlowSelectStep
- [ ] Create `project/:projectId` endpoint
- [ ] Populate parent dropdown with existing slides
- [ ] Validate parent-child relationships
- [ ] Update manifest for new iterations
- [ ] Regenerate web app on "Package & Publish"

### Phase 4: Web App Generation (Weeks 5-6)
- [ ] Auto-generate web app on "Package & Publish"
- [ ] Create app structure (index.html, app.js, styles.css)
- [ ] Implement tree navigation
- [ ] Implement search and filtering
- [ ] Add metadata display

### Phase 5: Testing & Polish (Week 6-7)
- [ ] E2E tests for complete flow
- [ ] Multi-iteration tests
- [ ] Web app feature tests
- [ ] UX polish and error handling

---

## Benefits

✅ **Focused UX** — Dedicated step for hierarchy definition  
✅ **Visual Clarity** — Real-time hierarchy preview  
✅ **Easy Multi-Iteration** — Parent dropdown auto-populated  
✅ **Metadata-Driven** — Slides carry rich metadata  
✅ **Automatic Web App** — No manual work to create browsable interface  
✅ **Extensible** — Easy to add new metadata fields and features  
✅ **Backward Compatible** — Old workflows unchanged  

---

## Files to Create/Modify

### New Files
- `docs/SPEC-hierarchical-projects.md` — Complete specification
- `docs/IMPLEMENTATION-HIERARCHY-STEP.md` — Developer guide
- `client/src/steps/HierarchyDefinitionStep.jsx` — New step component
- `client/src/components/HierarchyPreview.jsx` — Tree preview component

### Modified Files
- `client/src/steps/HtmlPreviewStep.jsx` — Add "Next" button
- `client/src/steps/FlowSelectStep.jsx` — Add project continuation prompt
- `client/src/App.jsx` — Integrate new step
- `server/routes/html-flow.js` — New endpoints (save-iteration, download-project, project)
- `server/lib/html-patcher.js` — Inject metadata into slides
- `client/src/index.css` — Add styling for new components

---

## Key Advantages of This Approach

1. **Separation of Concerns** — Preview and hierarchy definition are separate
2. **Visual Feedback** — User sees hierarchy forming in real-time
3. **Scalability** — Works for any depth of hierarchy
4. **Ease of Use** — Intuitive navigation with Previous/Next
5. **Validation** — All errors caught before saving
6. **Multi-Iteration** — Parent dropdown auto-populated from previous iterations
7. **Professional UX** — Split-panel layout is familiar and clean

---

## Next Steps

1. Review this specification with stakeholders
2. Finalize UI mockups and design
3. Begin Phase 1 implementation (HierarchyDefinitionStep component)
4. Implement Phase 2 (backend endpoints)
5. Add Phase 3 (multi-iteration support)
6. Build Phase 4 (web app generation)
7. Complete Phase 5 (testing and polish)

The specification is ready to guide implementation!
