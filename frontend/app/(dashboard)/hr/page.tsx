"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Users, TrendingUp, UserPlus, FileText, Bell, CheckCircle2, AlertCircle } from "lucide-react"
import { useRole } from "@/lib/role-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts"

// Mock data
const headcountData = [
  { month: "Jul", count: 145 },
  { month: "Aug", count: 148 },
  { month: "Sep", count: 152 },
  { month: "Oct", count: 155 },
  { month: "Nov", count: 158 },
  { month: "Dec", count: 162 },
]

const turnoverData = [
  { month: "Jul", rate: 2.1 },
  { month: "Aug", rate: 1.8 },
  { month: "Sep", rate: 2.3 },
  { month: "Oct", rate: 1.9 },
  { month: "Nov", rate: 2.0 },
  { month: "Dec", rate: 1.7 },
]

const mockTasks = [
  { id: 1, title: "Review Q4 performance reviews", priority: "high", due: "Dec 15" },
  { id: 2, title: "Approve budget for 2025", priority: "high", due: "Dec 20" },
  { id: 3, title: "Update employee handbook", priority: "medium", due: "Dec 30" },
]

const mockAnnouncements = [
  {
    id: 1,
    title: "Holiday Schedule 2025",
    date: "Dec 1",
    author: "Sarah Chen",
  },
  {
    id: 2,
    title: "New Benefits Enrollment Period",
    date: "Nov 28",
    author: "Sarah Chen",
  },
  {
    id: 3,
    title: "Office Closure Notice",
    date: "Nov 25",
    author: "Sarah Chen",
  },
]

export default function HrCommandCenter() {
  const { role } = useRole()
  const router = useRouter()
  const [announcementDialogOpen, setAnnouncementDialogOpen] = useState(false)
  const [announcementForm, setAnnouncementForm] = useState({ title: "", content: "" })

  // Restrict access to HR admins only
  useEffect(() => {
    if (role !== "hr-admin") {
      router.push("/")
    }
  }, [role, router])

  if (role !== "hr-admin") {
    return null
  }

  const handleSendAnnouncement = () => {
    if (!announcementForm.title || !announcementForm.content) {
      toast.error("Please fill in all fields")
      return
    }
    toast.success("Announcement posted successfully")
    setAnnouncementDialogOpen(false)
    setAnnouncementForm({ title: "", content: "" })
  }

  const handleAddEmployee = () => {
    router.push("/hr/onboarding")
  }

  const handleRunPayroll = () => {
    toast.success("Payroll process initiated")
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">HR Command Center</h1>
        <p className="text-muted-foreground">Overview of people metrics, tasks, and announcements</p>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Dialog open={announcementDialogOpen} onOpenChange={setAnnouncementDialogOpen}>
          <DialogTrigger asChild>
            <Button className="h-auto py-6 flex flex-col gap-2 bg-primary hover:bg-primary/90">
              <Bell className="h-6 w-6" />
              <span className="font-semibold">Send Announcement</span>
              <span className="text-xs opacity-90">Post to all employees</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send Announcement</DialogTitle>
              <DialogDescription>Create a new announcement for all employees</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="announcement-title">Title</Label>
                <Input
                  id="announcement-title"
                  value={announcementForm.title}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                  placeholder="Announcement title..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="announcement-content">Content</Label>
                <Textarea
                  id="announcement-content"
                  value={announcementForm.content}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, content: e.target.value })}
                  placeholder="Announcement content..."
                  className="min-h-[150px]"
                />
              </div>
              <Button onClick={handleSendAnnouncement} className="w-full">
                Post Announcement
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Button
          variant="outline"
          className="h-auto py-6 flex flex-col gap-2 border-primary/20 hover:bg-primary/5"
          onClick={handleAddEmployee}
        >
          <UserPlus className="h-6 w-6" />
          <span className="font-semibold">Add New Employee</span>
          <span className="text-xs opacity-70">Onboard new team member</span>
        </Button>

        <Button
          variant="outline"
          className="h-auto py-6 flex flex-col gap-2 border-primary/20 hover:bg-primary/5"
          onClick={handleRunPayroll}
        >
          <FileText className="h-6 w-6" />
          <span className="font-semibold">Run Payroll</span>
          <span className="text-xs opacity-70">Process monthly payroll</span>
        </Button>
      </div>

      {/* People Metrics */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Headcount Growth
            </CardTitle>
            <CardDescription>Employee count over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={headcountData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))", r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Turnover Rate
            </CardTitle>
            <CardDescription>Monthly turnover percentage</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={turnoverData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="rate" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Tasks / Approvals */}
        <Card className="bg-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Tasks / Approvals
            </CardTitle>
            <CardDescription>Pending items requiring your attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockTasks.map((task) => (
                <div
                  key={task.id}
                  className="p-4 rounded-lg border border-border/50 bg-card flex items-start justify-between"
                >
                  <div className="flex-1">
                    <p className="font-medium">{task.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        variant={task.priority === "high" ? "destructive" : "secondary"}
                        className="text-xs"
                      >
                        {task.priority}
                      </Badge>
                      <span className="text-xs text-muted-foreground">Due: {task.due}</span>
                    </div>
                  </div>
                  <Button size="sm" variant="outline">
                    Review
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Announcements Feed */}
        <Card className="bg-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Recent Announcements
            </CardTitle>
            <CardDescription>Latest company-wide announcements</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockAnnouncements.map((announcement) => (
                <div
                  key={announcement.id}
                  className="p-4 rounded-lg border border-border/50 bg-card"
                >
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-medium">{announcement.title}</p>
                    <Badge variant="secondary" className="text-xs">
                      {announcement.date}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">By {announcement.author}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

