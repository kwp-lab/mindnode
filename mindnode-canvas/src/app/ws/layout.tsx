'use client';

/**
 * Workspace Layout - Contains sidebar and workspace-level state management
 * 
 * This layout wraps all workspace-related pages (/ws/*) and provides:
 * - Sidebar with workspace and project navigation
 * - Shared state management for workspaces and projects
 * - Authentication checks
 */

import { AppSidebar } from '@/components/app-sidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { useWorkspaces } from '@/hooks/useWorkspaces';
import { useProjects } from '@/hooks/useProjects';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { 
    workspaces, 
    currentWorkspaceId, 
    isLoading: isWorkspacesLoading,
    switchWorkspace,
    createWorkspace,
    deleteWorkspace,
  } = useWorkspaces({
    userId: user?.id || '',
    autoLoad: !!user?.id,
  });

  const {
    projects,
    currentProjectId,
    isLoading: isProjectsLoading,
    createProject,
    deleteProject,
    updateProject,
    setCurrentProjectId,
  } = useProjects({
    workspaceId: currentWorkspaceId,
    autoLoad: !!currentWorkspaceId,
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.replace('/login');
    }
  }, [user, isAuthLoading, router]);

  // Show loading while checking auth or loading workspaces
  if (isAuthLoading || isWorkspacesLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  // Don't render if not authenticated
  if (!user) {
    return null;
  }

  const handleProjectSelect = (projectId: string) => {
    setCurrentProjectId(projectId);
  };

  const handleProjectCreate = async (title: string) => {
    const project = await createProject(title);
    if (project) {
      router.push(`/ws/canvas/${project.id}`);
    }
  };

  const handleProjectDelete = async (projectId: string) => {
    await deleteProject(projectId);
    // If we deleted the current project, go back to dashboard
    if (projectId === currentProjectId) {
      router.push('/ws/dashboard');
    }
  };

  const handleProjectRename = async (projectId: string, newTitle: string) => {
    await updateProject(projectId, { title: newTitle });
  };

  return (
    <SidebarProvider>
      <AppSidebar
        // workspace props
        workspaces={workspaces}
        currentWorkspaceId={currentWorkspaceId}
        onWorkspaceSelect={switchWorkspace}
        onWorkspaceCreate={createWorkspace}
        onWorkspaceDelete={deleteWorkspace}
        
        // project props
        projects={projects}
        currentProjectId={currentProjectId}
        onProjectSelect={handleProjectSelect}
        onProjectCreate={handleProjectCreate}
        onProjectDelete={handleProjectDelete}
        onProjectRename={handleProjectRename}
        
        // user props
        user={user}
      />
      <SidebarInset>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}