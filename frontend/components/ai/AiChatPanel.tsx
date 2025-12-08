"use client"

import { useState, useRef, useEffect } from "react"
import { Send, Sparkles, Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useRole } from "@/lib/role-context"
import * as MockData from "@/lib/mock-data"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeRaw from "rehype-raw"
import { toast } from "sonner"
import * as Utils from "@/lib/utils"
import { VoiceInput } from "@/components/voice/VoiceInput"
import { submitApproval } from "@/lib/voiceApproval"

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
    approved: "bg-primary",
    pending: "bg-yellow-500",
    cancelled: "bg-destructive",
  }

  const statusLabel: Record<string, string> = {
    approved: "Approved",
    pending: "Pending",
    cancelled: "Cancelled",
  }

  // Calculate date range for timeline
  const dates = data.entries.flatMap((e) => [new Date(e.start), new Date(e.end)])
  const minDate = new Date(Math.min(...dates.map((d) => d.getTime())))
  const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())))
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
    <div className="border rounded-lg bg-card p-4 my-4 space-y-3 border-primary/20">
      {data.title && <div className="font-semibold text-base mb-2">{data.title}</div>}

      {/* Timeline header */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
        <div className="w-32 shrink-0">Employee</div>
        <div className="flex-1 relative">
          <div className="flex justify-between">
            <span>{minDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
            <span>{maxDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
          </div>
        </div>
        <div className="w-24 shrink-0 text-right">Status</div>
      </div>

      {/* Timeline bars */}
      <div className="space-y-3">
        {data.entries.map((entry, idx) => {
          const left = getPosition(entry.start)
          const width = getWidth(entry.start, entry.end)
          const days =
            Math.ceil((new Date(entry.end).getTime() - new Date(entry.start).getTime()) / (1000 * 60 * 60 * 24)) + 1

          return (
            <div key={idx} className="flex items-center gap-3">
              <div className="w-32 font-medium text-sm truncate shrink-0">{entry.employee}</div>
              <div className="flex-1 relative h-8 bg-muted/30 rounded overflow-hidden">
                <div
                  className={`absolute h-full ${statusColor[entry.status] || "bg-slate-500"} rounded flex items-center justify-center text-white text-[10px] font-medium`}
                  style={{
                    left: `${left}%`,
                    width: `${width}%`,
                    minWidth: width < 5 ? "40px" : "auto",
                  }}
                  title={`${entry.start} to ${entry.end} (${days} day${days !== 1 ? "s" : ""})`}
                >
                  {width > 8 && (
                    <span className="px-1 truncate">
                      {new Date(entry.start).toLocaleDateString("en-US", { month: "short", day: "numeric" })} -{" "}
                      {new Date(entry.end).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  )}
                </div>
              </div>
              <div className="w-24 shrink-0 text-right">
                <span
                  className={`text-xs px-2 py-1 rounded ${statusColor[entry.status] || "bg-slate-500"} text-white`}
                >
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

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: string
  pendingApproval?: {
    explanation: string
    interruptId?: string
    threadId: string
    isVoice?: boolean
  }
}

const suggestedPrompts = {
  employee: [
    "How many vacation days do I have left?",
    "Explain my health benefits",
    "Request time off for next week",
    "What's my next payday?",
  ],
  manager: [
    "Show pending PTO approvals",
    "Team availability next week",
    "Team performance summary",
    "Who's on leave this month?",
  ],
  "hr-admin": [
    "Compliance check this month",
    "Audit summary this week",
    "Generate employment letter",
    "Policy update recommendations",
  ],
}

interface AiChatPanelProps {
  onClose?: () => void
  initialPrompt?: string
}

export function AiChatPanel({ onClose, initialPrompt }: AiChatPanelProps) {
  const { role, currentUser } = useRole()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState(initialPrompt || "")
  const [isLoading, setIsLoading] = useState(false)
  const [pendingApproval, setPendingApproval] = useState<{ explanation: string; interruptId?: string; threadId?: string; isVoice?: boolean } | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Update input when initialPrompt changes
  useEffect(() => {
    if (initialPrompt) {
      setInput(initialPrompt)
    }
  }, [initialPrompt])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // --- Voice handlers ---
  const handleVoiceTranscript = (transcript: string) => {
    if (!transcript.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: transcript,
      timestamp: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMessage])
  }

  const handleVoiceResponse = (text: string, _audioUrl: string, _voiceText?: string) => {
    if (!text.trim()) return

    const aiResponse: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: text,
      timestamp: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, aiResponse])
  }

  const handleVoiceInterrupt = (interrupts: any[]) => {
    if (!interrupts || interrupts.length === 0) return

    const interrupt = interrupts[0]
    if (interrupt.type !== "db_write_approval") return

    const employeeId = Utils.normalizeEmployeeId(currentUser.id)

    const interruptMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: "",
      timestamp: new Date().toISOString(),
      pendingApproval: {
        explanation: interrupt.explanation || "A database write operation requires your approval.",
        interruptId: interrupt.id,
        threadId: employeeId,
        isVoice: true,
      },
    }

    setMessages((prev) => [...prev, interruptMessage])
  }

  const handleVoiceError = (error: string) => {
    const errorMessage: Message = {
      id: Date.now().toString(),
      role: "assistant",
      content: `Voice error: ${error}`,
      timestamp: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, errorMessage])
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const query = input.trim()
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: query,
      timestamp: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const employeeId = Utils.normalizeEmployeeId(currentUser.id)
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"

      const response = await fetch(`${backendUrl}/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employee_id: employeeId,
          employee_name: currentUser.name,
          query: query,
          job_title: currentUser.title,
          role: role,
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
          const interruptMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: "", // Empty content - only show the approval widget
            timestamp: new Date().toISOString(),
            pendingApproval: {
              explanation: interrupt.explanation || "A database write operation requires your approval.",
              interruptId: interrupt.id,
              threadId: employeeId,
            },
          }
          setMessages((prev) => [...prev, interruptMessage])
          setIsLoading(false)
          return
        }
      }

      // Handle final response
      if (data.type === "final" && data.data) {
        const aiResponse: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.data,
          timestamp: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, aiResponse])
        toast.success("Response received")
      } else {
        throw new Error("Unexpected response format from backend")
      }
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: error instanceof Error ? error.message : "An error occurred while processing your request.",
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, errorMessage])
      toast.error("Failed to get response")
    } finally {
      setIsLoading(false)
    }
  }

  const handlePromptClick = (prompt: string) => {
    setInput(prompt)
  }

  const handleApprovalResponse = async (messageId: string, approved: boolean) => {
    const message = messages.find((m) => m.id === messageId)
    if (!message || !message.pendingApproval) return

    setIsLoading(true)
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"
      const { data, finalContent } = await submitApproval({
        backendUrl,
        isVoice: !!message.pendingApproval.isVoice,
        threadId: message.pendingApproval.threadId,
        currentUser: { name: currentUser.name || "", title: currentUser.title || "" },
        role,
        approved,
        autoPlayAudio: true,
      })

      // Update the message to remove pending approval and add the final response
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId) return m

          return {
            ...m,
            pendingApproval: undefined,
            content: finalContent,
          }
        })
      )

      if (approved) {
        toast.success("Action approved and executed")
      } else {
        toast.info("Action rejected")
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to process approval")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <ScrollArea className="h-full px-6 py-4" ref={scrollAreaRef}>
          <div className="space-y-6 max-w-4xl mx-auto">
          {messages.length === 0 && (
            <div className="text-center space-y-4 py-12">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Start a conversation</h3>
                <p className="text-sm text-muted-foreground">
                  Ask questions about HR policies, your profile, or documents.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center pt-4">
                {suggestedPrompts[role].map((prompt, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => handlePromptClick(prompt)}
                  >
                    {prompt}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div key={message.id} className="space-y-3">
              {/* Only show message bubble if there's content and no pending approval */}
              {message.content && !message.pendingApproval && (
                <div
                  className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {message.role === "assistant" && (
                    <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Sparkles className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted text-foreground rounded-bl-md"
                    }`}
                  >
                    {message.role === "assistant" ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          rehypePlugins={[rehypeRaw]}
                          components={{
                            table: (props) => (
                              <div className="overflow-x-auto my-3">
                                <table className="min-w-full border-collapse text-sm border border-border rounded-md">
                                  {props.children}
                                </table>
                              </div>
                            ),
                            thead: (props) => (
                              <thead className="border-b border-border bg-muted/50">
                                {props.children}
                              </thead>
                            ),
                            th: (props) => (
                              <th className="px-3 py-2 text-left font-semibold align-bottom border-r border-border last:border-r-0">
                                {props.children}
                              </th>
                            ),
                            tbody: (props) => <tbody>{props.children}</tbody>,
                            tr: (props) => (
                              <tr className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                                {props.children}
                              </tr>
                            ),
                            td: (props) => (
                              <td className="px-3 py-2 align-top break-words border-r border-border/30 last:border-r-0">
                                {props.children}
                              </td>
                            ),
                            code: (props: any) => {
                              const { inline, className, children } = props
                              const isInline = !inline && !className ? false : inline !== false
                              
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

                              if (!isInline) {
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

                              return isInline ? (
                                <code className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono">
                                  {children}
                                </code>
                              ) : (
                                <code className={className}>{children}</code>
                              )
                            },
                            pre: (props) => (
                              <pre className="overflow-x-auto p-4 rounded-lg bg-muted border border-border my-3">
                                {props.children}
                              </pre>
                            ),
                            ul: (props) => (
                              <ul className="list-disc list-inside my-2 space-y-1">
                                {props.children}
                              </ul>
                            ),
                            ol: (props) => (
                              <ol className="list-decimal list-inside my-2 space-y-1">
                                {props.children}
                              </ol>
                            ),
                            li: (props) => (
                              <li className="ml-4">{props.children}</li>
                            ),
                            p: (props) => (
                              <p className="my-2 leading-relaxed">{props.children}</p>
                            ),
                            h1: (props) => (
                              <h1 className="text-2xl font-bold mt-4 mb-2">{props.children}</h1>
                            ),
                            h2: (props) => (
                              <h2 className="text-xl font-semibold mt-3 mb-2">{props.children}</h2>
                            ),
                            h3: (props) => (
                              <h3 className="text-lg font-semibold mt-2 mb-1">{props.children}</h3>
                            ),
                            strong: (props) => (
                              <strong className="font-semibold">{props.children}</strong>
                            ),
                            em: (props) => (
                              <em className="italic">{props.children}</em>
                            ),
                            blockquote: (props) => (
                              <blockquote className="border-l-4 border-primary pl-4 my-2 italic text-muted-foreground">
                                {props.children}
                              </blockquote>
                            ),
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm">{message.content}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Action Confirmation Widget */}
              {message.pendingApproval && (
                <div className="flex justify-start">
                  <Card className="max-w-[80%] border-primary/50 bg-primary/5">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <AlertCircle className="h-5 w-5 text-primary" />
                        Action Confirmation Required
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <p className="text-sm whitespace-pre-wrap">{message.pendingApproval.explanation}</p>
                      </div>
                      <Separator />
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          onClick={() => handleApprovalResponse(message.id, false)}
                          disabled={isLoading}
                          className="gap-2"
                        >
                          <XCircle className="h-4 w-4" />
                          Reject
                        </Button>
                        <Button
                          onClick={() => handleApprovalResponse(message.id, true)}
                          disabled={isLoading}
                          className="gap-2 bg-primary hover:bg-primary/90"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Accept
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </div>

      {/* Input */}
      <div className="border-t bg-card p-4">
        <div className="max-w-3xl mx-auto space-y-3">
          <div className="flex gap-2 items-end">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder="Ask AI assistant anything..."
              className="min-h-[60px] resize-none flex-1"
              disabled={isLoading}
            />
            {/* Voice input button */}
            <VoiceInput
              employeeId={Utils.normalizeEmployeeId(currentUser.id)}
              employeeName={currentUser.name}
              jobTitle={currentUser.title}
              role={role}
              onTranscript={handleVoiceTranscript}
              onResponse={handleVoiceResponse}
              onError={handleVoiceError}
              onInterrupt={handleVoiceInterrupt}
              disabled={isLoading}
            />
            <Button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="self-end"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

