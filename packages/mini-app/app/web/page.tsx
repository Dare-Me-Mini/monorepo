"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import toast from "react-hot-toast"

type FetchState = "idle" | "loading" | "success" | "error"

export default function WebDemoPage() {
  const [username, setUsername] = useState("")
  const [state, setState] = useState<FetchState>("idle")
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setResult(null)
    const u = username.trim()
    if (!u) {
      toast.error("Please enter a username")
      return
    }
    setState("loading")
    const loadingToast = toast.loading("Looking up wallet...")
    try {
      const res = await fetch(`/api/neynar/wallet?username=${encodeURIComponent(u)}`)
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || "Request failed")
      }
      setResult(data)
      setState("success")
      toast.success("Wallet found successfully!", { id: loadingToast })
    } catch (err: any) {
      const errorMessage = err?.message || "Something went wrong"
      setError(errorMessage)
      setState("error")
      toast.error(errorMessage, { id: loadingToast })
    }
  }

  return (
    <main className="min-h-dvh p-4 md:p-6 bg-background text-foreground">
      <div className="mx-auto w-full max-w-xl space-y-6">
        <h1 className="text-2xl font-semibold">Wallet Lookup (Neynar)</h1>
        <Card className="bg-card border-border text-card-foreground">
          <CardHeader>
            <CardTitle className="text-base">Find user's Farcaster wallet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={onSubmit} className="space-y-3">
              <Input
                placeholder="@alice"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <div className="flex gap-2 justify-end">
                <Button type="submit" disabled={state === "loading" || !username.trim()}>
                  {state === "loading" ? "Looking up…" : "Get Wallet"}
                </Button>
              </div>
            </form>
            {state === "error" && (
              <div className="text-sm text-red-400">{error}</div>
            )}
            {state === "success" && result && (
              <div className="text-sm space-y-1">
                <div>
                  <span className="text-foreground/60">Username:</span> {result.username}
                </div>
                {result.fid !== undefined && (
                  <div>
                    <span className="text-foreground/60">FID:</span> {result.fid}
                  </div>
                )}
                {result.walletAddress ? (
                  <div>
                    <span className="text-foreground/60">Primary Wallet:</span> {result.walletAddress}
                  </div>
                ) : (
                  <div className="text-foreground/60">No verified Ethereum address found.</div>
                )}
                {Array.isArray(result.allVerifiedEthAddresses) && result.allVerifiedEthAddresses.length > 1 && (
                  <div>
                    <span className="text-foreground/60">All Verified:</span> {result.allVerifiedEthAddresses.join(", ")}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}


