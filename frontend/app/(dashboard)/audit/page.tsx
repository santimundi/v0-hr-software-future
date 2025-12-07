"use client"

import { useState, useEffect } from "react"
import { Search, Filter, AlertTriangle, Check, X, Eye, Clock, User, Database, FileText, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { useRole } from "@/lib/role-context"
import { redirect } from "next/navigation"
import { cn } from "@/lib/utils"

interface AuditEvent {
  id: string
  userId: string
  userName: string
  userRole: "employee" | "manager" | "hr-admin"
  query: string // Original query (first question)
  queryTopic?: string // Short topic summary
  documentsAccessed?: string[] // Documents/policies accessed
  answered: boolean
  timestamp: string
  requestId?: string
}

const MAX_DOCS_DISPLAY = 2 // Maximum number of documents to show in table before truncating

const roleColors: Record<string, string> = {
  employee: "bg-chart-2/10 text-chart-2",
  manager: "bg-primary/10 text-primary",
  "hr-admin": "bg-chart-4/10 text-chart-4",
}

export default function AuditLogPage() {
  const { role } = useRole()
  const [search, setSearch] = useState("")
  const [answeredFilter, setAnsweredFilter] = useState("all")
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null)
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  
  // Reset to page 1 when date changes
  const handleDateChange = (date: Date | undefined) => {
    setSelectedDate(date)
    setPage(1)
  }
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  })

  if (role !== "hr-admin") {
    redirect("/")
  }

  useEffect(() => {
    async function fetchAuditLogs() {
      try {
        setLoading(true)
        const dateParam = selectedDate ? format(selectedDate, "yyyy-MM-dd") : ""
        const url = `/api/audit?page=${page}${dateParam ? `&date=${dateParam}` : ""}`
        const response = await fetch(url)
        if (response.ok) {
          const data = await response.json()
          setEvents(data.events || [])
          setPagination(data.pagination || {
            total: 0,
            totalPages: 1,
            hasNext: false,
            hasPrev: false,
          })
        } else {
          console.error("Failed to fetch audit logs")
        }
      } catch (error) {
        console.error("Error fetching audit logs:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchAuditLogs()
  }, [page, selectedDate])

  const filteredEvents = events.filter((event) => {
    const searchText = (event.queryTopic || event.query).toLowerCase()
    const matchesSearch =
      searchText.includes(search.toLowerCase()) ||
      event.userName.toLowerCase().includes(search.toLowerCase())
    const matchesAnswered = 
      answeredFilter === "all" || 
      (answeredFilter === "answered" && event.answered) ||
      (answeredFilter === "not-answered" && !event.answered)
    return matchesSearch && matchesAnswered
  })

  // Note: These counts are for the current page only
  // For total counts, we'd need to fetch all events or add a separate stats endpoint
  const answeredCount = events.filter((e) => e.answered).length
  const notAnsweredCount = events.filter((e) => !e.answered).length

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit Log</h1>
        <p className="text-muted-foreground">Complete record of AI interactions and data access</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Queries</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : pagination.total}</div>
            <p className="text-xs text-muted-foreground">Total queries</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Page</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : `${page} / ${pagination.totalPages}`}</div>
            <p className="text-xs text-muted-foreground">Showing {events.length} of {pagination.total}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">This Page</CardTitle>
            <Check className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{loading ? "..." : `${answeredCount} / ${events.length}`}</div>
            <p className="text-xs text-muted-foreground">Answered on this page</p>
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
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[240px] justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP") : <span>All dates</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateChange}
                  initialFocus
                />
                <div className="p-3 border-t flex gap-2">
                  {selectedDate && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleDateChange(undefined)}
                    >
                      Clear (show all)
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleDateChange(new Date())}
                  >
                    Today
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            <Select value={answeredFilter} onValueChange={setAnsweredFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Queries</SelectItem>
                <SelectItem value="answered">Answered</SelectItem>
                <SelectItem value="not-answered">Not Answered</SelectItem>
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
                <TableHead>Query Topic</TableHead>
                <TableHead>Documents Accessed</TableHead>
                <TableHead>Answered</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Loading audit logs...
                  </TableCell>
                </TableRow>
              ) : filteredEvents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No audit events found
                  </TableCell>
                </TableRow>
              ) : (
                filteredEvents.map((event) => {
                  const docs = event.documentsAccessed || []
                  const docsToShow = docs.slice(0, MAX_DOCS_DISPLAY)
                  const remainingCount = docs.length - MAX_DOCS_DISPLAY
                  
                  return (
                    <TableRow key={event.id}>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(event.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-medium">{event.userName}</TableCell>
                      <TableCell className="max-w-[300px]">
                        <div className="truncate" title={event.queryTopic || event.query}>
                          {event.queryTopic || event.query}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[250px]">
                        {docs.length === 0 ? (
                          <span className="text-muted-foreground text-sm">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {docsToShow.map((doc, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {doc}
                              </Badge>
                            ))}
                            {remainingCount > 0 && (
                              <Badge variant="outline" className="text-xs text-muted-foreground">
                                +{remainingCount} more
                              </Badge>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {event.answered ? (
                          <Badge className="bg-success/10 text-success">
                            <Check className="h-3 w-3 mr-1" />
                            Answered
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            <X className="h-3 w-3 mr-1" />
                            Not Answered
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {!loading && pagination.totalPages > 1 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing page {page} of {pagination.totalPages} ({pagination.total} total queries)
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={!pagination.hasPrev || loading}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    let pageNum: number
                    if (pagination.totalPages <= 5) {
                      pageNum = i + 1
                    } else if (page <= 3) {
                      pageNum = i + 1
                    } else if (page >= pagination.totalPages - 2) {
                      pageNum = pagination.totalPages - 4 + i
                    } else {
                      pageNum = page - 2 + i
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={page === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPage(pageNum)}
                        className="w-10"
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={!pagination.hasNext || loading}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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

              {/* Original Query */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Original Query</h3>
                <p className="text-sm bg-muted p-3 rounded-lg">{selectedEvent.query}</p>
              </div>

              <Separator />

              {/* Documents Accessed */}
              {selectedEvent.documentsAccessed && selectedEvent.documentsAccessed.length > 0 && (
                <>
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Documents Accessed
                    </h3>
                    <div className="space-y-1">
                      {selectedEvent.documentsAccessed.map((doc, idx) => (
                        <Badge key={idx} variant="outline" className="mr-2">
                          {doc}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Separator />
                </>
              )}

              {/* Status */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Status</h3>
                <div>
                  {selectedEvent.answered ? (
                    <Badge className="bg-success/10 text-success">
                      <Check className="h-3 w-3 mr-1" />
                      Answered
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      <X className="h-3 w-3 mr-1" />
                      Not Answered
                    </Badge>
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
