"use client"

import { useState } from "react"
import { CalendarIcon, Plus, Check, X, Sparkles, Clock } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useRole } from "@/lib/role-context"
import { useAskAi } from "@/lib/ask-ai-context"
import * as MockData from "@/lib/mock-data"
import { cn } from "@/lib/utils"

const leaveTypes = [
  { value: "annual", label: "Annual Leave", color: "bg-primary" },
  { value: "sick", label: "Sick Leave", color: "bg-primary" },
  { value: "personal", label: "Personal", color: "bg-primary" },
  { value: "wfh", label: "Work From Home", color: "bg-primary" },
]

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-warning/10 text-warning",
  approved: "bg-success/10 text-success",
  rejected: "bg-destructive/10 text-destructive",
}

export default function TimeOffPage() {
  const { role, currentUser } = useRole()
  const { openWithPrompt } = useAskAi()
  const userData = MockData.hrisData[currentUser.id] || MockData.hrisData["EMP000005"]
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [dialogOpen, setDialogOpen] = useState(false)

  const pendingApprovals = MockData.timeOffRequests.filter((r) => r.status === "submitted")

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Time Off</h1>
          <p className="text-muted-foreground">Manage your leave requests and view your calendar</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Request Time Off
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Request Time Off</DialogTitle>
              <DialogDescription>Submit a new time off request for approval</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Leave Type</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {leaveTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <div className={cn("h-2 w-2 rounded-full", type.color)} />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Start Date</Label>
                  <Button variant="outline" className="justify-start bg-transparent">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    Pick date
                  </Button>
                </div>
                <div className="grid gap-2">
                  <Label>End Date</Label>
                  <Button variant="outline" className="justify-start bg-transparent">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    Pick date
                  </Button>
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Reason</Label>
                <Textarea placeholder="Optional: Add a reason for your request" />
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                <Sparkles className="h-4 w-4 text-primary" />
                <div className="text-sm">
                  <p className="font-medium">AI Suggestions</p>
                  <p className="text-muted-foreground text-xs">Best dates: Dec 23-27 (avoids team conflicts)</p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Save Draft
              </Button>
              <Button onClick={() => setDialogOpen(false)}>Submit Request</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Balances */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Leave Balances</CardTitle>
            <CardDescription>Your available time off for 2024</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                <p className="text-sm text-muted-foreground">Annual Leave</p>
                <p className="text-3xl font-bold text-primary">{userData.timeOffBalance.annual}</p>
                <p className="text-xs text-muted-foreground">days remaining</p>
              </div>
              <div className="p-4 rounded-xl bg-chart-2/10 border border-chart-2/20">
                <p className="text-sm text-muted-foreground">Sick Leave</p>
                <p className="text-3xl font-bold text-chart-2">{userData.timeOffBalance.sick}</p>
                <p className="text-xs text-muted-foreground">days remaining</p>
              </div>
              <div className="p-4 rounded-xl bg-chart-3/10 border border-chart-3/20">
                <p className="text-sm text-muted-foreground">Personal</p>
                <p className="text-3xl font-bold text-chart-3">{userData.timeOffBalance.personal}</p>
                <p className="text-xs text-muted-foreground">days remaining</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Helper */}
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Helper
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full justify-start text-sm bg-transparent"
              onClick={() => openWithPrompt("Suggest best dates for 5 days off in December")}
            >
              Suggest best dates
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start text-sm bg-transparent"
              onClick={() => openWithPrompt("Check if my leave request is policy compliant")}
            >
              Check policy compliance
            </Button>
            {role === "manager" || role === "hr-admin" ? (
              <Button 
                variant="outline" 
                className="w-full justify-start text-sm bg-transparent"
                onClick={() => openWithPrompt("Show team availability for the next 60 days")}
              >
                Show team availability
              </Button>
            ) : (
              <Button 
                variant="outline" 
                className="w-full justify-start text-sm bg-transparent"
                onClick={() => openWithPrompt("Explain my leave balance and entitlements")}
              >
                Explain my leave balance
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Calendar */}
        <Card>
          <CardHeader>
            <CardTitle>Calendar</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar mode="single" selected={date} onSelect={setDate} className="rounded-md border" />
            <div className="mt-4 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase">Legend</p>
              <div className="flex flex-wrap gap-2">
                {leaveTypes.map((type) => (
                  <div key={type.value} className="flex items-center gap-1.5">
                    <div className={cn("h-2 w-2 rounded-full", type.color)} />
                    <span className="text-xs">{type.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Requests Table */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>My Requests</CardTitle>
            <CardDescription>Your time off request history</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MockData.timeOffRequests.map((request) => {
                  const leaveType = leaveTypes.find((t) => t.value === request.type)
                  const startDate = new Date(request.startDate)
                  const endDate = new Date(request.endDate)
                  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1

                  return (
                    <TableRow key={request.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={cn("h-2 w-2 rounded-full", leaveType?.color)} />
                          <span className="capitalize">{request.type}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
                      </TableCell>
                      <TableCell>{days}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[request.status]}>{request.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {request.status === "draft" && (
                          <Button variant="ghost" size="sm">
                            Edit
                          </Button>
                        )}
                        {request.status === "submitted" && (
                          <Button variant="ghost" size="sm">
                            Cancel
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Manager Approvals Section */}
      {(role === "manager" || role === "hr-admin") && pendingApprovals.length > 0 && (
        <Card className="border-warning/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-warning" />
              Pending Approvals
            </CardTitle>
            <CardDescription>Team requests awaiting your decision</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingApprovals.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">Omar Haddid</TableCell>
                    <TableCell className="capitalize">{request.type}</TableCell>
                    <TableCell>
                      {new Date(request.startDate).toLocaleDateString()} -{" "}
                      {new Date(request.endDate).toLocaleDateString()}
                    </TableCell>
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
      )}
    </div>
  )
}
