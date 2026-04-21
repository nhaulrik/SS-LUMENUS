/**
 * server/lib/publish-manager.js
 *
 * Manages published presentation packages.
 *
 * A "publish" bundles one or more flow exports into a single self-contained
 * directory with a viewer index.html, a manifest.json, and copied slide files.
 *
 * Directory structure:
 *   server/projects/<projectName>/Published/
 *     pub-<timestamp>/
 *       manifest.json   — publish metadata
 *       index.html      — self-contained viewer app
 *       slides/
 *         <flowId>-<exportId>-slide-N.html
 */

import fs   from 'fs';
import path from 'path';
import { resolveProjectDir }    from './project-manager.js';
import { NAME_RE, EXPORT_ID_RE } from './validation.js';

// ── Path helpers ──────────────────────────────────────────────────────────────

/**
 * Validate flowId and exportId relative to a resolved projectDir, or return null.
 * Takes an already-resolved projectDir so it can be reused without re-resolving.
 */
function resolveExportDir(projectDir, flowId, exportId) {
  if (!flowId || typeof flowId !== 'string' || !NAME_RE.test(flowId)) return null;
  if (!exportId || typeof exportId !== 'string' || !EXPORT_ID_RE.test(exportId)) return null;
  const exportDir = path.join(projectDir, 'flows', flowId, 'exports', exportId);
  if (!path.resolve(exportDir).startsWith(path.resolve(projectDir) + path.sep)) return null;
  return exportDir;
}

// ── Viewer HTML builder ───────────────────────────────────────────────────────

/**
 * Build a self-contained viewer index.html for a publish.
 *
 * The manifest is baked inline as a JS constant (no fetch needed) and slide
 * HTML is embedded via srcdoc (no cross-origin file:// load needed).
 * This makes the viewer work when opened directly from disk (file://) as well
 * as when served over HTTP.
 *
 * @param {string} projectName
 * @param {string} publishId
 * @param {string} createdAt  ISO date string
 * @param {Array<{ file: string, groupLabel: string, srcdoc: string }>} slides
 *   Flat ordered list of slides with their full HTML content pre-loaded.
 * @param {object} manifest  The full manifest object to bake in.
 */
