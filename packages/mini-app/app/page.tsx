"use client"

import { useEffect, useState } from "react"
import { sdk } from "@farcaster/miniapp-sdk"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Rocket, Trophy, Zap, Clock, CheckCircle } from "lucide-react"
import { SignInButton } from "@farcaster/auth-kit"
import { useAppState } from "@/components/AppStateProvider"
import { useUserBets } from "@/hooks/useUserBets"
import { getBetStatusColor } from "@/lib/indexer"

const BrandHeader = () => {
  const { activeAddress, isAuthenticated } = useAppState()
  const displayAddress = activeAddress ? `${activeAddress.slice(0, 6)}…${activeAddress.slice(-4)}` : (isAuthenticated ? '—' : 'Sign in')
  return (
    <div className="relative overflow-hidden rounded-b-[52px] bg-[#6A33FF] text-white pt-8 pb-16 px-6 shadow-xl">
      <div className="flex items-center justify-between">
        <div className="text-2xl font-extrabold font-display">ibet</div>
        <div className="rounded-full px-4 py-2 text-sm bg-white/20 backdrop-blur-sm">
          {!activeAddress && !isAuthenticated ? <SignInButton /> : displayAddress}
        </div>
      </div>
      <div className="mt-8 leading-[0.95]">
        <div className="font-extrabold text-[56px] tracking-tight font-display flex flex-col">
          <div className="flex items-center">
            Bet
            <Rocket className="ml-2 h-10 w-10" />
          </div>
          <div className="flex items-center">
            Compete
            <Zap className="ml-2 h-10 w-10" />
          </div>
          <div className="flex items-center">
            Win
            <Trophy className="ml-2 h-10 w-10" />
          </div>
        </div>
      </div>
      {/* decorative fold removed */}
    </div>
  )
}

type DareStatus = "pending" | "accepted" | "rejected" | "completed"

export type Dare = { id: string; description: string; stakeUsd: number; challenger: string; challengee: string; status: DareStatus; createdAt: number }

const BetCard = ({ bet, onClick }: { bet: any; onClick: () => void }) => (
  <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
    <CardContent className="p-4">
      <div className="flex items-start justify-between mb-2">
        <div className="text-sm font-medium truncate flex-1 mr-2">{bet.condition}</div>
        <div className={`text-xs px-2 py-1 rounded-full ${getBetStatusColor(bet.status)}`}>
          {bet.statusLabel}
        </div>
      </div>
      <div className="flex items-center justify-between text-sm text-foreground/70">
        <div className="flex items-center gap-1">
          <span>{bet.token.icon}</span>
          <span>{bet.amount} {bet.token.symbol}</span>
        </div>
        <div className="text-xs">
          {bet.createdAt.toLocaleDateString()}
        </div>
      </div>
      <div className="text-xs text-foreground/60 mt-1">
        {bet.isChallenger ? 'You challenged' : 'You were challenged'}
      </div>
    </CardContent>
  </Card>
)

export default function Page() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [added, setAdded] = useState<boolean>(false)
  const { activeAddress } = useAppState()
  
  const { 
    bets, 
    activeBets, 
    pendingBets, 
    completedBets, 
    loading, 
    error: betsError 
  } = useUserBets({ 
    autoRefresh: true,
    refreshInterval: 30000 
  })

  useEffect(() => {
    ;(async () => {
      await sdk.actions.ready()
    })()
  }, [])

  const handleBetClick = (bet: any) => {
    router.push(`/dare/${bet.id}?betId=${bet.id}&desc=${encodeURIComponent(bet.condition)}&stake=${bet.amount}&token=${bet.token.symbol}`)
  }


  return (
    <main className="min-h-dvh bg-background text-foreground pb-24">
      <div className="mx-auto w-full max-w-xl">
        <BrandHeader />

        <div className="px-4 py-5 space-y-6">
          {/* Create Bet Button */}
          <div>
            <Button 
              className="w-full h-14 rounded-2xl bg-black text-white text-lg font-extrabold shadow-[0_8px_0_#2b2b2b] active:translate-y-[2px] active:shadow-[0_4px_0_#2b2b2b]" 
              onClick={() => router.push('/create')}
            >
              Make a Bet
            </Button>
          </div>

          {/* Bets List */}
          {activeAddress && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Your Bets</h2>
                {loading && <div className="text-sm text-foreground/60">Loading...</div>}
              </div>

              {betsError && (
                <div className="text-red-500 text-sm p-3 bg-red-50 rounded-lg">
                  {betsError}
                </div>
              )}

              {!loading && bets.length === 0 && !betsError && (
                <div className="text-center py-8 text-foreground/60">
                  <div className="text-4xl mb-2">🎯</div>
                  <div>No bets yet</div>
                  <div className="text-sm">Create your first bet to get started!</div>
                </div>
              )}

              {/* Active Bets */}
              {activeBets.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Clock className="h-4 w-4" />
                    <span>Active ({activeBets.length})</span>
                  </div>
                  {activeBets.map((bet) => (
                    <BetCard key={bet.id} bet={bet} onClick={() => handleBetClick(bet)} />
                  ))}
                </div>
              )}

              {/* Completed Bets */}
              {completedBets.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <CheckCircle className="h-4 w-4" />
                    <span>Completed ({completedBets.length})</span>
                  </div>
                  {completedBets.slice(0, 5).map((bet) => (
                    <BetCard key={bet.id} bet={bet} onClick={() => handleBetClick(bet)} />
                  ))}
                  {completedBets.length > 5 && (
                    <div className="text-center text-sm text-foreground/60">
                      +{completedBets.length - 5} more completed bets
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {!activeAddress && (
            <div className="text-center py-8 text-foreground/60">
              <div className="text-4xl mb-2">🔗</div>
              <div>Connect your wallet to view your bets</div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
