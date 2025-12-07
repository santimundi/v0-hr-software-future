"use client"

import { useState } from "react"
import { Users, Search, Building2, UserCheck } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useRole } from "@/lib/role-context"
import { redirect } from "next/navigation"

interface Department {
  id: string
  name: string
  description: string
  employeeCount: number
  hasManager: boolean
}

// Hardcoded department data
const departments: Department[] = [
  {
    id: "dept-001",
    name: "Engineering",
    description: "Software development and technical operations",
    employeeCount: 18,
    hasManager: true,
  },
  {
    id: "dept-002",
    name: "Human Resources",
    description: "People operations, recruitment, and employee relations",
    employeeCount: 5,
    hasManager: true,
  },
  {
    id: "dept-003",
    name: "Sales",
    description: "Business development and customer acquisition",
    employeeCount: 12,
    hasManager: true,
  },
  {
    id: "dept-004",
    name: "Marketing",
    description: "Brand management, campaigns, and communications",
    employeeCount: 8,
    hasManager: true,
  },
  {
    id: "dept-005",
    name: "Finance",
    description: "Accounting, budgeting, and financial planning",
    employeeCount: 6,
    hasManager: true,
  },
  {
    id: "dept-006",
    name: "Operations",
    description: "Business operations and process management",
    employeeCount: 10,
    hasManager: true,
  },
]

export default function HrEmployeesPage() {
  const { role } = useRole()
  const [searchQuery, setSearchQuery] = useState("")

  if (role !== "hr-admin") {
    redirect("/")
  }


  const filteredDepartments = departments.filter((dept) => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    return (
      dept.name.toLowerCase().includes(query) ||
      dept.description.toLowerCase().includes(query)
    )
  })

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Organization</h1>
        <p className="text-muted-foreground">Manage all employees organized by department</p>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search departments or employees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Department Widgets */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredDepartments.map((department) => (
          <Card
            key={department.id}
            className="transition-all"
          >
            <CardHeader>
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">{department.name}</CardTitle>
                  <CardDescription className="mt-1">{department.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{department.employeeCount} employees</span>
                </div>
                {department.hasManager && (
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                    <UserCheck className="h-3 w-3 mr-1" />
                    Manager
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredDepartments.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No departments found matching your search</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
