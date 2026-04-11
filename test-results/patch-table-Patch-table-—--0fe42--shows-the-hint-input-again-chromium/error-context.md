# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: patch-table.spec.js >> Patch table — AI toggle >> re-enabling AI on a row shows the hint input again
- Location: e2e\patch-table.spec.js:46:3

# Error details

```
TimeoutError: locator.fill: Timeout 10000ms exceeded.
Call log:
  - waiting for locator('.modal-content .form-group:nth-child(2) input')

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - generic [ref=e5]:
      - generic [ref=e6]:
        - heading "Tag Elements" [level=1] [ref=e7]
        - paragraph [ref=e8]: Click on text elements to tag them as placeholders
      - link "⬡ Docs" [ref=e9] [cursor=pointer]:
        - /url: /docs.html
  - generic [ref=e10]:
    - generic [ref=e11]:
      - generic [ref=e12] [cursor=pointer]:
        - generic [ref=e13]: "1"
        - generic [ref=e14]: Upload
      - generic [ref=e15]: ›
    - generic [ref=e16]:
      - generic [ref=e17] [cursor=pointer]:
        - generic [ref=e18]: "2"
        - generic [ref=e19]: Tag Elements
      - generic [ref=e20]: ›
    - generic [ref=e21]:
      - generic [ref=e22] [cursor=pointer]:
        - generic [ref=e23]: "3"
        - generic [ref=e24]: Recipe + JSON
      - generic [ref=e25]: ›
    - generic [ref=e27]:
      - generic [ref=e28]: "4"
      - generic [ref=e29]: Preview
  - generic [ref=e30]:
    - generic [ref=e31]:
      - generic [ref=e32] [cursor=pointer]:
        - generic [ref=e33]: "1"
        - generic [ref=e35]:
          - generic "Text 2" [ref=e38]: Solon Tax Product Roadmap 2026
          - generic "Text 3" [ref=e39]: Feature Catalog for SteerCo
          - generic "Text 4" [ref=e40]: Executive Steering Committee | 29 April 2026
          - generic "Text 5" [ref=e41]: "Prepared by: Nikolaj"
          - generic "Text 6" [ref=e42]: Netcompany
        - generic "Click to mark as repeatable" [ref=e43]: ⟳
      - generic [ref=e44] [cursor=pointer]:
        - generic [ref=e45]: "2"
        - generic [ref=e47]:
          - generic "Text 4" [ref=e50]: Netcompany
          - generic "Text 21" [ref=e52]: Solon Tax Product Roadmap 2026 | SteerCo
          - generic "Text 22" [ref=e53]: "2"
          - generic "Text 2" [ref=e54]: Core Revenue Management
          - generic "Text 3" [ref=e55]: Group Summary | Roadmap Initiative Overview
          - generic "Text 7" [ref=e58]: ~23,200
          - generic "Text 8" [ref=e59]: Hours
          - generic "Text 9" [ref=e60]: Total Estimated Effort
          - generic "Text 12" [ref=e63]: "6"
          - generic "Text 13" [ref=e64]: Count
          - generic "Text 14" [ref=e65]: Roadmap Initiatives
          - generic "Text 17" [ref=e68]: "15"
          - generic "Text 18" [ref=e69]: Count
          - generic "Text 19" [ref=e70]: Features in Scope
          - generic "Text 22" [ref=e73]: PI28
          - generic "Text 23" [ref=e74]: Program Increment
          - generic "Text 24" [ref=e75]: Primary PI Window
          - generic "Shape 5" [ref=e76]: IRM-1234 – some feature – 1000H
          - generic "TextBox 6" [ref=e77]: Features in initiative
        - generic "Click to remove repeatable" [ref=e78]: ⟳
      - generic [ref=e79] [cursor=pointer]:
        - generic [ref=e80]: "3"
        - generic [ref=e82]:
          - generic "Text 2" [ref=e85]: Registration
          - generic "Text 3" [ref=e86]: Core Revenue Management
          - generic "Text 4" [ref=e87]: Netcompany
          - generic "Text 25" [ref=e88]: Business Scope
          - generic "Text 26" [ref=e89]: Covers foundational tax administration functions enabling authorities to manage the full lifecycle of taxpayer obligations.
          - generic "Text 27" [ref=e90]: Market Needs &amp; Investment Benefits
          - generic "Text 28" [ref=e91]: End-to-end taxpayer lifecycle management reduces administrative burden Automated penalty and interest calculations improve collection rates Modular capability design allows onboarding of new tax types
          - generic "Text 30" [ref=e93]: Solon Tax Product Roadmap 2026 | SteerCo
          - generic "Text 31" [ref=e94]: "3"
        - generic "Click to mark as repeatable" [ref=e95]: ⟳
    - generic [ref=e96]:
      - generic [ref=e97]:
        - heading "Patch" [level=3] [ref=e98]
        - textbox "Enter patch name..." [ref=e100]: sample_auto
        - generic [ref=e101]:
          - combobox [ref=e102]:
            - option "Select a patch..."
            - option "sample_auto (sample.pptx)" [selected]
          - button "Delete" [ref=e103] [cursor=pointer]
        - generic [ref=e104]:
          - generic [ref=e105]: Global Prompt (guidance for AI)
          - textbox "Add overall guidance for the AI (e.g., 'Generate a professional presentation with clear structure')" [ref=e106]
        - generic [ref=e107]:
          - generic [ref=e108]:
            - generic [ref=e109]: AI
            - generic [ref=e110]: Key
            - generic [ref=e111]: Hint
            - generic [ref=e112]: Max
          - generic [ref=e113]:
            - generic [ref=e114]:
              - generic [ref=e115]:
                - checkbox
              - textbox "netcompany" [ref=e117]
              - generic [ref=e118]: —
              - spinbutton [ref=e119]: "50"
            - generic [ref=e120]:
              - generic [ref=e121]:
                - checkbox
              - textbox "solon_tax_product_roadmap_2026__steerco" [ref=e123]
              - generic [ref=e124]: —
              - spinbutton [ref=e125]: "114"
            - generic [ref=e126]:
              - generic [ref=e127]:
                - checkbox
              - textbox "2" [ref=e129]
              - generic [ref=e130]: —
              - spinbutton [ref=e131]: "6"
            - generic [ref=e132]:
              - generic [ref=e133]:
                - checkbox
              - textbox "core_revenue_management" [ref=e135]
              - generic [ref=e136]: —
              - spinbutton [ref=e137]: "39"
            - generic [ref=e138]:
              - generic [ref=e139]:
                - checkbox
              - textbox "group_summary__roadmap_initiative_overview" [ref=e141]
              - generic [ref=e142]: —
              - spinbutton [ref=e143]: "114"
            - generic [ref=e144]:
              - generic [ref=e145]:
                - checkbox
              - textbox "23200" [ref=e147]
              - generic [ref=e148]: —
              - spinbutton [ref=e149]: "11"
            - generic [ref=e150]:
              - generic [ref=e151]:
                - checkbox
              - textbox "hours" [ref=e153]
              - generic [ref=e154]: —
              - spinbutton [ref=e155]: "29"
            - generic [ref=e156]:
              - generic [ref=e157]:
                - checkbox
              - textbox "total_estimated_effort" [ref=e159]
              - generic [ref=e160]: —
              - spinbutton [ref=e161]: "60"
            - generic [ref=e162]:
              - generic [ref=e163]:
                - checkbox
              - textbox "6" [ref=e165]
              - generic [ref=e166]: —
              - spinbutton [ref=e167]: "11"
            - generic [ref=e168]:
              - generic [ref=e169]:
                - checkbox
              - textbox "count" [ref=e171]
              - generic [ref=e172]: —
              - spinbutton [ref=e173]: "29"
            - generic [ref=e174]:
              - generic [ref=e175]:
                - checkbox
              - textbox "roadmap_initiatives" [ref=e177]
              - generic [ref=e178]: —
              - spinbutton [ref=e179]: "60"
            - generic [ref=e180]:
              - generic [ref=e181]:
                - checkbox
              - textbox "15" [ref=e183]
              - generic [ref=e184]: —
              - spinbutton [ref=e185]: "11"
            - generic [ref=e186]:
              - generic [ref=e187]:
                - checkbox
              - textbox "count" [ref=e189]
              - generic [ref=e190]: —
              - spinbutton [ref=e191]: "29"
            - generic [ref=e192]:
              - generic [ref=e193]:
                - checkbox
              - textbox "features_in_scope" [ref=e195]
              - generic [ref=e196]: —
              - spinbutton [ref=e197]: "60"
            - generic [ref=e198]:
              - generic [ref=e199]:
                - checkbox
              - textbox "pi28" [ref=e201]
              - generic [ref=e202]: —
              - spinbutton [ref=e203]: "11"
            - generic [ref=e204]:
              - generic [ref=e205]:
                - checkbox
              - textbox "program_increment" [ref=e207]
              - generic [ref=e208]: —
              - spinbutton [ref=e209]: "29"
            - generic [ref=e210]:
              - generic [ref=e211]:
                - checkbox
              - textbox "primary_pi_window" [ref=e213]
              - generic [ref=e214]: —
              - spinbutton [ref=e215]: "60"
            - generic [ref=e216]:
              - generic [ref=e217]:
                - checkbox
              - textbox "irm1234__some_feature__1000h" [ref=e219]
              - generic [ref=e220]: —
              - spinbutton [ref=e221]: "1088"
            - generic [ref=e222]:
              - generic [ref=e223]:
                - checkbox
              - textbox "features_in_initiative" [ref=e225]
              - generic [ref=e226]: —
              - spinbutton [ref=e227]: "46"
        - button "Generate Recipe" [ref=e228] [cursor=pointer]
      - generic [ref=e230]:
        - generic [ref=e231]:
          - heading "Slide 2" [level=3] [ref=e232]
          - generic [ref=e233] [cursor=pointer]:
            - checkbox "Repeatable" [checked] [ref=e234]
            - generic [ref=e235]: Repeatable
        - generic [ref=e236]:
          - generic [ref=e237]:
            - generic [ref=e238]: Structure Type (unique identifier for this slide type)
            - textbox "e.g., group_summary, initiative_detail" [ref=e239]: Initiatie Group
          - generic [ref=e240]:
            - generic [ref=e241]: "Custom prompt for instances:"
            - textbox "Describe what instances to generate (e.g., 'List 5 major car manufacturers with revenue and HQ')" [ref=e242]: an instance for each initiative group
        - generic [ref=e244]:
          - generic [ref=e245]:
            - generic "Text 4" [ref=e248]: Netcompany
            - generic "Text 21" [ref=e250]: Solon Tax Product Roadmap 2026 | SteerCo
            - generic "Text 22" [ref=e251]: "2"
            - generic "Text 2" [ref=e252]: Core Revenue Management
            - generic "Text 3" [ref=e253]: Group Summary | Roadmap Initiative Overview
            - generic "Text 7" [ref=e256]: ~23,200
            - generic "Text 8" [ref=e257]: Hours
            - generic "Text 9" [ref=e258]: Total Estimated Effort
            - generic "Text 12" [ref=e261]: "6"
            - generic "Text 13" [ref=e262]: Count
            - generic "Text 14" [ref=e263]: Roadmap Initiatives
            - generic "Text 17" [ref=e266]: "15"
            - generic "Text 18" [ref=e267]: Count
            - generic "Text 19" [ref=e268]: Features in Scope
            - generic "Text 22" [ref=e271]: PI28
            - generic "Text 23" [ref=e272]: Program Increment
            - generic "Text 24" [ref=e273]: Primary PI Window
            - generic "Shape 5" [ref=e274]: IRM-1234 – some feature – 1000H
            - generic "TextBox 6" [ref=e275]: Features in initiative
          - generic:
            - generic "netcompany" [ref=e278] [cursor=pointer]
            - generic "solon_tax_product_roadmap_2026__steerco" [ref=e280] [cursor=pointer]
            - generic "2" [ref=e281] [cursor=pointer]
            - generic "core_revenue_management" [ref=e282] [cursor=pointer]
            - generic "group_summary__roadmap_initiative_overview" [ref=e283] [cursor=pointer]
            - generic "23200" [ref=e286] [cursor=pointer]
            - generic "hours" [ref=e287] [cursor=pointer]
            - generic "total_estimated_effort" [ref=e288] [cursor=pointer]
            - generic "6" [ref=e291] [cursor=pointer]
            - generic "count" [ref=e292] [cursor=pointer]
            - generic "roadmap_initiatives" [ref=e293] [cursor=pointer]
            - generic "15" [ref=e296] [cursor=pointer]
            - generic "count" [ref=e297] [cursor=pointer]
            - generic "features_in_scope" [ref=e298] [cursor=pointer]
            - generic "pi28" [ref=e301] [cursor=pointer]
            - generic "program_increment" [ref=e302] [cursor=pointer]
            - generic "primary_pi_window" [ref=e303] [cursor=pointer]
            - generic "irm1234__some_feature__1000h" [ref=e304] [cursor=pointer]
            - generic "features_in_initiative" [ref=e305] [cursor=pointer]
        - paragraph [ref=e306]: Click an element to tag it. Click again to remove the tag. Tagged elements appear in coral.
    - generic [ref=e308]:
      - heading "Edit Tag" [level=4] [ref=e309]
      - paragraph [ref=e310]: "Original: \"Core Revenue Management\""
      - paragraph [ref=e311]: "Calculated max: ~39 chars"
      - generic [ref=e312]:
        - generic [ref=e313]: Placeholder name (key)
        - textbox "e.g., product_name" [active] [ref=e314]: initiative_group
      - generic [ref=e315]:
        - generic [ref=e316]: AI hint (optional)
        - textbox "e.g., a short punchy headline, max 8 words" [ref=e317]: Core Revenue Management
      - generic [ref=e318]:
        - generic [ref=e319]: "Max characters (calculated: 39)"
        - spinbutton [ref=e320]: "39"
      - generic [ref=e321]:
        - generic [ref=e322] [cursor=pointer]:
          - checkbox "AI generates this value (auto-replace)" [ref=e323]
          - generic [ref=e324]: AI generates this value (auto-replace)
        - paragraph [ref=e325]: If checked, AI will replace this value. If unchecked, original text is kept.
      - generic [ref=e326]:
        - button "Delete" [ref=e327] [cursor=pointer]
        - button "Save Tag" [ref=e328] [cursor=pointer]
        - button "Cancel" [ref=e329] [cursor=pointer]
```

