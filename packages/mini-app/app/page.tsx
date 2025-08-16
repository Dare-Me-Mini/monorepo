"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Bell, RefreshCw } from "lucide-react"
import { useAppState } from "@/components/AppStateProvider"
import { useUserBets } from "@/hooks/useUserBets"
import { managedToast } from "@/lib/toast"
import { getCurrentState, formatTimeRemaining, getTimeStatusColor } from "@/lib/betState"
import { useBettingHouse } from "@/hooks/useBettingHouse"
import { useAccount } from "wagmi"
import toast from "react-hot-toast"

const BrandHeader = () => {
  const { activeAddress, isAuthenticated } = useAppState()
  const displayAddress = activeAddress ? `${activeAddress.slice(0, 6)}…${activeAddress.slice(-4)}` : (isAuthenticated ? '—' : 'Sign in')
  return (
    <div className="relative overflow-hidden rounded-b-[60px] bg-[#7C3AED] text-white pt-4 pb-8 px-6">
      <div className="flex items-center justify-between mb-6">
        <div className="text-xl font-bold">ibet</div>
        <div className="flex items-center gap-3">
          <Bell className="w-5 h-5 text-white" />
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

const BetCard = ({ bet, onClick, onAccept, onReject, isSubmitting, isApproving }: { 
  bet: any; 
  onClick: () => void;
  onAccept?: () => void;
  onReject?: () => void;
  isSubmitting?: boolean;
  isApproving?: boolean;
}) => {
  // Use usernames from bet data, fallback to formatted addresses
  const challengerName = bet.challengerUsername || `${bet.challenger?.slice(0, 6)}...${bet.challenger?.slice(-4)}`
  const challengeeName = bet.challengeeUsername || `${bet.challengee?.slice(0, 6)}...${bet.challengee?.slice(-4)}`
  const displayName = bet.isChallenger ? challengeeName : challengerName
  const displayPfp = bet.isChallenger ? bet.challengeePfp : bet.challengerPfp
  
  // Calculate current state and time remaining
  const betState = getCurrentState({
    lastUpdatedStatus: bet.status,
    acceptanceDeadline: bet.acceptanceDeadline,
    proofSubmissionDeadline: bet.proofSubmissionDeadline,
    proofAcceptanceDeadline: bet.proofAcceptanceDeadline,
    mediationDeadline: bet.mediationDeadline,
    isClosed: bet.isClosed
  })
  
  const timeDisplay = betState.deadline > 0 ? formatTimeRemaining(betState.timeRemaining) : 'No deadline'
  const timeColor = getTimeStatusColor(betState.timeRemaining, betState.deadline)
  
  return (
    <div className="bg-white rounded-3xl border-4 border-black p-6 shadow-lg">
      {/* Bet content */}
      <div className="flex items-start gap-4 mb-4" onClick={onClick} style={{cursor: 'pointer'}}>
        <div className="bg-[#7C3AED] text-white px-4 py-3 rounded-2xl font-bold text-2xl">
          ${bet.amount}
        </div>
        <div className="flex-1">
          <p className="text-gray-800 font-medium text-lg">
            {bet.condition}
          </p>
        </div>
      </div>
      
      {/* Accept/Reject buttons for OPEN bets */}
      {betState.currentStatus === 'OPEN' && !bet.isChallenger && (
        <div className="flex gap-3 mb-4">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onAccept?.();
            }}
            disabled={isSubmitting || isApproving}
            className="flex-1 bg-green-500 text-white py-3 rounded-2xl font-bold hover:bg-green-600 transition-colors text-lg disabled:opacity-50"
          >
            {isApproving ? 'Approving...' : isSubmitting ? 'Processing...' : 'Accept Bet'}
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onReject?.();
            }}
            disabled={isSubmitting || isApproving}
            className="flex-1 border-2 border-red-500 text-red-500 py-3 rounded-2xl font-bold hover:bg-red-50 transition-colors text-lg disabled:opacity-50"
          >
            {isSubmitting ? 'Processing...' : 'Reject Bet'}
          </button>
        </div>
      )}
      
      {/* User info and time */}
      <div className="flex items-center justify-between" onClick={onClick} style={{cursor: 'pointer'}}>
        <div className="flex items-center gap-3">
          {displayPfp ? (
            <img src={displayPfp} alt={displayName} className="w-10 h-10 rounded-full" />
          ) : (
            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
              <span className="text-gray-500 text-xs font-medium">
                {displayName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <span className="font-medium text-gray-700 text-base">
            {displayName}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <div className={`w-2 h-2 rounded-full ${betState.timeRemaining > 0 ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className={`text-sm font-medium ${timeColor}`}>
            {timeDisplay}
          </span>
        </div>
      </div>
    </div>
  )
}

const LOADING_STATES = [
  { emoji: '🎲', title: 'Rolling the dice...', subtitle: 'Finding your epic bets' },
  { emoji: '🎯', title: 'Taking aim...', subtitle: 'Targeting your challenges' },
  { emoji: '🚀', title: 'Launching into orbit...', subtitle: 'Fetching your dares' },
  { emoji: '⚡', title: 'Charging up...', subtitle: 'Powering your bets' },
  { emoji: '🎪', title: 'Setting up the ring...', subtitle: 'Preparing your matches' },
  { emoji: '🎮', title: 'Loading game...', subtitle: 'Your challenges await' },
  { emoji: '🔥', title: 'Heating things up...', subtitle: 'Your hot bets incoming' },
  { emoji: '🎊', title: 'Party time...', subtitle: 'Celebrating your bets' }
]

const LoadingSkeleton = () => (
  <div className="space-y-4">
    {[1, 2].map((i) => (
      <div key={i} className="bg-white rounded-3xl border-4 border-gray-200 p-6 shadow-lg animate-pulse">
        <div className="flex items-start gap-4 mb-4">
          <div className="bg-gray-300 px-4 py-3 rounded-2xl w-20 h-12"></div>
          <div className="flex-1">
            <div className="h-6 bg-gray-300 rounded mb-2 w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
        <div className="flex gap-3 mb-4">
          <div className="flex-1 bg-gray-300 py-3 rounded-2xl h-12"></div>
          <div className="flex-1 bg-gray-200 py-3 rounded-2xl h-12"></div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
            <div className="h-4 bg-gray-300 rounded w-24"></div>
          </div>
          <div className="h-4 bg-gray-200 rounded w-16"></div>
        </div>
      </div>
    ))}
  </div>
)

export default function Page() {
  const router = useRouter()
  const { activeAddress, isWalletConnected, isAuthenticated } = useAppState()
  const { isConnected: isWalletActive } = useAccount()
  const { acceptBet, rejectBet, isSubmitting, isApproving } = useBettingHouse()
  const lastBetsError = useRef<string | null>(null)
  const [loadingState] = useState(() => LOADING_STATES[Math.floor(Math.random() * LOADING_STATES.length)])

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
    error: betsError,
    refetch
  } = useUserBets({
    autoRefresh: false, // Disable auto-refresh
    refreshInterval: 0
  })

  const [isRefreshing, setIsRefreshing] = useState(false)

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
    if (!isWalletActive) {
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

  const handleAcceptBet = async (bet: any) => {
    if (!isWalletActive) {
      toast.error('Please connect your wallet first')
      return
    }
    
    try {
      const result = await acceptBet(Number(bet.id))
      if (result.success) {
        toast.success('Bet accepted successfully!')
        // Refresh the bets list
        setTimeout(() => handleRefresh(), 2000)
      } else {
        toast.error(result.error || 'Failed to accept bet')
      }
    } catch (error) {
      console.error('Accept bet error:', error)
      toast.error('Failed to accept bet')
    }
  }

  const handleRejectBet = async (bet: any) => {
    if (!isWalletActive) {
      toast.error('Please connect your wallet first')
      return
    }
    
    try {
      const result = await rejectBet(Number(bet.id))
      if (result.success) {
        toast.success('Bet rejected successfully!')
        // Refresh the bets list
        setTimeout(() => handleRefresh(), 2000)
      } else {
        toast.error(result.error || 'Failed to reject bet')
      }
    } catch (error) {
      console.error('Reject bet error:', error)
      toast.error('Failed to reject bet')
    }
  }

  const handleRefresh = async () => {
    if (isRefreshing || !activeAddress) return
    
    setIsRefreshing(true)
    try {
      await refetch()
      toast.success('Bets refreshed!')
    } catch (error) {
      console.error('Refresh error:', error)
      toast.error('Failed to refresh bets')
    } finally {
      setIsRefreshing(false)
    }
  }


  return (
    <main className="min-h-dvh bg-gray-50 text-foreground pb-24">
      <div className="mx-auto w-full max-w-xl">
        <BrandHeader />

        <div className="px-6 py-6 space-y-6 bg-gray-50">

          {/* Bets List */}
          {activeAddress && (
            <div className="space-y-4">
              {loading && (
                <div className="space-y-6">
                  <div className="text-center py-8">
                    <div className="relative mb-6">
                      <div className="text-6xl animate-bounce">{loadingState.emoji}</div>
                      <div className="absolute -top-2 -right-2 text-2xl animate-spin">⭐</div>
                      <div className="absolute -bottom-1 -left-2 text-xl animate-pulse">✨</div>
                    </div>
                    <div className="text-xl font-bold text-gray-800 mb-2">{loadingState.title}</div>
                    <div className="text-gray-600 mb-6">{loadingState.subtitle}</div>
                    
                    {/* Animated loading dots */}
                    <div className="flex justify-center space-x-2 mb-4">
                      <div className="w-3 h-3 bg-[#7C3AED] rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                      <div className="w-3 h-3 bg-[#7C3AED] rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                      <div className="w-3 h-3 bg-[#7C3AED] rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                    </div>
                    
                    {/* Fun progress bar */}
                    <div className="w-48 h-2 bg-gray-200 rounded-full mx-auto overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-[#7C3AED] to-[#A855F7] rounded-full animate-pulse"></div>
                    </div>
                  </div>
                  
                  {/* Loading skeleton cards */}
                  <LoadingSkeleton />
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
              {(activeBets.length > 0 || isRefreshing) && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-gray-800">Active Bets</h2>
                    <button 
                      onClick={handleRefresh}
                      disabled={isRefreshing}
                      className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-[#7C3AED] hover:text-[#6A33FF] transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                      {isRefreshing ? 'Refreshing...' : 'Refresh'}
                    </button>
                  </div>
                  
                  {/* Show loading animation if refreshing AND no bets yet */}
                  {isRefreshing && activeBets.length === 0 && (
                    <div className="space-y-6">
                      <div className="text-center py-8">
                        <div className="relative mb-6">
                          <div className="text-6xl animate-bounce">{loadingState.emoji}</div>
                          <div className="absolute -top-2 -right-2 text-2xl animate-spin">⭐</div>
                          <div className="absolute -bottom-1 -left-2 text-xl animate-pulse">✨</div>
                        </div>
                        <div className="text-xl font-bold text-gray-800 mb-2">{loadingState.title}</div>
                        <div className="text-gray-600 mb-6">{loadingState.subtitle}</div>
                        
                        {/* Animated loading dots */}
                        <div className="flex justify-center space-x-2 mb-4">
                          <div className="w-3 h-3 bg-[#7C3AED] rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                          <div className="w-3 h-3 bg-[#7C3AED] rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                          <div className="w-3 h-3 bg-[#7C3AED] rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                        </div>
                        
                        {/* Fun progress bar */}
                        <div className="w-48 h-2 bg-gray-200 rounded-full mx-auto overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-[#7C3AED] to-[#A855F7] rounded-full animate-pulse"></div>
                        </div>
                      </div>
                      
                      {/* Loading skeleton cards */}
                      <LoadingSkeleton />
                    </div>
                  )}
                  
                  {/* Show existing bets with reduced opacity during refresh */}
                  {activeBets.length > 0 && (
                    <div className={`space-y-4 ${isRefreshing ? 'opacity-75' : ''} transition-opacity`}>
                      {activeBets.map((bet) => (
                        <BetCard 
                          key={bet.id} 
                          bet={bet} 
                          onClick={() => handleBetClick(bet)}
                          onAccept={() => handleAcceptBet(bet)}
                          onReject={() => handleRejectBet(bet)}
                          isSubmitting={isSubmitting}
                          isApproving={isApproving}
                        />
                      ))}
                    </div>
                  )}
                </div>
                </div>
              )}

              {/* Completed Bets */}
              {completedBets.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold text-gray-800">Completed Bets</h2>
                  {completedBets.slice(0, 3).map((bet) => (
                    <BetCard 
                      key={bet.id} 
                      bet={bet} 
                      onClick={() => handleBetClick(bet)}
                      onAccept={() => handleAcceptBet(bet)}
                      onReject={() => handleRejectBet(bet)}
                      isSubmitting={isSubmitting}
                      isApproving={isApproving}
                    />
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

      </div>
    </main>
  )
}
