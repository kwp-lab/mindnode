'use client';

/**
 * useWorkspaces - Hook for workspace management
 * 
 * Implements:
 * - Task 14.3: Workspace switching logic
 * 
 * Requirements:
 * - 7.2: Load workspace node tree and canvas state when switching
 * - 7.1: Create new workspace with unique ID and root node
 * - 7.4: Delete workspace and all associated nodes
 */

import { useState, useCallback, useEffect } from 'react';
import { useMindNodeStore } from '../store';
import { Workspace, MindNode, Edge } from '../types';

// ============================================
// TYPES
// ============================================

export interface UseWorkspacesOptions {
  /** User ID for fetching workspaces */
  userId: string;
  /** Whether to auto-load workspaces on mount */
  autoLoad?: boolean;
}

export interface UseWorkspacesReturn {
  /** List of all workspaces */
  workspaces: Workspace[];
  /** Currently selected workspace ID */
  currentWorkspaceId: string | null;
  /** Whether workspaces are loading */
  isLoading: boolean;
  /** Whether a workspace is being switched */
  isSwitching: boolean;
  /** Error message if any */
  error: string | null;
  /** Load all workspaces for the user */
  loadWorkspaces: () => Promise<void>;
  /** Switch to a different workspace */
  switchWorkspace: (workspaceId: string) => Promise<void>;
  /** Create a new workspace */
  createWorkspace: (title: string) => Promise<Workspace | null>;
  /** Delete a workspace */
  deleteWorkspace: (workspaceId: string) => Promise<boolean>;
  /** Update workspace viewport state */
  saveViewportState: () => Promise<void>;
  /** Get last active workspace from localStorage */
  getLastActiveWorkspace: () => Workspace | null;
  /** Set last active workspace in localStorage */
  setLastActiveWorkspace: (workspaceId: string) => void;
}

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Fetch all workspaces for a user
 */
async function fetchWorkspaces(): Promise<Workspace[]> {
  const response = await fetch('/api/workspaces');
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch workspaces');
  }
  
  const data = await response.json();
  
  // Convert date strings to Date objects
  return data.workspaces.map((w: Workspace & { createdAt: string; updatedAt: string }) => ({
    ...w,
    createdAt: new Date(w.createdAt),
    updatedAt: new Date(w.updatedAt),
  }));
}

/**
 * Fetch a single workspace with its nodes and edges
 */
async function fetchWorkspaceWithNodes(workspaceId: string): Promise<{
  workspace: Workspace;
  nodes: MindNode[];
  edges: Edge[];
}> {
  const response = await fetch(`/api/workspaces/${workspaceId}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch workspace');
  }
  
  const data = await response.json();
  
  // Convert date strings to Date objects
  return {
    workspace: {
      ...data.workspace,
      createdAt: new Date(data.workspace.createdAt),
      updatedAt: new Date(data.workspace.updatedAt),
    },
    nodes: data.nodes.map((n: MindNode & { createdAt: string; updatedAt: string }) => ({
      ...n,
      createdAt: new Date(n.createdAt),
      updatedAt: new Date(n.updatedAt),
    })),
    edges: data.edges,
  };
}

/**
 * Create a new workspace
 */
async function createWorkspaceApi(title: string): Promise<Workspace> {
  const response = await fetch('/api/workspaces', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create workspace');
  }
  
  const data = await response.json();
  
  return {
    ...data.workspace,
    createdAt: new Date(data.workspace.createdAt),
    updatedAt: new Date(data.workspace.updatedAt),
  };
}

/**
 * Delete a workspace
 */
async function deleteWorkspaceApi(workspaceId: string): Promise<void> {
  const response = await fetch(`/api/workspaces/${workspaceId}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete workspace');
  }
}

/**
 * Update workspace viewport state
 */
