"use client"

import { useState, useMemo } from "react"
import { Users, CheckCircle2, XCircle, Calendar, TrendingUp, UserPlus, Clock, Mail, Phone, Sparkles, Activity, Award } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { useRole } from "@/lib/role-context"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { toast } from "sonner"
import * as MockData from "@/lib/mock-data"
import { cn } from "@/lib/utils"

interface TeamMember {
  id: string
  employee_id: string
  name: string
  role: string
  avatar?: string
  status: string
  ptoBalance: number
  department: string
  email: string
  phone?: string
}

// HR Director's direct reports (department managers)
const hrDirectorDirectReports: TeamMember[] = [
  {
    id: "emp-hr-001",
    employee_id: "EMP000004",
    name: "Youssef Al-Mansour",
    role: "Sales Manager",
    email: "youssef.almansour@company.com",
    status: "active",
    ptoBalance: 15,
    department: "Sales",
  },
  {
    id: "emp-hr-002",
    employee_id: "EMP000047",
    name: "Sarah Chen",
    role: "Marketing Director",
    email: "sarah.chen@company.com",
    status: "active",
    ptoBalance: 18,
    department: "Marketing",
  },
  {
    id: "emp-hr-003",
    employee_id: "EMP000059",
    name: "Amina Farouq",
    role: "HR Manager",
    email: "amina.farouq@company.com",
    status: "active",
    ptoBalance: 12,
    department: "Human Resources",
  },
  {
    id: "emp-hr-004",
    employee_id: "EMP000012",
    name: "Luca Moretti",
    role: "Finance Manager",
    email: "luca.moretti@company.com",
    status: "active",
    ptoBalance: 14,
    department: "Finance",
  },
  {
    id: "emp-hr-005",
    employee_id: "EMP000002",
    name: "Alex Rivera",
    role: "Engineering Manager",
    email: "alex.rivera@company.com",
    status: "active",
    ptoBalance: 16,
    department: "Engineering",
  },
]

