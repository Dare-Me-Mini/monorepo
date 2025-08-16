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
import { getBetStatusColor } from '@/lib/indexer'
import { getCurrentState, formatTimeRemaining } from '@/lib/betState'

type DareStatus = 'pending' | 'accepted' | 'rejected' | 'completed'

export default function DareClient({ id }: { id: string }) {
  const router = useRouter()
  const qp = useSearchParams()
  const { isConnected } = useAccount()
  const { acceptBet, rejectBet, isSubmitting, isApproving } = useBettingHouse()
  const [copied, setCopied] = useState(false)
  const [currentTime, setCurrentTime] = useState(Date.now())

  // Use the id from the URL path as the betId and fetch data from database
  const betDetails = useBetDetails(id)

  // Use data from database with fallback values while loading
  const description = betDetails?.condition || 'A bold new challenge'
  const stake = betDetails?.amount || '20'
  const token = betDetails?.token || DEFAULT_TOKEN
  const from = betDetails?.challengerUsername || 'Someone'
  const to = betDetails?.challengeeUsername || 'Friend'
  const status = betDetails?.status || 'OPEN'
  const statusLabel = betDetails?.statusLabel || 'Open'
  const isLoading = betDetails?.loading || !betDetails

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

  // Calculate bet state for countdown (recalculated every second)
  const betState = betDetails ? getCurrentState({
    lastUpdatedStatus: betDetails.status,
    acceptanceDeadline: betDetails.acceptanceDeadline,
    proofSubmissionDeadline: betDetails.proofSubmissionDeadline,
    proofAcceptanceDeadline: betDetails.proofAcceptanceDeadline,
    mediationDeadline: betDetails.mediationDeadline,
    isClosed: betDetails.isClosed
  }) : null

  const formatCountdown = (timeRemaining: number) => {
    if (timeRemaining <= 0) return "00:00:00"
    const hours = Math.floor(timeRemaining / (1000 * 60 * 60))
    const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000)
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  return (
    <main className="min-h-dvh bg-gray-50 text-foreground">
      <div className="mx-auto w-full max-w-xl">
        {/* Purple Header */}
        <div className="relative overflow-hidden rounded-b-[60px] bg-[#7C3AED] text-white pt-4 pb-8 px-6">
          {/* Back button and share */}
          <div className="flex items-center justify-between mb-6">
            <Link href="/" className="text-white/80 hover:text-white">
              <ChevronLeftIcon className="h-6 w-6" />
            </Link>
            <div className="flex items-center gap-3">
              {copied && <span className="text-sm text-white/80">Link copied</span>}
              <button onClick={shareLink} className="text-white/80 hover:text-white text-sm">
                Share
              </button>
            </div>
          </div>

          {/* Challenge Header */}
          <div className="text-center mb-8">
            <div className="text-2xl font-bold mb-2">
              @{from} has challenged you
            </div>
          </div>

          {/* Chat Bubble Interface */}
          <div className="relative mb-8">
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
          </div>

          {/* Pool Amount and Time Limit Circles */}
          <div className="flex justify-center gap-8 mb-8">
            <div className="text-center">
              <div className="text-white text-lg font-bold mb-2">Pool Amount</div>
              <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center">
                <span className="text-white text-xl font-bold">${stake}</span>
              </div>
            </div>
            <div className="text-center">
              <div className="text-white text-lg font-bold mb-2">Time Limit</div>
              <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center">
                <span className="text-white text-lg font-bold">
                  {betState ? formatTimeRemaining(betState.deadline) : '—'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="px-6 py-6 space-y-6">
          {/* Countdown Timer */}
          {betState && betState.timeRemaining > 0 && status === 'OPEN' && (
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-700 font-medium">Time Left to Accept</span>
                <span className="text-[#7C3AED] text-2xl font-bold">
                  {formatCountdown(betState.timeRemaining)}
                </span>
              </div>
            </div>
          )}

          {/* Accept/Reject Buttons */}
          {status === 'OPEN' && (
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
          )}

          {/* Other Status Actions */}
          {(status === 'ACCEPTED' || status === 'PROOF_SUBMITTED') && (
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

          {/* Status and Error Display */}
          {betDetails?.error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
              <span className="text-red-600 text-sm">{betDetails.error}</span>
            </div>
          )}

          {isLoading && (
            <div className="text-center py-8">
              <div className="text-gray-600">Loading bet details...</div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}


