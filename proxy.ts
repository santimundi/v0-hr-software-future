import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// This is a no-op proxy that just passes through all requests
// Uncomment the Supabase auth code below when ready to add authentication

export default function proxy(request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}

/*
// Supabase authentication proxy - uncomment when ready to use
import { updateSession } from "@/lib/supabase/middleware"

export default async function proxy(request: NextRequest) {
  return await updateSession(request)
}
*/
