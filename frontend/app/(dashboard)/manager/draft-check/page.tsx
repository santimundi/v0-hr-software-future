"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { FileText, Upload, CheckCircle2, AlertTriangle, FileCheck, Loader2, Maximize2, Minimize2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Label } from "@/components/ui/label"
import { useRole } from "@/lib/role-context"
import * as Utils from "@/lib/utils"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeRaw from "rehype-raw"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { readFileContent, isSupportedFileType } from "@/lib/file-reader"

export default function DraftCheckPage() {
  const { role, currentUser } = useRole()
  const router = useRouter()
  const [text, setText] = useState("")
  const [llmResponse, setLlmResponse] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isReadingFile, setIsReadingFile] = useState(false)

  // Ensure only managers and HR admins can access this page
  useEffect(() => {
    if (role !== "manager" && role !== "hr-admin") {
      router.push("/")
    }
  }, [role, router])

  if (role !== "manager" && role !== "hr-admin") {
    return null
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!isSupportedFileType(file)) {
      toast.error("Only PDF and text files are supported")
      return
    }

    setIsReadingFile(true)
    setUploadedFile(file)

    try {
      const content = await readFileContent(file)
      setText(content)
      toast.success("File content extracted successfully")
    } catch (error: any) {
      toast.error(error.message || "Failed to read file")
      setUploadedFile(null)
    } finally {
      setIsReadingFile(false)
    }
  }

  const handleCheck = async () => {
    if (!text.trim()) {
      toast.error("Please enter or paste text to check")
      return
    }

    setIsAnalyzing(true)
    setLlmResponse(null)

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"
      const employeeId = Utils.normalizeEmployeeId(currentUser.id)

      // Create query with preamble
      const query = `Below is a draft of a document, I want you to check this draft against HR guidance and policies to make sure it aligns.\n\n${text.trim()}`

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
        setLlmResponse(data.data)
        toast.success("Analysis complete")
      } else {
        throw new Error("Unexpected response format from backend")
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to analyze draft. Please try again.")
      setLlmResponse(`Error: ${error.message || "Failed to get response. Please try again."}`)
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">HR Draft Check</h1>
        <p className="text-muted-foreground">Analyze HR documents for clarity, policy compliance, and risk</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input Section */}
        <Card className="bg-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Document Input
            </CardTitle>
            <CardDescription>Upload a document or paste text to analyze</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="document-text">Paste Document Text</Label>
              <Textarea
                id="document-text"
                placeholder="Paste your HR document text here or upload a file..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="min-h-[500px]"
                disabled={isReadingFile}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept=".pdf,.txt,.md"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                  disabled={isReadingFile}
                />
                <Button variant="outline" asChild className="flex-1" disabled={isReadingFile}>
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="h-4 w-4 mr-2" />
                    {isReadingFile ? "Reading file..." : uploadedFile ? uploadedFile.name : "Upload File"}
                  </label>
                </Button>
              </div>
              <Button onClick={handleCheck} disabled={isAnalyzing || !text.trim() || isReadingFile} className="w-full">
                <FileCheck className="h-4 w-4 mr-2" />
                {isAnalyzing ? "Analyzing..." : "Check Draft"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        <Card className="bg-card border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  Analysis Results
                </CardTitle>
                <CardDescription>Review policy compliance and suggestions</CardDescription>
              </div>
              {llmResponse && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsFullscreen(true)}
                  className="ml-4"
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isAnalyzing ? (
              <div className="text-center py-12 text-muted-foreground">
                <Loader2 className="h-12 w-12 mx-auto mb-4 opacity-50 animate-spin" />
                <p>Analyzing draft against HR policies...</p>
              </div>
            ) : !llmResponse ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Enter text and click "Check Draft" to analyze</p>
              </div>
            ) : (
              <ScrollArea className="h-[500px] pr-4">
                <AnalysisContent content={llmResponse} />
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Fullscreen Dialog */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent
          className={`flex flex-col p-0 ${
            isFullscreen
              ? "!max-w-[95vw] sm:!max-w-[95vw] w-[95vw] !max-h-[95vh] h-[95vh] top-[2.5vh] left-[2.5vw] !translate-x-0 !translate-y-0 rounded-lg"
              : "max-w-6xl w-[90vw] max-h-[70vh] h-[70vh]"
          } transition-all duration-200`}
        >
          <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <DialogTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  Analysis Results
                </DialogTitle>
                <DialogDescription>
                  Review policy compliance and suggestions from AI assistant
                </DialogDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsFullscreen(false)}
                className="ml-4"
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-hidden min-h-0 flex flex-col">
            {llmResponse && (
              <ScrollArea className="flex-1 pr-4">
                <div className="p-6">
                  <AnalysisContent content={llmResponse} />
                </div>
              </ScrollArea>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Reusable component for rendering analysis content
function AnalysisContent({ content }: { content: string }) {
  return (
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
        {content}
      </ReactMarkdown>
    </div>
  )
}

