/**
 * Tests for Context Assembly Engine
 * 
 * Tests the path traversal algorithm and prompt construction logic.
 * Requirements: 3.2, 5.1, 4.4, 5.2
 */

import {
  assembleContext,
  assembleContextFromArray,
  validateContextPath,
  buildAIPrompt,
  buildSelectionBranchPrompt,
  estimateTokens,
  MAX_TRAVERSAL_DEPTH
} from '@/lib/context';
import { MindNode, ContextNode } from '@/types';

// ============================================
// TEST HELPERS
// ============================================

function createMockNode(overrides: Partial<MindNode> & { id: string }): MindNode {
  return {
    id: overrides.id,
    workspaceId: overrides.workspaceId || 'workspace-1',
    parentId: overrides.parentId ?? null,
    type: overrides.type || 'user',
    data: {
      label: overrides.data?.label || `Node ${overrides.id}`,
      contextContent: overrides.data?.contextContent || `Content for ${overrides.id}`,
      selectionSource: overrides.data?.selectionSource,
      isEditing: overrides.data?.isEditing || false,
      isGenerating: overrides.data?.isGenerating || false,
      suggestions: overrides.data?.suggestions || []
    },
    position: overrides.position || { x: 0, y: 0 },
    createdAt: overrides.createdAt || new Date(),
    updatedAt: overrides.updatedAt || new Date()
  };
}

function createNodeMap(nodes: MindNode[]): Map<string, MindNode> {
  return new Map(nodes.map(node => [node.id, node]));
}

// ============================================
// ASSEMBLE CONTEXT TESTS
// ============================================

describe('assembleContext', () => {
  it('should return empty array for non-existent node', () => {
    const nodes = new Map<string, MindNode>();
    const result = assembleContext('non-existent', nodes);
    expect(result).toEqual([]);
  });

  it('should return single node for root node', () => {
    const rootNode = createMockNode({
      id: 'root',
      type: 'root',
      parentId: null,
      data: { label: 'Root', contextContent: 'Root content' }
    });
    const nodes = createNodeMap([rootNode]);

    const result = assembleContext('root', nodes);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('root');
    expect(result[0].content).toBe('Root content');
    expect(result[0].type).toBe('root');
  });

  it('should traverse from child to root in correct order', () => {
    const rootNode = createMockNode({
      id: 'root',
      type: 'root',
      parentId: null,
      data: { label: 'Root', contextContent: 'Root content' }
    });
    const childNode = createMockNode({
      id: 'child',
      type: 'user',
      parentId: 'root',
      data: { label: 'Child', contextContent: 'Child content' }
    });
    const grandchildNode = createMockNode({
      id: 'grandchild',
      type: 'ai',
      parentId: 'child',
      data: { label: 'Grandchild', contextContent: 'Grandchild content' }
    });

    const nodes = createNodeMap([rootNode, childNode, grandchildNode]);
    const result = assembleContext('grandchild', nodes);

    // Should be ordered from root to grandchild
    expect(result).toHaveLength(3);
    expect(result[0].id).toBe('root');
    expect(result[1].id).toBe('child');
    expect(result[2].id).toBe('grandchild');
  });

  it('should include selectionSource in context nodes', () => {
    const rootNode = createMockNode({
      id: 'root',
      type: 'root',
      parentId: null
    });
    const selectionNode = createMockNode({
      id: 'selection',
      type: 'user',
      parentId: 'root',
      data: {
        label: 'Selection',
        contextContent: 'Selection content',
        selectionSource: 'selected text'
      }
    });

    const nodes = createNodeMap([rootNode, selectionNode]);
    const result = assembleContext('selection', nodes);

    expect(result[1].selectionSource).toBe('selected text');
  });

  it('should handle orphaned nodes gracefully', () => {
    // Node with parent that doesn't exist
    const orphanNode = createMockNode({
      id: 'orphan',
      type: 'user',
      parentId: 'non-existent-parent'
    });

    const nodes = createNodeMap([orphanNode]);
    const result = assembleContext('orphan', nodes);

    // Should return just the orphan node
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('orphan');
  });

  it('should detect and break circular references', () => {
    // Create a circular reference: A -> B -> A
    const nodeA = createMockNode({
      id: 'nodeA',
      type: 'user',
      parentId: 'nodeB'
    });
    const nodeB = createMockNode({
      id: 'nodeB',
      type: 'user',
      parentId: 'nodeA'
    });

    const nodes = createNodeMap([nodeA, nodeB]);
    
    // Should not hang, should break the cycle
    const result = assembleContext('nodeA', nodes);
    
    // Should have stopped at the circular reference
    expect(result.length).toBeLessThanOrEqual(2);
  });

  it('should only include direct ancestors, not siblings', () => {
    const rootNode = createMockNode({
      id: 'root',
      type: 'root',
      parentId: null
    });
    const child1 = createMockNode({
      id: 'child1',
      type: 'user',
      parentId: 'root',
      data: { label: 'Child 1', contextContent: 'Child 1 content' }
    });
    const child2 = createMockNode({
      id: 'child2',
      type: 'user',
      parentId: 'root',
      data: { label: 'Child 2', contextContent: 'Child 2 content' }
    });
    const grandchild = createMockNode({
      id: 'grandchild',
      type: 'ai',
      parentId: 'child1'
    });

    const nodes = createNodeMap([rootNode, child1, child2, grandchild]);
    const result = assembleContext('grandchild', nodes);

    // Should include root -> child1 -> grandchild, NOT child2
    expect(result).toHaveLength(3);
    expect(result.map(n => n.id)).toEqual(['root', 'child1', 'grandchild']);
    expect(result.map(n => n.id)).not.toContain('child2');
  });
});

