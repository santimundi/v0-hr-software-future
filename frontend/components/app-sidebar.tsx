"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import {
  Home,
  MessageSquare,
  User,
  FileText,
  Calendar,
  Heart,
  Users,
  ClipboardList,
  MessageCircle,
  HelpCircle,
  BookOpen,
  UserPlus,
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
import * as Utils from "@/lib/utils"

const getMainNavItems = (role: string) => {
  const baseItems = [
    { title: "Home", href: "/", icon: Home },
    { title: "My Profile", href: "/profile", icon: User },
    { title: "Benefits", href: "/benefits", icon: Heart },
    { title: "Time Off", href: "/time-off", icon: Calendar },
    { title: "Documents", href: "/documents", icon: FileText },
  ]

  if (role === "employee") {
    return [
      ...baseItems,
      { title: "Pay Stubs", href: "/employee/pay-stubs", icon: FileText },
      { title: "Chat with AI", href: "/employee/ai-chat", icon: MessageCircle },
    ]
  }

  return [
    ...baseItems,
    { title: "Chat with AI", href: role === "manager" ? "/manager/ai-chat" : "/hr/ai-chat", icon: MessageCircle },
  ]
}

const managerNavItems = [
  { title: "Team Overview", href: "/manager/team", icon: Users },
  { title: "HR Draft Check", href: "/manager/draft-check", icon: FileText },
  { title: "CV Analyzer", href: "/manager/cv-analyzer", icon: FileText },
]

const adminNavItems = [
  { title: "Organization", href: "/hr/employees", icon: Users },
  { title: "Onboarding", href: "/hr/onboarding", icon: UserPlus },
  { title: "Payroll", href: "/hr/payroll", icon: FileText },
  { title: "Announcements", href: "/hr/announcements", icon: FileText },
  { title: "Policy Studio", href: "/hr/policy-studio", icon: BookOpen },
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
                <Link href="/" className="flex flex-col items-center gap-3">
                  <div className="flex items-center justify-center w-full">
                    <Image 
                      src="/aideology_logo.jpeg" 
                      alt="AIdeology" 
                      width={200}
                      height={200}
                      className="object-contain"
                      style={{ maxWidth: '100%', height: '50px' }}
                    />
                  </div>
                  <div className="flex flex-col items-center text-center">
                    <span className="font-semibold text-sidebar-foreground">AIdeology HR</span>
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
              {getMainNavItems(role).map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.href)}
                    tooltip={item.title}
                    className={Utils.cn(
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
                      className={Utils.cn(
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
                      className={Utils.cn(
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
      <SidebarFooter className="p-4 border-t border-sidebar-border space-y-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isActive("/support")}
              tooltip="Support"
              className={Utils.cn(
                "transition-colors",
                isActive("/support") && "bg-sidebar-accent text-sidebar-accent-foreground",
              )}
            >
              <Link href="/support">
                <HelpCircle className="h-4 w-4" />
                <span>Support</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="flex items-center gap-2 text-xs text-sidebar-foreground/60">
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <span>AI Systems Operational</span>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
