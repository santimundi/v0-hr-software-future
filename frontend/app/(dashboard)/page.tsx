"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useRole } from "@/lib/role-context"

export default function HomePage() {
  const { role } = useRole()
  const router = useRouter()

  useEffect(() => {
    // Redirect to role-specific dashboard
    if (role === "employee") {
      router.replace("/employee")
    } else if (role === "manager") {
      router.replace("/manager")
    } else if (role === "hr-admin") {
      router.replace("/hr")
    }
  }, [role, router])

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <p className="text-muted-foreground">Redirecting to your dashboard...</p>
      </div>
    </div>
  )
}
