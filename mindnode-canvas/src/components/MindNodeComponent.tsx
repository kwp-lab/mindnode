'use client';

/**
 * MindNodeComponent - Custom React Flow node for mind map nodes
 * 
 * This is a basic implementation for task 7.1.
 * Full implementation with Markdown rendering will be done in task 8.
 * 
 * Requirements:
 * - 2.4: Display content with Markdown rendering (basic for now)
 * - 14.1-14.5: Visual states for different node types
 */

import React, { useCallback, memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { useMindNodeStore } from '../store';
import { NodeType } from '../types';

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
}

// ============================================
// STYLES
// ============================================

const getNodeStyles = (nodeType: NodeType, isSelected: boolean, isEditing: boolean, isGenerating: boolean) => {
  const baseStyles = `
    rounded-lg shadow-md border-2 p-4 min-w-[280px] max-w-[300px] min-h-[100px]
    transition-all duration-200 ease-in-out
  `;
  
  // Node type colors
  let typeStyles = '';
  switch (nodeType) {
    case 'root':
      typeStyles = 'bg-indigo-50 border-indigo-400';
      break;
    case 'ai':
      typeStyles = 'bg-emerald-50 border-emerald-400';
      break;
    case 'user':
    default:
      typeStyles = 'bg-blue-50 border-blue-400';
      break;
  }
  
  // Selection state
  const selectionStyles = isSelected 
    ? 'ring-2 ring-offset-2 ring-blue-500 shadow-lg' 
    : '';
  
  // Editing state
  const editingStyles = isEditing 
    ? 'ring-2 ring-yellow-400 border-yellow-400' 
    : '';
  
  // Generating state
  const generatingStyles = isGenerating 
    ? 'animate-pulse border-dashed' 
    : '';
  
  return `${baseStyles} ${typeStyles} ${selectionStyles} ${editingStyles} ${generatingStyles}`.trim();
};

const getNodeTypeLabel = (nodeType: NodeType): string => {
  switch (nodeType) {
    case 'root':
      return 'Root';
    case 'ai':
      return 'AI';
    case 'user':
    default:
      return 'User';
  }
};

const getNodeTypeBadgeStyles = (nodeType: NodeType): string => {
  switch (nodeType) {
    case 'root':
      return 'bg-indigo-200 text-indigo-800';
    case 'ai':
      return 'bg-emerald-200 text-emerald-800';
    case 'user':
    default:
      return 'bg-blue-200 text-blue-800';
  }
};

// ============================================
// COMPONENT
// ============================================

function MindNodeComponent({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as MindNodeData;
  const { updateNode, setSelectedNode } = useMindNodeStore();
  
  const {
    label,
    contextContent,
    nodeType,
    isEditing = false,
    isGenerating = false,
  } = nodeData;

  /**
   * Handle double-click to enter edit mode
   */
  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      updateNode(id, { isEditing: true });
    },
    [id, updateNode]
  );

  /**
   * Handle content change in edit mode
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
   * Handle blur to exit edit mode
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
      if (e.key === 'Tab' || e.key === 'Enter') {
        e.stopPropagation();
      }
    },
    [id, updateNode]
  );

  return (
    <div
      className={getNodeStyles(nodeType, selected || false, isEditing, isGenerating)}
      onDoubleClick={handleDoubleClick}
      data-node-id={id}
    >
      {/* Input handle (left side) */}
      {nodeType !== 'root' && (
        <Handle
          type="target"
          position={Position.Left}
          className="w-3 h-3 bg-gray-400 border-2 border-white"
        />
      )}

      {/* Node type badge */}
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs font-medium px-2 py-0.5 rounded ${getNodeTypeBadgeStyles(nodeType)}`}>
          {getNodeTypeLabel(nodeType)}
        </span>
        {isGenerating && (
          <span className="text-xs text-gray-500 animate-pulse">
            Generating...
          </span>
        )}
        {isEditing && (
          <span className="text-xs text-yellow-600">
            Editing
          </span>
        )}
      </div>

      {/* Content area */}
      <div className="min-h-[60px]">
        {isEditing ? (
          <textarea
            className="w-full h-full min-h-[60px] p-2 text-sm bg-white border border-gray-300 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={contextContent || ''}
            onChange={handleContentChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            autoFocus
            placeholder="Enter your thoughts..."
          />
        ) : (
          <div className="text-sm text-gray-700 whitespace-pre-wrap break-words">
            {label || contextContent || (
              <span className="text-gray-400 italic">
                Double-click to edit...
              </span>
            )}
          </div>
        )}
      </div>

      {/* Output handle (right side) */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-gray-400 border-2 border-white"
      />
    </div>
  );
}

// Memoize for performance
export default memo(MindNodeComponent);
