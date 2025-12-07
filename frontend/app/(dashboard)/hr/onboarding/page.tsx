"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { UserPlus, Download, FileText, Sparkles, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useRole } from "@/lib/role-context"
import { toast } from "sonner"
import { Separator } from "@/components/ui/separator"

interface EmployeeFormData {
  firstName: string
  lastName: string
  email: string
  phone: string
  jobTitle: string
  department: string
  startDate: string
  salary: string
  contractType: "full-time" | "part-time" | "contract"
  manager: string
  additionalNotes: string
}

interface GeneratedDocument {
  name: string
  content: string
  type: "contract" | "offer-letter" | "nda" | "handbook" | "other"
}

export default function OnboardingPage() {
  const { role } = useRole()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [generatedDocuments, setGeneratedDocuments] = useState<GeneratedDocument[]>([])
  const [formData, setFormData] = useState<EmployeeFormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    jobTitle: "",
    department: "",
    startDate: "",
    salary: "",
    contractType: "full-time",
    manager: "",
    additionalNotes: "",
  })

  if (role !== "hr-admin") {
    router.push("/")
    return null
  }

  const handleInputChange = (field: keyof EmployeeFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleGenerateDocuments = async () => {
    // Validate required fields
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.jobTitle || !formData.startDate) {
      toast.error("Please fill in all required fields", {
        icon: <AlertCircle className="h-4 w-4" />,
      })
      return
    }

    setLoading(true)
    setGeneratedDocuments([])

    try {
      const response = await fetch("/api/onboarding/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error("Failed to generate documents")
      }

      const data = await response.json()
      setGeneratedDocuments(data.documents || [])
      toast.success("Documents generated successfully!", {
        icon: <CheckCircle2 className="h-4 w-4" />,
      })
    } catch (error) {
      console.error("Error generating documents:", error)
      toast.error("Failed to generate documents. Please try again.", {
        icon: <AlertCircle className="h-4 w-4" />,
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadDocument = (document: GeneratedDocument) => {
    const blob = new Blob([document.content], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${document.name}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success(`Downloaded ${document.name}`)
  }

  const handleDownloadAll = () => {
    generatedDocuments.forEach((doc) => {
      setTimeout(() => handleDownloadDocument(doc), 100)
    })
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Employee Onboarding</h1>
        <p className="text-muted-foreground">Generate contracts and onboarding documents with AI assistance</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Employee Information Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Employee Information
            </CardTitle>
            <CardDescription>Enter details about the new employee</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">
                  First Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange("firstName", e.target.value)}
                  placeholder="John"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">
                  Last Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange("lastName", e.target.value)}
                  placeholder="Doe"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="john.doe@company.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="jobTitle">
                  Job Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="jobTitle"
                  value={formData.jobTitle}
                  onChange={(e) => handleInputChange("jobTitle", e.target.value)}
                  placeholder="Software Engineer"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(e) => handleInputChange("department", e.target.value)}
                  placeholder="Engineering"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startDate">
                  Start Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleInputChange("startDate", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contractType">Contract Type</Label>
                <Select value={formData.contractType} onValueChange={(value) => handleInputChange("contractType", value as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full-time">Full-time</SelectItem>
                    <SelectItem value="part-time">Part-time</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="salary">Salary</Label>
                <Input
                  id="salary"
                  value={formData.salary}
                  onChange={(e) => handleInputChange("salary", e.target.value)}
                  placeholder="$100,000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manager">Manager</Label>
                <Input
                  id="manager"
                  value={formData.manager}
                  onChange={(e) => handleInputChange("manager", e.target.value)}
                  placeholder="Alex Rivera"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="additionalNotes">Additional Notes</Label>
              <Textarea
                id="additionalNotes"
                value={formData.additionalNotes}
                onChange={(e) => handleInputChange("additionalNotes", e.target.value)}
                placeholder="Any additional information or special requirements..."
                className="min-h-[100px]"
              />
            </div>

            <Button
              onClick={handleGenerateDocuments}
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating Documents...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Onboarding Documents
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Generated Documents */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Generated Documents
                </CardTitle>
                <CardDescription>Download individual documents or all at once</CardDescription>
              </div>
              {generatedDocuments.length > 0 && (
                <Button variant="outline" size="sm" onClick={handleDownloadAll}>
                  <Download className="h-4 w-4 mr-2" />
                  Download All
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">AI is generating your documents...</p>
              </div>
            ) : generatedDocuments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <FileText className="h-12 w-12 text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground text-center">
                  Fill in the employee information and click "Generate Onboarding Documents" to create contracts and
                  onboarding materials.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {generatedDocuments.map((document, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{document.name}</p>
                        <Badge variant="secondary" className="text-xs mt-1">
                          {document.type}
                        </Badge>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleDownloadDocument(document)}>
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

