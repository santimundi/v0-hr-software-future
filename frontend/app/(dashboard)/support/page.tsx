"use client"

import { HelpCircle, Mail, MessageSquare } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function SupportPage() {
  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Support & Help</h1>
        <p className="text-muted-foreground">Get help with HR questions and issues</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Chat with AI
            </CardTitle>
            <CardDescription>Get instant answers from AI assistant</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full">Open AI Chat</Button>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Contact HR
            </CardTitle>
            <CardDescription>Send a message to the HR team</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">Send Message</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

