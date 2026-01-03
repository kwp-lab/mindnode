import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { useShallow } from 'zustand/react/shallow';
import {
  MindNode,
  Edge,
  Workspace,
  deriveEdgesFromNodes,
  createEdgeFromNodes,
  validateNode,
  validateNodeUpdate,
  validateWorkspace,
  detectCircularReference,
} from '../types';
import {
  getLayoutedElements,
  layoutDescendants,
  LayoutDirection,
} from '../lib/layout';
import {
  calculateViewportBounds,
  getVisibleNodes,
  ViewportBounds,
} from '../lib/viewport';

// ============================================
// STORE TYPES
// ============================================

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export interface ViewportDimensions {
  width: number;
  height: number;
}

export interface TextSelection {
  text: string;
  position: { x: number; y: number };
  nodeId: string;
}

// ============================================
// CANVAS SLICE
// ============================================

export interface CanvasSlice {
  // State
  nodes: MindNode[];
  edges: Edge[];
  viewport: Viewport;
  viewportDimensions: ViewportDimensions;
  selectedNodeId: string | null;

  // Actions
  addNode: (node: MindNode) => void;
  updateNode: (id: string, data: Partial<MindNode['data']>) => void;
  updateNodePosition: (id: string, position: { x: number; y: number }, isManual?: boolean) => void;
  deleteNode: (id: string) => void;
  setNodes: (nodes: MindNode[]) => void;
  setEdges: (edges: Edge[]) => void;
  setSelectedNode: (id: string | null) => void;
  setViewport: (viewport: Viewport) => void;
  setViewportDimensions: (dimensions: ViewportDimensions) => void;
  resetCanvas: () => void;
}

// ============================================
// AI SLICE
// ============================================

export interface AISlice {
  // State
  generatingNodes: Set<string>;

  // Actions
  startGeneration: (nodeId: string) => void;
  stopGeneration: (nodeId: string) => void;
  isGenerating: (nodeId: string) => boolean;
}

// ============================================
// SELECTION SLICE
// ============================================

export interface SelectionSlice {
  // State
  selectedText: string | null;
  selectionPosition: { x: number; y: number } | null;
  selectionNodeId: string | null;

  // Actions
  setSelection: (text: string, position: { x: number; y: number }, nodeId: string) => void;
  clearSelection: () => void;
}

// ============================================
// WORKSPACE SLICE
// ============================================

export interface WorkspaceSlice {
  // State
  currentWorkspaceId: string | null;
  currentProjectId: string | null;
  workspaces: Workspace[];

  // Actions
  setCurrentWorkspace: (id: string | null) => void;
  setCurrentProject: (id: string | null) => void;
  setWorkspaces: (workspaces: Workspace[]) => void;
  addWorkspace: (workspace: Workspace) => void;
  updateWorkspace: (id: string, data: Partial<Workspace>) => void;
  deleteWorkspace: (id: string) => void;
}

// ============================================
// LAYOUT SLICE
// ============================================

export interface LayoutSlice {
  // State
  manuallyPositionedNodes: Set<string>;
  layoutDirection: LayoutDirection;

  // Actions
  markNodeAsManuallyPositioned: (nodeId: string) => void;
  clearManuallyPositioned: (nodeId: string) => void;
  clearAllManuallyPositioned: () => void;
  setLayoutDirection: (direction: LayoutDirection) => void;
  applyLayout: () => void;
  applyLayoutToDescendants: (nodeId: string) => void;
}

// ============================================
// COMBINED STORE TYPE
// ============================================

export type MindNodeStore = CanvasSlice & AISlice & SelectionSlice & WorkspaceSlice & LayoutSlice;

// ============================================
// DEFAULT VALUES
// ============================================

const DEFAULT_VIEWPORT: Viewport = {
  x: 0,
  y: 0,
  zoom: 1,
};

const DEFAULT_VIEWPORT_DIMENSIONS: ViewportDimensions = {
  width: 1920,
  height: 1080,
};

// ============================================
// STORE IMPLEMENTATION
// ============================================

