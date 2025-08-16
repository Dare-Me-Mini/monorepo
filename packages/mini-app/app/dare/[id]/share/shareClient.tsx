'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { sdk } from '@farcaster/miniapp-sdk'
import { useBetDetails } from '@/hooks/useBetDetails'
import { validatePublicEnv } from '@/lib/env'

export default function ShareClient({ id }: { id: string }) {
  const [copied, setCopied] = useState(false)

  // Use the id from the URL path as the betId and fetch data from database
  const betDetails = useBetDetails(id)

  // Use data from database or fallback values while loading
  const desc = betDetails?.condition || 'A bold new challenge'
  const from = betDetails?.challengerUsername || 'You'
  const to = betDetails?.challengeeUsername || 'Friend'
  const isLoading = betDetails?.loading || !betDetails

  const fullLink = useMemo(() => {
    const env = validatePublicEnv();
    // Only pass betId in the URL, no other parameters needed
    return `${env.appUrl}/dare/${id}`
  }, [id])

  useEffect(() => {
    ;(async () => {
      await sdk.actions.ready()
    })()
  }, [])

  const share = async () => {
    // Temporarily disable Farcaster share; navigate to accept/reject page instead
    try {
      await sdk.actions.composeCast({ text: fullLink })
      return
    } catch {}
    // try {
    //   router.push(fullLink)
    //   return
    // } catch {}
    // Fallback: copy link if navigation isn't possible
    try {
      await navigator.clipboard.writeText(fullLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      window.prompt('Copy link:', fullLink)
    }
  }

  return (
    <main className="min-h-dvh bg-background text-foreground pb-24">
      <div className="mx-auto w-full max-w-xl space-y-4">
        <div className="relative overflow-hidden rounded-b-[32px] bg-[#6A33FF] text-white pt-8 pb-5 px-5 shadow-xl bg-cover bg-center" style={{ backgroundImage: "url('/confetti-bg.svg')" }}>
          <div className="text-center font-display font-extrabold text-[26px]">Wooho! Your Bet has been Created</div>
          {/* decorative fold removed */}
        </div>
        <Card className="bg-transparent border-none text-card-foreground mx-3 shadow-none">
          <CardContent className="p-0 space-y-3">
            <div className="relative aspect-[5/4] w-full overflow-hidden rounded-2xl">
              <div className="absolute inset-0" />
              <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 w-[120%] h-[240px] rounded-[999px]" />
              <div className="relative z-10 h-full flex flex-col justify-center items-center px-4">
                <div className="w-full flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-12 w-12 rounded-full overflow-hidden ring-2 ring-white/40">
                      <img alt="from" src={`https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(from)}`} className="h-full w-full object-cover" />
                    </div>
                    <div className="px-3 py-1.5 rounded-full bg-white/20 text-white text-sm font-semibold">@{from.replace(/^@/, '')}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="px-3 py-1.5 rounded-full bg-white/20 text-white text-sm font-semibold">@{to.replace(/^@/, '')}</div>
                    <div className="h-12 w-12 rounded-full overflow-hidden ring-2 ring-white/40">
                      <img alt="to" src={`https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(to)}`} className="h-full w-full object-cover" />
                    </div>
                  </div>
                </div>

                <div className="mt-3 bg-white text-[#1c1c1c] rounded-2xl w-full max-w-[90%] p-4 shadow-xl text-center text-[17px] font-semibold">
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
                      <span className="ml-2">Loading challenge...</span>
                    </div>
                  ) : (
                    <>
                      Challenge is to {desc}
                      <span role="img" aria-label="paper-plane" className="inline-block ml-2">
                        ✈️
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="text-xs text-foreground/70 px-1">The challenge has not been accepted yet</div>
          </CardContent>
        </Card>
        <div className="px-3">
          <Button onClick={share} className="w-full h-12 rounded-2xl bg-black text-white text-base shadow-[0_4px_0_#2b2b2b] active:translate-y-[2px] active:shadow-[0_2px_0_#2b2b2b]">
            {copied ? 'Link Copied!' : 'Share to Farcaster'}
          </Button>
        </div>
      </div>
    </main>
  )
}