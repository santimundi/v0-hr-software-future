"use client"

import { User, Building, MapPin, Calendar, FileText, Award, Sparkles, Lock, Eye } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { useRole } from "@/lib/role-context"
import * as MockData from "@/lib/mock-data"
import Link from "next/link"

export default function ProfilePage() {
  const { currentUser, role } = useRole()
  const userData = MockData.hrisData[currentUser.id] || MockData.hrisData["EMP000005"]

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Profile</h1>
          <p className="text-muted-foreground">Your HR profile and what the AI can access</p>
        </div>
        <Link href="/chat?prompt=Tell me about my profile and career progress">
          <Button className="gap-2">
            <Sparkles className="h-4 w-4" />
            Ask Copilot about this page
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Profile Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-start gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={currentUser.avatar || "/placeholder.svg"} alt={currentUser.name} />
                <AvatarFallback className="text-2xl">
                  {currentUser.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <CardTitle className="text-2xl">{currentUser.name}</CardTitle>
                <CardDescription className="text-base">{currentUser.title}</CardDescription>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Building className="h-4 w-4" />
                  <span>{currentUser.department}</span>
                  <span>•</span>
                  <MapPin className="h-4 w-4" />
                  <span>{currentUser.location}</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <Separator />

            {/* Identity Section */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <User className="h-4 w-4" />
                Identity
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Employee ID</p>
                  <p className="font-medium">{currentUser.id.toUpperCase()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-medium">{currentUser.email}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Role</p>
                  <p className="font-medium capitalize">{currentUser.role.replace("-", " ")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Manager</p>
                  <p className="font-medium">{currentUser.manager || "N/A"}</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Employment Section */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Employment
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Start Date</p>
                  <p className="font-medium">{new Date(currentUser.startDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Tenure</p>
                  <p className="font-medium">{userData.tenure}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Contract Type</p>
                  <p className="font-medium">{currentUser.contractType}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Next Review</p>
                  <p className="font-medium">{new Date(userData.nextReview).toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Compensation Section */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Compensation
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Base Salary</p>
                  {role === "hr-admin" ? (
                    <p className="font-medium">${currentUser.salary.toLocaleString()}</p>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-muted-foreground">••••••••</p>
                      <Badge variant="outline" className="text-xs gap-1">
                        <Lock className="h-3 w-3" />
                        HR Admin only
                      </Badge>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-muted-foreground">Last Raise</p>
                  <p className="font-medium">{new Date(userData.lastRaise).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Side Cards */}
        <div className="space-y-6">
          {/* Performance Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Award className="h-4 w-4" />
                Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Last Review Rating</p>
                <Badge className="mt-1 bg-success/10 text-success">{userData.performanceRating}</Badge>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground mb-2">Key Strengths</p>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="secondary">Technical expertise</Badge>
                  <Badge variant="secondary">Teamwork</Badge>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Development Areas</p>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline">Public speaking</Badge>
                  <Badge variant="outline">Strategic thinking</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Skills Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Skills & Expertise</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {currentUser.skills.map((skill, i) => (
                  <Badge key={i} variant="secondary">
                    {skill}
                  </Badge>
                ))}
              </div>
              <Separator className="my-4" />
              <div>
                <p className="text-sm text-muted-foreground mb-2">AI Learning Recommendations</p>
                <ul className="text-sm space-y-1">
                  <li className="flex items-center gap-2">
                    <Sparkles className="h-3 w-3 text-primary" />
                    System Design for Senior Engineers
                  </li>
                  <li className="flex items-center gap-2">
                    <Sparkles className="h-3 w-3 text-primary" />
                    Technical Leadership Workshop
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Data Visibility Card */}
          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Eye className="h-4 w-4" />
                What AI Can See
              </CardTitle>
              <CardDescription>This data is used to answer your questions</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-2">
                <li className="flex items-center gap-2 text-success">
                  <div className="h-1.5 w-1.5 rounded-full bg-success" />
                  Identity & employment info
                </li>
                <li className="flex items-center gap-2 text-success">
                  <div className="h-1.5 w-1.5 rounded-full bg-success" />
                  Time off balances
                </li>
                <li className="flex items-center gap-2 text-success">
                  <div className="h-1.5 w-1.5 rounded-full bg-success" />
                  Performance summaries
                </li>
                <li className="flex items-center gap-2 text-muted-foreground">
                  <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                  <span>Salary details</span>
                  <Badge variant="outline" className="text-xs">
                    Masked
                  </Badge>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
