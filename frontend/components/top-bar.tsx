"use client"

import { useEffect, useState } from "react"
import { Bell, Search, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { useRole } from "@/lib/role-context"
import type * as MockData from "@/lib/mock-data"

const roleLabels: Record<MockData.UserRole, { label: string; color: string }> = {
  employee: { label: "Employee", color: "bg-primary text-primary-foreground" },
  manager: { label: "Manager", color: "bg-primary text-primary-foreground" },
  "hr-admin": { label: "HR Director", color: "bg-primary text-primary-foreground" },
}

export function TopBar() {
  const { role, setRole, currentUser } = useRole()
  const [mounted, setMounted] = useState(false)

  // Prevent hydration mismatch by only rendering dropdown after mount
  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-4 border-b bg-card px-4 lg:px-6">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="lg:hidden" />
        <div className="hidden lg:flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Search anything...</span>
          <kbd className="ml-2 pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
            <span className="text-xs">⌘</span>K
          </kbd>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-9 w-9 relative">
          <Bell className="h-4 w-4" />
          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-destructive" />
          <span className="sr-only">Notifications</span>
        </Button>

        {mounted ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-2">
                <Badge className={roleLabels[role].color} variant="secondary">
                  {roleLabels[role].label}
                </Badge>
                <Avatar className="h-8 w-8">
                  <AvatarImage src={currentUser.avatar || "/placeholder.svg"} alt={currentUser.name} />
                  <AvatarFallback>
                    {currentUser.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:flex flex-col items-start">
                  <span className="text-sm font-medium">{currentUser.name}</span>
                  <span className="text-xs text-muted-foreground">{currentUser.title}</span>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Switch Role (Demo)</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setRole("employee")}>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <span>Employee</span>
                </div>
                {role === "employee" && <span className="ml-auto text-xs">✓</span>}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setRole("manager")}>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <span>Manager</span>
                </div>
                {role === "manager" && <span className="ml-auto text-xs">✓</span>}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setRole("hr-admin")}>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <span>HR Director</span>
                </div>
                {role === "hr-admin" && <span className="ml-auto text-xs">✓</span>}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                Role affects data access & UI
              </DropdownMenuLabel>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          // Fallback during SSR to prevent hydration mismatch
          <Button variant="ghost" className="flex items-center gap-2 px-2">
            <Badge className={roleLabels[role].color} variant="secondary">
              {roleLabels[role].label}
            </Badge>
            <Avatar className="h-8 w-8">
              <AvatarImage src={currentUser.avatar || "/placeholder.svg"} alt={currentUser.name} />
              <AvatarFallback>
                {currentUser.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <div className="hidden md:flex flex-col items-start">
              <span className="text-sm font-medium">{currentUser.name}</span>
              <span className="text-xs text-muted-foreground">{currentUser.title}</span>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </Button>
        )}
      </div>
    </header>
  )
}
