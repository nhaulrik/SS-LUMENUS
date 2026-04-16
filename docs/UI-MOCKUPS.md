# UI Mockups — Hierarchy Definition Step

Visual reference for the Hierarchy Definition Step and related UI elements.

---

## 1. Preview Step (Modified)

**Before:**
```
┌─────────────────────────────────────────────────────┐
│ Project Name — Content applied — review and download
├─────────────────────────────────────────────────────┤
│                                                     │
│  [Preview iframe]                                   │
│                                                     │
│  Slide 1 / 3                                        │
│  ← [prev]  [next] →                                 │
│                                                     │
├─────────────────────────────────────────────────────┤
│ ← Back to recipe  [Download] [Start new]            │
└─────────────────────────────────────────────────────┘
```

**After:**
```
┌─────────────────────────────────────────────────────┐
│ Project Name — Review your slides
├─────────────────────────────────────────────────────┤
│                                                     │
│  [Preview iframe]                                   │
│                                                     │
│  Slide 1 / 3                                        │
│  ← [prev]  [next] →                                 │
│                                                     │
├─────────────────────────────────────────────────────┤
│ ← Back to recipe          [Next: Define Hierarchy]  │
└─────────────────────────────────────────────────────┘
```

---

## 2. Hierarchy Definition Step (First Iteration)

```
┌──────────────────────────────────────────────────────────────────────┐
│ Define Hierarchy & Metadata — Slide 1 of 3                           │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ ┌─ Metadata Form ──────────────────┐  ┌─ Hierarchy Preview ──────┐ │
│ │                                  │  │                          │ │
│ │ Slide ID *                       │  │ Current Hierarchy:       │ │
│ │ [audi                         ]  │  │                          │ │
│ │ Unique identifier (lowercase)    │  │ Root                     │ │
│ │                                  │  │ ├─ Audi (◐ editing)      │ │
│ │ Name *                           │  │ ├─ BMW (○ pending)       │ │
│ │ [Audi                         ]  │  │ └─ Mercedes (○ pending)  │ │
│ │                                  │  │                          │ │
│ │ Type *                           │  │ Legend:                  │ │
│ │ [manufacturer          ▼]        │  │ ✓ = confirmed           │ │
│ │   - content                      │  │ ◐ = editing             │ │
│ │   - manufacturer                 │  │ ○ = pending             │ │
│ │   - model                        │  │                          │ │
│ │   - product                      │  │                          │ │
│ │   - feature                      │  │                          │ │
│ │                                  │  │                          │ │
│ │ Parent Slide                     │  │                          │ │
│ │ [None                          ▼]  │                          │ │
│ │ (No parent slides available)      │  │                          │ │
│ │                                  │  │                          │ │
│ │ Custom Metadata:                 │  │                          │ │
│ │ country: [Germany             ]  │  │                          │ │
│ │ founded: [1909                ]  │  │                          │ │
│ │ [+ Add field]                    │  │                          │ │
│ │                                  │  │                          │ │
│ └──────────────────────────────────┘  └──────────────────────────┘ │
│                                                                      │
│ ← Previous  [1 / 3]  Next →                                          │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│ ← Back to preview  [Generate more content] [Package & Publish]       │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 3. Hierarchy Definition Step (Subsequent Iteration)

```
┌──────────────────────────────────────────────────────────────────────┐
│ Define Hierarchy & Metadata — Slide 2 of 4                           │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ ┌─ Metadata Form ──────────────────┐  ┌─ Hierarchy Preview ──────┐ │
│ │                                  │  │                          │ │
│ │ Slide ID *                       │  │ Current Hierarchy:       │ │
│ │ [audi-a6                      ]  │  │                          │ │
│ │ Unique identifier (lowercase)    │  │ Root                     │ │
│ │                                  │  │ ├─ Audi ✓                │ │
│ │ Name *                           │  │ │  ├─ A4 ✓               │ │
│ │ [Audi A6                      ]  │  │ │  └─ A6 (◐ editing)    │ │
│ │                                  │  │ ├─ BMW ✓                 │ │
│ │ Type *                           │  │ │  └─ 3 Series ✓         │ │
│ │ [model                         ▼]  │ └─ Mercedes ✓             │ │
│ │                                  │  │    └─ C-Class (○ pending)│ │
│ │ Parent Slide *                   │  │                          │ │
│ │ [audi                          ▼]  │ Legend:                  │ │
│ │   - audi (Manufacturer)          │  │ ✓ = confirmed           │ │
│ │   - bmw (Manufacturer)           │  │ ◐ = editing             │ │
│ │   - mercedes (Manufacturer)      │  │ ○ = pending             │ │
│ │ Link to parent from previous iter │  │                          │ │
│ │                                  │  │                          │ │
│ │ Custom Metadata:                 │  │                          │ │
│ │ class: [Executive             ]  │  │                          │ │
│ │ [+ Add field]                    │  │                          │ │
│ │                                  │  │                          │ │
│ └──────────────────────────────────┘  └──────────────────────────┘ │
│                                                                      │
│ ← Previous  [2 / 4]  Next →                                          │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│ ← Back to preview  [Generate more content] [Package & Publish]       │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 4. Project Continuation Prompt

