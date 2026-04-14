/**
 * server/routes/html-flow.js
 *
 * Visual Flow (HTML-based) API endpoints.
 * Stage 1: template upload, zone parsing, zone editing, project creation.
 */

import express        from 'express';
import fs             from 'fs';
import path           from 'path';
import { randomUUID } from 'crypto';
import { parse }      from 'node-html-parser';
import { CHAINS_DIR } from '../config.js';

const router = express.Router();

// In-memory store for pending template sessions (pre-project-creation).
// Keyed by templateId (uuid). Entries are small — just HTML string + derived data.
// They are not persisted; a server restart clears them (acceptable for Stage 1).
const pendingTemplates = new Map();

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Infer zone type from a parsed HTML element node. */
function inferZoneType(node) {
  const explicit = node.getAttribute('data-type');
  if (explicit) return explicit;
  if (node.getAttribute('data-repeatable') === 'true') return 'repeatable';
  const tag = node.tagName?.toLowerCase();
  if (tag === 'canvas') return 'chart';
  if (tag === 'img')    return 'image';
  if (tag === 'svg' || node.querySelector('svg')) return 'chart';
  const text = node.text?.trim() ?? '';
  if (/^\d[\d,.\s%$€£]*$/.test(text)) return 'number';
  return 'text';
}

/** Extract the plain text hint from a node (trimmed, max 120 chars). */
function extractHint(node) {
  const explicit = node.getAttribute('data-hint');
  if (explicit) return explicit.trim().slice(0, 120);
  return (node.text?.trim() ?? '').slice(0, 120);
}

/**
 * Parse an HTML string and return structured zone data.
 * Returns { slideCount, zones, violations }
 */
function parseTemplate(html) {
  const root       = parse(html, { comment: false });
  const sections   = root.querySelectorAll('section');
  const violations = [];
  const zones      = [];

  if (sections.length === 0) {
    violations.push({
      rule:    'NO_SECTIONS',
      message: 'No slides found. Wrap each slide in a <section> element.',
    });
    return { slideCount: 0, zones, violations };
  }

  let hasAnyZone = false;

  sections.forEach((section, sectionIdx) => {
    const slideIndex    = sectionIdx + 1;
    const zoneNodes     = section.querySelectorAll('[data-zone]');
    const keysThisSlide = new Set();

    zoneNodes.forEach((node, nodeIdx) => {
      const key = node.getAttribute('data-zone')?.trim();
      if (!key) return;

      hasAnyZone = true;

      // Duplicate key within a slide
      if (keysThisSlide.has(key)) {
        violations.push({
          rule:    'DUPLICATE_ZONE_KEY',
          message: `Duplicate zone key "${key}" found in slide ${slideIndex}. Zone keys must be unique within a slide.`,
        });
        return;
      }
      keysThisSlide.add(key);

      const type         = inferZoneType(node);
      const isRepeatable = node.getAttribute('data-repeatable') === 'true';
      const autoStr      = node.getAttribute('data-auto');
      const autoGenerate = autoStr === 'false' ? false : true;
      const hint         = extractHint(node);
      const originalText = (node.text?.trim() ?? '').slice(0, 500);

      // Find parent repeatable block key (if this node is inside one)
      let repeatableKey = null;
      let ancestor = node.parentNode;
      while (ancestor && ancestor !== section) {
        const ancestorZone = ancestor.getAttribute?.('data-zone');
        const ancestorRep  = ancestor.getAttribute?.('data-repeatable');
        if (ancestorZone && ancestorRep === 'true') {
          repeatableKey = ancestorZone;
          break;
        }
        ancestor = ancestor.parentNode;
      }

      zones.push({
        key,
        slideIndex,
        type,
        hint,
        autoGenerate,
        isRepeatable,
        repeatableKey,
        originalText,
        // elementOrder within slide for stable display ordering
        elementOrder: nodeIdx,
      });
    });
  });

  if (!hasAnyZone) {
    violations.push({
      rule:    'NO_ZONES',
      message: 'No content zones found. Add data-zone="your-key" to elements that should receive content.',
    });
  }

  // Validate repeatable blocks contain at least one non-repeatable child zone
  const repeatableParents = zones.filter(z => z.isRepeatable && z.type === 'repeatable');
  repeatableParents.forEach(parent => {
    const children = zones.filter(z => z.repeatableKey === parent.key);
    if (children.length === 0) {
      violations.push({
        rule:    'EMPTY_REPEATABLE',
        message: `Repeatable block "${parent.key}" contains no content zones. Add data-zone attributes inside it.`,
      });
    }
  });

  return { slideCount: sections.length, zones, violations };
}

