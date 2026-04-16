# Hierarchical Projects & Interactive Web App Generation

## Vision

SOLON evolves from a single-iteration slide generator into a **hierarchical project system** where users can:

1. Generate multiple sets of slides across multiple iterations
2. Define semantic relationships between slides (parent-child, sibling, etc.)
3. Package all slides into an interactive web application that end users can explore

**Example User Journey:**
- **Iteration 1:** User generates slides for all German car manufacturers (Audi, BMW, Mercedes, etc.)
- **Iteration 2:** User generates slides for car models, linking each model to its manufacturer
- **Result:** End users browse the interactive app, click a manufacturer, and see all its models

---

## Core Concepts

### 1. Projects & Iterations

A **project** is a top-level container with a name and metadata. Each project can have multiple **iterations** (also called "rounds"), where each iteration represents one flow through the SOLON application.

```
Project: "German Automotive Database"
├── Iteration 1 (Manufacturers)
│   ├── Slide: Audi
│   ├── Slide: BMW
│   └── Slide: Mercedes
└── Iteration 2 (Models)
    ├── Slide: Audi A4
    ├── Slide: Audi A6
    ├── Slide: BMW 3 Series
    └── Slide: Mercedes C-Class
```

### 2. Slide Metadata

Each generated HTML slide carries **metadata** that describes:

- **Type:** What kind of content is this slide (e.g., "manufacturer", "model", "product")
- **Name:** Human-readable identifier (e.g., "Audi", "BMW 3 Series")
- **Parent Reference:** Link to a parent slide (e.g., "Audi A4" references parent "Audi")
- **Hierarchy Level:** Position in the content hierarchy (0 = root, 1 = child, etc.)
- **Custom Metadata:** User-defined key-value pairs for filtering/grouping

### 3. Slide Relationships

Slides can have **relationships** that define how they connect:

- **Parent-Child:** A slide belongs to another slide (e.g., model → manufacturer)
- **Sibling:** Slides at the same level (e.g., all manufacturers)
- **Related:** Generic reference to another slide
- **Sequence:** Order within a group (e.g., slide 1 of 5 models for Audi)

### 4. Output Structure

Instead of a single HTML file, the "Save Project" action creates:

```
german-automotive-database/
├── manifest.json                 # Project metadata & slide index
├── slides/
│   ├── audi.html
│   ├── bmw.html
│   ├── mercedes.html
│   ├── audi-a4.html
│   ├── audi-a6.html
│   ├── bmw-3-series.html
│   └── mercedes-c-class.html
└── assets/                       # (future) shared images, fonts, etc.
    └── (empty for now)
```

---

## User Experience Flow

### Complete Flow with Dedicated Hierarchy Step

The flow now includes a dedicated step for metadata and hierarchy definition:

```
Upload HTML
    ↓
Assign Zones
    ↓
Generate Recipe
    ↓
Apply Content
    ↓
Preview Slides
    ↓
[NEW] Define Hierarchy & Metadata  ← NEW DEDICATED STEP
    ↓
[Two Actions]
├─ "Generate More Content" → Save iteration, return to Upload
└─ "Package & Publish" → Save iteration, generate web app, download
```

### Step 5: Define Hierarchy & Metadata (New Step)

This step is **isolated and dedicated** to:
1. Assigning metadata to each slide (slideId, name, type, custom fields)
2. Defining parent-child relationships (hierarchy)
3. Visualizing the resulting hierarchy structure
4. Reviewing and confirming before saving

**Layout:**

```
┌─────────────────────────────────────────────────────────────────┐
│ Define Hierarchy & Metadata — Slide 1 of 3                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ [Left: Metadata Form]         [Right: Hierarchy Preview]        │
│                                                                 │
│ Slide ID: audi                ┌─ Hierarchy Preview ────────┐   │
│ Name: Audi                    │                            │   │
│ Type: [manufacturer ▼]        │ Root                       │   │
│ Parent: [None ▼]              │ ├─ Audi                    │   │
│                               │ │  ├─ A4 (pending)        │   │
│ Custom Metadata:              │ │  └─ A6 (pending)        │   │
│ country: Germany              │ ├─ BMW                     │   │
│ founded: 1909                 │ │  └─ 3 Series (pending)   │   │
│                               │ └─ Mercedes                │   │
│ [← Prev] [1/3] [Next →]      │    └─ C-Class (pending)   │   │
│                               └────────────────────────────┘   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ ← Back to preview  [Generate more content] [Package & Publish]  │
└─────────────────────────────────────────────────────────────────┘
```

### Navigation Between Steps

**From Preview Step:**
- User clicks "Next" (or "Continue to Hierarchy")
- Navigates to Hierarchy Definition step
- Preview is still accessible via "Back"

**From Hierarchy Definition Step:**
- **"Generate More Content":** Saves current iteration, returns to Flow Selector
- **"Package & Publish":** Saves current iteration, generates web app, downloads ZIP
- **"← Back to preview":** Returns to preview (no changes saved yet)

---

## Phase 1: Metadata-Enabled Slide Generation

This phase focuses on **capturing and managing metadata** without yet building the interactive web app.

### 1.1 Slide Metadata Schema

