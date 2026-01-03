"use client"

import { useRouter } from "next/navigation"
import {
  BadgeCheck,
  ChevronsUpDown,
  LogOut,
  Moon,
  Settings,
  Sun,
  Monitor,
} from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { createBrowserClient } from "@supabase/ssr"
import { useEffect, useState } from "react"

type Theme = 'light' | 'dark' | 'system'

interface NavUserProps {
  user: {
    id: string
    name?: string
    email?: string
    avatar?: string
  }
}

export function NavUser({ user }: NavUserProps) {
  const router = useRouter()
  const { isMobile } = useSidebar()
  const [theme, setTheme] = useState<Theme>('system')

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme | null
    if (savedTheme) {
      setTheme(savedTheme)
      applyTheme(savedTheme)
    }
  }, [])

  // Apply theme to document
  const applyTheme = (newTheme: Theme) => {
    const root = document.documentElement
    
    if (newTheme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      root.classList.remove('light', 'dark')
      root.classList.add(systemTheme)
    } else {
      root.classList.remove('light', 'dark')
      root.classList.add(newTheme)
    }
  }

  // Handle theme change
  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    applyTheme(newTheme)
  }

  // Handle logout
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

  // Handle account settings
  const handleAccountSettings = () => {
    // TODO: Navigate to account settings page
    console.log('Navigate to account settings')
    // router.push('/settings/account')
  }

  // Get user initials for avatar fallback
  const getInitials = () => {
    if (user.name) {
      return user.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }
    if (user.email) {
      return user.email[0].toUpperCase()
    }
    return 'U'
  }

  // Get display name
  const displayName = user.name || user.email?.split('@')[0] || 'User'

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={user.avatar} alt={displayName} />
                <AvatarFallback className="rounded-lg bg-primary/10 text-primary">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{displayName}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {user.email || 'No email'}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            {/* User info header */}
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={displayName} />
                  <AvatarFallback className="rounded-lg bg-primary/10 text-primary">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{displayName}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {user.email || 'No email'}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            
            <DropdownMenuSeparator />
            
            {/* Settings group */}
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={handleAccountSettings}>
                <BadgeCheck className="mr-2 h-4 w-4" />
                <span>Account Settings</span>
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={handleAccountSettings}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Preferences</span>
              </DropdownMenuItem>
              
              {/* Theme submenu */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  {theme === 'dark' ? (
                    <Moon className="mr-2 h-4 w-4" />
                  ) : theme === 'light' ? (
                    <Sun className="mr-2 h-4 w-4" />
                  ) : (
                    <Monitor className="mr-2 h-4 w-4" />
                  )}
                  <span>Theme</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => handleThemeChange('light')}>
                    <Sun className="mr-2 h-4 w-4" />
                    <span>Light</span>
                    {theme === 'light' && <span className="ml-auto">✓</span>}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleThemeChange('dark')}>
                    <Moon className="mr-2 h-4 w-4" />
                    <span>Dark</span>
                    {theme === 'dark' && <span className="ml-auto">✓</span>}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleThemeChange('system')}>
                    <Monitor className="mr-2 h-4 w-4" />
                    <span>System</span>
                    {theme === 'system' && <span className="ml-auto">✓</span>}
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuGroup>
            
            <DropdownMenuSeparator />
            
            {/* Logout */}
            <DropdownMenuItem 
              onClick={handleLogout}
              className="text-red-600 focus:text-red-600 focus:bg-red-50"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
