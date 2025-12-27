/**
 * Canvas Component Tests
 * Tests for CanvasWorkspace keyboard shortcuts and node operations
 * 
 * Requirements:
 * - 2.1: Tab creates child node
 * - 2.2: Enter creates sibling node
 */

import { MindNode, Edge, createEdgeFromNodes, deriveEdgesFromNodes } from '../types';

// ============================================
// TEST UTILITIES
// ============================================

/**
 * Creates a mock MindNode for testing
 */
function createMockNode(overrides: Partial<MindNode> = {}): MindNode {
  const id = overrides.id || `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  return {
    id,
    workspaceId: 'test-workspace',
    parentId: null,
    type: 'user',
    data: {
      label: 'Test Node',
      contextContent: 'Test content',
    },
    position: { x: 0, y: 0 },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Simulates creating a child node (Tab key behavior)
 * Requirements: 2.1 - Tab creates child node
 */
function createChildNode(
  parentId: string,
  nodes: MindNode[],
  workspaceId: string
): { newNode: MindNode; updatedNodes: MindNode[]; updatedEdges: Edge[] } {
  const parentNode = nodes.find((n) => n.id === parentId);
  if (!parentNode) {
    throw new Error(`Parent node ${parentId} not found`);
  }

  const newNode: MindNode = {
    id: `node-${Date.now()}`,
    workspaceId,
    parentId,
    type: 'user',
    data: {
      label: '',
      contextContent: '',
      isEditing: true,
    },
    position: {
      x: parentNode.position.x + 400, // Position to the right
      y: parentNode.position.y,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const updatedNodes = [...nodes, newNode];
  const updatedEdges = deriveEdgesFromNodes(updatedNodes);

  return { newNode, updatedNodes, updatedEdges };
}

/**
 * Simulates creating a sibling node (Enter key behavior)
 * Requirements: 2.2 - Enter creates sibling node
 */
function createSiblingNode(
  nodeId: string,
  nodes: MindNode[],
  workspaceId: string
): { newNode: MindNode; updatedNodes: MindNode[]; updatedEdges: Edge[] } | null {
  const currentNode = nodes.find((n) => n.id === nodeId);
  if (!currentNode || !currentNode.parentId) {
    return null; // Cannot create sibling for root node
  }

  const siblings = nodes.filter((n) => n.parentId === currentNode.parentId);
  const lastSibling = siblings[siblings.length - 1];

  const newNode: MindNode = {
    id: `node-${Date.now()}`,
    workspaceId,
    parentId: currentNode.parentId,
    type: 'user',
    data: {
      label: '',
      contextContent: '',
      isEditing: true,
    },
    position: {
      x: lastSibling.position.x,
      y: lastSibling.position.y + 200, // Position below
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const updatedNodes = [...nodes, newNode];
  const updatedEdges = deriveEdgesFromNodes(updatedNodes);

  return { newNode, updatedNodes, updatedEdges };
}

// ============================================
// TESTS
// ============================================

describe('Canvas Keyboard Shortcuts', () => {
  describe('Tab - Create Child Node (Requirement 2.1)', () => {
    it('should create a child node when Tab is pressed on a selected node', () => {
      const rootNode = createMockNode({
        id: 'root',
        type: 'root',
        position: { x: 100, y: 100 },
      });
      const nodes = [rootNode];

      const result = createChildNode('root', nodes, 'test-workspace');

      expect(result.newNode.parentId).toBe('root');
      expect(result.newNode.type).toBe('user');
      expect(result.newNode.data.isEditing).toBe(true);
      expect(result.updatedNodes).toHaveLength(2);
    });

    it('should position child node to the right of parent', () => {
      const rootNode = createMockNode({
        id: 'root',
        type: 'root',
        position: { x: 100, y: 100 },
      });
      const nodes = [rootNode];

      const result = createChildNode('root', nodes, 'test-workspace');

      expect(result.newNode.position.x).toBeGreaterThan(rootNode.position.x);
      expect(result.newNode.position.y).toBe(rootNode.position.y);
    });

    it('should create edge from parent to child', () => {
      const rootNode = createMockNode({
        id: 'root',
        type: 'root',
        position: { x: 100, y: 100 },
      });
      const nodes = [rootNode];

      const result = createChildNode('root', nodes, 'test-workspace');

      expect(result.updatedEdges).toHaveLength(1);
      expect(result.updatedEdges[0].source).toBe('root');
      expect(result.updatedEdges[0].target).toBe(result.newNode.id);
    });

    it('should throw error if parent node does not exist', () => {
      const nodes: MindNode[] = [];

      expect(() => createChildNode('non-existent', nodes, 'test-workspace')).toThrow(
        'Parent node non-existent not found'
      );
    });
  });

  describe('Enter - Create Sibling Node (Requirement 2.2)', () => {
    it('should create a sibling node when Enter is pressed on a non-root node', () => {
      const rootNode = createMockNode({
        id: 'root',
        type: 'root',
        position: { x: 100, y: 100 },
      });
      const childNode = createMockNode({
        id: 'child1',
        parentId: 'root',
        position: { x: 500, y: 100 },
      });
      const nodes = [rootNode, childNode];

      const result = createSiblingNode('child1', nodes, 'test-workspace');

      expect(result).not.toBeNull();
      expect(result!.newNode.parentId).toBe('root');
      expect(result!.newNode.type).toBe('user');
      expect(result!.newNode.data.isEditing).toBe(true);
      expect(result!.updatedNodes).toHaveLength(3);
    });

    it('should position sibling node below the last sibling', () => {
      const rootNode = createMockNode({
        id: 'root',
        type: 'root',
        position: { x: 100, y: 100 },
      });
      const childNode = createMockNode({
        id: 'child1',
        parentId: 'root',
        position: { x: 500, y: 100 },
      });
      const nodes = [rootNode, childNode];

      const result = createSiblingNode('child1', nodes, 'test-workspace');

      expect(result!.newNode.position.x).toBe(childNode.position.x);
      expect(result!.newNode.position.y).toBeGreaterThan(childNode.position.y);
    });

    it('should return null when trying to create sibling for root node', () => {
      const rootNode = createMockNode({
        id: 'root',
        type: 'root',
        parentId: null,
        position: { x: 100, y: 100 },
      });
      const nodes = [rootNode];

      const result = createSiblingNode('root', nodes, 'test-workspace');

      expect(result).toBeNull();
    });

    it('should create edge from parent to new sibling', () => {
      const rootNode = createMockNode({
        id: 'root',
        type: 'root',
        position: { x: 100, y: 100 },
      });
      const childNode = createMockNode({
        id: 'child1',
        parentId: 'root',
        position: { x: 500, y: 100 },
      });
      const nodes = [rootNode, childNode];

      const result = createSiblingNode('child1', nodes, 'test-workspace');

      // Should have 2 edges: root->child1 and root->newSibling
      expect(result!.updatedEdges).toHaveLength(2);
      const newEdge = result!.updatedEdges.find((e) => e.target === result!.newNode.id);
      expect(newEdge).toBeDefined();
      expect(newEdge!.source).toBe('root');
    });

    it('should position below the last sibling when multiple siblings exist', () => {
      const rootNode = createMockNode({
        id: 'root',
        type: 'root',
        position: { x: 100, y: 100 },
      });
      const child1 = createMockNode({
        id: 'child1',
        parentId: 'root',
        position: { x: 500, y: 100 },
      });
      const child2 = createMockNode({
        id: 'child2',
        parentId: 'root',
        position: { x: 500, y: 300 },
      });
      const nodes = [rootNode, child1, child2];

      const result = createSiblingNode('child1', nodes, 'test-workspace');

      // Should be positioned below child2 (the last sibling)
      expect(result!.newNode.position.y).toBeGreaterThan(child2.position.y);
    });
  });

  describe('Node Creation Properties', () => {
    it('new child nodes should enter edit mode automatically', () => {
      const rootNode = createMockNode({ id: 'root', type: 'root' });
      const nodes = [rootNode];

      const result = createChildNode('root', nodes, 'test-workspace');

      expect(result.newNode.data.isEditing).toBe(true);
    });

    it('new sibling nodes should enter edit mode automatically', () => {
      const rootNode = createMockNode({ id: 'root', type: 'root' });
      const childNode = createMockNode({ id: 'child1', parentId: 'root' });
      const nodes = [rootNode, childNode];

      const result = createSiblingNode('child1', nodes, 'test-workspace');

      expect(result!.newNode.data.isEditing).toBe(true);
    });

    it('new nodes should have empty content', () => {
      const rootNode = createMockNode({ id: 'root', type: 'root' });
      const nodes = [rootNode];

      const result = createChildNode('root', nodes, 'test-workspace');

      expect(result.newNode.data.label).toBe('');
      expect(result.newNode.data.contextContent).toBe('');
    });

    it('new nodes should inherit workspace ID', () => {
      const rootNode = createMockNode({
        id: 'root',
        type: 'root',
        workspaceId: 'my-workspace',
      });
      const nodes = [rootNode];

      const result = createChildNode('root', nodes, 'my-workspace');

      expect(result.newNode.workspaceId).toBe('my-workspace');
    });
  });
});

describe('Edge Creation', () => {
  it('should create correct edge ID format', () => {
    const edge = createEdgeFromNodes('parent', 'child');

    expect(edge.id).toBe('edge-parent-child');
    expect(edge.source).toBe('parent');
    expect(edge.target).toBe('child');
  });

  it('should derive all edges from nodes with parent relationships', () => {
    const nodes: MindNode[] = [
      createMockNode({ id: 'root', type: 'root', parentId: null }),
      createMockNode({ id: 'child1', parentId: 'root' }),
      createMockNode({ id: 'child2', parentId: 'root' }),
      createMockNode({ id: 'grandchild', parentId: 'child1' }),
    ];

    const edges = deriveEdgesFromNodes(nodes);

    expect(edges).toHaveLength(3);
    expect(edges.map((e) => e.target).sort()).toEqual(['child1', 'child2', 'grandchild']);
  });
});