export const useMindNodeStore = create<MindNodeStore>()(
  immer((set, get) => ({
    // ========================================
    // CANVAS SLICE STATE
    // ========================================
    nodes: [],
    edges: [],
    viewport: DEFAULT_VIEWPORT,
    viewportDimensions: DEFAULT_VIEWPORT_DIMENSIONS,
    selectedNodeId: null,

    // ========================================
    // CANVAS SLICE ACTIONS
    // ========================================

    /**
     * Add a new node to the canvas
     * Requirements: 2.1, 2.2, 15.4 - Node creation with validation
     */
    addNode: (node: MindNode) => {
      set((state) => {
        // Validate the node
        const validation = validateNode(node);
        if (!validation.valid) {
          console.error('Node validation failed:', validation.errors);
          throw new Error(validation.errors.join(', '));
        }
        
        // Check for circular references
        if (node.parentId && detectCircularReference(node.id, node.parentId, state.nodes)) {
          console.error('Circular reference detected');
          throw new Error('Cannot add node: would create circular reference');
        }
        
        state.nodes.push(node);
        // If node has a parent, create an edge
        if (node.parentId) {
          const edge = createEdgeFromNodes(node.parentId, node.id);
          state.edges.push(edge);
        }
      });
    },

    /**
     * Update node data (content, editing state, etc.)
     * Requirements: 2.4, 15.4 - Node content editing with validation
     */
    updateNode: (id: string, data: Partial<MindNode['data']>) => {
      set((state) => {
        const nodeIndex = state.nodes.findIndex((n) => n.id === id);
        if (nodeIndex !== -1) {
          // Validate the update - only validate if content fields are being updated
          if (data.contextContent !== undefined || data.label !== undefined) {
            const updates: Partial<MindNode> = {};
            if (data.contextContent !== undefined || data.label !== undefined) {
              updates.data = {
                label: data.label ?? state.nodes[nodeIndex].data.label,
                contextContent: data.contextContent ?? state.nodes[nodeIndex].data.contextContent,
              };
            }
            const validation = validateNodeUpdate(id, updates, state.nodes);
            if (!validation.valid) {
              console.error('Node update validation failed:', validation.errors);
              throw new Error(validation.errors.join(', '));
            }
          }
          
          state.nodes[nodeIndex].data = {
            ...state.nodes[nodeIndex].data,
            ...data,
          };
          state.nodes[nodeIndex].updatedAt = new Date();
        }
      });
    },

    /**
     * Update node position on canvas
     * Requirements: 1.1 - Canvas pan/drag
     * Requirements: 8.3 - Track manually positioned nodes
     */
    updateNodePosition: (id: string, position: { x: number; y: number }, isManual: boolean = false) => {
      set((state) => {
        const nodeIndex = state.nodes.findIndex((n) => n.id === id);
        if (nodeIndex !== -1) {
          state.nodes[nodeIndex].position = position;
          state.nodes[nodeIndex].updatedAt = new Date();
          
          // Mark as manually positioned if this was a user drag action
          if (isManual) {
            state.manuallyPositionedNodes = new Set([...state.manuallyPositionedNodes, id]);
          }
        }
      });
    },

    /**
     * Delete a node and all its descendants (cascade delete)
     * Requirements: 2.6 - Node deletion with descendants
     */
    deleteNode: (id: string) => {
      set((state) => {
        // Find all descendant node IDs (recursive)
        const getDescendantIds = (nodeId: string): string[] => {
          const children = state.nodes.filter((n) => n.parentId === nodeId);
          const childIds = children.map((c) => c.id);
          const descendantIds = childIds.flatMap((cid) => getDescendantIds(cid));
          return [...childIds, ...descendantIds];
        };

        const idsToDelete = new Set([id, ...getDescendantIds(id)]);

        // Remove nodes
        state.nodes = state.nodes.filter((n) => !idsToDelete.has(n.id));

        // Remove edges connected to deleted nodes
        state.edges = state.edges.filter(
          (e) => !idsToDelete.has(e.source) && !idsToDelete.has(e.target)
        );

        // Clear selection if deleted node was selected
        if (state.selectedNodeId && idsToDelete.has(state.selectedNodeId)) {
          state.selectedNodeId = null;
        }
      });
    },

    /**
     * Set all nodes (used when loading workspace)
     */
    setNodes: (nodes: MindNode[]) => {
      set((state) => {
        state.nodes = nodes;
        state.edges = deriveEdgesFromNodes(nodes);
      });
    },

    /**
     * Set all edges (used when loading workspace)
     */
    setEdges: (edges: Edge[]) => {
      set((state) => {
        state.edges = edges;
      });
    },

    /**
     * Set the currently selected node
     */
    setSelectedNode: (id: string | null) => {
      set((state) => {
        state.selectedNodeId = id;
      });
    },

    /**
     * Set viewport (pan and zoom)
     * Requirements: 1.1, 1.2 - Canvas pan and zoom
     */
    setViewport: (viewport: Viewport) => {
      set((state) => {
        state.viewport = viewport;
      });
    },

    /**
     * Set viewport dimensions (width and height)
     * Requirements: 13.4 - Track viewport size for culling
     */
    setViewportDimensions: (dimensions: ViewportDimensions) => {
      set((state) => {
        state.viewportDimensions = dimensions;
      });
    },

    /**
     * Reset canvas to initial state
     */
    resetCanvas: () => {
      set((state) => {
        state.nodes = [];
        state.edges = [];
        state.viewport = DEFAULT_VIEWPORT;
        state.viewportDimensions = DEFAULT_VIEWPORT_DIMENSIONS;
        state.selectedNodeId = null;
      });
    },

    // ========================================
    // AI SLICE STATE
    // ========================================
    generatingNodes: new Set<string>(),

    // ========================================
    // AI SLICE ACTIONS
    // ========================================

    /**
     * Mark a node as generating AI content
     * Requirements: 3.1, 3.3 - AI generation state
     */
    startGeneration: (nodeId: string) => {
      set((state) => {
        state.generatingNodes = new Set([...state.generatingNodes, nodeId]);
        // Also update the node's isGenerating flag
        const nodeIndex = state.nodes.findIndex((n) => n.id === nodeId);
        if (nodeIndex !== -1) {
          state.nodes[nodeIndex].data.isGenerating = true;
        }
      });
    },

    /**
     * Mark a node as finished generating
     * Requirements: 3.1, 3.3 - AI generation state
     */
    stopGeneration: (nodeId: string) => {
      set((state) => {
        const newSet = new Set(state.generatingNodes);
        newSet.delete(nodeId);
        state.generatingNodes = newSet;
        // Also update the node's isGenerating flag
        const nodeIndex = state.nodes.findIndex((n) => n.id === nodeId);
        if (nodeIndex !== -1) {
          state.nodes[nodeIndex].data.isGenerating = false;
        }
      });
    },

    /**
     * Check if a node is currently generating
     */
    isGenerating: (nodeId: string) => {
      return get().generatingNodes.has(nodeId);
    },

    // ========================================
    // SELECTION SLICE STATE
    // ========================================
    selectedText: null,
    selectionPosition: null,
    selectionNodeId: null,

    // ========================================
    // SELECTION SLICE ACTIONS
    // ========================================

    /**
     * Set text selection state
     * Requirements: 4.1 - Text selection detection
     */
    setSelection: (text: string, position: { x: number; y: number }, nodeId: string) => {
      set((state) => {
        state.selectedText = text;
        state.selectionPosition = position;
        state.selectionNodeId = nodeId;
      });
    },

    /**
     * Clear text selection
     * Requirements: 4.5 - Selection dismissal
     */
    clearSelection: () => {
      set((state) => {
        state.selectedText = null;
        state.selectionPosition = null;
        state.selectionNodeId = null;
      });
    },

    // ========================================
    // WORKSPACE SLICE STATE
    // ========================================
    currentWorkspaceId: null,
    currentProjectId: null,
    workspaces: [],

    // ========================================
    // WORKSPACE SLICE ACTIONS
    // ========================================

    /**
     * Set the current active workspace
     * Requirements: 7.2 - Workspace switching
     */
    setCurrentWorkspace: (id: string | null) => {
      set((state) => {
        state.currentWorkspaceId = id;
        // Clear project when workspace changes
        state.currentProjectId = null;
      });
    },

    /**
     * Set the current active project
     */
    setCurrentProject: (id: string | null) => {
      set((state) => {
        state.currentProjectId = id;
      });
    },

    /**
     * Set all workspaces (used when loading user's workspaces)
     */
    setWorkspaces: (workspaces: Workspace[]) => {
      set((state) => {
        state.workspaces = workspaces;
      });
    },

    /**
     * Add a new workspace
     * Requirements: 7.1, 15.4 - Workspace creation with validation
     */
    addWorkspace: (workspace: Workspace) => {
      set((state) => {
        // Validate the workspace
        const validation = validateWorkspace(workspace);
        if (!validation.valid) {
          console.error('Workspace validation failed:', validation.errors);
          throw new Error(validation.errors.join(', '));
        }
        
        state.workspaces.push(workspace);
      });
    },

    /**
     * Update workspace data
     * Requirements: 15.4 - Workspace update with validation
     */
    updateWorkspace: (id: string, data: Partial<Workspace>) => {
      set((state) => {
        const workspaceIndex = state.workspaces.findIndex((w) => w.id === id);
        if (workspaceIndex !== -1) {
          const updatedWorkspace = {
            ...state.workspaces[workspaceIndex],
            ...data,
            updatedAt: new Date(),
          };
          
          // Validate the updated workspace
          const validation = validateWorkspace(updatedWorkspace);
          if (!validation.valid) {
            console.error('Workspace update validation failed:', validation.errors);
            throw new Error(validation.errors.join(', '));
          }
          
          state.workspaces[workspaceIndex] = updatedWorkspace;
        }
      });
    },

    /**
     * Delete a workspace
     * Requirements: 7.4 - Workspace deletion
     */
    deleteWorkspace: (id: string) => {
      set((state) => {
        state.workspaces = state.workspaces.filter((w) => w.id !== id);
        // If deleted workspace was current, clear it
        if (state.currentWorkspaceId === id) {
          state.currentWorkspaceId = null;
          // Also clear canvas
          state.nodes = [];
          state.edges = [];
          state.viewport = DEFAULT_VIEWPORT;
          state.selectedNodeId = null;
        }
      });
    },

    // ========================================
    // LAYOUT SLICE STATE
    // ========================================
    manuallyPositionedNodes: new Set<string>(),
    layoutDirection: 'LR' as LayoutDirection,

    // ========================================
    // LAYOUT SLICE ACTIONS
    // ========================================

    /**
     * Mark a node as manually positioned
     * Requirements: 8.3 - Track manually positioned nodes
     */
    markNodeAsManuallyPositioned: (nodeId: string) => {
      set((state) => {
        state.manuallyPositionedNodes = new Set([...state.manuallyPositionedNodes, nodeId]);
      });
    },

    /**
     * Clear manual position flag for a node
     */
    clearManuallyPositioned: (nodeId: string) => {
      set((state) => {
        const newSet = new Set(state.manuallyPositionedNodes);
        newSet.delete(nodeId);
        state.manuallyPositionedNodes = newSet;
      });
    },

    /**
     * Clear all manual position flags (for full re-layout)
     */
    clearAllManuallyPositioned: () => {
      set((state) => {
        state.manuallyPositionedNodes = new Set<string>();
      });
    },

    /**
     * Set layout direction
     * Requirements: 8.1 - Configure layout direction
     */
    setLayoutDirection: (direction: LayoutDirection) => {
      set((state) => {
        state.layoutDirection = direction;
      });
    },

    /**
     * Apply automatic layout to all nodes
     * Requirements: 8.1 - Use tree layout algorithm to position nodes
     */
    applyLayout: () => {
      set((state) => {
        const { nodes: layoutedNodes } = getLayoutedElements(
          state.nodes,
          state.edges,
          {
            direction: state.layoutDirection,
            manuallyPositionedNodes: state.manuallyPositionedNodes,
          }
        );
        state.nodes = layoutedNodes;
      });
    },

    /**
     * Apply layout only to descendants of a specific node
     * Requirements: 8.3 - Adjust only descendants during re-layout
     */
    applyLayoutToDescendants: (nodeId: string) => {
      set((state) => {
        const { nodes: layoutedNodes } = layoutDescendants(
          nodeId,
          state.nodes,
          state.edges,
          { direction: state.layoutDirection }
        );
        state.nodes = layoutedNodes;
      });
    },
  }))
);

