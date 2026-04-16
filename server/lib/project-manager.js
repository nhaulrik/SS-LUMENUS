/**
 * server/lib/project-manager.js
 *
 * Utilities for managing projects, templates, and flows.
 * Handles file I/O, schema validation, and directory structure.
 */

import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { PROJECTS_DIR, RESOLVED_PROJECTS_DIR, isInsideDir } from '../config.js';

// ── Project Directory Validation ─────────────────────────────────────────────

/**
 * Validate a project name and return safe directory path, or null.
 * Allows alphanumeric, hyphens, underscores.
 */
function validateProjectName(name) {
  if (!name || typeof name !== 'string') return null;
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(name)) return null;
  return name;
}

/**
 * Validate a project ID (UUID format) and return safe directory path, or null.
 */
function validateProjectId(projectId) {
  if (!projectId || typeof projectId !== 'string') return null;
  // UUID format: 8-4-4-4-12 hex digits with hyphens
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectId)) return null;
  return projectId;
}

/**
 * Resolve a project directory path safely using project name.
 * Returns the safe path if valid, or null if invalid.
 */
export function resolveProjectDir(projectName) {
  const validName = validateProjectName(projectName);
  if (!validName) return null;
  const projectDir = path.join(PROJECTS_DIR, validName);
  if (!isInsideDir(projectDir, RESOLVED_PROJECTS_DIR)) return null;
  return projectDir;
}

/**
 * Resolve a flow directory path safely within a project.
 */
export function resolveFlowDir(projectName, flowId) {
  const projectDir = resolveProjectDir(projectName);
  if (!projectDir) return null;
  
  if (!flowId || typeof flowId !== 'string') return null;
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(flowId)) return null;
  
  const flowDir = path.join(projectDir, 'flows', flowId);
  if (!isInsideDir(flowDir, RESOLVED_PROJECTS_DIR)) return null;
  return flowDir;
}

// ── Project CRUD ─────────────────────────────────────────────────────────────

/**
 * Create a new project with initial template.
 * Returns { projectId, projectName, templateId, flowId } on success, or error object.
 */
export function createProject(projectName, templateContent, templateFilename) {
  try {
    // Validate inputs
    const safeName = validateProjectName(projectName);
    if (!safeName) {
      return { error: 'Invalid project name. Use alphanumeric, hyphens, underscores only.' };
    }
    
    if (!templateContent || !templateFilename) {
      return { error: 'Template content and filename required.' };
    }
    
    // Generate IDs (projectId is still UUID for internal use, but directory uses projectName)
    const projectId = randomUUID();
    const templateId = `tpl-${randomUUID()}`;
    const flowId = `flow-${safeName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-1`;
    
    // Create directory structure using user-friendly project name
    const projectDir = path.join(PROJECTS_DIR, safeName);
    
    // Check if project already exists
    if (fs.existsSync(projectDir)) {
      return { error: 'A project with this name already exists.' };
    }
    
    const templatesDir = path.join(projectDir, 'templates');
    const flowsDir = path.join(projectDir, 'flows');
    const flowDir = path.join(flowsDir, flowId);
    
    fs.mkdirSync(projectDir, { recursive: true });
    fs.mkdirSync(templatesDir, { recursive: true });
    fs.mkdirSync(flowDir, { recursive: true });
    
    // Save template file
    const templatePath = path.join(templatesDir, templateFilename);
    fs.writeFileSync(templatePath, templateContent);
    
    // Calculate template hash (simple SHA256-like for now, using content length as placeholder)
    const templateHash = `sha256:${Buffer.from(templateContent).toString('hex').substring(0, 16)}`;
    
    // Create project.json
    const projectJson = {
      id: projectId,
      name: safeName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'active',
      templates: [
        {
          templateId,
          filename: templateFilename,
          path: `templates/${templateFilename}`,
          uploadedAt: new Date().toISOString(),
          fileSize: templateContent.length,
          hash: templateHash,
          description: ''
        }
      ],
      flows: [
        {
          flowId,
          templateId,
          templateFilename,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: 'active',
          path: `flows/${flowId}/`
        }
      ]
    };
    
    fs.writeFileSync(
      path.join(projectDir, 'project.json'),
      JSON.stringify(projectJson, null, 2)
    );
    
    // Create flow.json
    const flowJson = {
      flowId,
      projectId,
      templateId,
      templateFilename,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'active',
      globalPrompt: '',
      generations: [],
      exports: []
    };
    
    fs.writeFileSync(
      path.join(flowDir, 'flow.json'),
      JSON.stringify(flowJson, null, 2)
    );
    
    // Create zones.json (empty, will be populated when user assigns zones)
    const zonesJson = {
      flowId,
      templateId,
      zones: [],
      repeatableSlides: []
    };
    
    fs.writeFileSync(
      path.join(flowDir, 'zones.json'),
      JSON.stringify(zonesJson, null, 2)
    );
    
    return {
      projectId,
      projectName: safeName,
      templateId,
      flowId,
      projectDir
    };
  } catch (err) {
    return { error: `Failed to create project: ${err.message}` };
  }
}

