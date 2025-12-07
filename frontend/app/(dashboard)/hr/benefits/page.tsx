"use client"

import { Heart, Settings } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function HrBenefitsPage() {
  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Benefits Management</h1>
        <p className="text-muted-foreground">Configure and manage employee benefits</p>
      </div>

      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            Benefits Plans
          </CardTitle>
          <CardDescription>Manage benefit plans and enrollment</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Benefits management interface coming soon...</p>
        </CardContent>
      </Card>
    </div>
  )
}

