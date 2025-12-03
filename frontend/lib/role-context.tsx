"use client"

import { createContext, useContext, useState, type ReactNode } from "react"
import * as MockData from "./mock-data"

interface RoleContextType {
  role: MockData.UserRole
  setRole: (role: MockData.UserRole) => void
  currentUser: MockData.User
}

const RoleContext = createContext<RoleContextType | undefined>(undefined)

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<MockData.UserRole>("employee")
  const currentUser = MockData.getUserByRole(role)

  return <RoleContext.Provider value={{ role, setRole, currentUser }}>{children}</RoleContext.Provider>
}

export function useRole() {
  const context = useContext(RoleContext)
  if (!context) {
    throw new Error("useRole must be used within a RoleProvider")
  }
  return context
}
