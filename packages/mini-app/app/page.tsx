"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Rocket, Trophy, Zap, Clock, CheckCircle, Home, Plus, User } from "lucide-react"
import { SignInButton } from "@farcaster/auth-kit"
import { useAppState } from "@/components/AppStateProvider"
import { useUserBets } from "@/hooks/useUserBets"
import { getBetStatusColor } from "@/lib/indexer"
import { managedToast } from "@/lib/toast"
import toast from "react-hot-toast"

const BrandHeader = () => {
  const { activeAddress, isAuthenticated } = useAppState()
  const displayAddress = activeAddress ? `${activeAddress.slice(0, 6)}…${activeAddress.slice(-4)}` : (isAuthenticated ? '—' : 'Sign in')
  return (
    <div className="relative overflow-hidden rounded-b-[60px] bg-[#7C3AED] text-white pt-8 pb-12 px-6">
      <div className="flex items-center justify-between mb-8">
        <div className="text-2xl font-bold">ibetyou</div>
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
            <div className="w-3 h-3 bg-white rounded-full"></div>
          </div>
          <div className="text-sm font-medium">
            {displayAddress}
          </div>
        </div>
      </div>
      <div className="text-center">
        <div className="text-4xl font-bold mb-2">
          Bet 🚀 & ⚡ Compete
        </div>
      </div>
    </div>
  )
}

type DareStatus = "pending" | "accepted" | "rejected" | "completed"

export type Dare = { id: string; description: string; stakeUsd: number; challenger: string; challengee: string; status: DareStatus; createdAt: number }

const BetCard = ({ bet, onClick, showActions = false }: { bet: any; onClick: () => void; showActions?: boolean }) => (
  <div className="bg-white rounded-3xl border-4 border-black p-6 shadow-lg cursor-pointer hover:shadow-xl transition-shadow" onClick={onClick}>
    <div className="flex items-start gap-4 mb-4">
      <div className="bg-[#7C3AED] text-white px-4 py-2 rounded-2xl font-bold text-lg">
        ${bet.amount}
      </div>
      <div className="flex-1">
        <p className="text-gray-800 font-medium">
          {bet.condition}
        </p>
      </div>
    </div>
    
    {showActions && bet.status === 'OPEN' && !bet.isChallenger && (
      <div className="flex gap-3 mb-4">
        <button className="flex-1 bg-green-500 text-white py-3 rounded-2xl font-bold hover:bg-green-600 transition-colors">
          Accept Bet
        </button>
        <button className="flex-1 border-2 border-red-500 text-red-500 py-3 rounded-2xl font-bold hover:bg-red-50 transition-colors">
          Reject Bet
        </button>
      </div>
    )}
    
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
        <span className="font-medium text-gray-700">
          {bet.isChallenger ? 'You challenged' : 'Challenged by'} {bet.isChallenger ? bet.challengee : bet.challenger}
        </span>
      </div>
      <div className="flex items-center gap-1 text-green-600">
        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
        <span className="text-sm font-medium">24 Hours</span>
      </div>
    </div>
  </div>
)

export default function Page() {
  const router = useRouter()
  const { activeAddress, isWalletConnected, isAuthenticated } = useAppState()
  const lastBetsError = useRef<string | null>(null)

  // Consider user "connected" if they have either a wallet connection or are authenticated with Farcaster
  const isConnected = isWalletConnected || (isAuthenticated && !!activeAddress)

  // Debug logging
  useEffect(() => {
    console.log('Connection state:', {
      isWalletConnected,
      isAuthenticated,
      activeAddress,
      isConnected
    })
  }, [isWalletConnected, isAuthenticated, activeAddress, isConnected])

  const {
    bets,
    activeBets,
    completedBets,
    loading,
    error: betsError
  } = useUserBets({
    autoRefresh: !!activeAddress, // Only auto-refresh when there's an active address
    refreshInterval: 30000
  })

  // SDK initialization is handled by MiniAppReady component

  useEffect(() => {
    if (betsError && betsError !== lastBetsError.current) {
      // Temporarily disabled to prevent toast spam
      console.log('Failed to load bets:', betsError)
      lastBetsError.current = betsError
    }
    if (!betsError) {
      lastBetsError.current = null
    }
  }, [betsError])

  const handleCreateBetClick = () => {
    console.log('handleCreateBetClick called, isConnected:', isConnected, typeof isConnected)
    if (!isConnected) {
      console.log('Connection check failed - showing toast error')
      toast.error('Please connect your wallet first to create a bet')
      return
    }
    console.log('Connection check passed - navigating to create page')
    try {
      router.push('/create')
    } catch (err) {
      console.error('Navigation failed:', err)
      toast.error('Failed to navigate to create bet page')
    }
  }

  const handleBetClick = (bet: any) => {
    try {
      router.push(`/dare/${bet.id}`)
    } catch (err) {
      console.error('Navigation failed:', err)
      managedToast.error('Failed to open bet')
    }
  }


  return (
    <main className="min-h-dvh bg-gray-50 text-foreground pb-24">
      <div className="mx-auto w-full max-w-xl">
        <BrandHeader />

        <div className="px-4 py-5 space-y-6">

          {/* Bets List */}
          {activeAddress && (
            <div className="space-y-4">
              {loading && (
                <div className="text-center py-8">
                  <div className="text-lg text-gray-600">Loading your bets...</div>
                </div>
              )}

              {betsError && (
                <div className="text-red-500 text-sm p-3 bg-red-50 rounded-lg">
                  {betsError}
                </div>
              )}

              {!loading && bets.length === 0 && !betsError && (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🎯</div>
                  <div className="text-xl font-semibold text-gray-800 mb-2">No bets yet</div>
                  <div className="text-gray-600">Create your first bet to get started!</div>
                </div>
              )}

              {/* Active Bets */}
              {activeBets.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold text-gray-800">Active Bets</h2>
                  {activeBets.map((bet) => (
                    <BetCard key={bet.id} bet={bet} onClick={() => handleBetClick(bet)} showActions={true} />
                  ))}
                </div>
              )}

              {/* Completed Bets */}
              {completedBets.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold text-gray-800">Completed Bets</h2>
                  {completedBets.slice(0, 3).map((bet) => (
                    <BetCard key={bet.id} bet={bet} onClick={() => handleBetClick(bet)} />
                  ))}
                  {completedBets.length > 3 && (
                    <div className="text-center text-sm text-gray-600 mt-4">
                      +{completedBets.length - 3} more completed bets
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

        {/* Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-[#7C3AED] rounded-t-3xl">
          <div className="flex items-center justify-around py-4 px-6 max-w-xl mx-auto">
            <button className="p-3 bg-white rounded-full">
              <Home className="w-6 h-6 text-[#7C3AED]" />
            </button>
            <button 
              className="p-4 bg-white rounded-full"
              onClick={handleCreateBetClick}
            >
              <Plus className="w-8 h-8 text-[#7C3AED]" />
            </button>
            <button className="p-3">
              <User className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
