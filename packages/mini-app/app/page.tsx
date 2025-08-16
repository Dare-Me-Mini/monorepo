"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Bell,
  RefreshCw,
  Rocket,
  Zap,
  Dice5,
  Target,
  Tent,
  Gamepad2,
  Flame,
  PartyPopper,
  Star,
  Sparkles,
  Link,
  Clock,
  MoreVertical,
} from "lucide-react"
import { useAppState } from "@/components/AppStateProvider"
import { useUserBets } from "@/hooks/useUserBets"
import { managedToast } from "@/lib/toast"
import { getCurrentState, formatTimeRemaining, getTimeStatusColor } from "@/lib/betState"
import { getBetStatusLabel, getBetStatusColor } from "@/lib/indexer"
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
        <div className="text-4xl font-bold mb-2 flex items-center justify-center gap-2">
          Bet <Rocket className="w-8 h-8 inline-block" /> & <Zap className="w-8 h-8 inline-block" /> Compete
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
  
  // Status and perspective information
  const statusLabel = getBetStatusLabel(betState.currentStatus)
  const statusColorClass = getBetStatusColor(betState.currentStatus)
  
  // Determine whose turn it is / what's pending
  const getPendingInfo = () => {
    if (betState.currentStatus === 'OPEN') {
      return bet.isChallenger ? 'Waiting for acceptance' : 'Your turn to respond'
    } else if (betState.currentStatus === 'ACCEPTED') {
      return bet.isChallenger ? 'Your turn to submit proof' : 'Waiting for proof'
    } else if (betState.currentStatus === 'PROOF_SUBMITTED') {
      return bet.isChallenger ? 'Waiting for proof review' : 'Your turn to review proof'
    } else if (betState.currentStatus === 'PROOF_DISPUTED') {
      return 'Awaiting mediation'
    }
    return null
  }
  
  const pendingInfo = getPendingInfo()
  
  return (
    <div
      className="bg-white rounded-2xl border-2 border-black p-4 shadow-[4px_4px_0px_#000] cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start gap-3 mb-4 bg-purple-100 p-3 rounded-xl">
        <div className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold text-xl flex-shrink-0">
          ${bet.amount}
        </div>
        <div className="flex-1">
          <p className="text-gray-800 font-medium text-sm leading-snug">
            {bet.condition}
          </p>
        </div>
      </div>

      {/* Status indicators */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColorClass}`}>
            {statusLabel}
          </span>
          {pendingInfo && (
            <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
              {pendingInfo}
            </span>
          )}
        </div>
      </div>

      {betState.currentStatus === 'OPEN' && !bet.isChallenger && (
        <div className="flex gap-3 mb-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAccept?.();
            }}
            disabled={isSubmitting || isApproving}
            className="flex-1 bg-[#00C96F] text-white py-2.5 rounded-xl font-bold hover:bg-green-600 transition-colors text-base disabled:opacity-50 border-b-4 border-green-700 active:border-b-0"
          >
            {isApproving ? 'Approving...' : isSubmitting ? 'Processing...' : 'Accept Bet'}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onReject?.();
            }}
            disabled={isSubmitting || isApproving}
            className="flex-1 border-2 border-red-500 text-red-500 py-2.5 rounded-xl font-bold hover:bg-red-50 transition-colors text-base disabled:opacity-50 bg-white"
          >
            {isSubmitting ? 'Processing...' : 'Reject Bet'}
          </button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {displayPfp ? (
            <img src={displayPfp} alt={displayName} className="w-8 h-8 rounded-full border-2 border-black" />
          ) : (
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center border-2 border-black">
              <span className="text-gray-500 text-xs font-medium">
                {displayName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <span className="font-semibold text-gray-900 text-sm">
            {displayName}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-[#00C96F]">
            <Clock className="w-4 h-4" />
            <span className={`text-sm font-medium`}>
              {timeDisplay}
            </span>
          </div>
          <MoreVertical className="w-5 h-5 text-gray-500" />
        </div>
      </div>
    </div>
  )
}

const LOADING_STATES = [
  { icon: Dice5, title: 'Rolling the dice...', subtitle: 'Finding your epic bets' },
  { icon: Target, title: 'Taking aim...', subtitle: 'Targeting your challenges' },
  { icon: Rocket, title: 'Launching into orbit...', subtitle: 'Fetching your dares' },
  { icon: Zap, title: 'Charging up...', subtitle: 'Powering your bets' },
  { icon: Tent, title: 'Setting up the ring...', subtitle: 'Preparing your matches' },
  { icon: Gamepad2, title: 'Loading game...', subtitle: 'Your challenges await' },
  { icon: Flame, title: 'Heating things up...', subtitle: 'Your hot bets incoming' },
  { icon: PartyPopper, title: 'Party time...', subtitle: 'Celebrating your bets' }
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
  const LoadingIcon = loadingState.icon

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
                    <div className="relative mb-6 flex justify-center items-center h-20">
                      <LoadingIcon className="w-16 h-16 text-[#7C3AED] animate-bounce" />
                      <Star className="absolute top-0 right-0 w-6 h-6 text-yellow-400 animate-spin" />
                      <Sparkles className="absolute bottom-0 left-0 w-5 h-5 text-blue-400 animate-pulse" />
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
                  <Target className="w-16 h-16 mx-auto mb-4 text-gray-400" />
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
                        <div className="relative mb-6 flex justify-center items-center h-20">
                          <LoadingIcon className="w-16 h-16 text-[#7C3AED] animate-bounce" />
                          <Star className="absolute top-0 right-0 w-6 h-6 text-yellow-400 animate-spin" />
                          <Sparkles className="absolute bottom-0 left-0 w-5 h-5 text-blue-400 animate-pulse" />
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
                <div className="text-4xl mb-2"><Link className="w-10 h-10 mx-auto mb-2 text-foreground" /></div>
                <div>Connect your wallet to view your bets</div>
            </div>
          )}
        </div>

      </div>
    </main>
  )
}
