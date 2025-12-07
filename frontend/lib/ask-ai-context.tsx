"use client"

import { createContext, useContext, useState, ReactNode } from "react"

interface AskAiContextType {
  openWithPrompt: (prompt: string) => void
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  initialPrompt: string | undefined
  setInitialPrompt: (prompt: string | undefined) => void
}

const AskAiContext = createContext<AskAiContextType | undefined>(undefined)

export function AskAiProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [initialPrompt, setInitialPrompt] = useState<string | undefined>(undefined)

  const openWithPrompt = (prompt: string) => {
    setInitialPrompt(prompt)
    setIsOpen(true)
  }

  return (
    <AskAiContext.Provider
      value={{
        openWithPrompt,
        isOpen,
        setIsOpen,
        initialPrompt,
        setInitialPrompt,
      }}
    >
      {children}
    </AskAiContext.Provider>
  )
}

export function useAskAi() {
  const context = useContext(AskAiContext)
  if (context === undefined) {
    throw new Error("useAskAi must be used within an AskAiProvider")
  }
  return context
}

