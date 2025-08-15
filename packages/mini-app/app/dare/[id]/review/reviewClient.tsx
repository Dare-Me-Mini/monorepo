'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type Proof = { url: string; note: string; createdAt: number }

export default function ReviewClient({ id }: { id: string }) {
  const qp = useSearchParams()
  const router = useRouter()
  const [proof, setProof] = useState<Proof | null>(null)

  const storageKey = useMemo(() => `dare-proof:${id}`, [id])

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey)
      if (raw) setProof(JSON.parse(raw) as Proof)
    } catch {}
  }, [storageKey])

  const acknowledge = () => {
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
    const params = new URLSearchParams(qp.toString())
    router.push(`/dare/${id}?${params.toString()}`)
  }

  const goToProof = () => {
    const params = new URLSearchParams(qp.toString())
    router.push(`/dare/${id}/proof?${params.toString()}`)
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
                <div className="flex justify-end">
                  <Button onClick={acknowledge}>Acknowledge & close</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}