function buildViewerHtml(projectName, publishId, createdAt, slides, manifest) {
  const formattedDate = new Date(createdAt).toLocaleDateString('en-GB', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  // Bake slide srcdoc content into a JS array — each entry is the full HTML
  // string for that slide. JSON.stringify handles all escaping correctly.
  const slidesJson   = JSON.stringify(
    slides.map(s => ({ file: s.file, groupLabel: s.groupLabel, srcdoc: s.srcdoc }))
  );
  const manifestJson = JSON.stringify(manifest);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(projectName)} — SOLON Viewer</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg:          #0a0e27;
      --surface:     #111827;
      --surface-2:   #1a2332;
      --teal:        #2C4A48;
      --teal-light:  #3a6360;
      --coral:       #FF6359;
      --coral-dim:   #cc4f46;
      --text:        #e2e8f0;
      --text-muted:  #94a3b8;
      --border:      rgba(255,255,255,0.08);
      --sidebar-w:   260px;
      --topbar-h:    52px;
    }

    html, body {
      height: 100%;
      font-family: 'Inter', system-ui, sans-serif;
      background: var(--bg);
      color: var(--text);
      overflow: hidden;
    }

    /* ── Top bar ── */
    #topbar {
      position: fixed;
      top: 0; left: 0; right: 0;
      height: var(--topbar-h);
      background: var(--teal);
      display: flex;
      align-items: center;
      padding: 0 20px;
      gap: 16px;
      z-index: 100;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }

    #topbar .logo {
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--coral);
      flex-shrink: 0;
    }

    #topbar .divider {
      width: 1px;
      height: 20px;
      background: rgba(255,255,255,0.2);
      flex-shrink: 0;
    }

    #topbar .project-name {
      font-size: 14px;
      font-weight: 600;
      color: var(--text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex: 1;
    }

    #topbar .meta {
      display: flex;
      align-items: center;
      gap: 16px;
      flex-shrink: 0;
    }

    #topbar .meta-item {
      font-size: 12px;
      color: rgba(255,255,255,0.65);
      white-space: nowrap;
    }

    #topbar .meta-item strong {
      color: var(--text);
      font-weight: 600;
    }

    /* ── Layout ── */
    #layout {
      display: flex;
      height: 100vh;
      padding-top: var(--topbar-h);
    }

    /* ── Sidebar ── */
    #sidebar {
      width: var(--sidebar-w);
      flex-shrink: 0;
      background: var(--surface);
      border-right: 1px solid var(--border);
      overflow-y: auto;
      overflow-x: hidden;
    }

    #sidebar::-webkit-scrollbar { width: 4px; }
    #sidebar::-webkit-scrollbar-track { background: transparent; }
    #sidebar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 2px; }

    .group-header {
      padding: 14px 14px 6px;
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--text-muted);
      border-top: 1px solid var(--border);
    }

    .group-header:first-child { border-top: none; }

    .slide-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 14px;
      cursor: pointer;
      transition: background 0.15s;
      border-left: 3px solid transparent;
    }

    .slide-item:hover { background: var(--surface-2); }

    .slide-item.active {
      background: rgba(44, 74, 72, 0.4);
      border-left-color: var(--coral);
    }

    .slide-num {
      width: 22px;
      height: 22px;
      border-radius: 4px;
      background: var(--surface-2);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: 600;
      color: var(--text-muted);
      flex-shrink: 0;
    }

    .slide-item.active .slide-num {
      background: var(--coral);
      color: #fff;
    }

    .slide-label {
      font-size: 12px;
      color: var(--text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .slide-item.active .slide-label { color: var(--text); }

    /* ── Main canvas area ── */
    #main {
      flex: 1;
      overflow: hidden;
      position: relative;
      background: var(--bg);
    }

    /* Wrapper is positioned absolutely so it never contributes to scroll */
    #slide-wrapper {
      position: absolute;
      top: 0; left: 0;
      transform-origin: 0 0;
      /* JS sets width, height, and transform: translate(tx,ty) scale(s) */
    }

    #slide-frame {
      border: none;
      display: block;
      background: #fff;
      border-radius: 4px;
      box-shadow: 0 8px 40px rgba(0,0,0,0.6);
      /* width & height set by JS to match detected slide dimensions */
    }

    /* ── Nav controls ── */
    #nav-controls {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: 12px;
      background: rgba(17, 24, 39, 0.9);
      backdrop-filter: blur(12px);
      border: 1px solid var(--border);
      border-radius: 40px;
      padding: 8px 16px;
      z-index: 50;
    }

    .nav-btn {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 1px solid var(--border);
      background: var(--surface-2);
      color: var(--text);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      transition: background 0.15s, border-color 0.15s;
    }

    .nav-btn:hover { background: var(--teal-light); border-color: var(--teal-light); }
    .nav-btn:disabled { opacity: 0.3; cursor: not-allowed; }

    .nav-divider {
      width: 1px;
      height: 20px;
      background: rgba(255,255,255,0.15);
      flex-shrink: 0;
    }

    #zoom-level {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted);
      min-width: 38px;
      text-align: center;
      user-select: none;
    }

    #slide-counter {
      font-size: 12px;
      font-weight: 500;
      color: var(--text-muted);
      min-width: 60px;
      text-align: center;
    }

    /* ── Loading / error states ── */
    #loading {
      position: fixed;
      inset: 0;
      background: var(--bg);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
      z-index: 200;
    }

    #loading .spinner {
      width: 36px;
      height: 36px;
      border: 3px solid rgba(255,255,255,0.1);
      border-top-color: var(--coral);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    #loading .load-text {
      font-size: 13px;
      color: var(--text-muted);
    }

    #error-banner {
      display: none;
      position: fixed;
      top: var(--topbar-h);
      left: 0; right: 0;
      background: #7f1d1d;
      color: #fca5a5;
      padding: 12px 20px;
      font-size: 13px;
      z-index: 150;
    }
  </style>
</head>
<body>

<!-- Loading overlay -->
<div id="loading">
  <div class="spinner"></div>
  <div class="load-text">Loading presentation…</div>
</div>

<!-- Error banner -->
<div id="error-banner"></div>

<!-- Top bar -->
<div id="topbar">
  <span class="logo">SOLON</span>
  <div class="divider"></div>
  <span class="project-name" id="tb-project">${escapeHtml(projectName)}</span>
  <div class="meta">
    <span class="meta-item"><strong id="tb-slides">—</strong> slides</span>
    <span class="meta-item">Published ${escapeHtml(formattedDate)}</span>
  </div>
</div>

<!-- Main layout -->
<div id="layout">
  <nav id="sidebar" role="navigation" aria-label="Slide list"></nav>
  <main id="main">
    <div id="slide-wrapper">
      <iframe id="slide-frame" title="Slide viewer" sandbox="allow-scripts allow-same-origin"></iframe>
    </div>
  </main>
</div>

