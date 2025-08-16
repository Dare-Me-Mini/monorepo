'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useBettingHouse } from '@/hooks/useBettingHouse'
import { useAccount } from 'wagmi'
import toast from 'react-hot-toast'

type Proof = { url: string; note: string; createdAt: number }

export default function ReviewClient({ id }: { id: string }) {
  const router = useRouter()
  const { isConnected } = useAccount()
  const { acceptProof, disputeProof, isSubmitting } = useBettingHouse()
  const [proof, setProof] = useState<Proof | null>(null)

  // Use the id from the URL path as the betId
  const betId = Number(id)

  const storageKey = useMemo(() => `dare-proof:${id}`, [id])

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey)
      if (raw) setProof(JSON.parse(raw) as Proof)
    } catch {}
  }, [storageKey])

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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-lg font-semibold mb-2">Wallet Required</div>
          <div className="text-sm text-muted-foreground mb-4">
            Please connect your wallet to review proof
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
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
      // Mark challenge as completed locally
      try {
        const raw = window.localStorage.getItem('dares')
        if (raw) {
          const dares = JSON.parse(raw) as Array<any>
          const idx = dares.findIndex((d) => d.id === id)
          if (idx >= 0) {
            dares[idx].status = 'completed'
            window.localStorage.setItem('dares', JSON.stringify(dares))
          }
        }
      } catch {}
      // Go back to dare detail page
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
    }
  }

  const goToProof = () => {
    router.push(`/dare/${id}/proof`)
  }

  return (
    <main className="min-h-dvh p-4 md:p-6 bg-background text-foreground">
      <div className="mx-auto w-full max-w-xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Review proof</h1>
        </div>

        <Card className="bg-card border-border text-card-foreground">
          <CardHeader>
            <CardTitle className="text-base">Submitted by friend</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!proof && (
              <div className="text-sm text-foreground/70">No proof found. Ask your friend to submit one.
                <div className="mt-3">
                  <Button variant="outline" onClick={goToProof}>Go to submit page</Button>
                </div>
              </div>
            )}
            {proof && (
              <div className="space-y-3">
                <div className="text-sm"><span className="opacity-70">URL:</span> <a className="underline" href={proof.url} target="_blank" rel="noreferrer">{proof.url}</a></div>
                <div className="text-sm"><span className="opacity-70">Note:</span> {proof.note || '—'}</div>
                <div className="text-xs text-foreground/60">Submitted {new Date(proof.createdAt).toLocaleString()}</div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={dispute} disabled={isSubmitting || !isConnected || !betId}>
                    {isSubmitting ? 'Processing...' : 'Dispute'}
                  </Button>
                  <Button onClick={acknowledge} disabled={isSubmitting || !isConnected || !betId}>
                    {isSubmitting ? 'Processing...' : 'Accept & Close'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}


