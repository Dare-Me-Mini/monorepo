'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { sdk } from '@farcaster/miniapp-sdk'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useBettingHouse } from '@/hooks/useBettingHouse'
import { useAccount } from 'wagmi'
import toast from 'react-hot-toast'
import { getTokenBySymbol, DEFAULT_TOKEN, formatTokenAmount, type Token } from '@/lib/tokens'
import { useBetDetails } from '@/hooks/useBetDetails'
import { getBetStatusColor } from '@/lib/indexer'

type DareStatus = 'pending' | 'accepted' | 'rejected' | 'completed'

export default function DareClient({ id }: { id: string }) {
  const router = useRouter()
  const qp = useSearchParams()
  const { isConnected } = useAccount()
  const { acceptBet, rejectBet, isSubmitting, isApproving } = useBettingHouse()
  const [copied, setCopied] = useState(false)

  // Get bet ID from URL params
  const urlBetId = qp.get('betId')
  const betDetails = useBetDetails(urlBetId)

  // Fallback to URL params if indexer data not available
  const description = betDetails?.condition || qp.get('desc') || 'A bold new challenge'
  const stake = betDetails?.amount || qp.get('stake') || '20'
  const token = betDetails?.token || getTokenBySymbol(qp.get('token') || 'USDC') || DEFAULT_TOKEN
  const from = qp.get('from') || 'Someone'
  const to = qp.get('to') || 'Friend'
  const status = betDetails?.status || 'OPEN'
  const statusLabel = betDetails?.statusLabel || 'Open'

  useEffect(() => {
    ;(async () => {
      await sdk.actions.ready()
    })()
  }, [])

  const accept = async () => {
    if (!isConnected) {
      toast.error("Please connect your wallet first");
      return;
    }
    
    if (!urlBetId) {
      toast.error("Bet ID not found");
      return;
    }

    const result = await acceptBet(Number(urlBetId));
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
    
    if (!urlBetId) {
      toast.error("Bet ID not found");
      return;
    }

    const result = await rejectBet(Number(urlBetId));
    if (result.success) {
      toast.success("Bet rejected successfully!");
      // Refresh bet details after successful transaction
      setTimeout(() => window.location.reload(), 2000);
    }
  }

  const shareLink = async () => {
    const params = new URLSearchParams({
      desc: description,
      stake: stake,
      from,
      to,
      status: statusLabel,
      token: token.symbol
    })
    if (urlBetId) params.set('betId', urlBetId)
    const url = `${window.location.origin}/dare/${id}?${params.toString()}&t=${Date.now()}`
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

  return (
    <main className="min-h-dvh p-4 md:p-6 bg-background text-foreground">
      <div className="mx-auto w-full max-w-xl space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-white/80 hover:text-white">
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-3">
            {copied && <span className="text-sm text-emerald-300">Link copied</span>}
            <Button variant="outline" onClick={shareLink}>
              Share
            </Button>
          </div>
        </div>

        <Card className="bg-card border-border text-card-foreground">
          <CardHeader>
            <CardTitle className="text-base">
              {betDetails?.loading ? "Loading..." : "Dare"}
              {betDetails?.error && <span className="text-red-500 text-sm ml-2">({betDetails.error})</span>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="text-lg font-medium">{description}</div>
              <div className={`text-[10px] px-2 py-0.5 rounded-full uppercase ${getBetStatusColor(status)}`}>
                {statusLabel}
              </div>
            </div>
            <div className="text-foreground/70 text-sm">From {from} → {to}</div>
            <div className="text-foreground font-semibold flex items-center gap-1">
              <span>{token.icon}</span>
              <span>{stake} {token.symbol} stake</span>
            </div>
            
            {betDetails && (
              <div className="text-xs text-foreground/60 space-y-1">
                {betDetails.proof && (
                  <div>Proof: {betDetails.proof}</div>
                )}
                <div>Created: {betDetails.createdAt.toLocaleDateString()}</div>
                {!betDetails.isClosed && (
                  <div>Deadline: {betDetails.acceptanceDeadline.toLocaleDateString()}</div>
                )}
              </div>
            )}

            <div className="pt-2 flex gap-3">
              {status === 'OPEN' && (
                <>
                  <Button onClick={accept} disabled={isSubmitting || isApproving || !isConnected || !urlBetId}>
                    {isApproving ? `Approving ${token.symbol}...` : isSubmitting ? "Processing..." : "Accept"}
                  </Button>
                  <Button variant="outline" onClick={reject} disabled={isSubmitting || isApproving || !isConnected || !urlBetId}>
                    {isSubmitting ? "Processing..." : "Reject"}
                  </Button>
                </>
              )}
              {(status === 'ACCEPTED' || status === 'PROOF_SUBMITTED') && (
                <>
                  <Button variant="outline" onClick={() => {
                    const params = new URLSearchParams({ 
                      desc: description, 
                      stake: stake, 
                      from, 
                      to, 
                      status,
                      token: token.symbol,
                      ...(urlBetId && { betId: urlBetId })
                    })
                    router.push(`/dare/${id}/proof?${params.toString()}`)
                  }}>Submit Proof</Button>
                  <Button variant="outline" onClick={() => {
                    const params = new URLSearchParams({ 
                      desc: description, 
                      stake: stake, 
                      from, 
                      to, 
                      status,
                      token: token.symbol,
                      ...(urlBetId && { betId: urlBetId })
                    })
                    router.push(`/dare/${id}/review?${params.toString()}`)
                  }}>Review Proof</Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}


