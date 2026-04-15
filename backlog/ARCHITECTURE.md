# Current Architecture

**Last Updated**: 2026-04-15  
**Relevant Links**: [TECHNICAL_DEBT.md](./TECHNICAL_DEBT.md), [INFRASTRUCTURE.md](./INFRASTRUCTURE.md)

---

## Tech Stack

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| Frontend | React | 18.x | Hooks-based, no Redux yet |
| Build | Vite | 4.x | Fast dev server, excellent HMR |
| Testing (Unit) | Vitest | 2.x | Fast, Jest-compatible |
| Testing (E2E) | Playwright | 1.59+ | Excellent for browser testing |
| Backend | Node.js + Express | 18.x / 4.18+ | Lightweight, good for this scope |
| HTML Parsing | node-html-parser | 7.1+ | Good performance, small footprint |
| Styling | CSS (in-file) | - | Design tokens, dark theme |
| Fonts | Geist + JetBrains Mono | - | Google Fonts, loaded from CDN |
| Editor | CodeMirror | 6.x | Syntax highlighting, code editing |
| State | React Hooks | - | useState, useCallback, useMemo |

---

## Directory Structure

```
SOLON/
├── backlog/                    # Development backlog (this folder)
│   ├── README.md              # Backlog overview
│   ├── ROADMAP.md             # 6-phase product roadmap
│   ├── PRIORITIZED_FEATURES.md # Next-sprint features
│   ├── TECHNICAL_DEBT.md      # Known issues & debt
│   ├── PERFORMANCE.md         # Optimization opportunities
│   ├── IDEAS.md               # Long-term vision items
│   ├── ARCHITECTURE.md        # This file
│   └── INFRASTRUCTURE.md      # DevOps & deployment
│
├── client/                     # React frontend
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   │   ├── AppHeader.jsx
│   │   │   ├── Breadcrumbs.jsx
│   │   │   ├── DebugContextModal.jsx
│   │   │   ├── DebugContextModal.jsx
│   │   │   ├── ErrorBoundary.jsx
│   │   │   ├── HtmlEditorPanel.jsx
│   │   │   ├── HtmlTreePanel.jsx
│   │   │   └── Toast.jsx
│   │   ├── steps/             # Page-level step components
│   │   │   ├── FlowSelectStep.jsx
│   │   │   ├── HtmlUploadStep.jsx
│   │   │   ├── HtmlRecipeStep.jsx
│   │   │   └── HtmlPreviewStep.jsx
│   │   ├── utils/             # Helpers & hooks
│   │   │   ├── mergeZoneEdits.js
│   │   │   └── useFocusTrap.js
│   │   ├── index.css          # Global styles + design tokens
│   │   ├── App.jsx            # Main app router
│   │   └── main.jsx           # React entry point
│   ├── index.html             # HTML entry point
│   ├── package.json
│   ├── vite.config.js
│   └── eslint.config.js
│
├── server/                     # Express backend
│   ├── __tests__/             # Unit tests
│   │   ├── selections-to-zones.test.js
│   │   ├── html-recipe-builder.test.js
│   │   ├── build-tree.test.js
│   │   ├── html-patcher.test.js
│   │   └── html-flow.test.js
│   ├── index.js               # Express app setup
│   ├── routes/
│   │   └── html-flow.js       # HTML Visual Flow endpoints
│   ├── utils/
│   │   ├── selections-to-zones.js
│   │   ├── html-recipe-builder.js
│   │   ├── build-tree.js
│   │   ├── html-patcher.js
│   │   └── (other helpers)
│   └── package.json
│
├── e2e/                        # Playwright E2E tests
│   ├── html-flow.spec.js      # Main workflow tests
│   ├── html-breadcrumbs.spec.js
│   ├── html-clear-all.spec.js
│   ├── html-editor.spec.js
│   ├── html-preview-step.spec.js
│   └── html-repeatable.spec.js
│
├── docs/                       # Documentation
│   ├── SPEC-visual-flow.md    # Architecture & zone model
│   └── SPEC-repeatable-slides.md
│
├── .impeccable.md             # Design system & accessibility
├── backlog.md                 # Old backlog (deprecated, use backlog/ folder)
├── .gitignore
├── .env.example
└── README.md (to be created)
```

---

## Key Components

### Frontend Components

#### FlowSelectStep
- Displays flow selector (PPTX vs HTML)
- Routes to appropriate flow

#### HtmlUploadStep
- File upload zone
- DOM tree panel (HtmlTreePanel)
- Zone assignment UI
- Project creation
- HTML editor (HtmlEditorPanel)

#### HtmlTreePanel
- Renders DOM tree with interactive nodes
- Zone assignment panel (AssignmentPanel)
- Slide control bar (SlideControlBar)
- Visual zone badges
- Tree navigation

#### HtmlEditorPanel
- CodeMirror editor
- Live preview iframe
- Apply/Reset buttons
- Validation warnings

#### HtmlRecipeStep
- Display generated recipe
- JSON input area
- Validation feedback
- Copy/paste workflow

#### HtmlPreviewStep
- Multi-slide preview iframe
- Scroll-snap navigation
- Slide counter
- Download options

#### DebugContextModal
- JSON state snapshot
- Copy to clipboard
- Include/exclude toggles

---

### Backend Routes

#### POST /api/html-flow/upload-template
**Request**: Multipart form with HTML file  
**Response**: `{ ok, templateId, slideCount, trees, selections, previewHtml, violations }`  
**Logic**: Parse HTML, extract DOM tree, detect pre-assigned zones

#### PATCH /api/html-flow/update-selections
**Request**: `{ templateId, selections }`  
**Response**: `{ ok, selections }`  
**Logic**: Persist zone edits in memory

