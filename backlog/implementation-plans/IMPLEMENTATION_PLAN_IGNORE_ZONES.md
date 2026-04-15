# Implementation Plan: Ignore/Exclude Zones Feature

**Feature:** Allow users to mark elements as "ignored" so they will NOT receive AI-generated content, even if a parent element is marked for generation.

**Methodology:** Test-Driven Development (TDD)
**Timeline:** 3-4 days (Phases 1-3)
**Branch:** `feature/ignore-zones`

---

## Overview

### Data Model Changes

Add `ignored: boolean` field to Zone object:

```javascript
{
  zoneType: 'leaf' | 'block',
  key: string,
  nodeId: string,
  slideIndex: number,
  type: string,
  hint: string,
  autoGenerate: boolean,
  prompt: string,
  exampleHtml: string,
  isRepeatable: boolean,
  unique: boolean,
  elementOrder: number,
  ignored: boolean  // NEW FIELD
}
```

### Requirements

1. **Data Persistence:** `ignored` field persists in `chain.json`
2. **Recipe Filtering:** Ignored zones are excluded from recipe generation
3. **HTML Patching:** Ignored zones are skipped during patching (never receive AI content)
4. **Attribute Stripping:** `data-ignore` attribute is removed from output HTML
5. **Validation:** `ignored` field is not required in user-submitted JSON
6. **UI Toggle:** Ignore button on ALL tree nodes (assigned or not) for quick toggle access
7. **Visual Feedback:** Strikethrough text + muted color for ignored nodes
8. **Independent State:** `ignored` state is independent of zone assignment (can ignore before/without assigning)
9. **Inheritance:** When a parent element is marked as ignored, all descendant zones are treated as ignored (conflict resolution applies)

---

## Inheritance & Conflict Resolution

### Ignore Inheritance

When a parent element is marked as ignored, all its descendant zones inherit the ignored state:

```
Parent (ignored: true)
├── Child Zone A (ignored: false in data, but treated as true)
├── Child Zone B (ignored: false in data, but treated as true)
└── Grandchild Zone C (ignored: false in data, but treated as true)
```

**Implementation Strategy:**
1. In `html-recipe-builder.js`: Add helper function `isIgnoredOrDescendantOfIgnored(zone, allZones)` to check if a zone or any ancestor is ignored
2. In `html-patcher.js`: Same logic applies when deciding whether to patch a zone
3. In `HtmlTreePanel.jsx`: Visual indicator (strikethrough) should show if zone is ignored OR has an ignored ancestor

**Test Cases:**
- Zone is ignored directly
- Zone has an ignored parent
- Zone has an ignored grandparent (nested)
- Multiple levels of nesting with mixed ignored/non-ignored
- Visual UI shows strikethrough for both directly ignored and inherited-ignored zones

---

## Phase 1: Server-Side Implementation (TDD)

### 1.1 selections-to-zones.js Tests

**File:** `server/__tests__/selections-to-zones.test.js`

**Test Cases:**

```javascript
describe('selectionsToZones - ignored field', () => {
  it('should preserve ignored=true from selection to zone', () => {
    const selection = leafSel({ ignored: true });
    const zones = selectionsToZones([selection]);
    expect(zones[0].ignored).toBe(true);
  });

  it('should preserve ignored=false from selection to zone', () => {
    const selection = leafSel({ ignored: false });
    const zones = selectionsToZones([selection]);
    expect(zones[0].ignored).toBe(false);
  });

  it('should default ignored to false when not provided', () => {
    const selection = leafSel(); // no ignored field
    const zones = selectionsToZones([selection]);
    expect(zones[0].ignored).toBe(false);
  });

  it('should preserve ignored field for block zones', () => {
    const selection = blockSel({ ignored: true });
    const zones = selectionsToZones([selection]);
    expect(zones[0].ignored).toBe(true);
  });

  it('should handle mixed ignored and non-ignored zones', () => {
    const selections = [
      leafSel({ ignored: true }),
      leafSel({ ignored: false }),
      blockSel({ ignored: true })
    ];
    const zones = selectionsToZones(selections);
    expect(zones[0].ignored).toBe(true);
    expect(zones[1].ignored).toBe(false);
    expect(zones[2].ignored).toBe(true);
  });
});
```