Each slide is embedded with metadata in a `<script type="application/json" id="solon-metadata">` tag:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <!-- Original template content -->
</head>
<body>
  <!-- Slide content -->
  
  <!-- Metadata: injected by Solon during patching -->
  <script type="application/json" id="solon-metadata">
  {
    "version": "1.0",
    "slideId": "audi-001",
    "name": "Audi",
    "type": "manufacturer",
    "hierarchyLevel": 0,
    "projectId": "german-automotive-database",
    "iterationId": "iteration-1",
    "sequenceNumber": 1,
    "sequenceTotal": 3,
    "parentSlideId": null,
    "customMetadata": {
      "country": "Germany",
      "founded": "1909"
    },
    "generatedAt": "2024-04-16T10:30:00Z"
  }
  </script>
</body>
</html>
```

**Metadata Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `version` | string | Yes | Metadata schema version (e.g., "1.0") |
| `slideId` | string | Yes | Unique identifier for this slide (user-defined) |
| `name` | string | Yes | Human-readable name (e.g., "Audi") |
| `type` | string | Yes | Semantic type (e.g., "manufacturer", "model", "product") |
| `hierarchyLevel` | number | Yes | Position in hierarchy (0 = root level) |
| `projectId` | string | Yes | Project this slide belongs to |
| `iterationId` | string | Yes | Iteration/round ID |
| `sequenceNumber` | number | Yes | Position in sequence (1-based) |
| `sequenceTotal` | number | Yes | Total slides in sequence |
| `parentSlideId` | string \| null | No | Reference to parent slide ID (if any) |
| `customMetadata` | object | No | User-defined key-value pairs |
| `generatedAt` | string | Yes | ISO 8601 timestamp |

### 1.2 Hierarchy Definition Step (New Dedicated Step)

This step appears **after preview** and **before the two action buttons**.

**Scenario 1: First Iteration (New Project)**

1. User completes recipe and reviews preview
2. User clicks "Next" or "Continue to Hierarchy"
3. **NEW:** Hierarchy Definition Step appears
4. For each slide, user can edit:
   - `slideId` (must be unique within project) — auto-suggested from content
   - `name` (human-readable) — auto-suggested
   - `type` (semantic type) — auto-suggested or user-selected
   - `customMetadata` (key-value pairs) — optional
5. `parentSlideId` is **not shown** (no parent slides exist yet)
6. Right panel shows hierarchy preview (flat list for first iteration)
7. User navigates through all slides using Previous/Next
8. Once satisfied, user clicks "Generate More Content" or "Package & Publish"

**Scenario 2: Subsequent Iteration (Adding to Project)**

1. User uploads new template and completes recipe step
2. App detects existing project and shows: "Add to [Project Name]?"
3. User confirms they want to add to existing project
4. User reviews preview and clicks "Next" or "Continue to Hierarchy"
5. **NEW:** Hierarchy Definition Step appears with **parent dropdown populated**
6. For each slide, user can edit:
   - `slideId`, `name`, `type` (same as Scenario 1)
   - **NEW:** `parentSlideId` (dropdown of existing slides from previous iterations)
   - `customMetadata`
7. When `parentSlideId` is set:
   - `hierarchyLevel` auto-set to 1 (or parent's level + 1)
   - Right panel updates to show hierarchy with new slide positioned under parent
8. User can see **real-time hierarchy preview** as they assign parents
9. App validates parent-child relationships (no circular refs, parent exists)
10. Once satisfied, user clicks "Generate More Content" or "Package & Publish"

### 1.3 Hierarchy Definition Step UI

**Full-Width Layout with Split Panels:**

```
┌──────────────────────────────────────────────────────────────────────┐
│ Define Hierarchy & Metadata — Slide 1 of 3                           │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ ┌─ Metadata Form ────────────┐  ┌─ Hierarchy Preview ────────────┐ │
│ │                            │  │                                │ │
│ │ Slide ID *                 │  │ Current Hierarchy:             │ │
│ │ [audi                    ] │  │                                │ │
│ │                            │  │ Root                           │ │
│ │ Name *                     │  │ ├─ Audi (editing)              │ │
│ │ [Audi                    ] │  │ │  ├─ A4 (pending)             │ │
│ │                            │  │ │  └─ A6 (pending)             │ │
│ │ Type *                     │  │ ├─ BMW                         │ │
│ │ [manufacturer          ▼] │  │ │  └─ 3 Series (pending)        │ │
│ │                            │  │ └─ Mercedes                    │ │
│ │ Parent Slide               │  │    └─ C-Class (pending)        │ │
│ │ [None                   ▼] │  │                                │ │
│ │ (Audi, BMW, Mercedes)      │  │ Legend:                        │ │
│ │                            │  │ ✓ = confirmed                 │ │
│ │ Custom Metadata:           │  │ ◐ = editing                   │ │
│ │ country: [Germany       ]  │  │ ○ = pending                   │ │
│ │ founded: [1909          ]  │  │                                │ │
│ │ [+ Add field]              │  │                                │ │
│ │                            │  │                                │ │
│ └────────────────────────────┘  └────────────────────────────────┘ │
│                                                                      │
│ ← Previous  [1 / 3]  Next →                                         │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│ ← Back to preview  [Generate more content] [Package & Publish]       │
└──────────────────────────────────────────────────────────────────────┘
```

**Hierarchy Preview Panel Features:**

1. **Visual Tree Structure:**
   - Shows all slides in hierarchy
   - Indentation indicates parent-child relationships
   - Currently editing slide highlighted with ◐ icon
   - Confirmed slides marked with ✓
   - Pending slides (not yet edited) marked with ○

2. **Color Coding (Optional):**
   - Green: confirmed (metadata complete)
   - Blue: currently editing
   - Gray: pending (not yet edited)

3. **Real-Time Updates:**
   - As user edits metadata and sets parent, hierarchy preview updates immediately
   - User can see exactly how their hierarchy is forming

4. **Collapse/Expand (Optional):**
   - User can expand/collapse parent nodes to see children
   - Helps with deep hierarchies

**Navigation within step:**
- Previous/Next buttons move between slides
- All changes auto-saved per slide
- User can navigate back to preview without losing changes
- Changes only persisted to disk when "Generate More Content" or "Package & Publish" is clicked

### 1.4 Metadata Persistence & Project Creation

**When user clicks "Generate More Content":**

1. App validates all metadata (unique slideIds, valid parents, etc.)
2. App collects metadata for all slides from the Hierarchy Definition step
3. Metadata is injected into each HTML slide via `<script type="application/json">` tag
4. Each slide is saved as a separate file in `project-name/slides/` folder
5. `manifest.json` is created/updated with project-level metadata and slide index
6. User is returned to Flow Selector (to start next iteration)
7. **NEW:** Project ID is stored in browser session/localStorage so next iteration knows which project to add to

**When user clicks "Package & Publish":**

1. App validates all metadata (unique slideIds, valid parents, etc.)
2. App collects metadata for all slides from the Hierarchy Definition step
3. Metadata is injected into each HTML slide
4. Each slide is saved in `project-name/slides/` folder
5. `manifest.json` is created/updated
6. **NEW:** Web app is automatically generated in `project-name/app/` folder
7. **NEW:** A `README.md` is created with project information
8. Download dialog appears: "Download [Project Name] as ZIP"
9. User can download the entire folder as ZIP or close dialog
10. Session is cleared (project complete)

**manifest.json structure:**

```json
{
  "version": "1.0",
  "projectId": "german-automotive-database",
  "projectName": "German Automotive Database",
  "projectMetadata": {
    "description": "Comprehensive database of German car manufacturers and models",
    "version": "1.0",
    "createdAt": "2024-04-16T10:00:00Z",
    "updatedAt": "2024-04-16T11:30:00Z"
  },
  "iterations": [
    {
      "iterationId": "iteration-1",
      "iterationName": "Manufacturers",
      "type": "manufacturer",
      "slideCount": 3,
      "createdAt": "2024-04-16T10:30:00Z",
      "slides": [
        {
          "slideId": "audi",
          "name": "Audi",
          "type": "manufacturer",
          "hierarchyLevel": 0,
          "sequenceNumber": 1,
          "sequenceTotal": 3,
          "fileName": "audi.html",
          "parentSlideId": null,
          "customMetadata": {
            "country": "Germany",
            "founded": "1909"
          }
        },
        {
          "slideId": "bmw",
          "name": "BMW",
          "type": "manufacturer",
          "hierarchyLevel": 0,
          "sequenceNumber": 2,
          "sequenceTotal": 3,
          "fileName": "bmw.html",
          "parentSlideId": null,
          "customMetadata": {
            "country": "Germany",
            "founded": "1916"
          }
        },
        {
          "slideId": "mercedes",
          "name": "Mercedes",
          "type": "manufacturer",
          "hierarchyLevel": 0,
          "sequenceNumber": 3,
          "sequenceTotal": 3,
          "fileName": "mercedes.html",
          "parentSlideId": null,
          "customMetadata": {
            "country": "Germany",
            "founded": "1926"
          }
        }
      ]
    }
  ],
  "slideIndex": {
    "audi": {
      "iterationId": "iteration-1",
      "fileName": "audi.html",
      "type": "manufacturer"
    },
    "bmw": {
      "iterationId": "iteration-1",
      "fileName": "bmw.html",
      "type": "manufacturer"
    },
    "mercedes": {
      "iterationId": "iteration-1",
      "fileName": "mercedes.html",
      "type": "manufacturer"
    }
  }
}
```

---

## Phase 2: Automatic Project Linking (Integrated into Phase 1)

This phase is **integrated into Phase 1** — users automatically link iterations when they click "Generate More Content".

### 2.1 Multi-Iteration Projects

**Current behavior:**
```
Flow 1 → chainId: chain-uuid-1 → output: output-uuid-1.html
Flow 2 → chainId: chain-uuid-2 → output: output-uuid-2.html
```

**New behavior:**
```
Project: "German Automotive Database" (folder on disk)
├── Iteration 1 (chainId: chain-uuid-1)
│   └── output: output-uuid-1.html → slides/audi.html, slides/bmw.html, ...
└── Iteration 2 (chainId: chain-uuid-2)
    └── output: output-uuid-2.html → slides/audi-a4.html, slides/bmw-3-series.html, ...
