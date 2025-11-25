"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Home,
  MessageSquare,
  User,
  FileText,
  Calendar,
  Heart,
  Users,
  Settings,
  ClipboardList,
  Sparkles,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar"
import { useRole } from "@/lib/role-context"
import { cn } from "@/lib/utils"

const mainNavItems = [
  { title: "Home", href: "/", icon: Home },
  { title: "Ask HR Copilot", href: "/chat", icon: MessageSquare },
  { title: "My Profile", href: "/profile", icon: User },
  { title: "Documents", href: "/documents", icon: FileText },
  { title: "Time Off", href: "/time-off", icon: Calendar },
  { title: "Benefits", href: "/benefits", icon: Heart },
]

const managerNavItems = [{ title: "Manager Hub", href: "/manager", icon: Users }]

const adminNavItems = [
  { title: "Admin Console", href: "/admin", icon: Settings },
  { title: "Audit Log", href: "/audit", icon: ClipboardList },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { role } = useRole()

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/"
    return pathname.startsWith(href)
  }

  return (
    <Sidebar className="border-r-0">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sidebar-primary">
            <Sparkles className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-sidebar-foreground">HR Copilot</span>
            <span className="text-xs text-sidebar-foreground/60">HR of the Future</span>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider">
            Main
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.href)}
                    className={cn(
                      "transition-colors",
                      isActive(item.href) && "bg-sidebar-accent text-sidebar-accent-foreground",
                    )}
                  >
                    <Link href={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {(role === "manager" || role === "hr-admin") && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider">
              Management
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {managerNavItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.href)}
                      className={cn(
                        "transition-colors",
                        isActive(item.href) && "bg-sidebar-accent text-sidebar-accent-foreground",
                      )}
                    >
                      <Link href={item.href}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {role === "hr-admin" && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider">
              Administration
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminNavItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.href)}
                      className={cn(
                        "transition-colors",
                        isActive(item.href) && "bg-sidebar-accent text-sidebar-accent-foreground",
                      )}
                    >
                      <Link href={item.href}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-2 text-xs text-sidebar-foreground/60">
          <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
          <span>AI Systems Operational</span>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
