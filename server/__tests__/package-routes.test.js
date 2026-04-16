/**
 * server/__tests__/package-routes.test.js
 *
 * Integration tests for package API endpoints
 * Tests all 8 package endpoints
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import express from 'express';
import { fileURLToPath } from 'url';
import htmlFlowRouter from '../routes/html-flow.js';
import * as StructureManager from '../lib/structure-manager.js';
import { CHAINS_DIR } from '../config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_CHAIN_ID = `test-chain-${Date.now()}`;
const TEST_CHAIN_DIR = path.join(CHAINS_DIR, TEST_CHAIN_ID);

// Setup Express app for testing
const app = express();
app.use(express.json());
app.use('/api', htmlFlowRouter);

// Cleanup helper
function cleanupTestChain() {
  if (fs.existsSync(TEST_CHAIN_DIR)) {
    fs.rmSync(TEST_CHAIN_DIR, { recursive: true, force: true });
  }
}

describe('Package API Endpoints', () => {
  beforeEach(() => {
    cleanupTestChain();
    fs.mkdirSync(TEST_CHAIN_DIR, { recursive: true });
  });

  afterEach(() => {
    cleanupTestChain();
  });

  describe('POST /api/html-flow/:chainId/packages', () => {
    it('should create a new package', async () => {
      const structure = StructureManager.createStructure(TEST_CHAIN_ID, 'Test', 'Test', ['export-1']);

      const res = await request(app)
        .post(`/api/html-flow/${TEST_CHAIN_ID}/packages`)
        .send({
          name: 'Test Package',
          description: 'A test package',
          structureId: structure.structureId,
          options: {
            includeMetadata: true,
            generateReadme: true,
            includeManifest: true
          }
        });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.package).toBeTruthy();
      expect(res.body.package.name).toBe('Test Package');
      expect(res.body.package.packageId).toMatch(/^package-\d+$/);
    });

    it('should return 400 for missing name', async () => {
      const structure = StructureManager.createStructure(TEST_CHAIN_ID, 'Test', 'Test', ['export-1']);

      const res = await request(app)
        .post(`/api/html-flow/${TEST_CHAIN_ID}/packages`)
        .send({
          description: 'A test package',
          structureId: structure.structureId
        });

      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
    });

    it('should return 400 for missing structureId', async () => {
      const res = await request(app)
        .post(`/api/html-flow/${TEST_CHAIN_ID}/packages`)
        .send({
          name: 'Test Package',
          description: 'A test package'
        });

      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
    });

    it('should return 400 for invalid chainId', async () => {
      const res = await request(app)
        .post(`/api/html-flow/invalid/packages`)
        .send({
          name: 'Test Package',
          structureId: 'struct-1'
        });

      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
    });
  });

  describe('GET /api/html-flow/:chainId/packages', () => {
    it('should list all packages', async () => {
      const structure = StructureManager.createStructure(TEST_CHAIN_ID, 'Test', 'Test', ['export-1']);

      // Create two packages
      await request(app)
        .post(`/api/html-flow/${TEST_CHAIN_ID}/packages`)
        .send({
          name: 'Package 1',
          structureId: structure.structureId
        });

      await request(app)
        .post(`/api/html-flow/${TEST_CHAIN_ID}/packages`)
        .send({
          name: 'Package 2',
          structureId: structure.structureId
        });

      const res = await request(app)
        .get(`/api/html-flow/${TEST_CHAIN_ID}/packages`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.packages).toBeInstanceOf(Array);
      expect(res.body.packages).toHaveLength(2);
    });

    it('should return empty array for chain with no packages', async () => {
      const res = await request(app)
        .get(`/api/html-flow/${TEST_CHAIN_ID}/packages`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.packages).toEqual([]);
    });

    it('should return 400 for invalid chainId', async () => {
      const res = await request(app)
        .get(`/api/html-flow/invalid/packages`);

      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
    });
  });

  describe('GET /api/html-flow/:chainId/packages/:id', () => {
    it('should get a specific package', async () => {
      const structure = StructureManager.createStructure(TEST_CHAIN_ID, 'Test', 'Test', ['export-1']);

      const createRes = await request(app)
        .post(`/api/html-flow/${TEST_CHAIN_ID}/packages`)
        .send({
          name: 'Test Package',
          structureId: structure.structureId
        });

      const packageId = createRes.body.package.packageId;

      const getRes = await request(app)
        .get(`/api/html-flow/${TEST_CHAIN_ID}/packages/${packageId}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.ok).toBe(true);
      expect(getRes.body.package.packageId).toBe(packageId);
      expect(getRes.body.package.name).toBe('Test Package');
    });

    it('should return 404 for nonexistent package', async () => {
      const res = await request(app)
        .get(`/api/html-flow/${TEST_CHAIN_ID}/packages/package-999`);

      expect(res.status).toBe(404);
      expect(res.body.ok).toBe(false);
    });

    it('should return 400 for invalid chainId', async () => {
      const res = await request(app)
        .get(`/api/html-flow/invalid/packages/package-1`);

      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
    });
  });

  describe('PUT /api/html-flow/:chainId/packages/:id', () => {
    it('should update package metadata', async () => {
      const structure = StructureManager.createStructure(TEST_CHAIN_ID, 'Test', 'Test', ['export-1']);

      const createRes = await request(app)
        .post(`/api/html-flow/${TEST_CHAIN_ID}/packages`)
        .send({
          name: 'Test Package',
          structureId: structure.structureId
        });

      const packageId = createRes.body.package.packageId;

      const updateRes = await request(app)
        .put(`/api/html-flow/${TEST_CHAIN_ID}/packages/${packageId}`)
        .send({
          name: 'Updated Package',
          metadata: {
            title: 'New Title',
            author: 'John Doe',
            version: '1.1',
            tags: ['tag1', 'tag2']
          }
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.ok).toBe(true);
      expect(updateRes.body.package.name).toBe('Updated Package');
      expect(updateRes.body.package.metadata.author).toBe('John Doe');
    });

    it('should return 400 for nonexistent package', async () => {
      const res = await request(app)
        .put(`/api/html-flow/${TEST_CHAIN_ID}/packages/package-999`)
        .send({ name: 'Updated' });

      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
    });
  });

  describe('DELETE /api/html-flow/:chainId/packages/:id', () => {
    it('should delete a package', async () => {
      const structure = StructureManager.createStructure(TEST_CHAIN_ID, 'Test', 'Test', ['export-1']);

      const createRes = await request(app)
        .post(`/api/html-flow/${TEST_CHAIN_ID}/packages`)
        .send({
          name: 'Test Package',
          structureId: structure.structureId
        });

      const packageId = createRes.body.package.packageId;

      const deleteRes = await request(app)
        .delete(`/api/html-flow/${TEST_CHAIN_ID}/packages/${packageId}`);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.ok).toBe(true);

      // Verify deletion
      const getRes = await request(app)
        .get(`/api/html-flow/${TEST_CHAIN_ID}/packages/${packageId}`);

      expect(getRes.status).toBe(404);
    });

    it('should return 404 for nonexistent package', async () => {
      const res = await request(app)
        .delete(`/api/html-flow/${TEST_CHAIN_ID}/packages/package-999`);

      expect(res.status).toBe(404);
      expect(res.body.ok).toBe(false);
    });
  });

  describe('GET /api/html-flow/:chainId/packages/:id/validate', () => {
    it('should validate a package', async () => {
      const structure = StructureManager.createStructure(TEST_CHAIN_ID, 'Test', 'Test', ['export-1']);

      const createRes = await request(app)
        .post(`/api/html-flow/${TEST_CHAIN_ID}/packages`)
        .send({
          name: 'Test Package',
          structureId: structure.structureId
        });

      const packageId = createRes.body.package.packageId;

      const validateRes = await request(app)
        .get(`/api/html-flow/${TEST_CHAIN_ID}/packages/${packageId}/validate`);

      expect(validateRes.status).toBe(200);
      expect(validateRes.body.ok).toBe(true);
      expect(validateRes.body.validation).toBeTruthy();
      expect(validateRes.body.validation).toHaveProperty('valid');
      expect(validateRes.body.validation).toHaveProperty('errors');
    });

    it('should return 404 for nonexistent package', async () => {
      const res = await request(app)
        .get(`/api/html-flow/${TEST_CHAIN_ID}/packages/package-999/validate`);

      expect(res.status).toBe(404);
      expect(res.body.ok).toBe(false);
    });
  });

  describe('GET /api/html-flow/:chainId/packages/:id/stats', () => {
    it('should get package statistics', async () => {
      const structure = StructureManager.createStructure(TEST_CHAIN_ID, 'Test', 'Test', ['export-1']);

      const createRes = await request(app)
        .post(`/api/html-flow/${TEST_CHAIN_ID}/packages`)
        .send({
          name: 'Test Package',
          structureId: structure.structureId
        });

      const packageId = createRes.body.package.packageId;

      const statsRes = await request(app)
        .get(`/api/html-flow/${TEST_CHAIN_ID}/packages/${packageId}/stats`);

      expect(statsRes.status).toBe(200);
      expect(statsRes.body.ok).toBe(true);
      expect(statsRes.body.stats).toBeTruthy();
      expect(statsRes.body.stats.packageId).toBe(packageId);
      expect(statsRes.body.stats).toHaveProperty('sizeBytes');
      expect(statsRes.body.stats).toHaveProperty('fileCount');
    });

    it('should return 404 for nonexistent package', async () => {
      const res = await request(app)
        .get(`/api/html-flow/${TEST_CHAIN_ID}/packages/package-999/stats`);

      expect(res.status).toBe(404);
      expect(res.body.ok).toBe(false);
    });
  });

  describe('GET /api/html-flow/:chainId/packages/:id/download', () => {
    it('should return 404 for nonexistent package', async () => {
      const res = await request(app)
        .get(`/api/html-flow/${TEST_CHAIN_ID}/packages/package-999/download`);

      expect(res.status).toBe(404);
      expect(res.body.ok).toBe(false);
    });

    // Note: Full ZIP download test would require more complex setup
    // This is tested implicitly through the integration tests
  });
});
