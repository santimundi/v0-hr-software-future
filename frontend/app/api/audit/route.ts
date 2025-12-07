import { NextResponse } from "next/server"
import { readFile, readdir } from "fs/promises"
import { join } from "path"

interface AuditEvent {
  ts: string
  event: string
  level: string
  env: string
  request_id?: string
  thread_id?: string
  actor?: {
    employee_id?: string
    display_name?: string
    job_title?: string
    role?: string
  }
  component: string
  data?: {
    input?: {
      query_hash?: string
      selected_scopes?: string[]
    }
    output?: {
      message_preview?: string
      actions_emitted?: any[]
    }
    db?: {
      tool?: string
      tables?: string[]
      sql_hash?: string
    }
    result?: {
      status?: string
    }
    separator?: string
    message?: string
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1", 10)
    const limit = 30
    const offset = (page - 1) * limit
    const dateFilter = searchParams.get("date") // Format: YYYY-MM-DD

    const auditDir = join(process.cwd(), "..", "backend", "logs", "audit")
    
    // Get all date directories
    let dateDirs = await readdir(auditDir, { withFileTypes: true })
      .then(entries => entries.filter(e => e.isDirectory()).map(e => e.name))
      .catch(() => [])
    
    // Filter by date if provided
    if (dateFilter) {
      // Date filter format: YYYY-MM-DD, directories are also YYYY-MM-DD format
      dateDirs = dateDirs.filter(dir => dir === dateFilter)
      // If no matching directory found for the date, return empty results
      if (dateDirs.length === 0) {
        return NextResponse.json({
          events: [],
          pagination: {
            page: 1,
            limit,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false,
          },
        })
      }
    }

    const allEvents: AuditEvent[] = []

    // Read all audit.jsonl files
    for (const dateDir of dateDirs) {
      const filePath = join(auditDir, dateDir, "audit.jsonl")
      try {
        const content = await readFile(filePath, "utf-8")
        const lines = content.split("\n").filter(line => line.trim())
        
        for (const line of lines) {
          try {
            const event = JSON.parse(line) as AuditEvent
            allEvents.push(event)
          } catch (e) {
            // Skip invalid JSON lines
            continue
          }
        }
      } catch (e) {
        // File doesn't exist or can't be read, skip
        continue
      }
    }

    // Group events by request_id to match queries with responses and track documents
    const requestMap = new Map<string, {
      request: AuditEvent | null
      response: AuditEvent | null
      queryText?: string
      documentsAccessed: string[]
    }>()

    // First pass: collect request_received and response_sent events
    for (const event of allEvents) {
      if (!event.request_id) continue

      if (!requestMap.has(event.request_id)) {
        requestMap.set(event.request_id, {
          request: null,
          response: null,
          documentsAccessed: [],
        })
      }

      const entry = requestMap.get(event.request_id)!

      if (event.event === "request_received") {
        entry.request = event
      } else if (event.event === "response_sent") {
        entry.response = event
      } else if (event.event === "document_accessed" || event.event === "policy_accessed") {
        // Track documents/policies accessed
        const resource = event.data?.resource
        if (resource) {
          const docTitle = resource.title || resource.document_id || resource.policy_id || "Unknown"
          if (!entry.documentsAccessed.includes(docTitle)) {
            entry.documentsAccessed.push(docTitle)
          }
        }
      }
    }

    // Transform to simplified format: User | Query | Answered
    const transformedEvents = Array.from(requestMap.entries())
      .filter(([_, entry]) => entry.request !== null) // Only show events with requests
      .map(([requestId, entry]) => {
        const request = entry.request!
        const response = entry.response
        const actor = request.actor || {}
        
        // Determine if query was answered
        const wasAnswered = response !== null && 
          (response.data?.response_type === "final" || response.data?.response_type === "interrupt")
        
        // Extract original query (first question) - prefer full query, fallback to topic summary
        let originalQuery = "User query"
        if (request.data?.input?.query) {
          // Full query text is available - use it as the original query
          originalQuery = request.data.input.query
        } else if (request.data?.input?.query_topic) {
          // Use query topic summary if full query not available
          originalQuery = request.data.input.query_topic
        } else {
          // Fallback
          originalQuery = "User query"
        }

        return {
          id: `audit-${requestId}`,
          userId: actor.employee_id || "unknown",
          userName: actor.display_name || "Unknown User",
          userRole: (actor.role || "employee") as "employee" | "manager" | "hr-admin",
          query: originalQuery, // This is the original query (first question)
          queryTopic: request.data?.input?.query_topic || originalQuery, // Short topic summary
          documentsAccessed: entry.documentsAccessed,
          answered: wasAnswered,
          timestamp: request.ts,
          requestId: requestId,
        }
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    const total = transformedEvents.length
    const paginatedEvents = transformedEvents.slice(offset, offset + limit)
    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      events: paginatedEvents,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    })
  } catch (error) {
    console.error("Error reading audit logs:", error)
    return NextResponse.json(
      { error: "Failed to read audit logs" },
      { status: 500 }
    )
  }
}

