/**
 * Export Module
 * 
 * This module provides functions for exporting mind map trees to Markdown format.
 * It handles tree traversal, heading level mapping, and content formatting.
 * 
 * Requirements: 11.1, 11.2, 11.3
 * - Generate hierarchical Markdown document
 * - Represent tree structure using Markdown heading levels
 * - Preserve all node content and formatting
 */

import { MindNode } from '@/types';

// ============================================
// CONSTANTS
// ============================================

/**
 * Maximum heading level in Markdown (h1-h6)
 */
const MAX_HEADING_LEVEL = 6;

/**
 * Default heading level for nodes beyond MAX_HEADING_LEVEL depth
 */
const OVERFLOW_INDENT_CHARS = '  ';

// ============================================
// TYPES
// ============================================

/**
 * Options for export configuration
 */
export interface ExportOptions {
  /** Include node type indicators (user/ai) in output */
  includeNodeTypes?: boolean;
  /** Include selection source annotations */
  includeSelectionSource?: boolean;
  /** Custom title for the exported document */
  title?: string;
  /** Starting heading level (1-6) */
  startingHeadingLevel?: number;
}

/**
 * Result of export operation
 */
export interface ExportResult {
  /** The generated Markdown content */
  markdown: string;
  /** Number of nodes exported */
  nodeCount: number;
  /** Maximum depth of the exported tree */
  maxDepth: number;
}

/**
 * Internal node structure for tree traversal
 */
interface TreeNode {
  node: MindNode;
  children: TreeNode[];
  depth: number;
}

// ============================================
// TREE BUILDING
// ============================================

/**
 * Builds a tree structure from a flat array of nodes.
 * 
 * @param nodes - Array of MindNode objects
 * @param rootId - Optional root node ID to start from (for branch export)
 * @returns TreeNode representing the root of the tree, or null if not found
 */
export function buildTree(nodes: MindNode[], rootId?: string): TreeNode | null {
  if (nodes.length === 0) return null;

  // Create a map for quick lookup
  const nodeMap = new Map<string, MindNode>(nodes.map(n => [n.id, n]));
  
  // Create a map of children for each node
  const childrenMap = new Map<string, MindNode[]>();
  
  for (const node of nodes) {
    if (node.parentId) {
      const siblings = childrenMap.get(node.parentId) || [];
      siblings.push(node);
      childrenMap.set(node.parentId, siblings);
    }
  }

  // Find the root node
  let rootNode: MindNode | undefined;
  
  if (rootId) {
    // Use specified root for branch export
    rootNode = nodeMap.get(rootId);
  } else {
    // Find the actual root (node with no parent)
    rootNode = nodes.find(n => n.parentId === null);
  }

  if (!rootNode) return null;

  // Build tree recursively
  function buildTreeNode(node: MindNode, depth: number): TreeNode {
    const children = childrenMap.get(node.id) || [];
    
    // Sort children by position (top to bottom, left to right)
    children.sort((a, b) => {
      if (a.position.y !== b.position.y) {
        return a.position.y - b.position.y;
      }
      return a.position.x - b.position.x;
    });

    return {
      node,
      children: children.map(child => buildTreeNode(child, depth + 1)),
      depth
    };
  }

  return buildTreeNode(rootNode, 0);
}

// ============================================
// MARKDOWN GENERATION
// ============================================

/**
 * Generates a Markdown heading for a given depth level.
 * 
 * For depths 0-5, uses Markdown headings (# to ######).
 * For deeper levels, uses indented bullet points.
 * 
 * @param depth - The depth level (0 = root)
 * @param startingLevel - The starting heading level (default 1)
 * @returns The heading prefix string
 */
function getHeadingPrefix(depth: number, startingLevel: number = 1): string {
  const effectiveLevel = depth + startingLevel;
  
  if (effectiveLevel <= MAX_HEADING_LEVEL) {
    return '#'.repeat(effectiveLevel) + ' ';
  }
  
  // For deeper levels, use indented bullet points
  const indentLevel = effectiveLevel - MAX_HEADING_LEVEL;
  return OVERFLOW_INDENT_CHARS.repeat(indentLevel) + '- ';
}

