/**
 * Context Assembly Engine
 * 
 * This module provides functions for assembling context from mind map nodes
 * for AI conversation generation. It handles path traversal from any node
 * to the root, building the context path that maintains logical inheritance.
 * 
 * Requirements: 3.2, 5.1, 4.4, 5.2
 */

import { MindNode, ContextNode, NodeType } from '@/types';

// ============================================
// CONSTANTS
// ============================================

/**
 * Maximum number of iterations to prevent infinite loops from circular references
 */
const MAX_TRAVERSAL_DEPTH = 1000;

/**
 * Default token limit for context (approximate, based on GPT-4 limits)
 */
const DEFAULT_TOKEN_LIMIT = 8000;

/**
 * Approximate characters per token (rough estimate for English text)
 */
const CHARS_PER_TOKEN = 4;

// ============================================
// PATH TRAVERSAL ALGORITHM
// ============================================

/**
 * Assembles the context path from a given node to the root node.
 * 
 * This function traverses the tree from the specified node upward to the root,
 * collecting all ancestor nodes in order. The resulting path is ordered from
 * root to the current node, maintaining the logical conversation flow.
 * 
 * Requirements: 3.2, 5.1
 * - Traverses from root node to current node in order
 * - Maintains context integrity across all depth levels
 * 
 * @param nodeId - The ID of the node to start traversal from
 * @param nodes - Map of all nodes keyed by their ID
 * @returns Array of ContextNode objects ordered from root to current node
 * 
 * @example
 * ```typescript
 * const nodes = new Map([
 *   ['root', { id: 'root', parentId: null, ... }],
 *   ['child1', { id: 'child1', parentId: 'root', ... }],
 *   ['grandchild', { id: 'grandchild', parentId: 'child1', ... }]
 * ]);
 * 
 * const path = assembleContext('grandchild', nodes);
 * // Returns: [rootContext, child1Context, grandchildContext]
 * ```
 */
export function assembleContext(
  nodeId: string,
  nodes: Map<string, MindNode>
): ContextNode[] {
  const path: ContextNode[] = [];
  const visited = new Set<string>();
  let currentId: string | null = nodeId;
  let iterations = 0;

  // Traverse from current node to root
  while (currentId !== null && iterations < MAX_TRAVERSAL_DEPTH) {
    iterations++;

    // Check for circular reference
    if (visited.has(currentId)) {
      console.warn(`Circular reference detected at node: ${currentId}`);
      break;
    }

    const node = nodes.get(currentId);
    
    // Handle orphaned node (node not found in map)
    if (!node) {
      console.warn(`Orphaned node reference: ${currentId}`);
      break;
    }

    visited.add(currentId);

    // Add node to the beginning of the path (we're traversing backwards)
    path.unshift({
      id: node.id,
      content: node.data.contextContent,
      type: node.type,
      selectionSource: node.data.selectionSource
    });

    currentId = node.parentId;
  }

  // Warn if we hit the iteration limit (possible infinite loop)
  if (iterations >= MAX_TRAVERSAL_DEPTH) {
    console.warn(`Max traversal depth reached (${MAX_TRAVERSAL_DEPTH}). Possible circular reference.`);
  }

  return path;
}

/**
 * Assembles context from an array of nodes instead of a Map.
 * Convenience function that converts the array to a Map first.
 * 
 * @param nodeId - The ID of the node to start traversal from
 * @param nodes - Array of all nodes
 * @returns Array of ContextNode objects ordered from root to current node
 */
export function assembleContextFromArray(
  nodeId: string,
  nodes: MindNode[]
): ContextNode[] {
  const nodeMap = new Map(nodes.map(node => [node.id, node]));
  return assembleContext(nodeId, nodeMap);
}

/**
 * Validates that a context path is properly ordered (root to leaf).
 * Each node's parent should be the previous node in the path.
 * 
 * @param path - The context path to validate
 * @param nodes - Map of all nodes for parent verification
 * @returns true if the path is valid, false otherwise
 */
