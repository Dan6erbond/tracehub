import { Link, useNavigate } from '@tanstack/react-router'
import {
  ChevronsUpDown,
  LogOut,
  Monitor,
  Moon,
  ShieldCheck,
  Sun,
  User,
} from 'lucide-react'
import { authClient } from '#/lib/auth-client'
import { isAdminRole } from '#/lib/roles'
import { useTheme } from '#/components/theme-provider'
import type { Theme } from '#/components/theme-provider'
import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '#/components/ui/sidebar'
import { Skeleton } from '#/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '#/components/ui/toggle-group'

const THEMES = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
] as const

export function NavUser() {
  const { data: session, isPending } = authClient.useSession()
  const { isMobile } = useSidebar()
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()

  if (isPending) return <Skeleton className="h-12 w-full" />
  if (!session) return null

  const { name, email, image, role } = session.user
  const initial = name.charAt(0).toUpperCase()

  const signOut = async () => {
    await authClient.signOut()
    await navigate({ to: '/login' })
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
              <Avatar className="size-8 rounded-lg">
                <AvatarImage src={image ?? undefined} alt={name} />
                <AvatarFallback className="rounded-lg">
                  {initial}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{name}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {email}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? 'bottom' : 'right'}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuItem asChild>
              <Link to="/me">
                <User />
                Profile
              </Link>
            </DropdownMenuItem>
            {isAdminRole(role) && (
              <DropdownMenuItem asChild>
                <Link to="/admin">
                  <ShieldCheck />
                  Admin
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="text-sm">Theme</span>
              <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                value={theme}
                onValueChange={(value) => value && setTheme(value as Theme)}
              >
                {THEMES.map(({ value, label, icon: Icon }) => (
                  <ToggleGroupItem key={value} value={value} aria-label={label}>
                    <Icon />
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => void signOut()}>
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
