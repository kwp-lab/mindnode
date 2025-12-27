/**
 * Layout Engine using Dagre for automatic tree layout
 * Requirements: 8.1 - Automatic layout algorithm for tree positioning
 */

import dagre from 'dagre';
import { MindNode, Edge } from '../../types';

// ============================================
// CONSTANTS
// ============================================

/** Default node dimensions for layout calculations */
export const NODE_WIDTH = 300;
export const NODE_HEIGHT = 150;

/** Default spacing between nodes */
export const NODE_SEP = 80;  // Horizontal spacing between nodes at same level
export const RANK_SEP = 150; // Vertical spacing between levels

/** Layout direction options */
export type LayoutDirection = 'TB' | 'LR' | 'BT' | 'RL';

// ============================================
// LAYOUT OPTIONS
// ============================================

export interface LayoutOptions {
  /** Direction of the layout: TB (top-bottom), LR (left-right), BT, RL */
  direction?: LayoutDirection;
  /** Width of each node for layout calculations */
  nodeWidth?: number;
  /** Height of each node for layout calculations */
  nodeHeight?: number;
  /** Horizontal spacing between nodes at the same level */
  nodeSep?: number;
  /** Spacing between levels/ranks */
  rankSep?: number;
  /** Set of node IDs that have been manually positioned and should be preserved */
  manuallyPositionedNodes?: Set<string>;
}

// ============================================
// LAYOUT RESULT
// ============================================

export interface LayoutResult {
  nodes: MindNode[];
  edges: Edge[];
}

// ============================================
// CORE LAYOUT FUNCTION
// ============================================

/**
 * Applies Dagre tree layout algorithm to position nodes automatically.
 * 
 * @param nodes - Array of MindNode objects to layout
 * @param edges - Array of Edge objects defining relationships
 * @param options - Layout configuration options
 * @returns Object containing layouted nodes and edges
 * 
 * Requirements: 8.1 - Use tree layout algorithm to position nodes
 */
