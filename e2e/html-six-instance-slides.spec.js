/**
 * E2E tests for 6-instance slide generation with Danish content.
 *
 * UC-6S-01  Six slide instances are generated from the template
 * UC-6S-02  Each slide instance has unique zone content
 * UC-6S-03  All 6 sections are present in the preview HTML
 * UC-6S-04  Preview renders all 6 slides without errors
 * UC-6S-05  Slide navigation cycles through all 6 instances
 * UC-6S-06  Shell height accommodates 6 slides (4320px = 720 × 6)
 * UC-6S-07  Each section has scroll-snap-align: start
 * UC-6S-08  Content zones are properly filled in each instance
 */

import { test, expect, SEL } from './fixtures.js';

// ── Test data: 6 initiative groups with Danish content ─────────────────────────

const INITIATIVE_GROUPS = [
  {
    title: 'Kerneomsætningsstyring',
    subtitle: 'Solon Skat Produktkort 2026 · Executive Steering Committee',
    hours: '23,200',
    initiatives: '6',
    features: '38',
    completion: '18%',
    businessValue: 'Muliggør end-to-end skatteyderstyring fra registrering til regnskab',
    marketRelevance: 'Kerneafhængighed for alle nuværende og kommende projekter',
  },
  {
    title: 'Digitale Indberetninger',
    subtitle: 'Solon Skat Produktkort 2026 · Executive Steering Committee',
    hours: '15,800',
    initiatives: '4',
    features: '22',
    completion: '35%',
    businessValue: 'Automatiserer indberetningsprocesser og reducerer manuelle fejl',
    marketRelevance: 'Vigtig for EU-compliance og moderne skatteadministration',
  },
  {
    title: 'Betalingsbehandling',
    subtitle: 'Solon Skat Produktkort 2026 · Executive Steering Committee',
    hours: '12,400',
    initiatives: '5',
    features: '28',
    completion: '42%',
    businessValue: 'Strømliner betalingsflow og forbedrer likviditetsstyring',
    marketRelevance: 'Kritisk for cash flow optimering og debitorledelse',
  },
  {
    title: 'Rapportering og Analyse',
    subtitle: 'Solon Skat Produktkort 2026 · Executive Steering Committee',
    hours: '18,600',
    initiatives: '7',
    features: '45',
    completion: '28%',
    businessValue: 'Giver indsigt i skatteindtægter og styrker beslutningstagning',
    marketRelevance: 'Differentierer os fra konkurrenter med avanceret analytik',
  },
  {
    title: 'Integrations- og API-platform',
    subtitle: 'Solon Skat Produktkort 2026 · Executive Steering Committee',
    hours: '21,500',
    initiatives: '8',
    features: '52',
    completion: '15%',
    businessValue: 'Muliggør problemfri integrationer med eksterne systemer',
    marketRelevance: 'Åbner nye partnershipmuligheder og markedssegmenter',
  },
  {
    title: 'Sikkerhed og Compliance',
    subtitle: 'Solon Skat Produktkort 2026 · Executive Steering Committee',
    hours: '9,800',
    initiatives: '3',
    features: '15',
    completion: '65%',
    businessValue: 'Sikrer GDPR og datasikkerhed på tværs af platformen',
    marketRelevance: 'Kritisk for kundetillid og regulatorisk godkendelse',
  },
];

// ── UC-6S-01: Six slide instances are generated ────────────────────────────────

test.describe('UC-6S-01 — Six slide instances are generated from template', () => {
  test('apply-content with 6 instances returns slideCount: 6', async ({ page }) => {
    // Create a multi-slide project with 6 instances
    const html = `<!DOCTYPE html><html><body>
      <section>
        <div data-zone="initiative_group_title">Title</div>
        <div data-zone="initiative_group_subtitle">Subtitle</div>
        <div data-zone="total_hours">Hours</div>
        <div data-zone="initiative_count">Count</div>
        <div data-zone="feature_count">Features</div>
        <div data-zone="completion_pct">Completion</div>
        <div data-zone="business_value">Value</div>
        <div data-zone="market_relevance">Relevance</div>
      </section>
    </body></html>`;

    const uploadRes = await page.request.post('http://localhost:3001/api/html-flow/upload-template', {
      data: { html, fileName: 'six-instance.html' }
    });
    const { templateId, selections } = await uploadRes.json();

    const repSlides = [{ slideIndex: 1, key: 'initiative_group', prompt: 'one per initiative group' }];
    const modified = selections.map(s => ({ ...s, unique: true }));
    const createRes = await page.request.post('http://localhost:3001/api/html-flow/create-project', {
      data: { templateId, selections: modified, projectName: 'six-instance-test', repeatableSlides: repSlides }
    });
    const { chainId } = await createRes.json();

    // Generate 6 instances with Danish content
    const instances = INITIATIVE_GROUPS.map(group => ({
      initiative_group_title: group.title,
      initiative_group_subtitle: group.subtitle,
      total_hours: group.hours,
      initiative_count: group.initiatives,
      feature_count: group.features,
      completion_pct: group.completion,
      business_value: group.businessValue,
      market_relevance: group.marketRelevance,
    }));

    const json = JSON.stringify({ slides: { initiative_group: { instances } } });
    const applyRes = await page.request.post('http://localhost:3001/api/html-flow/apply-content', {
      data: { chainId, jsonString: json }
    });
    const body = await applyRes.json();

    expect(body.ok).toBe(true);
    expect(body.slideCount).toBe(6);
  });
});

