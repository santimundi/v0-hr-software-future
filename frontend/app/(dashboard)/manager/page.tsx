"use client"

import { Users, Calendar, AlertTriangle, Sparkles, Check, X, Clock } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useRole } from "@/lib/role-context"
import { redirect } from "next/navigation"

const teamMembers = [
  {
    id: "1",
    name: "Sarah Chen",
    role: "Senior Software Engineer",
    status: "active",
    avatar: "/woman-engineer-at-work.png",
  },
  { id: "2", name: "Alex Kim", role: "Software Engineer", status: "pto", avatar: "/man-developer.png" },
  { id: "3", name: "Jordan Lee", role: "Junior Developer", status: "active", avatar: "/person-coder.jpg" },
]

const pendingApprovals = [
  { id: "1", employee: "Sarah Chen", type: "Annual Leave", dates: "Jan 20-24, 2025", days: 5, reason: "Personal trip" },
  { id: "2", employee: "Alex Kim", type: "WFH", dates: "Dec 2-6, 2024", days: 5, reason: "Home repairs" },
]

export default function ManagerHubPage() {
  const { role } = useRole()

  if (role === "employee") {
    redirect("/")
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Manager Hub</h1>
        <p className="text-muted-foreground">Team overview, approvals, and AI-powered insights</p>
      </div>

      {/* AI Insights Alert */}
      <Alert className="bg-primary/5 border-primary/20">
        <Sparkles className="h-4 w-4 text-primary" />
        <AlertTitle>AI Insight</AlertTitle>
        <AlertDescription className="flex items-center justify-between">
          <span>
            3 team members have overlapping PTO requests for the week of Dec 23rd. Consider reviewing for coverage.
          </span>
          <Button variant="outline" size="sm" className="ml-4 bg-transparent">
            View Details
          </Button>
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Team Stats */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Team Size</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">Direct reports</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Approvals</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">2</div>
            <p className="text-xs text-muted-foreground">Awaiting your decision</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Team Availability</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">67%</div>
            <p className="text-xs text-muted-foreground">Available this week</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Team Roster */}
        <Card>
          <CardHeader>
            <CardTitle>Team Roster</CardTitle>
            <CardDescription>Your direct reports</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {teamMembers.map((member) => (
                <div key={member.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={member.avatar || "/placeholder.svg"} alt={member.name} />
                      <AvatarFallback>
                        {member.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{member.name}</p>
                      <p className="text-sm text-muted-foreground">{member.role}</p>
                    </div>
                  </div>
                  <Badge variant={member.status === "active" ? "secondary" : "outline"}>
                    {member.status === "active" ? "Active" : "On PTO"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* AI Summaries */}
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Summaries
            </CardTitle>
            <CardDescription>Quick insights about your team</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start bg-transparent" asChild>
              <a href="/chat?prompt=Summarize team PTO for the next 30 days">
                <Calendar className="h-4 w-4 mr-2" />
                Team PTO next 30 days
              </a>
            </Button>
            <Button variant="outline" className="w-full justify-start bg-transparent" asChild>
              <a href="/chat?prompt=Show team capacity and availability">
                <Users className="h-4 w-4 mr-2" />
                Team capacity overview
              </a>
            </Button>
            <Button variant="outline" className="w-full justify-start bg-transparent" asChild>
              <a href="/chat?prompt=Who on my team might be at risk of burnout?">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Burnout risk indicators
              </a>
            </Button>
            <div className="text-xs text-muted-foreground p-2 bg-background rounded-lg">
              <AlertTriangle className="h-3 w-3 inline mr-1" />
              Burnout insights are demo indicators only and should be used alongside direct conversations with team
              members.
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Approvals */}
      <Card className="border-warning/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-warning" />
            Pending Approvals
          </CardTitle>
          <CardDescription>Requests awaiting your decision</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingApprovals.map((request) => (
                <TableRow key={request.id}>
                  <TableCell className="font-medium">{request.employee}</TableCell>
                  <TableCell>{request.type}</TableCell>
                  <TableCell>{request.dates}</TableCell>
                  <TableCell>{request.days}</TableCell>
                  <TableCell className="text-muted-foreground">{request.reason}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 text-success border-success hover:bg-success/10 bg-transparent"
                      >
                        <Check className="h-3 w-3" />
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 text-destructive border-destructive hover:bg-destructive/10 bg-transparent"
                      >
                        <X className="h-3 w-3" />
                        Reject
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
