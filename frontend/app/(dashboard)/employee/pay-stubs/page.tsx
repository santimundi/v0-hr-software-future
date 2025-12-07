"use client"

import { useState } from "react"
import { Download, Eye, FileText, Calendar } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useRole } from "@/lib/role-context"
import * as MockData from "@/lib/mock-data"
import { toast } from "sonner"

const mockPayStubs = [
  {
    id: "ps-001",
    period: "November 2024",
    payDate: "2024-11-15",
    grossPay: 10416.67,
    netPay: 7825.00,
    status: "paid",
  },
  {
    id: "ps-002",
    period: "October 2024",
    payDate: "2024-10-15",
    grossPay: 10416.67,
    netPay: 7825.00,
    status: "paid",
  },
  {
    id: "ps-003",
    period: "September 2024",
    payDate: "2024-09-15",
    grossPay: 10416.67,
    netPay: 7825.00,
    status: "paid",
  },
]

export default function PayStubsPage() {
  const { currentUser } = useRole()

  const handleDownload = (payStub: typeof mockPayStubs[0]) => {
    toast.success(`Downloading ${payStub.period} pay stub...`)
    // Simulate download
    setTimeout(() => {
      toast.success("Pay stub downloaded successfully")
    }, 1000)
  }

  const handleView = (payStub: typeof mockPayStubs[0]) => {
    toast.info(`Opening ${payStub.period} pay stub...`)
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Pay Stubs</h1>
        <p className="text-muted-foreground">View and download your pay stubs</p>
      </div>

      <div className="grid gap-4">
        {mockPayStubs.map((payStub) => (
          <Card key={payStub.id} className="bg-card border-border/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{payStub.period}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <Calendar className="h-3 w-3" />
                      Paid on {new Date(payStub.payDate).toLocaleDateString()}
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="secondary" className="bg-success/10 text-success">
                  {payStub.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-sm text-muted-foreground">Gross Pay</p>
                  <p className="text-lg font-semibold">${payStub.grossPay.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Net Pay</p>
                  <p className="text-lg font-semibold text-primary">${payStub.netPay.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Deductions</p>
                  <p className="text-lg font-semibold">
                    ${(payStub.grossPay - payStub.netPay).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pay Period</p>
                  <p className="text-lg font-semibold">Monthly</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => handleView(payStub)}>
                  <Eye className="h-4 w-4 mr-2" />
                  View
                </Button>
                <Button onClick={() => handleDownload(payStub)}>
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