export function validateContextPath(
  path: ContextNode[],
  nodes: Map<string, MindNode>
): boolean {
  if (path.length === 0) return true;
  
  // First node should be root (no parent)
  const firstNode = nodes.get(path[0].id);
  if (!firstNode || firstNode.parentId !== null) {
    return false;
  }

  // Each subsequent node's parent should be the previous node
  for (let i = 1; i < path.length; i++) {
    const currentNode = nodes.get(path[i].id);
    const previousNode = path[i - 1];
    
    if (!currentNode || currentNode.parentId !== previousNode.id) {
      return false;
    }
  }

  return true;
}

// ============================================
// EXPORTS
// ============================================

export { MAX_TRAVERSAL_DEPTH, DEFAULT_TOKEN_LIMIT, CHARS_PER_TOKEN };


// ============================================
// PROMPT CONSTRUCTION
// ============================================

/**
 * System prompt for AI responses in the mind map context
 */
const SYSTEM_PROMPT = `You are a logical analysis expert participating in a deep exploration within a mind map structure. Provide focused, contextual responses based on the conversation path.`;

/**
 * Options for building AI prompts
 */
export interface BuildPromptOptions {
  /** Maximum token limit for the prompt */
  tokenLimit?: number;
  /** Custom system prompt to use instead of default */
  systemPrompt?: string;
}

/**
 * Result of prompt building, including truncation info
 */
export interface PromptResult {
  /** The constructed prompt string */
  prompt: string;
  /** Whether the context was truncated due to token limits */
  wasTruncated: boolean;
  /** Number of context nodes included */
  includedNodes: number;
  /** Total nodes in original path */
  totalNodes: number;
}

/**
 * Estimates the token count for a string.
 * Uses a simple character-based approximation.
 * 
 * @param text - The text to estimate tokens for
 * @returns Estimated token count
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * Formats a single context node for inclusion in the prompt.
 * 
 * @param node - The context node to format
 * @returns Formatted string representation of the node
 */
function formatContextNode(node: ContextNode): string {
  const prefix = node.type === 'user' ? 'User' : node.type === 'ai' ? 'Assistant' : 'Root';
  let content = `${prefix}: ${node.content}`;

  // Include selection source if present
  if (node.selectionSource) {
    content += `\n[Selected text: "${node.selectionSource}"]`;
  }

  return content;
}

/**
 * Truncates the context path to fit within token limits.
 * 
 * Strategy: Keep root node + most recent nodes, truncate middle if needed.
 * This preserves the initial context and the most relevant recent conversation.
 * 
 * Requirements: 5.4 - Intelligent truncation while preserving critical context
 * 
 * @param contextPath - The full context path
 * @param tokenLimit - Maximum tokens allowed for context
 * @param reservedTokens - Tokens reserved for system prompt and other parts
 * @returns Truncated context path and truncation info
 */
function truncateContextPath(
  contextPath: ContextNode[],
  tokenLimit: number,
  reservedTokens: number
): { path: ContextNode[]; wasTruncated: boolean } {
  if (contextPath.length === 0) {
    return { path: [], wasTruncated: false };
  }

  const availableTokens = tokenLimit - reservedTokens;
  
  // Calculate tokens for each node
  const nodeTokens = contextPath.map(node => ({
    node,
    tokens: estimateTokens(formatContextNode(node))
  }));

  const totalTokens = nodeTokens.reduce((sum, n) => sum + n.tokens, 0);

  // If everything fits, return as-is
  if (totalTokens <= availableTokens) {
    return { path: contextPath, wasTruncated: false };
  }

  // Priority-based truncation: keep root + recent nodes
  const result: ContextNode[] = [];
  let usedTokens = 0;

  // Always include root node (first node)
  if (nodeTokens.length > 0) {
    result.push(nodeTokens[0].node);
    usedTokens += nodeTokens[0].tokens;
  }

  // Add nodes from the end (most recent) until we run out of space
  const recentNodes: ContextNode[] = [];
  for (let i = nodeTokens.length - 1; i > 0; i--) {
    const { node, tokens } = nodeTokens[i];
    if (usedTokens + tokens <= availableTokens) {
      recentNodes.unshift(node);
      usedTokens += tokens;
    } else {
      break;
    }
  }

  // Combine root + recent nodes
  result.push(...recentNodes);

  return { path: result, wasTruncated: true };
}

