'use client';

/**
 * Root page - Handles authentication and workspace routing
 * 
 * This page:
 * - Redirects unauthenticated users to login
 * - Creates default workspace for new users
 * - Redirects to last active workspace or first workspace
 * - Handles initial app routing logic
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useWorkspaces } from '@/hooks/useWorkspaces';

export default function HomePage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { 
    workspaces, 
    currentWorkspaceId,
    isLoading: isWorkspacesLoading,
    createWorkspace,
    switchWorkspace,
    getLastActiveWorkspace,
    setLastActiveWorkspace,
    loadWorkspaces,
  } = useWorkspaces({
    userId: user?.id || '',
    autoLoad: !!user?.id,
  });

  useEffect(() => {
    // Wait for auth and workspace loading to complete
    if (isAuthLoading || (user && isWorkspacesLoading)) {
      return;
    }

    if (!user) {
      // Unauthenticated user - redirect to login
      router.replace('/login');
      return;
    }

    if (workspaces.length === 0) {
      // No workspaces - create default workspace
      createDefaultWorkspace();
    } else {
      // Has workspaces - redirect to dashboard
      redirectToWorkspace();
    }
  }, [user, workspaces, isAuthLoading, isWorkspacesLoading, router]);

  const createDefaultWorkspace = async () => {
    try {
      const response = await fetch('/api/workspaces/default', {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to create default workspace');
      }
      
      const data = await response.json();
      const defaultWorkspace = {
        id: data.workspace.id,
        title: data.workspace.title,
        userId: data.workspace.userId,
        viewport: data.workspace.viewport,
        createdAt: new Date(data.workspace.createdAt),
        updatedAt: new Date(data.workspace.updatedAt),
      };
      
      // Add to store and switch to it
      // Note: We'll need to reload workspaces to get the full list
      await loadWorkspaces();
      setLastActiveWorkspace(defaultWorkspace.id);
      router.replace('/ws/dashboard');
    } catch (error) {
      console.error('Failed to create default workspace:', error);
      // Fallback: redirect to login
      router.replace('/login');
    }
  };

  const redirectToWorkspace = () => {
    // Get last active workspace or use first workspace
    const lastActive = getLastActiveWorkspace();
    const targetWorkspace = lastActive || workspaces[0];
    
    if (targetWorkspace) {
      switchWorkspace(targetWorkspace.id);
      setLastActiveWorkspace(targetWorkspace.id);
      router.replace('/ws/dashboard');
    }
  };

  // Show loading state
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center space-y-4">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto" />
        <p className="text-sm text-gray-600">
          {isAuthLoading ? 'Checking authentication...' : 
           isWorkspacesLoading ? 'Loading workspaces...' : 
           'Setting up your workspace...'}
        </p>
      </div>
    </div>
  );
}
