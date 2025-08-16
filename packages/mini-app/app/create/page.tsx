"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useBettingHouse } from "@/hooks/useBettingHouse"
import { useAppState } from "@/components/AppStateProvider"
import toast from "react-hot-toast"
import { extractBetIdFromTxHash, formatBetCondition, calculateDeadline } from "@/lib/betUtils"
import { getTokenList, getTokenBySymbol, DEFAULT_TOKEN, type Token } from "@/lib/tokens"
import { SuggestionModal } from "@/components/SuggestionModal"
import { UsernameSearchDropdown } from "@/components/UsernameSearchDropdown"
import type { FarcasterUser } from "@/hooks/useUsernameSearch"
import { useNotifyFriend } from "@/hooks/useNotifyFriend"

export default function CreatePage() {
  const router = useRouter()
  const { isWalletConnected, isAuthenticated, activeAddress, profile } = useAppState()
  const { createBet, isSubmitting, isApproving } = useBettingHouse()
  const { notifyFriend, isLoading: isNotifying } = useNotifyFriend()

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
  const [friendLookupError, setFriendLookupError] = useState<string | null>(null)
  const [friendVerifiedAddress, setFriendVerifiedAddress] = useState<string | null>(null)
  const [friendCustodyAddress, setFriendCustodyAddress] = useState<string | null>(null)

  // AI Suggestion states
  const [showBetNameSuggestions, setShowBetNameSuggestions] = useState(false)
  const [showDescriptionSuggestions, setShowDescriptionSuggestions] = useState(false)

  // Selected user data
  const [selectedUser, setSelectedUser] = useState<FarcasterUser | null>(null)

  // Handle user selection from dropdown
  const handleUserSelect = (user: FarcasterUser) => {
    setSelectedUser(user)
    setFriendVerifiedAddress(user.verifiedAddress || null)
    setFriendCustodyAddress(user.custodyAddress)
    setFriendLookupError(null)

    if (!user.verifiedAddress) {
      setFriendLookupError("User has not set up a Farcaster wallet")
    }
  }

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

        if (betId !== null) {
          // Send notification to friend if we have their FID
          if (selectedUser?.fid) {
            try {
              const currentUsername = profile?.username || 'Someone';
              await notifyFriend({
                friendFid: selectedUser.fid,
                betId: betId.toString(),
                betName,
                challengerUsername: currentUsername,
                amount,
                token: selectedToken.symbol
              });
              toast.success("Bet created and friend notified!");
            } catch (notifyError) {
              console.error("Failed to notify friend:", notifyError);
              // Don't fail the whole flow if notification fails
              toast.success("Bet created! (Notification failed to send)");
            }
          } else {
            toast.success("Bet created!");
          }

          // Navigate directly to the bet share page using the actual betId
          router.push(`/dare/${betId}/share`);
        } else {
          toast.error("Failed to extract bet ID from transaction. Please try again.");
        }
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
            <div className="relative">
              <Input
                value={betName}
                onChange={(e) => setBetName(e.target.value)}
                placeholder="Jump into the Pool"
                className="h-11 pr-12 rounded-2xl bg-white focus-visible:ring-[#6A33FF] border-transparent shadow-sm"
              />
              <button
                type="button"
                onClick={() => setShowBetNameSuggestions(true)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-[#6A33FF] hover:bg-[#6A33FF]/10 rounded-lg transition-colors"
                title="Get AI suggestions"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" fill="currentColor"/>
                  <path d="M19 15L20.09 18.26L24 19L20.09 19.74L19 23L17.91 19.74L14 19L17.91 18.26L19 15Z" fill="currentColor"/>
                  <path d="M5 15L6.09 18.26L10 19L6.09 19.74L5 23L3.91 19.74L0 19L3.91 18.26L5 15Z" fill="currentColor"/>
                </svg>
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="text-[13px] font-semibold">Add Friend to bet</div>
            <UsernameSearchDropdown
              value={friend}
              onChange={setFriend}
              onUserSelect={handleUserSelect}
              placeholder="@username"
              className="focus-visible:ring-[#6A33FF] border-transparent shadow-sm"
            />
            <div className="min-h-4 text-[11px] sm:text-xs">
              {selectedUser && friendVerifiedAddress && (
                <span className="text-emerald-600">
                  ✓ {selectedUser.displayName} - Wallet: {friendVerifiedAddress.slice(0, 6)}…{friendVerifiedAddress.slice(-4)}
                </span>
              )}
              {selectedUser && !friendVerifiedAddress && (
                <span className="text-amber-600">
                  ⚠️ {selectedUser.displayName} has not set up a Farcaster wallet
                </span>
              )}
              {friendLookupError && !selectedUser && (
                <span className="text-red-500">{friendLookupError}</span>
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
            <div className="relative">
              <Input
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Add Description"
                className="h-24 pr-12 rounded-2xl bg-white focus-visible:ring-[#6A33FF] border-transparent shadow-sm"
              />
              <button
                type="button"
                onClick={() => setShowDescriptionSuggestions(true)}
                className="absolute right-3 top-3 p-1.5 text-[#6A33FF] hover:bg-[#6A33FF]/10 rounded-lg transition-colors"
                title="Get AI suggestions"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" fill="currentColor"/>
                  <path d="M19 15L20.09 18.26L24 19L20.09 19.74L19 23L17.91 19.74L14 19L17.91 18.26L19 15Z" fill="currentColor"/>
                  <path d="M5 15L6.09 18.26L10 19L6.09 19.74L5 23L3.91 19.74L0 19L3.91 18.26L5 15Z" fill="currentColor"/>
                </svg>
              </button>
            </div>
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

      {/* AI Suggestion Modals */}
      <SuggestionModal
        isOpen={showBetNameSuggestions}
        onClose={() => setShowBetNameSuggestions(false)}
        onSelect={(suggestion) => setBetName(suggestion)}
        type="betName"
        currentText={betName}
      />

      <SuggestionModal
        isOpen={showDescriptionSuggestions}
        onClose={() => setShowDescriptionSuggestions(false)}
        onSelect={(suggestion) => setDesc(suggestion)}
        type="description"
        currentText={desc}
        betName={betName}
      />
    </main>
  )
}


