"use client"

import { useState } from "react"
import { Calendar, FileText, Clock, Download, CheckCircle2, LogIn, LogOut } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useRole } from "@/lib/role-context"
import * as MockData from "@/lib/mock-data"
import { toast } from "sonner"
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

export default function EmployeeDashboard() {
  const { currentUser } = useRole()
  const userData = MockData.hrisData[currentUser.id] || MockData.hrisData["EMP000005"]
  const [isClockedIn, setIsClockedIn] = useState(false)
  const [ptoDialogOpen, setPtoDialogOpen] = useState(false)
  const [ptoForm, setPtoForm] = useState({ startDate: "", endDate: "", note: "" })

  const nextPayday = new Date()
  nextPayday.setDate(15) // Next 15th
  if (nextPayday < new Date()) {
    nextPayday.setMonth(nextPayday.getMonth() + 1)
  }

  const handleClockInOut = () => {
    setIsClockedIn(!isClockedIn)
    toast.success(isClockedIn ? "Clocked out successfully" : "Clocked in successfully", {
      icon: isClockedIn ? <LogOut className="h-4 w-4" /> : <LogIn className="h-4 w-4" />,
    })
  }

  const handleRequestPTO = () => {
    if (!ptoForm.startDate || !ptoForm.endDate) {
      toast.error("Please select start and end dates")
      return
    }
    toast.success("PTO request submitted successfully", {
      icon: <CheckCircle2 className="h-4 w-4" />,
    })
    setPtoDialogOpen(false)
    setPtoForm({ startDate: "", endDate: "", note: "" })
  }

  const handleDownloadPayslip = () => {
    toast.success("Downloading latest payslip...")
    setTimeout(() => {
      toast.success("Payslip downloaded successfully")
    }, 1000)
  }

  const recentActivity = [
    { action: "Requested time off", date: "2 days ago", type: "time-off" },
    { action: "Updated profile", date: "1 week ago", type: "profile" },
    { action: "Downloaded payslip", date: "2 weeks ago", type: "payslip" },
  ]

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Welcome back, {currentUser.name.split(" ")[0]}</h1>
        <p className="text-muted-foreground">Here's your HR overview</p>
      </div>

      {/* Essential Info Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Next Payday</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{nextPayday.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
            <p className="text-xs text-muted-foreground">
              {Math.ceil((nextPayday.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days away
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">PTO Balance</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{userData.timeOffBalance.annual} days</div>
            <p className="text-xs text-muted-foreground">Annual leave remaining</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today Status</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge variant={isClockedIn ? "default" : "secondary"} className={isClockedIn ? "bg-success" : ""}>
                {isClockedIn ? "Clocked In" : "Clocked Out"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {isClockedIn ? "Working since 9:00 AM" : "Not clocked in"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>One-click shortcuts to common tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Dialog open={ptoDialogOpen} onOpenChange={setPtoDialogOpen}>
              <DialogTrigger asChild>
                <Button className="h-auto py-6 flex flex-col gap-2 bg-primary hover:bg-primary/90">
                  <Calendar className="h-6 w-6" />
                  <span className="font-semibold">Request PTO</span>
                  <span className="text-xs opacity-90">Submit time off request</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Request Time Off</DialogTitle>
                  <DialogDescription>Submit a new time off request</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="startDate">Start Date</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={ptoForm.startDate}
                        onChange={(e) => setPtoForm({ ...ptoForm, startDate: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endDate">End Date</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={ptoForm.endDate}
                        onChange={(e) => setPtoForm({ ...ptoForm, endDate: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="note">Note (optional)</Label>
                    <Textarea
                      id="note"
                      placeholder="Reason for time off..."
                      value={ptoForm.note}
                      onChange={(e) => setPtoForm({ ...ptoForm, note: e.target.value })}
                    />
                  </div>
                  <Button onClick={handleRequestPTO} className="w-full">
                    Submit Request
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Button
              variant="outline"
              className="h-auto py-6 flex flex-col gap-2 border-primary/20 hover:bg-primary/5"
              onClick={handleClockInOut}
            >
              {isClockedIn ? <LogOut className="h-6 w-6" /> : <LogIn className="h-6 w-6" />}
              <span className="font-semibold">{isClockedIn ? "Clock Out" : "Clock In"}</span>
              <span className="text-xs opacity-70">Record your attendance</span>
            </Button>

            <Button
              variant="outline"
              className="h-auto py-6 flex flex-col gap-2 border-primary/20 hover:bg-primary/5"
              onClick={handleDownloadPayslip}
            >
              <Download className="h-6 w-6" />
              <span className="font-semibold">Download Payslip</span>
              <span className="text-xs opacity-70">Get latest pay stub</span>
            </Button>
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
            {recentActivity.map((activity, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  {activity.type === "time-off" && <Calendar className="h-4 w-4 text-primary" />}
                  {activity.type === "profile" && <FileText className="h-4 w-4 text-primary" />}
                  {activity.type === "payslip" && <Download className="h-4 w-4 text-primary" />}
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium">{activity.action}</p>
                  <p className="text-xs text-muted-foreground">{activity.date}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

