// Core data types for MindNode Canvas

// ============================================
// CORE INTERFACES
// ============================================

export interface Workspace {
  id: string;
  userId: string;
  title: string;
  rootNodeId: string | null;
  createdAt: Date;
  updatedAt: Date;
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
}

export type NodeType = 'root' | 'user' | 'ai';

export interface MindNode {
  id: string;
  workspaceId: string;
  parentId: string | null;
  type: NodeType;
  data: {
    label: string;
    contextContent: string;
    selectionSource?: string;
    isEditing?: boolean;
    isGenerating?: boolean;
    suggestions?: string[];
  };
  position: {
    x: number;
    y: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export type EdgeType = 'default' | 'smoothstep';

export interface Edge {
  id: string;
  source: string;
  target: string;
  type?: EdgeType;
}

export interface ContextNode {
  id: string;
  content: string;
  type: NodeType;
  selectionSource?: string;
}

export interface AIError {
  type: 'rate_limit' | 'timeout' | 'auth' | 'unknown';
  message: string;
  retryable: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// ============================================
// TYPE GUARDS
// ============================================

/**
 * Type guard to check if a value is a valid NodeType
 */
export function isNodeType(value: unknown): value is NodeType {
  return value === 'root' || value === 'user' || value === 'ai';
}

/**
 * Type guard to check if a value is a valid EdgeType
 */
export function isEdgeType(value: unknown): value is EdgeType {
  return value === 'default' || value === 'smoothstep' || value === undefined;
}

/**
 * Type guard to check if an object is a valid Workspace
 */
export function isWorkspace(obj: unknown): obj is Workspace {
  if (typeof obj !== 'object' || obj === null) return false;
  
  const workspace = obj as Record<string, unknown>;
  
  return (
    typeof workspace.id === 'string' &&
    typeof workspace.userId === 'string' &&
    typeof workspace.title === 'string' &&
    (workspace.rootNodeId === null || typeof workspace.rootNodeId === 'string') &&
    workspace.createdAt instanceof Date &&
    workspace.updatedAt instanceof Date &&
    typeof workspace.viewport === 'object' &&
    workspace.viewport !== null &&
    typeof (workspace.viewport as Record<string, unknown>).x === 'number' &&
    typeof (workspace.viewport as Record<string, unknown>).y === 'number' &&
    typeof (workspace.viewport as Record<string, unknown>).zoom === 'number'
  );
}

/**
 * Type guard to check if an object is a valid MindNode
 */
export function isMindNode(obj: unknown): obj is MindNode {
  if (typeof obj !== 'object' || obj === null) return false;
  
  const node = obj as Record<string, unknown>;
  
  if (
    typeof node.id !== 'string' ||
    typeof node.workspaceId !== 'string' ||
    (node.parentId !== null && typeof node.parentId !== 'string') ||
    !isNodeType(node.type)
  ) {
    return false;
  }
  
  // Check data object
  if (typeof node.data !== 'object' || node.data === null) return false;
  const data = node.data as Record<string, unknown>;
  if (
    typeof data.label !== 'string' ||
    typeof data.contextContent !== 'string'
  ) {
    return false;
  }
  
  // Check position object
  if (typeof node.position !== 'object' || node.position === null) return false;
  const position = node.position as Record<string, unknown>;
  if (
    typeof position.x !== 'number' ||
    typeof position.y !== 'number'
  ) {
    return false;
  }
  
  // Check dates
  if (
    !(node.createdAt instanceof Date) ||
    !(node.updatedAt instanceof Date)
  ) {
    return false;
  }
  
  return true;
}

/**
 * Type guard to check if an object is a valid Edge
 */
export function isEdge(obj: unknown): obj is Edge {
  if (typeof obj !== 'object' || obj === null) return false;
  
  const edge = obj as Record<string, unknown>;
  
  return (
    typeof edge.id === 'string' &&
    typeof edge.source === 'string' &&
    typeof edge.target === 'string' &&
    isEdgeType(edge.type)
  );
}

// ============================================
// VALIDATION FUNCTIONS
// ============================================

/**
 * Validates a workspace object and returns validation result
 * Requirements: 7.1 - Workspace creation validation
 */
export function validateWorkspace(workspace: Partial<Workspace>): ValidationResult {
  const errors: string[] = [];
  
  if (!workspace.title || workspace.title.trim().length === 0) {
    errors.push('Workspace title cannot be empty');
  }
  
  if (workspace.title && workspace.title.length > 255) {
    errors.push('Workspace title cannot exceed 255 characters');
  }
  
  if (!workspace.userId || workspace.userId.trim().length === 0) {
    errors.push('Workspace must have a user ID');
  }
  
  if (workspace.viewport) {
    if (typeof workspace.viewport.zoom !== 'number' || 
        workspace.viewport.zoom < 0.1 || 
        workspace.viewport.zoom > 10) {
      errors.push('Viewport zoom must be between 0.1 and 10');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates a node object and returns validation result
 * Requirements: 2.1, 2.2 - Node creation validation
 */
export function validateNode(node: Partial<MindNode>): ValidationResult {
  const errors: string[] = [];
  
  if (!node.workspaceId || node.workspaceId.trim().length === 0) {
    errors.push('Node must belong to a workspace');
  }
  
  if (!node.type || !isNodeType(node.type)) {
    errors.push('Node must have a valid type (root, user, or ai)');
  }
  
  // Root nodes cannot have a parent
  if (node.type === 'root' && node.parentId !== null && node.parentId !== undefined) {
    errors.push('Root node cannot have a parent');
  }
  
  // Non-root nodes must have a parent (except during initial creation)
  if (node.type !== 'root' && node.parentId === undefined) {
    // This is allowed during creation, parent will be set
  }
  
  // Prevent circular reference (node cannot be its own parent)
  if (node.id && node.parentId && node.id === node.parentId) {
    errors.push('Node cannot be its own parent');
  }
  
  // Validate data if present
  if (node.data) {
    if (node.data.contextContent !== undefined && 
        typeof node.data.contextContent !== 'string') {
      errors.push('Node content must be a string');
    }
  }
  
  // Validate position if present
  if (node.position) {
    if (typeof node.position.x !== 'number' || isNaN(node.position.x)) {
      errors.push('Node position x must be a valid number');
    }
    if (typeof node.position.y !== 'number' || isNaN(node.position.y)) {
      errors.push('Node position y must be a valid number');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates an edge object and returns validation result
 * Requirements: 3.1 - Edge/relationship validation
 */
export function validateEdge(edge: Partial<Edge>): ValidationResult {
  const errors: string[] = [];
  
  if (!edge.source || edge.source.trim().length === 0) {
    errors.push('Edge must have a source node');
  }
  
  if (!edge.target || edge.target.trim().length === 0) {
    errors.push('Edge must have a target node');
  }
  
  if (edge.source && edge.target && edge.source === edge.target) {
    errors.push('Edge source and target cannot be the same node');
  }
  
  if (edge.type !== undefined && !isEdgeType(edge.type)) {
    errors.push('Edge type must be "default" or "smoothstep"');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Creates an edge ID from source and target node IDs
 */
export function createEdgeId(source: string, target: string): string {
  return `edge-${source}-${target}`;
}

/**
 * Creates an edge from parent-child relationship
 */
export function createEdgeFromNodes(parentId: string, childId: string): Edge {
  return {
    id: createEdgeId(parentId, childId),
    source: parentId,
    target: childId,
    type: 'smoothstep'
  };
}

/**
 * Derives edges from a list of nodes based on parent-child relationships
 */
export function deriveEdgesFromNodes(nodes: MindNode[]): Edge[] {
  return nodes
    .filter(node => node.parentId !== null)
    .map(node => createEdgeFromNodes(node.parentId!, node.id));
}
