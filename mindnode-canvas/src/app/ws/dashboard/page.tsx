'use client';

/**
 * Workspace Dashboard - Overview of projects and workspace management
 * 
 * This page provides:
 * - Project list and management
 * - Workspace overview
 * - Quick actions for creating new projects
 */

import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Plus, FolderOpen, Calendar, Users } from 'lucide-react';

export default function WorkspaceDashboard() {
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
                <BreadcrumbPage>Dashboard</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        
        {/* Header actions */}
        <div className="ml-auto px-4">
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </div>
      </header>
      
      {/* Main content */}
      <div className="flex flex-1 flex-col gap-6 p-6">
        {/* Welcome section */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Welcome back!</h1>
          <p className="text-muted-foreground">
            Here's what's happening in your workspace today.
          </p>
        </div>

        {/* Stats cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border bg-card p-6">
            <div className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Projects</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">
                Active projects
              </p>
            </div>
          </div>
          
          <div className="rounded-lg border bg-card p-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Recent</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">
                Updated today
              </p>
            </div>
          </div>
          
          <div className="rounded-lg border bg-card p-6">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Nodes</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">
                Total nodes
              </p>
            </div>
          </div>
          
          <div className="rounded-lg border bg-card p-6">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Storage</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold">0 MB</div>
              <p className="text-xs text-muted-foreground">
                Used space
              </p>
            </div>
          </div>
        </div>

        {/* Recent projects section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent Projects</h2>
            <Button variant="outline" size="sm">
              View All
            </Button>
          </div>
          
          {/* Empty state */}
          <div className="rounded-lg border border-dashed bg-muted/50 p-8">
            <div className="flex flex-col items-center justify-center text-center">
              <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No projects yet</h3>
              <p className="text-muted-foreground mb-4 max-w-sm">
                Create your first project to start building mind maps and organizing your ideas.
              </p>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create Project
              </Button>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Quick Actions</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Button variant="outline" className="h-auto p-4 justify-start gap-3">
              <Plus className="h-5 w-5" />
              <div className="text-left">
                <div className="font-medium">New Project</div>
                <div className="text-sm text-muted-foreground">Start a new mind map</div>
              </div>
            </Button>
            
            <Button variant="outline" className="h-auto p-4 justify-start gap-3">
              <FolderOpen className="h-5 w-5" />
              <div className="text-left">
                <div className="font-medium">Browse Templates</div>
                <div className="text-sm text-muted-foreground">Use pre-made templates</div>
              </div>
            </Button>
            
            <Button variant="outline" className="h-auto p-4 justify-start gap-3">
              <Users className="h-5 w-5" />
              <div className="text-left">
                <div className="font-medium">Import Data</div>
                <div className="text-sm text-muted-foreground">Import from other tools</div>
              </div>
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}