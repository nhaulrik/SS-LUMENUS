# Lumenus Theme Guide

This document defines the Lumenus visual theme for slide templates. Use it as the authoritative reference when adapting any template to the Lumenus product identity.

---

## Color Palette

| Token | Hex | Usage |
|---|---|---|
| `dark-primary` | `#1C1200` | Header bg, footer bg, table header bg, headline text, init names, card titles |
| `dark-secondary` | `#3D2200` | Table header gradient end, sortable-hover bg, scrollbar thumb, status/count text |
| `coral` | `#FF6B35` | Primary accent — P1 badges, GRC segment, pi28 border, card stripe primary |
| `amber` | `#D97706` | Secondary accent — P2 badges, GTM segment, pi29 border, card stripe secondary, eyebrow labels |
| `gold` | `#FBBF24` | Tertiary accent — Other segment, pi30 border, mini dots |
| `gold-dark` | `#C09010` | Gold-on-white text only (legibility — `#FBBF24` fails contrast on white) |
| `header-label` | `#FFB300` | Header overline labels, stat values, sort arrow indicators |
| `logo-text` | `rgba(251,191,36,0.7)` | "Netcompany" brand text in header |
| `footer-text` | `rgba(251,191,36,0.65)` | Footer text on dark background |
| `page-bg` | `#2a1f10` | Viewport/body background outside the slide |
| `grid-bg` | `#e8ddd0` | Layout grid background that contains card panels (darker than surface-warm) |
| `surface-warm` | `#fffcf5` | Hero / top-story section fill; row hover state |
| `section-bg` | `#f5ece0` | PI card section fill; effort pill background; scrollbar track; bar track fill |
| `divider` | `#ede9e0` | All horizontal and vertical rule lines |
| `row-divider` | `#faf5ec` | Initiative row separators inside PI cards |
| `effort-border` | `#e8d5b0` | Effort pill border |
| `muted-text` | `#9a8c7a` | Secondary body text (scope sub-lines, descriptions) |
| `section-label` | `#c8b89a` | All-caps eyebrow labels inside cards |

---

## Gradient Stripe

Every slide must open with a 7 px gradient stripe — never a flat color:

```css
background: linear-gradient(90deg, #FF6B35 0%, #FFB300 55%, #FBBF24 100%);
```

Because this is a CSS gradient, do **not** override `.top-bar` in JavaScript PI-color logic. The gradient must remain static.

---

## Header

```
Background:  #1C1200
Overline:    #FFB300  |  uppercase  |  letter-spacing 2–3px  |  weight 600–800
Title:       #ffffff  |  weight 700
Subtitle:    rgba(255,255,255,0.45)  |  weight 300
Stat values: #FFB300
Stat labels: rgba(255,255,255,0.45)  |  uppercase  |  letter-spacing 1px
Dividers:    rgba(255,255,255,0.12)
Logo:        rgba(251,191,36,0.7)  |  uppercase  |  letter-spacing 2.5px  |  weight 700–800
```

Include a subtle amber radial glow — add `overflow: hidden` to `.header` and the pseudo-element below:

```css
.header::after {
  content: '';
  position: absolute;
  top: -30px;
  right: 120px;
  width: 200px;
  height: 120px;
  background: radial-gradient(ellipse, rgba(255,179,0,0.08) 0%, transparent 70%);
  pointer-events: none;
}
```

---

## Accent Color Roles

Three accents map consistently across all charts, badges, and card elements:

| Role | Token | Hex | Typical use |
|---|---|---|---|
| Primary | coral | `#FF6B35` | P1, GRC, first PI card, first card stripe |
| Secondary | amber | `#D97706` | P2, GTM, second PI card, second card stripe |
| Tertiary | gold | `#FBBF24` | P3 alt, Other, third PI card |

Use `#C09010` (`gold-dark`) whenever gold text appears on a white or light background.

---

## Priority Badges

All templates that carry priority badges must follow this exact mapping — no other colors:

| Label | Background | Text color |
|---|---|---|
| P1 | `#FF6B35` | `#ffffff` |
| P2 | `#D97706` | `#ffffff` |
| P3 | `#CCCCCC` | `#ffffff` |
| N/A | `transparent` + `1px solid #CCCCCC` | `#888888` |

---

## Tables

### Header row

```css
background: linear-gradient(135deg, #1C1200 0%, #3D2200 100%);
/* sticky th cells override to flat #1C1200; last-child column to #3D2200 */
```

- Hover on sortable columns: `background: #3D2200`
- Sort arrow color: `#FFB300`

### Body rows

```
Row border:      1px solid #ede9e0
Row hover bg:    #fffcf5
Init name color: #1C1200  (weight 700)
Status badge /
feat-count text: #3D2200
```

