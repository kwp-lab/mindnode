'use client';

/**
 * MindNodeComponent - Custom React Flow node for mind map nodes
 * 
 * Implements:
 * - Task 8.1: View/edit modes with Markdown rendering
 * - Task 8.3: XSS sanitization with DOMPurify
 * - Task 8.5: Visual states (user/ai/selected/editing/generating)
 * 
 * Requirements:
 * - 2.4: Display content with Markdown rendering
 * - 9.1: Render Markdown content with proper formatting in view mode
 * - 9.2: Display raw Markdown text in textarea in edit mode
 * - 9.5: Sanitize Markdown input to prevent XSS attacks
 * - 14.1-14.5: Visual states for different node types
 */

import React, { useCallback, memo, useMemo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import DOMPurify from 'dompurify';
import { useMindNodeStore } from '../store';
import { NodeType } from '../types';
import SuggestionBubbles from './SuggestionBubbles';

// ============================================
// TYPES
// ============================================

export interface MindNodeData {
  label: string;
  contextContent: string;
  selectionSource?: string;
  nodeType: NodeType;
  parentId: string | null;
  workspaceId: string;
  isEditing?: boolean;
  isGenerating?: boolean;
  suggestions?: string[];
  error?: {
    message: string;
    canRetry: boolean;
  };
  /** Callback for when a suggestion is clicked */
  onSuggestionClick?: (suggestion: string, nodeId: string) => void;
}

// ============================================
// XSS SANITIZATION
// ============================================

/**
 * Configure DOMPurify for safe Markdown rendering
 * Requirements: 9.5 - Sanitize Markdown input to prevent XSS attacks
 */
const DOMPURIFY_CONFIG = {
  ALLOWED_TAGS: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'br', 'hr',
    'ul', 'ol', 'li',
    'strong', 'em', 'b', 'i', 'u', 's', 'del',
    'code', 'pre',
    'blockquote',
    'a',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'img',
    'span', 'div',
  ] as string[],
  ALLOWED_ATTR: [
    'href', 'target', 'rel',
    'src', 'alt', 'title', 'width', 'height',
    'class', 'id',
  ] as string[],
  FORBID_TAGS: ['script', 'style', 'iframe', 'form', 'input', 'button'] as string[],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'] as string[],
  ALLOW_DATA_ATTR: false,
};

/**
 * Sanitize content to prevent XSS attacks
 * Requirements: 9.5 - XSS sanitization
 */
export function sanitizeContent(content: string): string {
  return DOMPurify.sanitize(content, DOMPURIFY_CONFIG);
}

// ============================================
// STYLES
// ============================================

/**
 * Get node container styles based on state
 * Requirements: 14.1-14.5 - Visual states for different node types
 */
const getNodeStyles = (
  nodeType: NodeType,
  isSelected: boolean,
  isEditing: boolean,
  isGenerating: boolean
): string => {
  const baseStyles = `
    rounded-lg shadow-md border-2 p-4 min-w-[280px] max-w-[320px] min-h-[100px]
    transition-all duration-200 ease-in-out
  `;
  
  // Node type colors - Requirements: 14.1, 14.2
  let typeStyles = '';
  switch (nodeType) {
    case 'root':
      typeStyles = 'bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-400';
      break;
    case 'ai':
      typeStyles = 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-400';
      break;
    case 'user':
    default:
      typeStyles = 'bg-gradient-to-br from-blue-50 to-sky-50 border-blue-400';
      break;
  }
  
  // Selection state - Requirements: 14.3
  const selectionStyles = isSelected 
    ? 'ring-2 ring-offset-2 ring-blue-500 shadow-lg scale-[1.02]' 
    : '';
  
  // Editing state - Requirements: 14.4
  const editingStyles = isEditing 
    ? 'ring-2 ring-yellow-400 border-yellow-400 shadow-yellow-100' 
    : '';
  
  // Generating state - Requirements: 14.5
  const generatingStyles = isGenerating 
    ? 'animate-pulse border-dashed border-emerald-500' 
    : '';
  
  return `${baseStyles} ${typeStyles} ${selectionStyles} ${editingStyles} ${generatingStyles}`.trim();
};

/**
 * Get node type label text
 */
const getNodeTypeLabel = (nodeType: NodeType): string => {
  switch (nodeType) {
    case 'root':
      return '🌱 Root';
    case 'ai':
      return '🤖 AI';
    case 'user':
    default:
      return '👤 User';
  }
};

/**
 * Get badge styles based on node type
 */
