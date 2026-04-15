# Full-Slide Content Generation User Guide

## Overview

The **Full-Slide Content Generation** feature allows you to generate content for all zones on a slide at once. It includes two powerful independent toggles:

1. **Repeatable** — Mark zones as unique/shared for instance variation within a single slide
2. **Generate Full Slide** — Auto-discover all zones and generate them as one content block

**Key Capabilities:**
- Generate all zones simultaneously (faster than one-by-one)
- Create multiple instances with shared and unique values
- Auto-discover zones from your HTML template
- Combine both toggles for bulk variations

---

## The Two Toggles

### Toggle 1: Repeatable

**What it does:** Allows you to mark zones as either unique or shared within a single slide.

- **Unique zones** — Different value for each instance (e.g., product name)
- **Shared zones** — Same value for all instances (e.g., category)

**Use case:** You have a product card template. Mark `product_name` as unique (different per product) and `product_category` as shared (same for all).

**When to enable:** When you want instance variation within a slide.

### Toggle 2: Generate Full Slide

**What it does:** Auto-discovers all zones from your HTML template and generates them as a single content block.

- Automatically finds all `data-zone` and `data-block` attributes
- Creates zones for elements you haven't manually assigned
- Generates all zones together instead of one at a time
- Faster and more efficient for complete slide generation

**Use case:** You want to generate an entire slide's content at once, including zones you may have missed.

**When to enable:** When you want SOLON to auto-discover zones and generate the entire slide as one unit.

---

## Getting Started

### Step 1: Upload Your HTML Template

1. From the SOLON Slide Studio home screen, click **"Visual HTML"** card
2. Click the **upload zone** or drag-and-drop your HTML file
3. Wait for the DOM tree to appear

### Step 2: Assign Zones

1. In the **DOM Tree Panel**, click **Assign** next to elements you want to make editable
2. Enter a zone name (e.g., `product_title`)
3. Choose zone type: **Text**, **Number**, or **Block**
4. Click **Confirm**

**Tip:** You need at least one zone to enable "Generate Full Slide" button.

### Step 3: Configure Toggles (Optional)

In the **Slide Control Bar**, you'll see two independent toggles:

#### Enable "Repeatable" (Optional)

1. Check the **Repeatable** checkbox
2. Enter a slide key (e.g., `product_card`)
3. Enter a generation prompt (e.g., "Generate one instance per car model")
4. When assigning zones, you can now mark them as:
   - **Unique** ✓ — Different per instance
   - **Shared** ✗ — Same for all instances

#### Enable "Generate Full Slide" (Optional)

1. Check the **Generate Full Slide** checkbox
2. When you create the project, SOLON will auto-discover all zones from the HTML
3. The recipe will include all auto-discovered zones plus any you manually assigned

#### Combine Both (Advanced)

You can enable both toggles simultaneously:
- **Repeatable** = Zones can have unique/shared values within a single slide
- **Generate Full Slide** = Auto-discover all zones from the template
- **Together** = Generate a single slide with multiple instances, auto-discovering zones

---

## Using Full-Slide Generation

### Step 4: Create Project

1. Once you've configured your toggles (Repeatable and/or Generate Full Slide), click **"Create Project"**
2. If "Generate Full Slide" is enabled, SOLON will auto-discover all zones from your template

**What happens:**
- SOLON creates a project with your zones (manual + auto-discovered)
- You're taken to the **Recipe Step**
- The recipe includes all zones ready for generation

### Step 5: Generate the Recipe

1. Click **"Generate recipe"** button
2. The recipe will appear showing all zones and their examples

**Recipe format depends on your configuration:**

#### Static Slide (No toggles enabled)
```json
{
  "blocks": {
    "product_title": { "value": "<!-- HTML here -->" },
    "product_description": { "value": "<!-- HTML here -->" }
  }
}
```

#### Repeatable Only
```json
{
  "slides": {
    "product_card": {
      "shared": {
        "product_category": { "value": "<!-- HTML here -->" }
      },
      "instances": [
        { "product_name": { "value": "<!-- HTML here -->" } },
        { "product_name": { "value": "<!-- HTML here -->" } }
      ]
    }
  }
}
```

#### Generate Full Slide Only
```json
{
  "blocks": {
    "auto_discovered_zone_1": { "value": "<!-- HTML here -->" },
    "auto_discovered_zone_2": { "value": "<!-- HTML here -->" }
  }
}
```

#### Both Repeatable and Generate Full Slide
```json
{
  "slides": {
    "product_card": {
      "shared": {
        "auto_discovered_shared_zone": { "value": "<!-- HTML here -->" }
      },
      "instances": [
        { "auto_discovered_unique_zone": { "value": "<!-- HTML here -->" } }
      ]
    }
  }
}
```

---

## Step 6: Send to AI

1. Copy the recipe (click **⧉** button)
2. Paste into your AI tool
3. **Tell the AI exactly how many copies to generate:**
   ```
   Generate 5 product cards using this template.
   Each card should have:
   - Unique: product name and price
   - Shared: category = "Electronics"
   ```

### Example AI Response (5 Product Cards)

