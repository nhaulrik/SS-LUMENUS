/**
 * server/routes/publish.js
 *
 * Express router for the Publish feature.
 *
 * Endpoints:
 *   POST /api/projects/:projectName/publish
 *   GET  /api/projects/:projectName/publishes
 */

import express from 'express';
import { createPublish, listPublishes } from '../lib/publish-manager.js';

const router = express.Router({ mergeParams: true });

// ── POST /api/projects/:projectName/publish ───────────────────────────────────

router.post('/:projectName/publish', async (req, res) => {
  try {
    const { projectName } = req.params;
    const { selections }  = req.body;

    // Guard: selections must be present and non-empty
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
    // Propagate 400s from the manager (validation errors)
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

export default router;