// Manager's direct reports (engineering team)
const teamMembers: TeamMember[] = [
  {
    id: "emp-001",
    employee_id: "EMP000006",
    name: "Emma Johnson",
    role: "Senior Software Engineer",
    email: "emma.johnson@company.com",
    status: "active",
    ptoBalance: 12,
    department: "Engineering",
  },
  {
    id: "emp-002",
    employee_id: "EMP000007",
    name: "David Wong",
    role: "Software Engineer",
    email: "david.wong@company.com",
    status: "active",
    ptoBalance: 15,
    department: "Engineering",
  },
  {
    id: "emp-003",
    employee_id: "EMP000008",
    name: "Olivia Martinez",
    role: "Software Engineer",
    email: "olivia.martinez@company.com",
    status: "active",
    ptoBalance: 10,
    department: "Engineering",
  },
  {
    id: "emp-004",
    employee_id: "EMP000009",
    name: "Mateo García",
    role: "Software Engineer",
    email: "mateo.garcía@example.com",
    status: "active",
    ptoBalance: 8,
    department: "Engineering",
  },
  {
    id: "emp-005",
    employee_id: "EMP000010",
    name: "Omar Haddad",
    role: "Software Engineer",
    email: "omar.haddad@example.com",
    status: "active",
    ptoBalance: 14,
    department: "Engineering",
  },
  {
    id: "emp-006",
    employee_id: "EMP000011",
    name: "Aisha Khan",
    role: "Software Engineer",
    email: "aisha.khan@example.com",
    status: "active",
    ptoBalance: 11,
    department: "Engineering",
  },
  {
    id: "emp-007",
    employee_id: "EMP000012",
    name: "Liam Martinez",
    role: "Software Engineer",
    email: "liam.martinez@example.com",
    status: "active",
    ptoBalance: 9,
    department: "Engineering",
  },
  {
    id: "emp-008",
    employee_id: "EMP000013",
    name: "Kwame Mensah",
    role: "Software Engineer",
    email: "kwame.mensah@example.com",
    status: "active",
    ptoBalance: 13,
    department: "Engineering",
  },
  {
    id: "emp-009",
    employee_id: "EMP000014",
    name: "Jonas Müller",
    role: "Software Engineer",
    email: "jonas.müller@example.com",
    status: "active",
    ptoBalance: 7,
    department: "Engineering",
  },
  {
    id: "emp-010",
    employee_id: "EMP000015",
    name: "Eva Novak",
    role: "Software Engineer",
    email: "eva.novak@example.com",
    status: "active",
    ptoBalance: 16,
    department: "Engineering",
  },
  {
    id: "emp-011",
    employee_id: "EMP000016",
    name: "Noah O'Connor",
    role: "Software Engineer",
    email: "noah.o'connor@example.com",
    status: "active",
    ptoBalance: 10,
    department: "Engineering",
  },
  {
    id: "emp-012",
    employee_id: "EMP000017",
    name: "Chinonso Okafor",
    role: "DevOps Engineer",
    email: "chinonso.okafor@example.com",
    status: "active",
    ptoBalance: 12,
    department: "Engineering",
  },
  {
    id: "emp-013",
    employee_id: "EMP000018",
    name: "Arjun Patel",
    role: "Software Engineer",
    email: "arjun.patel@example.com",
    status: "active",
    ptoBalance: 14,
    department: "Engineering",
  },
  {
    id: "emp-014",
    employee_id: "EMP000019",
    name: "Elena Popescu",
    role: "Software Engineer",
    email: "elena.popescu@example.com",
    status: "active",
    ptoBalance: 11,
    department: "Engineering",
  },
  {
    id: "emp-015",
    employee_id: "EMP000020",
    name: "Sofia Rossi",
    role: "Software Engineer",
    email: "sofia.rossi@example.com",
    status: "active",
    ptoBalance: 9,
    department: "Engineering",
  },
  {
    id: "emp-016",
    employee_id: "EMP000021",
    name: "Priya Shah",
    role: "QA Engineer",
    email: "priya.shah@example.com",
    status: "active",
    ptoBalance: 13,
    department: "Engineering",
  },
  {
    id: "emp-017",
    employee_id: "EMP000022",
    name: "Yuki Tanaka",
    role: "Software Engineer",
    email: "yuki.tanaka@example.com",
    status: "active",
    ptoBalance: 15,
    department: "Engineering",
  },
  {
    id: "emp-018",
    employee_id: "EMP000023",
    name: "Ming Zhang",
    role: "Software Engineer",
    email: "ming.zhang@example.com",
    status: "active",
    ptoBalance: 8,
    department: "Engineering",
  },
]

// Mock pending approvals for managers
const mockPendingApprovals = [
  {
    id: "pto-003",
    employee: "Emma Johnson",
    employeeId: "EMP000006",
    type: "annual",
    startDate: "2025-01-20",
    endDate: "2025-01-24",
    days: 5,
    reason: "Personal trip",
  },
  {
    id: "pto-004",
    employee: "David Wong",
    employeeId: "EMP000007",
    type: "annual",
    startDate: "2025-02-10",
    endDate: "2025-02-14",
    days: 5,
    reason: "Family vacation",
  },
]

// Mock pending approvals for HR Director
const hrDirectorPendingApprovals = [
  {
    id: "hr-pto-001",
    employee: "Sarah Chen",
    employeeId: "EMP000047",
    type: "annual",
    startDate: "2025-01-15",
    endDate: "2025-01-17",
    days: 3,
    reason: "Family time",
  },
  {
    id: "hr-pto-002",
    employee: "Alex Rivera",
    employeeId: "EMP000002",
    type: "annual",
    startDate: "2025-02-05",
    endDate: "2025-02-07",
    days: 3,
    reason: "Personal trip",
  },
]