<!-- Nav controls -->
<div id="nav-controls">
  <button class="nav-btn" id="btn-prev" aria-label="Previous slide" title="Previous (←)">&#8592;</button>
  <span id="slide-counter">— / —</span>
  <button class="nav-btn" id="btn-next" aria-label="Next slide" title="Next (→)">&#8594;</button>
</div>

<script>
(function () {
  'use strict';

  // ── Inlined data (baked at publish time — no fetch needed) ───────────────────
  // Works on file:// and http:// equally.
  const SLIDES   = ${slidesJson};
  const MANIFEST = ${manifestJson};

  // ── State ────────────────────────────────────────────────────────────────────
  let current = 0;

  // ── DOM refs ─────────────────────────────────────────────────────────────────
  const loading   = document.getElementById('loading');
  const sidebar   = document.getElementById('sidebar');
  const frame     = document.getElementById('slide-frame');
  const wrapper   = document.getElementById('slide-wrapper');
  const counter   = document.getElementById('slide-counter');
  const btnPrev   = document.getElementById('btn-prev');
  const btnNext   = document.getElementById('btn-next');
  const tbSlides  = document.getElementById('tb-slides');

  // ── Slide size detection (must run before boot so scaleSlide works in goTo) ──
  function detectSlideSize(html) {
    // 1. <section style="width:Npx;height:Mpx">
    const secStyle = html.match(/<section[^>]+style="([^"]+)"/i);
    if (secStyle) {
      const w = secStyle[1].match(/width\s*:\s*([\d.]+)px/i);
      const h = secStyle[1].match(/height\s*:\s*([\d.]+)px/i);
      if (w && h) return { w: parseFloat(w[1]), h: parseFloat(h[1]) };
    }
    // 2. Explicit width/height attributes on <section>
    const secAttr = html.match(/<section[^>]+>/i);
    if (secAttr) {
      const wa = secAttr[0].match(/\bwidth="([\d.]+)"/i);
      const ha = secAttr[0].match(/\bheight="([\d.]+)"/i);
      if (wa && ha) return { w: parseFloat(wa[1]), h: parseFloat(ha[1]) };
    }
    // 3. <meta name="slide-size" content="WxH">
    const meta = html.match(/<meta[^>]+name="slide-size"[^>]+content="([\d.]+)x([\d.]+)"/i);
    if (meta) return { w: parseFloat(meta[1]), h: parseFloat(meta[2]) };
    // 4. <body style="width:Npx;height:Mpx">
    const bodyStyle = html.match(/<body[^>]+style="([^"]+)"/i);
    if (bodyStyle) {
      const w = bodyStyle[1].match(/width\s*:\s*([\d.]+)px/i);
      const h = bodyStyle[1].match(/height\s*:\s*([\d.]+)px/i);
      if (w && h) return { w: parseFloat(w[1]), h: parseFloat(h[1]) };
    }
    // 5. Fallback
    return { w: 1280, h: 720 };
  }

  const SLIDE_SIZES = SLIDES.map(s => detectSlideSize(s.srcdoc));

  function scaleSlide() {
    const size   = SLIDE_SIZES[current] || { w: 1280, h: 720 };
    const main   = document.getElementById('main');
    const availW = main.clientWidth  - 48;
    const availH = main.clientHeight - 80;
    const scale  = Math.min(availW / size.w, availH / size.h, 1);

    wrapper.style.width           = size.w + 'px';
    wrapper.style.height          = size.h + 'px';
    wrapper.style.transformOrigin = 'top left';
    wrapper.style.transform       = 'translate(-50%, -50%) scale(' + scale + ')';
  }

  window.addEventListener('resize', scaleSlide);

  // ── Boot (synchronous — no fetch required) ───────────────────────────────────
  tbSlides.textContent = MANIFEST.totalSlides;
  buildSidebar();
  goTo(0);
  loading.style.display = 'none';

  // ── Sidebar ──────────────────────────────────────────────────────────────────
  function buildSidebar() {
    sidebar.innerHTML = '';
    let lastGroup = null;

    SLIDES.forEach((slide, idx) => {
      if (slide.groupLabel !== lastGroup) {
        lastGroup = slide.groupLabel;
        const hdr = document.createElement('div');
        hdr.className = 'group-header';
        hdr.textContent = slide.groupLabel;
        sidebar.appendChild(hdr);
      }

      const item = document.createElement('div');
      item.className = 'slide-item';
      item.dataset.idx = idx;
      item.setAttribute('role', 'button');
      item.setAttribute('tabindex', '0');
      item.setAttribute('aria-label', 'Slide ' + (idx + 1));

      const num = document.createElement('div');
      num.className = 'slide-num';
      num.textContent = idx + 1;

      const lbl = document.createElement('div');
      lbl.className = 'slide-label';
      lbl.textContent = 'Slide ' + (idx + 1);

      item.appendChild(num);
      item.appendChild(lbl);
      item.addEventListener('click', () => goTo(idx));
      item.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goTo(idx); }
      });

      sidebar.appendChild(item);
    });
  }

  // ── Navigation ───────────────────────────────────────────────────────────────
  function goTo(idx) {
    if (idx < 0 || idx >= SLIDES.length) return;
    current = idx;

    // Use srcdoc — fully self-contained, works on file:// without CORS issues
    frame.srcdoc = SLIDES[idx].srcdoc;

    scaleSlide();
    counter.textContent = (idx + 1) + ' / ' + SLIDES.length;
    btnPrev.disabled = idx === 0;
    btnNext.disabled = idx === SLIDES.length - 1;

    sidebar.querySelectorAll('.slide-item').forEach(el => {
      el.classList.toggle('active', Number(el.dataset.idx) === idx);
    });

    const activeEl = sidebar.querySelector('.slide-item.active');
    if (activeEl) activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  btnPrev.addEventListener('click', () => goTo(current - 1));
  btnNext.addEventListener('click', () => goTo(current + 1));

  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.key === 'ArrowLeft')  goTo(current - 1);
    if (e.key === 'ArrowRight') goTo(current + 1);
  });


})();
</script>
</body>
</html>`;
}

/**
 * Minimal HTML attribute/text escaper to prevent XSS in generated HTML.
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── Core publish functions ────────────────────────────────────────────────────

/**
 * Create a new publish from a set of flow export selections.
 *
 * @param {string} projectName
 * @param {Array<{ flowId: string, exportId: string }>} selections
 * @returns {{ publishId: string, path: string, totalSlides: number }}
 * @throws {Error} on validation failure or I/O error
 */
export async function createPublish(projectName, selections) {
  // ── Validate projectName ──────────────────────────────────────────────────
  if (!projectName || typeof projectName !== 'string' || !NAME_RE.test(projectName)) {
    throw Object.assign(new Error('Invalid project name'), { statusCode: 400 });
  }

  const projectDir = resolveProjectDir(projectName);
  if (!projectDir) {
    throw Object.assign(new Error('Invalid project name'), { statusCode: 400 });
  }

  // ── Validate selections ───────────────────────────────────────────────────
  if (!Array.isArray(selections) || selections.length === 0) {
    throw Object.assign(new Error('selections must be a non-empty array'), { statusCode: 400 });
  }

  for (const sel of selections) {
    if (!sel || typeof sel !== 'object') {
      throw Object.assign(new Error('Each selection must be an object with flowId and exportId'), { statusCode: 400 });
    }
    if (!NAME_RE.test(sel.flowId)) {
      throw Object.assign(new Error(`Invalid flowId: ${sel.flowId}`), { statusCode: 400 });
    }
    if (!EXPORT_ID_RE.test(sel.exportId)) {
      throw Object.assign(new Error(`Invalid exportId: ${sel.exportId}`), { statusCode: 400 });
    }
  }

  // ── Prepare Published directory ───────────────────────────────────────────
  const publishedDir = path.join(projectDir, 'Published');
  fs.mkdirSync(publishedDir, { recursive: true });

  // ── Generate publish ID ───────────────────────────────────────────────────
  const publishId  = `pub-${Date.now()}`;
  const publishDir = path.join(publishedDir, publishId);
  const slidesDir  = path.join(publishDir, 'slides');
  fs.mkdirSync(slidesDir, { recursive: true });

  const createdAt          = new Date().toISOString();
  const manifestSelections = [];
  const allSlidesForViewer = [];   // flat ordered list for the viewer
  let   totalSlides        = 0;

  // ── Process each selection ────────────────────────────────────────────────
  for (const sel of selections) {
    const { flowId, exportId } = sel;

    const exportDir = resolveExportDir(projectDir, flowId, exportId);
    if (!exportDir) {
      throw Object.assign(
        new Error(`Invalid path for flow "${flowId}" export "${exportId}"`),
        { statusCode: 400 }
      );
    }

    // Read export.json to get slide list
    const exportJsonPath = path.join(exportDir, 'export.json');
    if (!fs.existsSync(exportJsonPath)) {
      throw new Error(`export.json not found for ${flowId}/${exportId}`);
    }

    const exportMeta = JSON.parse(fs.readFileSync(exportJsonPath, 'utf8'));
    const slides     = exportMeta.content?.slides || [];

    if (slides.length === 0) {
      throw new Error(`No slides found in export ${flowId}/${exportId}`);
    }

    const copiedSlides = [];

    for (const slide of slides) {
      // slide.file is e.g. "slide-1.html"
      const srcFile = slide.file;

      // Validate the slide filename before joining (prevent path traversal)
      if (!/^slide-\d+\.html$/.test(srcFile)) {
        throw new Error(`Unexpected slide filename: ${srcFile}`);
      }

      const srcPath  = path.join(exportDir, srcFile);
      const destName = `${flowId}-${exportId}-${srcFile}`;   // e.g. my-flow-export-1-slide-1.html
      const destPath = path.join(slidesDir, destName);

      // Verify destination stays inside slidesDir (path traversal guard)
      if (!path.resolve(destPath).startsWith(path.resolve(slidesDir) + path.sep)) {
        throw new Error(`Path traversal detected for slide file: ${srcFile}`);
      }

      fs.copyFileSync(srcPath, destPath);

      // Read content for inline embedding in the viewer (srcdoc approach)
      const srcdoc = fs.readFileSync(srcPath, 'utf8');

      copiedSlides.push({ destName, srcdoc });
    }

    const flowLabel  = flowId.replace(/-/g, ' ');
    const groupLabel = flowLabel.charAt(0).toUpperCase() + flowLabel.slice(1)
      + ' / ' + exportId;

    manifestSelections.push({
      flowId,
      exportId,
      slideCount: slides.length,
      slides: copiedSlides.map(s => s.destName),
    });

    // Accumulate flat slide list for the viewer
    for (const s of copiedSlides) {
      allSlidesForViewer.push({ file: s.destName, groupLabel, srcdoc: s.srcdoc });
    }

    totalSlides += slides.length;
  }

  // ── Write manifest.json ───────────────────────────────────────────────────
  const manifest = {
    publishId,
    projectName,
    createdAt,
    selections: manifestSelections,
    totalSlides,
  };

  fs.writeFileSync(
    path.join(publishDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf8'
  );

  // ── Write index.html viewer ───────────────────────────────────────────────
  // Pass slides (with srcdoc) and the manifest so everything is baked inline.
  const viewerHtml = buildViewerHtml(projectName, publishId, createdAt, allSlidesForViewer, manifest);
  fs.writeFileSync(path.join(publishDir, 'index.html'), viewerHtml, 'utf8');

  return { publishId, path: publishDir, totalSlides };
}

/**
 * List all publishes for a project, sorted newest first.
 *
 * @param {string} projectName
 * @returns {Array<object>}  Array of manifest objects.
 * @throws {Error} on validation failure
 */
export async function listPublishes(projectName) {
  if (!projectName || typeof projectName !== 'string' || !NAME_RE.test(projectName)) {
    throw Object.assign(new Error('Invalid project name'), { statusCode: 400 });
  }

  const projectDir   = resolveProjectDir(projectName);
  if (!projectDir) {
    throw Object.assign(new Error('Invalid project name'), { statusCode: 400 });
  }

  const publishedDir = path.join(projectDir, 'Published');

  // If Published/ doesn't exist yet, return empty list
  if (!fs.existsSync(publishedDir)) return [];

  let entries;
  try {
    entries = fs.readdirSync(publishedDir);
  } catch (err) {
    console.error('[publish-manager] listPublishes readdir error:', err.message);
    return [];
  }

  const manifests = [];

  for (const entry of entries) {
    // Only process directories that start with "pub-"
    if (!entry.startsWith('pub-')) continue;

    const pubDir = path.join(publishedDir, entry);

    // Guard against path traversal via symlinks or unexpected entries
    if (!path.resolve(pubDir).startsWith(path.resolve(publishedDir) + path.sep)) continue;

    let stat;
    try { stat = fs.statSync(pubDir); } catch { continue; }
    if (!stat.isDirectory()) continue;

    const manifestPath = path.join(pubDir, 'manifest.json');
    if (!fs.existsSync(manifestPath)) continue;

    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      manifests.push(manifest);
    } catch (err) {
      console.error(`[publish-manager] Failed to parse manifest for ${entry}:`, err.message);
      // Skip corrupt manifests rather than crashing
    }
  }

  // Sort newest first by createdAt ISO string (lexicographic sort works for ISO dates)
  manifests.sort((a, b) => {
    if (a.createdAt > b.createdAt) return -1;
    if (a.createdAt < b.createdAt) return  1;
    return 0;
  });

  return manifests;
}
