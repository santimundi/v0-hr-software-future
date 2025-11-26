"use client"

import { createContext, useContext, useState, type ReactNode } from "react"
import { type UserRole, getUserByRole, type User } from "./mock-data"

interface RoleContextType {
  role: UserRole
  setRole: (role: UserRole) => void
  currentUser: User
}

const RoleContext = createContext<RoleContextType | undefined>(undefined)

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<UserRole>("employee")
  const currentUser = getUserByRole(role)

  return <RoleContext.Provider value={{ role, setRole, currentUser }}>{children}</RoleContext.Provider>
}

export function useRole() {
  const context = useContext(RoleContext)
  if (!context) {
    throw new Error("useRole must be used within a RoleProvider")
  }
  return context
}
