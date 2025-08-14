"use client"

import { useEffect, useMemo, useState } from "react"
import { sdk } from "@farcaster/miniapp-sdk"
import { v4 as uuidv4 } from "uuid"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import ThemeToggle from "@/components/ThemeToggle"

type DareStatus = "pending" | "accepted" | "rejected" | "completed"

export type Dare = {
  id: string
  description: string
  stakeUsd: number
  challenger: string
  challengee: string
  status: DareStatus
  createdAt: number
}

function loadDares(): Dare[] {
  if (typeof window === "undefined") return []
  const raw = window.localStorage.getItem("dares")
  return raw ? (JSON.parse(raw) as Dare[]) : []
}

function saveDares(dares: Dare[]) {
  if (typeof window === "undefined") return
  window.localStorage.setItem("dares", JSON.stringify(dares))
}

export default function Page() {
  const router = useRouter()
  const [dares, setDares] = useState<Dare[]>([])
  const [description, setDescription] = useState("")
  const [stakeUsd, setStakeUsd] = useState<string>("")
  const [challengee, setChallengee] = useState("")
  const [challenger] = useState("You")
  const [error, setError] = useState<string | null>(null)
  const [added, setAdded] = useState<boolean>(false)
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    setDares(loadDares())
    ;(async () => {
      await sdk.actions.ready()
    })()
  }, [])

  useEffect(() => {
    saveDares(dares)
  }, [dares])

  const totalCreated = useMemo(() => dares.length, [dares])

  const handleAddMiniApp = async () => {
    try {
      await sdk.actions.addMiniApp()
      setAdded(true)
      setError(null)
    } catch (e) {
      setError('Failed to add Mini App (works only on production domains matching manifest)')
    }
  }

  const createDare = async () => {
    const desc = description.trim()
    const to = challengee.trim()
    const from = challenger.trim()
    const stake = Number(stakeUsd)
    if (!desc || !to || !from || !Number.isFinite(stake) || stake <= 0) return
    setIsCreating(true)
    try {
      const id = uuidv4()
      const dare: Dare = {
        id,
        description: desc,
        stakeUsd: stake,
        challenger: from,
        challengee: to,
        status: 'pending',
        createdAt: Date.now(),
      }
      setDares((prev) => [dare, ...prev])
      setDescription("")
      setStakeUsd("")
      setChallengee("")

      const params = new URLSearchParams({
        desc,
        stake: String(stake),
        from,
        to,
        status: 'pending',
      })
      // Go to share/preview screen first
      router.push(`/dare/${id}/share?${params.toString()}`)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <main className="min-h-dvh p-4 md:p-6 bg-background text-foreground">
      <div className="mx-auto w-full max-w-xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Dares</h1>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button variant="outline" onClick={handleAddMiniApp}>
              {added ? 'Added' : 'Add to My Apps'}
            </Button>
          </div>
        </div>
        {error && <div className="text-sm text-red-300">{error}</div>}

        <Card className="bg-card border-border text-card-foreground">
          <CardHeader>
            <CardTitle className="text-base">Create a dare</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="friend">Friend's username</Label>
              <Input id="friend" value={challengee} onChange={(e) => setChallengee(e.target.value)} placeholder="@friend" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="challenge">Challenge</Label>
              <Input id="challenge" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Propose to her at the cafe" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Bet amount (USD)</Label>
              <Input id="amount" inputMode="decimal" value={stakeUsd} onChange={(e) => setStakeUsd(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="20" />
            </div>
            <div className="flex justify-end">
              <Button
                onClick={createDare}
                disabled={isCreating || !description.trim() || !challengee.trim() || !Number.isFinite(Number(stakeUsd)) || Number(stakeUsd) <= 0}
              >
                {isCreating ? 'Creating…' : 'Create Dare'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {totalCreated > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm text-white/70">Your dares</h3>
            {dares.map((dare) => (
              <Card key={dare.id} className="bg-card border-border text-card-foreground">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">{dare.description}</div>
                      <div className="text-xs text-foreground/60 mt-1">You → {dare.challengee} • ${dare.stakeUsd.toLocaleString()}</div>
                      <div className="text-[10px] mt-1 px-2 py-0.5 inline-block border border-border rounded-full text-foreground/70">{dare.status}</div>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => {
                        const params = new URLSearchParams({
                          desc: dare.description,
                          stake: String(dare.stakeUsd),
                          from: dare.challenger,
                          to: dare.challengee,
                          status: dare.status,
                        })
                        router.push(`/dare/${dare.id}?${params.toString()}`)
                      }}
                    >
                      Open
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {totalCreated === 0 && (
          <div className="text-center text-white/60 text-sm">No dares yet. Create your first one.</div>
        )}
      </div>
    </main>
  )
}