Shown in FlowSelectStep when project exists in session:

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│  Continue with existing project?                         │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Project: German Automotive Database                │ │
│  │ Iterations: 1 (Manufacturers)                       │ │
│  │ Slides: 3                                           │ │
│  │ Last updated: April 16, 2024 10:30 AM              │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  [Yes, continue]  [No, start new project]              │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## 5. Download Dialog

Shown after "Package & Publish" completes:

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│  ✓ Project Ready!                                        │
│                                                          │
│  Your project "German Automotive Database" has been      │
│  packaged and is ready for download.                     │
│                                                          │
│  📦 Contents:                                            │
│  • 7 HTML slides (manufacturers + models)               │
│  • Interactive web app (app/index.html)                 │
│  • Project manifest and metadata                         │
│  • Usage instructions (README.md)                        │
│                                                          │
│  [Download as ZIP]  [Start new project]                │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## 6. Hierarchy Preview Examples

### First Iteration (Flat)
```
Root
├─ Audi (◐ editing)
├─ BMW (○ pending)
└─ Mercedes (○ pending)
```

### After Editing All Slides (First Iteration)
```
Root
├─ Audi ✓
├─ BMW ✓
└─ Mercedes ✓
```

### Second Iteration - Slide 1 (Editing)
```
Root
├─ Audi ✓
│  └─ A4 (◐ editing)
├─ BMW ✓
│  └─ 3 Series ✓
└─ Mercedes ✓
   └─ C-Class (○ pending)
```

### Second Iteration - Complete
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

### Three-Level Hierarchy (Features under Models)
```
Root
├─ Audi ✓
│  ├─ A4 ✓
│  │  ├─ Performance ✓
│  │  ├─ Comfort ✓
│  │  └─ Safety (◐ editing)
│  └─ A6 ✓
│     ├─ Performance ✓
│     ├─ Comfort ✓
│     └─ Safety ✓
├─ BMW ✓
│  ├─ 3 Series ✓
│  │  ├─ Performance ✓
│  │  ├─ Comfort ✓
│  │  └─ Safety (○ pending)
│  └─ X5 (○ pending)
└─ Mercedes ✓
   ├─ C-Class ✓
   │  ├─ Performance ✓
   │  ├─ Comfort ✓
   │  └─ Safety ✓
   └─ E-Class (○ pending)
```

---

## 7. Color Coding (Optional Enhancement)

