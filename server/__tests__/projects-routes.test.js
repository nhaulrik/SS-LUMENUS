/**
 * server/__tests__/projects-routes.test.js
 *
 * Integration tests for project management API endpoints.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import request from 'supertest'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TEST_PROJECTS_DIR = path.join(__dirname, '../../test-projects-integration')

// Set environment variable BEFORE importing app
process.env.PROJECTS_DIR = TEST_PROJECTS_DIR

// Now import app (it will use the test directory)
const { app } = await import('../index.js')

// Helper to clean up test projects
function cleanupTestProjects() {
  if (fs.existsSync(TEST_PROJECTS_DIR)) {
    fs.rmSync(TEST_PROJECTS_DIR, { recursive: true, force: true })
  }
}

const sampleHtmlTemplate = `
<!DOCTYPE html>
<html>
<head>
  <title>Sample Template</title>
</head>
<body>
  <h1>Sample Slide</h1>
  <p>This is a sample template</p>
</body>
</html>
`

describe('Projects API Routes', () => {
  beforeEach(() => {
    cleanupTestProjects()
    fs.mkdirSync(TEST_PROJECTS_DIR, { recursive: true })
  })

  afterEach(() => {
    cleanupTestProjects()
  })

  describe('GET /api/projects', () => {
    it('should return empty list when no projects exist', async () => {
      const res = await request(app).get('/api/projects')

      expect(res.status).toBe(200)
      expect(res.body.projects).toEqual([])
    })

    it('should return list of projects', async () => {
      // Create a project first
      await request(app)
        .post('/api/projects')
        .field('projectName', 'test-project')
        .attach('file', Buffer.from(sampleHtmlTemplate), 'template.html')

      const res = await request(app).get('/api/projects')

      expect(res.status).toBe(200)
      expect(res.body.projects).toHaveLength(1)
      expect(res.body.projects[0].name).toBe('test-project')
    })
  })

  describe('POST /api/projects', () => {
    it('should create new project with template', async () => {
      const res = await request(app)
        .post('/api/projects')
        .field('projectName', 'my-project')
        .attach('file', Buffer.from(sampleHtmlTemplate), 'template.html')

      expect(res.status).toBe(201)
      expect(res.body.projectName).toBe('my-project')
      expect(res.body.projectId).toBeDefined()
      expect(res.body.templateId).toBeDefined()
      expect(res.body.flowId).toBeDefined()
      expect(res.body.projectIdentifier).toBe('my-project')
    })

    it('should reject request without file', async () => {
      const res = await request(app)
        .post('/api/projects')
        .field('projectName', 'my-project')

      expect(res.status).toBe(400)
      expect(res.body.error).toBeDefined()
    })

    it('should reject invalid project name', async () => {
      const res = await request(app)
        .post('/api/projects')
        .field('projectName', 'project@invalid')
        .attach('file', Buffer.from(sampleHtmlTemplate), 'template.html')

      expect(res.status).toBe(400)
      expect(res.body.error).toBeDefined()
    })

    it('should create project directory on disk', async () => {
      await request(app)
        .post('/api/projects')
        .field('projectName', 'test-project')
        .attach('file', Buffer.from(sampleHtmlTemplate), 'template.html')

      const projectDir = path.join(TEST_PROJECTS_DIR, 'test-project')
      expect(fs.existsSync(projectDir)).toBe(true)
      expect(fs.existsSync(path.join(projectDir, 'project.json'))).toBe(true)
    })
  })

  describe('GET /api/projects/:projectName', () => {
    it('should load existing project', async () => {
      // Create project first
      await request(app)
        .post('/api/projects')
        .field('projectName', 'test-project')
        .attach('file', Buffer.from(sampleHtmlTemplate), 'template.html')

      const res = await request(app).get('/api/projects/test-project')

      expect(res.status).toBe(200)
      expect(res.body.project.name).toBe('test-project')
      expect(res.body.project.templates).toHaveLength(1)
      expect(res.body.project.flows).toHaveLength(1)
    })

    it('should return 404 for non-existent project', async () => {
      const res = await request(app).get('/api/projects/non-existent')

      expect(res.status).toBe(404)
      expect(res.body.error).toBeDefined()
    })
  })

  describe('PATCH /api/projects/:projectName', () => {
    it('should update project status', async () => {
      // Create project first
      await request(app)
        .post('/api/projects')
        .field('projectName', 'test-project')
        .attach('file', Buffer.from(sampleHtmlTemplate), 'template.html')

      const res = await request(app)
        .patch('/api/projects/test-project')
        .send({ status: 'archived' })

      expect(res.status).toBe(200)
      expect(res.body.project.status).toBe('archived')
    })

    it('should return 400 for non-existent project', async () => {
      const res = await request(app)
        .patch('/api/projects/non-existent')
        .send({ status: 'archived' })

      expect(res.status).toBe(400)
    })
  })

  describe('DELETE /api/projects/:projectName', () => {
    it('should delete project', async () => {
      // Create project first
      await request(app)
        .post('/api/projects')
        .field('projectName', 'test-project')
        .attach('file', Buffer.from(sampleHtmlTemplate), 'template.html')

      const res = await request(app).delete('/api/projects/test-project')

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)

      // Verify project is deleted
      const projectDir = path.join(TEST_PROJECTS_DIR, 'test-project')
      expect(fs.existsSync(projectDir)).toBe(false)
    })

    it('should return 400 for non-existent project', async () => {
      const res = await request(app).delete('/api/projects/non-existent')

      expect(res.status).toBe(400)
    })
  })

  describe('POST /api/projects/:projectName/templates', () => {
    it('should upload new template to project', async () => {
      // Create project first
      await request(app)
        .post('/api/projects')
        .field('projectName', 'test-project')
        .attach('file', Buffer.from(sampleHtmlTemplate), 'template.html')

      const newTemplate = '<html><body>New Template</body></html>'
      const res = await request(app)
        .post('/api/projects/test-project/templates')
        .field('description', 'New template')
        .attach('file', Buffer.from(newTemplate), 'new-template.html')

      expect(res.status).toBe(201)
      expect(res.body.templateId).toBeDefined()
      expect(res.body.filename).toBe('new-template.html')
    })

    it('should return 400 for non-existent project', async () => {
      const res = await request(app)
        .post('/api/projects/non-existent/templates')
        .attach('file', Buffer.from(sampleHtmlTemplate), 'template.html')

      expect(res.status).toBe(400)
    })

    it('should reject non-HTML files', async () => {
      // Create project first
      await request(app)
        .post('/api/projects')
        .field('projectName', 'test-project')
        .attach('file', Buffer.from(sampleHtmlTemplate), 'template.html')

      const res = await request(app)
        .post('/api/projects/test-project/templates')
        .attach('file', Buffer.from('not html'), 'file.txt')

      // multer file filter throws error which gets caught and returns 500
      expect(res.status).toBe(500)
    })
  })

  describe('GET /api/projects/:projectName/templates/:templateId', () => {
    it('should get template content', async () => {
      // Create project first
      const createRes = await request(app)
        .post('/api/projects')
        .field('projectName', 'test-project')
        .attach('file', Buffer.from(sampleHtmlTemplate), 'template.html')

      const templateId = createRes.body.templateId

      const res = await request(app).get(
        `/api/projects/test-project/templates/${templateId}`
      )

      expect(res.status).toBe(200)
      expect(res.text).toContain('Sample Template')
    })

    it('should return 404 for non-existent template', async () => {
      const res = await request(app).get(
        '/api/projects/test-project/templates/non-existent'
      )

      expect(res.status).toBe(404)
    })
  })

  describe('POST /api/projects/:projectName/flows', () => {
    it('should create new flow from template', async () => {
      // Create project first
      const createRes = await request(app)
        .post('/api/projects')
        .field('projectName', 'test-project')
        .attach('file', Buffer.from(sampleHtmlTemplate), 'template.html')

      const templateId = createRes.body.templateId

      const res = await request(app)
        .post('/api/projects/test-project/flows')
        .send({ templateId, variant: 'v2' })

      expect(res.status).toBe(201)
      expect(res.body.flowId).toBeDefined()
      expect(res.body.flowId).toContain('v2')
    })

    it('should return 400 for non-existent template', async () => {
      // Create project first
      await request(app)
        .post('/api/projects')
        .field('projectName', 'test-project')
        .attach('file', Buffer.from(sampleHtmlTemplate), 'template.html')

      const res = await request(app)
        .post('/api/projects/test-project/flows')
        .send({ templateId: 'non-existent' })

      expect(res.status).toBe(400)
    })
  })

  describe('GET /api/projects/:projectName/flows/:flowId', () => {
    it('should load flow with zones', async () => {
      // Create project first
      const createRes = await request(app)
        .post('/api/projects')
        .field('projectName', 'test-project')
        .attach('file', Buffer.from(sampleHtmlTemplate), 'template.html')

      const flowId = createRes.body.flowId

      const res = await request(app).get(
        `/api/projects/test-project/flows/${flowId}`
      )

      expect(res.status).toBe(200)
      expect(res.body.flow).toBeDefined()
      expect(res.body.zones).toBeDefined()
      expect(res.body.zones.zones).toEqual([])
    })

    it('should return 404 for non-existent flow', async () => {
      const res = await request(app).get(
        '/api/projects/test-project/flows/non-existent'
      )

      expect(res.status).toBe(404)
    })
  })

  describe('GET /api/projects/:projectName/flows/:flowId/zones', () => {
    it('should get zones for flow', async () => {
      // Create project first
      const createRes = await request(app)
        .post('/api/projects')
        .field('projectName', 'test-project')
        .attach('file', Buffer.from(sampleHtmlTemplate), 'template.html')

      const flowId = createRes.body.flowId

      const res = await request(app).get(
        `/api/projects/test-project/flows/${flowId}/zones`
      )

      expect(res.status).toBe(200)
      expect(res.body.zones).toBeDefined()
      expect(res.body.zones.zones).toEqual([])
    })
  })

  describe('PUT /api/projects/:projectName/flows/:flowId/zones', () => {
    it('should save zones for flow', async () => {
      // Create project first
      const createRes = await request(app)
        .post('/api/projects')
        .field('projectName', 'test-project')
        .attach('file', Buffer.from(sampleHtmlTemplate), 'template.html')

      const flowId = createRes.body.flowId
      const templateId = createRes.body.templateId

      const newZones = {
        flowId,
        templateId,
        zones: [{ key: 'title', nodeId: 'h1', slideIndex: 0, type: 'block' }],
        repeatableSlides: []
      }

      const res = await request(app)
        .put(`/api/projects/test-project/flows/${flowId}/zones`)
        .send(newZones)

      expect(res.status).toBe(200)
      expect(res.body.zones.zones).toHaveLength(1)
    })
  })

  describe('DELETE /api/projects/:projectName/flows/:flowId', () => {
    it('should delete flow', async () => {
      // Create project first
      const createRes = await request(app)
        .post('/api/projects')
        .field('projectName', 'test-project')
        .attach('file', Buffer.from(sampleHtmlTemplate), 'template.html')

      const flowId = createRes.body.flowId

      const res = await request(app).delete(
        `/api/projects/test-project/flows/${flowId}`
      )

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
    })
  })
})