/**
 * Builds an AI prompt from the context path with optional selection source.
 * 
 * This function constructs a complete prompt for AI generation, including:
 * - System prompt for AI behavior
 * - Full context path from root to current node
 * - Selection source highlighting (if present)
 * - User message (if provided)
 * 
 * Requirements: 4.4, 5.2
 * - Includes both full context path and specific selected text in prompt
 * - Includes selectionSource as highlighted context
 * 
 * @param contextPath - Array of context nodes from root to current
 * @param userMessage - Optional user message to include
 * @param selectionSource - Optional selected text that triggered the branch
 * @param options - Additional options for prompt building
 * @returns PromptResult with the constructed prompt and metadata
 * 
 * @example
 * ```typescript
 * const path = assembleContext('node123', nodes);
 * const result = buildAIPrompt(path, 'What does this mean?', 'specific text');
 * console.log(result.prompt);
 * ```
 */
export function buildAIPrompt(
  contextPath: ContextNode[],
  userMessage?: string,
  selectionSource?: string,
  options: BuildPromptOptions = {}
): PromptResult {
  const {
    tokenLimit = DEFAULT_TOKEN_LIMIT,
    systemPrompt = SYSTEM_PROMPT
  } = options;

  // Calculate reserved tokens for system prompt, selection, and user message
  let reservedTokens = estimateTokens(systemPrompt) + 100; // 100 for formatting
  
  if (selectionSource) {
    reservedTokens += estimateTokens(selectionSource) + 50;
  }
  
  if (userMessage) {
    reservedTokens += estimateTokens(userMessage) + 50;
  }

  // Truncate context if needed
  const { path: truncatedPath, wasTruncated } = truncateContextPath(
    contextPath,
    tokenLimit,
    reservedTokens
  );

  // Build the context section
  const contextSection = truncatedPath
    .map(formatContextNode)
    .join('\n\n');

  // Construct the final prompt
  let finalPrompt = systemPrompt;

  if (contextSection) {
    finalPrompt += `\n\n## Conversation Path:\n${contextSection}`;
  }

  // Add selection source as highlighted context (Requirements: 4.4, 5.2)
  if (selectionSource) {
    finalPrompt += `\n\n## User Selected Text:\n"${selectionSource}"`;
  }

  if (userMessage) {
    finalPrompt += `\n\n## User Question:\n${userMessage}`;
  }

  // Add instruction based on context
  const instruction = selectionSource
    ? 'Provide a focused response based on the context path and the specific selected text.'
    : 'Provide a focused response based on the context path.';
  
  finalPrompt += `\n\nInstruction: ${instruction}`;

  return {
    prompt: finalPrompt,
    wasTruncated,
    includedNodes: truncatedPath.length,
    totalNodes: contextPath.length
  };
}

/**
 * Builds a prompt specifically for selection-based branches.
 * 
 * This is a convenience function that ensures the selection source
 * is properly included in the prompt for branches created from text selection.
 * 
 * Requirements: 4.2, 4.4
 * - Creates child node with selected text as context
 * - Includes both full context path and specific selected text
 * 
 * @param contextPath - Array of context nodes from root to current
 * @param selectionSource - The selected text that triggered the branch
 * @param options - Additional options for prompt building
 * @returns PromptResult with the constructed prompt
 */
export function buildSelectionBranchPrompt(
  contextPath: ContextNode[],
  selectionSource: string,
  options: BuildPromptOptions = {}
): PromptResult {
  if (!selectionSource || selectionSource.trim().length === 0) {
    throw new Error('Selection source is required for selection branch prompts');
  }

  return buildAIPrompt(
    contextPath,
    undefined,
    selectionSource,
    options
  );
}
