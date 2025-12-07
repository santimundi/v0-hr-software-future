"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { FileText, Download, Calendar } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useRole } from "@/lib/role-context"

export default function HrPayrollPage() {
  const { role } = useRole()
  const router = useRouter()

  useEffect(() => {
    if (role !== "hr-admin") {
      router.push("/")
    }
  }, [role, router])

  if (role !== "hr-admin") {
    return null
  }
  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Payroll</h1>
        <p className="text-muted-foreground">Manage payroll processing and reports</p>
      </div>

      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Payroll Cycles
          </CardTitle>
          <CardDescription>View and process payroll cycles</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 rounded-lg border border-border/50">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">November 2024</p>
                  <p className="text-sm text-muted-foreground">Processed on Nov 15, 2024</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-success">Completed</Badge>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

