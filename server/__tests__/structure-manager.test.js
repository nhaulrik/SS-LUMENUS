/**
 * Tests for structure-manager.js
 *
 * Tests core tree operations:
 * - Create/read/update/delete structures
 * - Add/move/remove nodes
 * - Circular dependency detection
 * - Orphan slide tracking
 * - Tree validation
 */

const path = require('path');
const fs = require('fs');
const structureManager = require('../lib/structure-manager');
const { CHAINS_DIR } = require('../config');

describe('structure-manager', () => {
  const testChainId = 'test-chain-' + Date.now();
  const chainDir = path.join(CHAINS_DIR, testChainId);
  const structuresDir = path.join(chainDir, 'structures');

  // Setup
  beforeAll(() => {
    if (!fs.existsSync(chainDir)) {
      fs.mkdirSync(chainDir, { recursive: true });
    }
    if (!fs.existsSync(structuresDir)) {
      fs.mkdirSync(structuresDir, { recursive: true });
    }
  });

  // Cleanup
  afterAll(() => {
    if (fs.existsSync(chainDir)) {
      fs.rmSync(chainDir, { recursive: true, force: true });
    }
  });

  describe('createStructure', () => {
    it('should create a new structure with root nodes', () => {
      const result = structureManager.createStructure(
        testChainId,
        'Test Structure',
        ['slide-1', 'slide-2', 'slide-3']
      );

      expect(result.ok).toBe(true);
      expect(result.structure.name).toBe('Test Structure');
      expect(result.structure.nodes).toHaveLength(3);
      expect(result.structure.nodes[0].data.slideId).toBe('slide-1');
      expect(result.structure.nodes[0].parentId).toBeNull();
    });

    it('should create structure with unique node IDs', () => {
      const result = structureManager.createStructure(
        testChainId,
        'Test Structure 2',
        ['slide-1', 'slide-2']
      );

      const nodeIds = result.structure.nodes.map(n => n.id);
      expect(new Set(nodeIds).size).toBe(nodeIds.length); // All unique
    });

    it('should persist structure to disk', () => {
      const result = structureManager.createStructure(
        testChainId,
        'Persisted Structure',
        ['slide-1']
      );

      const filePath = path.join(structuresDir, `${result.structure.id}.json`);
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it('should reject invalid structure name', () => {
      const result = structureManager.createStructure(
        testChainId,
        '',
        ['slide-1']
      );

      expect(result.ok).toBe(false);
      expect(result.error).toContain('name');
    });

    it('should reject invalid slide IDs', () => {
      const result = structureManager.createStructure(
        testChainId,
        'Test',
        ['../../../etc/passwd']
      );

      expect(result.ok).toBe(false);
      expect(result.error).toContain('path');
    });
  });

  describe('listStructures', () => {
    it('should list all structures for a chain', () => {
      structureManager.createStructure(testChainId, 'Structure A', ['slide-1']);
      structureManager.createStructure(testChainId, 'Structure B', ['slide-2']);

      const result = structureManager.listStructures(testChainId);

      expect(result.ok).toBe(true);
      expect(result.structures.length).toBeGreaterThanOrEqual(2);
      expect(result.structures.some(s => s.name === 'Structure A')).toBe(true);
      expect(result.structures.some(s => s.name === 'Structure B')).toBe(true);
    });

    it('should return empty list for chain with no structures', () => {
      const newChainId = 'test-chain-empty-' + Date.now();
      const result = structureManager.listStructures(newChainId);

      expect(result.ok).toBe(true);
      expect(result.structures).toEqual([]);
    });
  });

  describe('getStructure', () => {
    it('should retrieve a structure by ID', () => {
      const created = structureManager.createStructure(
        testChainId,
        'Get Test',
        ['slide-1']
      );

      const result = structureManager.getStructure(testChainId, created.structure.id);

      expect(result.ok).toBe(true);
      expect(result.structure.name).toBe('Get Test');
      expect(result.structure.id).toBe(created.structure.id);
    });

    it('should fail for non-existent structure', () => {
      const result = structureManager.getStructure(testChainId, 'non-existent');

      expect(result.ok).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should prevent path traversal attacks', () => {
      const result = structureManager.getStructure(testChainId, '../../../etc/passwd');

      expect(result.ok).toBe(false);
      expect(result.error).toContain('path');
    });
  });

  describe('addNodeToStructure', () => {
    it('should add a node as root', () => {
      const created = structureManager.createStructure(
        testChainId,
        'Add Node Test',
        ['slide-1']
      );

      const result = structureManager.addNodeToStructure(
        testChainId,
        created.structure.id,
        'slide-2',
        null,
        { slideId: 'slide-2', name: 'Slide 2', type: 'content' }
      );

      expect(result.ok).toBe(true);
      expect(result.structure.nodes).toHaveLength(2);
      expect(result.structure.nodes.some(n => n.data.slideId === 'slide-2')).toBe(true);
    });

    it('should add a node as child', () => {
      const created = structureManager.createStructure(
        testChainId,
        'Parent Child Test',
        ['slide-1', 'slide-2']
      );

      const parentNode = created.structure.nodes[0];

      const result = structureManager.addNodeToStructure(
        testChainId,
        created.structure.id,
        'slide-3',
        parentNode.id,
        { slideId: 'slide-3', name: 'Slide 3', type: 'content' }
      );

      expect(result.ok).toBe(true);
      const childNode = result.structure.nodes.find(n => n.data.slideId === 'slide-3');
      expect(childNode.parentId).toBe(parentNode.id);
    });

    it('should reject invalid parent node', () => {
      const created = structureManager.createStructure(
        testChainId,
        'Invalid Parent Test',
        ['slide-1']
      );

      const result = structureManager.addNodeToStructure(
        testChainId,
        created.structure.id,
        'slide-2',
        'non-existent-parent',
        { slideId: 'slide-2', name: 'Slide 2' }
      );

      expect(result.ok).toBe(false);
      expect(result.error).toContain('parent');
    });
  });

  describe('moveNode', () => {
    it('should move node to new parent', () => {
      const created = structureManager.createStructure(
        testChainId,
        'Move Test',
        ['slide-1', 'slide-2', 'slide-3']
      );

      const nodes = created.structure.nodes;
      const nodeToMove = nodes[0];
      const newParent = nodes[1];

      const result = structureManager.moveNode(
        testChainId,
        created.structure.id,
        nodeToMove.id,
        newParent.id
      );

      expect(result.ok).toBe(true);
      const movedNode = result.structure.nodes.find(n => n.id === nodeToMove.id);
      expect(movedNode.parentId).toBe(newParent.id);
    });

    it('should move node to root', () => {
      const created = structureManager.createStructure(
        testChainId,
        'Move to Root Test',
        ['slide-1', 'slide-2']
      );

      const nodes = created.structure.nodes;
      const parent = nodes[0];

      // Add child
      const withChild = structureManager.addNodeToStructure(
        testChainId,
        created.structure.id,
        'slide-3',
        parent.id,
        { slideId: 'slide-3', name: 'Slide 3' }
      );

      const childNode = withChild.structure.nodes.find(n => n.data.slideId === 'slide-3');

      // Move to root
      const result = structureManager.moveNode(
        testChainId,
        created.structure.id,
        childNode.id,
        null
      );

      expect(result.ok).toBe(true);
      const movedNode = result.structure.nodes.find(n => n.id === childNode.id);
      expect(movedNode.parentId).toBeNull();
    });

    it('should detect circular dependencies', () => {
      const created = structureManager.createStructure(
        testChainId,
        'Circular Dep Test',
        ['slide-1', 'slide-2']
      );

      const nodes = created.structure.nodes;
      const parent = nodes[0];
      const child = nodes[1];

      // Add grandchild
      const withGrandchild = structureManager.addNodeToStructure(
        testChainId,
        created.structure.id,
        'slide-3',
        child.id,
        { slideId: 'slide-3', name: 'Slide 3' }
      );

      // Try to move parent under grandchild (would create cycle)
      const result = structureManager.moveNode(
        testChainId,
        created.structure.id,
        parent.id,
        child.id
      );

      expect(result.ok).toBe(false);
      expect(result.error).toContain('circular');
    });
  });

  describe('removeNodeFromStructure', () => {
    it('should remove a node', () => {
      const created = structureManager.createStructure(
        testChainId,
        'Remove Test',
        ['slide-1', 'slide-2']
      );

      const nodeToRemove = created.structure.nodes[0];

      const result = structureManager.removeNodeFromStructure(
        testChainId,
        created.structure.id,
        nodeToRemove.id
      );

      expect(result.ok).toBe(true);
      expect(result.structure.nodes.some(n => n.id === nodeToRemove.id)).toBe(false);
    });

    it('should orphan child nodes when parent is removed', () => {
      const created = structureManager.createStructure(
        testChainId,
        'Orphan Test',
        ['slide-1', 'slide-2']
      );

      const parent = created.structure.nodes[0];

      // Add child
      const withChild = structureManager.addNodeToStructure(
        testChainId,
        created.structure.id,
        'slide-3',
        parent.id,
        { slideId: 'slide-3', name: 'Slide 3' }
      );

      // Remove parent
      const result = structureManager.removeNodeFromStructure(
        testChainId,
        created.structure.id,
        parent.id
      );

      expect(result.ok).toBe(true);
      const orphanedChild = result.structure.nodes.find(n => n.data.slideId === 'slide-3');
      expect(orphanedChild.parentId).toBeNull();
    });

    it('should reject removing non-existent node', () => {
      const created = structureManager.createStructure(
        testChainId,
        'Remove Non-Existent Test',
        ['slide-1']
      );

      const result = structureManager.removeNodeFromStructure(
        testChainId,
        created.structure.id,
        'non-existent'
      );

      expect(result.ok).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('deleteStructure', () => {
    it('should delete a structure', () => {
      const created = structureManager.createStructure(
        testChainId,
        'Delete Test',
        ['slide-1']
      );

      const result = structureManager.deleteStructure(testChainId, created.structure.id);

      expect(result.ok).toBe(true);

      // Verify it's gone
      const getResult = structureManager.getStructure(testChainId, created.structure.id);
      expect(getResult.ok).toBe(false);
    });
  });

  describe('validateStructure', () => {
    it('should validate a valid structure', () => {
      const created = structureManager.createStructure(
        testChainId,
        'Valid Structure',
        ['slide-1', 'slide-2']
      );

      const result = structureManager.validateStructure(
        testChainId,
        created.structure.id
      );

      expect(result.ok).toBe(true);
      expect(result.isValid).toBe(true);
    });

    it('should detect orphaned slides', () => {
      const created = structureManager.createStructure(
        testChainId,
        'Orphan Detection Test',
        ['slide-1', 'slide-2']
      );

      const parent = created.structure.nodes[0];

      // Add child
      const withChild = structureManager.addNodeToStructure(
        testChainId,
        created.structure.id,
        'slide-3',
        parent.id,
        { slideId: 'slide-3', name: 'Slide 3' }
      );

      // Remove parent to orphan the child
      structureManager.removeNodeFromStructure(
        testChainId,
        created.structure.id,
        parent.id
      );

      const result = structureManager.validateStructure(
        testChainId,
        created.structure.id
      );

      expect(result.ok).toBe(true);
      expect(result.orphanedSlides.length).toBeGreaterThan(0);
    });
  });

  describe('getOrphanedSlides', () => {
    it('should return orphaned slides', () => {
      const created = structureManager.createStructure(
        testChainId,
        'Get Orphans Test',
        ['slide-1', 'slide-2']
      );

      const parent = created.structure.nodes[0];

      // Add child and remove parent to orphan it
      const withChild = structureManager.addNodeToStructure(
        testChainId,
        created.structure.id,
        'slide-3',
        parent.id,
        { slideId: 'slide-3', name: 'Slide 3' }
      );

      structureManager.removeNodeFromStructure(
        testChainId,
        created.structure.id,
        parent.id
      );

      const result = structureManager.getOrphanedSlides(
        testChainId,
        created.structure.id
      );

      expect(result.ok).toBe(true);
      expect(result.orphans.length).toBeGreaterThan(0);
    });
  });

  describe('getTreeVisualization', () => {
    it('should generate tree visualization', () => {
      const created = structureManager.createStructure(
        testChainId,
        'Tree Viz Test',
        ['slide-1', 'slide-2']
      );

      const parent = created.structure.nodes[0];

      // Add child
      const withChild = structureManager.addNodeToStructure(
        testChainId,
        created.structure.id,
        'slide-3',
        parent.id,
        { slideId: 'slide-3', name: 'Slide 3' }
      );

      const result = structureManager.getTreeVisualization(
        testChainId,
        created.structure.id
      );

      expect(result.ok).toBe(true);
      expect(typeof result.visualization).toBe('string');
      expect(result.visualization.length).toBeGreaterThan(0);
    });
  });

  describe('calculateDepth', () => {
    it('should calculate correct tree depth', () => {
      const created = structureManager.createStructure(
        testChainId,
        'Depth Test',
        ['slide-1']
      );

      const parent = created.structure.nodes[0];

      // Add child
      const withChild = structureManager.addNodeToStructure(
        testChainId,
        created.structure.id,
        'slide-2',
        parent.id,
        { slideId: 'slide-2', name: 'Slide 2' }
      );

      const child = withChild.structure.nodes.find(n => n.data.slideId === 'slide-2');

      // Add grandchild
      const withGrandchild = structureManager.addNodeToStructure(
        testChainId,
        created.structure.id,
        'slide-3',
        child.id,
        { slideId: 'slide-3', name: 'Slide 3' }
      );

      const depth = structureManager.calculateDepth(withGrandchild.structure);

      expect(depth).toBe(3); // root -> child -> grandchild
    });
  });
});
