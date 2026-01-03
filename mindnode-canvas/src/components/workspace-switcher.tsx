"use client"

import * as React from "react"
import { ChevronsUpDown, Plus } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { Workspace } from "@/types"

export function WorkspaceSwitcher({
  workspaces,
  currentWorkspaceId,
  onWorkspaceSelect,
  onWorkspaceCreate,
}: {
  workspaces: Workspace[]
  currentWorkspaceId: string | null
  onWorkspaceSelect: (workspaceId: string) => void
  onWorkspaceCreate: (title: string) => void
}) {
  const { isMobile } = useSidebar()
  const [isCreating, setIsCreating] = React.useState(false)
  const [newWorkspaceTitle, setNewWorkspaceTitle] = React.useState("")
  
  const activeWorkspace = workspaces.find(ws => ws.id === currentWorkspaceId)

  const handleCreateWorkspace = () => {
    if (newWorkspaceTitle.trim()) {
      onWorkspaceCreate(newWorkspaceTitle.trim())
      setNewWorkspaceTitle("")
      setIsCreating(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreateWorkspace()
    } else if (e.key === 'Escape') {
      setIsCreating(false)
      setNewWorkspaceTitle("")
    }
  }

  if (!activeWorkspace && workspaces.length === 0) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" className="opacity-50">
            <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
              <span className="text-sm font-medium">W</span>
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">No Workspace</span>
              <span className="truncate text-xs">Loading...</span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <span className="text-sm font-medium">
                  {activeWorkspace?.title?.charAt(0).toUpperCase() || 'W'}
                </span>
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">
                  {activeWorkspace?.title || 'Select Workspace'}
                </span>
                <span className="truncate text-xs">
                  {workspaces.length} workspace{workspaces.length !== 1 ? 's' : ''}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Workspaces
            </DropdownMenuLabel>
            {workspaces.map((workspace, index) => (
              <DropdownMenuItem
                key={workspace.id}
                onClick={() => onWorkspaceSelect(workspace.id)}
                className="gap-2 p-2"
              >
                <div className="flex size-6 items-center justify-center rounded-md border">
                  <span className="text-xs font-medium">
                    {workspace.title.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="font-medium">{workspace.title}</div>
                  <div className="text-xs text-muted-foreground">
                    Updated {workspace.updatedAt.toLocaleDateString()}
                  </div>
                </div>
                {workspace.id === currentWorkspaceId && (
                  <DropdownMenuShortcut>✓</DropdownMenuShortcut>
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            {isCreating ? (
              <div className="p-2">
                <input
                  type="text"
                  placeholder="Workspace name..."
                  value={newWorkspaceTitle}
                  onChange={(e) => setNewWorkspaceTitle(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={() => {
                    if (!newWorkspaceTitle.trim()) {
                      setIsCreating(false)
                    }
                  }}
                  className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  autoFocus
                />
              </div>
            ) : (
              <DropdownMenuItem 
                className="gap-2 p-2"
                onClick={() => setIsCreating(true)}
              >
                <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                  <Plus className="size-4" />
                </div>
                <div className="text-muted-foreground font-medium">Add workspace</div>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}