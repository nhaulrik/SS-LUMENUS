/**
 * server/__tests__/project-manager.test.js
 *
 * Unit tests for project management utilities.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// Set test environment BEFORE importing project-manager
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TEST_PROJECTS_DIR = path.join(__dirname, '../../test-projects-unit')

// Set environment variable before any module imports
process.env.PROJECTS_DIR = TEST_PROJECTS_DIR

// Now import the modules (they will use the test directory)
const projectManagerModule = await import('../lib/project-manager.js')
const {
  createProject,
  loadProject,
  listProjects,
  updateProject,
  deleteProject,
  addTemplate,
  createFlow,
  deleteFlow,
  loadFlow,
  loadZones,
  saveZones,
  readTemplate,
  resolveProjectDir,
  resolveFlowDir
} = projectManagerModule

// Helper to clean up test projects
function cleanupTestProjects() {
  if (fs.existsSync(TEST_PROJECTS_DIR)) {
    fs.rmSync(TEST_PROJECTS_DIR, { recursive: true, force: true })
  }
}

describe('Project Manager', () => {
  beforeEach(() => {
    cleanupTestProjects()
    fs.mkdirSync(TEST_PROJECTS_DIR, { recursive: true })
  })

  afterEach(() => {
    cleanupTestProjects()
  })

  describe('createProject', () => {
    it('should create a new project with initial template', () => {
      const projectName = 'test-project'
      const templateContent = '<html><body>Test</body></html>'
      const templateFilename = 'template.html'

      const result = createProject(projectName, templateContent, templateFilename)

      expect(result.error).toBeUndefined()
      expect(result.projectName).toBe(projectName)
      expect(result.templateId).toBeDefined()
      expect(result.flowId).toBeDefined()
      expect(result.projectId).toBeDefined()
    })

    it('should create project directory structure', () => {
      const projectName = 'test-project'
      const templateContent = '<html><body>Test</body></html>'

      createProject(projectName, templateContent, 'template.html')

      const projectDir = path.join(TEST_PROJECTS_DIR, projectName)
      expect(fs.existsSync(projectDir)).toBe(true)
      expect(fs.existsSync(path.join(projectDir, 'project.json'))).toBe(true)
      expect(fs.existsSync(path.join(projectDir, 'templates'))).toBe(true)
      expect(fs.existsSync(path.join(projectDir, 'flows'))).toBe(true)
    })

    it('should create project.json with correct structure', () => {
      const projectName = 'test-project'
      const templateContent = '<html><body>Test</body></html>'

      const result = createProject(projectName, templateContent, 'template.html')
      const projectDir = path.join(TEST_PROJECTS_DIR, projectName)
      const projectJson = JSON.parse(
        fs.readFileSync(path.join(projectDir, 'project.json'), 'utf-8')
      )

      expect(projectJson.id).toBe(result.projectId)
      expect(projectJson.name).toBe(projectName)
      expect(projectJson.status).toBe('active')
      expect(projectJson.templates).toHaveLength(1)
      expect(projectJson.flows).toHaveLength(1)
      expect(projectJson.createdAt).toBeDefined()
      expect(projectJson.updatedAt).toBeDefined()
    })

    it('should reject invalid project names', () => {
      const invalidNames = ['', 'project@name', 'project name', '../evil']

      for (const name of invalidNames) {
        const result = createProject(name, '<html></html>', 'template.html')
        expect(result.error).toBeDefined()
      }
    })

    it('should reject duplicate project names', () => {
      const projectName = 'test-project'
      const templateContent = '<html><body>Test</body></html>'

      createProject(projectName, templateContent, 'template.html')
      const result = createProject(projectName, templateContent, 'template.html')

      expect(result.error).toBeDefined()
      expect(result.error).toContain('already exists')
    })

    it('should save template file', () => {
      const projectName = 'test-project'
      const templateContent = '<html><body>Test Content</body></html>'
      const templateFilename = 'template.html'

      createProject(projectName, templateContent, templateFilename)

      const templatePath = path.join(
        TEST_PROJECTS_DIR,
        projectName,
        'templates',
        templateFilename
      )
      expect(fs.existsSync(templatePath)).toBe(true)
      expect(fs.readFileSync(templatePath, 'utf-8')).toBe(templateContent)
    })
  })

  describe('loadProject', () => {
    it('should load existing project', () => {
      const projectName = 'test-project'
      const templateContent = '<html><body>Test</body></html>'

      createProject(projectName, templateContent, 'template.html')
      const project = loadProject(projectName)

      expect(project).toBeDefined()
      expect(project.name).toBe(projectName)
      expect(project.status).toBe('active')
    })

    it('should return null for non-existent project', () => {
      const project = loadProject('non-existent')
      expect(project).toBeNull()
    })

    it('should return null for invalid project name', () => {
      const project = loadProject('../evil')
      expect(project).toBeNull()
    })
  })

  describe('listProjects', () => {
    it('should return empty array when no projects exist', () => {
      const projects = listProjects()
      expect(projects).toEqual([])
    })

    it('should list all projects', () => {
      const templateContent = '<html><body>Test</body></html>'

      createProject('project-1', templateContent, 'template.html')
      createProject('project-2', templateContent, 'template.html')
      createProject('project-3', templateContent, 'template.html')

      const projects = listProjects()

      expect(projects).toHaveLength(3)
      expect(projects.map(p => p.name)).toContain('project-1')
      expect(projects.map(p => p.name)).toContain('project-2')
      expect(projects.map(p => p.name)).toContain('project-3')
    })

    it('should sort projects by updatedAt descending', async () => {
      const templateContent = '<html><body>Test</body></html>'

      createProject('project-1', templateContent, 'template.html')
      // Add small delay to ensure different timestamps
      await new Promise(r => setTimeout(r, 10))
      createProject('project-2', templateContent, 'template.html')

      const projects = listProjects()

      expect(projects[0].name).toBe('project-2')
      expect(projects[1].name).toBe('project-1')
    })
  })

  describe('updateProject', () => {
    it('should update project status', () => {
      const projectName = 'test-project'
      const templateContent = '<html><body>Test</body></html>'

      createProject(projectName, templateContent, 'template.html')
      const success = updateProject(projectName, { status: 'archived' })

      expect(success).toBe(true)

      const project = loadProject(projectName)
      expect(project.status).toBe('archived')
    })

    it('should reject invalid status', () => {
      const projectName = 'test-project'
      const templateContent = '<html><body>Test</body></html>'

      createProject(projectName, templateContent, 'template.html')
      const success = updateProject(projectName, { status: 'invalid' })

      expect(success).toBe(false)
    })

    it('should return false for non-existent project', () => {
      const success = updateProject('non-existent', { status: 'archived' })
      expect(success).toBe(false)
    })
  })

  describe('deleteProject', () => {
    it('should delete project and all contents', () => {
      const projectName = 'test-project'
      const templateContent = '<html><body>Test</body></html>'

      createProject(projectName, templateContent, 'template.html')
      const projectDir = path.join(TEST_PROJECTS_DIR, projectName)
      expect(fs.existsSync(projectDir)).toBe(true)

      const success = deleteProject(projectName)

      expect(success).toBe(true)
      expect(fs.existsSync(projectDir)).toBe(false)
    })

    it('should return false for non-existent project', () => {
      const success = deleteProject('non-existent')
      expect(success).toBe(false)
    })
  })

  describe('addTemplate', () => {
    it('should add template to existing project', () => {
      const projectName = 'test-project'
      const initialTemplate = '<html><body>Initial</body></html>'
      const newTemplate = '<html><body>New</body></html>'

      createProject(projectName, initialTemplate, 'initial.html')
      const result = addTemplate(projectName, newTemplate, 'new.html', 'New Template')

      expect(result.error).toBeUndefined()
      expect(result.templateId).toBeDefined()

      const project = loadProject(projectName)
      expect(project.templates).toHaveLength(2)
    })

    it('should return error for non-existent project', () => {
      const result = addTemplate('non-existent', '<html></html>', 'template.html')
      expect(result.error).toBeDefined()
    })

    it('should save template file', () => {
      const projectName = 'test-project'
      const templateContent = '<html><body>Test</body></html>'

      createProject(projectName, '<html></html>', 'initial.html')
      addTemplate(projectName, templateContent, 'new.html')

      const templatePath = path.join(
        TEST_PROJECTS_DIR,
        projectName,
        'templates',
        'new.html'
      )
      expect(fs.existsSync(templatePath)).toBe(true)
    })
  })

  describe('createFlow', () => {
    it('should create flow from template', () => {
      const projectName = 'test-project'
      const templateContent = '<html><body>Test</body></html>'

      const createResult = createProject(projectName, templateContent, 'template.html')
      const templateId = createResult.templateId

      const flowResult = createFlow(projectName, templateId, 'v2')

      expect(flowResult.error).toBeUndefined()
      expect(flowResult.flowId).toBeDefined()
    })

    it('should create flow directory structure', () => {
      const projectName = 'test-project'
      const templateContent = '<html><body>Test</body></html>'

      const createResult = createProject(projectName, templateContent, 'template.html')
      const templateId = createResult.templateId
      const flowResult = createFlow(projectName, templateId)

      const flowDir = path.join(
        TEST_PROJECTS_DIR,
        projectName,
        'flows',
        flowResult.flowId
      )

      expect(fs.existsSync(flowDir)).toBe(true)
      expect(fs.existsSync(path.join(flowDir, 'flow.json'))).toBe(true)
      expect(fs.existsSync(path.join(flowDir, 'zones.json'))).toBe(true)
    })

    it('should return error for non-existent template', () => {
      const projectName = 'test-project'
      createProject(projectName, '<html></html>', 'template.html')

      const result = createFlow(projectName, 'non-existent-template-id')
      expect(result.error).toBeDefined()
    })
  })

  describe('loadFlow', () => {
    it('should load existing flow', () => {
      const projectName = 'test-project'
      const templateContent = '<html><body>Test</body></html>'

      const createResult = createProject(projectName, templateContent, 'template.html')
      const flowId = createResult.flowId

      const flow = loadFlow(projectName, flowId)

      expect(flow).toBeDefined()
      expect(flow.flowId).toBe(flowId)
      expect(flow.status).toBe('active')
    })

    it('should return null for non-existent flow', () => {
      const flow = loadFlow('test-project', 'non-existent')
      expect(flow).toBeNull()
    })
  })

  describe('loadZones and saveZones', () => {
    it('should load zones for flow', () => {
      const projectName = 'test-project'
      const createResult = createProject(projectName, '<html></html>', 'template.html')
      const flowId = createResult.flowId

      const zones = loadZones(projectName, flowId)

      expect(zones).toBeDefined()
      expect(zones.zones).toEqual([])
      expect(zones.repeatableSlides).toEqual([])
    })

    it('should save zones for flow', () => {
      const projectName = 'test-project'
      const createResult = createProject(projectName, '<html></html>', 'template.html')
      const flowId = createResult.flowId

      const newZones = {
        flowId,
        templateId: createResult.templateId,
        zones: [
          { key: 'title', nodeId: 'h1', slideIndex: 0, type: 'block' }
        ],
        repeatableSlides: []
      }

      const success = saveZones(projectName, flowId, newZones)

      expect(success).toBe(true)

      const loaded = loadZones(projectName, flowId)
      expect(loaded.zones).toHaveLength(1)
      expect(loaded.zones[0].key).toBe('title')
    })
  })

  describe('resolveProjectDir and resolveFlowDir', () => {
    it('should resolve valid project directory', () => {
      const projectName = 'test-project'
      createProject(projectName, '<html></html>', 'template.html')

      const dir = resolveProjectDir(projectName)

      expect(dir).toBeDefined()
      expect(dir).toContain(projectName)
      expect(fs.existsSync(dir)).toBe(true)
    })

    it('should return null for invalid project name', () => {
      const dir = resolveProjectDir('../evil')
      expect(dir).toBeNull()
    })

    it('should resolve valid flow directory', () => {
      const projectName = 'test-project'
      const createResult = createProject(projectName, '<html></html>', 'template.html')
      const flowId = createResult.flowId

      const dir = resolveFlowDir(projectName, flowId)

      expect(dir).toBeDefined()
      expect(dir).toContain(flowId)
      expect(fs.existsSync(dir)).toBe(true)
    })

    it('should return null for invalid flow id', () => {
      const dir = resolveFlowDir('test-project', '../evil')
      expect(dir).toBeNull()
    })
  })

  describe('readTemplate', () => {
    it('should read template content', () => {
      const projectName = 'test-project'
      const templateContent = '<html><body>Test Content</body></html>'

      const createResult = createProject(projectName, templateContent, 'template.html')
      const templateId = createResult.templateId

      const content = readTemplate(projectName, templateId)

      expect(content).toBe(templateContent)
    })

    it('should return null for non-existent template', () => {
      const content = readTemplate('test-project', 'non-existent')
      expect(content).toBeNull()
    })
  })
})
