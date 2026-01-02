/**
 * Viewport Culling Utilities
 * 
 * Implements viewport culling to only render nodes within visible bounds.
 * This improves performance by reducing the number of rendered nodes.
 * 
 * Requirements:
 * - 13.4: Only render visible nodes to optimize performance
 */

import { MindNode } from '../../types';
import { NODE_WIDTH, NODE_HEIGHT } from '../layout';

// ============================================
// TYPES
// ============================================

export interface ViewportBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  zoom: number;
}

export interface NodeBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ============================================
// VIEWPORT CULLING FUNCTIONS
// ============================================

/**
 * Calculate the visible viewport bounds in canvas coordinates
 * Takes into account zoom level and pan position
 */
export function calculateViewportBounds(
  viewportX: number,
  viewportY: number,
  viewportWidth: number,
  viewportHeight: number,
  zoom: number
): ViewportBounds {
  // Convert screen coordinates to canvas coordinates
  // React Flow's viewport x,y represent the translation of the canvas
  // Negative values mean the canvas has been panned to the right/down
  const canvasX = -viewportX / zoom;
  const canvasY = -viewportY / zoom;
  const canvasWidth = viewportWidth / zoom;
  const canvasHeight = viewportHeight / zoom;

  return {
    x: canvasX,
    y: canvasY,
    width: canvasWidth,
    height: canvasHeight,
    zoom,
  };
}

/**
 * Get the bounding box of a node
 */
export function getNodeBounds(node: MindNode): NodeBounds {
  return {
    x: node.position.x,
    y: node.position.y,
    width: NODE_WIDTH,
    height: NODE_HEIGHT,
  };
}

/**
 * Check if two rectangles intersect
 * Used to determine if a node is within the viewport
 */
export function rectanglesIntersect(
  rect1: { x: number; y: number; width: number; height: number },
  rect2: { x: number; y: number; width: number; height: number }
): boolean {
  return !(
    rect1.x + rect1.width < rect2.x ||
    rect2.x + rect2.width < rect1.x ||
    rect1.y + rect1.height < rect2.y ||
    rect2.y + rect2.height < rect1.y
  );
}

/**
 * Check if a node is within the viewport bounds
 * Includes a margin to prevent popping when nodes are near the edge
 * 
 * Requirements:
 * - 13.4: Only render visible nodes to optimize performance
 */
export function isNodeInViewport(
  node: MindNode,
  viewportBounds: ViewportBounds,
  margin: number = 100 // Extra margin to prevent popping
): boolean {
  const nodeBounds = getNodeBounds(node);
  
  // Expand viewport bounds by margin
  const expandedViewport = {
    x: viewportBounds.x - margin,
    y: viewportBounds.y - margin,
    width: viewportBounds.width + margin * 2,
    height: viewportBounds.height + margin * 2,
  };

  return rectanglesIntersect(nodeBounds, expandedViewport);
}

/**
 * Filter nodes to only include those within the viewport
 * 
 * Requirements:
 * - 13.4: Only render visible nodes to optimize performance
 * 
 * @param nodes - All nodes in the canvas
 * @param viewportBounds - Current viewport bounds
 * @param margin - Extra margin around viewport (default 100px)
 * @returns Array of nodes that are within or near the viewport
 */
export function getVisibleNodes(
  nodes: MindNode[],
  viewportBounds: ViewportBounds,
  margin: number = 100
): MindNode[] {
  return nodes.filter(node => isNodeInViewport(node, viewportBounds, margin));
}

/**
 * Get node IDs that are visible in the viewport
 * Useful for selective rendering and memoization
 */
export function getVisibleNodeIds(
  nodes: MindNode[],
  viewportBounds: ViewportBounds,
  margin: number = 100
): Set<string> {
  const visibleIds = new Set<string>();
  
  for (const node of nodes) {
    if (isNodeInViewport(node, viewportBounds, margin)) {
      visibleIds.add(node.id);
    }
  }
  
  return visibleIds;
}

/**
 * Calculate the percentage of nodes that are visible
 * Useful for debugging and performance monitoring
 */
export function getVisibilityRatio(
  totalNodes: number,
  visibleNodes: number
): number {
  if (totalNodes === 0) return 1;
  return visibleNodes / totalNodes;
}

// ============================================
// EXPORTS
// ============================================

export default {
  calculateViewportBounds,
  getNodeBounds,
  rectanglesIntersect,
  isNodeInViewport,
  getVisibleNodes,
  getVisibleNodeIds,
  getVisibilityRatio,
};
