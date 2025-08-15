"use client"

import { useEffect, useState } from "react"
import { sdk } from "@farcaster/miniapp-sdk"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Rocket, Trophy, Zap } from "lucide-react"
import { SignInButton } from "@farcaster/auth-kit"
import { useAppState } from "@/components/AppStateProvider"

const BrandHeader = () => {
  const { activeAddress, isAuthenticated } = useAppState()
  const displayAddress = activeAddress ? `${activeAddress.slice(0, 6)}…${activeAddress.slice(-4)}` : (isAuthenticated ? '—' : 'Sign in')
  return (
    <div className="relative overflow-hidden rounded-b-[52px] bg-[#6A33FF] text-white pt-8 pb-16 px-6 shadow-xl">
      <div className="flex items-center justify-between">
        <div className="text-2xl font-extrabold font-display">ibet</div>
        <div className="rounded-full px-4 py-2 text-sm bg-white/20 backdrop-blur-sm">
          {!activeAddress && !isAuthenticated ? <SignInButton /> : displayAddress}
        </div>
      </div>
      <div className="mt-8 leading-[0.95]">
        <div className="font-extrabold text-[56px] tracking-tight font-display flex flex-col">
          <div className="flex items-center">
            Bet
            <Rocket className="ml-2 h-10 w-10" />
          </div>
          <div className="flex items-center">
            Compete
            <Zap className="ml-2 h-10 w-10" />
          </div>
          <div className="flex items-center">
            Win
            <Trophy className="ml-2 h-10 w-10" />
          </div>
        </div>
      </div>
      {/* decorative fold removed */}
    </div>
  )
}

type DareStatus = "pending" | "accepted" | "rejected" | "completed"

export type Dare = { id: string; description: string; stakeUsd: number; challenger: string; challengee: string; status: DareStatus; createdAt: number }

export default function Page() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [added, setAdded] = useState<boolean>(false)

  useEffect(() => {
    ;(async () => {
      await sdk.actions.ready()
    })()
  }, [])


  const handleAddMiniApp = async () => {
    try {
      await sdk.actions.addMiniApp()
      setAdded(true)
      setError(null)
    } catch (e) {
      setError('Failed to add Mini App (works only on production domains matching manifest)')
    }
  }


  return (
    <main className="min-h-dvh bg-background text-foreground pb-24">
      <div className="mx-auto w-full max-w-xl">
        <BrandHeader />

        <div className="px-4 py-5 space-y-4">

          <div className="-mx-4 overflow-hidden">
            <div className="px-4 space-y-3">
              <div className="flex gap-3 whitespace-nowrap -translate-x-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={`r1-${i}`} className="px-5 py-2.5 rounded-full bg-[#EEE3FF] text-[#6A33FF] text-[15px]">
                    Challenge to jump in pool
                  </div>
                ))}
              </div>
              <div className="flex gap-3 whitespace-nowrap translate-x-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={`r2-${i}`} className="px-6 py-2.5 rounded-full bg-[#EEE3FF] text-[#6A33FF] text-[15px]">
                    Challenge to jump in pool
                  </div>
                ))}
              </div>
              <div className="flex gap-3 whitespace-nowrap -translate-x-10">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={`r3-${i}`} className="px-7 py-2.5 rounded-full bg-[#EEE3FF] text-[#6A33FF] text-[15px]">
                    Challenge to jump in pool
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-3">
            <Button className="w-full h-14 rounded-2xl bg-black text-white text-lg font-extrabold shadow-[0_8px_0_#2b2b2b] active:translate-y-[2px] active:shadow-[0_4px_0_#2b2b2b]" onClick={() => router.push('/create')}>
              Make a Bet
            </Button>
          </div>
        </div>
      </div>
    </main>
  )
}