/**
 * Formats a node's content for Markdown export.
 * 
 * @param node - The MindNode to format
 * @param options - Export options
 * @returns Formatted content string
 */
function formatNodeContent(node: MindNode, options: ExportOptions): string {
  let content = node.data.contextContent || node.data.label || '';
  
  // Add node type indicator if requested
  if (options.includeNodeTypes && node.type !== 'root') {
    const typeIndicator = node.type === 'ai' ? '🤖 ' : '👤 ';
    content = typeIndicator + content;
  }
  
  return content;
}

/**
 * Formats selection source annotation if present.
 * 
 * @param node - The MindNode to check
 * @param options - Export options
 * @returns Selection source annotation or empty string
 */
function formatSelectionSource(node: MindNode, options: ExportOptions): string {
  if (!options.includeSelectionSource || !node.data.selectionSource) {
    return '';
  }
  
  return `\n\n> *Selected from: "${node.data.selectionSource}"*`;
}

/**
 * Recursively generates Markdown for a tree node and its children.
 * 
 * @param treeNode - The tree node to process
 * @param options - Export options
 * @param lines - Array to accumulate output lines
 */
function generateMarkdownRecursive(
  treeNode: TreeNode,
  options: ExportOptions,
  lines: string[]
): void {
  const { node, children, depth } = treeNode;
  const startingLevel = options.startingHeadingLevel || 1;
  
  // Generate heading/bullet for this node
  const prefix = getHeadingPrefix(depth, startingLevel);
  const content = formatNodeContent(node, options);
  const selectionAnnotation = formatSelectionSource(node, options);
  
  // Add the node content
  if (content.trim()) {
    // For headings, put content on same line
    // For bullet points at deep levels, also on same line
    lines.push(prefix + content + selectionAnnotation);
    lines.push(''); // Empty line after each node
  }
  
  // Process children
  for (const child of children) {
    generateMarkdownRecursive(child, options, lines);
  }
}

/**
 * Calculates the maximum depth of a tree.
 * 
 * @param treeNode - The root tree node
 * @returns Maximum depth (0 for single node)
 */
function calculateMaxDepth(treeNode: TreeNode): number {
  if (treeNode.children.length === 0) {
    return treeNode.depth;
  }
  
  return Math.max(...treeNode.children.map(calculateMaxDepth));
}

/**
 * Counts total nodes in a tree.
 * 
 * @param treeNode - The root tree node
 * @returns Total node count
 */
function countNodes(treeNode: TreeNode): number {
  return 1 + treeNode.children.reduce((sum, child) => sum + countNodes(child), 0);
}

// ============================================
// MAIN EXPORT FUNCTIONS
// ============================================

/**
 * Exports a mind map tree to hierarchical Markdown format.
 * 
 * This function traverses the tree structure and generates a Markdown document
 * where tree depth is represented using heading levels (h1-h6) and indented
 * bullet points for deeper levels.
 * 
 * Requirements: 11.1, 11.2, 11.3
 * - Generates hierarchical Markdown document
 * - Represents tree structure using Markdown heading levels
 * - Preserves all node content and formatting
 * 
 * @param nodes - Array of MindNode objects to export
 * @param options - Export configuration options
 * @returns ExportResult with Markdown content and metadata
 * 
 * @example
 * ```typescript
 * const result = exportToMarkdown(nodes, { 
 *   title: 'My Mind Map',
 *   includeNodeTypes: true 
 * });
 * console.log(result.markdown);
 * ```
 */
export function exportToMarkdown(
  nodes: MindNode[],
  options: ExportOptions = {}
): ExportResult {
  const tree = buildTree(nodes);
  
  if (!tree) {
    return {
      markdown: '',
      nodeCount: 0,
      maxDepth: 0
    };
  }
  
  const lines: string[] = [];
  
  // Add custom title if provided
  if (options.title) {
    lines.push(`# ${options.title}`);
    lines.push('');
    // Adjust starting level since we used h1 for title
    options = { ...options, startingHeadingLevel: (options.startingHeadingLevel || 1) + 1 };
  }
  
  // Generate Markdown content
  generateMarkdownRecursive(tree, options, lines);
  
  // Remove trailing empty lines
  while (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop();
  }
  
  return {
    markdown: lines.join('\n'),
    nodeCount: countNodes(tree),
    maxDepth: calculateMaxDepth(tree)
  };
}

