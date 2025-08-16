'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useBettingHouse } from '@/hooks/useBettingHouse'
import { useBetDetails } from '@/hooks/useBetDetails'
import { useAccount } from 'wagmi'
import { Clock, ExternalLink, AlertTriangle, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'

interface ParsedProof {
  url: string;
  note?: string;
  fileName?: string;
}

export default function ReviewClient({ id }: { id: string }) {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const { acceptProof, disputeProof, isSubmitting } = useBettingHouse()
  const betDetails = useBetDetails(id)
  const [parsedProof, setParsedProof] = useState<ParsedProof | null>(null)

  // Parse proof data from bet details
  useEffect(() => {
    if (betDetails?.proof) {
      try {
        // Proof format: "url - note" or just "url"
        const proofText = betDetails.proof.trim()
        if (proofText.includes(' - ')) {
          const [url, ...noteParts] = proofText.split(' - ')
          setParsedProof({
            url: url.trim(),
            note: noteParts.join(' - ').trim(),
            fileName: extractFileName(url.trim())
          })
        } else {
          setParsedProof({
            url: proofText,
            fileName: extractFileName(proofText)
          })
        }
      } catch (error) {
        console.error('Failed to parse proof:', error)
        setParsedProof(null)
      }
    } else {
      setParsedProof(null)
    }
  }, [betDetails?.proof])

  const extractFileName = (url: string): string | undefined => {
    try {
      const urlObj = new URL(url)
      const pathname = urlObj.pathname
      const fileName = pathname.split('/').pop()
      return fileName && fileName.includes('.') ? fileName : undefined
    } catch {
      return undefined
    }
  }

  // Determine user role
  const isChallenger = address && betDetails?.challenger.toLowerCase() === address.toLowerCase()
  const isChallengee = address && betDetails?.challengee.toLowerCase() === address.toLowerCase()
  const betId = Number(id)

  // Redirect if wallet is not connected
  useEffect(() => {
    if (!isConnected) {
      toast.error('Please connect your wallet to review proof')
      router.replace('/')
      return
    }
  }, [isConnected, router])

  // Don't render the page if wallet is not connected
  if (!isConnected) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="text-center">
          <div className="text-lg font-semibold mb-2">Wallet Required</div>
          <div className="text-sm text-muted-foreground mb-4">
            Please connect your wallet to review proof
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
        </div>
      </div>
    )
  }

  // Show loading state while fetching bet details
  if (betDetails?.loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <div className="text-lg font-semibold">Loading bet details...</div>
        </div>
      </div>
    )
  }

  // Show error state
  if (betDetails?.error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <div className="text-lg font-semibold mb-2">Error Loading Bet</div>
          <div className="text-sm text-muted-foreground mb-4">{betDetails.error}</div>
          <button
            onClick={() => router.push('/')}
            className="border-2 border-gray-300 text-gray-600 px-6 py-2 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    )
  }

  const acknowledge = async () => {
    if (!isConnected) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!betId) {
      toast.error("Bet ID not found");
      return;
    }

    const result = await acceptProof(betId);
    if (result.success) {
      toast.success("Proof accepted successfully!");
      router.push(`/dare/${id}`)
    }
  }

  const dispute = async () => {
    if (!isConnected) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!betId) {
      toast.error("Bet ID not found");
      return;
    }

    const result = await disputeProof(betId);
    if (result.success) {
      toast.success("Proof disputed successfully!");
      router.push(`/dare/${id}`)
    }
  }

  const goToProof = () => {
    router.push(`/dare/${id}/proof`)
  }

  const goBack = () => {
    router.push(`/dare/${id}`)
  }

  // Get display names
  const challengerName = betDetails?.challengerUsername || `${betDetails?.challenger?.slice(0, 6)}...${betDetails?.challenger?.slice(-4)}`
  const challengeeName = betDetails?.challengeeUsername || `${betDetails?.challengee?.slice(0, 6)}...${betDetails?.challengee?.slice(-4)}`

  return (
    <main className="min-h-dvh bg-gray-50 text-foreground">
      <div className="mx-auto w-full max-w-xl pb-32">
        {/* Purple Header */}
        <div className="relative overflow-hidden rounded-b-[60px] bg-[#7C3AED] text-white pt-16 pb-8 px-6">
          {/* Challenge Header */}
          <div className="text-center mb-8">
            <div className="text-2xl font-bold mb-2">
              @{challengerName} has challenged you
            </div>
          </div>

          {/* Chat Bubble Interface */}
          <div className="relative mb-8">
            {/* Challenger bubble (left side) */}
            <div className="flex items-start gap-3 mb-4">
              {betDetails?.challengerPfp ? (
                <img
                  src={betDetails.challengerPfp}
                  alt={challengerName}
                  className="w-12 h-12 rounded-full border-2 border-white"
                />
              ) : (
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-lg">
                    {challengerName.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="bg-[#6B46C1] px-4 py-2 rounded-2xl rounded-tl-md">
                <span className="text-white font-medium">@{challengerName}</span>
              </div>
            </div>

            {/* Challenge Text Bubble (center) */}
            <div className="bg-white rounded-3xl p-6 mx-4 relative shadow-lg">
              <div className="text-[#7C3AED] text-xl font-bold text-center">
                {betDetails?.condition || 'Loading challenge...'}
              </div>
              {/* Bubble pointer to challengee */}
              <div className="absolute -bottom-2 right-8 w-0 h-0 border-l-[16px] border-l-transparent border-r-[16px] border-r-transparent border-t-[16px] border-t-white"></div>
            </div>

            {/* Challengee bubble (right side) */}
            <div className="flex items-end gap-3 justify-end mt-4">
              <div className="bg-[#6B46C1] px-4 py-2 rounded-2xl rounded-br-md">
                <span className="text-white font-medium">@{challengeeName}</span>
              </div>
              {betDetails?.challengeePfp ? (
                <img
                  src={betDetails.challengeePfp}
                  alt={challengeeName}
                  className="w-12 h-12 rounded-full border-2 border-white"
                />
              ) : (
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-lg">
                    {challengeeName.charAt(0).toUpperCase()}
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
                <span className="text-white text-xl font-bold">${betDetails?.amount || '0'}</span>
              </div>
            </div>
            <div className="text-center">
              <div className="text-white text-lg font-bold mb-2">Time Limit</div>
              <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center">
                <span className="text-white text-lg font-bold">2 Days</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area for proof review */}
        <div className="px-6 py-6 space-y-6">
          {renderProofContent()}
        </div>
      </div>
    </main>
  )

  function renderProofContent() {
    // No proof submitted yet
    if (!betDetails?.proof || betDetails.proof.trim() === '') {
      if (isChallengee) {
        return (
          <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
            <div className="text-lg font-semibold mb-2 text-gray-800">No Proof Submitted Yet</div>
            <p className="text-gray-600 mb-4">
              You haven't submitted proof for this challenge yet.
            </p>
            <button
              onClick={goToProof}
              className="bg-[#7C3AED] text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-[#6B46C1] transition-colors w-full"
            >
              Submit Proof
            </button>
          </div>
        )
      } else {
        return (
          <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
            <div className="text-lg font-semibold mb-2 text-gray-800">Waiting for Proof</div>
            <p className="text-gray-600">
              {challengeeName} hasn't submitted proof yet.
            </p>
          </div>
        )
      }
    }

    // Proof has been submitted
    return (
      <div className="space-y-6">
        {/* Proof Section */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="text-lg font-semibold text-gray-800 mb-4">
            Proof
          </div>

          {/* Proof Media/Content */}
          {parsedProof && (
            <div className="space-y-4">
              {/* Media Preview */}
              <div className="bg-gray-200 rounded-2xl overflow-hidden aspect-video relative">
                {parsedProof.url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                  <img
                    src={parsedProof.url}
                    alt="Proof"
                    className="w-full h-full object-cover"
                  />
                ) : parsedProof.url.match(/\.(mp4|mov|avi|webm)$/i) ? (
                  <video
                    src={parsedProof.url}
                    className="w-full h-full object-cover"
                    controls
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-300">
                    <div className="text-center">
                      <ExternalLink className="w-12 h-12 text-gray-500 mx-auto mb-2" />
                      <p className="text-gray-600 text-sm">Click to view proof</p>
                    </div>
                  </div>
                )}

                {/* View proof overlay */}
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                  <span className="text-white text-sm font-medium bg-black/50 px-2 py-1 rounded">
                    {parsedProof.fileName || 'proof-file'}
                  </span>
                  <button
                    onClick={() => window.open(parsedProof.url, '_blank')}
                    className="text-white text-sm bg-black/50 px-3 py-1 rounded flex items-center gap-1 hover:bg-black/70 transition-colors"
                  >
                    View proof <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Note if available */}
              {parsedProof.note && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="text-sm font-medium text-gray-700 mb-1">Note:</div>
                  <p className="text-sm text-gray-600">{parsedProof.note}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {renderActionButtons()}
      </div>
    )
  }

  function renderActionButtons() {
    const status = betDetails?.status

    // Challengee view - just show status
    if (isChallengee) {
      if (status === 'PROOF_SUBMITTED') {
        return (
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <div className="flex items-center gap-2 text-yellow-800">
                <Clock className="w-5 h-5" />
                <span className="font-medium">Proof in Review</span>
              </div>
              <p className="text-sm text-yellow-700 mt-1">
                Waiting for {challengerName} to review your proof.
              </p>
            </div>
          </div>
        )
      } else if (status === 'PROOF_DISPUTED') {
        return (
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center gap-2 text-red-800">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-medium">Proof Disputed</span>
              </div>
              <p className="text-sm text-red-700 mt-1">
                Your proof has been disputed. {betDetails?.mediator && betDetails.mediator !== '0x0000000000000000000000000000000000000000' ? 'A mediator will review the case.' : 'The bet has been cancelled and funds returned.'}
              </p>
            </div>
          </div>
        )
      } else if (status === 'COMPLETED_BY_CHALLENGEE') {
        return (
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-center gap-2 text-green-800">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Proof Accepted</span>
              </div>
              <p className="text-sm text-green-700 mt-1">
                Congratulations! Your proof was accepted and you won the bet.
              </p>
            </div>
          </div>
        )
      }
    }

    // Challenger view - can accept or dispute
    if (isChallenger && status === 'PROOF_SUBMITTED') {
      return (
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={acknowledge}
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-br from-green-500 to-green-600 text-white py-4 px-6 rounded-xl font-bold text-lg hover:from-green-600 hover:to-green-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-green-500/50"
            >
              <CheckCircle className="w-6 h-6" />
              <span>{isSubmitting ? 'Processing...' : 'Accept Proof'}</span>
            </button>
            <button
              onClick={dispute}
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 bg-transparent border-2 border-red-500 text-red-500 py-4 px-6 rounded-xl font-bold text-lg hover:bg-red-500 hover:text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-red-500/50"
            >
              <AlertTriangle className="w-6 h-6" />
              <span>{isSubmitting ? 'Processing...' : 'Dispute Proof'}</span>
            </button>
          </div>
        </div>
      )
    }

    // Default status display
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <div className="text-center text-gray-600">
            <p className="font-medium">{betDetails?.statusLabel}</p>
          </div>
        </div>
      </div>
    )
  }
}


