'use client';

/**
 * useProjects - Hook for project management within a workspace
 * 
 * Projects represent individual canvases within a workspace.
 * Hierarchy: User -> Workspace -> Project -> Nodes
 */

import { useState, useCallback, useEffect } from 'react';
import { Project, MindNode } from '../types';

// ============================================
// TYPES
// ============================================

export interface UseProjectsOptions {
  /** Workspace ID for fetching projects */
  workspaceId: string | null;
  /** Whether to auto-load projects on mount */
  autoLoad?: boolean;
}

export interface UseProjectsReturn {
  /** List of all projects in the workspace */
  projects: Project[];
  /** Currently selected project ID */
  currentProjectId: string | null;
  /** Whether projects are loading */
  isLoading: boolean;
  /** Whether a project is being switched */
  isSwitching: boolean;
  /** Error message if any */
  error: string | null;
  /** Load all projects for the workspace */
  loadProjects: () => Promise<void>;
  /** Switch to a different project */
  switchProject: (projectId: string) => Promise<void>;
  /** Create a new project */
  createProject: (title: string, description?: string) => Promise<Project | null>;
  /** Update a project */
  updateProject: (projectId: string, updates: Partial<Project>) => Promise<boolean>;
  /** Delete a project */
  deleteProject: (projectId: string) => Promise<boolean>;
  /** Set current project ID */
  setCurrentProjectId: (projectId: string | null) => void;
}

// ============================================
// API FUNCTIONS
// ============================================

async function fetchProjects(workspaceId: string): Promise<Project[]> {
  const response = await fetch(`/api/projects?workspaceId=${workspaceId}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch projects');
  }
  
  const data = await response.json();
  
  return data.projects.map((p: Project & { createdAt: string; updatedAt: string }) => ({
    ...p,
    createdAt: new Date(p.createdAt),
    updatedAt: new Date(p.updatedAt),
  }));
}

async function fetchProjectWithNodes(projectId: string): Promise<{
  project: Project;
  nodes: MindNode[];
}> {
  const response = await fetch(`/api/projects/${projectId}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch project');
  }
  
  const data = await response.json();
  
  return {
    project: {
      ...data.project,
      createdAt: new Date(data.project.createdAt),
      updatedAt: new Date(data.project.updatedAt),
    },
    nodes: data.nodes.map((n: MindNode & { createdAt: string; updatedAt: string }) => ({
      ...n,
      createdAt: new Date(n.createdAt),
      updatedAt: new Date(n.updatedAt),
    })),
  };
}

async function createProjectApi(
  workspaceId: string,
  title: string,
  description?: string
): Promise<Project> {
  const response = await fetch('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workspaceId, title, description }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create project');
  }
  
  const data = await response.json();
  
  return {
    ...data.project,
    createdAt: new Date(data.project.createdAt),
    updatedAt: new Date(data.project.updatedAt),
  };
}

async function updateProjectApi(
  projectId: string,
  updates: Partial<Project>
): Promise<Project> {
  const response = await fetch(`/api/projects/${projectId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update project');
  }
  
  const data = await response.json();
  
  return {
    ...data.project,
    createdAt: new Date(data.project.createdAt),
    updatedAt: new Date(data.project.updatedAt),
  };
}

async function deleteProjectApi(projectId: string): Promise<void> {
  const response = await fetch(`/api/projects/${projectId}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete project');
  }
}

// ============================================
// HOOK
// ============================================

export function useProjects({
  workspaceId,
  autoLoad = true,
}: UseProjectsOptions): UseProjectsReturn {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load all projects for the workspace
   */
  const loadProjects = useCallback(async () => {
    if (!workspaceId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const fetchedProjects = await fetchProjects(workspaceId);
      setProjects(fetchedProjects);
      
      // Auto-select first project if none selected
      if (fetchedProjects.length > 0 && !currentProjectId) {
        setCurrentProjectId(fetchedProjects[0].id);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load projects';
      setError(message);
      console.error('Error loading projects:', err);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, currentProjectId]);

  /**
   * Switch to a different project
   */
  const switchProject = useCallback(async (projectId: string) => {
    if (projectId === currentProjectId) return;
    
    setIsSwitching(true);
    setError(null);
    
    try {
      // Fetch project with nodes
      const { project, nodes } = await fetchProjectWithNodes(projectId);
      
      // Update current project
      setCurrentProjectId(projectId);
      
      // TODO: Update nodes in store
      console.log('Loaded project with nodes:', project, nodes);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to switch project';
      setError(message);
      console.error('Error switching project:', err);
    } finally {
      setIsSwitching(false);
    }
  }, [currentProjectId]);

  /**
   * Create a new project
   */
  const createProject = useCallback(async (
    title: string,
    description?: string
  ): Promise<Project | null> => {
    if (!workspaceId) {
      setError('Workspace ID is required to create a project');
      return null;
    }
    
    setError(null);
    
    try {
      const project = await createProjectApi(workspaceId, title, description);
      setProjects(prev => [project, ...prev]);
      
      // Automatically switch to the new project
      setCurrentProjectId(project.id);
      
      return project;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create project';
      setError(message);
      console.error('Error creating project:', err);
      return null;
    }
  }, [workspaceId]);

  /**
   * Update a project
   */
  const updateProject = useCallback(async (
    projectId: string,
    updates: Partial<Project>
  ): Promise<boolean> => {
    setError(null);
    
    try {
      const updatedProject = await updateProjectApi(projectId, updates);
      setProjects(prev => 
        prev.map(p => p.id === projectId ? updatedProject : p)
      );
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update project';
      setError(message);
      console.error('Error updating project:', err);
      return false;
    }
  }, []);

  /**
   * Delete a project
   */
  const deleteProject = useCallback(async (projectId: string): Promise<boolean> => {
    setError(null);
    
    try {
      await deleteProjectApi(projectId);
      setProjects(prev => prev.filter(p => p.id !== projectId));
      
      // If we deleted the current project, switch to another one
      if (projectId === currentProjectId) {
        const remainingProjects = projects.filter(p => p.id !== projectId);
        if (remainingProjects.length > 0) {
          setCurrentProjectId(remainingProjects[0].id);
        } else {
          setCurrentProjectId(null);
        }
      }
      
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete project';
      setError(message);
      console.error('Error deleting project:', err);
      return false;
    }
  }, [projects, currentProjectId]);

  // Auto-load projects when workspace changes
  useEffect(() => {
    if (autoLoad && workspaceId) {
      loadProjects();
    }
    
    // Reset state when workspace changes
    if (!workspaceId) {
      setProjects([]);
      setCurrentProjectId(null);
    }
  }, [autoLoad, workspaceId, loadProjects]);

  return {
    projects,
    currentProjectId,
    isLoading,
    isSwitching,
    error,
    loadProjects,
    switchProject,
    createProject,
    updateProject,
    deleteProject,
    setCurrentProjectId,
  };
}

export default useProjects;