# Full-Slide Content Generation User Guide

## Overview

The **Full-Slide Content Generation** feature allows you to generate content for all zones on a slide at once, instead of generating content for individual zones. This is perfect for creating multiple variations of a template-based slide quickly.

**Key Capability:** Generate **multiple instances** of repeatable slides in a single request with different values for each instance.

**Use Case Examples:**
- Generate 5 product cards with different titles, descriptions, and prices
- Create 10 employee profile cards with unique names, roles, and bios
- Build a feature list with multiple items, each with different content

---

## Getting Started

### Step 1: Upload Your HTML Template

1. From the SOLON Slide Studio home screen, click **"Visual HTML"** card to select the HTML flow
2. Click the **upload zone** or drag-and-drop your HTML file
3. Wait for the file to be processed and the DOM tree to appear

### Step 2: Assign Zones to Your Slide

1. In the **DOM Tree Panel** (left side), click the **Assign** button next to any HTML element you want to make editable
2. Enter a zone name (e.g., `product_title`, `product_description`)
3. Choose the zone type:
   - **Text** — for text content
   - **Number** — for numeric values
   - **Block** — for full HTML content (recommended for most use cases)
4. Click **Confirm** to save the zone assignment
5. Repeat for each zone you want to generate

**Tip:** You need at least one zone assigned to enable the "Generate Full Slide" button.

### Step 3: Mark Slide as Repeatable (Optional)

If you want to generate **multiple instances** of the same slide:

1. Look for the **repeatable toggle** checkbox in the slide control bar
2. Check the box to mark the slide as repeatable
3. When assigning zones, you can now mark them as:
   - **Unique** ✓ — Different value for each instance (e.g., product name)
   - **Shared** ✗ — Same value for all instances (e.g., category)

**Example:** Product cards where:
- `product_name` is **unique** (different for each card)
- `product_category` is **shared** (same for all cards)

---

## Using Full-Slide Generation

### Step 4: Click "Generate Full Slide"

Once you have assigned zones to your slide:

1. Look for the **⚡ Generate Full Slide** button in the slide control bar (top right of the tree panel)
   - The button is only visible when you have zones assigned to the current slide
2. Click the button

**What happens:**
- SOLON automatically creates a project with your zones
- You're taken to the **Recipe Step** where you can see the AI prompt
- The recipe will include all zones on the slide with the special instruction: **"GENERATE ALL ZONES FOR THIS SLIDE"**

### Step 5: Generate the Recipe

1. You'll see the **AI Recipe Prompt** on the left side
2. Click **"Generate recipe"** button to create the prompt
3. The recipe will appear showing:
   - All zones on your slide
   - Example HTML for each zone
   - Instructions for the AI on how to generate content

**For Static Slides:**
```
GENERATE ALL ZONES FOR THIS SLIDE:

1. BLOCK ZONES (generate full innerHTML for each container):
{
  "blocks": {
    "product_title": {
      "value": "<!-- your generated HTML here -->"
    },
    "product_description": {
      "value": "<!-- your generated HTML here -->"
    },
    ...
  }
}
```

**For Repeatable Slides:**
```
GENERATE ALL ZONES FOR THIS SLIDE:

1. REPEATABLE SLIDE — product_card
2a. SHARED VALUES (same on every clone):
{
  "product_category": {
    "value": "<!-- your generated HTML here -->"
  }
}

2b. INSTANCE VALUES (unique per clone):
{
  "instances": [
    {
      "product_name": { "value": "<!-- product 1 name -->" },
      "product_price": { "value": "<!-- product 1 price -->" }
    },
    {
      "product_name": { "value": "<!-- product 2 name -->" },
      "product_price": { "value": "<!-- product 2 price -->" }
    }
  ]
}
```

---

## Step 6: Send to AI and Get Content

1. Copy the recipe (click the **⧉** button to copy)
2. Paste it into your AI tool (ChatGPT, Claude, etc.)
3. Add a prompt telling the AI how many instances to generate:
   ```
   Generate 5 product cards using this template.
   Each card should have a unique product name and price.
   The category should be "Electronics" for all cards.
   ```
