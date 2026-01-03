"use client"

import * as React from "react"
import { LogOut } from "lucide-react"
import { useRouter } from "next/navigation"

import { WorkspaceSwitcher } from "@/components/workspace-switcher"
import { NavProjects } from "@/components/nav-projects"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Workspace, Project } from "@/types"
import { createBrowserClient } from "@supabase/ssr"

interface User {
  id: string
  email?: string
  name?: string
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
  const router = useRouter()

  const handleLogout = async () => {
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      await supabase.auth.signOut()
      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

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
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              onClick={handleLogout}
              className="hover:bg-red-50 hover:text-red-600"
            >
              <LogOut className="size-4" />
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">
                  {user?.name || user?.email || 'User'}
                </span>
                <span className="truncate text-xs">Sign out</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      
      <SidebarRail />
    </Sidebar>
  )
}
