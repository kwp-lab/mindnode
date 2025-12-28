'use client';

/**
 * WorkspaceSidebar - Manages workspace list and navigation
 * 
 * Implements:
 * - Task 14.2: Display list of workspaces, handle selection, provide create/delete actions
 * 
 * Requirements:
 * - 7.5: Display list of all user workspaces with preview information
 */

import React, { useState, useCallback } from 'react';
import { Workspace } from '../types';

// ============================================
// TYPES
// ============================================

export interface WorkspaceSidebarProps {
  /** List of workspaces to display */
  workspaces: Workspace[];
  /** Currently selected workspace ID */
  currentWorkspaceId: string | null;
  /** Whether the sidebar is loading */
  isLoading?: boolean;
  /** Callback when a workspace is selected */
  onWorkspaceSelect: (id: string) => void;
  /** Callback when creating a new workspace */
  onWorkspaceCreate: (title: string) => void;
  /** Callback when deleting a workspace */
  onWorkspaceDelete: (id: string) => void;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Format date for display
 */
function formatDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) {
    return 'Today';
  } else if (days === 1) {
    return 'Yesterday';
  } else if (days < 7) {
    return `${days} days ago`;
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  }
}

// ============================================
// SUB-COMPONENTS
// ============================================

interface WorkspaceItemProps {
  workspace: Workspace;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

function WorkspaceItem({ workspace, isSelected, onSelect, onDelete }: WorkspaceItemProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDeleteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
  }, []);

  const handleConfirmDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
    setShowDeleteConfirm(false);
  }, [onDelete]);

  const handleCancelDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(false);
  }, []);

  return (
    <div
      className={`
        group relative p-3 rounded-lg cursor-pointer transition-all duration-200
        ${isSelected 
          ? 'bg-blue-100 border-2 border-blue-400 shadow-sm' 
          : 'bg-white border border-gray-200 hover:border-gray-300 hover:shadow-sm'
        }
      `}
      onClick={onSelect}
      data-testid={`workspace-item-${workspace.id}`}
    >
      {/* Workspace info */}
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className={`
            font-medium text-sm truncate
            ${isSelected ? 'text-blue-800' : 'text-gray-800'}
          `}>
            {workspace.title}
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Updated {formatDate(workspace.updatedAt)}
          </p>
        </div>
        
        {/* Delete button */}
        {!showDeleteConfirm && (
          <button
            className={`
              opacity-0 group-hover:opacity-100 transition-opacity
              p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-500
            `}
            onClick={handleDeleteClick}
            title="Delete workspace"
            data-testid={`delete-workspace-${workspace.id}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="mt-2 p-2 bg-red-50 rounded border border-red-200">
          <p className="text-xs text-red-700 mb-2">Delete this workspace?</p>
          <div className="flex gap-2">
            <button
              className="flex-1 px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
              onClick={handleConfirmDelete}
              data-testid={`confirm-delete-${workspace.id}`}
            >
              Delete
            </button>
            <button
              className="flex-1 px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
              onClick={handleCancelDelete}
              data-testid={`cancel-delete-${workspace.id}`}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-500 rounded-r" />
      )}
    </div>
  );
}

interface CreateWorkspaceFormProps {
  onSubmit: (title: string) => void;
  onCancel: () => void;
}

function CreateWorkspaceForm({ onSubmit, onCancel }: CreateWorkspaceFormProps) {
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    
    if (!trimmedTitle) {
      setError('Title is required');
      return;
    }
    
    if (trimmedTitle.length > 255) {
      setError('Title must be 255 characters or less');
      return;
    }
    
    onSubmit(trimmedTitle);
    setTitle('');
    setError(null);
  }, [title, onSubmit]);

  return (
    <form onSubmit={handleSubmit} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
      <input
        type="text"
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          setError(null);
        }}
        placeholder="Workspace name..."
        className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
        autoFocus
        data-testid="new-workspace-input"
      />
      {error && (
        <p className="mt-1 text-xs text-red-500">{error}</p>
      )}
      <div className="flex gap-2 mt-2">
        <button
          type="submit"
          className="flex-1 px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          data-testid="create-workspace-submit"
        >
          Create
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
          data-testid="create-workspace-cancel"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function WorkspaceSidebar({
  workspaces,
  currentWorkspaceId,
  isLoading = false,
  onWorkspaceSelect,
  onWorkspaceCreate,
  onWorkspaceDelete,
}: WorkspaceSidebarProps) {
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateClick = useCallback(() => {
    setIsCreating(true);
  }, []);

  const handleCreateSubmit = useCallback((title: string) => {
    onWorkspaceCreate(title);
    setIsCreating(false);
  }, [onWorkspaceCreate]);

  const handleCreateCancel = useCallback(() => {
    setIsCreating(false);
  }, []);

  return (
    <div 
      className="flex flex-col h-full bg-gray-50 border-r border-gray-200"
      data-testid="workspace-sidebar"
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Workspaces</h2>
          {!isCreating && (
            <button
              onClick={handleCreateClick}
              className="p-1.5 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
              title="Create new workspace"
              data-testid="create-workspace-button"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Create form */}
      {isCreating && (
        <div className="p-3 border-b border-gray-200">
          <CreateWorkspaceForm
            onSubmit={handleCreateSubmit}
            onCancel={handleCreateCancel}
          />
        </div>
      )}

      {/* Workspace list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {isLoading ? (
          /* Loading state */
          <div className="flex flex-col items-center justify-center py-8 text-gray-500">
            <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin mb-2" />
            <span className="text-sm">Loading workspaces...</span>
          </div>
        ) : workspaces.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-8 text-gray-500">
            <svg className="w-12 h-12 mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p className="text-sm font-medium">No workspaces yet</p>
            <p className="text-xs text-gray-400 mt-1">Create one to get started</p>
          </div>
        ) : (
          /* Workspace items */
          workspaces.map((workspace) => (
            <WorkspaceItem
              key={workspace.id}
              workspace={workspace}
              isSelected={workspace.id === currentWorkspaceId}
              onSelect={() => onWorkspaceSelect(workspace.id)}
              onDelete={() => onWorkspaceDelete(workspace.id)}
            />
          ))
        )}
      </div>

      {/* Footer with workspace count */}
      {workspaces.length > 0 && (
        <div className="p-3 border-t border-gray-200 bg-white">
          <p className="text-xs text-gray-500 text-center">
            {workspaces.length} workspace{workspaces.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  );
}