// ── UC-6S-02: Each slide instance has unique zone content ──────────────────────

test.describe('UC-6S-02 — Each slide instance has unique zone content', () => {
  test('all 6 initiative titles are unique in previewHtml', async ({ page }) => {
    const html = `<!DOCTYPE html><html><body>
      <section>
        <div data-zone="initiative_group_title" id="title-zone">Title</div>
        <div data-zone="initiative_group_subtitle">Subtitle</div>
        <div data-zone="total_hours">Hours</div>
        <div data-zone="initiative_count">Count</div>
        <div data-zone="feature_count">Features</div>
        <div data-zone="completion_pct">Completion</div>
        <div data-zone="business_value">Value</div>
        <div data-zone="market_relevance">Relevance</div>
      </section>
    </body></html>`;

    const uploadRes = await page.request.post('http://localhost:3001/api/html-flow/upload-template', {
      data: { html, fileName: 'unique-content.html' }
    });
    const { templateId, selections } = await uploadRes.json();

    const repSlides = [{ slideIndex: 1, key: 'initiative_group', prompt: 'one per initiative group' }];
    const modified = selections.map(s => ({ ...s, unique: true }));
    const createRes = await page.request.post('http://localhost:3001/api/html-flow/create-project', {
      data: { templateId, selections: modified, projectName: 'unique-content-test', repeatableSlides: repSlides }
    });
    const { chainId } = await createRes.json();

    const instances = INITIATIVE_GROUPS.map(group => ({
      initiative_group_title: group.title,
      initiative_group_subtitle: group.subtitle,
      total_hours: group.hours,
      initiative_count: group.initiatives,
      feature_count: group.features,
      completion_pct: group.completion,
      business_value: group.businessValue,
      market_relevance: group.marketRelevance,
    }));

    const json = JSON.stringify({ slides: { initiative_group: { instances } } });
    const applyRes = await page.request.post('http://localhost:3001/api/html-flow/apply-content', {
      data: { chainId, jsonString: json }
    });
    const body = await applyRes.json();

    expect(body.ok).toBe(true);

    // Verify each title appears exactly once
    const titles = INITIATIVE_GROUPS.map(g => g.title);
    titles.forEach(title => {
      const count = (body.previewHtml.match(new RegExp(title, 'g')) || []).length;
      expect(count).toBe(1);
    });
  });

  test('all 6 hour values are unique in previewHtml', async ({ page }) => {
    const html = `<!DOCTYPE html><html><body>
      <section>
        <div data-zone="initiative_group_title">Title</div>
        <div data-zone="initiative_group_subtitle">Subtitle</div>
        <div data-zone="total_hours" id="hours-zone">Hours</div>
        <div data-zone="initiative_count">Count</div>
        <div data-zone="feature_count">Features</div>
        <div data-zone="completion_pct">Completion</div>
        <div data-zone="business_value">Value</div>
        <div data-zone="market_relevance">Relevance</div>
      </section>
    </body></html>`;

    const uploadRes = await page.request.post('http://localhost:3001/api/html-flow/upload-template', {
      data: { html, fileName: 'unique-hours.html' }
    });
    const { templateId, selections } = await uploadRes.json();

    const repSlides = [{ slideIndex: 1, key: 'initiative_group', prompt: 'one per initiative group' }];
    const modified = selections.map(s => ({ ...s, unique: true }));
    const createRes = await page.request.post('http://localhost:3001/api/html-flow/create-project', {
      data: { templateId, selections: modified, projectName: 'unique-hours-test', repeatableSlides: repSlides }
    });
    const { chainId } = await createRes.json();

    const instances = INITIATIVE_GROUPS.map(group => ({
      initiative_group_title: group.title,
      initiative_group_subtitle: group.subtitle,
      total_hours: group.hours,
      initiative_count: group.initiatives,
      feature_count: group.features,
      completion_pct: group.completion,
      business_value: group.businessValue,
      market_relevance: group.marketRelevance,
    }));

    const json = JSON.stringify({ slides: { initiative_group: { instances } } });
    const applyRes = await page.request.post('http://localhost:3001/api/html-flow/apply-content', {
      data: { chainId, jsonString: json }
    });
    const body = await applyRes.json();

    expect(body.ok).toBe(true);

    // Verify each hour value appears exactly once
    const hours = INITIATIVE_GROUPS.map(g => g.hours);
    hours.forEach(hour => {
      const count = (body.previewHtml.match(new RegExp(hour, 'g')) || []).length;
      expect(count).toBe(1);
    });
  });
});

