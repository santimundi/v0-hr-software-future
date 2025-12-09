 "use client"
import { submitApproval } from "@/lib/voiceApproval"

import { useState, useRef, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import {
  Send,
  Plus,
  Pin,
  Paperclip,
  Sparkles,
  FileText,
  Database,
  AlertCircle,
  ChevronRight,
  Shield,
  Eye,
  EyeOff,
  Calendar,
  Mail,
  ClipboardList,
  MessageSquare,
  CheckCircle,
  XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Toggle } from "@/components/ui/toggle"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import * as Utils from "@/lib/utils"
import { useRole } from "@/lib/role-context"
import * as MockData from "@/lib/mock-data"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeRaw from "rehype-raw"
import { VoiceInput } from "@/components/voice/VoiceInput"

const sourceIcons: Record<string, typeof FileText> = {
  policy: FileText,
  document: FileText,
  hris: Database,
  "manager-notes": MessageSquare,
}

const sourceColors: Record<string, string> = {
  policy: "bg-primary/10 text-primary",
  document: "bg-chart-2/10 text-chart-2",
  hris: "bg-chart-3/10 text-chart-3",
  "manager-notes": "bg-chart-4/10 text-chart-4",
}

const actionIcons: Record<string, typeof Calendar> = {
  "leave-request": Calendar,
  letter: Mail,
  summary: ClipboardList,
  message: MessageSquare,
}

const scopeOptions = [
  { id: "profile", label: "My profile" },
  { id: "documents", label: "My documents" },
  { id: "policies", label: "Company policies" },
  { id: "all", label: "All allowed sources" },
]

type AvailabilityEntry = {
  employee: string
  start: string
  end: string
  status: string
}

type AvailabilityChartData = {
  title?: string
  entries: AvailabilityEntry[]
}

function AvailabilityChart({ data }: { data: AvailabilityChartData }) {
  if (!data?.entries || !Array.isArray(data.entries) || data.entries.length === 0) {
    return null
  }

  const statusColor: Record<string, string> = {
    approved: "bg-emerald-500",
    pending: "bg-amber-500",
    cancelled: "bg-rose-500",
  }

  const statusLabel: Record<string, string> = {
    approved: "Approved",
    pending: "Pending",
    cancelled: "Cancelled",
  }

  // Calculate date range for timeline
  const dates = data.entries.flatMap(e => [new Date(e.start), new Date(e.end)])
  const minDate = new Date(Math.min(...dates.map(d => d.getTime())))
  const maxDate = new Date(Math.max(...dates.map(d => d.getTime())))
  const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)) + 1

  const getPosition = (dateStr: string) => {
    const date = new Date(dateStr)
    const daysFromStart = Math.ceil((date.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24))
    return (daysFromStart / totalDays) * 100
  }

  const getWidth = (start: string, end: string) => {
    const startPos = getPosition(start)
    const endPos = getPosition(end)
    return Math.max(2, endPos - startPos) // Minimum 2% width for visibility
  }

  return (
    <div className="border rounded-lg bg-card p-4 my-4 space-y-3">
      {data.title && <div className="font-semibold text-base mb-2">{data.title}</div>}
      
      {/* Timeline header */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
        <div className="w-32 shrink-0">Employee</div>
        <div className="flex-1 relative">
          <div className="flex justify-between">
            <span>{minDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
            <span>{maxDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
          </div>
        </div>
        <div className="w-24 shrink-0 text-right">Status</div>
      </div>

      {/* Timeline bars */}
      <div className="space-y-3">
        {data.entries.map((entry, idx) => {
          const left = getPosition(entry.start)
          const width = getWidth(entry.start, entry.end)
          const days = Math.ceil((new Date(entry.end).getTime() - new Date(entry.start).getTime()) / (1000 * 60 * 60 * 24)) + 1
          
          return (
            <div key={idx} className="flex items-center gap-3">
              <div className="w-32 font-medium text-sm truncate shrink-0">{entry.employee}</div>
              <div className="flex-1 relative h-8 bg-muted/30 rounded overflow-hidden">
                <div
                  className={`absolute h-full ${statusColor[entry.status] || "bg-slate-500"} rounded flex items-center justify-center text-white text-[10px] font-medium`}
                  style={{ 
                    left: `${left}%`, 
                    width: `${width}%`,
                    minWidth: width < 5 ? '40px' : 'auto'
                  }}
                  title={`${entry.start} to ${entry.end} (${days} day${days !== 1 ? 's' : ''})`}
                >
                  {width > 8 && (
                    <span className="px-1 truncate">
                      {new Date(entry.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(entry.end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>
              </div>
              <div className="w-24 shrink-0 text-right">
                <span className={`text-xs px-2 py-1 rounded ${statusColor[entry.status] || "bg-slate-500"} text-white`}>
                  {statusLabel[entry.status] || entry.status}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ChatPageContent() {
  const searchParams = useSearchParams()
  const { role, currentUser } = useRole()
  const [activeConversation, setActiveConversation] = useState<MockData.Conversation | null>(MockData.conversations[0])
  const [input, setInput] = useState("")
  const [selectedScopes, setSelectedScopes] = useState<string[]>(["all"])
  const [actionDrawerOpen, setActionDrawerOpen] = useState(false)
  const [selectedAction, setSelectedAction] = useState<MockData.ActionCard | null>(null)
  const [showSafetySettings, setShowSafetySettings] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [pendingApproval, setPendingApproval] = useState<{ explanation: string; interruptId?: string; threadId?: string; isVoice?: boolean } | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const prompt = searchParams.get("prompt")
    if (prompt) {
      setInput(prompt)
    }
  }, [searchParams])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [activeConversation?.messages])

  const handleScopeToggle = (scopeId: string) => {
    if (scopeId === "all") {
      setSelectedScopes(["all"])
    } else {
      const newScopes = selectedScopes.includes(scopeId)
        ? selectedScopes.filter((s) => s !== scopeId)
        : [...selectedScopes.filter((s) => s !== "all"), scopeId]
      setSelectedScopes(newScopes.length ? newScopes : ["all"])
    }
  }

  const handleActionClick = (action: MockData.ActionCard) => {
    setSelectedAction(action)
    setActionDrawerOpen(true)
  }

  /**
   * Parses the backend response and extracts structured data
   * Handles both plain text and structured JSON responses
   */
  const parseBackendResponse = (responseData: any): Partial<MockData.Message> => {
    try {
      // If data is a string, try to parse it as JSON first
      let parsedData = responseData.data
      
      if (typeof parsedData === 'string') {
        // Try to parse as JSON
        try {
          parsedData = JSON.parse(parsedData)
        } catch {
          // If parsing fails, treat as plain text
          return {
            content: parsedData,
          }
        }
      }

      // If parsedData is an object, extract structured fields
      if (typeof parsedData === 'object' && parsedData !== null) {
        const message: Partial<MockData.Message> = {
          content: parsedData.content || parsedData.text || parsedData.message || JSON.stringify(parsedData),
        }

        // Extract sources if present
        if (parsedData.sources && Array.isArray(parsedData.sources)) {
          message.sources = parsedData.sources.map((source: any) => ({
            type: source.type || 'document',
            title: source.title || source.name || 'Unknown Source',
            version: source.version,
          })) as MockData.Source[]
        }

        // Extract dataUsed if present
        if (parsedData.dataUsed && Array.isArray(parsedData.dataUsed)) {
          message.dataUsed = parsedData.dataUsed
        } else if (parsedData.data_used && Array.isArray(parsedData.data_used)) {
          message.dataUsed = parsedData.data_used
        }

        // Extract confidence if present
        if (parsedData.confidence && ['low', 'medium', 'high'].includes(parsedData.confidence)) {
          message.confidence = parsedData.confidence as 'low' | 'medium' | 'high'
        }

        // Extract actions if present
        if (parsedData.actions && Array.isArray(parsedData.actions)) {
          message.actions = parsedData.actions.map((action: any, index: number) => ({
            id: action.id || `action-${Date.now()}-${index}`,
            type: action.type || 'message',
            title: action.title || action.name || 'Action',
            description: action.description || action.desc || '',
          })) as MockData.ActionCard[]
        }

        return message
      }

      // Fallback: treat as plain text
      return {
        content: String(parsedData),
      }
    } catch (error) {
      // Fallback to plain text
      return {
        content: typeof responseData.data === 'string' 
          ? responseData.data 
          : JSON.stringify(responseData.data) || "Sorry, I couldn't process your request.",
      }
    }
  }

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return

    const query = input.trim()
    setInput("")
    setIsLoading(true)

    try {
      const employeeId = Utils.normalizeEmployeeId(currentUser.id)

      // Create or get active conversation
      let conversation = activeConversation
      if (!conversation) {
        // Create a new conversation
        const newConversation: MockData.Conversation = {
          id: Date.now().toString(),
          title: query.substring(0, 50),
          lastMessage: query,
          timestamp: new Date().toISOString(),
          pinned: false,
          messages: [],
        }
        setActiveConversation(newConversation)
        conversation = newConversation
      }

      // Add user message to conversation
      const userMessage: MockData.Message = {
        id: Date.now().toString(),
        role: "user",
        content: query,
        timestamp: new Date().toISOString(),
      }

      const updatedMessages = [...(conversation.messages || []), userMessage]
      setActiveConversation({
        ...conversation,
        messages: updatedMessages,
        lastMessage: query,
      })

      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"}/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employee_id: employeeId,
          employee_name: currentUser.name,
          query: query,
          job_title: currentUser.title,
        }),
      }).catch((fetchError) => {
        throw new Error(
          `Unable to connect to backend server. Please make sure the backend is running on port 8000.`
        )
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error")
        throw new Error(`Backend error (${response.status}): ${errorText}`)
      }

      const data = await response.json()
      
      // Check if this is an interrupt (HITL approval needed)
      if (data.type === "interrupt" && data.interrupts && data.interrupts.length > 0) {
        const interrupt = data.interrupts[0]
        if (interrupt.type === "db_write_approval") {
          // Store the pending approval request with thread ID for resume
          setPendingApproval({
            explanation: interrupt.explanation || "A database write operation requires your approval.",
            interruptId: interrupt.id,
            threadId: employeeId, // Use employee_id as thread_id for resume
          })
          setIsLoading(false)
          return
        }
      }
      
      // Parse the backend response to extract structured data
      const parsedResponse = parseBackendResponse(data)
      
      // Add AI response to conversation with parsed data
      const aiMessage: MockData.Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: parsedResponse.content || "Sorry, I couldn't process your request.",
        timestamp: new Date().toISOString(),
        ...(parsedResponse.sources && { sources: parsedResponse.sources }),
        ...(parsedResponse.dataUsed && { dataUsed: parsedResponse.dataUsed }),
        ...(parsedResponse.confidence && { confidence: parsedResponse.confidence }),
        ...(parsedResponse.actions && { actions: parsedResponse.actions }),
      }

      setActiveConversation({
        ...conversation,
        messages: [...updatedMessages, aiMessage],
        lastMessage: query,
      })
    } catch (error) {
      // Add error message to conversation
      if (activeConversation) {
        const errorMessage: MockData.Message = {
          id: Date.now().toString(),
          role: "assistant",
          content: error instanceof Error ? error.message : "An error occurred while processing your request.",
          timestamp: new Date().toISOString(),
        }
        setActiveConversation({
          ...activeConversation,
          messages: [...(activeConversation.messages || []), errorMessage],
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Handle voice response
  const handleVoiceResponse = (text: string, _audioUrl: string, _voiceText?: string) => {
    if (!activeConversation) return
    
    // Add AI response to conversation
    const aiMessage: MockData.Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: text,
      timestamp: new Date().toISOString(),
    }

    setActiveConversation({
      ...activeConversation,
      messages: [...(activeConversation.messages || []), aiMessage],
      lastMessage: text.substring(0, 50),
    })
  }

  // Handle voice transcript (user's spoken message)
  const handleVoiceTranscript = (transcript: string) => {
    if (!transcript.trim()) return

    // Create or get active conversation
    let conversation = activeConversation
    if (!conversation) {
      const newConversation: MockData.Conversation = {
        id: Date.now().toString(),
        title: transcript.substring(0, 50),
        lastMessage: transcript,
        timestamp: new Date().toISOString(),
        pinned: false,
        messages: [],
      }
      setActiveConversation(newConversation)
      conversation = newConversation
    }

    // Add user message to conversation
    const userMessage: MockData.Message = {
      id: Date.now().toString(),
      role: "user",
      content: transcript,
      timestamp: new Date().toISOString(),
    }

    setActiveConversation({
      ...conversation,
      messages: [...(conversation.messages || []), userMessage],
      lastMessage: transcript,
    })
  }

  // Handle voice interrupts (HITL)
  const handleVoiceInterrupt = (interrupts: any[]) => {
    if (interrupts.length > 0) {
      const interrupt = interrupts[0]
      if (interrupt.type === "db_write_approval") {
        setPendingApproval({
          explanation: interrupt.explanation || "A database write operation requires your approval.",
          interruptId: interrupt.id,
          threadId: Utils.normalizeEmployeeId(currentUser.id),
          isVoice: true,
        })
      }
    }
  }

  const handleVoiceError = (error: string) => {
    if (activeConversation) {
      const errorMessage: MockData.Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: `Voice error: ${error}`,
        timestamp: new Date().toISOString(),
      }
      setActiveConversation({
        ...activeConversation,
        messages: [...(activeConversation.messages || []), errorMessage],
      })
    }
  }

  const handleApprovalResponse = async (approved: boolean) => {
    if (!pendingApproval) return

    setIsLoading(true)
    try {
      const employeeId = Utils.normalizeEmployeeId(currentUser.id)
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"

      const { data, finalContent } = await submitApproval({
        backendUrl,
        isVoice: !!pendingApproval.isVoice,
        threadId: pendingApproval.threadId || employeeId,
        currentUser: { name: currentUser.name, title: currentUser.title },
        role,
        approved,
        autoPlayAudio: true,
      })
      
      // Clear pending approval
      setPendingApproval(null)

      // Handle the final response
      if (data.type === "final" || data.type === "voice_final") {
        if (activeConversation) {
          const aiMessage: MockData.Message = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: finalContent,
            timestamp: new Date().toISOString(),
          }
          setActiveConversation({
            ...activeConversation,
            messages: [...(activeConversation.messages || []), aiMessage],
          })
        }
      } else if (data.type === "interrupt") {
        // Another interrupt (shouldn't happen, but handle it)
        const interrupt = data.interrupts?.[0]
        if (interrupt?.type === "db_write_approval") {
          setPendingApproval({
            explanation: interrupt.explanation || "A database write operation requires your approval.",
            interruptId: interrupt.id,
          })
        }
      }
    } catch (error) {
      if (activeConversation) {
        const errorMessage: MockData.Message = {
          id: Date.now().toString(),
          role: "assistant",
          content: error instanceof Error ? error.message : "An error occurred while processing your approval.",
          timestamp: new Date().toISOString(),
        }
        setActiveConversation({
          ...activeConversation,
          messages: [...(activeConversation.messages || []), errorMessage],
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const renderMessage = (message: MockData.Message) => {
    if (message.role === "user") {
      return (
        <div key={message.id} className="flex justify-end">
          <div className="max-w-[80%] rounded-2xl rounded-br-md bg-primary text-primary-foreground px-4 py-3">
            <p className="text-sm">{message.content}</p>
          </div>
        </div>
      )
    }

    return (
      <div key={message.id} className="space-y-3">
        <div className="flex gap-3">
          <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 space-y-3 min-w-0">
            <div className="prose prose-sm dark:prose-invert max-w-none break-words">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
                components={{
                  code: (props: any) => {
                    const { inline, className, children } = props
                    // Allow hyphens in language name
                    const match = /language-([\w-]+)/.exec(className || "")
                    const language = match?.[1]
                    // Safer: children can be an array
                    const textContent = Array.isArray(children) ? children.join("") : String(children)
                    const trimmed = textContent.trim()

                    const tryParseChart = () => {
                      try {
                        const parsed = JSON.parse(trimmed)
                        if (parsed && Array.isArray(parsed.entries)) {
                          return parsed as AvailabilityChartData
                        }
                      } catch {
                        return null
                      }
                      return null
                    }

                    if (!inline) {
                      if (language === "availability-chart") {
                        const chartData = tryParseChart()
                        if (chartData) return <AvailabilityChart data={chartData} />
                      }
                      // Optional fallback: if LLM forgot language but returned valid JSON
                      if (!language) {
                        const chartData = tryParseChart()
                        if (chartData) return <AvailabilityChart data={chartData} />
                      }
                    }

                    return <code className={className}>{children}</code>
                  },
                  pre: (props) => <>{props.children}</>,
                  table: (props) => (
                    <div className="overflow-x-auto my-3">
                      <table className="min-w-full border-collapse text-sm">
                        {props.children}
                      </table>
                    </div>
                  ),
                  thead: (props) => (
                    <thead className="border-b border-muted-foreground/40 bg-muted/40">
                      {props.children}
                    </thead>
                  ),
                  th: (props) => (
                    <th className="px-3 py-2 text-left font-semibold align-bottom">
                      {props.children}
                    </th>
                  ),
                  tbody: (props) => <tbody>{props.children}</tbody>,
                  tr: (props) => (
                    <tr className="border-b border-muted/20 last:border-0">
                      {props.children}
                    </tr>
                  ),
                  td: (props) => (
                    <td className="px-3 py-1 align-top break-words">
                      {props.children}
                    </td>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>

            {/* Sources */}
            {message.sources && message.sources.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                <span className="text-xs text-muted-foreground">Sources:</span>
                {message.sources.map((source, i) => {
                  const Icon = sourceIcons[source.type] || FileText
                  return (
                    <Badge key={i} variant="secondary" className={Utils.cn("text-xs gap-1", sourceColors[source.type])}>
                      <Icon className="h-3 w-3" />
                      {source.title}
                      {source.version && <span className="opacity-70">v{source.version}</span>}
                    </Badge>
                  )
                })}
              </div>
            )}

            {/* Data Used & Confidence */}
            {(message.dataUsed || message.confidence) && (
              <div className="flex items-center gap-4 pt-1">
                {message.dataUsed && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Data used:</span>
                    {message.dataUsed.map((data, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {data}
                      </Badge>
                    ))}
                  </div>
                )}
                {message.confidence && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-muted-foreground">Confidence:</span>
                          <Badge
                            variant="outline"
                            className={Utils.cn(
                              "text-xs",
                              message.confidence === "high" && "border-success text-success",
                              message.confidence === "medium" && "border-warning text-warning",
                              message.confidence === "low" && "border-destructive text-destructive",
                            )}
                          >
                            {message.confidence}
                          </Badge>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Based on source coverage and data quality</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            )}

            {/* Actions */}
            {message.actions && message.actions.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {message.actions.map((action) => {
                  const Icon = actionIcons[action.type] || ChevronRight
                  return (
                    <Button
                      key={action.id}
                      variant="outline"
                      size="sm"
                      className="h-auto py-2 gap-2 bg-transparent"
                      onClick={() => handleActionClick(action)}
                    >
                      <Icon className="h-3 w-3" />
                      {action.title}
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Conversations Sidebar */}
      <div className="w-72 border-r bg-muted/30 flex flex-col">
        <div className="p-4 border-b">
          <Button className="w-full gap-2" onClick={() => setActiveConversation(null)}>
            <Plus className="h-4 w-4" />
            New Chat
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {MockData.conversations.filter((c) => c.pinned).length > 0 && (
              <>
                <div className="px-2 py-1.5">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pinned</span>
                </div>
                {MockData.conversations
                  .filter((c) => c.pinned)
                  .map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => setActiveConversation(conv)}
                      className={Utils.cn(
                        "w-full text-left p-3 rounded-lg transition-colors",
                        activeConversation?.id === conv.id ? "bg-accent" : "hover:bg-accent/50",
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <Pin className="h-3 w-3 text-primary mt-1 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{conv.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{conv.lastMessage}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                <Separator className="my-2" />
              </>
            )}
            <div className="px-2 py-1.5">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Recent</span>
            </div>
            {MockData.conversations
              .filter((c) => !c.pinned)
              .map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setActiveConversation(conv)}
                  className={Utils.cn(
                    "w-full text-left p-3 rounded-lg transition-colors",
                    activeConversation?.id === conv.id ? "bg-accent" : "hover:bg-accent/50",
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{conv.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{conv.lastMessage}</p>
                  </div>
                </button>
              ))}
          </div>
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {activeConversation ? (
          <>
            {/* Messages */}
            <ScrollArea className="flex-1 p-6">
              <div className="max-w-3xl mx-auto space-y-6">
                {activeConversation.messages.map(renderMessage)}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Approval Dialog */}
            {pendingApproval && (
              <div className="border-t bg-card p-4 border-yellow-500/20 bg-yellow-500/5">
                <div className="max-w-3xl mx-auto">
                  <Card className="border-yellow-500/50">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <AlertCircle className="h-5 w-5 text-yellow-500" />
                        Action Confirmation Required
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <p className="text-sm whitespace-pre-wrap">{pendingApproval.explanation}</p>
                      </div>
                      <Separator />
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          onClick={() => handleApprovalResponse(false)}
                          disabled={isLoading}
                          className="gap-2"
                        >
                          <XCircle className="h-4 w-4" />
                          Reject
                        </Button>
                        <Button
                          onClick={() => handleApprovalResponse(true)}
                          disabled={isLoading}
                          className="gap-2"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Approve
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* Input Area */}
            <div className="border-t bg-card p-4">
              <div className="max-w-3xl mx-auto space-y-3">
                {/* Scope Selector */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground">Search scope:</span>
                  {scopeOptions.map((scope) => (
                    <Toggle
                      key={scope.id}
                      size="sm"
                      pressed={selectedScopes.includes(scope.id)}
                      onPressedChange={() => handleScopeToggle(scope.id)}
                      className="text-xs h-7"
                    >
                      {scope.label}
                    </Toggle>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto text-xs h-7"
                    onClick={() => setShowSafetySettings(!showSafetySettings)}
                  >
                    <Shield className="h-3 w-3 mr-1" />
                    Safety
                  </Button>
                </div>

                {/* Safety Settings */}
                {showSafetySettings && (
                  <div className="flex items-center gap-4 p-2 rounded-lg bg-muted/50 text-xs">
                    <div className="flex items-center gap-2">
                      <EyeOff className="h-3 w-3 text-success" />
                      <span>Never reveal salary</span>
                      <Badge variant="secondary" className="text-xs">
                        On
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Eye className="h-3 w-3 text-success" />
                      <span>Mask PII</span>
                      <Badge variant="secondary" className="text-xs">
                        On
                      </Badge>
                    </div>
                  </div>
                )}

                {/* Input */}
                <div className="flex gap-2 items-end">
                  {/* Voice Input */}
                  <VoiceInput
                    employeeId={Utils.normalizeEmployeeId(currentUser.id)}
                    employeeName={currentUser.name}
                    jobTitle={currentUser.title}
                    role={role}
                    onTranscript={handleVoiceTranscript}
                    onResponse={handleVoiceResponse}
                    onError={handleVoiceError}
                    onInterrupt={handleVoiceInterrupt}
                    disabled={isLoading || !!pendingApproval}
                  />
                  
                  {/* Text Input */}
                  <div className="flex-1 relative">
                    <Textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault()
                          handleSendMessage()
                        }
                      }}
                      placeholder="Ask AI assistant anything..."
                      className="min-h-[60px] resize-none pr-12"
                      disabled={isLoading}
                    />
                    <Button variant="ghost" size="icon" className="absolute right-2 bottom-2 h-8 w-8">
                      <Paperclip className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button 
                      className="gap-2" 
                      onClick={handleSendMessage}
                      disabled={isLoading || !input.trim()}
                    >
                      <Send className="h-4 w-4" />
                      {isLoading ? "Sending..." : "Ask"}
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs bg-transparent">
                      Draft
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Empty State / New Chat */
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="max-w-md text-center space-y-6">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold">Start a new conversation</h2>
                <p className="text-muted-foreground">
                  Ask questions about HR policies, your profile, documents, or request help with HR workflows.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  className="justify-start bg-transparent"
                  onClick={() => setInput("How many vacation days do I have left?")}
                >
                  <ChevronRight className="h-4 w-4 mr-2" />
                  How many vacation days do I have left?
                </Button>
                <Button
                  variant="outline"
                  className="justify-start bg-transparent"
                  onClick={() => setInput("Summarize my last performance review")}
                >
                  <ChevronRight className="h-4 w-4 mr-2" />
                  Summarize my last performance review
                </Button>
                <Button
                  variant="outline"
                  className="justify-start bg-transparent"
                  onClick={() => setInput("Draft an employment verification letter")}
                >
                  <ChevronRight className="h-4 w-4 mr-2" />
                  Draft an employment verification letter
                </Button>
              </div>
              <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  Citations included
                </div>
                <div className="flex items-center gap-1">
                  <Database className="h-3 w-3" />
                  PII protected
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Drawer */}
      <Sheet open={actionDrawerOpen} onOpenChange={setActionDrawerOpen}>
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              {selectedAction &&
                (() => {
                  const Icon = actionIcons[selectedAction.type]
                  return Icon ? <Icon className="h-5 w-5" /> : null
                })()}
              {selectedAction?.title}
            </SheetTitle>
            <SheetDescription>{selectedAction?.description}</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            {selectedAction?.type === "leave-request" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Leave Request Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Start Date</label>
                      <p className="text-sm text-muted-foreground">December 23, 2024</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">End Date</label>
                      <p className="text-sm text-muted-foreground">December 27, 2024</p>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Leave Type</label>
                    <p className="text-sm text-muted-foreground">Annual Leave</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Days Requested</label>
                    <p className="text-sm text-muted-foreground">5 days</p>
                  </div>
                  <Separator />
                  <div className="flex items-center gap-2 text-sm text-success">
                    <AlertCircle className="h-4 w-4" />
                    <span>Policy compliant - Request can be submitted</span>
                  </div>
                  <div className="flex gap-2">
                    <Button className="flex-1">Submit Request</Button>
                    <Button variant="outline">Save as Draft</Button>
                  </div>
                </CardContent>
              </Card>
            )}
            {selectedAction?.type === "letter" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Employment Verification Letter</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-muted p-4 rounded-lg text-sm font-mono whitespace-pre-wrap">
                    {`To Whom It May Concern,

This letter confirms that Sarah Chen has been employed at Company Inc. since March 15, 2022.

Current Position: Senior Software Engineer
Department: Engineering
Employment Status: Full-time

Please contact HR for any additional information.

Best regards,
HR Department`}
                  </div>
                  <div className="flex gap-2">
                    <Button className="flex-1">Download PDF</Button>
                    <Button variant="outline">Edit</Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="flex h-[calc(100vh-4rem)] items-center justify-center">Loading...</div>}>
      <ChatPageContent />
    </Suspense>
  )
}