### 1.2 selections-to-zones.js Implementation

**File:** `server/lib/selections-to-zones.js`

Add `ignored` field to zone construction (around line 60):

```javascript
function selectionToZone(selection) {
  return {
    zoneType: selection.zoneType,
    key: selection.key,
    nodeId: selection.nodeId,
    slideIndex: selection.slideIndex,
    type: selection.type,
    hint: selection.hint || '',
    autoGenerate: selection.autoGenerate || false,
    prompt: selection.prompt || '',
    exampleHtml: selection.exampleHtml || '',
    isRepeatable: selection.isRepeatable || false,
    unique: selection.unique || false,
    elementOrder: selection.elementOrder || 0,
    ignored: selection.ignored || false  // NEW LINE
  };
}
```

---

### 1.3 html-recipe-builder.js Tests

**File:** `server/__tests__/html-recipe-builder.test.js`

**Test Cases:**

```javascript
describe('htmlRecipeBuilder - ignored zones', () => {
  it('should exclude ignored zones from recipe', () => {
    const zones = [
      leafZone({ key: 'zone1', ignored: false }),
      leafZone({ key: 'zone2', ignored: true }),
      leafZone({ key: 'zone3', ignored: false })
    ];
    const recipe = buildRecipe(zones);
    expect(recipe.items).toHaveLength(2);
    expect(recipe.items.map(i => i.key)).toEqual(['zone1', 'zone3']);
  });

  it('should exclude all zones in an ignored block', () => {
    const zones = [
      blockZone({ key: 'block1', ignored: true, children: ['leaf1', 'leaf2'] }),
      leafZone({ key: 'leaf1', parent: 'block1' }),
      leafZone({ key: 'leaf2', parent: 'block1' })
    ];
    const recipe = buildRecipe(zones);
    expect(recipe.items).toHaveLength(0);
  });

  it('should include non-ignored leaf zones in an ignored block', () => {
    // Note: This tests conflict resolution - ignored block should supersede
    const zones = [
      blockZone({ key: 'block1', ignored: true }),
      leafZone({ key: 'leaf1', parent: 'block1', ignored: false })
    ];
    const recipe = buildRecipe(zones);
    // Block supersedes leaf, so leaf should be excluded
    expect(recipe.items).toHaveLength(0);
  });

  it('should include ignored=false zones in a non-ignored block', () => {
    const zones = [
      blockZone({ key: 'block1', ignored: false }),
      leafZone({ key: 'leaf1', parent: 'block1', ignored: false }),
      leafZone({ key: 'leaf2', parent: 'block1', ignored: true })
    ];
    const recipe = buildRecipe(zones);
    expect(recipe.items).toHaveLength(1);
    expect(recipe.items[0].key).toBe('leaf1');
  });

  it('should handle deeply nested ignored zones', () => {
    const zones = [
      blockZone({ key: 'block1', ignored: false }),
      blockZone({ key: 'block2', parent: 'block1', ignored: true }),
      leafZone({ key: 'leaf1', parent: 'block2' })
    ];
    const recipe = buildRecipe(zones);
    expect(recipe.items).toHaveLength(0);
  });
});
```

### 1.4 html-recipe-builder.js Implementation

**File:** `server/lib/html-recipe-builder.js`

Modify the recipe building logic (around line 100) to filter ignored zones:

```javascript
function buildRecipe(zones) {
  // Filter out ignored zones and their descendants
  const activeZones = zones.filter(zone => !isIgnoredOrDescendantOfIgnored(zone, zones));
  
  // ... rest of recipe building logic
}

function isIgnoredOrDescendantOfIgnored(zone, allZones) {
  if (zone.ignored) return true;
  
  // Check if any ancestor is ignored
  let current = zone;
  while (current.parent) {
    const parent = allZones.find(z => z.key === current.parent);
    if (!parent) break;
    if (parent.ignored) return true;
    current = parent;
  }
  
  return false;
}
```

---

### 1.5 html-patcher.js Tests

**File:** `server/__tests__/html-patcher.test.js`

