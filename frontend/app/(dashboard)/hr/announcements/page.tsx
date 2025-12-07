"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Bell, Plus } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useRole } from "@/lib/role-context"

const mockAnnouncements = [
  { id: 1, title: "Holiday Schedule 2025", date: "Dec 1", author: "Sarah Chen", status: "published" },
  { id: 2, title: "New Benefits Enrollment Period", date: "Nov 28", author: "Sarah Chen", status: "published" },
]

export default function HrAnnouncementsPage() {
  const { role } = useRole()
  const router = useRouter()

  useEffect(() => {
    if (role !== "hr-admin") {
      router.push("/")
    }
  }, [role, router])

  if (role !== "hr-admin") {
    return null
  }
  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Announcements</h1>
          <p className="text-muted-foreground">Create and manage company-wide announcements</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Announcement
        </Button>
      </div>

      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            All Announcements
          </CardTitle>
          <CardDescription>{mockAnnouncements.length} published announcements</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockAnnouncements.map((announcement) => (
              <div
                key={announcement.id}
                className="flex items-center justify-between p-4 rounded-lg border border-border/50"
              >
                <div>
                  <p className="font-medium">{announcement.title}</p>
                  <p className="text-sm text-muted-foreground">By {announcement.author} • {announcement.date}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{announcement.status}</Badge>
                  <Button variant="outline" size="sm">Edit</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