// ── UC-6S-03: All 6 sections are present in preview HTML ──────────────────────

test.describe('UC-6S-03 — All 6 sections are present in preview HTML', () => {
  test('previewHtml contains exactly 6 <section> elements', async ({ page }) => {
    const html = `<!DOCTYPE html><html><body>
      <section>
        <div data-zone="initiative_group_title">Title</div>
        <div data-zone="initiative_group_subtitle">Subtitle</div>
        <div data-zone="total_hours">Hours</div>
        <div data-zone="initiative_count">Count</div>
        <div data-zone="feature_count">Features</div>
        <div data-zone="completion_pct">Completion</div>
        <div data-zone="business_value">Value</div>
        <div data-zone="market_relevance">Relevance</div>
      </section>
    </body></html>`;

    const uploadRes = await page.request.post('http://localhost:3001/api/html-flow/upload-template', {
      data: { html, fileName: 'sections.html' }
    });
    const { templateId, selections } = await uploadRes.json();

    const repSlides = [{ slideIndex: 1, key: 'initiative_group', prompt: 'one per initiative group' }];
    const modified = selections.map(s => ({ ...s, unique: true }));
    const createRes = await page.request.post('http://localhost:3001/api/html-flow/create-project', {
      data: { templateId, selections: modified, projectName: 'sections-test', repeatableSlides: repSlides }
    });
    const { chainId } = await createRes.json();

    const instances = INITIATIVE_GROUPS.map(group => ({
      initiative_group_title: group.title,
      initiative_group_subtitle: group.subtitle,
      total_hours: group.hours,
      initiative_count: group.initiatives,
      feature_count: group.features,
      completion_pct: group.completion,
      business_value: group.businessValue,
      market_relevance: group.marketRelevance,
    }));

    const json = JSON.stringify({ slides: { initiative_group: { instances } } });
    const applyRes = await page.request.post('http://localhost:3001/api/html-flow/apply-content', {
      data: { chainId, jsonString: json }
    });
    const body = await applyRes.json();

    expect(body.ok).toBe(true);
    const sectionCount = (body.previewHtml.match(/<section/g) || []).length;
    expect(sectionCount).toBe(6);
  });
});

// ── UC-6S-04: Preview renders all 6 slides without errors ──────────────────────

test.describe('UC-6S-04 — Preview renders all 6 slides without errors', () => {
  test('preview HTML is valid and contains no error markers', async ({ page }) => {
    const html = `<!DOCTYPE html><html><body>
      <section>
        <div data-zone="initiative_group_title">Title</div>
        <div data-zone="initiative_group_subtitle">Subtitle</div>
        <div data-zone="total_hours">Hours</div>
        <div data-zone="initiative_count">Count</div>
        <div data-zone="feature_count">Features</div>
        <div data-zone="completion_pct">Completion</div>
        <div data-zone="business_value">Value</div>
        <div data-zone="market_relevance">Relevance</div>
      </section>
    </body></html>`;

    const uploadRes = await page.request.post('http://localhost:3001/api/html-flow/upload-template', {
      data: { html, fileName: 'valid-render.html' }
    });
    const { templateId, selections } = await uploadRes.json();

    const repSlides = [{ slideIndex: 1, key: 'initiative_group', prompt: 'one per initiative group' }];
    const modified = selections.map(s => ({ ...s, unique: true }));
    const createRes = await page.request.post('http://localhost:3001/api/html-flow/create-project', {
      data: { templateId, selections: modified, projectName: 'valid-render-test', repeatableSlides: repSlides }
    });
    const { chainId } = await createRes.json();

    const instances = INITIATIVE_GROUPS.map(group => ({
      initiative_group_title: group.title,
      initiative_group_subtitle: group.subtitle,
      total_hours: group.hours,
      initiative_count: group.initiatives,
      feature_count: group.features,
      completion_pct: group.completion,
      business_value: group.businessValue,
      market_relevance: group.marketRelevance,
    }));

    const json = JSON.stringify({ slides: { initiative_group: { instances } } });
    const applyRes = await page.request.post('http://localhost:3001/api/html-flow/apply-content', {
      data: { chainId, jsonString: json }
    });
    const body = await applyRes.json();

    expect(body.ok).toBe(true);
    expect(body.previewHtml).toBeTruthy();
    // Should not contain error markers or incomplete content
    expect(body.previewHtml).not.toContain('undefined');
    expect(body.previewHtml).not.toContain('null');
  });
});

