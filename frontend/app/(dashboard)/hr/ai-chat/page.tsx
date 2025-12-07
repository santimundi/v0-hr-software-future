"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { AiChatPanel } from "@/components/ai/AiChatPanel"
import { useRole } from "@/lib/role-context"

export default function HrAiChatPage() {
  const { role } = useRole()
  const router = useRouter()

  useEffect(() => {
    if (role !== "hr-admin") {
      router.push("/")
    }
  }, [role, router])

  if (role !== "hr-admin") {
    return null
  }
  return (
    <div className="h-[calc(100vh-4rem)]">
      <AiChatPanel />
    </div>
  )
}