### Scrollbar (webkit)

```css
::-webkit-scrollbar-track { background: #f5ece0; }
::-webkit-scrollbar-thumb { background: #3D2200; border: 2px solid #f5ece0; }
::-webkit-scrollbar-thumb:hover { background: #FF6B35; }
```

### Effort pills

```css
/* Normal */
background: #f5ece0;
color: #1C1200;
border: 1px solid #e8d5b0;

/* TBD / unknown */
background: transparent;
border: 1px solid #CCCCCC;
color: #888;
```

---

## Value / Info Cards (right-panel pattern)

Card shadow: `0 2px 8px rgba(100,50,0,0.10)` — always warm-tinted, never cool grey.  
Hover shadow: `0 5px 20px rgba(100,50,0,0.16)`  
Card header divider: `1px solid #ede9e0`

### Card stripe class naming

| Class | Color | Role |
|---|---|---|
| `.card-stripe.coral` | `#FF6B35` | Primary / Business Value card |
| `.card-stripe.amber` | `#D97706` | Secondary / Market Relevance card |

Do **not** carry forward `.card-stripe.teal` from Solon Tax templates — rename it `.amber`.

### Bullet dot class naming

| Class | Color |
|---|---|
| `.coral-dots li::before` | `#FF6B35` |
| `.amber-dots li::before` | `#D97706` |

Do **not** carry forward `.teal-dots` — rename it `.amber-dots`.

### Card title / KPI text

```
.card-title:     #1C1200
.kpi-number.coral: #FF6B35
.kpi-number.amber: #D97706
```

---

## PI Cards (roadmap overview pattern)

| Card class | Border-top | PI name color | Bar fill gradient |
|---|---|---|---|
| `.pi-card.pi28` | `#FF6B35` | `#FF6B35` | `linear-gradient(90deg, #FF6B35, #FF8C5A)` |
| `.pi-card.pi29` | `#D97706` | `#D97706` | `linear-gradient(90deg, #D97706, #F5A020)` |
| `.pi-card.pi30` | `#FBBF24` | `#C09010` | `linear-gradient(90deg, #C09010, #FBBF24)` |

Bar track (unfilled): `#f5ece0`  
Section eyebrow label: `color: #c8b89a` | `border-top: 1px solid #f5ece0`

---

## Surface & Background Hierarchy

```
Page viewport      #2a1f10   dark warm brown — sets the warm mood outside the slide
Slide body         #ffffff
Hero / top-story   #fffcf5   warm cream
Grid / layout bg   #e8ddd0   warm sand (darker, contains card panels)
Card section bg    #f5ece0   warm sand (lighter, PI section, pill backgrounds)
Row hover          #fffcf5   matches hero surface
Dividers           #ede9e0
Row separators     #faf5ec
```

Key principle: every neutral surface must carry a yellow-shifted (warm) undertone — never cool or blue-shifted.

---

## Slide Shadow

Dark page background means the slide shadow needs more weight than in Solon:

```css
box-shadow: 0 8px 40px rgba(0,0,0,0.35);
```

---

## JavaScript — Dynamic PI Color

Templates that generate a per-PI accent color via `generateColorFromPI()` must use base hue `16°` (Lumenus coral-orange `#FF6B35`), not the Solon base of `3.5°`:

```js
const baseHue = 16; // #FF6B35 — Lumenus warm coral
```

**Override only these elements** in the injected `<style>` block — the top stripe gradient must not be touched:

```js
.pi-badge          { background: ${accentColor} !important; }
.header-stat-value { color: ${accentColor} !important; }
thead th.sort-asc::after  { color: ${accentColor} !important; }
thead th.sort-desc::after { color: ${accentColor} !important; }
```

---

## Footer

```
Background:     #1C1200
Text color:     rgba(251,191,36,0.65)
Text style:     uppercase  |  letter-spacing 1.5px  |  font-size 10px
Product label:  "Lumenus Product Roadmap 2026"
```

---

## What to Avoid

- **No Solon teal colors** — `#1a3c3a`, `#2C8A84`, `#7fb3af`, `#2C4A48`, `#254f4c`, `#e8f0ef`, `#d0e5e2` are all off-limits.
- **No flat coral** — use `#FF6B35` not `#FF6359`.
- **No flat top stripe** — always the coral-to-gold gradient; never override it with JS.
- **No cool-grey shadows** — use warm-tinted `rgba(100,50,0,…)` equivalents.
- **No cold neutrals** — replace `#fafaf8`, `#e9e8e4`, `#ecebe6` with their warm equivalents from the surface hierarchy above.
- **No `.teal` / `.teal-dots` class names** — rename to `.amber` / `.amber-dots` when porting Solon templates.
