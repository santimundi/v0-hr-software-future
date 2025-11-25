"use client"

import { useState } from "react"
import { Heart, Shield, Sparkles, DollarSign, Activity, CheckCircle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { benefits } from "@/lib/mock-data"

const benefitIcons: Record<string, typeof Heart> = {
  Health: Heart,
  Retirement: DollarSign,
  Wellness: Activity,
}

export default function BenefitsPage() {
  const [question, setQuestion] = useState("")
  const [aiResponse, setAiResponse] = useState<string | null>(null)

  const handleAskQuestion = () => {
    // Mock AI response
    setAiResponse(`Based on your Benefits Overview policy (v2.5), here's a simple explanation:

**Your Health Insurance** covers you and your family for:
- Doctor visits and checkups
- Hospital stays
- Prescription medications
- Dental cleanings and fillings
- Eye exams and glasses

**Key Points:**
- You're covered from day 1 of employment
- No deductible for preventive care
- $20 copay for regular doctor visits

*Source: Benefits Overview v2.5 - Section 1*`)
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
          {benefits.map((benefit) => {
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
              <Button className="w-full gap-2" onClick={handleAskQuestion}>
                <Sparkles className="h-4 w-4" />
                Explain My Benefits
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
                        <span className="text-sm font-medium">HR Copilot</span>
                      </div>
                      <div className="prose prose-sm dark:prose-invert whitespace-pre-wrap text-sm">{aiResponse}</div>
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
