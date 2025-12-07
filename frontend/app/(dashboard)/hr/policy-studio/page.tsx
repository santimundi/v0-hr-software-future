"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Play, 
  Plus, 
  FileText, 
  Search,
  Sparkles,
  ChevronRight,
  Trash2,
} from "lucide-react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useRole } from "@/lib/role-context"
import { toast } from "sonner"
import * as Utils from "@/lib/utils"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeRaw from "rehype-raw"

interface TestScenario {
  id: string
  description: string
  status?: "clear" | "ambiguous" | "conflict"
  details?: {
    sectionsChecked: string[]
    issue?: string
    suggestedFix?: string
    conflictingClauses?: {
      policy1: string
      policy2: string
      clause1: string
      clause2: string
    }
  }
}

interface PolicyClash {
  id: string
  query: string
  hasConflict: boolean
  policiesChecked: string[]
  answer: string
  conflictDetails?: {
    policy1: string
    policy2: string
    explanation: string
    suggestedResolution: string
  }
}

export default function PolicyStudioPage() {
  const { role, currentUser } = useRole()
  const [scenarios, setScenarios] = useState<TestScenario[]>([
    {
      id: "1",
      description: "PTO during probation: 3-month employee requests 2 consecutive days",
    },
    {
      id: "2",
      description: "Carryover: how many PTO days carry into next year?",
    },
    {
      id: "3",
      description: "Contractors and dental eligibility",
    },
    {
      id: "4",
      description: "Leave overlap coverage rule (40% working minimum)",
    },
    {
      id: "5",
      description: "Remote work time zone core hours",
    },
  ])
  const [newScenario, setNewScenario] = useState("")
  const [isRunningTests, setIsRunningTests] = useState(false)
  const [expandedScenarioId, setExpandedScenarioId] = useState<string | null>(null)
  const [clashQuery, setClashQuery] = useState("")
  const [clashResults, setClashResults] = useState<PolicyClash[]>([])
  const [isCheckingClash, setIsCheckingClash] = useState(false)

  const router = useRouter()

  useEffect(() => {
    if (role !== "hr-admin") {
      router.push("/")
    }
  }, [role, router])

  if (role !== "hr-admin") {
    return null
  }

  const handleRunTests = async () => {
    if (scenarios.length === 0) {
      toast.error("Please add at least one test scenario")
      return
    }

    setIsRunningTests(true)

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"
      const employeeId = Utils.normalizeEmployeeId(currentUser.id)

      // Format all scenarios into a single query
      const scenariosText = scenarios
        .map((scenario, index) => `${index + 1}. ${scenario.description}`)
        .join("\n")

      const query = `Evaluate the following policy test scenarios:\n\n${scenariosText}\n\nFor each scenario, classify it as 'clear', 'ambiguous', or 'conflict' and provide detailed analysis.`

      const requestBody = {
        employee_id: employeeId,
        employee_name: currentUser.name,
        query: query,
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

      // Check if it's policy test results
      if (data.type === "policy_test_results") {
        const results: Array<{
          status: "clear" | "ambiguous" | "conflict"
          sections_checked: string[]
          issue?: string | null
          suggested_fix?: string | null
          conflicting_clauses?: {
            policy1: string
            policy2: string
            clause1: string
            clause2: string
          } | null
        }> = data.data

        // Map results back to scenarios
        const updatedScenarios = scenarios.map((scenario, index) => {
          const result = results[index]
          if (result) {
            return {
              ...scenario,
              status: result.status,
              details: {
                sectionsChecked: result.sections_checked || [],
                issue: result.issue || undefined,
                suggestedFix: result.suggested_fix || undefined,
                conflictingClauses: result.conflicting_clauses ? {
                  policy1: result.conflicting_clauses.policy1,
                  policy2: result.conflicting_clauses.policy2,
                  clause1: result.conflicting_clauses.clause1,
                  clause2: result.conflicting_clauses.clause2,
                } : undefined,
              }
            }
          }
          // Fallback if result is missing
          return {
            ...scenario,
            status: "ambiguous" as const,
            details: {
              sectionsChecked: [],
              issue: "Evaluation incomplete",
            }
          }
        })

        setScenarios(updatedScenarios)
        toast.success("Policy tests completed")
      } else {
        throw new Error("Unexpected response type from backend")
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to run tests. Please try again.")
      console.error("Error running policy tests:", error)
    } finally {
      setIsRunningTests(false)
    }
  }

  const handleAddScenario = () => {
    if (newScenario.trim()) {
      // Generate a unique ID based on timestamp and random number
      const newId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      setScenarios([
        ...scenarios,
        {
          id: newId,
          description: newScenario.trim(),
        },
      ])
      setNewScenario("")
    }
  }

  const handleDeleteScenario = (scenarioId: string) => {
    const scenario = scenarios.find((s) => s.id === scenarioId)
    setScenarios(scenarios.filter((s) => s.id !== scenarioId))
    // If the deleted scenario was expanded, clear the expansion
    if (expandedScenarioId === scenarioId) {
      setExpandedScenarioId(null)
    }
    toast.success("Test scenario deleted", {
      description: scenario?.description || "Test scenario has been removed",
    })
  }

  const handleCheckClash = async () => {
    if (!clashQuery.trim()) return

    setIsCheckingClash(true)

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"
      const employeeId = Utils.normalizeEmployeeId(currentUser.id)

      // Format the query with the required prefix
      const formattedQuery = `Check whether the following phrase/question has contradictions across the different company policies involved:\n:${clashQuery.trim()}`

      const requestBody = {
        employee_id: employeeId,
        employee_name: currentUser.name,
        query: formattedQuery,
        job_title: currentUser.title,
        role: role,
      }

      const response = await fetch(`${backendUrl}/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
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
      
      // Parse the response to extract answer and documents cited
      const responseText = data.data || ""
      
      // Extract documents cited from the response
      // The format is: "**Documents cited**" followed by a list of document names
      const documentsCitedMatch = responseText.match(/\*\*Documents cited\*\*[\s\n]+(.*?)(?:\n\n|\n$|$)/is)
      let policiesChecked: string[] = []
      let answerText = responseText
      
      if (documentsCitedMatch) {
        // Extract the documents list (could be comma-separated, bullet points, etc.)
        const documentsSection = documentsCitedMatch[1].trim()
        // Remove the documents cited section from the answer
        answerText = responseText.replace(/\*\*Documents cited\*\*[\s\n]+.*$/is, "").trim()
        
        // Parse document names - handle various formats (comma-separated, bullet points, etc.)
        policiesChecked = documentsSection
          .split(/[,\n•\-\*]/)
          .map(doc => doc.trim())
          .filter(doc => doc.length > 0)
      }
      
      // Determine if there's a conflict based on keywords in the response
      const hasConflict = responseText.toLowerCase().includes("conflict") || 
                         responseText.toLowerCase().includes("contradiction") ||
                         responseText.toLowerCase().includes("disagree")

      const newClash: PolicyClash = {
        id: String(clashResults.length + 1),
        query: clashQuery.trim(),
        hasConflict,
        policiesChecked,
        answer: answerText,
        conflictDetails: hasConflict ? {
          policy1: "",
          policy2: "",
          explanation: answerText,
          suggestedResolution: "",
        } : undefined,
      }

      // Replace previous results with only the new one
      setClashResults([newClash])
      setClashQuery("")
      toast.success("Clash check completed")
    } catch (error: any) {
      toast.error(error.message || "Failed to check for clashes. Please try again.")
      console.error("Error checking policy clash:", error)
    } finally {
      setIsCheckingClash(false)
    }
  }

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case "clear":
        return <CheckCircle2 className="h-5 w-5 text-success" />
      case "ambiguous":
        return <AlertTriangle className="h-5 w-5 text-warning" />
      case "conflict":
        return <XCircle className="h-5 w-5 text-destructive" />
      default:
        return null
    }
  }

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "clear":
        return <Badge className="bg-success/10 text-success">Clear</Badge>
      case "ambiguous":
        return <Badge className="bg-warning/10 text-warning">Ambiguous</Badge>
      case "conflict":
        return <Badge className="bg-destructive/10 text-destructive">Conflict</Badge>
      default:
        return <Badge variant="outline">Not Tested</Badge>
    }
  }

  const clearCount = scenarios.filter((s) => s.status === "clear").length
  const ambiguousCount = scenarios.filter((s) => s.status === "ambiguous").length
  const conflictCount = scenarios.filter((s) => s.status === "conflict").length

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Policy Studio</h1>
        <p className="text-muted-foreground">
          Test policies for clarity, contradictions, and missing rules before employees encounter them
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Clear Policies</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{clearCount}</div>
            <p className="text-xs text-muted-foreground">No issues found</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ambiguous</CardTitle>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{ambiguousCount}</div>
            <p className="text-xs text-muted-foreground">Needs clarification</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Conflicts</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{conflictCount}</div>
            <p className="text-xs text-muted-foreground">Requires resolution</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="testing" className="space-y-4">
        <TabsList>
          <TabsTrigger value="testing">Policy Testing</TabsTrigger>
          <TabsTrigger value="clash">Policy Clash Detection</TabsTrigger>
        </TabsList>

        {/* Policy Testing Tab */}
        <TabsContent value="testing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test Scenarios</CardTitle>
              <CardDescription>
                Run scenarios against your policy documents to check for clarity, contradictions, and missing rules
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add New Scenario */}
              <div className="flex gap-2">
                <Input
                  placeholder="Add a new test scenario (e.g., 'PTO during probation: 3-month employee requests 2 consecutive days')"
                  value={newScenario}
                  onChange={(e) => setNewScenario(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleAddScenario()
                    }
                  }}
                />
                <Button onClick={handleAddScenario} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>

              {/* Run Tests Button */}
              <div className="flex justify-end">
                <Button onClick={handleRunTests} disabled={isRunningTests || scenarios.length === 0}>
                  <Play className="h-4 w-4 mr-2" />
                  {isRunningTests ? "Running Tests..." : "Run Tests"}
                </Button>
              </div>

              {/* Scenarios List */}
              <div className="space-y-2">
                {scenarios.map((scenario) => {
                  const isExpanded = expandedScenarioId === scenario.id
                  return (
                    <Card
                      key={scenario.id}
                      className="cursor-pointer hover:bg-accent/50 transition-colors group"
                      onClick={() => setExpandedScenarioId(isExpanded ? null : scenario.id)}
                    >
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1">
                            {getStatusIcon(scenario.status)}
                            <div className="flex-1">
                              <p className="text-sm font-medium">{scenario.description}</p>
                              {scenario.details?.sectionsChecked && scenario.details.sectionsChecked.length > 0 && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Checked: {scenario.details.sectionsChecked.join(", ")}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(scenario.status)}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteScenario(scenario.id)
                              }}
                              title="Delete test scenario"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <ChevronRight
                              className={`h-4 w-4 text-muted-foreground transition-transform ${
                                isExpanded ? "rotate-90" : ""
                              }`}
                            />
                          </div>
                        </div>

                        {/* Expanded details for this scenario */}
                        {isExpanded && scenario.details && (
                          <div className="pt-3 border-t border-border/60 space-y-4">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium">Result details</p>
                              {getStatusBadge(scenario.status)}
                            </div>

                            <div>
                              <p className="text-sm font-medium mb-2">Sections Checked</p>
                              {scenario.details.sectionsChecked && scenario.details.sectionsChecked.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                  {scenario.details.sectionsChecked.map((section, i) => (
                                    <Badge key={i} variant="secondary">
                                      {section}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground">No specific sections recorded.</p>
                              )}
                            </div>

                            {scenario.status === "ambiguous" && scenario.details.issue && (
                              <div>
                                <p className="text-sm font-medium mb-2">Issue</p>
                                <p className="text-sm text-muted-foreground">{scenario.details.issue}</p>
                                {scenario.details.suggestedFix && (
                                  <div className="mt-3 p-3 bg-muted rounded-lg">
                                    <p className="text-xs font-medium mb-1">Suggested Fix</p>
                                    <p className="text-sm">{scenario.details.suggestedFix}</p>
                                  </div>
                                )}
                              </div>
                            )}

                            {scenario.status === "conflict" && scenario.details.conflictingClauses && (
                              <div>
                                <p className="text-sm font-medium mb-2">Conflict Detected</p>
                                <div className="space-y-3">
                                  <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                                    <p className="text-xs font-medium mb-1">
                                      {scenario.details.conflictingClauses.policy1}
                                    </p>
                                    <p className="text-sm">{scenario.details.conflictingClauses.clause1}</p>
                                  </div>
                                  <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                                    <p className="text-xs font-medium mb-1">
                                      {scenario.details.conflictingClauses.policy2}
                                    </p>
                                    <p className="text-sm">{scenario.details.conflictingClauses.clause2}</p>
                                  </div>
                                </div>
                                {scenario.details.suggestedFix && (
                                  <div className="mt-3 p-3 bg-muted rounded-lg">
                                    <p className="text-xs font-medium mb-1">Suggested Resolution</p>
                                    <p className="text-sm">{scenario.details.suggestedFix}</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Policy Clash Detection Tab */}
        <TabsContent value="clash" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cross-Document Policy Clash Detection</CardTitle>
              <CardDescription>
                Ask questions about policies and detect contradictions across multiple documents
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Ask a policy question (e.g., 'Are contractors eligible for dental benefits?')"
                  value={clashQuery}
                  onChange={(e) => setClashQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleCheckClash()
                    }
                  }}
                />
                <Button onClick={handleCheckClash} disabled={isCheckingClash || !clashQuery.trim()}>
                  <Search className="h-4 w-4 mr-2" />
                  {isCheckingClash ? "Checking..." : "Check"}
                </Button>
              </div>

              {/* Results */}
              <div className="space-y-4">
                {clashResults.length > 0 && clashResults[0] && (
                  <Card key={clashResults[0].id}>
                    <CardContent className="p-4 space-y-4">
                      <div>
                        <p className="text-sm font-medium mb-2">Query</p>
                        <p className="text-sm text-muted-foreground">{clashResults[0].query}</p>
                      </div>

                      <div>
                        <p className="text-sm font-medium mb-2">Policies Checked</p>
                        {clashResults[0].policiesChecked && clashResults[0].policiesChecked.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {clashResults[0].policiesChecked.map((policy, i) => (
                              <Badge key={i} variant="secondary">
                                {policy}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No policies listed in response</p>
                        )}
                      </div>

                      <div>
                        <p className="text-sm font-medium mb-2">Answer</p>
                        <div className="p-4 bg-muted rounded-lg">
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
                              {clashResults[0].answer}
                            </ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {clashResults.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No clash checks yet. Ask a policy question above to get started.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

