"use client"

import { useState } from "react"
import { Search, Filter, AlertTriangle, Check, X, Eye, Clock, User, Database, FileText } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { useRole } from "@/lib/role-context"
import { auditEvents, type AuditEvent } from "@/lib/mock-data"
import { redirect } from "next/navigation"

const decisionColors: Record<string, string> = {
  allowed: "bg-success/10 text-success",
  blocked: "bg-destructive/10 text-destructive",
}

const roleColors: Record<string, string> = {
  employee: "bg-chart-2/10 text-chart-2",
  manager: "bg-chart-1/10 text-chart-1",
  "hr-admin": "bg-chart-4/10 text-chart-4",
}

export default function AuditLogPage() {
  const { role } = useRole()
  const [search, setSearch] = useState("")
  const [decisionFilter, setDecisionFilter] = useState("all")
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null)

  if (role !== "hr-admin") {
    redirect("/")
  }

  const filteredEvents = auditEvents.filter((event) => {
    const matchesSearch =
      event.query.toLowerCase().includes(search.toLowerCase()) ||
      event.userName.toLowerCase().includes(search.toLowerCase())
    const matchesDecision = decisionFilter === "all" || event.decision === decisionFilter
    return matchesSearch && matchesDecision
  })

  const blockedCount = auditEvents.filter((e) => e.decision === "blocked").length
  const riskFlagCount = auditEvents.filter((e) => e.riskFlags.length > 0).length

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit Log</h1>
        <p className="text-muted-foreground">Complete record of AI interactions and data access</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Events</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{auditEvents.length}</div>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Allowed</CardTitle>
            <Check className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{auditEvents.length - blockedCount}</div>
            <p className="text-xs text-muted-foreground">Successful queries</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Blocked</CardTitle>
            <X className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{blockedCount}</div>
            <p className="text-xs text-muted-foreground">Access denied</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Risk Flags</CardTitle>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{riskFlagCount}</div>
            <p className="text-xs text-muted-foreground">Events with flags</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by user or query..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={decisionFilter} onValueChange={setDecisionFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by decision" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Decisions</SelectItem>
                <SelectItem value="allowed">Allowed</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Audit Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Query</TableHead>
                <TableHead>Decision</TableHead>
                <TableHead>Risk Flags</TableHead>
                <TableHead className="text-right">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEvents.map((event) => (
                <TableRow key={event.id}>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(event.timestamp).toLocaleString()}
                  </TableCell>
                  <TableCell className="font-medium">{event.userName}</TableCell>
                  <TableCell>
                    <Badge className={roleColors[event.userRole]}>{event.userRole.replace("-", " ")}</Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">{event.query}</TableCell>
                  <TableCell>
                    <Badge className={decisionColors[event.decision]}>{event.decision}</Badge>
                  </TableCell>
                  <TableCell>
                    {event.riskFlags.length > 0 ? (
                      <Badge variant="outline" className="text-warning border-warning">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {event.riskFlags.length}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => setSelectedEvent(event)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Event Detail Sheet */}
      <Sheet open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <SheetContent className="w-full sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Audit Event Details</SheetTitle>
            <SheetDescription>{selectedEvent && new Date(selectedEvent.timestamp).toLocaleString()}</SheetDescription>
          </SheetHeader>

          {selectedEvent && (
            <div className="mt-6 space-y-6">
              {/* User Info */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <User className="h-4 w-4" />
                  User Information
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Name</p>
                    <p className="font-medium">{selectedEvent.userName}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Role</p>
                    <Badge className={roleColors[selectedEvent.userRole]}>
                      {selectedEvent.userRole.replace("-", " ")}
                    </Badge>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Query */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Query</h3>
                <p className="text-sm bg-muted p-3 rounded-lg">{selectedEvent.query}</p>
              </div>

              <Separator />

              {/* Sources Accessed */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Data Sources Accessed
                </h3>
                {selectedEvent.sourcesAccessed.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedEvent.sourcesAccessed.map((source, i) => (
                      <Badge key={i} variant="secondary">
                        {source}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No sources accessed</p>
                )}
              </div>

              <Separator />

              {/* Citations Generated */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Citations Generated
                </h3>
                {selectedEvent.citationsGenerated.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedEvent.citationsGenerated.map((citation, i) => (
                      <Badge key={i} variant="outline">
                        {citation}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No citations generated</p>
                )}
              </div>

              <Separator />

              {/* Redactions */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Redactions Applied</h3>
                {selectedEvent.redactionsApplied.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedEvent.redactionsApplied.map((redaction, i) => (
                      <Badge key={i} variant="destructive">
                        {redaction}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No redactions applied</p>
                )}
              </div>

              <Separator />

              {/* Decision & Risk */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Decision & Risk Assessment</h3>
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Decision</p>
                    <Badge className={decisionColors[selectedEvent.decision]}>{selectedEvent.decision}</Badge>
                  </div>
                  {selectedEvent.riskFlags.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground">Risk Flags</p>
                      <div className="flex gap-1 mt-1">
                        {selectedEvent.riskFlags.map((flag, i) => (
                          <Badge key={i} variant="outline" className="text-warning border-warning">
                            {flag.replace(/_/g, " ")}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
