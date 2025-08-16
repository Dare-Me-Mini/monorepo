"use client"

import { useEffect, useState } from "react"
import { v4 as uuidv4 } from "uuid"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useBettingHouse } from "@/hooks/useBettingHouse"
import { useAppState } from "@/components/AppStateProvider"
import toast from "react-hot-toast"
import { extractBetIdFromTxHash, formatBetCondition, calculateDeadline } from "@/lib/betUtils"
import { getTokenList, getTokenBySymbol, DEFAULT_TOKEN, type Token } from "@/lib/tokens"

export default function CreatePage() {
  const router = useRouter()
  const { isWalletConnected, isAuthenticated, activeAddress } = useAppState()
  const { createBet, isSubmitting, isApproving } = useBettingHouse()

  // Consider user "connected" if they have either a wallet connection or are authenticated with Farcaster
  const isConnected = isWalletConnected || (isAuthenticated && !!activeAddress)
  
  const [betName, setBetName] = useState("")
  const [friend, setFriend] = useState("")
  const [amount, setAmount] = useState("")
  const [desc, setDesc] = useState("")
  const [date, setDate] = useState<string>("")
  const [time, setTime] = useState<string>("")
  const [selectedToken, setSelectedToken] = useState<Token>(DEFAULT_TOKEN)
  const [creating, setCreating] = useState(false)
  const [friendLookupLoading, setFriendLookupLoading] = useState(false)
  const [friendLookupError, setFriendLookupError] = useState<string | null>(null)
  const [friendVerifiedAddress, setFriendVerifiedAddress] = useState<string | null>(null)
  const [friendCustodyAddress, setFriendCustodyAddress] = useState<string | null>(null)

  // Redirect if wallet is not connected
  useEffect(() => {
    if (!isConnected) {
      toast.error('Please connect your wallet to create a bet')
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
            Please connect your wallet to create a bet
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </div>
      </div>
    )
  }

  useEffect(() => {
    const controller = new AbortController()
    const username = friend.trim()
    if (!username) {
      setFriendLookupLoading(false)
      setFriendLookupError(null)
      setFriendVerifiedAddress(null)
      setFriendCustodyAddress(null)
      return
    }

    const t = setTimeout(async () => {
      try {
        setFriendLookupLoading(true)
        setFriendLookupError(null)
        const res = await fetch(`/api/neynar/wallet?username=${encodeURIComponent(username)}`, {
          signal: controller.signal,
        })
        if (!res.ok) {
          const j = await res.json().catch(() => ({}))
          throw new Error(j?.error || `Lookup failed (${res.status})`)
        }
        const data = await res.json()
        setFriendVerifiedAddress(data.walletAddress || null)
        setFriendCustodyAddress(data.custodyAddress || null)
        if (data.walletAddress) {
          toast.success(`Found wallet for ${username}`)
        } else {
          toast.error(`${username} doesn't have a verified wallet`)
        }
      } catch (e: any) {
        if (e?.name !== 'AbortError') {
          const errorMessage = e?.message || 'Failed to lookup user'
          setFriendLookupError(errorMessage)
          setFriendVerifiedAddress(null)
          setFriendCustodyAddress(null)
          toast.error(errorMessage)
        }
      } finally {
        setFriendLookupLoading(false)
      }
    }, 400)

    return () => {
      controller.abort()
      clearTimeout(t)
    }
  }, [friend])

  const onCreate = async () => {
    if (!betName.trim() || !friend.trim() || !Number.isFinite(Number(amount))) {
      toast.error("Please fill in all required fields")
      return
    }

    if (!isConnected) {
      toast.error("Please connect your wallet first")
      return
    }

    if (!friendVerifiedAddress) {
      toast.error("Friend must have a verified Farcaster wallet")
      return
    }

    setCreating(true)
    
    try {
      const deadline = calculateDeadline(date, time);
      const condition = formatBetCondition(betName, desc);
      
      const result = await createBet(
        friendVerifiedAddress as `0x${string}`,
        condition,
        amount,
        deadline,
        selectedToken
      );

      if (result.success && result.hash) {
        // Extract bet ID from transaction
        const betId = await extractBetIdFromTxHash(result.hash);
        
        const id = uuidv4();
        const sp = new URLSearchParams({
          desc: betName.trim(),
          stake: amount,
          from: "You",
          to: friend.trim(),
          status: "pending",
          txHash: result.hash,
          token: selectedToken.symbol,
        });
        
        if (betId !== null) {
          sp.set("betId", String(betId));
        }
        if (desc.trim()) sp.set("desc", desc.trim());
        if (date) sp.set("date", date);
        if (time) sp.set("time", time);
        
        router.push(`/dare/${id}/share?${sp.toString()}`);
      }
    } catch (error) {
      console.error("Failed to create bet:", error);
      toast.error("Failed to create bet. Please try again.");
    } finally {
      setCreating(false);
    }
  }

  // Don't render the form if wallet is not connected
  if (!isConnected) {
    return (
      <main className="min-h-dvh bg-background text-foreground pb-24 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-lg font-semibold">Wallet Required</div>
          <div className="text-foreground/60">Please connect your wallet to create a bet</div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-dvh bg-background text-foreground pb-24">
      <div className="mx-auto w-full max-w-xl">
        <div className="relative overflow-hidden rounded-b-[32px] bg-[#6A33FF] text-white pt-8 pb-6 px-5 shadow-xl">
          <div className="text-center">
            <div className="font-display font-extrabold text-[24px]">Add Challenge Details</div>
          </div>
          {/* decorative fold removed */}
        </div>

        <div className="px-4 py-5 space-y-4">
          <div className="space-y-1.5">
            <div className="text-[13px] font-semibold">Bet Name</div>
            <Input value={betName} onChange={(e) => setBetName(e.target.value)} placeholder="Jump into the Pool" className="h-11 rounded-2xl bg-white focus-visible:ring-[#6A33FF] border-transparent shadow-sm" />
          </div>

          <div className="space-y-1.5">
            <div className="text-[13px] font-semibold">Add Friend to bet</div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                <img src="https://api.dicebear.com/9.x/identicon/svg?seed=piyushxpj" alt="avatar" className="h-6 w-6 rounded-full" />
              </div>
              <Input value={friend} onChange={(e) => setFriend(e.target.value)} placeholder="@username" className="h-11 pl-11 rounded-2xl bg-white focus-visible:ring-[#6A33FF] border-transparent shadow-sm" />
            </div>
            <div className="min-h-4 text-[11px] sm:text-xs">
              {friendLookupLoading && (
                <span className="text-foreground/60">Looking up wallet…</span>
              )}
              {!friendLookupLoading && friendLookupError && (
                <span className="text-red-500">{friendLookupError}</span>
              )}
              {!friendLookupLoading && !friendLookupError && friendVerifiedAddress && (
                <span className="text-emerald-600">Wallet: {friendVerifiedAddress.slice(0, 6)}…{friendVerifiedAddress.slice(-4)}</span>
              )}
              {!friendLookupLoading && !friendLookupError && !friendVerifiedAddress && friendCustodyAddress && (
                <span className="text-amber-600">Not eligible — friend has not set up a Farcaster wallet</span>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="text-[13px] font-semibold">Bet Amount</div>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <Input 
                  value={amount} 
                  inputMode="decimal" 
                  onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} 
                  placeholder="1200" 
                  className="h-11 rounded-2xl bg-white focus-visible:ring-[#6A33FF] border-transparent shadow-sm" 
                />
              </div>
              <Select value={selectedToken.symbol} onValueChange={(value) => {
                const token = getTokenBySymbol(value);
                if (token) setSelectedToken(token);
              }}>
                <SelectTrigger className="h-11 rounded-2xl bg-white focus-visible:ring-[#6A33FF] border-transparent shadow-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getTokenList().map((token) => (
                    <SelectItem key={token.symbol} value={token.symbol}>
                      <div className="flex items-center gap-2">
                        <span>{token.icon}</span>
                        <span>{token.symbol}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="text-xs text-foreground/60">
              You bet {Number(amount || 0).toLocaleString()} {selectedToken.symbol}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="text-[13px] font-semibold">Bet Description</div>
            <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Add Description" className="h-24 rounded-2xl bg-white focus-visible:ring-[#6A33FF] border-transparent shadow-sm" />
          </div>

          <div className="space-y-2.5">
            <div className="text-[13px] font-semibold">Set Time</div>
            <div className="grid grid-cols-2 gap-3">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-11 rounded-2xl bg-white focus-visible:ring-[#6A33FF] border-transparent shadow-sm" />
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-11 rounded-2xl bg-white focus-visible:ring-[#6A33FF] border-transparent shadow-sm" />
            </div>
          </div>

          <div className="pt-2">
            <Button 
              onClick={onCreate} 
              disabled={creating || isSubmitting || isApproving || !isConnected || !friendVerifiedAddress} 
              className="w-full h-12 rounded-2xl bg-black text-white text-base shadow-[0_4px_0_#2b2b2b] active:translate-y-[2px] active:shadow-[0_2px_0_#2b2b2b] disabled:opacity-50"
            >
              {!isConnected ? "Connect Wallet" : 
               isApproving ? `Approving ${selectedToken.symbol}...` :
               creating || isSubmitting ? "Creating..." : 
               "Create the Bet"}
            </Button>
          </div>
        </div>
      </div>
    </main>
  )
}