// ============================================
// SELECTOR HOOKS (for optimized subscriptions)
// ============================================

/**
 * Select only nodes (prevents re-render when other state changes)
 */
export const useNodes = () => useMindNodeStore((state) => state.nodes);

/**
 * Select only edges
 */
export const useEdges = () => useMindNodeStore((state) => state.edges);

/**
 * Select viewport
 */
export const useViewport = () => useMindNodeStore((state) => state.viewport);

/**
 * Select selected node ID
 */
export const useSelectedNodeId = () => useMindNodeStore((state) => state.selectedNodeId);

/**
 * Select current workspace ID
 */
export const useCurrentWorkspaceId = () => useMindNodeStore((state) => state.currentWorkspaceId);

/**
 * Select current project ID
 */
export const useCurrentProjectId = () => useMindNodeStore((state) => state.currentProjectId);

/**
 * Select all workspaces
 */
export const useWorkspaces = () => useMindNodeStore((state) => state.workspaces);

/**
 * Select text selection state
 */
export const useTextSelection = () =>
  useMindNodeStore(
    useShallow((state) => ({
      selectedText: state.selectedText,
      selectionPosition: state.selectionPosition,
      selectionNodeId: state.selectionNodeId,
    }))
  );

/**
 * Get a specific node by ID
 */