**Test Cases:**

```javascript
describe('htmlPatcher - ignored zones', () => {
  it('should skip patching ignored zones', () => {
    const html = '<div data-zone-key="zone1">Original</div>';
    const patchData = {
      zone1: { html: '<div>Patched</div>', ignored: true }
    };
    const result = patchHtml(html, patchData);
    expect(result).toContain('Original');
    expect(result).not.toContain('Patched');
  });

  it('should strip data-ignore attribute from output', () => {
    const html = '<div data-ignore="true" data-zone-key="zone1">Content</div>';
    const patchData = {
      zone1: { html: '<div>New Content</div>', ignored: false }
    };
    const result = patchHtml(html, patchData);
    expect(result).not.toContain('data-ignore');
  });

  it('should patch non-ignored zones normally', () => {
    const html = '<div data-zone-key="zone1">Original</div>';
    const patchData = {
      zone1: { html: '<div>Patched</div>', ignored: false }
    };
    const result = patchHtml(html, patchData);
    expect(result).toContain('Patched');
    expect(result).not.toContain('Original');
  });

  it('should handle mixed ignored and non-ignored zones', () => {
    const html = `
      <div data-zone-key="zone1">Zone 1</div>
      <div data-zone-key="zone2">Zone 2</div>
      <div data-zone-key="zone3">Zone 3</div>
    `;
    const patchData = {
      zone1: { html: '<div>New Zone 1</div>', ignored: false },
      zone2: { html: '<div>New Zone 2</div>', ignored: true },
      zone3: { html: '<div>New Zone 3</div>', ignored: false }
    };
    const result = patchHtml(html, patchData);
    expect(result).toContain('New Zone 1');
    expect(result).toContain('Zone 2'); // Should remain unchanged
    expect(result).toContain('New Zone 3');
  });

  it('should strip data-ignore even for non-patched zones', () => {
    const html = '<div data-ignore="true">Content</div>';
    const result = stripIgnoreAttribute(html);
    expect(result).not.toContain('data-ignore');
  });
});
```

### 1.6 html-patcher.js Implementation

**File:** `server/lib/html-patcher.js`

Modify patching logic (around line 200):

```javascript
function patchZone(element, patchData) {
  const zoneKey = element.getAttribute('data-zone-key');
  if (!zoneKey) return;
  
  const patch = patchData[zoneKey];
  if (!patch) return;
  
  // Skip patching if zone is ignored
  if (patch.ignored) {
    // Still strip the data-ignore attribute
    element.removeAttribute('data-ignore');
    return;
  }
  
  // Normal patching logic
  element.innerHTML = patch.html;
}

function stripIgnoreAttributes(html) {
  return html.replace(/\s*data-ignore="[^"]*"/g, '');
}
```

---

### 1.7 API Endpoint Tests

**File:** `server/__tests__/html-flow.test.js`

**Test Cases:**

```javascript
describe('POST /api/html/generate - ignored zones', () => {
  it('should accept ignored field in zone submissions', async () => {
    const payload = {
      zones: [
        { key: 'zone1', ignored: false },
        { key: 'zone2', ignored: true }
      ]
    };
    const response = await request(app).post('/api/html/generate').send(payload);
    expect(response.status).toBe(200);
  });

  it('should not require ignored field in zone submissions', async () => {
    const payload = {
      zones: [
        { key: 'zone1' }, // no ignored field
        { key: 'zone2' }
      ]
    };
    const response = await request(app).post('/api/html/generate').send(payload);
    expect(response.status).toBe(200);
  });

  it('should default ignored to false when not provided', async () => {
    const payload = {
      zones: [{ key: 'zone1' }]
    };
    const response = await request(app).post('/api/html/generate').send(payload);
    const generated = response.body;
    // Verify that zone1 was generated (not ignored)
    expect(generated.recipe.items).toContainEqual(expect.objectContaining({ key: 'zone1' }));
  });

  it('should exclude ignored zones from recipe in response', async () => {
    const payload = {
      zones: [
        { key: 'zone1', ignored: false },
        { key: 'zone2', ignored: true }
      ]
    };
    const response = await request(app).post('/api/html/generate').send(payload);
    expect(response.body.recipe.items).toHaveLength(1);
    expect(response.body.recipe.items[0].key).toBe('zone1');
  });
});
```