/**
 * Exports a specific branch (subtree) to Markdown format.
 * 
 * This function exports only the specified node and its descendants,
 * useful for exporting individual branches of a larger mind map.
 * 
 * Requirements: 11.5
 * - Support exporting individual branches as well as entire workspaces
 * 
 * @param nodes - Array of all MindNode objects
 * @param branchRootId - ID of the node to use as the branch root
 * @param options - Export configuration options
 * @returns ExportResult with Markdown content and metadata
 * 
 * @example
 * ```typescript
 * const result = exportBranchToMarkdown(nodes, 'node-123', { 
 *   title: 'Branch Export' 
 * });
 * ```
 */
export function exportBranchToMarkdown(
  nodes: MindNode[],
  branchRootId: string,
  options: ExportOptions = {}
): ExportResult {
  // Filter to only include the branch root and its descendants
  const branchNodes = filterBranchNodes(nodes, branchRootId);
  
  if (branchNodes.length === 0) {
    return {
      markdown: '',
      nodeCount: 0,
      maxDepth: 0
    };
  }
  
  // Build tree starting from the branch root
  const tree = buildTree(branchNodes, branchRootId);
  
  if (!tree) {
    return {
      markdown: '',
      nodeCount: 0,
      maxDepth: 0
    };
  }
  
  const lines: string[] = [];
  
  // Add custom title if provided
  if (options.title) {
    lines.push(`# ${options.title}`);
    lines.push('');
    options = { ...options, startingHeadingLevel: (options.startingHeadingLevel || 1) + 1 };
  }
  
  // Generate Markdown content
  generateMarkdownRecursive(tree, options, lines);
  
  // Remove trailing empty lines
  while (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop();
  }
  
  return {
    markdown: lines.join('\n'),
    nodeCount: countNodes(tree),
    maxDepth: calculateMaxDepth(tree)
  };
}

/**
 * Filters nodes to include only a specific branch (node and its descendants).
 * 
 * @param nodes - Array of all nodes
 * @param branchRootId - ID of the branch root node
 * @returns Array of nodes in the branch
 */
function filterBranchNodes(nodes: MindNode[], branchRootId: string): MindNode[] {
  const nodeMap = new Map<string, MindNode>(nodes.map(n => [n.id, n]));
  const branchRoot = nodeMap.get(branchRootId);
  
  if (!branchRoot) return [];
  
  // Build set of all descendant IDs
  const branchIds = new Set<string>([branchRootId]);
  
  // Iteratively find all descendants
  let changed = true;
  while (changed) {
    changed = false;
    for (const node of nodes) {
      if (node.parentId && branchIds.has(node.parentId) && !branchIds.has(node.id)) {
        branchIds.add(node.id);
        changed = true;
      }
    }
  }
  
  // Filter and adjust the branch root to have no parent (for tree building)
  return nodes
    .filter(n => branchIds.has(n.id))
    .map(n => n.id === branchRootId ? { ...n, parentId: null } : n);
}

/**
 * Creates a downloadable Blob from Markdown content.
 * 
 * @param markdown - The Markdown content
 * @returns Blob object for download
 */
export function createMarkdownBlob(markdown: string): Blob {
  return new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
}

/**
 * Generates a filename for the exported Markdown file.
 * 
 * @param title - Optional title to use in filename
 * @returns Sanitized filename with .md extension
 */
export function generateExportFilename(title?: string): string {
  const baseName = title 
    ? title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    : 'mindmap-export';
  
  const timestamp = new Date().toISOString().slice(0, 10);
  return `${baseName}-${timestamp}.md`;
}

/**
 * Triggers a browser download for the Markdown content.
 * 
 * Requirements: 11.4
 * - Provide download link for the Markdown file
 * 
 * @param markdown - The Markdown content to download
 * @param filename - The filename for the download
 */
export function downloadMarkdown(markdown: string, filename: string): void {
  const blob = createMarkdownBlob(markdown);
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up the URL object
  URL.revokeObjectURL(url);
}