export const useNodeById = (id: string) =>
  useMindNodeStore((state) => state.nodes.find((n) => n.id === id));

/**
 * Get children of a specific node
 */
export const useNodeChildren = (parentId: string) =>
  useMindNodeStore((state) => state.nodes.filter((n) => n.parentId === parentId));

/**
 * Check if any node is generating
 */
export const useIsAnyGenerating = () =>
  useMindNodeStore((state) => state.generatingNodes.size > 0);

/**
 * Select layout direction
 */
export const useLayoutDirection = () =>
  useMindNodeStore((state) => state.layoutDirection);

/**
 * Select manually positioned nodes
 */
export const useManuallyPositionedNodes = () =>
  useMindNodeStore((state) => state.manuallyPositionedNodes);

/**
 * Check if a node is manually positioned
 */
export const useIsNodeManuallyPositioned = (nodeId: string) =>
  useMindNodeStore((state) => state.manuallyPositionedNodes.has(nodeId));

/**
 * Select viewport dimensions
 */
export const useViewportDimensions = () =>
  useMindNodeStore((state) => state.viewportDimensions);

/**
 * Select visible nodes based on viewport culling
 * Requirements: 13.4 - Only render visible nodes to optimize performance
 * 
 * This selector computes which nodes are visible in the current viewport
 * and only triggers re-renders when the visible set changes.
 */