4. The AI will generate content for **all zones and all instances at once**

**Example AI Response (for 3 product cards):**
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
            "value": "<h2>Premium Coffee Maker</h2>"
          },
          "product_price": {
            "value": "<span class=\"price\">$299.99</span>"
          }
        },
        {
          "product_name": {
            "value": "<h2>Wireless Headphones</h2>"
          },
          "product_price": {
            "value": "<span class=\"price\">$149.99</span>"
          }
        },
        {
          "product_name": {
            "value": "<h2>Smart Watch</h2>"
          },
          "product_price": {
            "value": "<span class=\"price\">$199.99</span>"
          }
        }
      ]
    }
  }
}
```

---

## Step 7: Paste JSON and Apply

1. Paste the AI-generated JSON into the **JSON Input** field on the right side
2. SOLON will **automatically validate** the JSON
   - Green checkmark = Valid ✓
   - Red error = Missing zones or invalid format ✗
3. Once valid, click **"Apply content"** button
4. SOLON will update your HTML template with the generated content

---

## Step 8: Preview and Download

1. You're taken to the **Preview Step** where you can see your slide with the generated content
2. For repeatable slides, you'll see **all instances** rendered
3. Click **"Download HTML"** to save the updated file with all instances
4. Or click **"Start new project"** to generate another set of variations

---

## Key Differences: Full-Slide vs. Regular Generation

| Feature | Full-Slide Generation | Regular Generation |
|---------|----------------------|-------------------|
| **Zones Generated** | All zones on slide at once | One zone at a time |
| **AI Context** | Full slide context | Single zone context |
| **Repeatable Support** | ✅ Yes (multiple instances) | ✅ Yes (one instance at a time) |
| **Speed** | Faster (fewer AI requests) | Slower (multiple requests) |
| **Use Case** | Templates, bulk generation | Individual content updates |
| **Button** | ⚡ Generate Full Slide | (Use "Generate recipe" directly) |

---

## Advanced: Repeatable Slides with Full-Slide Generation

### Understanding Unique vs. Shared Zones

When you mark a slide as repeatable:

- **Unique Zones** — Different value for each instance
  - Goes into `instances` array in the recipe
  - Each instance object contains its unique values
  - AI should generate N different values (one per instance)

- **Shared Zones** — Same value for all instances
  - Goes into `shared` object in the recipe
  - Single value used for all instances
  - AI generates one value that applies to all

### Example: Product Card with 5 Instances

**Setup:**
- Mark slide as repeatable
- Mark `product_name` as **unique** (different per product)
- Mark `product_price` as **unique** (different per product)
- Mark `product_category` as **shared** (same for all products)

**Recipe asks for:**
- 1 shared category value
- 5 instance objects with unique name and price

**AI generates:**
- 1 category (e.g., "Electronics")
- 5 products with different names and prices

**Result:**
- All 5 products have the same category
- Each product has a unique name and price

---

## Tips & Best Practices

### ✅ Do's

- **Use full-slide generation for templates** — Product cards, profile cards, feature blocks
- **Assign all zones before clicking the button** — The recipe will include all assigned zones
- **Use Block zones for HTML content** — This gives the AI more flexibility
- **Add helpful prompts to zones** — Include hints like "Product name, max 50 chars" to guide the AI
- **Review the recipe before sending to AI** — Make sure it includes all the zones you want
- **Tell the AI how many instances to generate** — "Generate 5 product cards" is clearer than "Generate multiple"
- **Use shared zones for repeated content** — Mark zones as shared if the value should be identical across instances
- **Use unique zones for varying content** — Mark zones as unique if each instance needs different content

### ❌ Don'ts

- **Don't use full-slide generation for single-zone updates** — Use regular generation instead
- **Don't assign zones you don't want generated** — Only assign zones you want the AI to fill
- **Don't manually edit the recipe** — SOLON generates it automatically
- **Don't forget to validate JSON** — Always check the validation status before applying
- **Don't forget to tell AI how many instances** — The recipe structure supports N instances, so specify the count

---

## Handling Ignored Zones

If you have zones you want to **preserve** (not regenerate):

1. Click the **ignore icon** (⊘) next to the zone in the tree panel
2. Ignored zones will:
   - **Not appear in the recipe** — AI won't be asked to generate them
   - **Keep their original content** — Existing values are preserved
   - **Be excluded from full-slide generation** — Only non-ignored zones are generated

**Example:** You have a product card with a logo zone. Mark the logo as ignored, and only the product title, description, and price will be generated.

---

## Troubleshooting

### "Generate Full Slide" button is not visible

**Cause:** No zones assigned to the slide

**Solution:** 
1. Go back to the DOM tree
2. Assign at least one zone using the Assign button
3. The button will appear once zones are assigned

### Validation error: "Missing fields"

**Cause:** The JSON you provided is missing some zones that the recipe requested

**Solution:**
1. Check the error message for which zones are missing
2. Ask the AI to regenerate with all zones included
3. Make sure the JSON structure matches the recipe format

### "Apply failed" error

**Cause:** The JSON format doesn't match what SOLON expects

**Solution:**
1. Check that the JSON is valid (use a JSON validator)
2. Ensure all zone names match exactly (case-sensitive)
3. For block zones, make sure the value contains valid HTML
4. For repeatable slides, ensure the `instances` array has all required unique zones

### Recipe doesn't show "GENERATE ALL ZONES FOR THIS SLIDE"

**Cause:** You're not in full-slide generation mode

**Solution:**
1. Make sure you clicked the ⚡ **Generate Full Slide** button (not the regular "Generate recipe" button)
2. The button should be in the slide control bar at the top right of the tree panel

### Repeatable slide recipe isn't generating instances

**Cause:** No zones marked as unique on the repeatable slide

**Solution:**
1. Mark at least one zone as **unique** when assigning zones
2. The recipe will then include an `instances` array for those unique zones
3. Tell the AI how many instances to generate

---

## Example Workflows

### Scenario 1: Generate 5 Product Cards (Repeatable)

**Goal:** Create 5 different product cards for an e-commerce site using the same template

**Setup:**
1. Upload your product card HTML template
2. Mark the slide as **repeatable**
3. Assign zones:
   - `product_name` (Block) — mark as **unique**
   - `product_description` (Block) — mark as **unique**
   - `product_price` (Text) — mark as **unique**
   - `product_category` (Text) — mark as **shared**

**Execution:**
1. Click **"Generate Full Slide"**
2. Click **"Generate recipe"**
3. Copy the recipe
4. Send to AI with prompt:
   ```
   Generate 5 different product cards.
   Each card should have a unique product name, description, and price.
   All cards should have the category "Electronics".
   ```
5. Paste AI response into JSON field
6. Click **"Apply content"**
7. Download HTML with all 5 products

**Result:** One HTML file with 5 fully generated product cards in a single request!

---

### Scenario 2: Generate Single Slide (No Repeating)

**Goal:** Generate all content for a single slide with multiple zones at once

**Setup:**
1. Upload your HTML template
2. **Don't** mark the slide as repeatable
3. Assign zones:
   - `slide_title` (Block)
   - `slide_description` (Block)
   - `slide_image` (Block)

**Execution:**
1. Click **"Generate Full Slide"**
2. Click **"Generate recipe"**
3. Copy the recipe
4. Send to AI
5. Paste response and apply

**Result:** All zones on the slide generated in one AI request!

---

## Next Steps

- **Learn about zone types** — Read the HTML Flow documentation
- **Explore zone prompts** — Add custom instructions to guide the AI
- **Experiment with repeatable slides** — Try generating different numbers of instances
- **Download your content** — Export the final HTML for use in your projects

---

**Questions?** Check the SOLON documentation or contact support.
