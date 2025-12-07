"use client"

import { useEffect, useState } from "react"

export default function TestEnvPage() {
  const [envStatus, setEnvStatus] = useState<{
    url: boolean
    key: boolean
    urlValue: string | null
    keyValue: string | null
  }>({
    url: false,
    key: false,
    urlValue: null,
    keyValue: null,
  })

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    setEnvStatus({
      url: !!url,
      key: !!key,
      urlValue: url || null,
      keyValue: key ? `${key.substring(0, 20)}...` : null,
    })
  }, [])

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Environment Variables Test</h1>
        <p className="text-muted-foreground">Check if Supabase environment variables are loaded</p>
      </div>

      <div className="space-y-4">
        <div className="p-4 border rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">NEXT_PUBLIC_SUPABASE_URL</span>
            <span className={envStatus.url ? "text-success" : "text-destructive"}>
              {envStatus.url ? "✓ Set" : "✗ Missing"}
            </span>
          </div>
          {envStatus.urlValue && (
            <p className="text-sm text-muted-foreground font-mono break-all">{envStatus.urlValue}</p>
          )}
        </div>

        <div className="p-4 border rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">NEXT_PUBLIC_SUPABASE_ANON_KEY</span>
            <span className={envStatus.key ? "text-success" : "text-destructive"}>
              {envStatus.key ? "✓ Set" : "✗ Missing"}
            </span>
          </div>
          {envStatus.keyValue && (
            <p className="text-sm text-muted-foreground font-mono break-all">{envStatus.keyValue}</p>
          )}
        </div>

        <div className="p-4 border rounded-lg bg-muted">
          <p className="text-sm font-medium mb-2">Notes:</p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Variables must start with <code className="bg-background px-1 rounded">NEXT_PUBLIC_</code> to be accessible in the browser</li>
            <li>If variables are missing, check your <code className="bg-background px-1 rounded">.env.local</code> or <code className="bg-background px-1 rounded">.env</code> file</li>
            <li>Restart your dev server after adding/changing environment variables</li>
            <li>Make sure the file is in the <code className="bg-background px-1 rounded">frontend/</code> directory</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