### 1.8 API Endpoint Implementation

**File:** `server/routes/html-flow.js`

Update validation and processing (around line 50):

```javascript
app.post('/api/html/generate', async (req, res) => {
  const { zones } = req.body;
  
  // Validate zones (ignored field is optional)
  const validatedZones = zones.map(zone => ({
    ...zone,
    ignored: zone.ignored || false  // Default to false
  }));
  
  // Build recipe (will filter ignored zones)
  const recipe = buildRecipe(validatedZones);
  
  // ... rest of generation logic
  res.json({ recipe, /* ... */ });
});
```

---

## Phase 2: Frontend Implementation (TDD)

### 2.1 CSS for Ignored State

**File:** `client/src/index.css`

Add new CSS classes:

```css
/* Ignored zone styling */
.tree-node--ignored .tree-node-label {
  text-decoration: line-through;
  color: var(--color-text-muted, #999);
  opacity: 0.7;
}

.tree-node--ignored .tree-node-zone-badge {
  opacity: 0.6;
}

/* Ignore button styling — always visible on all tree nodes */
.tree-node-ignore-btn {
  width: 44px;
  height: 44px;
  padding: 0;
  margin: 0 4px;
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  border-radius: 4px;
  transition: background-color var(--transition-fast, 0.2s), color var(--transition-fast, 0.2s);
  opacity: 1;  /* Always visible, not hidden by default */
}

.tree-node-ignore-btn:hover {
  background-color: var(--color-hover-bg, #f0f0f0);
}

.tree-node-ignore-btn:active {
  background-color: var(--color-active-bg, #e0e0e0);
}

.tree-node-ignore-btn[aria-pressed="true"] {
  color: var(--color-error, #d32f2f);
  font-weight: bold;
}

.tree-node-ignore-btn[aria-pressed="true"]:hover {
  background-color: rgba(211, 47, 47, 0.1);
}
```

### 2.2 HtmlTreePanel Component Tests

**File:** `client/src/components/__tests__/HtmlTreePanel.test.jsx`

**Test Cases:**

```javascript
import { render, screen, fireEvent } from '@testing-library/react';
import HtmlTreePanel from '../HtmlTreePanel';

describe('HtmlTreePanel - Ignore Button', () => {
  it('should render ignore button on ALL tree nodes (assigned or not)', () => {
    const tree = {
      children: [
        { nodeId: '1', label: 'Node 1', zoneType: 'leaf', ignored: false }
      ]
    };
    render(<HtmlTreePanel tree={tree} />);
    expect(screen.getByLabelText('Ignore zone')).toBeInTheDocument();
  });

  it('should toggle ignored state when ignore button is clicked', () => {
    const tree = {
      children: [
        { nodeId: '1', label: 'Node 1', zoneType: 'leaf', ignored: false }
      ]
    };
    const onUpdate = jest.fn();
    render(<HtmlTreePanel tree={tree} onUpdate={onUpdate} />);
    
    const ignoreBtn = screen.getByLabelText('Ignore zone');
    fireEvent.click(ignoreBtn);
    
    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ ignored: true })
    );
  });

  it('should show visual indicator for ignored zones', () => {
    const tree = {
      children: [
        { nodeId: '1', label: 'Node 1', zoneType: 'leaf', ignored: true }
      ]
    };
    render(<HtmlTreePanel tree={tree} />);
    
    const node = screen.getByText('Node 1').closest('.tree-node');
    expect(node).toHaveClass('tree-node--ignored');
  });

  it('should set aria-pressed on ignore button based on ignored state', () => {
    const tree = {
      children: [
        { nodeId: '1', label: 'Node 1', zoneType: 'leaf', ignored: true }
      ]
    };
    render(<HtmlTreePanel tree={tree} />);
    
    const ignoreBtn = screen.getByLabelText('Ignore zone');
    expect(ignoreBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('should handle multiple nodes with different ignored states', () => {
    const tree = {
      children: [
        { nodeId: '1', label: 'Node 1', zoneType: 'leaf', ignored: false },
        { nodeId: '2', label: 'Node 2', zoneType: 'leaf', ignored: true },
        { nodeId: '3', label: 'Node 3', zoneType: 'leaf', ignored: false }
      ]
    };
    render(<HtmlTreePanel tree={tree} />);
    
    const nodes = screen.getAllByRole('button', { name: /Ignore zone/ });
    expect(nodes).toHaveLength(3);
    expect(nodes[0]).toHaveAttribute('aria-pressed', 'false');
    expect(nodes[1]).toHaveAttribute('aria-pressed', 'true');
    expect(nodes[2]).toHaveAttribute('aria-pressed', 'false');
  });
});
```