**Status Colors:**
- **Green (#4CAF80):** Confirmed (metadata complete) ✓
- **Blue (#4CAF80 with opacity):** Currently editing ◐
- **Gray (#999):** Pending (not yet edited) ○

**Example with Colors:**
```
Root
├─ Audi                    [Green background]
│  ├─ A4                   [Green background]
│  └─ A6                   [Blue background] ← Currently editing
├─ BMW                     [Green background]
│  └─ 3 Series             [Green background]
└─ Mercedes                [Green background]
   └─ C-Class              [Gray text] ← Pending
```

---

## 8. Form Validation Error States

**Duplicate Slide ID:**
```
┌─────────────────────────────────────────────────┐
│ Slide ID *                                      │
│ [audi                                        ]  │
│ ⚠ Slide ID "audi" is already used              │
└─────────────────────────────────────────────────┘
```

**Missing Required Field:**
```
┌─────────────────────────────────────────────────┐
│ Name *                                          │
│ [                                            ]  │
│ ⚠ Name is required                              │
└─────────────────────────────────────────────────┘
```

**Invalid Slide ID Format:**
```
┌─────────────────────────────────────────────────┐
│ Slide ID *                                      │
│ [Audi A4                                     ]  │
│ ⚠ Use lowercase letters, numbers, hyphens only  │
└─────────────────────────────────────────────────┘
```

**Circular Parent Reference:**
```
⚠ Validation Error:
  Slide "audi-a4": Circular parent reference detected
  (A4 → Audi → A4)
```

---

## 9. Responsive Layout (Tablet/Mobile)

On smaller screens, stack panels vertically:

```
┌────────────────────────────────────────┐
│ Define Hierarchy & Metadata            │
│ Slide 1 of 3                           │
├────────────────────────────────────────┤
│                                        │
│ Metadata Form:                         │
│ ┌──────────────────────────────────┐  │
│ │ Slide ID: audi                   │  │
│ │ Name: Audi                       │  │
│ │ Type: manufacturer               │  │
│ │ Parent: None                     │  │
│ │ Custom Metadata:                 │  │
│ │ country: Germany                 │  │
│ │ founded: 1909                    │  │
│ └──────────────────────────────────┘  │
│                                        │
│ Hierarchy Preview:                     │
│ ┌──────────────────────────────────┐  │
│ │ Root                             │  │
│ │ ├─ Audi (◐)                      │  │
│ │ ├─ BMW (○)                       │  │
│ │ └─ Mercedes (○)                  │  │
│ └──────────────────────────────────┘  │
│                                        │
├────────────────────────────────────────┤
│ ← Prev  [1/3]  Next →                  │
├────────────────────────────────────────┤
│ ← Back [Generate] [Package & Publish]  │
└────────────────────────────────────────┘
```

---

## 10. Dark Mode Support

The UI should respect the existing dark teal theme:

```
Background: #061210 (dark teal)
Text: #E8F0EF (light)
Border: #1A3A36 (medium teal)
Accent: #4CAF80 (green)
```

**Example:**
```
┌─ Dark Form ───────────────────────────────────┐
│ [Dark teal background]                        │
│                                               │
│ Slide ID                                      │
│ [Input with dark border]                      │
│                                               │
│ Name                                          │
│ [Input with dark border]                      │
│                                               │
│ [Green accent button]                         │
│                                               │
└───────────────────────────────────────────────┘
```

---

## 11. Accessibility Features

**Keyboard Navigation:**
- Tab/Shift+Tab to move between form fields
- Enter to submit form or toggle dropdown
- Arrow keys to navigate parent dropdown
- Previous/Next buttons accessible via keyboard

**Screen Reader Support:**
- Form labels properly associated with inputs
- Status icons have aria-labels (e.g., "Confirmed", "Editing", "Pending")
- Hierarchy tree has semantic structure
- Buttons have clear, descriptive labels

**Color Contrast:**
- Text meets WCAG AA standards (4.5:1 ratio)
- Status icons have text labels, not just colors
- Error messages clearly visible

---

## 12. Loading and Success States

**Saving Iteration:**
```
┌────────────────────────────────┐
│ Saving iteration...            │
│                                │
│ ⟳ Processing metadata          │
│ ⟳ Creating project folder      │
│ ⟳ Writing slide files          │
│                                │
└────────────────────────────────┘
```

**Success Message:**
```
✓ Iteration saved successfully!
  You can now generate more content.
  Returning to slide upload...
```

**Package & Publish:**
```
┌────────────────────────────────┐
│ Packaging project...           │
│                                │
│ ⟳ Validating metadata          │
│ ⟳ Saving slides                │
│ ⟳ Generating web app           │
│ ⟳ Creating download            │
│                                │
└────────────────────────────────┘
```

---

## 13. Side-by-Side Comparison: Before & After

### Before (No Hierarchy Support)
```
Upload → Zones → Recipe → Apply → Preview → Download HTML
                                              ↓
                                           Single file saved
```

### After (With Hierarchy Definition)
```
Upload → Zones → Recipe → Apply → Preview → Define Hierarchy → [Choose Action]
                                                ↓                    ↓
                                         [Metadata form]    Generate More Content
                                         [Hierarchy preview] Package & Publish
                                                ↓
                                         Project folder created
                                         Web app generated (if publish)
                                         ZIP download offered
```

---

This visual reference provides mockups for all major UI elements in the Hierarchy Definition Step feature.
