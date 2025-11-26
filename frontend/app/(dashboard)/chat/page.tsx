"use client"

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
import { cn } from "@/lib/utils"
import { useRole } from "@/lib/role-context"
import { conversations, type Conversation, type Message, type ActionCard } from "@/lib/mock-data"

const sourceIcons: Record<string, typeof FileText> = {
  policy: FileText,
  document: FileText,
  hris: Database,
  "manager-notes": MessageSquare,
}

const sourceColors: Record<string, string> = {
  policy: "bg-chart-1/10 text-chart-1",
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

function ChatPageContent() {
  const searchParams = useSearchParams()
  const { role } = useRole()
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(conversations[0])
  const [input, setInput] = useState("")
  const [selectedScopes, setSelectedScopes] = useState<string[]>(["all"])
  const [actionDrawerOpen, setActionDrawerOpen] = useState(false)
  const [selectedAction, setSelectedAction] = useState<ActionCard | null>(null)
  const [showSafetySettings, setShowSafetySettings] = useState(false)
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

  const handleActionClick = (action: ActionCard) => {
    setSelectedAction(action)
    setActionDrawerOpen(true)
  }

  const renderMessage = (message: Message) => {
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
          <div className="flex-1 space-y-3">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <div className="whitespace-pre-wrap text-sm">{message.content}</div>
            </div>

            {/* Sources */}
            {message.sources && message.sources.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                <span className="text-xs text-muted-foreground">Sources:</span>
                {message.sources.map((source, i) => {
                  const Icon = sourceIcons[source.type] || FileText
                  return (
                    <Badge key={i} variant="secondary" className={cn("text-xs gap-1", sourceColors[source.type])}>
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
                            className={cn(
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
            {conversations.filter((c) => c.pinned).length > 0 && (
              <>
                <div className="px-2 py-1.5">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pinned</span>
                </div>
                {conversations
                  .filter((c) => c.pinned)
                  .map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => setActiveConversation(conv)}
                      className={cn(
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
            {conversations
              .filter((c) => !c.pinned)
              .map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setActiveConversation(conv)}
                  className={cn(
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
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Ask HR Copilot anything..."
                      className="min-h-[60px] resize-none pr-12"
                    />
                    <Button variant="ghost" size="icon" className="absolute right-2 bottom-2 h-8 w-8">
                      <Paperclip className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button className="gap-2">
                      <Send className="h-4 w-4" />
                      Ask
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
