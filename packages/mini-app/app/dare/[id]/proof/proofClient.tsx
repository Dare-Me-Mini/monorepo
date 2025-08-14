'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import ThemeToggle from '@/components/ThemeToggle'

type Proof = { url: string; note: string; createdAt: number }

export default function ProofClient({ id }: { id: string }) {
  const qp = useSearchParams()
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [note, setNote] = useState('')
  const [saved, setSaved] = useState(false)

  const storageKey = useMemo(() => `dare-proof:${id}`, [id])

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey)
      if (raw) {
        const p = JSON.parse(raw) as Proof
        setUrl(p.url || '')
        setNote(p.note || '')
      }
    } catch {}
  }, [storageKey])

  const save = () => {
    const p: Proof = { url: url.trim(), note: note.trim(), createdAt: Date.now() }
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(p))
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {}
  }

  const openReview = () => {
    const params = new URLSearchParams(qp.toString())
    router.push(`/dare/${id}/review?${params.toString()}`)
  }

  return (
    <main className="min-h-dvh p-4 md:p-6 bg-background text-foreground">
      <div className="mx-auto w-full max-w-xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Submit proof</h1>
          <ThemeToggle />
        </div>

        <Card className="bg-card border-border text-card-foreground">
          <CardHeader>
            <CardTitle className="text-base">Upload or paste a link</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url">Proof URL</Label>
              <Input id="url" placeholder="https://..." value={url} onChange={(e) => setUrl(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="note">Note (optional)</Label>
              <Input id="note" placeholder="Any context" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={openReview}>Go to review</Button>
              <Button onClick={save}>{saved ? 'Saved' : 'Save'}</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}


