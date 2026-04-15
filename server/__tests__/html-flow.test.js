/**
 * Tests for the HTML Visual Flow server endpoints.
 *
 * Architecture: zones are now derived from user selections on the structural
 * tree. The upload endpoint returns { trees, selections } instead of { zones }.
 * The create-project endpoint accepts selections and derives zones internally.
 *
 * Covers:
 *   - POST /api/html-flow/upload-template  → trees + selections
 *   - PATCH /api/html-flow/update-selections
 *   - POST /api/html-flow/create-project   → accepts selections, writes zones
 *   - POST /api/html-flow/generate-recipe
 *   - POST /api/html-flow/validate-json
 *   - POST /api/html-flow/apply-content
 *   - GET  /api/html-flow/download/:chainId/:file
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import fs      from 'fs';
import path    from 'path';
import os      from 'os';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let testDir;
let app;

// ── Fixture HTML templates ────────────────────────────────────────────────────

// Template with block zones (data-block)
const LEAF_HTML = `<!DOCTYPE html>
<html><head></head><body>
<section>
  <h1 data-block="title" data-hint="Page title">Placeholder Title</h1>
  <p  data-block="body"  data-hint="Body text">Placeholder body text.</p>
</section>
</body></html>`;

// Template with block zones
const BLOCK_HTML = `<!DOCTYPE html>
<html><head></head><body>
<section>
  <h1 data-block="header">Header</h1>
  <table data-block="initiatives_table" data-prompt="Populate with Q3 initiatives">
    <tr><th>Name</th><th>Owner</th></tr>
    <tr><td>Example</td><td>Team</td></tr>
  </table>
</section>
</body></html>`;

// Template with no data-block — tree is returned but no pre-selections
const PLAIN_HTML = `<!DOCTYPE html>
<html><head></head><body>
<section>
  <div class="header"><h1 class="title">Title</h1></div>
  <ul class="bullets"><li>Item one</li><li>Item two</li></ul>
</section>
</body></html>`;

// Setup / teardown ─────────────────────────────────────────────────────────────

beforeAll(async () => {
  testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'solon-html-flow-test-'));
  const chainsDir  = path.join(testDir, 'chains');
  const tempDir    = path.join(testDir, 'temp');
  const outputDir  = path.join(testDir, 'output');
  const patchesDir = path.join(testDir, 'patches');
  for (const d of [chainsDir, tempDir, outputDir, patchesDir]) {
    fs.mkdirSync(d, { recursive: true });
  }

  process.env.NODE_ENV   = 'test';
  process.env.CHAINS_DIR = chainsDir;

  const mod = await import('../index.js');
  app = mod.app;
});

afterAll(() => {
  fs.rmSync(testDir, { recursive: true, force: true });
});

// ── Helpers ───────────────────────────────────────────────────────────────────

async function uploadTemplate(html, fileName = 'test.html') {
  const res = await request(app)
    .post('/api/html-flow/upload-template')
    .send({ html, fileName });
  expect(res.status).toBe(200);
  expect(res.body.ok).toBe(true);
  return res.body; // { templateId, slideCount, trees, selections, previewHtml }
}

async function createProject(html, projectName = 'test-project', extraSelections = null) {
  const { templateId, selections: autoSelections } = await uploadTemplate(html);
  const selections = extraSelections ?? autoSelections;
  const res = await request(app)
    .post('/api/html-flow/create-project')
    .send({ templateId, selections, projectName });
  expect(res.status).toBe(200);
  expect(res.body.ok).toBe(true);
  return res.body; // { chainId, zones, selections, projectName, templatePath }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/html-flow/upload-template
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/html-flow/upload-template', () => {
  it('returns ok:true with templateId and slideCount', async () => {
    const res = await request(app)
      .post('/api/html-flow/upload-template')
      .send({ html: LEAF_HTML });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.templateId).toBeTruthy();
    expect(res.body.slideCount).toBe(1);
  });

  it('returns a trees array (one entry per slide)', async () => {
    const res = await request(app)
      .post('/api/html-flow/upload-template')
      .send({ html: LEAF_HTML });
    expect(Array.isArray(res.body.trees)).toBe(true);
    expect(res.body.trees).toHaveLength(1);
  });

  it('returns tree nodes with expected shape', async () => {
    const res = await request(app)
      .post('/api/html-flow/upload-template')
      .send({ html: LEAF_HTML });
    const flat = [];
    function flatten(nodes) { for (const n of nodes) { flat.push(n); flatten(n.children ?? []); } }
    flatten(res.body.trees[0]);
    expect(flat.length).toBeGreaterThan(0);
    const node = flat[0];
    expect(node).toHaveProperty('id');
    expect(node).toHaveProperty('tag');
    expect(node).toHaveProperty('classes');
    expect(node).toHaveProperty('label');
    expect(node).toHaveProperty('isLeaf');
    expect(node).toHaveProperty('interesting');
    expect(node).toHaveProperty('depth');
  });

  it('pre-populates selections from data-block attributes', async () => {
    const res = await request(app)
      .post('/api/html-flow/upload-template')
      .send({ html: LEAF_HTML });
    expect(Array.isArray(res.body.selections)).toBe(true);
    expect(res.body.selections.some(s => s.key === 'title')).toBe(true);
    expect(res.body.selections.some(s => s.key === 'body')).toBe(true);
  });

  it('pre-populates block selections from data-block attributes', async () => {
    const res = await request(app)
      .post('/api/html-flow/upload-template')
      .send({ html: BLOCK_HTML });
    expect(res.body.selections.some(s => s.zoneType === 'block' && s.key === 'initiatives_table')).toBe(true);
  });

  it('returns empty selections for a plain template with no data-block', async () => {
    const res = await request(app)
      .post('/api/html-flow/upload-template')
      .send({ html: PLAIN_HTML });
    expect(res.status).toBe(200);
    expect(res.body.selections).toHaveLength(0);
  });

  it('returns a non-fatal NO_ZONES violation for a plain template', async () => {
    const res = await request(app)
      .post('/api/html-flow/upload-template')
      .send({ html: PLAIN_HTML });
    expect(res.status).toBe(200); // NOT 422 — tree is still usable
    expect(res.body.violations?.some(v => v.rule === 'NO_ZONES')).toBe(true);
  });

  it('returns 422 for a template with no <section>', async () => {
    const res = await request(app)
      .post('/api/html-flow/upload-template')
      .send({ html: '<html><body><p>No section</p></body></html>' });
    expect(res.status).toBe(422);
    expect(res.body.violations.some(v => v.rule === 'NO_SECTIONS')).toBe(true);
  });

  it('returns previewHtml', async () => {
    const res = await request(app)
      .post('/api/html-flow/upload-template')
      .send({ html: LEAF_HTML });
    expect(res.body.previewHtml).toContain('<section');
  });

  it('returns 400 when html is missing', async () => {
    const res = await request(app)
      .post('/api/html-flow/upload-template')
      .send({});
    expect(res.status).toBe(400);
  });

  it('returns 400 for a file exceeding 5MB', async () => {
    const largeHtml = `<section><p data-block="x">${'A'.repeat(5 * 1024 * 1024 + 1)}</p></section>`;
    const res = await request(app)
      .post('/api/html-flow/upload-template')
      .send({ html: largeHtml });
    expect(res.status).toBe(400);
    expect(res.body.violations?.some(v => v.rule === 'FILE_TOO_LARGE')).toBe(true);
  });

  it('previewHtml contains data-solon-id attributes for tree node highlighting', async () => {
    const res = await request(app)
      .post('/api/html-flow/upload-template')
      .send({ html: LEAF_HTML });
    expect(res.body.previewHtml).toContain('data-solon-id');
  });

  it('detects DUPLICATE_ZONE_KEY violation', async () => {
    const html = `<!DOCTYPE html><html><body>
      <section>
        <p data-block="title">First</p>
        <p data-block="title">Duplicate</p>
      </section>
    </body></html>`;
    const res = await request(app)
      .post('/api/html-flow/upload-template')
      .send({ html });
    expect(res.status).toBe(200);
    expect(res.body.violations?.some(v => v.rule === 'DUPLICATE_ZONE_KEY')).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/html-flow/update-selections
// ─────────────────────────────────────────────────────────────────────────────

describe('PATCH /api/html-flow/update-selections', () => {
  it('returns ok:true and echoes back the selections', async () => {
    const { templateId, selections } = await uploadTemplate(LEAF_HTML);
    const updated = selections.map(s => ({ ...s, hint: 'Updated hint' }));
    const res = await request(app)
      .patch('/api/html-flow/update-selections')
      .send({ templateId, selections: updated });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.selections[0].hint).toBe('Updated hint');
  });

  it('returns 404 for unknown templateId', async () => {
    const res = await request(app)
      .patch('/api/html-flow/update-selections')
      .send({ templateId: 'nope', selections: [] });
    expect(res.status).toBe(404);
  });

  it('returns 400 when selections is not an array', async () => {
    const { templateId } = await uploadTemplate(LEAF_HTML);
    const res = await request(app)
      .patch('/api/html-flow/update-selections')
      .send({ templateId, selections: 'bad' });
    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/html-flow/create-project
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/html-flow/create-project', () => {
  it('returns ok:true with chainId', async () => {
    const res = await createProject(LEAF_HTML);
    expect(res.chainId).toMatch(/^chain-/);
  });

  it('derives zones from selections and returns them', async () => {
    const res = await createProject(LEAF_HTML);
    expect(Array.isArray(res.zones)).toBe(true);
    expect(res.zones.some(z => z.key === 'title')).toBe(true);
    expect(res.zones.some(z => z.key === 'body')).toBe(true);
  });

  it('writes zones to chain.json on disk', async () => {
    const { chainId } = await createProject(LEAF_HTML);
    const chain = JSON.parse(fs.readFileSync(
      path.join(process.env.CHAINS_DIR, chainId, 'chain.json'), 'utf8'
    ));
    expect(Array.isArray(chain.zones)).toBe(true);
    expect(chain.zones.some(z => z.key === 'title')).toBe(true);
  });

  it('persists selections alongside zones in chain.json', async () => {
    const { chainId } = await createProject(LEAF_HTML);
    const chain = JSON.parse(fs.readFileSync(
      path.join(process.env.CHAINS_DIR, chainId, 'chain.json'), 'utf8'
    ));
    expect(Array.isArray(chain.selections)).toBe(true);
  });

  it('resolves conflicts: block supersedes descendant leaf', async () => {
    const { templateId, selections } = await uploadTemplate(BLOCK_HTML);
    // Add a leaf selection that is a descendant of the block zone
    const blockSel = selections.find(s => s.zoneType === 'block');
    const conflictSel = {
      nodeId:       blockSel.nodeId + '>tr.some-row',
      slideIndex:   1,
      zoneType:     'leaf',
      key:          'conflicting_leaf',
      hint:         'this should be removed',
      prompt:       '',
      autoGenerate: true,
      type:         'text',
    };
    const res = await request(app)
      .post('/api/html-flow/create-project')
      .send({ templateId, selections: [...selections, conflictSel], projectName: 'conflict-test' });
    expect(res.status).toBe(200);
    expect(res.body.zones.some(z => z.key === 'conflicting_leaf')).toBe(false);
    expect(res.body.removedSelections.some(s => s.key === 'conflicting_leaf')).toBe(true);
  });

  it('accepts client-supplied selections overriding auto-detected ones', async () => {
    const { templateId } = await uploadTemplate(PLAIN_HTML);
    const customSelections = [{
      nodeId:       'div.header>h1.title',
      slideIndex:   1,
      zoneType:     'leaf',
      key:          'custom_title',
      hint:         'Custom title zone',
      prompt:       '',
      autoGenerate: true,
      type:         'text',
    }];
    const res = await request(app)
      .post('/api/html-flow/create-project')
      .send({ templateId, selections: customSelections, projectName: 'custom' });
    expect(res.status).toBe(200);
    expect(res.body.zones.some(z => z.key === 'custom_title')).toBe(true);
  });

  it('returns 404 for expired/unknown templateId', async () => {
    const res = await request(app)
      .post('/api/html-flow/create-project')
      .send({ templateId: 'nope', selections: [], projectName: 'x' });
    expect(res.status).toBe(404);
  });

  // ── repeatableSlides ────────────────────────────────────────────────────────

  it('accepts and persists repeatableSlides in chain.json', async () => {
    const { templateId, selections } = await uploadTemplate(LEAF_HTML);
    const repSlides = [{ slideIndex: 1, key: 'brand_slide', prompt: 'one per brand' }];
    const res = await request(app)
      .post('/api/html-flow/create-project')
      .send({ templateId, selections, projectName: 'rep-test', repeatableSlides: repSlides });
    expect(res.status).toBe(200);
    const chain = JSON.parse(fs.readFileSync(
      path.join(process.env.CHAINS_DIR, res.body.chainId, 'chain.json'), 'utf8'
    ));
    expect(chain.repeatableSlides).toHaveLength(1);
    expect(chain.repeatableSlides[0].key).toBe('brand_slide');
    expect(chain.repeatableSlides[0].prompt).toBe('one per brand');
  });

  it('zones on repeatable slides get isRepeatable:true', async () => {
    const { templateId, selections } = await uploadTemplate(LEAF_HTML);
    const repSlides = [{ slideIndex: 1, key: 'brand_slide', prompt: 'one per brand' }];
    const res = await request(app)
      .post('/api/html-flow/create-project')
      .send({ templateId, selections, projectName: 'rep-zones', repeatableSlides: repSlides });
    expect(res.status).toBe(200);
    // All zones on slide 1 are repeatable
    expect(res.body.zones.every(z => z.isRepeatable === true)).toBe(true);
  });

  it('propagates unique:false from selections to zones', async () => {
    const { templateId, selections } = await uploadTemplate(LEAF_HTML);
    // Mark the first selection as non-unique
    const modified = selections.map((s, i) => i === 0 ? { ...s, unique: false } : s);
    const repSlides = [{ slideIndex: 1, key: 'brand_slide', prompt: 'one per brand' }];
    const res = await request(app)
      .post('/api/html-flow/create-project')
      .send({ templateId, selections: modified, projectName: 'unique-test', repeatableSlides: repSlides });
    expect(res.status).toBe(200);
    const nonUnique = res.body.zones.find(z => z.unique === false);
    expect(nonUnique).toBeDefined();
  });

  it('defaults missing repeatableSlides to empty array', async () => {
    const { chainId } = await createProject(LEAF_HTML);
    const chain = JSON.parse(fs.readFileSync(
      path.join(process.env.CHAINS_DIR, chainId, 'chain.json'), 'utf8'
    ));
    expect(chain.repeatableSlides).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/html-flow/generate-recipe
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/html-flow/generate-recipe', () => {
  it('returns a recipe string for a leaf project (now block zones)', async () => {
    const { chainId } = await createProject(LEAF_HTML);
    const res = await request(app)
      .post('/api/html-flow/generate-recipe')
      .send({ chainId });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(typeof res.body.recipe).toBe('string');
    expect(res.body.recipe).toContain('BLOCK ZONES');
  });

  it('includes BLOCK ZONES section for a project with block zones', async () => {
    const { chainId } = await createProject(BLOCK_HTML);
    const res = await request(app)
      .post('/api/html-flow/generate-recipe')
      .send({ chainId });
    expect(res.status).toBe(200);
    expect(res.body.recipe).toContain('BLOCK ZONES');
  });

  it('prepends global guidance when provided', async () => {
    const { chainId } = await createProject(LEAF_HTML);
    const res = await request(app)
      .post('/api/html-flow/generate-recipe')
      .send({ chainId, globalPrompt: 'Use formal language' });
    expect(res.body.recipe).toContain('Use formal language');
  });

  it('returns 404 for unknown chainId', async () => {
    const res = await request(app)
      .post('/api/html-flow/generate-recipe')
      .send({ chainId: 'nope' });
    expect(res.status).toBe(404);
  });

  it('returns 400 when chainId is missing', async () => {
    const res = await request(app)
      .post('/api/html-flow/generate-recipe')
      .send({});
    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/html-flow/validate-json
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/html-flow/validate-json', () => {
  it('returns valid:true for correct leaf JSON', async () => {
    const { chainId } = await createProject(LEAF_HTML);
    const json = JSON.stringify({ blocks: { title: 'Hello', body: 'World' } });
    const res  = await request(app)
      .post('/api/html-flow/validate-json')
      .send({ chainId, jsonString: json });
    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
  });

  it('returns valid:false for missing fields', async () => {
    const { chainId } = await createProject(LEAF_HTML);
    const json = JSON.stringify({ blocks: { title: 'Hello' } }); // missing body
    const res  = await request(app)
      .post('/api/html-flow/validate-json')
      .send({ chainId, jsonString: json });
    expect(res.body.valid).toBe(false);
    expect(res.body.missingFields.some(f => f.includes('body'))).toBe(true);
  });

  it('returns valid:false for invalid JSON syntax', async () => {
    const { chainId } = await createProject(LEAF_HTML);
    const res = await request(app)
      .post('/api/html-flow/validate-json')
      .send({ chainId, jsonString: '{bad json' });
    expect(res.body.valid).toBe(false);
  });

  it('returns 404 for unknown chainId', async () => {
    const res = await request(app)
      .post('/api/html-flow/validate-json')
      .send({ chainId: 'nope', jsonString: '{}' });
    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/html-flow/apply-content
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/html-flow/apply-content', () => {
  it('applies leaf content and returns ok:true with outputFile', async () => {
    const { chainId } = await createProject(LEAF_HTML);
    const json = JSON.stringify({ blocks: { title: 'Q3 Report', body: 'Great quarter.' } });
    const res  = await request(app)
      .post('/api/html-flow/apply-content')
      .send({ chainId, jsonString: json });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.outputFile).toMatch(/\.html$/);
  });

  it('patched output contains AI values', async () => {
    const { chainId } = await createProject(LEAF_HTML);
    const json = JSON.stringify({ blocks: { title: 'Q3 Report', body: 'Great quarter.' } });
    const res  = await request(app)
      .post('/api/html-flow/apply-content')
      .send({ chainId, jsonString: json });
    expect(res.body.previewHtml).toContain('Q3 Report');
  });

  it('patched output strips data-block attributes', async () => {
    const { chainId } = await createProject(LEAF_HTML);
    const json = JSON.stringify({ blocks: { title: 'T', body: 'B' } });
    const res  = await request(app)
      .post('/api/html-flow/apply-content')
      .send({ chainId, jsonString: json });
    expect(res.body.previewHtml).not.toContain('data-block');
  });

  it('writes output file to disk', async () => {
    const { chainId } = await createProject(LEAF_HTML);
    const json = JSON.stringify({ blocks: { title: 'T', body: 'B' } });
    const res  = await request(app)
      .post('/api/html-flow/apply-content')
      .send({ chainId, jsonString: json });
    const filePath = path.join(process.env.CHAINS_DIR, chainId, res.body.outputFile);
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it('records the round in chain.json', async () => {
    const { chainId } = await createProject(LEAF_HTML);
    const json = JSON.stringify({ blocks: { title: 'T', body: 'B' } });
    await request(app)
      .post('/api/html-flow/apply-content')
      .send({ chainId, jsonString: json });
    const chain = JSON.parse(fs.readFileSync(
      path.join(process.env.CHAINS_DIR, chainId, 'chain.json'), 'utf8'
    ));
    expect(chain.rounds).toHaveLength(1);
  });

  it('returns 422 for invalid JSON', async () => {
    const { chainId } = await createProject(LEAF_HTML);
    const json = JSON.stringify({ blocks: { title: 'T' } }); // missing body
    const res  = await request(app)
      .post('/api/html-flow/apply-content')
      .send({ chainId, jsonString: json });
    expect(res.status).toBe(422);
  });

  it('returns 404 for unknown chainId', async () => {
    const res = await request(app)
      .post('/api/html-flow/apply-content')
      .send({ chainId: 'nope', jsonString: '{}' });
    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/html-flow/download/:chainId/:file
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/html-flow/download/:chainId/:file', () => {
  it('serves the output file as a download', async () => {
    const { chainId } = await createProject(LEAF_HTML);
    const json = JSON.stringify({ blocks: { title: 'T', body: 'B' } });
    const applyRes = await request(app)
      .post('/api/html-flow/apply-content')
      .send({ chainId, jsonString: json });
    const { outputFile } = applyRes.body;
    const res = await request(app)
      .get(`/api/html-flow/download/${chainId}/${outputFile}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(res.headers['content-disposition']).toContain(outputFile);
  });

  it('returns 404 for a nonexistent file', async () => {
    const { chainId } = await createProject(LEAF_HTML);
    const res = await request(app)
      .get(`/api/html-flow/download/${chainId}/output-does-not-exist.html`);
    expect(res.status).toBe(404);
  });

  it('returns 400 for a path-traversal filename', async () => {
    const { chainId } = await createProject(LEAF_HTML);
    const res = await request(app)
      .get(`/api/html-flow/download/${chainId}/..%2Fchain.json`);
    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Security — path traversal via chainId
// ─────────────────────────────────────────────────────────────────────────────

describe('Security — chainId path traversal', () => {
  const traversalIds = [
    '../other-chain',
    '../../etc',
    'chain-abc/../../../etc',
    'chain-abc%2F..%2F..%2Fetc',
  ];

  for (const badId of traversalIds) {
    it(`rejects chainId "${badId}" in generate-recipe`, async () => {
      const res = await request(app)
        .post('/api/html-flow/generate-recipe')
        .send({ chainId: badId });
      expect([400, 404]).toContain(res.status);
    });

    it(`rejects chainId "${badId}" in validate-json`, async () => {
      const res = await request(app)
        .post('/api/html-flow/validate-json')
        .send({ chainId: badId, jsonString: '{}' });
      expect([400, 404]).toContain(res.status);
    });

    it(`rejects chainId "${badId}" in apply-content`, async () => {
      const res = await request(app)
        .post('/api/html-flow/apply-content')
        .send({ chainId: badId, jsonString: '{}' });
      expect([400, 404]).toContain(res.status);
    });

    it(`rejects chainId "${badId}" in download`, async () => {
      const res = await request(app)
        .get(`/api/html-flow/download/${encodeURIComponent(badId)}/output-test.html`);
      expect([400, 404]).toContain(res.status);
    });
  }

  it('create-project does not leak templatePath in response', async () => {
    const { chainId } = await createProject(LEAF_HTML);
    // templatePath is a server-side path — should not appear in response
    const res = await request(app)
      .post('/api/html-flow/create-project')
      .send({ templateId: 'nope', selections: [], projectName: 'x' });
    // Even in the success case, templatePath should be absent
    const { chainId: cid } = await createProject(LEAF_HTML);
    void cid; // used above
    const successBody = (await request(app)
      .post('/api/html-flow/create-project')
      .send({ templateId: (await uploadTemplate(LEAF_HTML)).templateId, selections: [], projectName: 'test' })).body;
    expect(successBody.templatePath).toBeUndefined();
  });

  it('apply-content does not leak outputPath in response', async () => {
    const { chainId } = await createProject(LEAF_HTML);
    const json = JSON.stringify({ blocks: { title: 'T', body: 'B' } });
    const res = await request(app)
      .post('/api/html-flow/apply-content')
      .send({ chainId, jsonString: json });
    expect(res.body.outputPath).toBeUndefined();
    expect(res.body.outputFile).toBeTruthy(); // filename only is fine
  });
});