// Mock team leave requests for calendar display
const mockTeamLeaveRequests: MockData.TimeOffRequest[] = [
  {
    id: "team-pto-001",
    userId: "EMP000006", // Emma Johnson
    type: "annual",
    startDate: "2024-12-15",
    endDate: "2024-12-15",
    status: "approved",
    reason: "Personal day",
    createdAt: "2024-12-01",
  },
  {
    id: "team-pto-002",
    userId: "EMP000007", // David Wong
    type: "annual",
    startDate: "2024-12-20",
    endDate: "2024-12-20",
    status: "approved",
    reason: "Holiday",
    createdAt: "2024-12-01",
  },
  {
    id: "team-pto-003",
    userId: "EMP000008", // Olivia Martinez
    type: "annual",
    startDate: "2024-12-18",
    endDate: "2024-12-19",
    status: "submitted",
    reason: "Personal trip",
    createdAt: "2024-12-10",
  },
  {
    id: "team-pto-004",
    userId: "EMP000009", // Mateo García
    type: "annual",
    startDate: "2024-12-23",
    endDate: "2024-12-27",
    status: "approved",
    reason: "Holiday vacation",
    createdAt: "2024-11-15",
  },
  {
    id: "team-pto-005",
    userId: "EMP000010", // Omar Haddad
    type: "sick",
    startDate: "2024-12-10",
    endDate: "2024-12-10",
    status: "approved",
    reason: "Sick day",
    createdAt: "2024-12-10",
  },
  {
    id: "team-pto-006",
    userId: "EMP000011", // Aisha Khan
    type: "annual",
    startDate: "2024-12-28",
    endDate: "2024-12-31",
    status: "submitted",
    reason: "Year-end vacation",
    createdAt: "2024-12-15",
  },
]

// Mock leave requests for HR Director's direct reports
const hrDirectorTeamLeaveRequests: MockData.TimeOffRequest[] = [
  {
    id: "hr-team-pto-001",
    userId: "EMP000004", // Youssef Al-Mansour
    type: "annual",
    startDate: "2024-12-18",
    endDate: "2024-12-20",
    status: "approved",
    reason: "Holiday break",
    createdAt: "2024-12-01",
  },
  {
    id: "hr-team-pto-002",
    userId: "EMP000047", // Sarah Chen
    type: "annual",
    startDate: "2024-12-22",
    endDate: "2024-12-24",
    status: "submitted",
    reason: "Family time",
    createdAt: "2024-12-10",
  },
  {
    id: "hr-team-pto-003",
    userId: "EMP000059", // Amina Farouq
    type: "annual",
    startDate: "2024-12-15",
    endDate: "2024-12-15",
    status: "approved",
    reason: "Personal day",
    createdAt: "2024-12-01",
  },
  {
    id: "hr-team-pto-004",
    userId: "EMP000012", // Luca Moretti
    type: "annual",
    startDate: "2024-12-28",
    endDate: "2024-12-31",
    status: "approved",
    reason: "Year-end vacation",
    createdAt: "2024-11-20",
  },
  {
    id: "hr-team-pto-005",
    userId: "EMP000002", // Alex Rivera
    type: "annual",
    startDate: "2024-12-19",
    endDate: "2024-12-19",
    status: "submitted",
    reason: "Personal day",
    createdAt: "2024-12-12",
  },
]

// Get leave requests for team members
const getTeamLeaveRequests = (teamMemberIds: string[], isHrAdmin: boolean = false) => {
  // Combine mock data with team-specific mock requests
  const teamSpecificRequests = isHrAdmin ? hrDirectorTeamLeaveRequests : mockTeamLeaveRequests
  const allRequests = [...MockData.timeOffRequests, ...teamSpecificRequests]
  return allRequests.filter((request) =>
    teamMemberIds.includes(request.userId)
  )
}

