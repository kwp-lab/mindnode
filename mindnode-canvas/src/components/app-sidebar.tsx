"use client"

import * as React from "react"
import { LogOut } from "lucide-react"

import { WorkspaceSwitcher } from "@/components/workspace-switcher"
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
import { Workspace } from "@/types"

interface User {
  id: string
  email: string
  name?: string
}

export function AppSidebar({ 
  workspaces,
  currentWorkspaceId,
  onWorkspaceSelect,
  onWorkspaceCreate,
  onWorkspaceDelete,
  user,
  ...props 
}: React.ComponentProps<typeof Sidebar> & {
  workspaces: Workspace[]
  currentWorkspaceId: string | null
  onWorkspaceSelect: (workspaceId: string) => void
  onWorkspaceCreate: (title: string) => void
  onWorkspaceDelete: (workspaceId: string) => void
  user: User | null
}) {
  const handleLogout = async () => {
    // TODO: Implement logout logic
    console.log('Logout clicked')
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
        {/* Projects will be added here later */}
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          Projects coming soon...
        </div>
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
