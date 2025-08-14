'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { sdk } from '@farcaster/miniapp-sdk'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import ThemeToggle from '@/components/ThemeToggle'

type DareStatus = 'pending' | 'accepted' | 'rejected' | 'completed'

export default function DareClient({ id }: { id: string }) {
  const router = useRouter()
  const qp = useSearchParams()
  const [status, setStatus] = useState<DareStatus>('pending')
  const [copied, setCopied] = useState(false)

  const description = qp.get('desc') || 'A bold new challenge'
  const stake = Number(qp.get('stake') || '20') || 20
  const from = qp.get('from') || 'Someone'
  const to = qp.get('to') || 'Friend'
  const initialStatus = (qp.get('status') as DareStatus) || 'pending'

  const storageKey = useMemo(() => `dare-status:${id}`, [id])

  useEffect(() => {
    ;(async () => {
      await sdk.actions.ready()
    })()
  }, [])

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey) as DareStatus | null
      setStatus(saved || initialStatus)
    } catch {
      setStatus(initialStatus)
    }
  }, [initialStatus, storageKey])

  const updateStatusEverywhere = useCallback((next: DareStatus) => {
    setStatus(next)
    try {
      window.localStorage.setItem(storageKey, next)
      const raw = window.localStorage.getItem('dares')
      if (raw) {
        const dares = JSON.parse(raw) as Array<any>
        const idx = dares.findIndex((d) => d.id === id)
        if (idx >= 0) {
          dares[idx].status = next
          window.localStorage.setItem('dares', JSON.stringify(dares))
        }
      }
    } catch {}
  }, [id, storageKey])

  const accept = () => updateStatusEverywhere('accepted')
  const reject = () => updateStatusEverywhere('rejected')
  const complete = () => updateStatusEverywhere('completed')

  const shareLink = async () => {
    const params = new URLSearchParams({ desc: description, stake: String(stake), from, to, status })
    const url = `${window.location.origin}/dare/${id}?${params.toString()}&t=${Date.now()}`
    try {
      await sdk.actions.composeCast({ text: url })
      return
    } catch {}
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
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
            <ThemeToggle />
            {copied && <span className="text-sm text-emerald-300">Link copied</span>}
            <Button variant="outline" onClick={shareLink}>
              Share
            </Button>
          </div>
        </div>

        <Card className="bg-card border-border text-card-foreground">
          <CardHeader>
            <CardTitle className="text-base">Dare</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="text-lg font-medium">{description}</div>
              <div className="text-[10px] px-2 py-0.5 border border-border rounded-full text-foreground/70 uppercase">{status}</div>
            </div>
            <div className="text-foreground/70 text-sm">From {from} → {to}</div>
            <div className="text-foreground font-semibold">${stake.toLocaleString()} stake</div>

            <div className="pt-2 flex gap-3">
              {status === 'pending' && (
                <>
                  <Button onClick={accept}>Accept</Button>
                  <Button variant="outline" onClick={reject}>Reject</Button>
                </>
              )}
              {status === 'accepted' && (
                <Button onClick={complete}>Mark Completed</Button>
              )}
              {status !== 'rejected' && (
                <>
                  <Button variant="outline" onClick={() => {
                    const params = new URLSearchParams({ desc: description, stake: String(stake), from, to, status })
                    router.push(`/dare/${id}/proof?${params.toString()}`)
                  }}>Submit Proof</Button>
                  <Button variant="outline" onClick={() => {
                    const params = new URLSearchParams({ desc: description, stake: String(stake), from, to, status })
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