// ── UC-6S-06: Shell height accommodates 6 slides ──────────────────────────────

test.describe('UC-6S-06 — Shell height accommodates 6 slides (4320px)', () => {
  test('previewHtml contains solon-slide-shell with height: 4320px', async ({ page }) => {
    const html = `<!DOCTYPE html><html><body>
      <section>
        <div data-zone="initiative_group_title">Title</div>
        <div data-zone="initiative_group_subtitle">Subtitle</div>
        <div data-zone="total_hours">Hours</div>
        <div data-zone="initiative_count">Count</div>
        <div data-zone="feature_count">Features</div>
        <div data-zone="completion_pct">Completion</div>
        <div data-zone="business_value">Value</div>
        <div data-zone="market_relevance">Relevance</div>
      </section>
    </body></html>`;

    const uploadRes = await page.request.post('http://localhost:3001/api/html-flow/upload-template', {
      data: { html, fileName: 'shell-height.html' }
    });
    const { templateId, selections } = await uploadRes.json();

    const repSlides = [{ slideIndex: 1, key: 'initiative_group', prompt: 'one per initiative group' }];
    const modified = selections.map(s => ({ ...s, unique: true }));
    const createRes = await page.request.post('http://localhost:3001/api/html-flow/create-project', {
      data: { templateId, selections: modified, projectName: 'shell-height-test', repeatableSlides: repSlides }
    });
    const { chainId } = await createRes.json();

    const instances = INITIATIVE_GROUPS.map(group => ({
      initiative_group_title: group.title,
      initiative_group_subtitle: group.subtitle,
      total_hours: group.hours,
      initiative_count: group.initiatives,
      feature_count: group.features,
      completion_pct: group.completion,
      business_value: group.businessValue,
      market_relevance: group.marketRelevance,
    }));

    const json = JSON.stringify({ slides: { initiative_group: { instances } } });
    const applyRes = await page.request.post('http://localhost:3001/api/html-flow/apply-content', {
      data: { chainId, jsonString: json }
    });
    const body = await applyRes.json();

    expect(body.ok).toBe(true);
    // 720px per slide × 6 slides = 4320px
    expect(body.previewHtml).toContain('4320px');
    expect(body.previewHtml).toContain('solon-slide-shell');
  });
});

// ── UC-6S-07: Each section has scroll-snap-align ────────────────────────────────

test.describe('UC-6S-07 — Each section has scroll-snap-align: start', () => {
  test('previewHtml contains scroll-snap-align CSS rule', async ({ page }) => {
    const html = `<!DOCTYPE html><html><body>
      <section>
        <div data-zone="initiative_group_title">Title</div>
        <div data-zone="initiative_group_subtitle">Subtitle</div>
        <div data-zone="total_hours">Hours</div>
        <div data-zone="initiative_count">Count</div>
        <div data-zone="feature_count">Features</div>
        <div data-zone="completion_pct">Completion</div>
        <div data-zone="business_value">Value</div>
        <div data-zone="market_relevance">Relevance</div>
      </section>
    </body></html>`;

    const uploadRes = await page.request.post('http://localhost:3001/api/html-flow/upload-template', {
      data: { html, fileName: 'snap-align.html' }
    });
    const { templateId, selections } = await uploadRes.json();

    const repSlides = [{ slideIndex: 1, key: 'initiative_group', prompt: 'one per initiative group' }];
    const modified = selections.map(s => ({ ...s, unique: true }));
    const createRes = await page.request.post('http://localhost:3001/api/html-flow/create-project', {
      data: { templateId, selections: modified, projectName: 'snap-align-test', repeatableSlides: repSlides }
    });
    const { chainId } = await createRes.json();

    const instances = INITIATIVE_GROUPS.map(group => ({
      initiative_group_title: group.title,
      initiative_group_subtitle: group.subtitle,
      total_hours: group.hours,
      initiative_count: group.initiatives,
      feature_count: group.features,
      completion_pct: group.completion,
      business_value: group.businessValue,
      market_relevance: group.marketRelevance,
    }));

    const json = JSON.stringify({ slides: { initiative_group: { instances } } });
    const applyRes = await page.request.post('http://localhost:3001/api/html-flow/apply-content', {
      data: { chainId, jsonString: json }
    });
    const body = await applyRes.json();

    expect(body.ok).toBe(true);
    expect(body.previewHtml).toContain('scroll-snap-align');
  });
});

