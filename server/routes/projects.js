/**
 * server/routes/projects.js
 *
 * API endpoints for project management.
 * Handles CRUD operations for projects, templates, and flows.
 */

import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import {
  createProject,
  loadProject,
  listProjects,
  updateProject,
  deleteProject,
  addTemplate,
  createFlow,
  deleteFlow,
  readTemplate,
  resolveProjectDir,
  resolveFlowDir,
  loadFlow,
  loadZones,
  saveZones
} from '../lib/project-manager.js';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    // Only allow HTML files for templates
    if (file.mimetype === 'text/html' || file.originalname.endsWith('.html')) {
      cb(null, true);
    } else {
      cb(new Error('Only HTML files are allowed'));
    }
  }
});

// ── Project Listing & Creation ──────────────────────────────────────────────

/**
 * GET /api/projects
 * List all projects for the user.
 */
router.get('/', (req, res) => {
  try {
    const projects = listProjects();
    res.json({ projects });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/projects
 * Create a new project with initial template.
 * Body: multipart/form-data { file, projectName? }
 */
router.post('/', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const projectName = req.body.projectName || req.file.originalname.replace(/\.[^.]+$/, '');
    const templateContent = req.file.buffer.toString('utf-8');
    const templateFilename = req.file.originalname;

    const result = createProject(projectName, templateContent, templateFilename);

    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    res.status(201).json({
      projectId: result.projectId,
      projectName: result.projectName,
      templateId: result.templateId,
      flowId: result.flowId,
      // Return projectName for routing purposes
      projectIdentifier: result.projectName
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Project Details ────────────────────────────────────────────────────────

/**
 * GET /api/projects/:projectName
 * Load project with all templates and flows.
 */
router.get('/:projectName', (req, res) => {
  try {
    const project = loadProject(req.params.projectName);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({ project });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/projects/:projectName
 * Update project metadata (status).
 */
router.patch('/:projectName', (req, res) => {
  try {
    const { status } = req.body;

    const success = updateProject(req.params.projectName, { status });
    if (!success) {
      return res.status(400).json({ error: 'Failed to update project' });
    }

    const project = loadProject(req.params.projectName);
    res.json({ project });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/projects/:projectName
 * Delete a project and all its templates and flows.
 */
router.delete('/:projectName', (req, res) => {
  try {
    const success = deleteProject(req.params.projectName);
    if (!success) {
      return res.status(400).json({ error: 'Failed to delete project' });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Template Management ────────────────────────────────────────────────────

/**
 * POST /api/projects/:projectName/templates
 * Upload a new template to a project.
 */
router.post('/:projectName/templates', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const description = req.body.description || '';
    const templateContent = req.file.buffer.toString('utf-8');
    const templateFilename = req.file.originalname;

    const result = addTemplate(req.params.projectName, templateContent, templateFilename, description);

    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    res.status(201).json({
      templateId: result.templateId,
      filename: result.filename
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/projects/:projectName/templates/:templateId
 * Get template file content.
 */
router.get('/:projectName/templates/:templateId', (req, res) => {
  try {
    const content = readTemplate(req.params.projectName, req.params.templateId);
    if (!content) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.setHeader('Content-Type', 'text/html');
    res.send(content);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Flow Management ────────────────────────────────────────────────────────

/**
 * POST /api/projects/:projectName/flows
 * Create a new flow from an existing template.
 * Body: { templateId, variant? }
 */
router.post('/:projectName/flows', (req, res) => {
  try {
    const { templateId, variant } = req.body;

    if (!templateId) {
      return res.status(400).json({ error: 'templateId required' });
    }

    const result = createFlow(req.params.projectName, templateId, variant);

    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    res.status(201).json({ flowId: result.flowId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/projects/:projectName/flows/:flowId
 * Load flow with current state.
 */
router.get('/:projectName/flows/:flowId', (req, res) => {
  try {
    const flow = loadFlow(req.params.projectName, req.params.flowId);
    if (!flow) {
      return res.status(404).json({ error: 'Flow not found' });
    }

    const zones = loadZones(req.params.projectName, req.params.flowId);

    res.json({ flow, zones });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/projects/:projectName/flows/:flowId
 * Update flow metadata (globalPrompt, status).
 */
router.patch('/:projectName/flows/:flowId', (req, res) => {
  try {
    const { globalPrompt, status } = req.body;

    const flow = loadFlow(req.params.projectName, req.params.flowId);
    if (!flow) {
      return res.status(404).json({ error: 'Flow not found' });
    }

    if (globalPrompt !== undefined) {
      flow.globalPrompt = globalPrompt;
    }

    if (status !== undefined) {
      if (!['active', 'paused', 'archived'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      flow.status = status;
    }

    flow.updatedAt = new Date().toISOString();

    const flowDir = resolveFlowDir(req.params.projectName, req.params.flowId);
    if (!flowDir) {
      return res.status(400).json({ error: 'Invalid flow path' });
    }

    fs.writeFileSync(
      path.join(flowDir, 'flow.json'),
      JSON.stringify(flow, null, 2)
    );

    res.json({ flow });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/projects/:projectName/flows/:flowId
 * Delete a flow (keeps template).
 */
router.delete('/:projectName/flows/:flowId', (req, res) => {
  try {
    const success = deleteFlow(req.params.projectName, req.params.flowId);
    if (!success) {
      return res.status(400).json({ error: 'Failed to delete flow' });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Zone Management ────────────────────────────────────────────────────────

/**
 * GET /api/projects/:projectName/flows/:flowId/zones
 * Get zones for a flow.
 */
router.get('/:projectName/flows/:flowId/zones', (req, res) => {
  try {
    const zones = loadZones(req.params.projectName, req.params.flowId);
    if (!zones) {
      return res.status(404).json({ error: 'Zones not found' });
    }

    res.json({ zones });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/projects/:projectName/flows/:flowId/zones
 * Save zones for a flow.
 */
router.put('/:projectName/flows/:flowId/zones', (req, res) => {
  try {
    const zones = req.body;

    const success = saveZones(req.params.projectName, req.params.flowId, zones);
    if (!success) {
      return res.status(400).json({ error: 'Failed to save zones' });
    }

    res.json({ zones });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