export function getLayoutedElements(
  nodes: MindNode[],
  edges: Edge[],
  options: LayoutOptions = {}
): LayoutResult {
  const {
    direction = 'LR',
    nodeWidth = NODE_WIDTH,
    nodeHeight = NODE_HEIGHT,
    nodeSep = NODE_SEP,
    rankSep = RANK_SEP,
    manuallyPositionedNodes = new Set<string>(),
  } = options;

  // Handle empty input
  if (nodes.length === 0) {
    return { nodes: [], edges };
  }

  // Create a new directed graph
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  // Configure the graph layout
  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: nodeSep,
    ranksep: rankSep,
    marginx: 50,
    marginy: 50,
  });

  // Add nodes to the graph
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  // Add edges to the graph
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // Run the layout algorithm
  dagre.layout(dagreGraph);

  // Apply calculated positions to nodes
  const layoutedNodes = nodes.map((node) => {
    // Skip manually positioned nodes - preserve their position
    if (manuallyPositionedNodes.has(node.id)) {
      return node;
    }

    const nodeWithPosition = dagreGraph.node(node.id);
    
    // Dagre returns center position, convert to top-left corner
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}

// ============================================
// LAYOUT WITH MANUAL POSITION PRESERVATION
// ============================================

/**
 * Applies layout while preserving manually positioned nodes.
 * Only adjusts descendants of manually positioned nodes.
 * 
 * @param nodes - Array of MindNode objects
 * @param edges - Array of Edge objects
 * @param manuallyPositionedNodes - Set of node IDs that were manually positioned
 * @param options - Additional layout options
 * @returns Layouted nodes and edges
 * 
 * Requirements: 8.3 - Respect manually positioned nodes
 */
export function getLayoutedElementsWithManualPreservation(
  nodes: MindNode[],
  edges: Edge[],
  manuallyPositionedNodes: Set<string>,
  options: Omit<LayoutOptions, 'manuallyPositionedNodes'> = {}
): LayoutResult {
  return getLayoutedElements(nodes, edges, {
    ...options,
    manuallyPositionedNodes,
  });
}

// ============================================
// DESCENDANT LAYOUT
// ============================================

/**
 * Gets all descendant node IDs for a given node.
 * 
 * @param nodeId - The parent node ID
 * @param nodes - All nodes in the tree
 * @returns Set of descendant node IDs
 */
export function getDescendantIds(nodeId: string, nodes: MindNode[]): Set<string> {
  const descendants = new Set<string>();
  
  const findDescendants = (parentId: string) => {
    nodes.forEach((node) => {
      if (node.parentId === parentId && !descendants.has(node.id)) {
        descendants.add(node.id);
        findDescendants(node.id);
      }
    });
  };
  
  findDescendants(nodeId);
  return descendants;
}

/**
 * Applies layout only to descendants of a specific node.
 * Useful when a node is manually repositioned and only its subtree needs re-layout.
 * 
 * @param rootNodeId - The node whose descendants should be re-layouted
 * @param nodes - All nodes in the tree
 * @param edges - All edges in the tree
 * @param options - Layout options
 * @returns Layouted nodes and edges
 * 
 * Requirements: 8.3 - Adjust only descendants during re-layout
 */
export function layoutDescendants(
  rootNodeId: string,
  nodes: MindNode[],
  edges: Edge[],
  options: Omit<LayoutOptions, 'manuallyPositionedNodes'> = {}
): LayoutResult {
  const descendantIds = getDescendantIds(rootNodeId, nodes);
  
  // Include the root node itself in the layout
  descendantIds.add(rootNodeId);
  
  // Filter nodes and edges to only include the subtree
  const subtreeNodes = nodes.filter((node) => descendantIds.has(node.id));
  const subtreeEdges = edges.filter(
    (edge) => descendantIds.has(edge.source) && descendantIds.has(edge.target)
  );
  
  // Get the root node's current position as the anchor
  const rootNode = nodes.find((n) => n.id === rootNodeId);
  if (!rootNode) {
    return { nodes, edges };
  }
  
  // Layout the subtree
  const { nodes: layoutedSubtree } = getLayoutedElements(subtreeNodes, subtreeEdges, options);
  
  // Calculate offset to maintain root node position
  const layoutedRoot = layoutedSubtree.find((n) => n.id === rootNodeId);
  if (!layoutedRoot) {
    return { nodes, edges };
  }
  
  const offsetX = rootNode.position.x - layoutedRoot.position.x;
  const offsetY = rootNode.position.y - layoutedRoot.position.y;
  
  // Apply offset to all layouted nodes
  const adjustedSubtree = layoutedSubtree.map((node) => ({
    ...node,
    position: {
      x: node.position.x + offsetX,
      y: node.position.y + offsetY,
    },
  }));
  
  // Merge back with non-subtree nodes
  const nodeMap = new Map(adjustedSubtree.map((n) => [n.id, n]));
  const finalNodes = nodes.map((node) => nodeMap.get(node.id) || node);
  
  return { nodes: finalNodes, edges };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Checks if two node bounding boxes overlap.
 * 
 * @param node1 - First node
 * @param node2 - Second node
 * @param nodeWidth - Width of nodes
 * @param nodeHeight - Height of nodes
 * @returns True if nodes overlap
 */
export function nodesOverlap(
  node1: MindNode,
  node2: MindNode,
  nodeWidth: number = NODE_WIDTH,
  nodeHeight: number = NODE_HEIGHT
): boolean {
  const rect1 = {
    left: node1.position.x,
    right: node1.position.x + nodeWidth,
    top: node1.position.y,
    bottom: node1.position.y + nodeHeight,
  };
  
  const rect2 = {
    left: node2.position.x,
    right: node2.position.x + nodeWidth,
    top: node2.position.y,
    bottom: node2.position.y + nodeHeight,
  };
  
  return !(
    rect1.right <= rect2.left ||
    rect1.left >= rect2.right ||
    rect1.bottom <= rect2.top ||
    rect1.top >= rect2.bottom
  );
}

/**
 * Checks if any nodes in the array overlap with each other.
 * 
 * @param nodes - Array of nodes to check
 * @param nodeWidth - Width of nodes
 * @param nodeHeight - Height of nodes
 * @returns True if any nodes overlap
 * 
 * Requirements: 8.2 - Ensure no nodes overlap after layout
 */
export function hasOverlappingNodes(
  nodes: MindNode[],
  nodeWidth: number = NODE_WIDTH,
  nodeHeight: number = NODE_HEIGHT
): boolean {
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      if (nodesOverlap(nodes[i], nodes[j], nodeWidth, nodeHeight)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Calculates the bounding box of all nodes.
 * 
 * @param nodes - Array of nodes
 * @param nodeWidth - Width of nodes
 * @param nodeHeight - Height of nodes
 * @returns Bounding box coordinates
 */
export function getNodesBoundingBox(
  nodes: MindNode[],
  nodeWidth: number = NODE_WIDTH,
  nodeHeight: number = NODE_HEIGHT
): { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number } {
  if (nodes.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }
  
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  
  nodes.forEach((node) => {
    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxX = Math.max(maxX, node.position.x + nodeWidth);
    maxY = Math.max(maxY, node.position.y + nodeHeight);
  });
  
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}
