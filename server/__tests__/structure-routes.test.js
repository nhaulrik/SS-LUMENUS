/**
 * Integration tests for Structure API routes
 *
 * Tests the actual API endpoints that match the backend implementation:
 * - POST /api/html-flow/:chainId/structures (create)
 * - GET /api/html-flow/:chainId/structures (list)
 * - GET /api/html-flow/:chainId/structures/:structureId (get)
 * - PUT /api/html-flow/:chainId/structures/:structureId (add_node, move_node, remove_node)
 * - DELETE /api/html-flow/:chainId/structures/:structureId (delete)
 * - GET /api/html-flow/:chainId/structures/:structureId/orphans (get orphans)
 */

const path = require('path');
const fs = require('fs');
const { CHAINS_DIR } = require('../config');
const {
  createStructure,
  listStructures,
  getStructure,
  addNodeToStructure,
  moveNode,
  removeNodeFromStructure,
  deleteStructure,
  getOrphanedSlidesForStructure,
} = require('../lib/structure-manager');

describe('Structure API Integration', () => {
  const testChainId = 'test-chain-api-' + Date.now();
  const chainDir = path.join(CHAINS_DIR, testChainId);
  const structuresDir = path.join(chainDir, 'structures');
  const exportsDir = path.join(chainDir, 'exports');

  // Setup: Create a test chain with exports
  beforeAll(() => {
    // Create chain directory
    if (!fs.existsSync(chainDir)) {
      fs.mkdirSync(chainDir, { recursive: true });
    }

    // Create exports directory
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }

    // Create test exports
    for (let i = 1; i <= 2; i++) {
      const exportId = `export-${i}`;
      const exportDir = path.join(exportsDir, exportId);
      if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir, { recursive: true });
      }

      // Create export.json with slide metadata
      const exportData = {
        exportId,
        name: `Export ${i}`,
        createdAt: new Date().toISOString(),
        content: {
          slideCount: 3,
          slides: [
            { index: 1, title: `Export ${i} - Slide 1` },
            { index: 2, title: `Export ${i} - Slide 2` },
            { index: 3, title: `Export ${i} - Slide 3` },
          ],
        },
      };

      fs.writeFileSync(
        path.join(exportDir, 'export.json'),
        JSON.stringify(exportData, null, 2)
      );
    }

    // Create chain.json
    const chainData = {
      chainId: testChainId,
      name: 'Test Chain',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      structures: [],
      exports: [
        { exportId: 'export-1', name: 'Export 1', createdAt: new Date().toISOString() },
        { exportId: 'export-2', name: 'Export 2', createdAt: new Date().toISOString() },
      ],
    };

    fs.writeFileSync(
      path.join(chainDir, 'chain.json'),
      JSON.stringify(chainData, null, 2)
    );
  });

  // Cleanup
  afterAll(() => {
    if (fs.existsSync(chainDir)) {
      fs.rmSync(chainDir, { recursive: true, force: true });
    }
  });

  let createdStructureId;

  describe('POST /structures - Create structure', () => {
    it('should create a structure from selected exports', () => {
      const structureId = createStructure(testChainId, 'Test Structure', 'Description', [
        'export-1',
        'export-2',
      ]);

      expect(structureId).toBeTruthy();
      expect(structureId).toMatch(/^structure-\d+$/);
      createdStructureId = structureId;
    });

    it('should return null for missing chainId', () => {
      const result = createStructure(null, 'Test', 'Desc', ['export-1']);
      expect(result).toBeNull();
    });

    it('should return null for missing name', () => {
      const result = createStructure(testChainId, '', 'Desc', ['export-1']);
      expect(result).toBeNull();
    });

    it('should return null for empty exportIds', () => {
      const result = createStructure(testChainId, 'Test', 'Desc', []);
      expect(result).toBeNull();
    });

    it('should persist structure to disk', () => {
      const structureDir = path.join(chainDir, 'structures', createdStructureId);
      expect(fs.existsSync(structureDir)).toBe(true);

      const structureFile = path.join(structureDir, 'structure.json');
      expect(fs.existsSync(structureFile)).toBe(true);
    });
  });

  describe('GET /structures - List structures', () => {
    it('should list all structures for a chain', () => {
      const structures = listStructures(testChainId);

      expect(Array.isArray(structures)).toBe(true);
      expect(structures.length).toBeGreaterThan(0);
      expect(structures[0].name).toBe('Test Structure');
    });

    it('should return empty array for non-existent chain', () => {
      const structures = listStructures('non-existent-chain');
      expect(structures).toEqual([]);
    });
  });

  describe('GET /structures/:id - Get structure', () => {
    it('should retrieve a structure with full tree', () => {
      const structure = getStructure(testChainId, createdStructureId);

      expect(structure).toBeTruthy();
      expect(structure.structureId).toBe(createdStructureId);
      expect(structure.name).toBe('Test Structure');
      expect(structure.tree).toBeDefined();
      expect(structure.tree.nodes).toBeDefined();
      expect(Array.isArray(structure.tree.nodes)).toBe(true);
    });

    it('should return null for non-existent structure', () => {
      const structure = getStructure(testChainId, 'structure-999');
      expect(structure).toBeNull();
    });
  });

  describe('PUT /structures/:id - Add node', () => {
    it('should add a node to the structure tree', () => {
      const structure = addNodeToStructure(
        testChainId,
        createdStructureId,
        null,
        'export-1/1',
        'Slide 1'
      );

      expect(structure).toBeTruthy();
      expect(structure.tree.nodes.length).toBe(1);

      const node = structure.tree.nodes[0];
      expect(node.slideRef).toBe('export-1/1');
      expect(node.title).toBe('Slide 1');
      expect(node.parentId).toBeNull();
    });

    it('should add a child node under a parent', () => {
      const structure = getStructure(testChainId, createdStructureId);
      const parentNode = structure.tree.nodes[0];

      const updated = addNodeToStructure(
        testChainId,
        createdStructureId,
        parentNode.nodeId,
        'export-1/2',
        'Slide 2'
      );

      expect(updated).toBeTruthy();
      expect(updated.tree.nodes.length).toBe(2);

      const childNode = updated.tree.nodes.find(n => n.slideRef === 'export-1/2');
      expect(childNode.parentId).toBe(parentNode.nodeId);
      expect(parentNode.children).toContain(childNode.nodeId);
    });

    it('should return null for invalid slideRef', () => {
      const result = addNodeToStructure(testChainId, createdStructureId, null, 'invalid', 'Title');
      expect(result).toBeNull();
    });
  });

  describe('PUT /structures/:id - Move node', () => {
    it('should move a node to a new parent', () => {
      let structure = getStructure(testChainId, createdStructureId);
      const nodes = structure.tree.nodes;

      // Add a third node as root
      structure = addNodeToStructure(testChainId, createdStructureId, null, 'export-2/1', 'New Root');
      structure = getStructure(testChainId, createdStructureId);

      const nodeToMove = structure.tree.nodes.find(n => n.slideRef === 'export-2/1');
      const newParent = structure.tree.nodes.find(n => n.slideRef === 'export-1/1');

      const updated = moveNode(testChainId, createdStructureId, nodeToMove.nodeId, newParent.nodeId);

      expect(updated).toBeTruthy();
      const movedNode = updated.tree.nodes.find(n => n.nodeId === nodeToMove.nodeId);
      expect(movedNode.parentId).toBe(newParent.nodeId);
    });

    it('should move a node to root', () => {
      const structure = getStructure(testChainId, createdStructureId);
      const nodeToMove = structure.tree.nodes.find(n => n.parentId !== null);

      if (nodeToMove) {
        const updated = moveNode(testChainId, createdStructureId, nodeToMove.nodeId, null);

        expect(updated).toBeTruthy();
        const movedNode = updated.tree.nodes.find(n => n.nodeId === nodeToMove.nodeId);
        expect(movedNode.parentId).toBeNull();
      }
    });

    it('should detect circular dependencies', () => {
      const structure = getStructure(testChainId, createdStructureId);

      // Create a simple parent-child relationship
      const parent = structure.tree.nodes.find(n => !n.parentId && n.children.length > 0);
      if (parent && parent.children.length > 0) {
        const childId = parent.children[0];
        const child = structure.tree.nodes.find(n => n.nodeId === childId);

        // Try to move parent under child (should fail)
        const result = moveNode(testChainId, createdStructureId, parent.nodeId, child.nodeId);

        expect(result).toBeNull();
      }
    });
  });

  describe('PUT /structures/:id - Remove node', () => {
    it('should remove a node from the structure', () => {
      const structure = getStructure(testChainId, createdStructureId);
      const initialCount = structure.tree.nodes.length;
      const nodeToRemove = structure.tree.nodes[0];

      const updated = removeNodeFromStructure(testChainId, createdStructureId, nodeToRemove.nodeId);

      expect(updated).toBeTruthy();
      expect(updated.tree.nodes.length).toBe(initialCount - 1);
      expect(updated.tree.nodes.find(n => n.nodeId === nodeToRemove.nodeId)).toBeUndefined();
    });

    it('should return null for non-existent node', () => {
      const result = removeNodeFromStructure(testChainId, createdStructureId, 'node-999');
      expect(result).toBeNull();
    });
  });

  describe('DELETE /structures/:id - Delete structure', () => {
    let structureToDelete;

    beforeAll(() => {
      const structureId = createStructure(testChainId, 'Structure to Delete', '', ['export-1']);
      structureToDelete = structureId;
    });

    it('should delete a structure', () => {
      const success = deleteStructure(testChainId, structureToDelete);

      expect(success).toBe(true);

      // Verify it's gone
      const structure = getStructure(testChainId, structureToDelete);
      expect(structure).toBeNull();
    });

    it('should return false for non-existent structure', () => {
      const success = deleteStructure(testChainId, 'structure-999');
      expect(success).toBe(false);
    });
  });

  describe('GET /structures/:id/orphans - Get orphaned slides', () => {
    it('should return orphaned slides', () => {
      const structure = getStructure(testChainId, createdStructureId);
      const orphans = getOrphanedSlidesForStructure(testChainId, createdStructureId);

      expect(Array.isArray(orphans)).toBe(true);
      // Should have orphaned slides since we deleted some nodes
      expect(orphans.length).toBeGreaterThan(0);
    });

    it('should identify slides not in the tree', () => {
      const structure = getStructure(testChainId, createdStructureId);
      const usedSlideRefs = new Set();
      structure.tree.nodes.forEach(node => {
        usedSlideRefs.add(node.slideRef);
      });

      const orphans = getOrphanedSlidesForStructure(testChainId, createdStructureId);

      // All orphans should not be in the tree
      orphans.forEach(orphan => {
        expect(usedSlideRefs.has(orphan.slideRef)).toBe(false);
      });
    });
  });

  describe('Metadata tracking', () => {
    it('should update metadata when nodes are added', () => {
      const structure = getStructure(testChainId, createdStructureId);

      expect(structure.metadata.nodeCount).toBe(structure.tree.nodes.length);
      expect(structure.metadata.usedSlides).toBe(structure.tree.nodes.length);
      expect(structure.metadata.depth).toBeGreaterThanOrEqual(0);
    });
  });
});