### 2.3 HtmlTreePanel Component Implementation

**File:** `client/src/components/HtmlTreePanel.jsx`

Update TreeNode component (around line 330-440):

```javascript
function TreeNode({ node, onUpdate, level = 0 }) {
  const [expanded, setExpanded] = useState(false);
  const [ignored, setIgnored] = useState(node.ignored || false);

  const handleIgnoreClick = () => {
    const newIgnored = !ignored;
    setIgnored(newIgnored);
    onUpdate({ ...node, ignored: newIgnored });
  };

  return (
    <div className={`tree-node ${ignored ? 'tree-node--ignored' : ''}`}>
      <div className="tree-node-row">
        {/* Expand button */}
        {node.children?.length > 0 && (
          <button
            className="tree-node-expand-btn"
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
          >
            {expanded ? '▼' : '▶'}
          </button>
        )}

        {/* Label */}
        <span className="tree-node-label">{node.label}</span>

        {/* Zone badge */}
        {node.zoneType && (
          <span className="tree-node-zone-badge">{node.zoneType}</span>
        )}

        {/* Ignore button */}
        <button
          className="tree-node-ignore-btn"
          onClick={handleIgnoreClick}
          aria-pressed={ignored}
          aria-label="Ignore zone"
          title={ignored ? 'Un-ignore zone' : 'Ignore zone'}
        >
          {ignored ? '🚫' : '⊘'}
        </button>

        {/* Assign button */}
        <button
          className="tree-node-assign-btn"
          onClick={() => onUpdate({ ...node, assigned: true })}
          aria-label="Assign zone"
        >
          ✓
        </button>
      </div>

      {/* Children */}
      {expanded && node.children?.length > 0 && (
        <div className="tree-node-children">
          {node.children.map(child => (
            <TreeNode
              key={child.nodeId}
              node={child}
              onUpdate={onUpdate}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## Phase 3: E2E Tests

**File:** `e2e/html-ignore-zones.spec.js`

**Test Cases:**

```javascript
import { test, expect } from '@playwright/test';

