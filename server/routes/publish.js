/**
 * server/routes/publish.js
 *
 * Express router for the Publish feature.
 *
 * Endpoints:
 *   POST /api/projects/:projectName/publish
 *   GET  /api/projects/:projectName/publishes
 *   GET  /api/projects/:projectName/export-catalog
 */

import express from 'express';
import fs from 'fs';
import path from 'path';
import { createPublish, listPublishes } from '../lib/publish-manager.js';
import { loadProject, resolveProjectDir } from '../lib/project-manager.js';

const router = express.Router({ mergeParams: true });

// ── POST /api/projects/:projectName/publish ───────────────────────────────────

router.post('/:projectName/publish', async (req, res) => {
  try {
    const { projectName } = req.params;
    const { selections }  = req.body;

    if (!selections || !Array.isArray(selections) || selections.length === 0) {
      return res.status(400).json({ error: 'selections is required and must be a non-empty array' });
    }

    const result = await createPublish(projectName, selections);
    return res.status(201).json({
      publishId:   result.publishId,
      totalSlides: result.totalSlides,
      path:        result.path,
    });
  } catch (err) {
    const status = err.statusCode === 400 ? 400 : 500;
    console.error('[publish route] POST publish error:', err.message);
    return res.status(status).json({ error: err.message });
  }
});

// ── GET /api/projects/:projectName/publishes ──────────────────────────────────

router.get('/:projectName/publishes', async (req, res) => {
  try {
    const { projectName } = req.params;
    const publishes = await listPublishes(projectName);
    return res.json({ publishes });
  } catch (err) {
    const status = err.statusCode === 400 ? 400 : 500;
    console.error('[publish route] GET publishes error:', err.message);
    return res.status(status).json({ error: err.message });
  }
});

// ── GET /api/projects/:projectName/export-catalog ─────────────────────────────

router.get('/:projectName/export-catalog', async (req, res) => {
  try {
    const { projectName } = req.params;
    const projectData = await loadProject(projectName);
    const flows = projectData?.project?.flows || projectData?.flows || [];
    const projectDir = resolveProjectDir(projectName);

    const exports = [];

    for (const flow of flows) {
      const flowId   = flow.flowId;
      const flowName = flow.name || flowId;
      const exportsDir = path.join(projectDir, 'flows', flowId, 'exports');

      if (!fs.existsSync(exportsDir)) continue;

      let exportDirs;
      try {
        exportDirs = fs.readdirSync(exportsDir).filter(d => {
          try {
            return fs.statSync(path.join(exportsDir, d)).isDirectory();
          } catch { return false; }
        });
      } catch { continue; }

      for (const exportId of exportDirs) {
        const exportJsonPath = path.join(exportsDir, exportId, 'export.json');
        if (!fs.existsSync(exportJsonPath)) continue;

        let exportData;
        try {
          exportData = JSON.parse(fs.readFileSync(exportJsonPath, 'utf8'));
        } catch { continue; }

        const slides = (exportData.content?.slides || []).map(s => ({
          slideIndex: s.index,
          title:      s.title || `Slide ${s.index}`,
          file:       s.file,
          size:       s.size || 0,
        }));

        exports.push({
          flowId,
          flowName,
          exportId:     exportData.exportId || exportId,
          exportNumber: exportData.exportNumber || 0,
          createdAt:    exportData.createdAt || null,
          slides,
        });
      }
    }

    // Sort by exportNumber within each flow
    exports.sort((a, b) => {
      if (a.flowId < b.flowId) return -1;
      if (a.flowId > b.flowId) return 1;
      return (a.exportNumber || 0) - (b.exportNumber || 0);
    });

    return res.json({ exports });
  } catch (err) {
    console.error('[publish route] GET export-catalog error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