describe('assembleContextFromArray', () => {
  it('should work with array input', () => {
    const nodes = [
      createMockNode({ id: 'root', type: 'root', parentId: null }),
      createMockNode({ id: 'child', type: 'user', parentId: 'root' })
    ];

    const result = assembleContextFromArray('child', nodes);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('root');
    expect(result[1].id).toBe('child');
  });
});

describe('validateContextPath', () => {
  it('should return true for empty path', () => {
    const nodes = new Map<string, MindNode>();
    expect(validateContextPath([], nodes)).toBe(true);
  });

  it('should return true for valid path', () => {
    const rootNode = createMockNode({ id: 'root', type: 'root', parentId: null });
    const childNode = createMockNode({ id: 'child', type: 'user', parentId: 'root' });
    const nodes = createNodeMap([rootNode, childNode]);

    const path: ContextNode[] = [
      { id: 'root', content: 'Root', type: 'root' },
      { id: 'child', content: 'Child', type: 'user' }
    ];

    expect(validateContextPath(path, nodes)).toBe(true);
  });

  it('should return false if first node is not root', () => {
    const childNode = createMockNode({ id: 'child', type: 'user', parentId: 'root' });
    const nodes = createNodeMap([childNode]);

    const path: ContextNode[] = [
      { id: 'child', content: 'Child', type: 'user' }
    ];

    expect(validateContextPath(path, nodes)).toBe(false);
  });
});

// ============================================
// BUILD AI PROMPT TESTS
// ============================================

describe('buildAIPrompt', () => {
  it('should build prompt with context path', () => {
    const contextPath: ContextNode[] = [
      { id: 'root', content: 'Initial question', type: 'root' },
      { id: 'ai1', content: 'AI response', type: 'ai' }
    ];

    const result = buildAIPrompt(contextPath);

    expect(result.prompt).toContain('Conversation Path');
    expect(result.prompt).toContain('Root: Initial question');
    expect(result.prompt).toContain('Assistant: AI response');
    expect(result.wasTruncated).toBe(false);
    expect(result.includedNodes).toBe(2);
  });

  it('should include user message when provided', () => {
    const contextPath: ContextNode[] = [
      { id: 'root', content: 'Root', type: 'root' }
    ];

    const result = buildAIPrompt(contextPath, 'What does this mean?');

    expect(result.prompt).toContain('User Question');
    expect(result.prompt).toContain('What does this mean?');
  });

  it('should include selection source as highlighted context', () => {
    const contextPath: ContextNode[] = [
      { id: 'root', content: 'Root', type: 'root' }
    ];

    const result = buildAIPrompt(contextPath, undefined, 'selected text');

    expect(result.prompt).toContain('User Selected Text');
    expect(result.prompt).toContain('"selected text"');
    expect(result.prompt).toContain('specific selected text');
  });

  it('should include selectionSource from context nodes', () => {
    const contextPath: ContextNode[] = [
      { id: 'root', content: 'Root', type: 'root' },
      { id: 'selection', content: 'Branch content', type: 'user', selectionSource: 'highlighted text' }
    ];

    const result = buildAIPrompt(contextPath);

    expect(result.prompt).toContain('[Selected text: "highlighted text"]');
  });

  it('should handle empty context path', () => {
    const result = buildAIPrompt([]);

    expect(result.prompt).toBeDefined();
    expect(result.includedNodes).toBe(0);
    expect(result.wasTruncated).toBe(false);
  });

  it('should use custom system prompt when provided', () => {
    const contextPath: ContextNode[] = [
      { id: 'root', content: 'Root', type: 'root' }
    ];

    const result = buildAIPrompt(contextPath, undefined, undefined, {
      systemPrompt: 'Custom system prompt'
    });

    expect(result.prompt).toContain('Custom system prompt');
  });

  it('should truncate long context paths', () => {
    // Create a very long context path
    const contextPath: ContextNode[] = [];
    for (let i = 0; i < 100; i++) {
      contextPath.push({
        id: `node-${i}`,
        content: 'A'.repeat(500), // Long content
        type: i === 0 ? 'root' : 'user'
      });
    }

    const result = buildAIPrompt(contextPath, undefined, undefined, {
      tokenLimit: 1000
    });

    expect(result.wasTruncated).toBe(true);
    expect(result.includedNodes).toBeLessThan(result.totalNodes);
  });
});

describe('buildSelectionBranchPrompt', () => {
  it('should require selection source', () => {
    const contextPath: ContextNode[] = [
      { id: 'root', content: 'Root', type: 'root' }
    ];

    expect(() => buildSelectionBranchPrompt(contextPath, '')).toThrow();
    expect(() => buildSelectionBranchPrompt(contextPath, '   ')).toThrow();
  });

  it('should include selection source in prompt', () => {
    const contextPath: ContextNode[] = [
      { id: 'root', content: 'Root', type: 'root' }
    ];

    const result = buildSelectionBranchPrompt(contextPath, 'important text');

    expect(result.prompt).toContain('User Selected Text');
    expect(result.prompt).toContain('"important text"');
  });
});

describe('estimateTokens', () => {
  it('should estimate tokens based on character count', () => {
    // Approximately 4 characters per token
    expect(estimateTokens('test')).toBe(1);
    expect(estimateTokens('12345678')).toBe(2);
    expect(estimateTokens('')).toBe(0);
  });
});