async function updateWorkspaceViewport(
  workspaceId: string,
  viewport: { x: number; y: number; zoom: number }
): Promise<void> {
  const response = await fetch(`/api/workspaces/${workspaceId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ viewport }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update workspace viewport');
  }
}

// ============================================
// HOOK
// ============================================

export function useWorkspaces({
  userId,
  autoLoad = true,
}: UseWorkspacesOptions): UseWorkspacesReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get store state and actions
  const workspaces = useMindNodeStore((state) => state.workspaces);
  const currentWorkspaceId = useMindNodeStore((state) => state.currentWorkspaceId);
  const viewport = useMindNodeStore((state) => state.viewport);
  
  const setWorkspaces = useMindNodeStore((state) => state.setWorkspaces);
  const addWorkspace = useMindNodeStore((state) => state.addWorkspace);
  const deleteWorkspaceFromStore = useMindNodeStore((state) => state.deleteWorkspace);
  const setCurrentWorkspace = useMindNodeStore((state) => state.setCurrentWorkspace);
  const setNodes = useMindNodeStore((state) => state.setNodes);
  const setViewport = useMindNodeStore((state) => state.setViewport);
  const resetCanvas = useMindNodeStore((state) => state.resetCanvas);

  /**
   * Load all workspaces for the user
   */
  const loadWorkspaces = useCallback(async () => {
    if (!userId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const fetchedWorkspaces = await fetchWorkspaces();
      setWorkspaces(fetchedWorkspaces);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load workspaces';
      setError(message);
      console.error('Error loading workspaces:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId, setWorkspaces]);

  /**
   * Switch to a different workspace
   * Requirements: 7.2 - Load workspace node tree and canvas state
   */
  const switchWorkspace = useCallback(async (workspaceId: string) => {
    if (workspaceId === currentWorkspaceId) return;
    
    setIsSwitching(true);
    setError(null);
    
    try {
      // Save current viewport state before switching (if we have a current workspace)
      if (currentWorkspaceId) {
        try {
          await updateWorkspaceViewport(currentWorkspaceId, viewport);
        } catch (err) {
          console.warn('Failed to save viewport state:', err);
          // Continue with switch even if save fails
        }
      }
      
      // Clear current canvas before loading new workspace
      // Requirements: 7.2 - Clear current canvas before loading
      resetCanvas();
      
      // Fetch workspace with nodes and edges
      const { workspace, nodes } = await fetchWorkspaceWithNodes(workspaceId);
      
      // Load nodes into canvas
      setNodes(nodes);
      
      // Restore viewport state
      // Requirements: 7.2 - Restore viewport state
      setViewport(workspace.viewport);
      
      // Set current workspace
      setCurrentWorkspace(workspaceId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to switch workspace';
      setError(message);
      console.error('Error switching workspace:', err);
    } finally {
      setIsSwitching(false);
    }
  }, [currentWorkspaceId, viewport, resetCanvas, setNodes, setViewport, setCurrentWorkspace]);

  /**
   * Create a new workspace
   * Requirements: 7.1 - Create new workspace with unique ID and root node
   */
  const createWorkspace = useCallback(async (title: string): Promise<Workspace | null> => {
    if (!userId) {
      setError('User ID is required to create a workspace');
      return null;
    }
    
    setError(null);
    
    try {
      const workspace = await createWorkspaceApi(title);
      addWorkspace(workspace);
      
      // Automatically switch to the new workspace
      await switchWorkspace(workspace.id);
      
      return workspace;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create workspace';
      setError(message);
      console.error('Error creating workspace:', err);
      return null;
    }
  }, [userId, addWorkspace, switchWorkspace]);

  /**
   * Delete a workspace
   * Requirements: 7.4 - Delete workspace and all associated nodes
   */
  const deleteWorkspace = useCallback(async (workspaceId: string): Promise<boolean> => {
    setError(null);
    
    try {
      await deleteWorkspaceApi(workspaceId);
      deleteWorkspaceFromStore(workspaceId);
      
      // If we deleted the current workspace, switch to another one or clear
      if (workspaceId === currentWorkspaceId) {
        const remainingWorkspaces = workspaces.filter(w => w.id !== workspaceId);
        if (remainingWorkspaces.length > 0) {
          await switchWorkspace(remainingWorkspaces[0].id);
        } else {
          resetCanvas();
          setCurrentWorkspace(null);
        }
      }
      
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete workspace';
      setError(message);
      console.error('Error deleting workspace:', err);
      return false;
    }
  }, [workspaces, currentWorkspaceId, deleteWorkspaceFromStore, switchWorkspace, resetCanvas, setCurrentWorkspace]);

  /**
   * Save current viewport state to the database
   */
  const saveViewportState = useCallback(async () => {
    if (!currentWorkspaceId) return;
    
    try {
      await updateWorkspaceViewport(currentWorkspaceId, viewport);
    } catch (err) {
      console.warn('Failed to save viewport state:', err);
    }
  }, [currentWorkspaceId, viewport]);

  /**
   * Get last active workspace from localStorage
   */
  const getLastActiveWorkspace = useCallback((): Workspace | null => {
    if (typeof window === 'undefined') return null;
    
    try {
      const lastActiveId = localStorage.getItem('lastActiveWorkspaceId');
      if (!lastActiveId) return null;
      
      return workspaces.find(ws => ws.id === lastActiveId) || null;
    } catch (err) {
      console.warn('Failed to get last active workspace:', err);
      return null;
    }
  }, [workspaces]);

  /**
   * Set last active workspace in localStorage
   */
  const setLastActiveWorkspace = useCallback((workspaceId: string) => {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem('lastActiveWorkspaceId', workspaceId);
    } catch (err) {
      console.warn('Failed to set last active workspace:', err);
    }
  }, []);

  // Auto-load workspaces on mount
  useEffect(() => {
    if (autoLoad && userId) {
      loadWorkspaces();
    }
  }, [autoLoad, userId, loadWorkspaces]);

  return {
    workspaces,
    currentWorkspaceId,
    isLoading,
    isSwitching,
    error,
    loadWorkspaces,
    switchWorkspace,
    createWorkspace,
    deleteWorkspace,
    saveViewportState,
    getLastActiveWorkspace,
    setLastActiveWorkspace,
  };
}

export default useWorkspaces;
