"use client"

import type React from "react"

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { TopBar } from "@/components/top-bar"
import { RoleProvider } from "@/lib/role-context"
import { AskAiProvider } from "@/lib/ask-ai-context"
import { AskAiFab } from "@/components/ai/AskAiFab"
import { Toaster } from "sonner"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <RoleProvider>
      <AskAiProvider>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            <TopBar />
            <main className="flex-1 overflow-auto">{children}</main>
            <AskAiFab />
          </SidebarInset>
        </SidebarProvider>
        <Toaster position="top-right" richColors />
      </AskAiProvider>
    </RoleProvider>
  )
}