# Test source

```ts
  2   |  * Composable Playwright fixtures for the Solon E2E suite.
  3   |  *
  4   |  * Each fixture builds on the previous, bringing the app to a well-defined state:
  5   |  *
  6   |  *   page            — blank browser page (base Playwright fixture)
  7   |  *   uploadedPage    — sample.pptx uploaded, app is on the Tag step
  8   |  *   repeatablePage  — slide 2 selected, marked repeatable, structure type + prompt filled
  9   |  *   taggedPage      — both target elements on slide 2 tagged with correct keys/hints/AI on
  10  |  */
  11  | 
  12  | import { test as base } from '@playwright/test';
  13  | import path from 'path';
  14  | import { fileURLToPath } from 'url';
  15  | 
  16  | const __dirname = path.dirname(fileURLToPath(import.meta.url));
  17  | export const FIXTURE_PPTX = path.resolve(__dirname, 'fixtures/sample.pptx');
  18  | 
  19  | // ─── Selectors (single source of truth for the whole suite) ──────────────────
  20  | 
  21  | export const SEL = {
  22  |   // Upload step
  23  |   fileInput:        'input[type="file"][accept=".pptx"]',
  24  | 
  25  |   // Tag step — slide carousel
  26  |   slideThumb:       (n) => `.tag-slide-btn:nth-child(${n})`,
  27  | 
  28  |   // Tag step — repeatable config
  29  |   repeatableToggle: '.tag-repeatable input[type="checkbox"]',
  30  |   structureType:    '.repeatable-config input[type="text"]',
  31  |   customPrompt:     '.repeatable-config textarea',
  32  | 
  33  |   // Tag step — slide overlay click targets (by original text, stable regardless of tag state)
  34  |   overlayByText:    (text) => `.overlay-element[data-text="${text}"]`,
  35  | 
  36  |   // Tag modal
  37  |   modal:            '.modal-content',
  38  |   modalKey:         '.modal-content input[placeholder="e.g., product_name"]',
  39  |   modalHint:        '.modal-content .form-group:nth-child(2) input',
  40  |   modalAI:          '.modal-content input[type="checkbox"]',
  41  |   modalSave:        '.modal-content .btn-primary',
  42  | 
  43  |   // Patch table — rows
  44  |   patchRows:        '.patch-table-body .patch-row',
  45  |   patchRowByKey:    (key) => `.patch-row[data-key="${key}"]`,
  46  | 
  47  |   // Patch table — inline inputs
  48  |   patchKeyInput:    '.patch-key-input',
  49  |   hintInput:        '.patch-hint-input',
  50  |   patchMaxInput:    '.patch-max-input',
  51  | 
  52  |   // Tag modal (used for initial tagging from slide overlay only)
  53  |   modal:            '.modal-content',
  54  |   modalKey:         '.modal-content input[placeholder="e.g., product_name"]',
  55  |   modalHint:        '.modal-content .form-group:nth-child(2) input',
  56  |   modalAI:          '.modal-content input[type="checkbox"]',
  57  |   modalSave:        '.modal-content .btn-primary',
  58  | 
  59  |   // Actions
  60  |   generateRecipe:   'button:has-text("Generate Recipe")',
  61  | 
  62  |   // Recipe step
  63  |   recipeArea:       '.recipe-area'
  64  | };
  65  | 
  66  | // ─── Shared action helpers ────────────────────────────────────────────────────
  67  | 
  68  | /** Upload the fixture PPTX and wait for the Tag step to appear. */
  69  | export async function doUpload(page) {
  70  |   await page.goto('/');
  71  |   await page.setInputFiles(SEL.fileInput, FIXTURE_PPTX);
  72  |   // Wait for slide thumbnails to appear — confirms we're in the Tag step
  73  |   await page.waitForSelector('.tag-slides .tag-slide-btn');
  74  | }
  75  | 
  76  | /** Select slide N (1-based) in the carousel. */
  77  | export async function selectSlide(page, n) {
  78  |   await page.locator(SEL.slideThumb(n)).click();
  79  |   // Wait for the overlay to reflect the new slide
  80  |   await page.waitForTimeout(150);
  81  | }
  82  | 
  83  | /** Toggle the current slide as repeatable and fill its config. */
  84  | export async function configureRepeatable(page, { structureType, customPrompt }) {
  85  |   await page.locator(SEL.repeatableToggle).check();
  86  |   await page.locator(SEL.structureType).fill(structureType);
  87  |   await page.locator(SEL.customPrompt).fill(customPrompt);
  88  | }
  89  | 
  90  | /**
  91  |  * Click a slide overlay element (by its original text), fill the modal,
  92  |  * and save. Enables AI generation by default.
  93  |  */
  94  | export async function tagElement(page, { originalText, key, hint, ai = true }) {
  95  |   await page.locator(SEL.overlayByText(originalText)).click();
  96  |   await page.waitForSelector(SEL.modal);
  97  | 
  98  |   // Select all and replace key
  99  |   await page.locator(SEL.modalKey).fill(key);
  100 | 
  101 |   // Set hint
> 102 |   await page.locator(SEL.modalHint).fill(hint);
      |                                     ^ TimeoutError: locator.fill: Timeout 10000ms exceeded.
  103 | 
  104 |   // Toggle AI if needed
  105 |   const checkbox = page.locator(SEL.modalAI);
  106 |   const checked  = await checkbox.isChecked();
  107 |   if (ai && !checked) await checkbox.check();
  108 |   if (!ai && checked) await checkbox.uncheck();
  109 | 
  110 |   await page.locator(SEL.modalSave).click();
  111 |   await page.waitForSelector(SEL.modal, { state: 'detached' });
  112 | }
  113 | 
  114 | // ─── Fixture definitions ──────────────────────────────────────────────────────
  115 | 
  116 | export const test = base.extend({
  117 |   /** App is on the Tag step with sample.pptx loaded. */
  118 |   uploadedPage: async ({ page }, use) => {
  119 |     await doUpload(page);
  120 |     await use(page);
  121 |   },
  122 | 
  123 |   /** Slide 2 is selected and configured as a repeatable slide. */
  124 |   repeatablePage: async ({ page }, use) => {
  125 |     await doUpload(page);
  126 |     await selectSlide(page, 2);
  127 |     await configureRepeatable(page, {
  128 |       structureType: 'Initiatie Group',
  129 |       customPrompt:  'an instance for each initiative group'
  130 |     });
  131 |     await use(page);
  132 |   },
  133 | 
  134 |   /** Both target elements on slide 2 are tagged with keys, hints, and AI on. */
  135 |   taggedPage: async ({ page }, use) => {
  136 |     await doUpload(page);
  137 |     await selectSlide(page, 2);
  138 |     await configureRepeatable(page, {
  139 |       structureType: 'Initiatie Group',
  140 |       customPrompt:  'an instance for each initiative group'
  141 |     });
  142 |     await tagElement(page, {
  143 |       originalText: 'Core Revenue Management',
  144 |       key:          'initiative_group',
  145 |       hint:         'Title of the initiative group'
  146 |     });
  147 |     await tagElement(page, {
  148 |       originalText: 'Group Summary | Roadmap Initiative Overview',
  149 |       key:          'initiative_group_subheader',
  150 |       hint:         'subheader of initiative group'
  151 |     });
  152 |     await use(page);
  153 |   }
  154 | });
  155 | 
  156 | export { expect } from '@playwright/test';
  157 | 
```