const getNodeTypeBadgeStyles = (nodeType: NodeType): string => {
  switch (nodeType) {
    case 'root':
      return 'bg-indigo-100 text-indigo-700 border border-indigo-200';
    case 'ai':
      return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
    case 'user':
    default:
      return 'bg-blue-100 text-blue-700 border border-blue-200';
  }
};

// ============================================
// MARKDOWN COMPONENTS
// ============================================

/**
 * Custom components for ReactMarkdown rendering
 * Requirements: 9.1, 9.3 - Support headings, lists, code blocks, and emphasis
 */
const markdownComponents = {
  // Headings
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="text-lg font-bold text-gray-800 mb-2 mt-1">{children}</h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="text-base font-bold text-gray-800 mb-2 mt-1">{children}</h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="text-sm font-bold text-gray-800 mb-1 mt-1">{children}</h3>
  ),
  // Paragraphs
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="text-sm text-gray-700 mb-2 last:mb-0 leading-relaxed">{children}</p>
  ),
  // Lists
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="list-disc list-inside text-sm text-gray-700 mb-2 space-y-1">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="list-decimal list-inside text-sm text-gray-700 mb-2 space-y-1">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="text-sm text-gray-700">{children}</li>
  ),
  // Code
  code: ({ className, children }: { className?: string; children?: React.ReactNode }) => {
    const isInline = !className;
    if (isInline) {
      return (
        <code className="bg-gray-100 text-pink-600 px-1 py-0.5 rounded text-xs font-mono">
          {children}
        </code>
      );
    }
    return (
      <code className={`${className} block bg-gray-800 text-gray-100 p-2 rounded text-xs font-mono overflow-x-auto`}>
        {children}
      </code>
    );
  },
  pre: ({ children }: { children?: React.ReactNode }) => (
    <pre className="bg-gray-800 text-gray-100 p-2 rounded text-xs font-mono overflow-x-auto mb-2">
      {children}
    </pre>
  ),
  // Blockquote
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="border-l-4 border-gray-300 pl-3 italic text-gray-600 text-sm mb-2">
      {children}
    </blockquote>
  ),
  // Links
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a 
      href={href} 
      target="_blank" 
      rel="noopener noreferrer"
      className="text-blue-600 hover:text-blue-800 underline"
    >
      {children}
    </a>
  ),
  // Strong/Bold
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold text-gray-800">{children}</strong>
  ),
  // Emphasis/Italic
  em: ({ children }: { children?: React.ReactNode }) => (
    <em className="italic">{children}</em>
  ),
};

// ============================================
// COMPONENT
// ============================================

