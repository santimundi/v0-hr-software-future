/**
 * Utility functions for managing persistent user IDs
 * Stores user ID in localStorage for long-term tracking across sessions
 */

const USER_ID_KEY = "hr_agent_user_id"

/**
 * Generates a unique user ID
 */
function generateUserId(): string {
  // Generate a UUID-like string: timestamp + random component
  const timestamp = Date.now().toString(36)
  const randomPart = Math.random().toString(36).substring(2, 15)
  return `user_${timestamp}_${randomPart}`
}

/**
 * Gets or creates a persistent user ID
 * The ID is stored in localStorage and persists across sessions
 */
export function getUserId(): string {
  if (typeof window === "undefined") {
    // Server-side: return a temporary ID (shouldn't happen in client components)
    return "temp_user"
  }

  let userId = localStorage.getItem(USER_ID_KEY)

  if (!userId) {
    userId = generateUserId()
    localStorage.setItem(USER_ID_KEY, userId)
  }

  return userId
}

/**
 * Resets the user ID (generates a new one)
 * Useful for testing or when user wants to start fresh
 */
export function resetUserId(): string {
  if (typeof window === "undefined") {
    return "temp_user"
  }

  const newUserId = generateUserId()
  localStorage.setItem(USER_ID_KEY, newUserId)
  return newUserId
}

/**
 * Gets the current user ID without creating a new one
 * Returns null if no ID exists
 */
export function getExistingUserId(): string | null {
  if (typeof window === "undefined") {
    return null
  }

  return localStorage.getItem(USER_ID_KEY)
}

