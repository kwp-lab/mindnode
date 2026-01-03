"use client"

import { useRouter } from "next/navigation"
import {
  Folder,
  MoreHorizontal,
  Trash2,
  Plus,
  Pencil,
  type LucideIcon,
} from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupAction,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { Project } from "@/types"
import { useState } from "react"

export function NavProjects({
  projects,
  currentProjectId,
  onProjectSelect,
  onProjectCreate,
  onProjectDelete,
  onProjectRename,
}: {
  projects: Project[]
  currentProjectId: string | null
  onProjectSelect: (projectId: string) => void
  onProjectCreate: (title: string) => void
  onProjectDelete: (projectId: string) => void
  onProjectRename?: (projectId: string, newTitle: string) => void
}) {
  const router = useRouter()
  const { isMobile } = useSidebar()
  const [isCreating, setIsCreating] = useState(false)
  const [newProjectTitle, setNewProjectTitle] = useState("")

  const handleProjectClick = (project: Project) => {
    onProjectSelect(project.id)
    router.push(`/ws/canvas/${project.id}`)
  }

  const handleCreateProject = () => {
    if (newProjectTitle.trim()) {
      onProjectCreate(newProjectTitle.trim())
      setNewProjectTitle("")
      setIsCreating(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreateProject()
    } else if (e.key === 'Escape') {
      setIsCreating(false)
      setNewProjectTitle("")
    }
  }

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Projects</SidebarGroupLabel>
      <SidebarGroupAction 
        title="Add Project"
        onClick={() => setIsCreating(true)}
      >
        <Plus /> <span className="sr-only">Add Project</span>
      </SidebarGroupAction>
      <SidebarMenu>
        {/* Create new project input */}
        {isCreating && (
          <SidebarMenuItem>
            <div className="px-2 py-1">
              <input
                type="text"
                placeholder="Project name..."
                value={newProjectTitle}
                onChange={(e) => setNewProjectTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => {
                  if (!newProjectTitle.trim()) {
                    setIsCreating(false)
                  }
                }}
                className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
              />
            </div>
          </SidebarMenuItem>
        )}

        {/* Project list */}
        {projects.map((project) => (
          <SidebarMenuItem key={project.id}>
            <SidebarMenuButton 
              asChild
              isActive={project.id === currentProjectId}
              tooltip={project.title}
            >
              <button onClick={() => handleProjectClick(project)}>
                <Folder className="size-4" />
                <span>{project.title}</span>
              </button>
            </SidebarMenuButton>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuAction showOnHover>
                  <MoreHorizontal />
                  <span className="sr-only">More</span>
                </SidebarMenuAction>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-48 rounded-lg"
                side={isMobile ? "bottom" : "right"}
                align={isMobile ? "end" : "start"}
              >
                {onProjectRename && (
                  <DropdownMenuItem onClick={() => {
                    const newTitle = prompt('Enter new project name:', project.title)
                    if (newTitle && newTitle.trim()) {
                      onProjectRename(project.id, newTitle.trim())
                    }
                  }}>
                    <Pencil className="text-muted-foreground" />
                    <span>Rename</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => {
                    if (confirm(`Delete "${project.title}"? This cannot be undone.`)) {
                      onProjectDelete(project.id)
                    }
                  }}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="text-red-600" />
                  <span>Delete</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        ))}

        {/* Empty state */}
        {projects.length === 0 && !isCreating && (
          <SidebarMenuItem>
            <SidebarMenuButton 
              className="text-sidebar-foreground/70"
              onClick={() => setIsCreating(true)}
            >
              <Plus className="text-sidebar-foreground/70" />
              <span>Create your first project</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )}
      </SidebarMenu>
    </SidebarGroup>
  )
}
