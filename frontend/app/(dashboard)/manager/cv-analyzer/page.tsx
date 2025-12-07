"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { FileText, Upload, User, CheckCircle2, AlertCircle, Lightbulb, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useRole } from "@/lib/role-context"
import { readFileContent, isSupportedFileType } from "@/lib/file-reader"
import * as Utils from "@/lib/utils"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeRaw from "rehype-raw"

export default function CVAnalyzerPage() {
  const { role, currentUser } = useRole()
  const router = useRouter()

  useEffect(() => {
    if (role !== "manager" && role !== "hr-admin") {
      router.push("/")
    }
  }, [role, router])

  if (role !== "manager" && role !== "hr-admin") {
    return null
  }
  const [file, setFile] = useState<File | null>(null)
  const [cvContent, setCvContent] = useState<string>("")
  const [instructions, setInstructions] = useState("")
  const [analysisResponse, setAnalysisResponse] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isReadingFile, setIsReadingFile] = useState(false)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    if (!isSupportedFileType(selectedFile)) {
      toast.error("Only PDF and text files are supported")
      return
    }

    setIsReadingFile(true)
    setFile(selectedFile)

    try {
      const content = await readFileContent(selectedFile)
      setCvContent(content)
      toast.success("CV content extracted successfully")
    } catch (error: any) {
      toast.error(error.message || "Failed to read CV file")
      setFile(null)
      setCvContent("")
    } finally {
      setIsReadingFile(false)
    }
  }

  const handleAnalyze = async () => {
    if (!file || !cvContent) {
      toast.error("Please upload a CV file")
      return
    }

    setIsAnalyzing(true)
    setAnalysisResponse(null)

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"
      const employeeId = Utils.normalizeEmployeeId(currentUser.id)

      // Build query with preamble
      let query = "Below is a CV I would like to analyze."
      if (instructions.trim()) {
        query += ` I want you to also consider the following: ${instructions.trim()}`
      }
      query += `\n\n${cvContent}`

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

      if (data.type === "final" && data.data) {
        setAnalysisResponse(data.data)
        toast.success("CV analysis complete")
      } else {
        throw new Error("Unexpected response format from backend")
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to analyze CV. Please try again.")
      setAnalysisResponse(`Error: ${error.message || "Failed to get response. Please try again."}`)
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">CV Analyzer</h1>
        <p className="text-muted-foreground">Upload and analyze candidate CVs for insights and interview preparation</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Upload Section */}
        <Card className="bg-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload CV
            </CardTitle>
            <CardDescription>Upload a candidate's CV for analysis</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-4">
                {file ? file.name : "No file selected"}
              </p>
              <input
                type="file"
                accept=".pdf,.txt,.md"
                onChange={handleFileChange}
                className="hidden"
                id="cv-upload"
                disabled={isReadingFile}
              />
              <Button variant="outline" asChild disabled={isReadingFile}>
                <label htmlFor="cv-upload" className="cursor-pointer">
                  <Upload className="h-4 w-4 mr-2" />
                  {isReadingFile ? "Reading file..." : file ? file.name : "Choose File"}
                </label>
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="instructions">Analysis Instructions (Optional)</Label>
              <Textarea
                id="instructions"
                placeholder="Enter specific instructions for the CV analysis (e.g., 'Focus on technical skills', 'Check for leadership experience', 'Analyze cultural fit')..."
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                className="min-h-[100px]"
                disabled={isReadingFile}
              />
            </div>
            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing || !file || !cvContent || isReadingFile}
              className="w-full"
            >
              {isAnalyzing ? "Analyzing..." : "Analyze CV"}
            </Button>
          </CardContent>
        </Card>

        {/* Results Section */}
        <div className="lg:col-span-2">
          {isAnalyzing ? (
            <Card className="bg-card border-border/50">
              <CardContent className="py-12 text-center text-muted-foreground">
                <Loader2 className="h-12 w-12 mx-auto mb-4 opacity-50 animate-spin" />
                <p>Analyzing CV...</p>
              </CardContent>
            </Card>
          ) : !analysisResponse ? (
            <Card className="bg-card border-border/50">
              <CardContent className="py-12 text-center text-muted-foreground">
                <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Upload a CV and click "Analyze CV" to get started</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-card border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  CV Analysis Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px] pr-4">
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
                      {analysisResponse}
                    </ReactMarkdown>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