#### POST /api/html-flow/create-project
**Request**: `{ templateId, projectName, selections, repeatableSlides }`  
**Response**: `{ ok, chainId, projectName, zones }`  
**Logic**: Create project, derive zones, write chain.json

#### POST /api/html-flow/generate-recipe
**Request**: `{ chainId, globalGuidance }`  
**Response**: `{ ok, recipe }`  
**Logic**: Build AI prompt from zones

#### POST /api/html-flow/validate-json
**Request**: `{ chainId, json }`  
**Response**: `{ ok, valid, missingFields, instanceCount }`  
**Logic**: Validate user's AI response

#### POST /api/html-flow/apply-content
**Request**: `{ chainId, json }`  
**Response**: `{ ok, outputFile, previewHtml, slideCount }`  
**Logic**: Patch HTML with AI content

#### GET /api/html-flow/download/:chainId/:file
**Response**: File download  
**Logic**: Serve output file

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ HtmlUploadStep (Template & Zones)                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. Upload HTML File                                            │
│     ↓                                                            │
│  2. Parse DOM Tree (build-tree.js)                             │
│     ↓                                                            │
│  3. Detect Pre-Assigned Zones (data-zone, data-block)          │
│     ↓                                                            │
│  4. Display Tree with Zone Badges (HtmlTreePanel)              │
│     ↓                                                            │
│  5. User Assigns Zones (AssignmentPanel)                       │
│     ↓                                                            │
│  6. Create Project (selections-to-zones.js)                    │
│     ↓                                                            │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ HtmlRecipeStep (Recipe & JSON)                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. Generate Recipe (html-recipe-builder.js)                   │
│     ↓                                                            │
│  2. Display Recipe to User                                      │
│     ↓                                                            │
│  3. User Pastes AI JSON Response                               │
│     ↓                                                            │
│  4. Validate JSON (html-recipe-builder.js)                     │
│     ↓                                                            │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ HtmlPreviewStep (Preview & Download)                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. Apply Content to HTML (html-patcher.js)                    │
│     ↓                                                            │
│  2. Generate Preview HTML                                       │
│     ↓                                                            │
│  3. Render Multi-Slide Preview (scroll-snap)                   │
│     ↓                                                            │
│  4. Download Output (PDF/HTML/PPTX)                            │
│     ↓                                                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## State Management

### App.jsx (Root State)
- `step` — Current step (flow-select, html-upload, html-recipe, html-preview)
- `animDir` — Animation direction (forward/backward)
- `activeFlow` — Selected flow (html)
- `htmlUploadSession` — Upload state (templateId, trees, selections, etc.)
- `htmlProject` — Project state (chainId, zones, etc.)
- `htmlApplied` — Applied content state (outputFile, previewHtml)
- `htmlRecipe` — Last generated recipe
- `toast` — Toast notification state
- `debugContext` — Debug state snapshot

**Prop Drilling**: HtmlUploadStep receives 10+ props

**Future**: Consider Zustand or Redux when state grows (Phase 5)

---

## Testing Coverage

### Unit Tests (227 passing)
- `selections-to-zones.test.js` — Zone model tests
- `html-recipe-builder.test.js` — Recipe generation tests
- `build-tree.test.js` — DOM tree extraction tests
- `html-patcher.test.js` — Content application tests
- `html-flow.test.js` — API endpoint tests

### E2E Tests (142 passing)
- `html-flow.spec.js` — Main workflow
- `html-breadcrumbs.spec.js` — Navigation
- `html-clear-all.spec.js` — Zone clearing
- `html-editor.spec.js` — HTML editor
- `html-preview-step.spec.js` — Preview & multi-slide
- `html-repeatable.spec.js` — Repeatable slides

**Coverage**: 100% of critical paths

---

## Design System

### Colors (Dark Theme)
- Primary: `#4CAF80` (green)
- Background: `#061210` (dark teal)
- Text: `#E8F5EF` (light)
- Accent: Various oklch() tokens

### Typography
- UI: Geist (Google Fonts)
- Code: JetBrains Mono (Google Fonts)

### Spacing
- xs: 4px, sm: 8px, md: 16px, lg: 24px, xl: 32px, 2xl: 48px

### Border Radius
- xs: 4px, sm: 6px, md: 10px, lg: 16px, xl: 24px

---

## Performance Characteristics

### Parse Time
- HTML parsing: <100ms (typical 1–2MB template)
- Tree rendering: <50ms (typical 100–200 nodes)

### Memory
- Typical project: 10–20MB
- Large project: 40MB

### Bundle
- Initial: ~450KB (gzipped)
- CodeMirror: 150KB (gzipped) — candidate for code splitting

---

## Known Limitations

1. **No Persistence**: All data lost on server restart
2. **No Auth**: Any user can access any project
3. **No Scaling**: Single-instance only (local file storage)
4. **No Collaboration**: Real-time sync not supported
5. **State Management**: Prop drilling for large state trees

---

## Notes

### Technology Choices
- **Vite** over Create React App: Faster dev server, better HMR
- **Vitest** over Jest: Faster, better for Vite projects
- **Playwright** over Cypress: Better browser coverage, better API
- **Express** over Fastify: Simpler, good enough for this scope
- **node-html-parser** over jsdom: Lighter, faster

### Why No TypeScript Yet
- Codebase is small and well-typed
- Adding TS would slow development
- Consider adding when codebase grows (Phase 5)

### Why No State Management Library
- Current scope doesn't require it
- React hooks are sufficient
- Will add Zustand/Redux in Phase 5

---

**Next Review**: 2026-05-15  
**Questions?** See [README.md](./README.md) or check [INFRASTRUCTURE.md](./INFRASTRUCTURE.md).
