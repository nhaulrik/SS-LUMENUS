# SOLON UI/UX Assessment

**Date:** 2026-04-17  
**Scope:** Full client UI audit — component structure, CSS architecture, visual consistency  
**Goal:** Identify issues blocking a cohesive design alignment iteration

---

## 1. Component Inventory

| Component | CSS Approach | Color Theme | Uses Design Tokens? |
|---|---|---|---|
| `ProjectLandingStep` | Module CSS | **Blue** (#60a5fa) | No — hardcoded hex |
| `ProjectDashboardStep` | Module CSS | **Blue** (#60a5fa) | No — hardcoded hex |
| `HtmlUploadStep` | Global CSS | **Green** (#4CAF80) | Partial |
| `HtmlRecipeStep` | Global CSS | **Green** (#4CAF80) | Partial |
| `HtmlPreviewStep` | Global CSS | **Green** (#4CAF80) | Partial |
| `HtmlMetadataStep` | Global CSS | **Green** (#4CAF80) | Partial |
| `AppHeader` | Global CSS + inline | **Green** (#4CAF80) | No — inline styles |
| `Breadcrumbs` | Global CSS | **Green** (#4CAF80) | Yes |
| `TreeNode` | Module CSS | Teal (token refs) | Partial |
| `ExportHistoryPanel` | Module CSS | Mixed green/teal | Mixed |
| `HtmlEditorPanel` | Inline JS theme | **Green** (#4CAF80) | No — hardcoded in JS |

### Application Flow

```
project-landing → project-dashboard → html-upload → html-recipe → html-preview → html-metadata
     BLUE theme       BLUE theme        GREEN theme   GREEN theme   GREEN theme   GREEN theme
```

Users experience a theme shift every time they open a project.

---

## 2. Design Token System (Current State)

Tokens are defined in `client/src/index.css` `:root`:

```css
/* Backgrounds */
--bg-primary:   #061210   /* dark teal */
--bg-secondary: #0A1F1B
--bg-tertiary:  #0F2B26
--bg-elevated:  #142F29

/* Accent */
--accent-primary:   #4CAF80  /* green */
--accent-secondary: #73AA87

/* Text */
--text-primary:  #E8F5EF
--text-secondary: #B8D4C8
--text-muted:    #5E7B6D

/* Status */
--success: #4CAF80
--warning: #D4A853
--error:   #E8544A
--danger:  oklch(58% 0.18 25)   ← duplicates --error in different format

/* Spacing scale */
--space-xs: 4px  --space-sm: 8px  --space-md: 16px
--space-lg: 24px  --space-xl: 32px  --space-2xl: 48px

/* Border radius */
--radius-xs: 4px  --radius-sm: 8px  --radius-md: 12px
--radius-lg: 16px  --radius-xl: 24px

/* Semantic (OKLCH format) */
--accent-block:  oklch(72% 0.14 55)   /* amber — block zones */
--accent-visual: oklch(65% 0.13 250)  /* slate-blue — visual flow */
```

**Tokens NOT defined but used throughout module CSS:**

| Value | Used in | Purpose |
|---|---|---|
| `#60a5fa` | ProjectLandingStep, ProjectDashboardStep | Primary accent (blue) |
| `#3b82f6` | ProjectDashboardStep | Button base |
| `#1d4ed8` | ProjectDashboardStep | Button hover |
| `#a78bfa` | ProjectLandingStep, ProjectDashboardStep | Gradient accent (purple) |
| `#86efac` | ProjectDashboardStep | Status badge green |
| `#0a0e27` | ProjectLandingStep, ProjectDashboardStep | Background |
| `#1a1f3a` | ProjectLandingStep, ProjectDashboardStep | Background secondary |

---

## 3. Issues

### Issue 1 — Dual Color Theme (Severity: Critical)

**What:** The app has two completely different color palettes applied to different steps.

- Landing & Dashboard: blue/purple gradient theme (`#60a5fa`, `#a78bfa`, dark navy backgrounds)
- HTML flow steps: teal/green theme (`#4CAF80`, dark teal backgrounds)

**Where:**
- `ProjectLandingStep.module.css:5-8` — `background: linear-gradient(135deg, #0a0e27, #1a1f3a)`
- `ProjectDashboardStep.module.css:5-8` — same navy gradient
- `index.css:80` — `background: var(--bg-primary)` — dark teal

**Impact:** Jarring visual discontinuity every time a user opens a project and proceeds into the HTML flow.

---

### Issue 2 — Button Style Fragmentation (Severity: High)

Three distinct button styles exist with no shared definition:

**Global `.btn-primary` (index.css:401–410):**
```css
background: var(--accent-primary);  /* flat green */
color: var(--bg-primary);
padding: 14px 24px;
font-weight: 500;
```

**Module `.primaryButton` (ProjectDashboardStep.module.css:93–110):**
```css
background: linear-gradient(135deg, #60a5fa, #3b82f6);  /* gradient blue */
color: white;
padding: 10px 20px;
font-weight: 600;
```

**Module `.actionButton` (ProjectDashboardStep.module.css:246–261):**
```css
background-color: rgba(96, 165, 250, 0.1);  /* ghost blue */
color: #60a5fa;
padding: 8px 16px;
font-weight: 500;
```

Result: three visually distinct primary actions with no relationship to each other.

---

### Issue 3 — CSS Approach Split (Severity: High)

The codebase mixes global CSS and module CSS with no consistent rule about when to use each:

- **Global CSS** components: AppHeader, Breadcrumbs, all HTML flow steps — use `.btn`, `.form-group`, etc.
- **Module CSS** components: ProjectLandingStep, ProjectDashboardStep, TreeNode, ExportHistoryPanel — each re-define their own buttons, cards, and colors
- **Inline JS** component: HtmlEditorPanel — CodeMirror theme with hardcoded hex (`#1a1f1e`, `#4CAF80`, etc.)

Module CSS files do not reference tokens from `:root`, meaning a single color change requires edits in multiple files.

---

### Issue 4 — Muted Text Has 5+ Values (Severity: Medium)

`--text-muted` is `#5E7B6D` in `index.css`, but module CSS files use their own hardcoded equivalents:

| Value | File |
|---|---|
| `#5E7B6D` | `index.css` (the token) |
| `#a1a1aa` | `ProjectDashboardStep.module.css` |
| `#64748b` | `ProjectDashboardStep.module.css` (input placeholders) |
| `#71717a` | `ProjectDashboardStep.module.css` |
| `#52525b` | `ProjectDashboardStep.module.css` (labels) |

---

### Issue 5 — Error/Danger Color Duplication (Severity: Medium)

Three representations of the same concept:

```css
--error:  #E8544A           /* index.css:24 */
--danger: oklch(58% 0.18 25) /* index.css:64 — same hue, OKLCH format */
rgba(232, 84, 74, 0.1)       /* inline in validation badges */
```

---

### Issue 6 — Spacing Not Using Tokens (Severity: Medium)

Module CSS uses hardcoded values not on the token scale:

```css
/* ProjectDashboardStep.module.css */
padding: 40px;       /* not a token */
padding: 24px;       /* not a token */
gap: 20px;           /* not a token */
gap: 16px;           /* not a token — that's --space-md */

/* ProjectLandingStep.module.css */
padding: 60px 40px 40px;  /* not a token */
gap: 10px;                 /* not a token */
```

---

### Issue 7 — Border Radius Not Using Tokens (Severity: Medium)

```css
/* Module CSS (hardcoded) */
border-radius: 12px;   /* ProjectDashboardStep */
border-radius: 8px;    /* ProjectDashboardStep */
border-radius: 6px;    /* ProjectDashboardStep */

/* Global CSS (tokens) */
border-radius: var(--radius-md);  /* = 12px */
border-radius: var(--radius-sm);  /* = 8px */
border-radius: var(--radius-xs);  /* = 4px */
```

The values are the same, but the module files don't reference the token — making future radius changes require editing both places.

---

### Issue 8 — Shadow Definitions Inconsistent (Severity: Medium)

**Global tokens:**
```css
--shadow-sm: 0 2px 8px rgba(0,0,0,0.3)
--shadow-md: 0 4px 16px rgba(0,0,0,0.4)
--shadow-glow: 0 0 20px rgba(76,175,128,0.3)
```

**Module CSS (inline):**
```css
box-shadow: 0 10px 15px -3px rgba(59, 130, 246, 0.3);  /* blue glow — ProjectDashboardStep */
box-shadow: 0 20px 40px -12px rgba(0,0,0,0.5);          /* deep — ProjectLandingStep */
```

Different colors, different spreads, different formulas.

---

### Issue 9 — Typography Weights Not Standardized (Severity: Low–Medium)

```css
/* index.css */
h1 { font-weight: 600; }
.btn { font-weight: 500; }

/* Module CSS */
.title { font-weight: 700; }           /* ProjectLandingStep */
.projectTitle { font-weight: 700; }    /* ProjectDashboardStep */
.primaryButton { font-weight: 600; }   /* ProjectDashboardStep */
```

Headings use 600 in global context and 700 in module context — subtle but cumulative.

---

### Issue 10 — Responsive Coverage Uneven (Severity: Low)

Only two files define `@media (max-width: 768px)` breakpoints:
- `ProjectDashboardStep.module.css:480–517`
- `ProjectLandingStep.module.css:276–307`

The HTML flow steps (Upload, Recipe, Preview, Metadata) have minimal or no responsive rules. The two-panel layouts in Recipe and Upload steps will likely break at narrow viewports.

---

### Issue 11 — AppHeader Uses Inline Styles (Severity: Low)

`AppHeader.jsx` applies some styles via a `style={}` prop rather than CSS classes. This bypasses the token system and is harder to override or audit.

---

## 4. Recommended Approach for Alignment Iteration

### Step 1: Decide the Canonical Palette

The first decision is whether to unify on:

**Option A — Green/Teal** (existing `index.css` tokens): migrate Landing and Dashboard to match the HTML flow.  
**Option B — Blue/Purple** (current Landing/Dashboard): migrate the HTML flow steps to use blue.  
**Option C — New unified palette**: design a new palette and update everything.

Option A is the lowest-effort path — the token system already exists in `index.css`.

---

### Step 2: Add Missing Tokens

Whichever palette is chosen, add all colour values to `:root` in `index.css`. Do not leave colour values only in module CSS. Example additions needed:

```css
/* If keeping blue accents for any purpose */
--color-blue-400: #60a5fa;
--color-blue-500: #3b82f6;
--color-blue-700: #1d4ed8;
--color-purple-400: #a78bfa;

/* Consolidate error */
--error: #E8544A;
/* Remove duplicate --danger: oklch(...) */

/* Consolidate muted text */
--text-muted: #5E7B6D;
/* Remove all per-file grey variants */
```

---

### Step 3: Migrate Module CSS to Use Tokens

For each `.module.css` file:

1. Replace all hardcoded colour hex values with `var(--token-name)`
2. Replace hardcoded spacing (40px, 24px, etc.) with `var(--space-*)` equivalents
3. Replace hardcoded border-radius values with `var(--radius-*)` equivalents
4. Replace hardcoded shadow definitions with `var(--shadow-*)` equivalents

Priority order:
1. `ProjectLandingStep.module.css` — most isolated from global styles
2. `ProjectDashboardStep.module.css` — largest, most inconsistencies
3. `ExportHistoryPanel.module.css`
4. `TreeNode.module.css` — mostly already uses tokens, minor cleanup

---

### Step 4: Unify Button Definitions

Define a single set of button classes in `index.css` and use them everywhere:

- Remove `.primaryButton`, `.actionButton`, `.flowOpenButton`, `.openButton` from module CSS
- Replace with `.btn .btn-primary`, `.btn .btn-secondary`, `.btn .btn-danger`
- Ensure padding, font-weight, border-radius, and hover state are identical wherever a "primary action" button appears

---

### Step 5: Extract HtmlEditorPanel Theme

Move the CodeMirror theme object from `HtmlEditorPanel.jsx` into a separate file (`editorTheme.js`) that imports colour constants. Map those constants to `index.css` tokens where possible (via a JS bridge like CSS variable reads, or a shared constants file).

---

### Step 6: Establish CSS Architecture Rule

Document (in `CLAUDE.md` or a `STYLE_GUIDE.md`) which approach to use going forward:

> **All new components use global CSS classes from `index.css` for layout primitives, buttons, and typography. Module CSS is permitted only for component-specific structural layout (e.g. grid columns, panel positioning). No colour, spacing, or typography values may be hardcoded in module CSS — use `var(--token-name)` from the global token set.**

---

## 5. File Change Map

| File | Changes Needed |
|---|---|
| `client/src/index.css` | Add missing colour tokens; consolidate --error/--danger; add --space-* and --radius-* aliases |
| `client/src/steps/ProjectLandingStep.module.css` | Replace all hardcoded hex/px with tokens; remove duplicate button styles |
| `client/src/steps/ProjectDashboardStep.module.css` | Same as above; largest file, most work |
| `client/src/components/ExportHistoryPanel.module.css` | Replace hardcoded colours with tokens |
| `client/src/components/TreeNode.module.css` | Minor — already mostly tokenised |
| `client/src/components/HtmlEditorPanel.jsx` | Extract inline theme to separate constants file |
| `client/src/components/AppHeader.jsx` | Replace inline styles with CSS classes |