```

### 2.2 Automatic Linking Workflow

**Scenario:** User completes Iteration 1 (Manufacturers), then starts Iteration 2 (Models).

**Step 1: User completes Iteration 1**
1. User uploads template, assigns zones, generates recipe, applies content
2. In HtmlPreviewStep, user reviews slides
3. User clicks "Next" or "Continue to Hierarchy"
4. **NEW:** Hierarchy Definition Step appears
5. User assigns metadata to each slide (slideId, name, type, customMetadata)
6. Hierarchy preview shows flat list (no parents yet)
7. User navigates through all slides
8. User clicks "Generate More Content" or "Package & Publish"
9. **If "Generate More Content":** Project saved, user returned to Flow Selector
10. **If "Package & Publish":** Project complete, web app generated, download offered

**Step 2: User starts Iteration 2 (new template)**
1. User uploads new template (car models)
2. App detects project in session: "Continue with [German Automotive Database]?"
3. User confirms (or can start new project)
4. User assigns zones and generates recipe
5. In HtmlPreviewStep, user reviews slides
6. User clicks "Next" or "Continue to Hierarchy"
7. **NEW:** Hierarchy Definition Step appears with **parent dropdown populated**
8. Hierarchy preview shows existing slides from Iteration 1
9. For each new slide, user can:
   - Edit metadata (slideId, name, type, customMetadata)
   - Select parent from Iteration 1 (e.g., "Audi A4" → parent "audi")
10. Hierarchy preview updates in real-time as user assigns parents
11. User navigates through all slides
12. User clicks "Generate More Content" or "Package & Publish"
13. Iteration 2 is appended to project
14. If "Package & Publish": Web app is regenerated with all iterations

### 2.3 Parent-Child Validation

When user saves a project with parent references:

1. **Validation:** Ensure all `parentSlideId` values exist in manifest
2. **Validation:** Prevent circular references (A → B → C → A)
3. **Validation:** Warn if parent and child types seem incompatible (optional)

### 2.4 Manifest Updates

When saving a new iteration to an existing project:

1. Append new iteration to `manifest.json`
2. Update `slideIndex` with new slides
3. Update `projectMetadata.updatedAt`
4. If "Package & Publish": Regenerate web app

```json
{
  "version": "1.0",
  "projectId": "german-automotive-database",
  "iterations": [
    { /* Iteration 1: Manufacturers */ },
    {
      "iterationId": "iteration-2",
      "iterationName": "Models",
      "type": "model",
      "slideCount": 4,
      "createdAt": "2024-04-16T11:00:00Z",
      "slides": [
        {
          "slideId": "audi-a4",
          "name": "Audi A4",
          "type": "model",
          "hierarchyLevel": 1,
          "sequenceNumber": 1,
          "sequenceTotal": 2,
          "fileName": "audi-a4.html",
          "parentSlideId": "audi",
          "customMetadata": {
            "manufacturer": "Audi",
            "class": "Compact Executive"
          }
        },
        {
          "slideId": "audi-a6",
          "name": "Audi A6",
          "type": "model",
          "hierarchyLevel": 1,
          "sequenceNumber": 2,
          "sequenceTotal": 2,
          "fileName": "audi-a6.html",
          "parentSlideId": "audi",
          "customMetadata": {
            "manufacturer": "Audi",
            "class": "Executive"
          }
        }
      ]
    }
  ]
}
```

---

## Phase 2b: Interactive Web App Generator (Automatic on "Package & Publish")

This phase builds the interactive web application that is **automatically generated** when user clicks "Package & Publish".

### 2b.1 Web App Architecture

The generated web app is a **single-page application (SPA)** that:

1. Reads the `manifest.json`
2. Displays a navigation structure (hierarchy tree, list, cards, etc.)
3. Loads and displays slides in an iframe or embedded viewer
4. Provides search, filtering, and navigation

**Output structure:**

```
german-automotive-database/
├── manifest.json                 # Project index
├── README.md                     # Project info & usage
├── slides/
│   ├── audi.html
│   ├── bmw.html
│   ├── audi-a4.html
│   └── ...
├── app/                          # Interactive web app (auto-generated)
│   ├── index.html               # Entry point
│   ├── app.js                   # SPA logic
│   ├── styles.css               # Styling
│   └── manifest.json            # Copy of manifest (for client)
└── assets/                       # (future) shared images, fonts, etc.
    └── (empty for now)
