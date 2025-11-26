"use client"

import { Calendar, FileText, Clock, Sparkles, Shield, Database, Users, ArrowRight } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useRole } from "@/lib/role-context"
import { hrisData, documents, timeOffRequests } from "@/lib/mock-data"
import Link from "next/link"

const quickPrompts = {
  employee: [
    { label: "Vacation balance", prompt: "How many vacation days do I have left?" },
    { label: "Benefits explained", prompt: "Explain my health benefits in simple terms" },
    { label: "Performance goals", prompt: "Summarize my last review and suggest growth goals" },
    { label: "Request time off", prompt: "Help me request 5 days off in December" },
  ],
  manager: [
    { label: "Team PTO conflicts", prompt: "Show my team PTO conflicts next month" },
    { label: "Pending approvals", prompt: "What requests need my approval?" },
    { label: "Team capacity", prompt: "Who is available next week?" },
    { label: "Performance insights", prompt: "Summarize team performance trends" },
  ],
  "hr-admin": [
    { label: "Policy test", prompt: "Test new Annual Leave policy wording" },
    { label: "Compliance check", prompt: "Are there any compliance risks this month?" },
    { label: "Audit summary", prompt: "Summarize AI access patterns this week" },
    { label: "Generate letter", prompt: "Draft an employment verification letter" },
  ],
}

const dataAccessScope = {
  employee: {
    title: "Personal Data Access",
    description: "You can ask about your personal HR profile, documents, and company policies.",
    items: ["Personal HR profile", "Your documents", "Company policies", "Your time off balance"],
  },
  manager: {
    title: "Team Data Access",
    description: "You have access to your personal data plus team-level information.",
    items: ["Everything in Employee", "Team requests & approvals", "Team org information", "Direct report profiles"],
  },
  "hr-admin": {
    title: "Full Organization Access",
    description: "You have comprehensive access to HR data across the organization.",
    items: ["All employee data", "Policy management", "Audit logs", "System configuration"],
  },
}

export default function HomePage() {
  const { role, currentUser } = useRole()
  const userData = hrisData["emp-001"]
  const userDocs = documents.filter((d) => d.userId === "emp-001")
  const pendingRequests = timeOffRequests.filter((r) => r.status === "submitted")

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Welcome Section */}
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Welcome back, {currentUser.name.split(" ")[0]}</h1>
        <p className="text-muted-foreground">
          Your AI-powered HR assistant is ready to help. Ask anything about HR policies, your profile, or documents.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Time Off Balance</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userData.timeOffBalance.annual} days</div>
            <p className="text-xs text-muted-foreground">Annual leave remaining</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userDocs.length}</div>
            <p className="text-xs text-muted-foreground">Personal documents</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Next Review</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Dec 15</div>
            <p className="text-xs text-muted-foreground">Performance review</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {role === "employee" ? "Pending Requests" : "Awaiting Approval"}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingRequests.length}</div>
            <p className="text-xs text-muted-foreground">{role === "employee" ? "Your requests" : "Team requests"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Prompts */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle>What can I help you with?</CardTitle>
          </div>
          <CardDescription>Click a suggestion or ask anything in the HR Copilot chat</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {quickPrompts[role].map((prompt, i) => (
              <Link key={i} href={`/chat?prompt=${encodeURIComponent(prompt.prompt)}`}>
                <Button variant="secondary" className="h-auto py-2 px-4">
                  {prompt.label}
                  <ArrowRight className="ml-2 h-3 w-3" />
                </Button>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Data Access Scope */}
        <Card className="bg-card border-border/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-success" />
              <CardTitle>{dataAccessScope[role].title}</CardTitle>
            </div>
            <CardDescription>{dataAccessScope[role].description}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {dataAccessScope[role].items.map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <Database className="h-3 w-3" />
              <span>All AI access is logged and auditable</span>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="bg-card border-border/50">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest HR interactions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium">Asked about vacation balance</p>
                  <p className="text-xs text-muted-foreground">2 hours ago</p>
                </div>
                <Badge variant="secondary" className="text-xs">
                  Query
                </Badge>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-success/10 flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-success" />
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium">Time off request approved</p>
                  <p className="text-xs text-muted-foreground">Yesterday</p>
                </div>
                <Badge variant="secondary" className="text-xs bg-success/10 text-success">
                  Approved
                </Badge>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-chart-1/10 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-chart-1" />
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium">Performance review summary</p>
                  <p className="text-xs text-muted-foreground">2 days ago</p>
                </div>
                <Badge variant="secondary" className="text-xs">
                  Document
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trust & Safety Banner */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Built with Trust & Safety</h3>
                <p className="text-sm text-muted-foreground">
                  Every AI response includes citations, respects permissions, and is fully auditable.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 md:ml-auto">
              <Badge variant="outline" className="bg-card">
                Sources cited
              </Badge>
              <Badge variant="outline" className="bg-card">
                PII masked
              </Badge>
              <Badge variant="outline" className="bg-card">
                Audit logged
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
