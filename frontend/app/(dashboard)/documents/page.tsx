"use client"

import { useState, useRef, useEffect } from "react"
import { Search, Filter, FileText, Download, Eye, Sparkles, Upload, X, Loader2, CheckCircle2, XCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { documents as initialDocuments, type Document } from "@/lib/mock-data"
import { useRole } from "@/lib/role-context"

const documentTypes = ["All", "Contract", "Payslip", "Performance", "Benefits", "Certificate"]
const uploadDocumentTypes = ["Contract", "Payslip", "Performance", "Benefits", "Certificate"]

export default function DocumentsPage() {
  const { currentUser } = useRole()
  const [documents, setDocuments] = useState<Document[]>([])
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("All")
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null)
  const [docQuestion, setDocQuestion] = useState("")
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [documentType, setDocumentType] = useState<string>("")
  const [tags, setTags] = useState<string>("")
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<{ type: "success" | "error" | null; message: string }>({ type: null, message: "" })
  const fileInputRef = useRef<HTMLInputElement>(null)
  // Store file data (object URLs) for each document
  const [documentFiles, setDocumentFiles] = useState<Map<string, { file: File; url: string }>>(new Map())
  const documentFilesRef = useRef<Map<string, { file: File; url: string }>>(new Map())

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(search.toLowerCase()) ||
      doc.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
    const matchesType = typeFilter === "All" || doc.type === typeFilter
    return matchesSearch && matchesType
  })

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile || !documentType) {
      return
    }

    setIsUploading(true)
    setUploadStatus({ type: null, message: "" })

    try {
      // Read file as ArrayBuffer to get bytes
      const fileBytes = await selectedFile.arrayBuffer()
      
      // Convert ArrayBuffer to base64 for JSON transmission
      // Or we can use FormData for binary transmission
      const bytesArray = Array.from(new Uint8Array(fileBytes))

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"

      const response = await fetch(`${backendUrl}/upload_file`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employee_id: currentUser.id,
          employee_name: currentUser.name,
          filename: selectedFile.name,
          file_bytes: bytesArray, // Array of bytes (0-255)
        }),
      })

      const result = await response.json()

      // Check response status code
      const statusCode = result.response?.status_code || (response.ok ? 200 : response.status)
      const message = result.response?.message || result.message || "Upload completed"

      if (statusCode === 200) {
        // Success - show success message
        setUploadStatus({ type: "success", message })

        // Parse tags (comma-separated or space-separated)
        const parsedTags = tags
          .split(/[,\s]+/)
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0)

        // Generate document ID
        const newId = `doc-${String(documents.length + 1).padStart(3, "0")}`

        // Get current date/time in user-readable format
        const now = new Date()
        const uploadDate = now.toISOString()

        // Create object URL for the file
        const fileUrl = URL.createObjectURL(selectedFile)

        // Create new document
        const newDocument: Document = {
          id: newId,
          title: selectedFile.name.replace(/\.[^/.]+$/, ""), // Remove file extension
          type: documentType,
          uploadDate: uploadDate,
          tags: parsedTags.length > 0 ? parsedTags : ["general"],
          userId: currentUser.id,
          aiSummary: `Uploaded ${documentType.toLowerCase()} document: ${selectedFile.name}. ${parsedTags.length > 0 ? `Tagged with: ${parsedTags.join(", ")}.` : ""}`,
          keyFields: {
            "File Name": selectedFile.name,
            "File Size": `${(selectedFile.size / 1024).toFixed(2)} KB`,
            "Upload Date": now.toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            }),
            "Upload Time": now.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            }),
          },
        }

        // Store file data
        setDocumentFiles((prev) => {
          const newMap = new Map(prev)
          newMap.set(newId, { file: selectedFile, url: fileUrl })
          documentFilesRef.current = newMap
          return newMap
        })

        // Add to documents list
        setDocuments([newDocument, ...documents])

        // Reset form after a short delay to show success message
        setTimeout(() => {
          setSelectedFile(null)
          setDocumentType("")
          setTags("")
          setUploadStatus({ type: null, message: "" })
          if (fileInputRef.current) {
            fileInputRef.current.value = ""
          }
          setUploadDialogOpen(false)
        }, 2000)
      } else {
        // Error - show error message
        setUploadStatus({ type: "error", message })
      }
    } catch (error) {
      console.error("Upload error:", error)
      setUploadStatus({
        type: "error",
        message: `Upload failed. Please try again. ${error instanceof Error ? error.message : ""}`,
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleCloseUploadDialog = () => {
    setUploadDialogOpen(false)
    setSelectedFile(null)
    setDocumentType("")
    setTags("")
    setUploadStatus({ type: null, message: "" })
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleDownload = (doc: Document) => {
    const fileData = documentFiles.get(doc.id)
    if (fileData) {
      const link = document.createElement("a")
      link.href = fileData.url
      link.download = fileData.file.name
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } else {
      // Fallback: create a download from the file name in keyFields
      const fileName = doc.keyFields["File Name"] || `${doc.title}.pdf`
      // Create a simple text file as fallback
      const blob = new Blob([`Document: ${doc.title}\nType: ${doc.type}\nUploaded: ${doc.uploadDate}`], {
        type: "text/plain",
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    }
  }

  const getFilePreviewUrl = (doc: Document): string | null => {
    const fileData = documentFiles.get(doc.id)
    return fileData?.url || null
  }

  const isImageFile = (fileName: string): boolean => {
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName)
  }

  const isPdfFile = (fileName: string): boolean => {
    return /\.pdf$/i.test(fileName)
  }

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      // Cleanup all object URLs when component unmounts
      documentFilesRef.current.forEach(({ url }) => {
        URL.revokeObjectURL(url)
      })
    }
  }, [])

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
          <p className="text-muted-foreground">Your HR documents with AI-powered summaries and insights</p>
        </div>
        <Button className="gap-2" onClick={() => setUploadDialogOpen(true)}>
          <Upload className="h-4 w-4" />
          Upload Document
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search documents..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                {documentTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Documents Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    {documents.length === 0
                      ? "No documents uploaded yet. Click 'Upload Document' to get started."
                      : "No documents match your search or filter criteria."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredDocs.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{doc.title}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">{doc.aiSummary}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{doc.type}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(doc.uploadDate).toLocaleString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {doc.tags.slice(0, 2).map((tag, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {doc.tags.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{doc.tags.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => setSelectedDoc(doc)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDownload(doc)}>
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Document Viewer Sheet */}
      <Sheet open={!!selectedDoc} onOpenChange={() => setSelectedDoc(null)}>
        <SheetContent className="w-full sm:max-w-xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {selectedDoc?.title}
            </SheetTitle>
            <SheetDescription>
              Uploaded on{" "}
              {selectedDoc &&
                new Date(selectedDoc.uploadDate).toLocaleString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
            </SheetDescription>
          </SheetHeader>

          <Tabs defaultValue="summary" className="mt-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="preview">Preview</TabsTrigger>
              <TabsTrigger value="summary">AI Summary</TabsTrigger>
              <TabsTrigger value="fields">Key Fields</TabsTrigger>
              <TabsTrigger value="qa">Q&A</TabsTrigger>
            </TabsList>

            <TabsContent value="preview" className="mt-4">
              <Card>
                <CardContent className="pt-6">
                  {selectedDoc && (() => {
                    const previewUrl = getFilePreviewUrl(selectedDoc)
                    const fileName = selectedDoc.keyFields["File Name"] || `${selectedDoc.title}.pdf`
                    
                    if (!previewUrl) {
                      return (
                        <div className="aspect-[3/4] bg-muted rounded-lg flex items-center justify-center">
                          <div className="text-center text-muted-foreground">
                            <FileText className="h-12 w-12 mx-auto mb-2" />
                            <p>Document preview unavailable</p>
                            <p className="text-xs">File data not available</p>
                          </div>
                        </div>
                      )
                    }

                    if (isImageFile(fileName)) {
                      return (
                        <div className="rounded-lg overflow-hidden border">
                          <img
                            src={previewUrl}
                            alt={selectedDoc.title}
                            className="w-full h-auto max-h-[600px] object-contain"
                          />
                        </div>
                      )
                    }

                    if (isPdfFile(fileName)) {
                      return (
                        <div className="aspect-[3/4] bg-muted rounded-lg overflow-hidden border">
                          <iframe
                            src={previewUrl}
                            className="w-full h-full min-h-[600px]"
                            title={selectedDoc.title}
                          />
                        </div>
                      )
                    }

                    // For other file types, show a download option
                    return (
                      <div className="aspect-[3/4] bg-muted rounded-lg flex items-center justify-center">
                        <div className="text-center text-muted-foreground space-y-4">
                          <FileText className="h-12 w-12 mx-auto" />
                          <div>
                            <p className="font-medium mb-2">Preview not available</p>
                            <p className="text-xs mb-4">This file type cannot be previewed in the browser</p>
                            <Button onClick={() => handleDownload(selectedDoc)} variant="outline" size="sm">
                              <Download className="h-4 w-4 mr-2" />
                              Download to view
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })()}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="summary" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    AI-Generated Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed">{selectedDoc?.aiSummary}</p>
                  <Separator className="my-4" />
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline">Document</Badge>
                    <span>Source: {selectedDoc?.title}</span>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="fields" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Extracted Key Fields</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {selectedDoc &&
                      Object.entries(selectedDoc.keyFields).map(([key, value]) => (
                        <div key={key} className="flex justify-between items-center py-2 border-b last:border-0">
                          <span className="text-sm text-muted-foreground">{key}</span>
                          <span className="text-sm font-medium">{value}</span>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="qa" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Ask about this document
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    placeholder="e.g., What are the key terms in this contract?"
                    value={docQuestion}
                    onChange={(e) => setDocQuestion(e.target.value)}
                  />
                  <Button className="w-full gap-2">
                    <Sparkles className="h-4 w-4" />
                    Ask Question
                  </Button>
                  <div className="text-xs text-muted-foreground text-center">
                    Questions will be answered using only this document as context
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      {/* Upload Document Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>
              Upload a new HR document. Please select the document type and add relevant tags.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* File Upload */}
            <div className="space-y-2">
              <Label htmlFor="file-upload">Document File</Label>
              <div className="flex items-center gap-4">
                <Input
                  id="file-upload"
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                  className="cursor-pointer"
                />
              </div>
              {selectedFile && (
                <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm flex-1 truncate">{selectedFile.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => {
                      setSelectedFile(null)
                      if (fileInputRef.current) {
                        fileInputRef.current.value = ""
                      }
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>

            {/* Document Type */}
            <div className="space-y-2">
              <Label htmlFor="document-type">Document Type *</Label>
              <Select value={documentType} onValueChange={setDocumentType}>
                <SelectTrigger id="document-type">
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  {uploadDocumentTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                placeholder="Enter tags separated by commas (e.g., legal, employment, contract)"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Separate multiple tags with commas or spaces
              </p>
            </div>

            {/* Upload Date Preview */}
            <div className="space-y-2">
              <Label>Upload Date & Time</Label>
              <div className="p-3 bg-muted rounded-md text-sm">
                {new Date().toLocaleString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>

            {/* Upload Status Feedback */}
            {isUploading && (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-sm">Uploading document...</span>
              </div>
            )}

            {uploadStatus.type === "success" && !isUploading && (
              <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-md border border-green-200 dark:border-green-800">
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                <span className="text-sm text-green-700 dark:text-green-300">{uploadStatus.message}</span>
              </div>
            )}

            {uploadStatus.type === "error" && !isUploading && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950 rounded-md border border-red-200 dark:border-red-800">
                <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <span className="text-sm text-red-700 dark:text-red-300">{uploadStatus.message}</span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseUploadDialog} disabled={isUploading}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={!selectedFile || !documentType || isUploading}>
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