function MindNodeComponent({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as MindNodeData;
  const { updateNode } = useMindNodeStore();
  
  const {
    label,
    contextContent,
    nodeType,
    isEditing = false,
    isGenerating = false,
    suggestions = [],
    error,
    onSuggestionClick,
  } = nodeData;

  /**
   * Sanitized content for Markdown rendering
   * Requirements: 9.5 - XSS sanitization
   */
  const sanitizedContent = useMemo(() => {
    const content = label || contextContent || '';
    return sanitizeContent(content);
  }, [label, contextContent]);

  /**
   * Handle double-click to enter edit mode
   * Requirements: 9.2 - Switch to edit mode
   */
  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!isGenerating) {
        updateNode(id, { isEditing: true });
      }
    },
    [id, updateNode, isGenerating]
  );

  /**
   * Handle content change in edit mode
   * Requirements: 9.2 - Edit raw Markdown text
   */
  const handleContentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newContent = e.target.value;
      updateNode(id, { 
        label: newContent,
        contextContent: newContent,
      });
    },
    [id, updateNode]
  );

  /**
   * Handle blur to exit edit mode and save
   * Requirements: 2.5 - Save content and exit edit mode on click outside
   */
  const handleBlur = useCallback(() => {
    updateNode(id, { isEditing: false });
  }, [id, updateNode]);

  /**
   * Handle key down in textarea
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Escape') {
        updateNode(id, { isEditing: false });
      }
      // Prevent Tab and Enter from bubbling when editing
      // to avoid creating new nodes while typing
      if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey)) {
        e.stopPropagation();
      }
    },
    [id, updateNode]
  );

  /**
   * Handle suggestion click
   * Requirements: 6.4 - Create child node with suggestion on click
   */
  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      if (onSuggestionClick) {
        onSuggestionClick(suggestion, id);
      } else {
        // Dispatch custom event for suggestion click - will be handled by CanvasWorkspace
        const event = new CustomEvent('mindnode:suggestion', {
          detail: { nodeId: id, suggestion },
          bubbles: true,
        });
        document.dispatchEvent(event);
      }
    },
    [id, onSuggestionClick]
  );

  // Show suggestions only for AI nodes that are not generating and have suggestions
  const showSuggestions = nodeType === 'ai' && !isGenerating && !isEditing && suggestions.length > 0;

  return (
    <div
      className={getNodeStyles(nodeType, selected || false, isEditing, isGenerating)}
      onDoubleClick={handleDoubleClick}
      data-node-id={id}
      data-testid={`node-${id}`}
    >
      {/* Input handle (left side) - not shown for root nodes */}
      {nodeType !== 'root' && (
        <Handle
          type="target"
          position={Position.Left}
          className="w-3 h-3 !bg-gray-400 border-2 border-white"
        />
      )}

      {/* Header: Node type badge and status indicators */}
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getNodeTypeBadgeStyles(nodeType)}`}>
          {getNodeTypeLabel(nodeType)}
        </span>
        <div className="flex items-center gap-2">
          {/* Generating indicator - Requirements: 14.5 */}
          {isGenerating && (
            <span className="flex items-center gap-1 text-xs text-emerald-600">
              <span className="inline-block w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
              Generating...
            </span>
          )}
          {/* Editing indicator - Requirements: 14.4 */}
          {isEditing && (
            <span className="text-xs text-yellow-600 font-medium">
              ✏️ Editing
            </span>
          )}
        </div>
      </div>

      {/* Content area */}
      <div className="min-h-[60px] max-h-[300px] overflow-y-auto">
        {isEditing ? (
          /* Edit mode - Requirements: 9.2 */
          <textarea
            className="w-full h-full min-h-[80px] p-2 text-sm bg-white border border-gray-300 rounded resize-none focus:outline-none focus:ring-2 focus:ring-yellow-400 font-mono"
            value={contextContent || ''}
            onChange={handleContentChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            autoFocus
            placeholder="Enter your thoughts in Markdown..."
            data-testid="node-editor"
          />
        ) : (
          /* View mode with Markdown rendering - Requirements: 9.1, 2.4 */
          <div 
            className="prose prose-sm max-w-none text-gray-700"
            data-testid="node-content"
          >
            {sanitizedContent ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={markdownComponents}
              >
                {sanitizedContent}
              </ReactMarkdown>
            ) : (
              <span className="text-gray-400 italic text-sm">
                Double-click to edit...
              </span>
            )}
          </div>
        )}
      </div>

      {/* Error display - Requirements: 3.5, 15.1 */}
      {error && (
        <div 
          className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600"
          data-testid="node-error"
        >
          <div className="flex items-start gap-2">
            <span className="text-red-500">⚠️</span>
            <div className="flex-1">
              <span className="font-medium">Error:</span> {error.message}
              {error.canRetry && (
                <button 
                  className="ml-2 px-2 py-0.5 bg-red-100 hover:bg-red-200 text-red-700 rounded transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Dispatch custom event for retry - will be handled by CanvasWorkspace
                    const event = new CustomEvent('mindnode:retry', { 
                      detail: { nodeId: id },
                      bubbles: true 
                    });
                    e.currentTarget.dispatchEvent(event);
                  }}
                  data-testid="retry-button"
                >
                  Retry
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Output handle (right side) */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 !bg-gray-400 border-2 border-white"
      />

      {/* Suggestion bubbles for AI nodes - Requirements: 6.3, 6.4 */}
      {showSuggestions && (
        <SuggestionBubbles
          nodeId={id}
          suggestions={suggestions}
          onSuggestionClick={handleSuggestionClick}
          visible={showSuggestions}
          position="bottom"
        />
      )}
    </div>
  );
}

// Memoize for performance with custom comparison
export default memo(MindNodeComponent, (prevProps, nextProps) => {
  const prevData = prevProps.data as unknown as MindNodeData;
  const nextData = nextProps.data as unknown as MindNodeData;
  
  // Compare suggestions arrays
  const suggestionsEqual = 
    (prevData.suggestions?.length || 0) === (nextData.suggestions?.length || 0) &&
    (prevData.suggestions || []).every((s, i) => s === (nextData.suggestions || [])[i]);
  
  return (
    prevProps.id === nextProps.id &&
    prevProps.selected === nextProps.selected &&
    prevData.label === nextData.label &&
    prevData.contextContent === nextData.contextContent &&
    prevData.nodeType === nextData.nodeType &&
    prevData.isEditing === nextData.isEditing &&
    prevData.isGenerating === nextData.isGenerating &&
    prevData.error?.message === nextData.error?.message &&
    suggestionsEqual
  );
});
