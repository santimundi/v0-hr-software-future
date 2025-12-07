"use client"

import { Settings as SettingsIcon } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function HrSettingsPage() {
  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Configure HR system settings</p>
      </div>

      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            System Settings
          </CardTitle>
          <CardDescription>Manage system configuration and preferences</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Settings interface coming soon...</p>
        </CardContent>
      </Card>
    </div>
  )
}

