"use client"

import { useState } from "react"
import { Settings, FileText, Database, Shield, Plus, Edit, Eye, Check } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import { useRole } from "@/lib/role-context"
import { policies } from "@/lib/mock-data"
import { redirect } from "next/navigation"

const dataConnectors = [
  { id: "hris", name: "HRIS System", status: "connected", lastSync: "2 min ago" },
  { id: "payroll", name: "Payroll", status: "connected", lastSync: "1 hour ago" },
  { id: "ats", name: "ATS (Recruiting)", status: "disconnected", lastSync: "Never" },
  { id: "documents", name: "Document Storage", status: "connected", lastSync: "5 min ago" },
  { id: "wiki", name: "Company Wiki", status: "connected", lastSync: "30 min ago" },
]

const permissionsMatrix = [
  { dataType: "Personal Profile", employee: true, manager: true, hrAdmin: true },
  { dataType: "Team Profiles", employee: false, manager: true, hrAdmin: true },
  { dataType: "Salary Data", employee: false, manager: false, hrAdmin: true },
  { dataType: "Performance Reviews", employee: true, manager: true, hrAdmin: true },
  { dataType: "Medical Records", employee: false, manager: false, hrAdmin: true },
  { dataType: "Audit Logs", employee: false, manager: false, hrAdmin: true },
]

const dataClassifications = [
  { type: "PII", description: "Personally Identifiable Information", masked: true },
  { type: "Salary", description: "Compensation data", masked: true },
  { type: "Medical", description: "Health-related information", masked: true },
  { type: "Performance", description: "Review notes and ratings", masked: false },
]

export default function AdminConsolePage() {
  const { role } = useRole()
  const [testQuery, setTestQuery] = useState("")

  if (role !== "hr-admin") {
    redirect("/")
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Admin Console</h1>
        <p className="text-muted-foreground">Manage policies, data sources, and AI safety settings</p>
      </div>

      <Tabs defaultValue="policies" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
          <TabsTrigger value="policies" className="gap-2">
            <FileText className="h-4 w-4" />
            Policy Studio
          </TabsTrigger>
          <TabsTrigger value="access" className="gap-2">
            <Database className="h-4 w-4" />
            Access & Data
          </TabsTrigger>
          <TabsTrigger value="safety" className="gap-2">
            <Shield className="h-4 w-4" />
            Safety & Guardrails
          </TabsTrigger>
        </TabsList>

        {/* Policy Studio Tab */}
        <TabsContent value="policies" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Policy Management</h2>
              <p className="text-sm text-muted-foreground">Create, edit, and test HR policies</p>
            </div>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Policy
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Policy</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {policies.map((policy) => (
                    <TableRow key={policy.id}>
                      <TableCell className="font-medium">{policy.title}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{policy.category}</Badge>
                      </TableCell>
                      <TableCell>v{policy.version}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(policy.lastUpdated).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Policy Test Sandbox */}
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="text-base">Test Policy with Copilot</CardTitle>
              <CardDescription>See how the AI interprets and cites your policies</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Enter a test question, e.g., 'How many vacation days can I carry over?'"
                value={testQuery}
                onChange={(e) => setTestQuery(e.target.value)}
              />
              <Button className="gap-2">
                <Settings className="h-4 w-4" />
                Test Query
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Access & Data Tab */}
        <TabsContent value="access" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Data Connectors */}
            <Card>
              <CardHeader>
                <CardTitle>Data Connectors</CardTitle>
                <CardDescription>Connected data sources for AI</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dataConnectors.map((connector) => (
                    <div key={connector.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-2 w-2 rounded-full ${connector.status === "connected" ? "bg-success" : "bg-muted"}`}
                        />
                        <div>
                          <p className="font-medium">{connector.name}</p>
                          <p className="text-xs text-muted-foreground">Last sync: {connector.lastSync}</p>
                        </div>
                      </div>
                      <Switch checked={connector.status === "connected"} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Data Classification */}
            <Card>
              <CardHeader>
                <CardTitle>Data Classification</CardTitle>
                <CardDescription>Control how sensitive data is handled</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dataClassifications.map((classification) => (
                    <div key={classification.type} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{classification.type}</p>
                        <p className="text-xs text-muted-foreground">{classification.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs">Mask by default</Label>
                        <Switch checked={classification.masked} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Permissions Matrix */}
          <Card>
            <CardHeader>
              <CardTitle>Role-Based Permissions</CardTitle>
              <CardDescription>Control data access by role</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data Type</TableHead>
                    <TableHead className="text-center">Employee</TableHead>
                    <TableHead className="text-center">Manager</TableHead>
                    <TableHead className="text-center">HR Admin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {permissionsMatrix.map((row) => (
                    <TableRow key={row.dataType}>
                      <TableCell className="font-medium">{row.dataType}</TableCell>
                      <TableCell className="text-center">
                        {row.employee ? (
                          <Check className="h-4 w-4 text-success mx-auto" />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {row.manager ? (
                          <Check className="h-4 w-4 text-success mx-auto" />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {row.hrAdmin ? (
                          <Check className="h-4 w-4 text-success mx-auto" />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Safety & Guardrails Tab */}
        <TabsContent value="safety" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Topic Controls */}
            <Card>
              <CardHeader>
                <CardTitle>Topic Controls</CardTitle>
                <CardDescription>Manage allowed and blocked topics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Allowed Topics</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge variant="secondary">Time off policies</Badge>
                    <Badge variant="secondary">Benefits information</Badge>
                    <Badge variant="secondary">Performance reviews</Badge>
                    <Badge variant="secondary">Company policies</Badge>
                    <Badge variant="secondary">Document summaries</Badge>
                  </div>
                </div>
                <Separator />
                <div>
                  <Label className="text-sm font-medium">Blocked Topics</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge variant="destructive">Salary comparisons</Badge>
                    <Badge variant="destructive">Termination predictions</Badge>
                    <Badge variant="destructive">Medical diagnoses</Badge>
                    <Badge variant="destructive">Legal advice</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Redaction Preview */}
            <Card>
              <CardHeader>
                <CardTitle>Redaction Preview</CardTitle>
                <CardDescription>See how sensitive data is masked</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-muted font-mono text-sm">
                  <p>
                    <span className="text-muted-foreground">Name:</span> Sarah Chen
                  </p>
                  <p>
                    <span className="text-muted-foreground">Email:</span> s***@company.com
                  </p>
                  <p>
                    <span className="text-muted-foreground">Salary:</span>{" "}
                    <span className="bg-destructive/20 text-destructive px-1 rounded">REDACTED</span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">SSN:</span>{" "}
                    <span className="bg-destructive/20 text-destructive px-1 rounded">REDACTED</span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Department:</span> Engineering
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Shield className="h-3 w-3" />
                  <span>Redaction rules applied based on role and data classification</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Safety Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Global Safety Settings</CardTitle>
              <CardDescription>Configure AI behavior and restrictions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Require citations for all answers</p>
                    <p className="text-sm text-muted-foreground">AI must cite sources for every response</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Log all AI interactions</p>
                    <p className="text-sm text-muted-foreground">Record queries and responses in audit log</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Block unauthorized data access</p>
                    <p className="text-sm text-muted-foreground">
                      Prevent AI from accessing data outside user permissions
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Show confidence indicators</p>
                    <p className="text-sm text-muted-foreground">Display confidence level for AI responses</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
