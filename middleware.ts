import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// This is a no-op middleware that just passes through all requests
// Uncomment the Supabase auth code below when ready to add authentication

export function middleware(request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}

/*
// Supabase authentication middleware - uncomment when ready to use
import { updateSession } from "@/lib/supabase/middleware"

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}
*/