export const useVisibleNodes = (): MindNode[] =>
  useMindNodeStore(
    useShallow((state) => {
      const { nodes, viewport, viewportDimensions } = state;
      
      // Calculate viewport bounds in canvas coordinates
      const viewportBounds = calculateViewportBounds(
        viewport.x,
        viewport.y,
        viewportDimensions.width,
        viewportDimensions.height,
        viewport.zoom
      );
      
      // Filter to visible nodes with margin for smooth scrolling
      return getVisibleNodes(nodes, viewportBounds, 150);
    })
  );

/**
 * Select visible node IDs for efficient comparison
 * Requirements: 13.4 - Viewport culling optimization
 */
export const useVisibleNodeIds = (): Set<string> => {
  const visibleNodes = useVisibleNodes();
  return new Set(visibleNodes.map(n => n.id));
};

// ============================================
// OPTIMIZED ACTION SELECTORS
// Requirements: 13.1 - Efficient state subscriptions
// ============================================

/**
 * Select only canvas actions (prevents re-render on state changes)
 * Requirements: 13.1 - Efficient subscriptions
 */
export const useCanvasActions = () =>
  useMindNodeStore(
    useShallow((state) => ({
      addNode: state.addNode,
      updateNode: state.updateNode,
      updateNodePosition: state.updateNodePosition,
      deleteNode: state.deleteNode,
      setNodes: state.setNodes,
      setEdges: state.setEdges,
      setSelectedNode: state.setSelectedNode,
      setViewport: state.setViewport,
      setViewportDimensions: state.setViewportDimensions,
      resetCanvas: state.resetCanvas,
    }))
  );

