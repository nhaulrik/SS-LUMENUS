/**
 * server/__tests__/package-manager.test.js
 *
 * Integration tests for package-manager.js
 * Tests all CRUD operations, package building, and file operations
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as PackageManager from '../lib/package-manager.js';
import * as StructureManager from '../lib/structure-manager.js';
import { CHAINS_DIR } from '../config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_CHAIN_ID = `test-chain-${Date.now()}`;
const TEST_CHAIN_DIR = path.join(CHAINS_DIR, TEST_CHAIN_ID);

// Cleanup helper
function cleanupTestChain() {
  if (fs.existsSync(TEST_CHAIN_DIR)) {
    fs.rmSync(TEST_CHAIN_DIR, { recursive: true, force: true });
  }
}

describe('PackageManager', () => {
  beforeEach(() => {
    cleanupTestChain();
    fs.mkdirSync(TEST_CHAIN_DIR, { recursive: true });
  });

  afterEach(() => {
    cleanupTestChain();
  });

  describe('createPackage', () => {
    it('should create a new package', () => {
      // Create a structure first
      const structure = StructureManager.createStructure(TEST_CHAIN_ID, 'Test Structure', 'A test structure', ['export-1']);
      expect(structure).toBeTruthy();

      // Create a package
      const pkg = PackageManager.createPackage(TEST_CHAIN_ID, 'Test Package', 'A test package', structure.structureId);
      expect(pkg).toBeTruthy();
      expect(pkg.packageId).toMatch(/^package-\d+$/);
      expect(pkg.name).toBe('Test Package');
      expect(pkg.description).toBe('A test package');
      expect(pkg.status).toBe('draft');
      expect(pkg.metadata.version).toBe('1.0');
    });

    it('should return null for invalid chainId', () => {
      const pkg = PackageManager.createPackage('invalid', 'Test', 'Test', 'struct-1');
      expect(pkg).toBeNull();
    });

    it('should return null if structure does not exist', () => {
      const pkg = PackageManager.createPackage(TEST_CHAIN_ID, 'Test', 'Test', 'nonexistent');
      expect(pkg).toBeNull();
    });

    it('should return null if name is missing', () => {
      const structure = StructureManager.createStructure(TEST_CHAIN_ID, 'Test', 'Test', ['export-1']);
      const pkg = PackageManager.createPackage(TEST_CHAIN_ID, '', 'Desc', structure.structureId);
      expect(pkg).toBeNull();
    });
  });

  describe('listPackages', () => {
    it('should return empty array for chain with no packages', () => {
      const packages = PackageManager.listPackages(TEST_CHAIN_ID);
      expect(packages).toEqual([]);
    });

    it('should list all packages for a chain', () => {
      const structure = StructureManager.createStructure(TEST_CHAIN_ID, 'Test', 'Test', ['export-1']);
      
      const pkg1 = PackageManager.createPackage(TEST_CHAIN_ID, 'Package 1', 'Desc 1', structure.structureId);
      const pkg2 = PackageManager.createPackage(TEST_CHAIN_ID, 'Package 2', 'Desc 2', structure.structureId);

      const packages = PackageManager.listPackages(TEST_CHAIN_ID);
      expect(packages).toHaveLength(2);
      expect(packages.map(p => p.packageId)).toEqual([pkg1.packageId, pkg2.packageId]);
    });

    it('should return empty array for invalid chainId', () => {
      const packages = PackageManager.listPackages('invalid');
      expect(packages).toEqual([]);
    });
  });

  describe('getPackage', () => {
    it('should retrieve a package by ID', () => {
      const structure = StructureManager.createStructure(TEST_CHAIN_ID, 'Test', 'Test', ['export-1']);
      const created = PackageManager.createPackage(TEST_CHAIN_ID, 'Test Package', 'Desc', structure.structureId);

      const retrieved = PackageManager.getPackage(TEST_CHAIN_ID, created.packageId);
      expect(retrieved).toBeTruthy();
      expect(retrieved.packageId).toBe(created.packageId);
      expect(retrieved.name).toBe('Test Package');
    });

    it('should return null for nonexistent package', () => {
      const pkg = PackageManager.getPackage(TEST_CHAIN_ID, 'package-999');
      expect(pkg).toBeNull();
    });

    it('should return null for invalid chainId', () => {
      const pkg = PackageManager.getPackage('invalid', 'package-1');
      expect(pkg).toBeNull();
    });
  });

  describe('updatePackage', () => {
    it('should update package metadata', () => {
      const structure = StructureManager.createStructure(TEST_CHAIN_ID, 'Test', 'Test', ['export-1']);
      const pkg = PackageManager.createPackage(TEST_CHAIN_ID, 'Test', 'Desc', structure.structureId);

      const updated = PackageManager.updatePackage(TEST_CHAIN_ID, pkg.packageId, {
        name: 'Updated Name',
        metadata: {
          title: 'New Title',
          author: 'John Doe',
          version: '1.1',
          tags: ['tag1', 'tag2']
        }
      });

      expect(updated).toBeTruthy();
      expect(updated.name).toBe('Updated Name');
      expect(updated.metadata.title).toBe('New Title');
      expect(updated.metadata.author).toBe('John Doe');
      expect(updated.metadata.version).toBe('1.1');
    });

    it('should not allow changing packageId', () => {
      const structure = StructureManager.createStructure(TEST_CHAIN_ID, 'Test', 'Test', ['export-1']);
      const pkg = PackageManager.createPackage(TEST_CHAIN_ID, 'Test', 'Desc', structure.structureId);

      const updated = PackageManager.updatePackage(TEST_CHAIN_ID, pkg.packageId, {
        packageId: 'package-999'
      });

      expect(updated.packageId).toBe(pkg.packageId);
    });

    it('should return null for nonexistent package', () => {
      const updated = PackageManager.updatePackage(TEST_CHAIN_ID, 'package-999', { name: 'New' });
      expect(updated).toBeNull();
    });
  });

  describe('deletePackage', () => {
    it('should delete a package', () => {
      const structure = StructureManager.createStructure(TEST_CHAIN_ID, 'Test', 'Test', ['export-1']);
      const pkg = PackageManager.createPackage(TEST_CHAIN_ID, 'Test', 'Desc', structure.structureId);

      const success = PackageManager.deletePackage(TEST_CHAIN_ID, pkg.packageId);
      expect(success).toBe(true);

      const retrieved = PackageManager.getPackage(TEST_CHAIN_ID, pkg.packageId);
      expect(retrieved).toBeNull();
    });

    it('should return false for nonexistent package', () => {
      const success = PackageManager.deletePackage(TEST_CHAIN_ID, 'package-999');
      expect(success).toBe(false);
    });

    it('should return false for invalid chainId', () => {
      const success = PackageManager.deletePackage('invalid', 'package-1');
      expect(success).toBe(false);
    });
  });

  describe('buildPackageStructure', () => {
    it('should build package directory structure', () => {
      const structure = StructureManager.createStructure(TEST_CHAIN_ID, 'Test', 'Test', ['export-1']);
      const node1 = StructureManager.addNodeToStructure(TEST_CHAIN_ID, structure.structureId, null, 'export-1/0', 'Introduction');
      const node2 = StructureManager.addNodeToStructure(TEST_CHAIN_ID, structure.structureId, null, 'export-1/1', 'Content');

      const pkg = PackageManager.createPackage(TEST_CHAIN_ID, 'Test', 'Desc', structure.structureId);
      const success = PackageManager.buildPackageStructure(TEST_CHAIN_ID, pkg.packageId);

      expect(success).toBe(true);

      const packageDir = path.join(TEST_CHAIN_DIR, 'packages', pkg.packageId);
      const slidesDir = path.join(packageDir, 'slides');
      expect(fs.existsSync(slidesDir)).toBe(true);
    });

    it('should return false for nonexistent package', () => {
      const success = PackageManager.buildPackageStructure(TEST_CHAIN_ID, 'package-999');
      expect(success).toBe(false);
    });

    it('should return false for nonexistent structure', () => {
      const pkg = PackageManager.createPackage(TEST_CHAIN_ID, 'Test', 'Desc', 'nonexistent');
      expect(pkg).toBeNull();
    });
  });

  describe('generateManifest', () => {
    it('should generate manifest.json', () => {
      const structure = StructureManager.createStructure(TEST_CHAIN_ID, 'Test', 'Test', ['export-1']);
      const node1 = StructureManager.addNodeToStructure(TEST_CHAIN_ID, structure.structureId, null, 'export-1/0', 'Introduction');

      const pkg = PackageManager.createPackage(TEST_CHAIN_ID, 'Test', 'Desc', structure.structureId);
      PackageManager.buildPackageStructure(TEST_CHAIN_ID, pkg.packageId);
      const manifest = PackageManager.generateManifest(TEST_CHAIN_ID, pkg.packageId);

      expect(manifest).toBeTruthy();
      expect(manifest.packageId).toBe(pkg.packageId);
      expect(manifest.name).toBe('Test');
      expect(manifest.structure).toBeTruthy();
      expect(manifest.structure.rootNodes).toBeInstanceOf(Array);

      // Verify manifest file was created
      const packageDir = path.join(TEST_CHAIN_DIR, 'packages', pkg.packageId);
      const manifestFile = path.join(packageDir, 'MANIFEST.json');
      expect(fs.existsSync(manifestFile)).toBe(true);
    });

    it('should return null for nonexistent package', () => {
      const manifest = PackageManager.generateManifest(TEST_CHAIN_ID, 'package-999');
      expect(manifest).toBeNull();
    });
  });

  describe('generateReadme', () => {
    it('should generate README.md', () => {
      const structure = StructureManager.createStructure(TEST_CHAIN_ID, 'Test', 'Test', ['export-1']);
      const node1 = StructureManager.addNodeToStructure(TEST_CHAIN_ID, structure.structureId, null, 'export-1/0', 'Introduction');

      const pkg = PackageManager.createPackage(TEST_CHAIN_ID, 'Test Package', 'A test package', structure.structureId);
      PackageManager.buildPackageStructure(TEST_CHAIN_ID, pkg.packageId);
      const readme = PackageManager.generateReadme(TEST_CHAIN_ID, pkg.packageId, 'Test Title', 'Test Description');

      expect(readme).toBeTruthy();
      expect(readme).toContain('Test Title');
      expect(readme).toContain('Test Description');
      expect(readme).toContain('Table of Contents');

      // Verify README file was created
      const packageDir = path.join(TEST_CHAIN_DIR, 'packages', pkg.packageId);
      const readmeFile = path.join(packageDir, 'README.md');
      expect(fs.existsSync(readmeFile)).toBe(true);
    });

    it('should return null for nonexistent package', () => {
      const readme = PackageManager.generateReadme(TEST_CHAIN_ID, 'package-999', 'Title', 'Desc');
      expect(readme).toBeNull();
    });
  });

  describe('getPackageFiles', () => {
    it('should list package files', () => {
      const structure = StructureManager.createStructure(TEST_CHAIN_ID, 'Test', 'Test', ['export-1']);
      const node1 = StructureManager.addNodeToStructure(TEST_CHAIN_ID, structure.structureId, null, 'export-1/0', 'Introduction');

      const pkg = PackageManager.createPackage(TEST_CHAIN_ID, 'Test', 'Desc', structure.structureId);
      PackageManager.buildPackageStructure(TEST_CHAIN_ID, pkg.packageId);
      PackageManager.generateManifest(TEST_CHAIN_ID, pkg.packageId);
      PackageManager.generateReadme(TEST_CHAIN_ID, pkg.packageId, 'Title', 'Desc');

      const files = PackageManager.getPackageFiles(TEST_CHAIN_ID, pkg.packageId);
      expect(files).toBeInstanceOf(Array);
      expect(files.length).toBeGreaterThan(0);
      
      // Should include package.json, MANIFEST.json, README.md
      const fileNames = files.map(f => f.path);
      expect(fileNames).toContain('package.json');
      expect(fileNames.some(f => f.includes('MANIFEST.json'))).toBe(true);
      expect(fileNames.some(f => f.includes('README.md'))).toBe(true);
    });

    it('should return empty array for nonexistent package', () => {
      const files = PackageManager.getPackageFiles(TEST_CHAIN_ID, 'package-999');
      expect(files).toEqual([]);
    });
  });

  describe('validatePackage', () => {
    it('should validate a complete package', () => {
      const structure = StructureManager.createStructure(TEST_CHAIN_ID, 'Test', 'Test', ['export-1']);
      const node1 = StructureManager.addNodeToStructure(TEST_CHAIN_ID, structure.structureId, null, 'export-1/0', 'Introduction');

      const pkg = PackageManager.createPackage(TEST_CHAIN_ID, 'Test', 'Desc', structure.structureId);
      PackageManager.buildPackageStructure(TEST_CHAIN_ID, pkg.packageId);
      PackageManager.generateManifest(TEST_CHAIN_ID, pkg.packageId);
      PackageManager.generateReadme(TEST_CHAIN_ID, pkg.packageId, 'Title', 'Desc');

      const validation = PackageManager.validatePackage(TEST_CHAIN_ID, pkg.packageId);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toEqual([]);
    });

    it('should detect missing manifest', () => {
      const structure = StructureManager.createStructure(TEST_CHAIN_ID, 'Test', 'Test', ['export-1']);
      const pkg = PackageManager.createPackage(TEST_CHAIN_ID, 'Test', 'Desc', structure.structureId);
      PackageManager.buildPackageStructure(TEST_CHAIN_ID, pkg.packageId);
      PackageManager.generateReadme(TEST_CHAIN_ID, pkg.packageId, 'Title', 'Desc');

      const validation = PackageManager.validatePackage(TEST_CHAIN_ID, pkg.packageId);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Manifest file is missing');
    });

    it('should return invalid for nonexistent package', () => {
      const validation = PackageManager.validatePackage(TEST_CHAIN_ID, 'package-999');
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Package not found');
    });
  });

  describe('calculatePackageSize', () => {
    it('should calculate package size', () => {
      const structure = StructureManager.createStructure(TEST_CHAIN_ID, 'Test', 'Test', ['export-1']);
      const node1 = StructureManager.addNodeToStructure(TEST_CHAIN_ID, structure.structureId, null, 'export-1/0', 'Introduction');

      const pkg = PackageManager.createPackage(TEST_CHAIN_ID, 'Test', 'Desc', structure.structureId);
      PackageManager.buildPackageStructure(TEST_CHAIN_ID, pkg.packageId);

      const size = PackageManager.calculatePackageSize(TEST_CHAIN_ID, pkg.packageId);
      expect(size).toBeGreaterThan(0);
      expect(typeof size).toBe('number');
    });

    it('should return 0 for nonexistent package', () => {
      const size = PackageManager.calculatePackageSize(TEST_CHAIN_ID, 'package-999');
      expect(size).toBe(0);
    });
  });

  describe('getPackageStats', () => {
    it('should return comprehensive package statistics', () => {
      const structure = StructureManager.createStructure(TEST_CHAIN_ID, 'Test', 'Test', ['export-1']);
      const node1 = StructureManager.addNodeToStructure(TEST_CHAIN_ID, structure.structureId, null, 'export-1/0', 'Introduction');
      const node2 = StructureManager.addNodeToStructure(TEST_CHAIN_ID, structure.structureId, node1.nodeId, 'export-1/1', 'Subsection');

      const pkg = PackageManager.createPackage(TEST_CHAIN_ID, 'Test Package', 'Desc', structure.structureId);
      PackageManager.buildPackageStructure(TEST_CHAIN_ID, pkg.packageId);

      const stats = PackageManager.getPackageStats(TEST_CHAIN_ID, pkg.packageId);
      expect(stats).toBeTruthy();
      expect(stats.packageId).toBe(pkg.packageId);
      expect(stats.name).toBe('Test Package');
      expect(stats.sizeBytes).toBeGreaterThan(0);
      expect(stats.sizeFormatted).toBeTruthy();
      expect(stats.fileCount).toBeGreaterThan(0);
      expect(stats.totalSlides).toBeGreaterThan(0);
      expect(stats.treeDepth).toBeGreaterThan(0);
    });

    it('should return null for nonexistent package', () => {
      const stats = PackageManager.getPackageStats(TEST_CHAIN_ID, 'package-999');
      expect(stats).toBeNull();
    });
  });

  describe('Integration: Full workflow', () => {
    it('should complete full package creation workflow', () => {
      // Create structure
      const structure = StructureManager.createStructure(TEST_CHAIN_ID, 'Executive Summary', 'For executive review', ['export-1']);
      
      // Add nodes
      const intro = StructureManager.addNodeToStructure(TEST_CHAIN_ID, structure.structureId, null, 'export-1/0', 'Introduction');
      const content = StructureManager.addNodeToStructure(TEST_CHAIN_ID, structure.structureId, null, 'export-1/1', 'Content');
      const subsection = StructureManager.addNodeToStructure(TEST_CHAIN_ID, structure.structureId, content.nodeId, 'export-1/2', 'Key Points');

      // Create package
      const pkg = PackageManager.createPackage(TEST_CHAIN_ID, 'Executive Summary Package', 'Organized slides for executive presentation', structure.structureId);
      expect(pkg).toBeTruthy();

      // Build structure
      const buildSuccess = PackageManager.buildPackageStructure(TEST_CHAIN_ID, pkg.packageId);
      expect(buildSuccess).toBe(true);

      // Generate manifest
      const manifest = PackageManager.generateManifest(TEST_CHAIN_ID, pkg.packageId);
      expect(manifest).toBeTruthy();

      // Generate README
      const readme = PackageManager.generateReadme(TEST_CHAIN_ID, pkg.packageId, 'Executive Summary', 'Organized slides for executive presentation');
      expect(readme).toBeTruthy();

      // Update metadata
      const updated = PackageManager.updatePackage(TEST_CHAIN_ID, pkg.packageId, {
        metadata: {
          title: 'Executive Summary',
          author: 'Finance Team',
          version: '1.0',
          tags: ['executive', 'q1-2026']
        }
      });
      expect(updated).toBeTruthy();

      // Get files
      const files = PackageManager.getPackageFiles(TEST_CHAIN_ID, pkg.packageId);
      expect(files.length).toBeGreaterThan(0);

      // Validate
      const validation = PackageManager.validatePackage(TEST_CHAIN_ID, pkg.packageId);
      expect(validation.valid).toBe(true);

      // Get stats
      const stats = PackageManager.getPackageStats(TEST_CHAIN_ID, pkg.packageId);
      expect(stats).toBeTruthy();
      expect(stats.totalSlides).toBeGreaterThan(0);

      // List packages
      const packages = PackageManager.listPackages(TEST_CHAIN_ID);
      expect(packages).toContainEqual(expect.objectContaining({ packageId: pkg.packageId }));

      // Delete
      const deleteSuccess = PackageManager.deletePackage(TEST_CHAIN_ID, pkg.packageId);
      expect(deleteSuccess).toBe(true);

      // Verify deletion
      const deleted = PackageManager.getPackage(TEST_CHAIN_ID, pkg.packageId);
      expect(deleted).toBeNull();
    });
  });
});
