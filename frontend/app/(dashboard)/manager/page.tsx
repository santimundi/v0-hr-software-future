"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Calendar, FileText, Clock, Download, CheckCircle2, LogIn, LogOut, Sparkles, TrendingUp, Users } from "lucide-react"
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
import { cn } from "@/lib/utils"

export default function ManagerHubPage() {
  const { role, currentUser } = useRole()
  const router = useRouter()
  const userData = MockData.hrisData[currentUser.id] || MockData.hrisData["EMP000002"]
  const [isClockedIn, setIsClockedIn] = useState(false)
  const [ptoDialogOpen, setPtoDialogOpen] = useState(false)
  const [ptoForm, setPtoForm] = useState({ startDate: "", endDate: "", note: "" })
  const [expandedCard, setExpandedCard] = useState<string | null>(null)
  const [countedValues, setCountedValues] = useState({ payday: 0, pto: 0 })
  const cardRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})

  // Ensure role is set to manager when on this page
  useEffect(() => {
    if (role !== "manager" && role !== "hr-admin") {
      router.push("/")
    }
  }, [role, router])

  if (role !== "manager" && role !== "hr-admin") {
    return null
  }

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

  // Animated counting effect
  useEffect(() => {
    const paydayDays = Math.ceil((nextPayday.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    const ptoDays = userData.timeOffBalance.annual
    
    const duration = 1500
    const steps = 60
    const interval = duration / steps
    
    let step = 0
    const paydayTimer = setInterval(() => {
      step++
      const progress = step / steps
      const easeOut = 1 - Math.pow(1 - progress, 3)
      setCountedValues({
        payday: Math.floor(paydayDays * easeOut),
        pto: Math.floor(ptoDays * easeOut),
      })
      if (step >= steps) clearInterval(paydayTimer)
    }, interval)

    return () => clearInterval(paydayTimer)
  }, [userData.timeOffBalance.annual, nextPayday])

  // Mouse move parallax effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const cards = document.querySelectorAll('[data-holographic]')
      cards.forEach((card) => {
        const rect = card.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        const centerX = rect.width / 2
        const centerY = rect.height / 2
        const rotateX = (y - centerY) / 20
        const rotateY = (centerX - x) / 20
        
        ;(card as HTMLElement).style.setProperty('--rotate-x', `${rotateX}deg`)
        ;(card as HTMLElement).style.setProperty('--rotate-y', `${rotateY}deg`)
      })
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto relative overflow-hidden">
      {/* Animated background gradient */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-1/4 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 -right-1/4 w-[600px] h-[600px] bg-primary/3 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Header with kinetic typography */}
      <div className="space-y-2 relative z-10">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground to-primary/60 bg-clip-text text-transparent animate-in fade-in slide-in-from-bottom-4 duration-1000">
          Welcome back, {currentUser.name.split(" ")[0]}
        </h1>
        <p className="text-muted-foreground text-lg animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-150">
          Here's your HR overview
        </p>
      </div>

      {/* Essential Info Cards with Holographic Effect */}
      <div className="grid gap-6 md:grid-cols-3 relative z-10">
        <div
          data-holographic
          className={cn(
            "group relative transition-all duration-500 cursor-pointer",
            expandedCard === "payday" ? "md:col-span-2" : ""
          )}
          onClick={() => setExpandedCard(expandedCard === "payday" ? null : "payday")}
          ref={(el) => (cardRefs.current["payday"] = el)}
        >
          <div
            className="relative h-full transition-all duration-500"
            style={{
              transform: expandedCard === "payday" 
                ? "perspective(1000px) rotateX(var(--rotate-x, 0deg)) rotateY(var(--rotate-y, 0deg)) scale(1.02)" 
                : "perspective(1000px) rotateX(var(--rotate-x, 0deg)) rotateY(var(--rotate-y, 0deg))",
            }}
          >
            <Card className="h-full bg-gradient-to-br from-card via-card to-primary/5 border-2 border-primary/20 backdrop-blur-sm shadow-2xl group-hover:shadow-primary/20 group-hover:border-primary/40 transition-all duration-500 overflow-hidden">
              {/* Holographic shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              
              <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                <CardTitle className="text-sm font-medium text-muted-foreground">Next Payday</CardTitle>
                <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Calendar className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-4xl font-bold mb-2 bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
                  {nextPayday.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </div>
                <p className="text-sm text-muted-foreground">
                  <span className="text-2xl font-bold text-primary">{countedValues.payday}</span> days away
                </p>
                {expandedCard === "payday" && (
                  <div className="mt-4 pt-4 border-t border-primary/20 animate-in fade-in slide-in-from-top-4">
                    <p className="text-xs text-muted-foreground">Expected amount: $8,500</p>
                    <p className="text-xs text-muted-foreground mt-1">Direct deposit to: •••• 1234</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <div
          data-holographic
          className={cn(
            "group relative transition-all duration-500 cursor-pointer",
            expandedCard === "pto" ? "md:col-span-2" : ""
          )}
          onClick={() => setExpandedCard(expandedCard === "pto" ? null : "pto")}
          ref={(el) => (cardRefs.current["pto"] = el)}
        >
          <div
            className="relative h-full transition-all duration-500"
            style={{
              transform: expandedCard === "pto" 
                ? "perspective(1000px) rotateX(var(--rotate-x, 0deg)) rotateY(var(--rotate-y, 0deg)) scale(1.02)" 
                : "perspective(1000px) rotateX(var(--rotate-x, 0deg)) rotateY(var(--rotate-y, 0deg))",
            }}
          >
            <Card className="h-full bg-gradient-to-br from-card via-card to-primary/5 border-2 border-primary/20 backdrop-blur-sm shadow-2xl group-hover:shadow-primary/20 group-hover:border-primary/40 transition-all duration-500 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              
              <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                <CardTitle className="text-sm font-medium text-muted-foreground">PTO Balance</CardTitle>
                <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Calendar className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  {countedValues.pto} days
                </div>
                <p className="text-sm text-muted-foreground">Annual leave remaining</p>
                {expandedCard === "pto" && (
                  <div className="mt-4 pt-4 border-t border-primary/20 animate-in fade-in slide-in-from-top-4 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Sick Leave:</span>
                      <span className="font-medium">{userData.timeOffBalance.sick} days</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Personal:</span>
                      <span className="font-medium">{userData.timeOffBalance.personal} days</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <div
          data-holographic
          className={cn(
            "group relative transition-all duration-500 cursor-pointer",
            expandedCard === "status" ? "md:col-span-2" : ""
          )}
          onClick={() => setExpandedCard(expandedCard === "status" ? null : "status")}
          ref={(el) => (cardRefs.current["status"] = el)}
        >
          <div
            className="relative h-full transition-all duration-500"
            style={{
              transform: expandedCard === "status" 
                ? "perspective(1000px) rotateX(var(--rotate-x, 0deg)) rotateY(var(--rotate-y, 0deg)) scale(1.02)" 
                : "perspective(1000px) rotateX(var(--rotate-x, 0deg)) rotateY(var(--rotate-y, 0deg))",
            }}
          >
            <Card className="h-full bg-gradient-to-br from-card via-card to-primary/5 border-2 border-primary/20 backdrop-blur-sm shadow-2xl group-hover:shadow-primary/20 group-hover:border-primary/40 transition-all duration-500 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              
              <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                <CardTitle className="text-sm font-medium text-muted-foreground">Today Status</CardTitle>
                <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Clock className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <Badge 
                    variant={isClockedIn ? "default" : "secondary"} 
                    className={cn(
                      "text-sm px-3 py-1 transition-all duration-300",
                      isClockedIn ? "bg-primary shadow-lg shadow-primary/50" : ""
                    )}
                  >
                    {isClockedIn ? "Clocked In" : "Clocked Out"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {isClockedIn ? "Working since 9:00 AM" : "Not clocked in"}
                </p>
                {expandedCard === "status" && (
                  <div className="mt-4 pt-4 border-t border-primary/20 animate-in fade-in slide-in-from-top-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleClockInOut()
                      }}
                      className="w-full"
                    >
                      {isClockedIn ? <LogOut className="h-4 w-4 mr-2" /> : <LogIn className="h-4 w-4 mr-2" />}
                      {isClockedIn ? "Clock Out" : "Clock In"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Quick Actions with Morphing Effect */}
      <Card className="bg-gradient-to-br from-card via-card to-primary/5 border-2 border-primary/20 backdrop-blur-sm shadow-xl relative z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-1000" />
        <CardHeader className="relative z-10">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary animate-pulse" />
            Quick Actions
          </CardTitle>
          <CardDescription>One-click shortcuts to common tasks</CardDescription>
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="grid gap-4 md:grid-cols-3">
            <Dialog open={ptoDialogOpen} onOpenChange={setPtoDialogOpen}>
              <DialogTrigger asChild>
                <Button className="h-auto py-8 flex flex-col gap-3 bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-105 transition-all duration-300 group relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  <Calendar className="h-7 w-7 relative z-10 group-hover:rotate-12 transition-transform duration-300" />
                  <span className="font-semibold text-lg relative z-10">Request PTO</span>
                  <span className="text-xs opacity-90 relative z-10">Submit time off request</span>
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
              className="h-auto py-8 flex flex-col gap-3 border-2 border-primary/30 hover:border-primary/50 hover:bg-primary/10 hover:scale-105 transition-all duration-300 group relative overflow-hidden backdrop-blur-sm"
              onClick={handleClockInOut}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              <div className="relative z-10 group-hover:rotate-12 transition-transform duration-300">
                {isClockedIn ? <LogOut className="h-7 w-7" /> : <LogIn className="h-7 w-7" />}
              </div>
              <span className="font-semibold text-lg relative z-10">{isClockedIn ? "Clock Out" : "Clock In"}</span>
              <span className="text-xs opacity-70 relative z-10">Record your attendance</span>
            </Button>

            <Button
              variant="outline"
              className="h-auto py-8 flex flex-col gap-3 border-2 border-primary/30 hover:border-primary/50 hover:bg-primary/10 hover:scale-105 transition-all duration-300 group relative overflow-hidden backdrop-blur-sm"
              onClick={handleDownloadPayslip}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              <Download className="h-7 w-7 relative z-10 group-hover:translate-y-1 transition-transform duration-300" />
              <span className="font-semibold text-lg relative z-10">Download Payslip</span>
              <span className="text-xs opacity-70 relative z-10">Get latest pay stub</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity with Unfoldable Effect */}
      <Card className="bg-gradient-to-br from-card via-card to-primary/5 border-2 border-primary/20 backdrop-blur-sm shadow-xl relative z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-1000" />
        <CardHeader className="relative z-10">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Recent Activity
          </CardTitle>
          <CardDescription>Your latest HR interactions</CardDescription>
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="space-y-3">
            {recentActivity.map((activity, i) => (
              <div
                key={i}
                className="group flex items-start gap-3 p-3 rounded-lg border border-transparent hover:border-primary/30 hover:bg-primary/5 transition-all duration-300 cursor-pointer hover:scale-[1.02]"
              >
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center group-hover:scale-110 group-hover:rotate-12 transition-all duration-300 shadow-lg group-hover:shadow-primary/30">
                  {activity.type === "time-off" && <Calendar className="h-5 w-5 text-primary" />}
                  {activity.type === "profile" && <FileText className="h-5 w-5 text-primary" />}
                  {activity.type === "payslip" && <Download className="h-5 w-5 text-primary" />}
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium group-hover:text-primary transition-colors">{activity.action}</p>
                  <p className="text-xs text-muted-foreground">{activity.date}</p>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
