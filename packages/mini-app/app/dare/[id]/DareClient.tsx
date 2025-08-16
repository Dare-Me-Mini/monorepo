'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { sdk } from '@farcaster/miniapp-sdk'
import { ArrowLeftIcon, ChevronLeftIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useBettingHouse } from '@/hooks/useBettingHouse'
import { useAccount } from 'wagmi'
import toast from 'react-hot-toast'
import { getTokenBySymbol, DEFAULT_TOKEN, formatTokenAmount, type Token } from '@/lib/tokens'
import { useBetDetails } from '@/hooks/useBetDetails'
import { getBetStatusColor, getBetStatusLabel } from '@/lib/indexer'
import { getCurrentState, formatTimeRemaining } from '@/lib/betState'
import { useAppState } from '@/components/AppStateProvider'

type DareStatus = 'pending' | 'accepted' | 'rejected' | 'completed'

export default function DareClient({ id }: { id: string }) {
  const router = useRouter()
  const qp = useSearchParams()
  const { isConnected } = useAccount()
  const { activeAddress } = useAppState()
  const { acceptBet, rejectBet, isSubmitting, isApproving } = useBettingHouse()
  const [copied, setCopied] = useState(false)
  const [currentTime, setCurrentTime] = useState(Date.now())

  // Use the id from the URL path as the betId and fetch data from database
  const betDetails = useBetDetails(id)

  // Use real data from database
  const description = betDetails?.condition || ''
  const stake = betDetails?.amount || '0'
  const token = betDetails?.token || DEFAULT_TOKEN
  const from = betDetails?.challengerUsername || ''
  const to = betDetails?.challengeeUsername || ''
  const status = betDetails?.status || 'OPEN'
  const isLoading = betDetails?.loading || !betDetails
  
  // Show loading state if we don't have essential data yet
  const hasEssentialData = betDetails && !betDetails.loading && !betDetails.error
  
  // Check if current user is the challengee (who can accept/reject)
  const isChallengee = hasEssentialData && activeAddress && 
    betDetails.challengee.toLowerCase() === activeAddress.toLowerCase()
  
  // Check if current user is the challenger
  const isChallenger = hasEssentialData && activeAddress && 
    betDetails.challenger.toLowerCase() === activeAddress.toLowerCase()

  useEffect(() => {
    ;(async () => {
      await sdk.actions.ready()
    })()
  }, [])

  // Update current time every second for live countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const accept = async () => {
    if (!isConnected) {
      toast.error("Please connect your wallet first");
      return;
    }
    
    if (!id) {
      toast.error("Bet ID not found");
      return;
    }

    const result = await acceptBet(Number(id));
    if (result.success) {
      toast.success("Bet accepted successfully!");
      // Refresh bet details after successful transaction
      setTimeout(() => window.location.reload(), 2000);
    }
  }

  const reject = async () => {
    if (!isConnected) {
      toast.error("Please connect your wallet first");
      return;
    }
    
    if (!id) {
      toast.error("Bet ID not found");
      return;
    }

    const result = await rejectBet(Number(id));
    if (result.success) {
      toast.success("Bet rejected successfully!");
      // Refresh bet details after successful transaction
      setTimeout(() => window.location.reload(), 2000);
    }
  }

  const shareLink = async () => {
    // Only pass betId in the URL, no other parameters needed
    const url = `${window.location.origin}/dare/${id}?t=${Date.now()}`
    try {
      await sdk.actions.composeCast({ text: url })
      toast.success("Cast created successfully!")
      return
    } catch (err) {
      console.error('Failed to create cast:', err)
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success("Link copied to clipboard!")
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
      toast.error("Failed to copy link")
      window.prompt('Copy dare link:', url)
    }
  }

  // Calculate bet state for countdown (recalculated every second using currentTime)
  const betState = useMemo(() => {
    if (!betDetails) return null;
    return getCurrentState({
      lastUpdatedStatus: betDetails.status,
      acceptanceDeadline: betDetails.acceptanceDeadline,
      proofSubmissionDeadline: betDetails.proofSubmissionDeadline,
      proofAcceptanceDeadline: betDetails.proofAcceptanceDeadline,
      mediationDeadline: betDetails.mediationDeadline,
      isClosed: betDetails.isClosed
    });
  }, [betDetails, currentTime]) // Recalculate when currentTime changes

  // Get status and pending information (after betState is defined)
  const statusLabel = hasEssentialData ? getBetStatusLabel(betState?.currentStatus || status) : ''
  const statusColorClass = hasEssentialData ? getBetStatusColor(betState?.currentStatus || status) : ''
  
  // Determine what's pending and from whose perspective
  const getPendingInfo = () => {
    if (!hasEssentialData || !betState) return null
    
    // Debug info
    console.log('Debug info:', {
      status: betState.currentStatus,
      isChallenger,
      isChallengee,
      activeAddress,
      challenger: betDetails?.challenger,
      challengee: betDetails?.challengee
    })
    
    if (betState.currentStatus === 'OPEN') {
      if (isChallengee) return 'Your turn to accept or reject'
      return 'Waiting for challengee to respond'
    } else if (betState.currentStatus === 'ACCEPTED') {
      if (isChallengee) return 'Your turn to submit proof'
      return 'Waiting for challenger to submit proof'
    } else if (betState.currentStatus === 'PROOF_SUBMITTED') {
      if (isChallenger) return 'Your turn to review proof'
      return 'Waiting for proof review'
    } else if (betState.currentStatus === 'PROOF_DISPUTED') {
      return 'Awaiting mediation'
    }
    return null
  }
  
  const pendingInfo = getPendingInfo()

  // Calculate the total duration for the current phase
  const getPhaseDisplay = () => {
    if (!hasEssentialData || !betState || !betDetails) return '—'
    
    if (betState.currentStatus === 'OPEN') {
      // Show total time from bet creation to acceptance deadline
      const createdTime = betDetails.createdAt.getTime()
      const acceptanceTime = betDetails.acceptanceDeadline.getTime()
      const totalDuration = acceptanceTime - createdTime
      return formatTimeRemaining(totalDuration)
    } else if (betState.currentStatus === 'ACCEPTED') {
      // Show total time for proof submission phase
      const acceptanceTime = betDetails.acceptanceDeadline.getTime()
      const proofTime = betDetails.proofSubmissionDeadline.getTime()
      const totalDuration = proofTime - acceptanceTime
      return formatTimeRemaining(totalDuration)
    } else if (betState.currentStatus === 'PROOF_SUBMITTED') {
      // Show total time for proof review phase
      const proofSubmissionTime = betDetails.proofSubmissionDeadline.getTime()
      const proofAcceptanceTime = betDetails.proofAcceptanceDeadline.getTime()
      const totalDuration = proofAcceptanceTime - proofSubmissionTime
      return formatTimeRemaining(totalDuration)
    }
    
    return formatTimeRemaining(betState.timeRemaining)
  }

  const formatCountdown = (timeRemaining: number) => {
    if (timeRemaining <= 0) return "00:00:00"
    
    const totalHours = Math.floor(timeRemaining / (1000 * 60 * 60))
    const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000)
    
    // If more than 24 hours, show days:hours:minutes format
    if (totalHours >= 24) {
      const days = Math.floor(totalHours / 24)
      const hours = totalHours % 24
      return `${days}d ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
    }
    
    // Standard hours:minutes:seconds format
    return `${totalHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  return (
    <main className="min-h-dvh bg-gray-50 text-foreground">
      <div className="mx-auto w-full max-w-xl">
        {/* Purple Header */}
        <div className="relative overflow-hidden rounded-b-[60px] bg-[#7C3AED] text-white pt-16 pb-8 px-6">
          {/* Challenge Header */}
          <div className="text-center mb-8">
            <div className="text-2xl font-bold mb-2">
              {hasEssentialData ? `@${from} has challenged you` : 'Loading challenge...'}
            </div>
          </div>

          {/* Chat Bubble Interface */}
          <div className="relative mb-8">
            {hasEssentialData ? (
              <>
                {/* Challenger bubble (left side) */}
                <div className="flex items-start gap-3 mb-4">
                  {betDetails?.challengerPfp ? (
                    <img 
                      src={betDetails.challengerPfp} 
                      alt={from} 
                      className="w-12 h-12 rounded-full border-2 border-white" 
                    />
                  ) : (
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-lg">
                        {from.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="bg-[#6B46C1] px-4 py-2 rounded-2xl rounded-tl-md">
                    <span className="text-white font-medium">@{from}</span>
                  </div>
                </div>

                {/* Challenge Text Bubble (center) */}
                <div className="bg-white rounded-3xl p-6 mx-4 relative shadow-lg">
                  <div className="text-[#7C3AED] text-xl font-bold text-center">
                    {description}
                  </div>
                  {/* Bubble pointer to challengee */}
                  <div className="absolute -bottom-2 right-8 w-0 h-0 border-l-[16px] border-l-transparent border-r-[16px] border-r-transparent border-t-[16px] border-t-white"></div>
                </div>

                {/* Challengee bubble (right side) */}
                <div className="flex items-end gap-3 justify-end mt-4">
                  <div className="bg-[#6B46C1] px-4 py-2 rounded-2xl rounded-br-md">
                    <span className="text-white font-medium">@{to}</span>
                  </div>
                  {betDetails?.challengeePfp ? (
                    <img 
                      src={betDetails.challengeePfp} 
                      alt={to} 
                      className="w-12 h-12 rounded-full border-2 border-white" 
                    />
                  ) : (
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-lg">
                        {to.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Loading state for chat bubbles */
              <div className="space-y-4">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-12 h-12 bg-white/20 rounded-full animate-pulse"></div>
                  <div className="bg-white/20 px-4 py-2 rounded-2xl rounded-tl-md animate-pulse">
                    <div className="w-20 h-4 bg-white/30 rounded"></div>
                  </div>
                </div>
                
                <div className="bg-white rounded-3xl p-6 mx-4 relative shadow-lg">
                  <div className="text-center space-y-2">
                    <div className="h-6 bg-gray-200 rounded mx-auto w-3/4 animate-pulse"></div>
                    <div className="h-6 bg-gray-200 rounded mx-auto w-1/2 animate-pulse"></div>
                  </div>
                </div>
                
                <div className="flex items-end gap-3 justify-end mt-4">
                  <div className="bg-white/20 px-4 py-2 rounded-2xl rounded-br-md animate-pulse">
                    <div className="w-16 h-4 bg-white/30 rounded"></div>
                  </div>
                  <div className="w-12 h-12 bg-white/20 rounded-full animate-pulse"></div>
                </div>
              </div>
            )}
          </div>

          {/* Pool Amount and Time Limit Circles */}
          <div className="flex justify-center gap-8 mb-8">
            <div className="text-center">
              <div className="text-white text-lg font-bold mb-2">Pool Amount</div>
              <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center">
                {hasEssentialData ? (
                  <span className="text-white text-xl font-bold">${stake}</span>
                ) : (
                  <div className="w-12 h-6 bg-gray-600 rounded animate-pulse"></div>
                )}
              </div>
            </div>
            <div className="text-center">
              <div className="text-white text-lg font-bold mb-2">Time Limit</div>
              <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center">
                {hasEssentialData && betState ? (
                  <span className="text-white text-lg font-bold">
                    {getPhaseDisplay()}
                  </span>
                ) : (
                  <div className="w-8 h-4 bg-gray-600 rounded animate-pulse"></div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Countdown Timer Section - matches target design */}
        {hasEssentialData && betState && betState.timeRemaining > 0 && status === 'OPEN' && isChallengee && (
          <div className="bg-purple-100 mx-6 rounded-2xl p-4 shadow-sm mb-6">
            <div className="flex items-center justify-between">
              <span className="text-gray-700 font-medium">Time Left to Accept</span>
              <span className="text-[#7C3AED] text-2xl font-bold">
                {formatCountdown(betState.timeRemaining)}
              </span>
            </div>
          </div>
        )}

        {/* Accept/Reject Buttons - matches target design */}
        {hasEssentialData && status === 'OPEN' && isChallengee && (
          <div className="px-6 mb-6">
            <div className="flex gap-4">
              <button 
                onClick={accept} 
                disabled={isSubmitting || isApproving || !isConnected || !id}
                className="flex-1 bg-green-500 text-white py-4 rounded-2xl font-bold text-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isApproving ? `Approving ${token.symbol}...` : isSubmitting ? "Processing..." : "Accept Bet"}
              </button>
              <button 
                onClick={reject} 
                disabled={isSubmitting || isApproving || !isConnected || !id}
                className="flex-1 border-2 border-red-500 text-red-500 py-4 rounded-2xl font-bold text-lg hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Processing..." : "Reject Bet"}
              </button>
            </div>
          </div>
        )}

        {/* Content Area for other states and information */}
        <div className="px-6 py-6 space-y-6">
          {/* Status Information */}
          {hasEssentialData && (
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`text-sm px-3 py-1 rounded-full font-medium ${statusColorClass}`}>
                    {statusLabel}
                  </span>
                  {pendingInfo && (
                    <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                      {pendingInfo}
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  Bet #{id}
                </div>
              </div>
            </div>
          )}

          {/* Status Information for non-challengees */}
          {hasEssentialData && status === 'OPEN' && !isChallengee && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
              <div className="text-blue-800 text-center">
                <div className="font-medium mb-1">Bet Status: Open</div>
                <div className="text-sm">
                  {activeAddress ? 
                    "Only the challengee can accept or reject this bet." :
                    "Connect your wallet to interact with bets."
                  }
                </div>
                {betState && betState.timeRemaining > 0 && (
                  <div className="text-xs mt-2 text-blue-600">
                    Time remaining: {formatCountdown(betState.timeRemaining)}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Other Status Actions */}
          {hasEssentialData && (status === 'ACCEPTED' || status === 'PROOF_SUBMITTED') && (
            <div className="flex gap-4">
              <button 
                onClick={() => router.push(`/dare/${id}/proof`)}
                className="flex-1 bg-[#7C3AED] text-white py-4 rounded-2xl font-bold text-lg hover:bg-[#6B46C1] transition-colors"
              >
                Submit Proof
              </button>
              <button 
                onClick={() => router.push(`/dare/${id}/review`)}
                className="flex-1 border-2 border-[#7C3AED] text-[#7C3AED] py-4 rounded-2xl font-bold text-lg hover:bg-purple-50 transition-colors"
              >
                Review Proof
              </button>
            </div>
          )}

          {/* Back button and share */}
          {hasEssentialData && (
            <div className="flex items-center justify-between pt-4">
              <Link href="/" className="text-gray-600 hover:text-gray-800 flex items-center gap-2">
                <ChevronLeftIcon className="h-5 w-5" />
                <span>Back</span>
              </Link>
              <div className="flex items-center gap-3">
                {copied && <span className="text-sm text-green-600">Link copied</span>}
                <button onClick={shareLink} className="text-[#7C3AED] hover:text-[#6B46C1] text-sm font-medium">
                  Share
                </button>
              </div>
            </div>
          )}

          {/* Status and Error Display */}
          {betDetails?.error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
              <span className="text-red-600 text-sm">{betDetails.error}</span>
            </div>
          )}

          {!hasEssentialData && !betDetails?.error && (
            <div className="text-center py-8">
              <div className="text-gray-600">Loading bet details...</div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}


