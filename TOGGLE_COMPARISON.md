# Functional Difference: Repeatable vs. Multiple

## Quick Summary

| Aspect | Repeatable | Multiple |
|--------|-----------|----------|
| **What it does** | Marks zones as unique or shared within a single slide | Generates N copies of the entire slide |
| **Affects** | How zones are structured within ONE slide | How many slides are generated |
| **Zone handling** | Divides zones into unique (per instance) and shared (all same) | All zones treated the same way |
| **JSON structure** | Creates `shared` + `instances` array | Creates N separate slide objects |
| **Use case** | Multiple products on ONE slide | Multiple slides/pages |
| **Example** | 1 slide with 5 products | 5 separate product slides |

---

## Detailed Comparison

### REPEATABLE Toggle

**What it does:**
- Allows you to mark individual zones as either **unique** or **shared**
- Generates ONE slide with MULTIPLE INSTANCES of content within it
- The AI decides how many instances to create based on context

**How it works:**
1. You mark zone as "unique" or "shared" when assigning
2. Recipe shows:
   - `shared` section = values that appear once (same everywhere)
   - `instances` array = values that repeat (different each time)
3. AI generates one JSON response with shared values + array of instances

**Example: 1 Slide with 5 Products**
```json
{
  "slides": {
    "product_card": {
      "shared": {
        "category": { "value": "Electronics" }  // Same for all 5
      },
      "instances": [
        { "name": { "value": "Product 1" }, "price": { "value": "$100" } },
        { "name": { "value": "Product 2" }, "price": { "value": "$200" } },
        { "name": { "value": "Product 3" }, "price": { "value": "$300" } },
        { "name": { "value": "Product 4" }, "price": { "value": "$400" } },
        { "name": { "value": "Product 5" }, "price": { "value": "$500" } }
      ]
    }
  }
}
```

**Result:** 1 HTML file with 1 slide containing 5 products (5 instances on same slide)

---

### MULTIPLE Toggle

**What it does:**
- Tells SOLON to generate N COPIES of the entire slide
- You specify exactly how many (2-100)
- Each copy is a complete, independent slide

**How it works:**
1. You set the count (e.g., 5)
2. Recipe shows the slide structure repeated N times
3. AI generates N separate slide objects in the JSON
4. Each slide is independent (no shared/unique distinction)

**Example: 5 Separate Product Slides**
```json
{
  "slides": [
    {
      "slide_1": {
        "blocks": {
          "name": { "value": "Product 1" },
          "price": { "value": "$100" },
          "category": { "value": "Electronics" }
        }
      }
    },
    {
      "slide_2": {
        "blocks": {
          "name": { "value": "Product 2" },
          "price": { "value": "$200" },
          "category": { "value": "Electronics" }
        }
      }
    },
    {
      "slide_3": {
        "blocks": {
          "name": { "value": "Product 3" },
          "price": { "value": "$300" },
          "category": { "value": "Electronics" }
        }
      }
    },
    // ... 4 and 5
  ]
}
```

**Result:** 1 HTML file with 5 separate slides (5 independent slides)

---

## Side-by-Side Comparison

### Scenario: Generate 5 Products

#### Using REPEATABLE Only
```
HTML Output:
<section>
  <div class="product">
    <h2>Product 1</h2>
    <span>Electronics</span>
    <p>$100</p>
  </div>
  <div class="product">
    <h2>Product 2</h2>
    <span>Electronics</span>
    <p>$200</p>
  </div>
  <div class="product">
    <h2>Product 3</h2>
    <span>Electronics</span>
    <p>$300</p>
  </div>
  <div class="product">
    <h2>Product 4</h2>
    <span>Electronics</span>
    <p>$400</p>
  </div>
  <div class="product">
    <h2>Product 5</h2>
    <span>Electronics</span>
    <p>$500</p>
  </div>
</section>
```

**Structure:** 1 slide, 5 products inside it
**File count:** 1 HTML file
**Slide count:** 1

---