/** Build a preview HTML document for a single slide (first section). */
function buildPreviewHtml(html) {
  try {
    const root     = parse(html);
    const head     = root.querySelector('head');
    const sections = root.querySelectorAll('section');
    if (sections.length === 0) return '';

    const headContent = head ? head.innerHTML : '';
    const slideHtml   = sections[0].outerHTML;

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { width: 1280px; height: 720px; overflow: hidden; background: #000; }
  section { width: 1280px; height: 720px; position: relative; overflow: hidden; display: block; }
</style>
${headContent}
</head>
<body>${slideHtml}</body>
</html>`;
  } catch {
    return '';
  }
}

// ── POST /api/html-flow/upload-template ──────────────────────────────────────

router.post('/html-flow/upload-template', (req, res) => {
  try {
    const { html, fileName } = req.body;

    if (!html || typeof html !== 'string') {
      return res.status(400).json({ ok: false, error: 'Missing html field in request body.' });
    }

    // Size check (~5MB in chars is a reasonable proxy for bytes in UTF-8)
    if (html.length > 5 * 1024 * 1024) {
      return res.status(400).json({
        ok: false,
        error: 'VALIDATION_FAILED',
        violations: [{ rule: 'FILE_TOO_LARGE', message: 'File is too large. Maximum size is 5MB.' }],
      });
    }

    const { slideCount, zones, violations } = parseTemplate(html);

    if (violations.length > 0) {
      return res.status(422).json({ ok: false, error: 'VALIDATION_FAILED', violations });
    }

    const templateId = randomUUID();
    pendingTemplates.set(templateId, { html, fileName: fileName || 'template.html', slideCount, zones });

    // Expire after 2 hours to avoid unbounded memory growth
    setTimeout(() => pendingTemplates.delete(templateId), 2 * 60 * 60 * 1000);

    const previewHtml = buildPreviewHtml(html);

    return res.json({ ok: true, templateId, slideCount, zones, previewHtml });
  } catch (err) {
    console.error('[html-flow] upload-template error:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// ── PATCH /api/html-flow/update-zones ────────────────────────────────────────

router.patch('/html-flow/update-zones', (req, res) => {
  try {
    const { templateId, zones } = req.body;

    if (!templateId || !pendingTemplates.has(templateId)) {
      return res.status(404).json({ ok: false, error: 'Template session not found. Please re-upload.' });
    }

    if (!Array.isArray(zones)) {
      return res.status(400).json({ ok: false, error: 'zones must be an array.' });
    }

    const session = pendingTemplates.get(templateId);
    session.zones = zones;
    pendingTemplates.set(templateId, session);

    return res.json({ ok: true, zones });
  } catch (err) {
    console.error('[html-flow] update-zones error:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// ── POST /api/html-flow/create-project ───────────────────────────────────────

router.post('/html-flow/create-project', (req, res) => {
  try {
    const { templateId, zones, projectName } = req.body;

    if (!templateId || !pendingTemplates.has(templateId)) {
      return res.status(404).json({ ok: false, error: 'Template session not found. Please re-upload.' });
    }

    const session    = pendingTemplates.get(templateId);
    const chainId    = 'chain-' + randomUUID();
    const chainDir   = path.join(CHAINS_DIR, chainId);
    fs.mkdirSync(chainDir, { recursive: true });

    // Write the HTML template to disk inside the chain dir
    const templatePath = path.join(chainDir, 'template.html');
    fs.writeFileSync(templatePath, session.html, 'utf8');

    const confirmedZones = Array.isArray(zones) ? zones : session.zones;
    const name           = projectName?.trim() || session.fileName?.replace('.html', '') || 'html-project';

    const chain = {
      id:           chainId,
      flow:         'html',
      projectName:  name,
      templateFile: session.fileName,
      templatePath,
      slideCount:   session.slideCount,
      createdAt:    new Date().toISOString(),
      updatedAt:    new Date().toISOString(),
      zones:        confirmedZones,
      rounds:       [],
    };

    fs.writeFileSync(path.join(chainDir, 'chain.json'), JSON.stringify(chain, null, 2), 'utf8');

    // Session is no longer needed
    pendingTemplates.delete(templateId);

    return res.json({ ok: true, chainId, projectName: name, zones: confirmedZones, templatePath });
  } catch (err) {
    console.error('[html-flow] create-project error:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
