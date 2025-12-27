/**
 * Tests for Layout Engine
 * Requirements: 8.1, 8.2, 8.3 - Automatic layout and manual position preservation
 */

import {
  getLayoutedElements,
  getLayoutedElementsWithManualPreservation,
  layoutDescendants,
  getDescendantIds,
  nodesOverlap,
  hasOverlappingNodes,
  getNodesBoundingBox,
  NODE_WIDTH,
  NODE_HEIGHT,
} from '../lib/layout';
import { MindNode, Edge, deriveEdgesFromNodes } from '../types';

// Helper to create a test node
function createTestNode(
  id: string,
  parentId: string | null = null,
  position: { x: number; y: number } = { x: 0, y: 0 }
): MindNode {
  return {
    id,
    workspaceId: 'test-workspace',
    parentId,
    type: parentId === null ? 'root' : 'user',
    data: {
      label: `Node ${id}`,
      contextContent: `Content for ${id}`,
    },
    position,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('Layout Engine', () => {
  describe('getLayoutedElements', () => {
    it('should handle empty input', () => {
      const result = getLayoutedElements([], []);
      expect(result.nodes).toEqual([]);
      expect(result.edges).toEqual([]);
    });

    it('should layout a single node', () => {
      const nodes = [createTestNode('root')];
      const edges: Edge[] = [];

      const result = getLayoutedElements(nodes, edges);

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].position).toBeDefined();
      expect(typeof result.nodes[0].position.x).toBe('number');
      expect(typeof result.nodes[0].position.y).toBe('number');
    });

    it('should layout a simple tree (root with two children)', () => {
      const nodes = [
        createTestNode('root'),
        createTestNode('child1', 'root'),
        createTestNode('child2', 'root'),
      ];
      const edges = deriveEdgesFromNodes(nodes);

      const result = getLayoutedElements(nodes, edges);

      expect(result.nodes).toHaveLength(3);
      
      // Children should be positioned to the right of root (LR direction)
      const root = result.nodes.find(n => n.id === 'root')!;
      const child1 = result.nodes.find(n => n.id === 'child1')!;
      const child2 = result.nodes.find(n => n.id === 'child2')!;

      expect(child1.position.x).toBeGreaterThan(root.position.x);
      expect(child2.position.x).toBeGreaterThan(root.position.x);
    });

    it('should respect layout direction', () => {
      const nodes = [
        createTestNode('root'),
        createTestNode('child', 'root'),
      ];
      const edges = deriveEdgesFromNodes(nodes);

      // Test LR (left-to-right)
      const lrResult = getLayoutedElements(nodes, edges, { direction: 'LR' });
      const lrRoot = lrResult.nodes.find(n => n.id === 'root')!;
      const lrChild = lrResult.nodes.find(n => n.id === 'child')!;
      expect(lrChild.position.x).toBeGreaterThan(lrRoot.position.x);

      // Test TB (top-to-bottom)
      const tbResult = getLayoutedElements(nodes, edges, { direction: 'TB' });
      const tbRoot = tbResult.nodes.find(n => n.id === 'root')!;
      const tbChild = tbResult.nodes.find(n => n.id === 'child')!;
      expect(tbChild.position.y).toBeGreaterThan(tbRoot.position.y);
    });

    it('should preserve manually positioned nodes', () => {
      const manualPosition = { x: 500, y: 500 };
      const nodes = [
        createTestNode('root'),
        createTestNode('child', 'root', manualPosition),
      ];
      const edges = deriveEdgesFromNodes(nodes);

      const result = getLayoutedElements(nodes, edges, {
        manuallyPositionedNodes: new Set(['child']),
      });

      const child = result.nodes.find(n => n.id === 'child')!;
      expect(child.position.x).toBe(manualPosition.x);
      expect(child.position.y).toBe(manualPosition.y);
    });
  });

  describe('getLayoutedElementsWithManualPreservation', () => {
    it('should preserve manually positioned nodes', () => {
      const manualPosition = { x: 1000, y: 1000 };
      const nodes = [
        createTestNode('root'),
        createTestNode('child', 'root', manualPosition),
      ];
      const edges = deriveEdgesFromNodes(nodes);

      const result = getLayoutedElementsWithManualPreservation(
        nodes,
        edges,
        new Set(['child'])
      );

      const child = result.nodes.find(n => n.id === 'child')!;
      expect(child.position.x).toBe(manualPosition.x);
      expect(child.position.y).toBe(manualPosition.y);
    });
  });

  describe('getDescendantIds', () => {
    it('should return empty set for leaf node', () => {
      const nodes = [
        createTestNode('root'),
        createTestNode('child', 'root'),
      ];

      const descendants = getDescendantIds('child', nodes);
      expect(descendants.size).toBe(0);
    });

    it('should return all descendants', () => {
      const nodes = [
        createTestNode('root'),
        createTestNode('child1', 'root'),
        createTestNode('child2', 'root'),
        createTestNode('grandchild1', 'child1'),
        createTestNode('grandchild2', 'child1'),
      ];

      const descendants = getDescendantIds('root', nodes);
      expect(descendants.size).toBe(4);
      expect(descendants.has('child1')).toBe(true);
      expect(descendants.has('child2')).toBe(true);
      expect(descendants.has('grandchild1')).toBe(true);
      expect(descendants.has('grandchild2')).toBe(true);
    });

    it('should return only subtree descendants', () => {
      const nodes = [
        createTestNode('root'),
        createTestNode('child1', 'root'),
        createTestNode('child2', 'root'),
        createTestNode('grandchild1', 'child1'),
      ];

      const descendants = getDescendantIds('child1', nodes);
      expect(descendants.size).toBe(1);
      expect(descendants.has('grandchild1')).toBe(true);
      expect(descendants.has('child2')).toBe(false);
    });
  });

  describe('layoutDescendants', () => {
    it('should preserve root node position', () => {
      const rootPosition = { x: 100, y: 100 };
      const nodes = [
        createTestNode('root', null, rootPosition),
        createTestNode('child', 'root'),
      ];
      const edges = deriveEdgesFromNodes(nodes);

      const result = layoutDescendants('root', nodes, edges);

      const root = result.nodes.find(n => n.id === 'root')!;
      expect(root.position.x).toBe(rootPosition.x);
      expect(root.position.y).toBe(rootPosition.y);
    });

    it('should not affect nodes outside subtree', () => {
      const siblingPosition = { x: 999, y: 999 };
      const nodes = [
        createTestNode('root'),
        createTestNode('child1', 'root'),
        createTestNode('child2', 'root', siblingPosition),
        createTestNode('grandchild', 'child1'),
      ];
      const edges = deriveEdgesFromNodes(nodes);

      const result = layoutDescendants('child1', nodes, edges);

      const child2 = result.nodes.find(n => n.id === 'child2')!;
      expect(child2.position.x).toBe(siblingPosition.x);
      expect(child2.position.y).toBe(siblingPosition.y);
    });
  });

  describe('nodesOverlap', () => {
    it('should detect overlapping nodes', () => {
      const node1 = createTestNode('1', null, { x: 0, y: 0 });
      const node2 = createTestNode('2', null, { x: 100, y: 50 }); // Overlaps with default 300x150

      expect(nodesOverlap(node1, node2)).toBe(true);
    });

    it('should detect non-overlapping nodes', () => {
      const node1 = createTestNode('1', null, { x: 0, y: 0 });
      const node2 = createTestNode('2', null, { x: 400, y: 0 }); // No overlap

      expect(nodesOverlap(node1, node2)).toBe(false);
    });

    it('should handle adjacent nodes (no overlap)', () => {
      const node1 = createTestNode('1', null, { x: 0, y: 0 });
      const node2 = createTestNode('2', null, { x: NODE_WIDTH, y: 0 }); // Exactly adjacent

      expect(nodesOverlap(node1, node2)).toBe(false);
    });
  });

  describe('hasOverlappingNodes', () => {
    it('should return false for empty array', () => {
      expect(hasOverlappingNodes([])).toBe(false);
    });

    it('should return false for single node', () => {
      const nodes = [createTestNode('1')];
      expect(hasOverlappingNodes(nodes)).toBe(false);
    });

    it('should detect overlapping nodes in array', () => {
      const nodes = [
        createTestNode('1', null, { x: 0, y: 0 }),
        createTestNode('2', null, { x: 100, y: 50 }),
      ];
      expect(hasOverlappingNodes(nodes)).toBe(true);
    });

    it('should return false for non-overlapping nodes', () => {
      const nodes = [
        createTestNode('1', null, { x: 0, y: 0 }),
        createTestNode('2', null, { x: 400, y: 0 }),
        createTestNode('3', null, { x: 0, y: 200 }),
      ];
      expect(hasOverlappingNodes(nodes)).toBe(false);
    });
  });

  describe('getNodesBoundingBox', () => {
    it('should return zero dimensions for empty array', () => {
      const bbox = getNodesBoundingBox([]);
      expect(bbox.width).toBe(0);
      expect(bbox.height).toBe(0);
    });

    it('should calculate bounding box for single node', () => {
      const nodes = [createTestNode('1', null, { x: 100, y: 100 })];
      const bbox = getNodesBoundingBox(nodes);

      expect(bbox.minX).toBe(100);
      expect(bbox.minY).toBe(100);
      expect(bbox.maxX).toBe(100 + NODE_WIDTH);
      expect(bbox.maxY).toBe(100 + NODE_HEIGHT);
      expect(bbox.width).toBe(NODE_WIDTH);
      expect(bbox.height).toBe(NODE_HEIGHT);
    });

    it('should calculate bounding box for multiple nodes', () => {
      const nodes = [
        createTestNode('1', null, { x: 0, y: 0 }),
        createTestNode('2', null, { x: 500, y: 300 }),
      ];
      const bbox = getNodesBoundingBox(nodes);

      expect(bbox.minX).toBe(0);
      expect(bbox.minY).toBe(0);
      expect(bbox.maxX).toBe(500 + NODE_WIDTH);
      expect(bbox.maxY).toBe(300 + NODE_HEIGHT);
    });
  });
});
