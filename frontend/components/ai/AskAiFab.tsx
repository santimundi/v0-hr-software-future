"use client"

import { useState, useEffect } from "react"
import { MessageCircle, Maximize2, Minimize2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AiChatPanel } from "./AiChatPanel"
import { useAskAi } from "@/lib/ask-ai-context"

export function AskAiFab() {
  const { isOpen, setIsOpen, initialPrompt, setInitialPrompt } = useAskAi()
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Clear initial prompt when dialog closes
  useEffect(() => {
    if (!isOpen && initialPrompt) {
      // Small delay to allow the prompt to be used before clearing
      const timer = setTimeout(() => setInitialPrompt(undefined), 100)
      return () => clearTimeout(timer)
    }
  }, [isOpen, initialPrompt, setInitialPrompt])

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 px-6 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 z-50 bg-primary text-primary-foreground"
        size="lg"
      >
        <MessageCircle className="h-5 w-5 mr-2" />
        <span>Ask AI</span>
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
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
                  <MessageCircle className="h-5 w-5 text-primary" />
                  Chat with AI
                </DialogTitle>
                <DialogDescription>
                  Ask questions about HR policies, your profile, documents, or request help with HR workflows.
                </DialogDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="ml-4"
              >
                {isFullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-hidden min-h-0 flex flex-col">
            <AiChatPanel onClose={() => setIsOpen(false)} initialPrompt={initialPrompt} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