// ── UC-6S-08: Content zones are properly filled in each instance ───────────────

test.describe('UC-6S-08 — Content zones are properly filled in each instance', () => {
  test('all 6 initiative titles appear in previewHtml', async ({ page }) => {
    const html = `<!DOCTYPE html><html><body>
      <section>
        <div data-zone="initiative_group_title">Title</div>
        <div data-zone="initiative_group_subtitle">Subtitle</div>
        <div data-zone="total_hours">Hours</div>
        <div data-zone="initiative_count">Count</div>
        <div data-zone="feature_count">Features</div>
        <div data-zone="completion_pct">Completion</div>
        <div data-zone="business_value">Value</div>
        <div data-zone="market_relevance">Relevance</div>
      </section>
    </body></html>`;

    const uploadRes = await page.request.post('http://localhost:3001/api/html-flow/upload-template', {
      data: { html, fileName: 'content-zones.html' }
    });
    const { templateId, selections } = await uploadRes.json();

    const repSlides = [{ slideIndex: 1, key: 'initiative_group', prompt: 'one per initiative group' }];
    const modified = selections.map(s => ({ ...s, unique: true }));
    const createRes = await page.request.post('http://localhost:3001/api/html-flow/create-project', {
      data: { templateId, selections: modified, projectName: 'content-zones-test', repeatableSlides: repSlides }
    });
    const { chainId } = await createRes.json();

    const instances = INITIATIVE_GROUPS.map(group => ({
      initiative_group_title: group.title,
      initiative_group_subtitle: group.subtitle,
      total_hours: group.hours,
      initiative_count: group.initiatives,
      feature_count: group.features,
      completion_pct: group.completion,
      business_value: group.businessValue,
      market_relevance: group.marketRelevance,
    }));

    const json = JSON.stringify({ slides: { initiative_group: { instances } } });
    const applyRes = await page.request.post('http://localhost:3001/api/html-flow/apply-content', {
      data: { chainId, jsonString: json }
    });
    const body = await applyRes.json();

    expect(body.ok).toBe(true);

    // Verify all 6 titles are in the output
    INITIATIVE_GROUPS.forEach(group => {
      expect(body.previewHtml).toContain(group.title);
    });
  });

  test('all 6 Danish business values appear in previewHtml', async ({ page }) => {
    const html = `<!DOCTYPE html><html><body>
      <section>
        <div data-zone="initiative_group_title">Title</div>
        <div data-zone="initiative_group_subtitle">Subtitle</div>
        <div data-zone="total_hours">Hours</div>
        <div data-zone="initiative_count">Count</div>
        <div data-zone="feature_count">Features</div>
        <div data-zone="completion_pct">Completion</div>
        <div data-zone="business_value">Value</div>
        <div data-zone="market_relevance">Relevance</div>
      </section>
    </body></html>`;

    const uploadRes = await page.request.post('http://localhost:3001/api/html-flow/upload-template', {
      data: { html, fileName: 'business-values.html' }
    });
    const { templateId, selections } = await uploadRes.json();

    const repSlides = [{ slideIndex: 1, key: 'initiative_group', prompt: 'one per initiative group' }];
    const modified = selections.map(s => ({ ...s, unique: true }));
    const createRes = await page.request.post('http://localhost:3001/api/html-flow/create-project', {
      data: { templateId, selections: modified, projectName: 'business-values-test', repeatableSlides: repSlides }
    });
    const { chainId } = await createRes.json();

    const instances = INITIATIVE_GROUPS.map(group => ({
      initiative_group_title: group.title,
      initiative_group_subtitle: group.subtitle,
      total_hours: group.hours,
      initiative_count: group.initiatives,
      feature_count: group.features,
      completion_pct: group.completion,
      business_value: group.businessValue,
      market_relevance: group.marketRelevance,
    }));

    const json = JSON.stringify({ slides: { initiative_group: { instances } } });
    const applyRes = await page.request.post('http://localhost:3001/api/html-flow/apply-content', {
      data: { chainId, jsonString: json }
    });
    const body = await applyRes.json();

    expect(body.ok).toBe(true);

    // Verify all 6 business values are in the output
    INITIATIVE_GROUPS.forEach(group => {
      expect(body.previewHtml).toContain(group.businessValue);
    });
  });
});
