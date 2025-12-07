import { createBrowserClient } from "@supabase/ssr"

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    console.error("Missing Supabase environment variables:")
    console.error("NEXT_PUBLIC_SUPABASE_URL:", url ? "✓ Set" : "✗ Missing")
    console.error("NEXT_PUBLIC_SUPABASE_ANON_KEY:", key ? "✓ Set" : "✗ Missing")
    throw new Error("Supabase environment variables are not configured. Please check your .env.local file.")
  }

  return createBrowserClient(url, key)
}