#### Using MULTIPLE Only
```
HTML Output:
<section>  <!-- Slide 1 -->
  <h2>Product 1</h2>
  <span>Electronics</span>
  <p>$100</p>
</section>

<section>  <!-- Slide 2 -->
  <h2>Product 2</h2>
  <span>Electronics</span>
  <p>$200</p>
</section>

<section>  <!-- Slide 3 -->
  <h2>Product 3</h2>
  <span>Electronics</span>
  <p>$300</p>
</section>

<section>  <!-- Slide 4 -->
  <h2>Product 4</h2>
  <span>Electronics</span>
  <p>$400</p>
</section>

<section>  <!-- Slide 5 -->
  <h2>Product 5</h2>
  <span>Electronics</span>
  <p>$500</p>
</section>
```

**Structure:** 5 separate slides, 1 product each
**File count:** 1 HTML file
**Slide count:** 5

---

## Key Functional Differences

### 1. **Scope of Generation**

**Repeatable:**
- Generates multiple INSTANCES within a SINGLE slide
- "How many items should appear on this one slide?"
- AI decides the count based on context

**Multiple:**
- Generates multiple COPIES of the entire slide structure
- "How many slides should I create?"
- You decide the count (you set 2-100)

---

### 2. **Zone Handling**

**Repeatable:**
- Zones can be marked UNIQUE or SHARED
- Unique zones appear in `instances` array (different per instance)
- Shared zones appear once in `shared` object (same everywhere)

**Multiple:**
- All zones are treated the same
- No unique/shared distinction
- Each slide is independent

---

### 3. **JSON Response Structure**

**Repeatable:**
```json
{
  "slides": {
    "product_card": {
      "shared": { ... },      // Appears once
      "instances": [ ... ]    // Array of N items
    }
  }
}
```

**Multiple:**
```json
{
  "slides": [
    { "slide_1": { "blocks": { ... } } },
    { "slide_2": { "blocks": { ... } } },
    { "slide_3": { "blocks": { ... } } }
  ]
}
```

---

### 4. **Use Cases**

**Repeatable:**
- Product listing page with 5 products
- Employee directory with 10 people on one page
- Feature list with 3 features
- FAQ with 5 Q&A items
- **Use when:** Multiple items should appear on the SAME slide/page

**Multiple:**
- Presentation slides (each slide is separate)
- Catalog pages (each page is independent)
- Blog posts (each post is a slide)
- Report pages (each page stands alone)
- **Use when:** Each item should be on a SEPARATE slide/page

---

## Real-World Examples

### Example 1: E-commerce Product Listing

**Goal:** Create a product listing page with 5 products

**Solution:** Use REPEATABLE only
- 1 slide with 5 product instances
- All products on same page
- Shared category, unique name/price per product

**Output:** 1 page with 5 products

---

### Example 2: Product Catalog

**Goal:** Create a catalog with 5 product pages

**Solution:** Use MULTIPLE only
- 5 separate slides
- Each slide has 1 product
- Each slide is independent

**Output:** 5 pages, 1 product each

---

### Example 3: Multi-Page Product Catalog with Listings

**Goal:** Create 3 category pages, each with 5 products

**Solution:** Use BOTH REPEATABLE and MULTIPLE
- Enable Repeatable: Mark zones as unique/shared
- Enable Multiple: Set count to 3
- Each of the 3 slides has 5 product instances

**Output:** 3 pages, 5 products per page

---

## Decision Tree

```
Do you want multiple items on ONE slide?
  ├─ YES → Use REPEATABLE
  │        (Creates instances within single slide)
  │
  └─ NO → Use MULTIPLE
           (Creates separate slides)

Do you want BOTH?
  └─ YES → Use BOTH REPEATABLE + MULTIPLE
           (Creates N slides, each with instances)
```

---

## Summary

**REPEATABLE** = "Multiple items on the same slide" (vertical scaling)
**MULTIPLE** = "Multiple separate slides" (horizontal scaling)

Think of it like:
- **Repeatable** = A restaurant menu with 10 items on one page
- **Multiple** = A book with 10 pages

Both can work together:
- **Both** = A restaurant with 10 menus, each with 10 items
