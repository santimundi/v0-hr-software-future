"use client"

import { useState } from "react"
import { Heart, Shield, Sparkles, DollarSign, Activity, CheckCircle, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import * as MockData from "@/lib/mock-data"
import { useRole } from "@/lib/role-context"
import * as Utils from "@/lib/utils"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeRaw from "rehype-raw"

const benefitIcons: Record<string, typeof Heart> = {
  Health: Heart,
  Retirement: DollarSign,
  Wellness: Activity,
}

export default function BenefitsPage() {
  const { currentUser, role } = useRole()
  const [question, setQuestion] = useState("")
  const [aiResponse, setAiResponse] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleAskQuestion = async () => {
    if (!question.trim() || isLoading) return

    setIsLoading(true)
    setAiResponse(null)

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"
      const employeeId = Utils.normalizeEmployeeId(currentUser.id)

      const requestBody = {
        employee_id: employeeId,
        employee_name: currentUser.name,
        query: question.trim(),
        job_title: currentUser.title,
        role: role,
      }

      const response = await fetch(`${backendUrl}/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error")
        throw new Error(`Backend error (${response.status}): ${errorText}`)
      }

      const data = await response.json()
      
      // Handle both final and interrupt responses
      if (data.type === "final" && data.data) {
        setAiResponse(data.data)
      } else if (data.type === "interrupt" && data.interrupts && data.interrupts.length > 0) {
        // For interrupts, show the explanation
        const interrupt = data.interrupts[0]
        setAiResponse(interrupt.explanation || "An action requires your approval.")
      } else {
        setAiResponse(data.data || "Sorry, I couldn't process your question.")
      }
    } catch (error: any) {
      setAiResponse(`Error: ${error.message || "Failed to get response. Please try again."}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Benefits</h1>
        <p className="text-muted-foreground">Your benefits package explained in simple terms</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Benefits List */}
        <div className="lg:col-span-2 space-y-4">
          {MockData.benefits.map((benefit) => {
            const Icon = benefitIcons[benefit.type] || Shield
            return (
              <Card key={benefit.id}>
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <CardTitle>{benefit.name}</CardTitle>
                        <Badge variant="secondary">{benefit.type}</Badge>
                      </div>
                      <CardDescription className="mt-1">{benefit.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Eligibility</p>
                      <p className="font-medium">{benefit.eligibility}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Coverage</p>
                      <p className="font-medium">{benefit.coverage}</p>
                    </div>
                  </div>
                  <Separator className="my-4" />
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-xs">
                      Policy Reference
                    </Badge>
                    <span>{benefit.policyRef}</span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* AI Q&A Panel */}
        <div className="space-y-4">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Ask About Benefits
              </CardTitle>
              <CardDescription>Get plain-language explanations with policy citations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="e.g., Explain my health benefits like I'm 5"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                rows={3}
              />
              <Button 
                className="w-full gap-2" 
                onClick={handleAskQuestion}
                disabled={!question.trim() || isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Asking...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Explain My Benefits
                  </>
                )}
              </Button>

              {aiResponse && (
                <div className="mt-4 space-y-3">
                  <Separator />
                  <ScrollArea className="h-[300px] pr-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Sparkles className="h-3 w-3 text-primary" />
                        </div>
                        <span className="text-sm font-medium">AI assistant</span>
                      </div>
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
                            code: (props) => {
                              const { children, className } = props
                              const isInline = !className
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
                          {aiResponse}
                        </ReactMarkdown>
                      </div>
                      <div className="flex items-center gap-2 pt-2">
                        <Badge variant="secondary" className="text-xs">
                          Policy
                        </Badge>
                        <span className="text-xs text-muted-foreground">Benefits Overview v2.5</span>
                      </div>
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* Quick Questions */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Common Questions</p>
                <div className="space-y-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-xs h-auto py-2"
                    onClick={() => setQuestion("Compare the health plan options")}
                  >
                    Compare health plan options
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-xs h-auto py-2"
                    onClick={() => setQuestion("How does the 401k match work?")}
                  >
                    How does the 401k match work?
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-xs h-auto py-2"
                    onClick={() => setQuestion("What wellness programs are available?")}
                  >
                    What wellness programs are available?
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Your Enrollment */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Your Enrollment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Health Plan</span>
                  <Badge className="bg-success/10 text-success">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Premium PPO
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Dental</span>
                  <Badge className="bg-success/10 text-success">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Standard
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Vision</span>
                  <Badge className="bg-success/10 text-success">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Basic
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">401(k)</span>
                  <Badge className="bg-success/10 text-success">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    6% contribution
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