/**
 * Load project metadata by project name.
 * Returns project.json object or null if not found.
 */
export function loadProject(projectName) {
  try {
    const projectDir = resolveProjectDir(projectName);
    if (!projectDir) return null;
    
    const projectJsonPath = path.join(projectDir, 'project.json');
    if (!fs.existsSync(projectJsonPath)) return null;
    
    const content = fs.readFileSync(projectJsonPath, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    return null;
  }
}

/**
 * Load flow metadata.
 * Returns flow.json object or null if not found.
 */
export function loadFlow(projectName, flowId) {
  try {
    const flowDir = resolveFlowDir(projectName, flowId);
    if (!flowDir) return null;
    
    const flowJsonPath = path.join(flowDir, 'flow.json');
    if (!fs.existsSync(flowJsonPath)) return null;
    
    const content = fs.readFileSync(flowJsonPath, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    return null;
  }
}

/**
 * Load zones for a flow.
 * Returns zones.json object or null if not found.
 */
export function loadZones(projectName, flowId) {
  try {
    const flowDir = resolveFlowDir(projectName, flowId);
    if (!flowDir) return null;
    
    const zonesJsonPath = path.join(flowDir, 'zones.json');
    if (!fs.existsSync(zonesJsonPath)) return null;
    
    const content = fs.readFileSync(zonesJsonPath, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    return null;
  }
}

/**
 * Save zones for a flow.
 * Returns true on success, false on failure.
 */
export function saveZones(projectName, flowId, zones) {
  try {
    const flowDir = resolveFlowDir(projectName, flowId);
    if (!flowDir) return false;
    
    const zonesJsonPath = path.join(flowDir, 'zones.json');
    fs.writeFileSync(zonesJsonPath, JSON.stringify(zones, null, 2));
    
    // Update flow.json updatedAt
    const flowJson = loadFlow(projectName, flowId);
    if (flowJson) {
      flowJson.updatedAt = new Date().toISOString();
      const flowJsonPath = path.join(flowDir, 'flow.json');
      fs.writeFileSync(flowJsonPath, JSON.stringify(flowJson, null, 2));
    }
    
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * List all projects.
 * Returns array of project metadata objects.
 */
export function listProjects() {
  try {
    if (!fs.existsSync(PROJECTS_DIR)) return [];
    
    const projectNames = fs.readdirSync(PROJECTS_DIR);
    const projects = [];
    
    for (const projectName of projectNames) {
      // Skip hidden files and non-directories
      const projectPath = path.join(PROJECTS_DIR, projectName);
      if (!fs.statSync(projectPath).isDirectory()) continue;
      
      const project = loadProject(projectName);
      if (project) {
        projects.push(project);
      }
    }
    
    // Sort by updatedAt descending (most recent first)
    projects.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    
    return projects;
  } catch (err) {
    return [];
  }
}

/**
 * Update project metadata (status only - name requires directory rename).
 * Returns true on success, false on failure.
 */
export function updateProject(projectName, updates) {
  try {
    const project = loadProject(projectName);
    if (!project) return false;
    
    // Only allow status to be updated (name would require directory rename)
    if (updates.status !== undefined) {
      if (!['active', 'archived'].includes(updates.status)) return false;
      project.status = updates.status;
    }
    
    project.updatedAt = new Date().toISOString();
    
    const projectDir = resolveProjectDir(projectName);
    const projectJsonPath = path.join(projectDir, 'project.json');
    fs.writeFileSync(projectJsonPath, JSON.stringify(project, null, 2));
    
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Delete a project (and all its templates and flows).
 * Returns true on success, false on failure.
 */
export function deleteProject(projectName) {
  try {
    const projectDir = resolveProjectDir(projectName);
    if (!projectDir) return false;
    
    if (!fs.existsSync(projectDir)) return false;
    
    // Recursive delete
    fs.rmSync(projectDir, { recursive: true, force: true });
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Add a new template to an existing project.
 * Returns { templateId, filename } on success, or error object.
 */
export function addTemplate(projectName, templateContent, templateFilename, description = '') {
  try {
    const project = loadProject(projectName);
    if (!project) return { error: 'Project not found.' };
    
    if (!templateContent || !templateFilename) {
      return { error: 'Template content and filename required.' };
    }
    
    const projectDir = resolveProjectDir(projectName);
    const templatesDir = path.join(projectDir, 'templates');
    
    // Create templates directory if it doesn't exist
    if (!fs.existsSync(templatesDir)) {
      fs.mkdirSync(templatesDir, { recursive: true });
    }
    
    // Generate template ID
    const templateId = `tpl-${randomUUID()}`;
    
    // Save template file
    const templatePath = path.join(templatesDir, templateFilename);
    fs.writeFileSync(templatePath, templateContent);
    
    // Calculate template hash
    const templateHash = `sha256:${Buffer.from(templateContent).toString('hex').substring(0, 16)}`;
    
    // Add to project.json
    project.templates.push({
      templateId,
      filename: templateFilename,
      path: `templates/${templateFilename}`,
      uploadedAt: new Date().toISOString(),
      fileSize: templateContent.length,
      hash: templateHash,
      description
    });
    
    project.updatedAt = new Date().toISOString();
    
    const projectJsonPath = path.join(projectDir, 'project.json');
    fs.writeFileSync(projectJsonPath, JSON.stringify(project, null, 2));
    
    return { templateId, filename: templateFilename };
  } catch (err) {
    return { error: `Failed to add template: ${err.message}` };
  }
}

/**
 * Create a new flow from an existing template.
 * Returns { flowId } on success, or error object.
 */
export function createFlow(projectName, templateId, variant = '') {
  try {
    const project = loadProject(projectName);
    if (!project) return { error: 'Project not found.' };
    
    // Find template
    const template = project.templates.find(t => t.templateId === templateId);
    if (!template) return { error: 'Template not found.' };
    
    const projectDir = resolveProjectDir(projectName);
    const flowsDir = path.join(projectDir, 'flows');
    
    // Generate flow ID
    let flowId = `flow-${template.filename.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    
    // If variant specified, append it
    if (variant) {
      flowId = `${flowId}-${variant}`;
    } else {
      // Count existing flows with same base name and increment
      const existingFlows = project.flows.filter(f => f.flowId.startsWith(flowId));
      if (existingFlows.length > 0) {
        flowId = `${flowId}-${existingFlows.length + 1}`;
      }
    }
    
    const flowDir = path.join(flowsDir, flowId);
    
    // Check if flow already exists
    if (fs.existsSync(flowDir)) {
      return { error: 'Flow already exists.' };
    }
    
    // Create flow directory
    fs.mkdirSync(flowDir, { recursive: true });
    
    // Create flow.json
    const flowJson = {
      flowId,
      projectId: project.id,
      templateId,
      templateFilename: template.filename,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'active',
      globalPrompt: '',
      generations: [],
      exports: []
    };
    
    fs.writeFileSync(
      path.join(flowDir, 'flow.json'),
      JSON.stringify(flowJson, null, 2)
    );
    
    // Create zones.json (empty)
    const zonesJson = {
      flowId,
      templateId,
      zones: [],
      repeatableSlides: []
    };
    
    fs.writeFileSync(
      path.join(flowDir, 'zones.json'),
      JSON.stringify(zonesJson, null, 2)
    );
    
    // Add to project.json
    project.flows.push({
      flowId,
      templateId,
      templateFilename: template.filename,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'active',
      path: `flows/${flowId}/`
    });
    
    project.updatedAt = new Date().toISOString();
    
    const projectJsonPath = path.join(projectDir, 'project.json');
    fs.writeFileSync(projectJsonPath, JSON.stringify(project, null, 2));
    
    return { flowId };
  } catch (err) {
    return { error: `Failed to create flow: ${err.message}` };
  }
}

/**
 * Delete a flow from a project.
 * Returns true on success, false on failure.
 */
export function deleteFlow(projectName, flowId) {
  try {
    const project = loadProject(projectName);
    if (!project) return false;
    
    // Remove from project.json
    const flowIndex = project.flows.findIndex(f => f.flowId === flowId);
    if (flowIndex === -1) return false;
    
    project.flows.splice(flowIndex, 1);
    project.updatedAt = new Date().toISOString();
    
    const projectDir = resolveProjectDir(projectName);
    const projectJsonPath = path.join(projectDir, 'project.json');
    fs.writeFileSync(projectJsonPath, JSON.stringify(project, null, 2));
    
    // Delete flow directory
    const flowDir = resolveFlowDir(projectName, flowId);
    if (flowDir && fs.existsSync(flowDir)) {
      fs.rmSync(flowDir, { recursive: true, force: true });
    }
    
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Get template file path for a project.
 * Returns the full file path or null if not found.
 */
export function getTemplatePath(projectName, templateId) {
  try {
    const project = loadProject(projectName);
    if (!project) return null;
    
    const template = project.templates.find(t => t.templateId === templateId);
    if (!template) return null;
    
    const projectDir = resolveProjectDir(projectName);
    const templatePath = path.join(projectDir, template.path);
    
    if (!isInsideDir(templatePath, RESOLVED_PROJECTS_DIR)) return null;
    if (!fs.existsSync(templatePath)) return null;
    
    return templatePath;
  } catch (err) {
    return null;
  }
}

/**
 * Read template file content.
 * Returns the file content or null if not found.
 */
export function readTemplate(projectName, templateId) {
  try {
    const templatePath = getTemplatePath(projectName, templateId);
    if (!templatePath) return null;
    
    return fs.readFileSync(templatePath, 'utf-8');
  } catch (err) {
    return null;
  }
}
