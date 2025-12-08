"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { UserPlus, Download, FileText, Sparkles, Loader2, CheckCircle2, AlertCircle, Eye, Mail, ExternalLink } from "lucide-react"
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
import * as Utils from "@/lib/utils"

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

interface DocumentLink {
  url: string
  filename: string
}

export default function OnboardingPage() {
  const { role, currentUser } = useRole()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [documentLinks, setDocumentLinks] = useState<DocumentLink[]>([])
  const [isSendingEmail, setIsSendingEmail] = useState(false)
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

  useEffect(() => {
    if (role !== "hr-admin") {
      router.push("/")
    }
  }, [role, router])

  if (role !== "hr-admin") {
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
    setDocumentLinks([])

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"
      const employeeId = Utils.normalizeEmployeeId(currentUser.id)

      // Build the query for onboarding
      const query = `Onboard a new employee with the following details:
- Name: ${formData.firstName} ${formData.lastName}
- Email: ${formData.email}
- Phone: ${formData.phone || "Not provided"}
- Job Title: ${formData.jobTitle}
- Department: ${formData.department || "Not provided"}
- Start Date: ${formData.startDate}
- Contract Type: ${formData.contractType}
- Salary: ${formData.salary || "Not provided"}
- Manager: ${formData.manager || "Not provided"}
- Additional Notes: ${formData.additionalNotes || "None"}`

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
      
      // Extract signed URLs from the response
      // The backend returns signed_urls in the response for onboarding_documents type
      if (data.type === "onboarding_documents" && data.signed_urls && Array.isArray(data.signed_urls)) {
        // Extract filenames from URLs or use default names
        const documentNames = [
          "Employment Contract",
          "NDA",
          "Background Check Consent",
          "Payment Enrollment Form",
          "Benefits Enrollment Form",
          "Personal Data Form"
        ]
        
        const links: DocumentLink[] = data.signed_urls.map((url: string, index: number) => {
          // Use predefined document names based on order
          // The backend generates documents in a specific order matching this array
          return {
            url: url,
            filename: documentNames[index] || `Document ${index + 1}`
          }
        })
        
        setDocumentLinks(links)
        toast.success("Documents generated successfully!", {
          icon: <CheckCircle2 className="h-4 w-4" />,
        })
      } else {
        throw new Error("Invalid response format from backend")
      }
    } catch (error: any) {
      console.error("Error generating documents:", error)
      toast.error(error.message || "Failed to generate documents. Please try again.", {
        icon: <AlertCircle className="h-4 w-4" />,
      })
    } finally {
      setLoading(false)
    }
  }

  const handlePreviewDocument = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const handleDownloadDocument = (link: DocumentLink) => {
    const a = document.createElement("a")
    a.href = link.url
    a.download = link.filename
    a.target = "_blank"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    toast.success(`Downloaded ${link.filename}`)
  }

  const handleSendLinksToEmail = async () => {
    if (!formData.email || documentLinks.length === 0) {
      toast.error("Email address is required to send links")
      return
    }

    setIsSendingEmail(true)
    try {
      // TODO: Implement email sending API endpoint
      // For now, just show a success message
      await new Promise(resolve => setTimeout(resolve, 1000))
      toast.success("Document links sent to email successfully!", {
        icon: <Mail className="h-4 w-4" />,
      })
    } catch (error) {
      console.error("Error sending email:", error)
      toast.error("Failed to send email. Please try again.", {
        icon: <AlertCircle className="h-4 w-4" />,
      })
    } finally {
      setIsSendingEmail(false)
    }
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
                <CardDescription>Preview and download generated onboarding documents</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">AI is generating your documents...</p>
              </div>
            ) : documentLinks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <FileText className="h-12 w-12 text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground text-center">
                  Fill in the employee information and click "Generate Onboarding Documents" to create contracts and
                  onboarding materials.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {documentLinks.map((link, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <FileText className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{link.filename}</p>
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 mt-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                            View link
                          </a>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePreviewDocument(link.url)}
                          title="Preview document"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadDocument(link)}
                          title="Download document"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <Separator />
                <Button
                  onClick={handleSendLinksToEmail}
                  disabled={isSendingEmail}
                  className="w-full"
                  variant="default"
                >
                  {isSendingEmail ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Send Links to Email
                    </>
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

