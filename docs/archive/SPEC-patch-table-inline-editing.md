# Spec: Patch Table — Fully Inline Editing

## Current state (before this spec)

The patch table has four columns: **AI | Hint | Content | Max**

| Column | Editable? | Notes |
|--------|-----------|-------|
| AI     | Yes — toggle | Works |
| Hint   | Yes — text input (when AI on) | Uses `defaultValue` (uncontrolled) — loses value on slide switch |
| Content | No — read-only span | Shows original text, not the key |
| Max    | No — read-only span | Not editable inline |

Key is not visible in the table. Key and max chars can only be changed by clicking a row to open the TagModal.

## Required state (after this spec)

The patch table has four columns: **AI | Key | Hint | Max**

| Column | Editable? | Notes |
|--------|-----------|-------|
| AI     | Yes — toggle | Existing behaviour kept |
| Key    | Yes — text input, always visible | New |
| Hint   | Yes — text input, only when AI on | Change from `defaultValue` to `value` (controlled) |
| Max    | Yes — number input, always visible | New |

Row click no longer opens the TagModal. All editing is directly in the table.
The TagModal is still used for **initial tagging** (clicking an element on the slide overlay).

---

## Implementation changes

### 1. TagStep.jsx — patch table

**Column header** (update grid + labels):
```
AI | Key | Hint | Max
grid-template-columns: 40px 1fr 1fr 60px
```

**Row changes:**
- Remove `onClick` that opens TagModal from the row `div` — row click now only highlights
- Add `onClick={e => e.stopPropagation()}` on each input so highlight doesn't fire when editing
- Replace `Content` span with a controlled `<input className="patch-key-input">` bound to `t.key`
  - `onChange` → update `tags`, call `triggerSave`
- Change hint `<input>` from `defaultValue` → `value` (controlled)
- Replace `Max` span with a controlled `<input type="number" className="patch-max-input">` bound to `t.maxChars`
  - `onChange` → parse int, update `tags`, call `triggerSave`
  - Empty input means `null` (no limit)

**Key input onChange** must also update `data-key` attribute (it's derived from `t.key`, so it updates automatically since `data-key={t.key}` is on the row div).

### 2. index.css — new input styles

```css
/* Key input — monospace, red like .patch-key text was */
.patch-key-input {
  background: transparent;
  border: 1px solid transparent;
  color: var(--error);
  font-family: monospace;
  font-size: 0.85rem;
  padding: 4px 8px;
  border-radius: 4px;
  width: 100%;
}
.patch-key-input:hover  { border-color: var(--border-default); }
.patch-key-input:focus  { outline: none; border-color: var(--accent-primary); background: var(--bg-secondary); color: var(--text-primary); }

/* Max input — right-aligned, compact */
.patch-max-input {
  background: transparent;
  border: 1px solid transparent;
  color: var(--accent-primary);
  font-size: 0.85rem;
  padding: 4px 6px;
  border-radius: 4px;
  width: 100%;
  text-align: right;
}
.patch-max-input:hover { border-color: var(--border-default); }
.patch-max-input:focus { outline: none; border-color: var(--accent-primary); background: var(--bg-secondary); }

/* Hide number input spinner arrows */
.patch-max-input::-webkit-inner-spin-button,
.patch-max-input::-webkit-outer-spin-button { -webkit-appearance: none; }
.patch-max-input[type=number] { -moz-appearance: textfield; }
```

### 3. patch-table.spec.js — replace modal tests with inline tests

Remove the entire `'Patch table — row click opens modal'` describe block.

Add:
- `'Patch table — inline key editing'` — key input visible, pre-filled, editable, reflected in `data-key`
- `'Patch table — inline max chars editing'` — max input visible, can be set, persists on slide switch

### 4. fixtures.js — remove modal selectors no longer needed

Remove `patchRow`, `modalKey`, `modalHint`, `modalSave` selectors (they were only used by the modal-from-row tests).
Add `patchKeyInput`, `patchMaxInput` selectors.

---

## Test coverage after this spec

```
Patch table — visibility
  ✓ two rows after tagging
  ✓ initiative_group key visible in key input
  ✓ initiative_group_subheader key visible in key input

Patch table — AI toggle
  ✓ disabling AI hides hint input for that row
  ✓ enabling AI shows hint input

Patch table — inline key editing
  ✓ key input is pre-filled with the tag key
  ✓ changing key inline updates the row data-key attribute
  ✓ changed key persists after switching slides and returning

Patch table — inline hint editing
  ✓ hint input pre-filled when AI on
  ✓ editing hint inline does not open a modal
  ✓ hint persists after switching slides

Patch table — inline max chars editing
  ✓ max input is visible for each row
  ✓ setting max chars inline is reflected immediately
  ✓ max chars persist after switching slides
```