export default function ManagerTeamPage() {
  const { role, currentUser } = useRole()
  const router = useRouter()
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null)
  const [pendingApprovals, setPendingApprovals] = useState(
    role === "hr-admin" ? hrDirectorPendingApprovals : mockPendingApprovals
  )
  
  // Update pending approvals when role changes
  useEffect(() => {
    setPendingApprovals(role === "hr-admin" ? hrDirectorPendingApprovals : mockPendingApprovals)
  }, [role])
  const [openPositions] = useState(1)
  const [recentHires] = useState(2)

  // Restrict access to managers and HR admins only
  useEffect(() => {
    if (role !== "manager" && role !== "hr-admin") {
      router.push("/")
    }
  }, [role, router])

  // Don't render if user is not authorized
  if (role !== "manager" && role !== "hr-admin") {
    return null
  }

  const handleApprove = (approvalId: string) => {
    setPendingApprovals((prev) => prev.filter((a) => a.id !== approvalId))
    toast.success("PTO request approved", {
      icon: <CheckCircle2 className="h-4 w-4" />,
    })
  }

  const handleDecline = (approvalId: string) => {
    setPendingApprovals((prev) => prev.filter((a) => a.id !== approvalId))
    toast.success("PTO request declined", {
      icon: <XCircle className="h-4 w-4" />,
    })
  }

  // Determine which team members to show based on role
  const displayTeamMembers = role === "hr-admin" ? hrDirectorDirectReports : teamMembers
  const displayTeamMemberIds = displayTeamMembers.map((m) => m.employee_id)
  const attendanceToday = displayTeamMembers.length
  
  // Get all leave requests for the team
  const teamLeaveRequests = useMemo(() => getTeamLeaveRequests(displayTeamMemberIds, role === "hr-admin"), [displayTeamMemberIds, role])

  // Create a map of dates to leave request statuses
  const leaveDatesMap = useMemo(() => {
    const map = new Map<string, "approved" | "submitted">()
    
    teamLeaveRequests.forEach((request) => {
      if (request.status === "approved" || request.status === "submitted") {
        const startDate = new Date(request.startDate)
        const endDate = new Date(request.endDate)
        
        // Add all dates in the range
        const currentDate = new Date(startDate)
        while (currentDate <= endDate) {
          const dateKey = currentDate.toISOString().split("T")[0]
          // If date already has a request, prioritize approved over submitted
          if (!map.has(dateKey) || map.get(dateKey) === "submitted") {
            map.set(dateKey, request.status === "approved" ? "approved" : "submitted")
          }
          currentDate.setDate(currentDate.getDate() + 1)
        }
      }
    })
    
    return map
  }, [teamLeaveRequests])

  // Calendar modifiers for styling dates
  const calendarModifiers = {
    approved: (date: Date) => {
      const dateKey = date.toISOString().split("T")[0]
      return leaveDatesMap.get(dateKey) === "approved"
    },
    pending: (date: Date) => {
      const dateKey = date.toISOString().split("T")[0]
      return leaveDatesMap.get(dateKey) === "submitted"
    },
  }

  const calendarModifiersClassNames = {
    approved: "bg-primary text-primary-foreground hover:bg-primary/90",
    pending: "bg-yellow-500 text-white hover:bg-yellow-600",
  }

  // Calculate team stats
  const avgPtoBalance = Math.round(displayTeamMembers.reduce((sum, m) => sum + m.ptoBalance, 0) / displayTeamMembers.length)
  const activeMembers = displayTeamMembers.filter(m => m.status === "active").length

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto relative overflow-hidden">
      {/* Animated background gradient */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-1/4 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 -right-1/4 w-[600px] h-[600px] bg-primary/3 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Hero Header */}
      <div className="space-y-2 relative z-10">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground to-primary/60 bg-clip-text text-transparent">
          Team Overview
        </h1>
        <p className="text-muted-foreground text-lg">Manage your team, approvals, and insights</p>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-4 relative z-10">
        <Card className="bg-gradient-to-br from-card via-card to-primary/5 border-2 border-primary/20 backdrop-blur-sm shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          <CardContent className="p-6 relative z-10">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <TrendingUp className="h-4 w-4 text-primary opacity-50" />
            </div>
            <p className="text-3xl font-bold mb-1">{displayTeamMembers.length}</p>
            <p className="text-sm text-muted-foreground">Team Members</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card via-card to-primary/5 border-2 border-primary/20 backdrop-blur-sm shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          <CardContent className="p-6 relative z-10">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 rounded-xl bg-yellow-500/10 group-hover:bg-yellow-500/20 transition-colors">
                <Clock className="h-6 w-6 text-yellow-500" />
              </div>
              <Activity className="h-4 w-4 text-yellow-500 opacity-50" />
            </div>
            <p className="text-3xl font-bold mb-1 text-yellow-500">{pendingApprovals.length}</p>
            <p className="text-sm text-muted-foreground">Pending Approvals</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card via-card to-primary/5 border-2 border-primary/20 backdrop-blur-sm shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          <CardContent className="p-6 relative z-10">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <Award className="h-4 w-4 text-primary opacity-50" />
            </div>
            <p className="text-3xl font-bold mb-1">{avgPtoBalance}</p>
            <p className="text-sm text-muted-foreground">Avg PTO Balance</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card via-card to-primary/5 border-2 border-primary/20 backdrop-blur-sm shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          <CardContent className="p-6 relative z-10">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <CheckCircle2 className="h-6 w-6 text-primary" />
              </div>
              <Sparkles className="h-4 w-4 text-primary opacity-50" />
            </div>
            <p className="text-3xl font-bold mb-1 text-primary">{activeMembers}</p>
            <p className="text-sm text-muted-foreground">Active Members</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3 relative z-10">
        {/* Team Members Grid */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-gradient-to-br from-card via-card to-primary/5 border-2 border-primary/20 backdrop-blur-sm shadow-xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-1000" />
            <CardHeader className="relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    Team Members
                  </CardTitle>
                  <CardDescription className="mt-1">{displayTeamMembers.length} direct reports</CardDescription>
                </div>
                <Badge className="bg-primary/10 text-primary border-primary/20">
                  {activeMembers} Active
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              {displayTeamMembers.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No direct reports found</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {displayTeamMembers.map((member) => (
                    <button
                      key={member.id}
                      onClick={() => setSelectedMember(member)}
                      className="group text-left p-5 rounded-xl border-2 border-border/50 bg-gradient-to-br from-card to-card hover:from-primary/5 hover:to-primary/10 hover:border-primary/30 hover:shadow-lg transition-all duration-300 hover:scale-[1.02] relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                      <div className="relative z-10 flex items-start gap-4">
                        <div className="relative">
                          <Avatar className="h-14 w-14 ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all">
                            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold text-lg">
                              {member.name.split(" ").map((n) => n[0]).join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-primary border-2 border-card" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-semibold text-base truncate group-hover:text-primary transition-colors">{member.name}</p>
                              <p className="text-sm text-muted-foreground truncate mt-0.5">{member.role}</p>
                            </div>
                            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs shrink-0 ml-2">
                              {member.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                            <Mail className="h-3 w-3" />
                            <span className="truncate">{member.email}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">
                              <Calendar className="h-3 w-3 mr-1" />
                              {member.ptoBalance} PTO
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Approvals Card */}
          <Card className={`bg-gradient-to-br from-card via-card ${pendingApprovals.length > 0 ? "to-yellow-500/10 border-2 border-yellow-500/30 shadow-xl" : "to-card border-2 border-border/50"} backdrop-blur-sm relative overflow-hidden transition-all duration-300`}>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-1000" />
            <CardHeader className="relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <div className={`p-2 rounded-lg ${pendingApprovals.length > 0 ? "bg-yellow-500/20" : "bg-primary/10"}`}>
                      <Clock className={`h-5 w-5 ${pendingApprovals.length > 0 ? "text-yellow-500" : "text-primary"}`} />
                    </div>
                    Pending Approvals
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {pendingApprovals.length} request{pendingApprovals.length !== 1 ? "s" : ""} awaiting your review
                  </CardDescription>
                </div>
                {pendingApprovals.length > 0 && (
                  <Badge className="bg-yellow-500 text-white border-yellow-500 animate-pulse">
                    {pendingApprovals.length}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              {pendingApprovals.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-primary/30" />
                  <p className="text-sm text-muted-foreground">All caught up! No pending approvals</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingApprovals.map((approval) => (
                    <div
                      key={approval.id}
                      className="group p-5 rounded-xl border-2 border-yellow-500/20 bg-gradient-to-br from-card to-yellow-500/5 hover:border-yellow-500/40 hover:shadow-lg transition-all duration-300 hover:scale-[1.02] relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-500/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                      <div className="relative z-10">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Avatar className="h-10 w-10 ring-2 ring-yellow-500/20">
                                <AvatarFallback className="bg-gradient-to-br from-yellow-500/20 to-yellow-500/10 text-yellow-600 font-semibold">
                                  {approval.employee.split(" ").map((n) => n[0]).join("")}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-semibold">{approval.employee}</p>
                                <p className="text-xs text-muted-foreground capitalize">{approval.type} Leave</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                <span>{new Date(approval.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })} - {new Date(approval.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                              </div>
                            </div>
                            {approval.reason && (
                              <p className="text-sm text-muted-foreground italic">"{approval.reason}"</p>
                            )}
                          </div>
                          <Badge className="bg-yellow-500/20 text-yellow-700 border-yellow-500/30 shrink-0">
                            {approval.days} {approval.days === 1 ? "day" : "days"}
                          </Badge>
                        </div>
                        <div className="flex gap-2 pt-2 border-t border-yellow-500/20">
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleApprove(approval.id)
                            }}
                            className="flex-1 bg-primary hover:bg-primary/90 shadow-md hover:shadow-lg transition-all"
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDecline(approval.id)
                            }}
                            className="flex-1 border-destructive/30 hover:bg-destructive/10 hover:border-destructive/50"
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Decline
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar: Metrics & Calendar */}
        <div className="space-y-6">
          {/* Team Metrics */}
          <Card className="bg-gradient-to-br from-card via-card to-primary/5 border-2 border-primary/20 backdrop-blur-sm shadow-xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-1000" />
            <CardHeader className="relative z-10">
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                Team Metrics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 relative z-10">
              <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 hover:border-primary/40 transition-all group">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Attendance Today</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-bold text-primary">{attendanceToday}</p>
                    <p className="text-sm text-muted-foreground">/{displayTeamMembers.length}</p>
                  </div>
                  <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all duration-500"
                      style={{ width: `${(attendanceToday / displayTeamMembers.length) * 100}%` }}
                    />
                </div>
              </div>
              <div className="p-4 rounded-xl bg-gradient-to-br from-card to-muted/30 border border-border/50 hover:border-primary/30 transition-all group">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Open Positions</p>
                <p className="text-3xl font-bold">{openPositions}</p>
              </div>
              <div className="p-4 rounded-xl bg-gradient-to-br from-card to-muted/30 border border-border/50 hover:border-primary/30 transition-all group">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Recent Hires (30 days)</p>
                <p className="text-3xl font-bold text-primary">{recentHires}</p>
              </div>
            </CardContent>
          </Card>

          {/* Team Leave Calendar */}
          <Card className="bg-gradient-to-br from-card via-card to-primary/5 border-2 border-primary/20 backdrop-blur-sm shadow-xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-1000" />
            <CardHeader className="relative z-10">
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                Team Leave Calendar
              </CardTitle>
              <CardDescription>View approved and pending leave requests</CardDescription>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="p-4 rounded-xl bg-card/50 border border-border/50">
                <CalendarComponent
                  mode="single"
                  modifiers={calendarModifiers}
                  modifiersClassNames={calendarModifiersClassNames}
                  className="rounded-md"
                />
              </div>
              <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-border/50">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Legend</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs">
                    <div className="h-3 w-3 rounded-full bg-primary shadow-sm" />
                    <span>Approved Leave</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="h-3 w-3 rounded-full bg-yellow-500 shadow-sm" />
                    <span>Pending Approval</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>

      {/* Team Member Profile Modal */}
      <Dialog open={!!selectedMember} onOpenChange={() => setSelectedMember(null)}>
        <DialogContent>
          {selectedMember && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedMember.name}</DialogTitle>
                <DialogDescription>{selectedMember.role} • {selectedMember.department}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback>{selectedMember.name.split(" ").map((n) => n[0]).join("")}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{selectedMember.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedMember.role}</p>
                    <p className="text-xs text-muted-foreground mt-1">{selectedMember.email}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">PTO Balance</p>
                    <p className="text-lg font-semibold text-primary">{selectedMember.ptoBalance} days</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge variant="outline" className="bg-success/10 text-success">
                      {selectedMember.status}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button variant="outline" className="flex-1">View Profile</Button>
                  <Button className="flex-1">Send Message</Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