```json
{
  "blocks": {},
  "slides": {
    "product_card": {
      "shared": {
        "product_category": {
          "value": "<span class=\"category\">Electronics</span>"
        }
      },
      "instances": [
        {
          "product_name": {
            "value": "<h2>Coffee Maker</h2>"
          },
          "product_price": {
            "value": "<span>$299.99</span>"
          }
        },
        {
          "product_name": {
            "value": "<h2>Headphones</h2>"
          },
          "product_price": {
            "value": "<span>$149.99</span>"
          }
        },
        {
          "product_name": {
            "value": "<h2>Smart Watch</h2>"
          },
          "product_price": {
            "value": "<span>$199.99</span>"
          }
        },
        {
          "product_name": {
            "value": "<h2>Tablet</h2>"
          },
          "product_price": {
            "value": "<span>$499.99</span>"
          }
        },
        {
          "product_name": {
            "value": "<h2>Camera</h2>"
          },
          "product_price": {
            "value": "<span>$799.99</span>"
          }
        }
      ]
    }
  }
}
```

---

## Step 7: Apply Content

1. Paste the AI JSON into the **JSON Input** field
2. SOLON validates automatically (green checkmark = valid)
3. Click **"Apply content"**
4. Review in **Preview Step**
5. Click **"Download HTML"**

---

## Configuration Examples

### Example 1: Single Slide, Manual Zones (No Toggles)

**Setup:**
- Assign zones: `title`, `description`, `image`
- **Don't** enable any toggles

**Result:**
- Recipe asks for all 3 zones
- AI generates 1 slide with all zones filled
- Download 1 HTML file

---

### Example 2: Auto-Discover All Zones (Generate Full Slide Only)

**Setup:**
- Optionally assign some zones manually
- Enable **Generate Full Slide** toggle
- **Don't** enable Repeatable

**Result:**
- SOLON auto-discovers all zones from your HTML template
- Recipe includes manual zones + auto-discovered zones
- AI generates 1 slide with all zones filled
- Download 1 HTML file

---

### Example 3: Instance Variation, Single Slide (Repeatable Only)

**Setup:**
- Assign zones: `product_name` (unique), `product_category` (shared)
- Enable **Repeatable** toggle
- **Don't** enable Generate Full Slide

**Result:**
- Recipe asks for shared values + instances
- AI generates 1 slide with multiple products
- Each product has unique name, shared category
- Download 1 HTML file with 1 slide (containing multiple products)

---

### Example 4: Both Toggles (Repeatable + Generate Full Slide)

**Setup:**
- Optionally assign some zones manually
- Enable **Repeatable** toggle
- Enable **Generate Full Slide** toggle

**Result:**
- SOLON auto-discovers all zones from your template
- Recipe includes shared values + instances
- AI generates 1 slide with multiple instances, all zones filled
- Each instance has unique values for unique zones, shared values for shared zones
- Download 1 HTML file with 1 slide (containing multiple instances)

**Example:** Product card with 5 product instances, each with unique name/price but shared category.

---

## Tips & Best Practices

### ✅ Do's

- **Use "Generate Full Slide" for templates** — Product cards, profiles, features
- **Assign all zones before clicking button** — Recipe includes all assigned zones
- **Use Block zones for HTML content** — More AI flexibility
- **Add helpful prompts to zones** — Guide the AI (e.g., "Product name, max 50 chars")
- **Review the recipe before sending to AI** — Ensure all zones are included
- **Tell AI the exact count** — "Generate 5 products" is clearer than "Generate multiple"
- **Use shared zones wisely** — Mark zones as shared only if value should be identical
- **Use unique zones for variation** — Mark zones as unique if each instance needs different content

### ❌ Don'ts

- **Don't use full-slide for single-zone updates** — Use regular generation instead
- **Don't assign zones you don't want generated** — Only assign what AI should fill
- **Don't manually edit the recipe** — SOLON generates it automatically
- **Don't forget validation** — Always check the green checkmark before applying
- **Don't forget to specify count** — Tell AI how many copies/instances to generate

---

## Handling Ignored Zones

Mark zones to **preserve** (not regenerate):

1. Click the **ignore icon** (⊘) next to the zone in the tree
2. Ignored zones:
   - Don't appear in the recipe
   - Keep original content
   - Excluded from full-slide generation

**Example:** Product card with logo. Mark logo as ignored, generate only title, description, and price.

---

## Troubleshooting

### "Generate Full Slide" button not visible

**Cause:** No zones assigned

**Solution:** Assign at least one zone using the Assign button

---

### Validation error: "Missing fields"

**Cause:** JSON missing zones that recipe requested

**Solution:** 
1. Check error message for missing zones
2. Ask AI to regenerate with all zones
3. Ensure JSON structure matches recipe format

---

### Repeatable toggle not showing unique/shared options

**Cause:** Repeatable not enabled

**Solution:** Check the Repeatable checkbox first

---

### "Generate Full Slide" toggle not working

**Cause:** Toggle may not be visible if no zones are assigned

**Solution:** Assign at least one zone first, then toggle "Generate Full Slide"

---

## Comparison Table

| Scenario | Repeatable | Generate Full Slide | Result |
|----------|-----------|-------------------|--------|
| Single slide, manual zones | ❌ | ❌ | 1 slide, manual zones filled |
| Auto-discover all zones | ❌ | ✅ | 1 slide, all zones filled |
| Slide with 5 product instances | ✅ | ❌ | 1 slide, 5 instances (manual zones) |
| Slide with 5 instances, auto-discover | ✅ | ✅ | 1 slide, 5 instances (all zones) |

---

## Next Steps

- Learn about zone types in the HTML Flow documentation
- Explore zone prompts to guide the AI
- Experiment with different toggle combinations
- Download and use your generated content

---

**Questions?** Check the SOLON documentation or contact support.