```

### 2b.2 Web App Features

**Navigation:**
- Hierarchical tree view (show manufacturers, expand to see models)
- Flat list view (all slides)
- Card grid view (thumbnails)
- Search by slide name or custom metadata

**Slide Viewer:**
- Display selected slide in an iframe
- Show slide metadata in a sidebar
- Navigation: Previous/Next slide (within same type or globally)
- Breadcrumb: Parent → Current slide

**Filtering:**
- Filter by type (e.g., show only manufacturers)
- Filter by hierarchy level
- Filter by custom metadata (e.g., only German manufacturers)

**Metadata Display:**
- Show slide metadata in sidebar
- Display parent/child relationships
- Show related slides

### 2b.3 Web App Generation (Internal)

When user clicks "Package & Publish":

1. All iterations are saved to project folder
2. **Automatic:** `generateWebApp(projectPath)` is called
3. Web app files are created in `app/` folder
4. `app/manifest.json` is populated with slide index
5. Web app is ready to use immediately

**No external API call needed** — web app generation is internal server logic, not exposed as HTTP endpoint.

---

## API Changes & New Endpoints

### Modified Endpoints

#### `POST /api/html-flow/apply-content`

**Response change:** Include slide count (no change to structure)

```json
{
  "ok": true,
  "roundId": "uuid",
  "outputFile": "output-uuid.html",
  "previewHtml": "...",
  "slideCount": 3
}
```

#### `POST /api/html-flow/save-iteration` (NEW)

Saves a single iteration and optionally generates web app.

**Request:**

```json
{
  "chainId": "chain-uuid",
  "projectName": "German Automotive Database",
  "projectId": "german-automotive-database",  // null for first iteration
  "action": "save-and-continue",              // or "save-and-publish"
  "slides": [
    {
      "index": 0,
      "slideId": "audi",
      "name": "Audi",
      "type": "manufacturer",
      "hierarchyLevel": 0,
      "parentSlideId": null,
      "customMetadata": {
        "country": "Germany",
        "founded": "1909"
      }
    },
    {
      "index": 1,
      "slideId": "bmw",
      "name": "BMW",
      "type": "manufacturer",
      "hierarchyLevel": 0,
      "parentSlideId": null,
      "customMetadata": {
        "country": "Germany",
        "founded": "1916"
      }
    }
  ]
}
```

**Response:**

```json
{
  "ok": true,
  "projectId": "german-automotive-database",
  "projectPath": "/path/to/german-automotive-database",
  "projectName": "German Automotive Database",
  "iterationCount": 1,
  "slideCount": 2,
  "action": "save-and-continue",
  "downloadUrl": null,
  "appPath": null
}
```

**Response (when action = "save-and-publish"):**

```json
{
  "ok": true,
  "projectId": "german-automotive-database",
  "projectPath": "/path/to/german-automotive-database",
  "projectName": "German Automotive Database",
  "iterationCount": 1,
  "slideCount": 2,
  "action": "save-and-publish",
  "downloadUrl": "/api/html-flow/download-project/german-automotive-database",
  "appPath": "/path/to/german-automotive-database/app/index.html"
}
```

### New Endpoints

#### `GET /api/html-flow/download-project/:projectId`

Downloads the entire project folder as a ZIP file.

```
GET /api/html-flow/download-project/german-automotive-database
→ german-automotive-database.zip
```

#### `GET /api/html-flow/project/:projectId`

Get project metadata (for "Continue with project?" prompt).

**Response:**

```json
{
  "ok": true,
  "projectId": "german-automotive-database",
  "projectName": "German Automotive Database",
  "iterationCount": 2,
  "slideCount": 7,
  "lastUpdated": "2024-04-16T11:30:00Z",
  "slides": [
    {
      "slideId": "audi",
      "name": "Audi",
      "type": "manufacturer",
      "hierarchyLevel": 0
    },
    {
      "slideId": "bmw",
      "name": "BMW",
      "type": "manufacturer",
      "hierarchyLevel": 0
    }
  ]
}
```

---

## Data Model Changes

### Chain.json (Project-Level)

Add fields to support iterations and metadata:

```json
{
  "id": "chain-uuid-1",
  "flow": "html",
  "projectName": "German Automotive Database",
  "projectId": "german-automotive-database",
  "iterationName": "Manufacturers",
  "templateFile": "manufacturers.html",
  "templatePath": "/path/to/template.html",
  "slideCount": 3,
  "createdAt": "2024-04-16T10:30:00Z",
  "updatedAt": "2024-04-16T10:30:00Z",
  "selections": [...],
  "zones": [...],
  "repeatableSlides": [...],
  "fullSlideGeneration": [...],
  "trees": [...],
  "rounds": [
    {
      "id": "round-uuid-1",
      "appliedAt": "2024-04-16T10:30:00Z",
      "outputFile": "output-uuid-1.html",
      "jsonInput": "...",
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
  ]
}
```

### Manifest.json (Project-Wide)

```json
{
  "version": "1.0",
  "projectId": "german-automotive-database",
  "projectName": "German Automotive Database",
  "projectMetadata": {
    "description": "...",
    "version": "1.0",
    "createdAt": "2024-04-16T10:00:00Z",
    "updatedAt": "2024-04-16T11:30:00Z"
  },
  "iterations": [
    {
      "iterationId": "iteration-1",
      "iterationName": "Manufacturers",
      "type": "manufacturer",
      "slideCount": 3,
      "createdAt": "2024-04-16T10:30:00Z",
      "slides": [...]
    },
    {
      "iterationId": "iteration-2",
      "iterationName": "Models",
      "type": "model",
      "slideCount": 4,
      "createdAt": "2024-04-16T11:00:00Z",
      "slides": [...]
    }
  ],
  "slideIndex": {
    "audi": { "iterationId": "iteration-1", "fileName": "audi.html", "type": "manufacturer" },
    "bmw": { "iterationId": "iteration-1", "fileName": "bmw.html", "type": "manufacturer" },
    "audi-a4": { "iterationId": "iteration-2", "fileName": "audi-a4.html", "type": "model" }
  }
}
```

---

## Implementation Roadmap

### Phase 1: Metadata & Hierarchy Definition Step (Priority: HIGH)

**Week 1: Core Infrastructure**
- [ ] Define metadata schema and JSON structure
- [ ] Update `html-patcher.js` to inject metadata into generated slides
- [ ] Create HierarchyDefinitionStep component (new step)
- [ ] Implement metadata form (slideId, name, type, customMetadata)
- [ ] Implement hierarchy preview panel (tree visualization)
- [ ] Add validation logic (unique slideId, no circular parent refs)

**Week 2: Step Integration & Navigation**
- [ ] Integrate HierarchyDefinitionStep into flow (after preview, before actions)
- [ ] Add "Next" button to HtmlPreviewStep
- [ ] Add "Back to preview" button to HierarchyDefinitionStep
- [ ] Implement slide navigation (Previous/Next within hierarchy step)
- [ ] Real-time hierarchy preview updates as user edits
- [ ] Add form validation and error messages

**Week 3: Backend & Persistence**
- [ ] Create `save-iteration` endpoint
- [ ] Implement folder structure creation (project folder + slides/ subdirectory)
- [ ] Create `manifest.json` generation logic
- [ ] Add project session tracking (localStorage/browser session)
- [ ] Implement `download-project` endpoint (ZIP file)
- [ ] Add E2E tests for complete flow (hierarchy definition → save → download)

### Phase 2: Multi-Iteration Linking (Priority: HIGH, integrated into Phase 1)

**Week 4: Project Continuation & Parent Selection**
- [ ] Implement "Continue with [Project Name]?" prompt in FlowSelectStep
- [ ] Create `project/:projectId` endpoint (get project metadata)
- [ ] Load existing project slides for parent dropdown in hierarchy step
- [ ] Populate parent dropdown with existing slides from previous iterations
- [ ] Validate parent-child relationships (no circular refs, parent exists)
- [ ] Update manifest when adding new iteration

**Week 5: Hierarchy Preview for Multi-Iteration**
- [ ] Enhance hierarchy preview to show existing slides from previous iterations
- [ ] Show new slides being added with pending status
- [ ] Real-time preview updates as user assigns parent slides
- [ ] Visual distinction between confirmed and pending slides
- [ ] Add collapse/expand for deep hierarchies

**Week 6: Web App Generation & Testing**
- [ ] Implement automatic web app generation on "Package & Publish"
- [ ] Create `app/index.html`, `app/app.js`, `app/styles.css`
- [ ] Add E2E tests for multi-iteration projects
- [ ] Test parent-child linking and circular reference prevention
- [ ] Test web app regeneration
- [ ] Polish UX: loading states, error messages, confirmations

### Phase 3: Web App Features (Priority: MEDIUM)

**Week 7-8: Interactive Features**
- [ ] Implement hierarchical tree view navigation
- [ ] Implement flat list view
- [ ] Implement card grid view
- [ ] Add search functionality
- [ ] Add filtering (by type, hierarchy level, custom metadata)
- [ ] Add breadcrumb navigation
- [ ] Add metadata sidebar display
- [ ] Add E2E tests for web app features

---

## Security & Validation

### Input Validation

- **slideId:** Must be alphanumeric + hyphens, 1-100 chars, unique within project
- **name:** 1-255 chars, no special HTML characters
- **type:** Predefined list (e.g., "manufacturer", "model", "product")
- **parentSlideId:** Must exist in manifest, no circular references
- **customMetadata:** Max 50 key-value pairs, keys/values max 255 chars each

### Path Security

- All file paths must be within the project directory
- Use `isInsideDir()` check (existing security function)
- Sanitize project folder names

### File Size Limits

- Single slide HTML: 5MB (existing limit)
- Manifest.json: 10MB
- Custom metadata per slide: 100KB
- Project folder: 500MB

---

## User Experience: Complete Journey

### Scenario 1: First Iteration (Create New Project)

**Step 1: Upload & Zones**
- User uploads manufacturer template
- Assigns zones (company name, logo, description, etc.)

**Step 2: Recipe & Content**
- App generates recipe prompt
- User pastes AI response (JSON with content for 3 manufacturers)

**Step 3: Preview**
- User reviews 3 slides in preview
- User clicks "Next" or "Continue to Hierarchy"

**Step 4: Define Hierarchy & Metadata (NEW)**
- **NEW:** Dedicated step for metadata and hierarchy definition
- Left panel shows metadata form for Slide 1 (Audi)
- Right panel shows hierarchy preview (flat list for first iteration):
  ```
  Root
  ├─ Audi (◐ editing)
  ├─ BMW (○ pending)
  └─ Mercedes (○ pending)
  ```
- User edits metadata for Slide 1:
  - slideId: "audi"
  - name: "Audi"
  - type: "manufacturer"
  - customMetadata: country="Germany", founded="1909"
- User clicks "Next" to move to Slide 2
- Hierarchy preview updates with ◐ on Audi, ○ on others
- User edits Slide 2 (BMW) and Slide 3 (Mercedes)
- Once all slides edited, user reviews hierarchy preview
- User clicks "Generate More Content" or "Package & Publish"

**Step 5: Action Choice**
- If user clicked "Generate More Content":
  - All metadata validated
  - Iteration saved to `german-automotive-database/slides/`
  - Manifest created
  - User returned to Flow Selector
  - Project ID stored in session
- If user clicked "Package & Publish":
  - All metadata validated
  - Iteration saved to `german-automotive-database/slides/`
  - Manifest created
  - Web app auto-generated in `german-automotive-database/app/`
  - Download dialog appears
  - User downloads ZIP
  - Session cleared (project complete)

### Scenario 2: Second Iteration (Add to Existing Project)

**Step 1: Flow Selection**
- User starts SOLON again
- **NEW:** Prompt appears: "Continue with 'German Automotive Database'?" [Yes] [No]
- User clicks Yes
- Project ID loaded from session

**Step 2: Upload & Zones**
- User uploads car models template
- Assigns zones (manufacturer, model name, price, specs, etc.)

**Step 3: Recipe & Content**
- App generates recipe prompt
- User pastes AI response (JSON with 4 models: 2 Audi, 1 BMW, 1 Mercedes)

**Step 4: Preview**
- User reviews 4 slides
- User clicks "Next" or "Continue to Hierarchy"

**Step 5: Define Hierarchy & Metadata (NEW - with parent linking)**
- **NEW:** Hierarchy Definition Step appears with parent dropdown populated
- Left panel shows metadata form for Slide 1 (Audi A4)
- Right panel shows hierarchy preview with existing slides:
  ```
  Root
  ├─ Audi ✓
  │  └─ A4 (◐ editing)
  ├─ BMW ✓
  │  └─ 3 Series (○ pending)
  └─ Mercedes ✓
     └─ C-Class (○ pending)
  ```
- User edits metadata for Slide 1:
  - slideId: "audi-a4"
  - name: "Audi A4"
  - type: "model"
  - **NEW:** Parent Slide: [audi ▼] (dropdown shows existing slides)
  - customMetadata: class="Compact Executive"
- Hierarchy preview updates in real-time:
  ```
  Root
  ├─ Audi ✓
  │  └─ A4 (◐ editing)
  ├─ BMW ✓
  │  └─ 3 Series (○ pending)
  └─ Mercedes ✓
     └─ C-Class (○ pending)
  ```
- User clicks "Next" to move to Slide 2 (Audi A6)
- Sets parent: "audi"
- Hierarchy preview shows both A4 and A6 under Audi
- User continues through Slides 3 and 4, setting parents
- Final hierarchy preview:
  ```
  Root
  ├─ Audi ✓
  │  ├─ A4 ✓
  │  └─ A6 ✓
  ├─ BMW ✓
  │  └─ 3 Series ✓
  └─ Mercedes ✓
     └─ C-Class ✓
  ```
- User reviews and clicks "Generate More Content" or "Package & Publish"

**Step 6: Action Choice**
- If user clicked "Generate More Content":
  - Iteration 2 appended to manifest
  - User can start another iteration (e.g., features for each model)
- If user clicked "Package & Publish":
  - Iteration 2 appended to manifest
  - Web app regenerated with all 7 slides + hierarchy
  - Download dialog appears
  - Project complete

### Result: Interactive Web App

User downloads `german-automotive-database.zip` and extracts it:

```
german-automotive-database/
├── README.md                    # How to use the app
├── manifest.json                # Project index
├── slides/
│   ├── audi.html
│   ├── bmw.html
│   ├── mercedes.html
│   ├── audi-a4.html
│   ├── audi-a6.html
│   ├── bmw-3-series.html
│   └── mercedes-c-class.html
└── app/
    ├── index.html               # Open this in browser
    ├── app.js                   # SPA logic
    ├── styles.css               # Styling
    └── manifest.json            # Embedded manifest
```

End user opens `app/index.html` in browser and sees:
- Tree view: "Manufacturers" → expand → see "Models" under each
- Click "Audi" → see Audi slide
- Click "Audi A4" → see A4 slide with parent breadcrumb
- Search: find "A4" across all slides
- Filter: show only "model" type slides

---

## UI/UX Details

### Preview Step Layout (New)

**Before: Current Layout**
```
┌─────────────────────────────────────────────────┐
│ [Project Name] — Content applied — review and download
├─────────────────────────────────────────────────┤
│                                                 │
│  [Preview iframe]                               │
│                                                 │
│ Slide 1 / 3                                     │
│ ← [prev]  [next] →                              │
│                                                 │
├─────────────────────────────────────────────────┤
│ ← Back to recipe  [Download HTML] [Start new]   │
└─────────────────────────────────────────────────┘
```

**After: New Layout**
```
┌─────────────────────────────────────────────────┐
│ [Project Name] — Review and Package
├─────────────────────────────────────────────────┤
│                                                 │
│  [Preview iframe]                               │
│                                                 │
│ Slide 1 / 3                                     │
│ ← [prev]  [next] →                              │
│                                                 │
├─────────────────────────────────────────────────┤
│ ← Back to recipe  [Generate more content] [Package & Publish] │
└─────────────────────────────────────────────────┘
```

### Metadata Modal (New Component)

```
┌─────────────────────────────────────────────────────────────┐
│ Assign Metadata — Slide 1 of 3                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Slide ID *                                                  │
│ [audi                                                    ]   │
│                                                             │
│ Name *                                                      │
│ [Audi                                                    ]   │
│                                                             │
│ Type *                                                      │
│ [manufacturer ▼]                                            │
│   - manufacturer                                            │
│   - model                                                   │
│   - product                                                 │
│   - feature                                                 │
│   - custom...                                               │
│                                                             │
│ Parent Slide                                                │
│ [None ▼]                                                    │
│ (Only shown if slides from previous iterations exist)       │
│                                                             │
│ Custom Metadata                                             │
│ country: [Germany                                        ]   │
│ founded: [1909                                          ]   │
│ [+ Add field]                                               │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ← Previous  |  Next →  |  Save & Continue              │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Project Continuation Prompt (New)

Shown in FlowSelectStep when project exists in session:

```
┌─────────────────────────────────────────────────────────────┐
│ Continue with existing project?                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Project: German Automotive Database                         │
│ Iterations: 1 (Manufacturers)                               │
│ Slides: 3                                                   │
│ Last updated: 2024-04-16 10:30 AM                           │
│                                                             │
│ [Yes, continue] [No, start new project]                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Download Dialog (New)

Shown after "Package & Publish" is complete:

```
┌─────────────────────────────────────────────────────────────┐
│ Project Ready!                                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ✓ Project "German Automotive Database" has been packaged    │
│                                                             │
│ Your project is ready with:                                 │
│ • 3 slides from Iteration 1 (Manufacturers)                 │
│ • Interactive web app for browsing                          │
│ • Metadata for each slide                                   │
│                                                             │
│ [Download as ZIP] [Start new project]                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Testing Strategy

### Unit Tests

- Metadata validation (slideId uniqueness, parent references, circular checks)
- Manifest generation and structure
- Folder creation and file writing
- Parent-child relationship validation

### E2E Tests

- Complete flow: upload → zones → recipe → apply → metadata → save
- Multi-iteration: save first project, add to existing project
- Metadata editing: change slideId, name, type, parent, custom fields
- Project folder structure: verify all files created
- Download as ZIP: verify contents

### Integration Tests

- Save project → load manifest → verify all slides present
- Add to existing project → verify manifest updated correctly
- Web app generation → verify app loads and displays slides

---

## Backward Compatibility

### Existing Projects

Existing projects (without metadata) can still be downloaded as single HTML files. The new "Save Project" action is opt-in.

### Existing API Endpoints

The old `GET /api/html-flow/download/:chainId/:file` endpoint remains unchanged for backward compatibility with existing integrations.

---

## Future Enhancements

### Post-Phase 3

1. **Slide Thumbnails:** Generate and display thumbnail images of each slide
2. **Search & Indexing:** Full-text search across slide content
3. **Export Formats:** Export project as PDF, PowerPoint, etc.
4. **Collaboration:** Share projects, comment on slides
5. **Version Control:** Track changes, revert to previous versions
6. **Analytics:** Track which slides are viewed most, time spent, etc.
7. **Custom Themes:** Allow users to customize web app appearance
8. **Slide Templates:** Reusable slide templates with predefined metadata
9. **API for External Tools:** Allow external tools to read/write manifest

---

## Glossary

| Term | Definition |
|------|-----------|
| **Project** | Top-level container for all iterations and slides |
| **Iteration** | One complete flow through SOLON (upload → zones → recipe → apply) |
| **Slide** | Individual HTML file generated from a repeatable section |
| **Metadata** | Descriptive information about a slide (name, type, parent, custom fields) |
| **Manifest** | Project-wide index of all iterations and slides |
| **Hierarchy Level** | Position in content hierarchy (0 = root, 1 = child, etc.) |
| **Parent Slide** | Slide that a child slide belongs to |
| **Custom Metadata** | User-defined key-value pairs for filtering/grouping |
| **Web App** | Interactive SPA for browsing slides |

---

## Questions & Open Items

1. **Metadata Types:** Should we have a predefined list of slide types, or allow any string?
   - **Recommendation:** Predefined list with custom option (e.g., "manufacturer", "model", "product", or custom)

2. **Hierarchy Depth:** Should we support deep hierarchies (grandparent → parent → child), or limit to 2 levels?
   - **Recommendation:** Support unlimited depth, but UI should handle deep nesting gracefully

3. **Slide Ordering:** Should slides be ordered by sequence number or by folder/file name?
   - **Recommendation:** Manifest defines order; file system order is ignored

4. **Web App Hosting:** Should SOLON generate a static web app (files only) or provide hosting?
   - **Recommendation:** Phase 1 = static files only; Phase 2+ = optional hosting

5. **Metadata Inheritance:** Should child slides inherit parent's custom metadata?
   - **Recommendation:** No automatic inheritance; explicit assignment only

6. **Slide Deletion:** Can users delete slides from a saved project?
   - **Recommendation:** Yes, but with confirmation; update manifest accordingly

7. **Slide Re-ordering:** Can users reorder slides within an iteration?
   - **Recommendation:** Yes, via manifest editing or UI; update sequenceNumber

8. **Type Validation:** Should parent-child relationships enforce type compatibility (e.g., only "model" can be child of "manufacturer")?
   - **Recommendation:** Optional validation rules, configurable per project

---

## References

- Current Preview Step: `client/src/steps/HtmlPreviewStep.jsx`
- Current Download Endpoint: `server/routes/html-flow.js:696`
- Current Apply-Content Endpoint: `server/routes/html-flow.js:631`
- Patcher: `server/lib/html-patcher.js`
- Recipe Builder: `server/lib/html-recipe-builder.js`
