import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Utility function for merging Tailwind CSS classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Normalizes an employee ID by removing hyphens.
 * Converts "EMP-001" to "EMP001"
 */
export function normalizeEmployeeId(employeeId: string): string {
  return employeeId.replace(/-/g, "")
}
