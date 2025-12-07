"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Users, ArrowLeft, UserCheck, Mail, Phone } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { createClient } from "@/lib/supabase/client"
import { useRole } from "@/lib/role-context"
import { redirect } from "next/navigation"

interface Department {
  id: string
  name: string
  description: string
}

interface Manager {
  id: string
  first_name: string
  last_name: string
  job_title: string
  department_id: string
  manager_id: string | null
  hire_date: string
}

interface Employee {
  id: string
  employee_id: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  job_title: string
  department_id: string
  manager_id: string | null
}

export default function DepartmentEmployeesPage() {
  const { role } = useRole()
  const params = useParams()
  const router = useRouter()
  const departmentId = params.departmentId as string

  const [department, setDepartment] = useState<Department | null>(null)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [manager, setManager] = useState<Manager | null>(null)
  const [loading, setLoading] = useState(true)

  if (role !== "hr-admin") {
    redirect("/")
  }

  useEffect(() => {
    async function fetchData() {
      try {
        const supabase = createClient()

        // Fetch department
        const { data: deptData, error: deptError } = await supabase
          .from("departments")
          .select("*")
          .eq("id", departmentId)
          .single()

        if (deptError) {
          console.error("Error fetching department:", deptError)
          throw deptError
        }

        setDepartment(deptData)
        console.log("Department fetched:", deptData)
        console.log("Department ID:", departmentId)

        // First, let's check all employees to see what we have
        const { data: allEmployees, error: allEmpError } = await supabase
          .from("employees")
          .select("id, first_name, last_name, department_id")
          .limit(10)

        console.log("Sample of all employees (first 10):", allEmployees)
        console.log("Department ID we're looking for:", departmentId)
        console.log("Department ID type:", typeof departmentId)

        // Fetch employees in this department
        const { data: empData, error: empError } = await supabase
          .from("employees")
          .select("*")
          .eq("department_id", departmentId)
          .order("first_name")

        if (empError) {
          console.error("Error fetching employees:", empError)
          throw empError
        }

        console.log("Employees fetched for department:", empData?.length || 0, empData)
        
        // Also try fetching without the filter to see if query works
        const { data: testData } = await supabase
          .from("employees")
          .select("id, first_name, last_name, department_id")
          .limit(5)
        console.log("Test query (first 5 employees):", testData)

        // Fetch manager for this department
        const { data: mgrData, error: mgrError } = await supabase
          .from("managers")
          .select("*")
          .eq("department_id", departmentId)
          .maybeSingle()

        if (mgrError) {
          console.error("Error fetching manager:", mgrError)
          // Don't throw - manager might not exist
        }

        console.log("Manager fetched:", mgrData)
        setManager(mgrData || null)

        // Sort employees: manager first, then by name
        const sortedEmployees = [...(empData || [])].sort((a, b) => {
          // If one is the manager, put them first
          if (mgrData && a.id === mgrData.id) return -1
          if (mgrData && b.id === mgrData.id) return 1
          // Otherwise sort by name
          const nameA = `${a.first_name} ${a.last_name}`
          const nameB = `${b.first_name} ${b.last_name}`
          return nameA.localeCompare(nameB)
        })

        setEmployees(sortedEmployees)
      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setLoading(false)
      }
    }

    if (departmentId) {
      fetchData()
    }
  }, [departmentId])

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0]}${lastName[0]}`.toUpperCase()
  }

  if (loading) {
    return (
      <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Loading...</h1>
        </div>
      </div>
    )
  }

  if (!department) {
    return (
      <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Department Not Found</h1>
          <Button onClick={() => router.push("/hr/employees")} variant="outline" className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Departments
          </Button>
        </div>
      </div>
    )
  }

  const regularEmployees = employees.filter((emp) => !manager || emp.id !== manager.id)

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/hr/employees")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Departments
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{department.name}</h1>
          <p className="text-muted-foreground">{department.description}</p>
        </div>
      </div>

      {/* Manager Section */}
      {manager && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-primary" />
              Department Manager
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-primary/20 text-primary text-lg">
                  {getInitials(manager.first_name, manager.last_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-lg font-semibold">
                    {manager.first_name} {manager.last_name}
                  </p>
                  <Badge className="bg-primary/10 text-primary border-primary/20">Manager</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{manager.job_title}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Hired: {new Date(manager.hire_date).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Employees Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Employees ({employees.length})
              </CardTitle>
              <CardDescription>All employees in {department.name}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {regularEmployees.map((employee) => (
              <div
                key={employee.id}
                className="flex items-center gap-4 p-4 rounded-lg border hover:bg-accent/50 transition-colors"
              >
                <Avatar className="h-12 w-12">
                  <AvatarFallback>{getInitials(employee.first_name, employee.last_name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{`${employee.first_name} ${employee.last_name}`}</p>
                  <p className="text-sm text-muted-foreground">{employee.job_title}</p>
                  <div className="flex items-center gap-4 mt-1">
                    {employee.email && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        {employee.email}
                      </div>
                    )}
                    {employee.phone && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {employee.phone}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">{employee.employee_id}</Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // TODO: Navigate to employee detail page
                    }}
                  >
                    View
                  </Button>
                </div>
              </div>
            ))}

            {regularEmployees.length === 0 && (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No employees in this department</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