/**
 * Select only AI actions
 * Requirements: 13.1 - Efficient subscriptions
 */
export const useAIActions = () =>
  useMindNodeStore(
    useShallow((state) => ({
      startGeneration: state.startGeneration,
      stopGeneration: state.stopGeneration,
      isGenerating: state.isGenerating,
    }))
  );

/**
 * Select only workspace actions
 * Requirements: 13.1 - Efficient subscriptions
 */
export const useWorkspaceActions = () =>
  useMindNodeStore(
    useShallow((state) => ({
      setCurrentWorkspace: state.setCurrentWorkspace,
      setCurrentProject: state.setCurrentProject,
      setWorkspaces: state.setWorkspaces,
      addWorkspace: state.addWorkspace,
      updateWorkspace: state.updateWorkspace,
      deleteWorkspace: state.deleteWorkspace,
    }))
  );

/**
 * Select only layout actions
 * Requirements: 13.1 - Efficient subscriptions
 */
export const useLayoutActions = () =>
  useMindNodeStore(
    useShallow((state) => ({
      markNodeAsManuallyPositioned: state.markNodeAsManuallyPositioned,
      clearManuallyPositioned: state.clearManuallyPositioned,
      clearAllManuallyPositioned: state.clearAllManuallyPositioned,
      setLayoutDirection: state.setLayoutDirection,
      applyLayout: state.applyLayout,
      applyLayoutToDescendants: state.applyLayoutToDescendants,
    }))
  );

/**
 * Select only selection actions
 * Requirements: 13.1 - Efficient subscriptions
 */
export const useSelectionActions = () =>
  useMindNodeStore(
    useShallow((state) => ({
      setSelection: state.setSelection,
      clearSelection: state.clearSelection,
    }))
  );

// ============================================
// MEMOIZED DERIVED STATE SELECTORS
// Requirements: 13.1 - Memoize derived state
// ============================================

/**
 * Get root node of current workspace
 * Memoized to prevent unnecessary recalculations
 */
export const useRootNode = () =>
  useMindNodeStore((state) => 
    state.nodes.find(n => n.type === 'root')
  );

/**
 * Get node count for performance monitoring
 */
export const useNodeCount = () =>
  useMindNodeStore((state) => state.nodes.length);

/**
 * Get edge count for performance monitoring
 */
export const useEdgeCount = () =>
  useMindNodeStore((state) => state.edges.length);

/**
 * Check if canvas has any nodes
 */
export const useHasNodes = () =>
  useMindNodeStore((state) => state.nodes.length > 0);

/**
 * Get selected node object (not just ID)
 * Memoized to prevent unnecessary re-renders
 */
export const useSelectedNode = () =>
  useMindNodeStore((state) => {
    if (!state.selectedNodeId) return null;
    return state.nodes.find(n => n.id === state.selectedNodeId) || null;
  });

/**
 * Get ancestors of a node (path from root to node)
 * Useful for context assembly
 */
export const useNodeAncestors = (nodeId: string): MindNode[] =>
  useMindNodeStore((state) => {
    const ancestors: MindNode[] = [];
    let currentId: string | null = nodeId;
    
    while (currentId) {
      const node = state.nodes.find(n => n.id === currentId);
      if (!node) break;
      ancestors.unshift(node);
      currentId = node.parentId;
    }
    
    return ancestors;
  });

/**
 * Get descendants of a node (all children recursively)
 */
export const useNodeDescendants = (nodeId: string): MindNode[] =>
  useMindNodeStore((state) => {
    const descendants: MindNode[] = [];
    const queue = [nodeId];
    
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const children = state.nodes.filter(n => n.parentId === currentId);
      descendants.push(...children);
      queue.push(...children.map(c => c.id));
    }
    
    return descendants;
  });