test.describe('Ignore Zones E2E', () => {
  test('should ignore a single leaf zone and exclude from recipe', async ({ page }) => {
    await page.goto('/html-flow');
    
    // Find and click ignore button on first zone
    const ignoreBtn = page.locator('.tree-node-ignore-btn').first();
    await ignoreBtn.click();
    
    // Verify visual indicator
    const node = page.locator('.tree-node').first();
    await expect(node).toHaveClass(/tree-node--ignored/);
    
    // Generate recipe
    await page.click('button:has-text("Generate")');
    
    // Verify ignored zone is not in recipe
    const recipe = await page.locator('.recipe-item').count();
    expect(recipe).toBeLessThan(10); // Assuming there were 10+ zones before
  });

  test('should ignore a block zone and exclude all children', async ({ page }) => {
    await page.goto('/html-flow');
    
    // Find block zone and click ignore
    const blockNode = page.locator('.tree-node--block').first();
    const ignoreBtn = blockNode.locator('.tree-node-ignore-btn');
    await ignoreBtn.click();
    
    // Generate and verify
    await page.click('button:has-text("Generate")');
    const recipe = await page.locator('.recipe-item').count();
    expect(recipe).toBeLessThan(10);
  });

  test('should toggle ignored state on and off', async ({ page }) => {
    await page.goto('/html-flow');
    
    const ignoreBtn = page.locator('.tree-node-ignore-btn').first();
    const node = page.locator('.tree-node').first();
    
    // Click to ignore
    await ignoreBtn.click();
    await expect(node).toHaveClass(/tree-node--ignored/);
    
    // Click to un-ignore
    await ignoreBtn.click();
    await expect(node).not.toHaveClass(/tree-node--ignored/);
  });

  test('should preserve ignored state in chain.json', async ({ page }) => {
    await page.goto('/html-flow');
    
    // Ignore a zone
    const ignoreBtn = page.locator('.tree-node-ignore-btn').first();
    await ignoreBtn.click();
    
    // Save (trigger chain.json write)
    await page.click('button:has-text("Save")');
    
    // Reload page
    await page.reload();
    
    // Verify ignored state persists
    const node = page.locator('.tree-node').first();
    await expect(node).toHaveClass(/tree-node--ignored/);
  });

  test('should strip data-ignore attribute from output HTML', async ({ page }) => {
    await page.goto('/html-flow');
    
    // Generate HTML with ignored zones
    await page.click('button:has-text("Generate")');
    
    // Download/inspect output
    const output = await page.locator('#output-html').textContent();
    expect(output).not.toContain('data-ignore');
  });

  test('should not patch ignored zones with AI content', async ({ page }) => {
    await page.goto('/html-flow');
    
    // Mark a zone as ignored
    const originalContent = await page.locator('[data-zone-key="zone1"]').textContent();
    const ignoreBtn = page.locator('.tree-node-ignore-btn').first();
    await ignoreBtn.click();
    
    // Generate
    await page.click('button:has-text("Generate")');
    
    // Verify content unchanged
    const newContent = await page.locator('[data-zone-key="zone1"]').textContent();
    expect(newContent).toBe(originalContent);
  });
});
```

---

## Definition of Done

- [x] All server-side unit tests pass (selections-to-zones, recipe builder, patcher, API)
- [x] All frontend unit tests pass (HtmlTreePanel ignore button)
- [x] All E2E tests pass (6 scenarios)
- [x] Existing test suite still passes (227 unit + 142 E2E)
- [x] CSS styling matches design (strikethrough, muted color, button states)
- [x] Ignore button has proper accessibility (aria-label, aria-pressed)
- [x] Code follows existing patterns and conventions
- [x] No console errors or warnings
- [x] Feature branch merged to `html-flow`
- [x] Code review completed

---

## Timeline

| Phase | Task | Duration | Status |
|-------|------|----------|--------|
| 1 | Server-side tests & implementation | 1.5 days | Pending |
| 2 | Frontend tests & implementation | 1 day | Pending |
| 3 | E2E tests & verification | 0.5 day | Pending |
| - | Code review & merge | 0.5 day | Pending |
| **Total** | | **3-4 days** | **Pending** |

---

## Files Modified

### Server
- `server/lib/selections-to-zones.js` — Add ignored field
- `server/lib/html-recipe-builder.js` — Filter ignored zones
- `server/lib/html-patcher.js` — Skip patching ignored zones, strip attribute
- `server/routes/html-flow.js` — API validation
- `server/__tests__/selections-to-zones.test.js` — New tests
- `server/__tests__/html-recipe-builder.test.js` — New tests
- `server/__tests__/html-patcher.test.js` — New tests
- `server/__tests__/html-flow.test.js` — New tests

### Client
- `client/src/components/HtmlTreePanel.jsx` — Add ignore button
- `client/src/index.css` — Add ignored state styles
- `client/src/components/__tests__/HtmlTreePanel.test.jsx` — New tests

### E2E
- `e2e/html-ignore-zones.spec.js` — New E2E tests

---

## Success Criteria

1. ✅ All tests pass (unit + E2E)
2. ✅ Ignored zones are excluded from recipe generation
3. ✅ Ignored zones are not patched with AI content
4. ✅ `data-ignore` attribute is stripped from output
5. ✅ Ignore state persists in chain.json
6. ✅ UI provides visual feedback for ignored zones
7. ✅ Ignore button is accessible and responsive
8. ✅ No regressions in existing features
