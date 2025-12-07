"use client"

import { FileText, Download } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function HrReportsPage() {
  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">Generate and view HR reports</p>
      </div>

      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Available Reports
          </CardTitle>
          <CardDescription>Generate reports on various HR metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Reports interface coming soon...</p>
        </CardContent>
      </Card>
    </div>
  )
}

