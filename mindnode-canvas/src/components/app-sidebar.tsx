"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { WorkspaceSwitcher } from "@/components/workspace-switcher"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { Workspace, Project } from "@/types"

interface User {
  id: string
  email?: string
  name?: string
  avatar?: string
}

export function AppSidebar({ 
  workspaces,
  currentWorkspaceId,
  onWorkspaceSelect,
  onWorkspaceCreate,
  onWorkspaceDelete,
  projects,
  currentProjectId,
  onProjectSelect,
  onProjectCreate,
  onProjectDelete,
  onProjectRename,
  user,
  ...props 
}: React.ComponentProps<typeof Sidebar> & {
  workspaces: Workspace[]
  currentWorkspaceId: string | null
  onWorkspaceSelect: (workspaceId: string) => void
  onWorkspaceCreate: (title: string) => void
  onWorkspaceDelete: (workspaceId: string) => void
  projects: Project[]
  currentProjectId: string | null
  onProjectSelect: (projectId: string) => void
  onProjectCreate: (title: string) => void
  onProjectDelete: (projectId: string) => void
  onProjectRename?: (projectId: string, newTitle: string) => void
  user: User | null
}) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <WorkspaceSwitcher 
          workspaces={workspaces}
          currentWorkspaceId={currentWorkspaceId}
          onWorkspaceSelect={onWorkspaceSelect}
          onWorkspaceCreate={onWorkspaceCreate}
        />
      </SidebarHeader>
      
      <SidebarContent>
        <NavProjects
          projects={projects}
          currentProjectId={currentProjectId}
          onProjectSelect={onProjectSelect}
          onProjectCreate={onProjectCreate}
          onProjectDelete={onProjectDelete}
          onProjectRename={onProjectRename}
        />
      </SidebarContent>
      
      <SidebarFooter>
        {user && (
          <NavUser user={user} />
        )}
      </SidebarFooter>
      
      <SidebarRail />
    </Sidebar>
  )
}
