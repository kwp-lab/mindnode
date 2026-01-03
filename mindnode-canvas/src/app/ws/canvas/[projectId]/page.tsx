'use client';

/**
 * Canvas Page - Individual project canvas view
 * 
 * This page provides:
 * - Full canvas workspace for a specific project
 * - Project-specific toolbar and actions
 * - Breadcrumb navigation
 */

import { use, useEffect } from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import CanvasWorkspace from '@/components/CanvasWorkspace';
import { useMindNodeStore } from '@/store';
import { useProjects } from '@/hooks/useProjects';

interface CanvasPageProps {
  params: Promise<{ projectId: string }>;
}

export default function CanvasPage({ params }: CanvasPageProps) {
  const { projectId } = use(params);
  const currentWorkspaceId = useMindNodeStore((state) => state.currentWorkspaceId);
  const setCurrentProject = useMindNodeStore((state) => state.setCurrentProject);
  
  const { projects, setCurrentProjectId } = useProjects({
    workspaceId: currentWorkspaceId,
    autoLoad: !!currentWorkspaceId,
  });

  // Find current project
  const currentProject = projects.find(p => p.id === projectId);
  const projectName = currentProject?.title || "Loading...";

  // Set current project in store when page loads
  useEffect(() => {
    if (projectId) {
      setCurrentProject(projectId);
      setCurrentProjectId(projectId);
    }
  }, [projectId, setCurrentProject, setCurrentProjectId]);

  return (
    <>
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/ws/dashboard">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{projectName}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      
      {/* Canvas */}
      <div className="flex-1 relative">
        <CanvasWorkspace 
          workspaceId={currentWorkspaceId || ''}
          projectId={projectId}
        />
      </div>
    </>
  );
}