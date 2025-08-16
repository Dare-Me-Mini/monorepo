"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  User,
  Wallet,
  Trophy,
  Copy,
  DollarSign,
  Target,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react"
import { useAppState } from "@/components/AppStateProvider"
import { useUserBets } from "@/hooks/useUserBets"
import { useAccount } from "wagmi"
import { sdk } from "@farcaster/miniapp-sdk"
import toast from "react-hot-toast"

const ProfileHeader = () => {
  const { activeAddress, profile } = useAppState()
  const [miniAppUser, setMiniAppUser] = useState<any>(null)

  // Get user data from Mini App SDK context
  useEffect(() => {
    const getUserFromSDK = async () => {
      try {
        // Check if we're in a Mini App environment
        const isMiniApp = await sdk.isInMiniApp()
        if (isMiniApp) {
          const context = await sdk.context
          console.log('Mini App SDK Context:', context)
          setMiniAppUser(context.user)
        } else {
          console.log('Not in Mini App environment, using Auth Kit profile only')
        }
      } catch (error) {
        console.error('Failed to get Mini App context:', error)
        // Fallback to Auth Kit profile only
      }
    }

    getUserFromSDK()
  }, [])

  // Debug logging to see what profile data we have (can be removed in production)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('ProfileHeader - Profile data:', {
        authKitProfile: profile,
        miniAppUser,
        activeAddress,
        authKitKeys: profile ? Object.keys(profile) : null,
        miniAppKeys: miniAppUser ? Object.keys(miniAppUser) : null
      })
    }
  }, [profile, miniAppUser, activeAddress])

  const displayAddress = activeAddress ? `${activeAddress.slice(0, 6)}…${activeAddress.slice(-4)}` : 'Not connected'

  // Prefer Mini App SDK user data, fallback to Auth Kit profile
  const displayName = miniAppUser?.displayName || miniAppUser?.username || profile?.displayName || profile?.username || 'User'
  const username = miniAppUser?.username || profile?.username
  const profilePicture = miniAppUser?.pfpUrl || profile?.pfpUrl
  const fid = miniAppUser?.fid || profile?.fid
  const hasFarcasterProfile = !!(fid && username)

  const handleCopyAddress = () => {
    if (activeAddress) {
      navigator.clipboard.writeText(activeAddress)
      toast.success('Address copied to clipboard!')
    }
  }

  return (
    <div className="relative overflow-hidden rounded-b-[60px] bg-[#7C3AED] text-white pt-4 pb-8 px-6">
      <div className="flex items-center justify-center mb-6">
        <div className="text-xl font-bold">Profile</div>
      </div>

      <div className="text-center">
        <div className="w-20 h-20 mx-auto mb-4 bg-white/20 rounded-full flex items-center justify-center overflow-hidden border-2 border-white/30">
          {profilePicture ? (
            <img
              src={profilePicture}
              alt={displayName}
              className="w-full h-full rounded-full object-cover"
              onError={(e) => {
                // Fallback if image fails to load
                e.currentTarget.style.display = 'none'
                e.currentTarget.nextElementSibling?.classList.remove('hidden')
              }}
            />
          ) : null}
          <div className={`${profilePicture ? 'hidden' : ''} w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-400 to-purple-600 rounded-full`}>
            {hasFarcasterProfile ? (
              <span className="text-white font-bold text-2xl">
                {(displayName || 'U').charAt(0).toUpperCase()}
              </span>
            ) : (
              <User className="w-10 h-10 text-white" />
            )}
          </div>
        </div>
        
        <div className="text-2xl font-bold mb-1">{displayName}</div>
        {username && <div className="text-white/80 text-sm mb-3">@{username}</div>}
        {hasFarcasterProfile && fid && (
          <div className="text-white/60 text-xs mb-3">FID: {fid}</div>
        )}
        
        <div className="flex items-center justify-center gap-2 bg-white/20 rounded-lg px-3 py-2 max-w-xs mx-auto">
          <Wallet className="w-4 h-4" />
          <span className="text-sm font-medium">{displayAddress}</span>
          <button
            onClick={handleCopyAddress}
            className="p-1 hover:bg-white/20 rounded transition-colors"
          >
            <Copy className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  )
}

const StatsCard = ({ icon: Icon, title, value, subtitle, color = "text-gray-600" }: {
  icon: any
  title: string
  value: string | number
  subtitle?: string
  color?: string
}) => (
  <div className="bg-white rounded-2xl border-2 border-black p-4 shadow-[4px_4px_0px_#000]">
    <div className="flex items-center gap-3 mb-2">
      <div className="p-2 bg-purple-100 rounded-lg">
        <Icon className="w-5 h-5 text-[#7C3AED]" />
      </div>
      <div className="text-sm font-medium text-gray-600">{title}</div>
    </div>
    <div className={`text-2xl font-bold ${color}`}>{value}</div>
    {subtitle && <div className="text-sm text-gray-500 mt-1">{subtitle}</div>}
  </div>
)

export default function ProfilePage() {
  const router = useRouter()
  const { activeAddress, isAuthenticated } = useAppState()
  const { isConnected } = useAccount()
  const { bets, activeBets, completedBets, loading } = useUserBets({
    autoRefresh: false,
    refreshInterval: 0
  })

  // Redirect if not connected
  useEffect(() => {
    if (!isConnected && !isAuthenticated) {
      router.push('/')
    }
  }, [isConnected, isAuthenticated, router])

  if (!activeAddress) {
    return (
      <main className="min-h-dvh bg-gray-50 text-foreground pb-24">
        <div className="mx-auto w-full max-w-xl">
          <div className="text-center py-12">
            <User className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <div className="text-xl font-semibold text-gray-800 mb-2">Not Connected</div>
            <div className="text-gray-600">Please connect your wallet to view your profile</div>
          </div>
        </div>
      </main>
    )
  }

  // Calculate stats
  const totalBets = bets.length
  const wonBets = completedBets.filter(bet =>
    (bet.status === 'COMPLETED_BY_CHALLENGER' && bet.isChallenger) ||
    (bet.status === 'COMPLETED_BY_CHALLENGEE' && bet.isChallengee)
  ).length
  const lostBets = completedBets.filter(bet =>
    (bet.status === 'COMPLETED_BY_CHALLENGER' && bet.isChallengee) ||
    (bet.status === 'COMPLETED_BY_CHALLENGEE' && bet.isChallenger)
  ).length
  const winRate = totalBets > 0 ? Math.round((wonBets / (wonBets + lostBets)) * 100) : 0

  return (
    <main className="min-h-dvh bg-gray-50 text-foreground pb-24">
      <div className="mx-auto w-full max-w-xl">
        <ProfileHeader />

        <div className="px-6 py-6 space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <StatsCard
              icon={Target}
              title="Total Bets"
              value={totalBets}
              subtitle={`${activeBets.length} active`}
            />
            <StatsCard
              icon={Trophy}
              title="Win Rate"
              value={`${winRate}%`}
              subtitle={`${wonBets}W / ${lostBets}L`}
              color={winRate >= 50 ? "text-green-600" : "text-red-600"}
            />
          </div>

          {/* Recent Activity */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-800">Recent Activity</h2>
            
            {loading && (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-2 border-[#7C3AED] border-t-transparent rounded-full mx-auto mb-4"></div>
                <div className="text-gray-600">Loading your activity...</div>
              </div>
            )}

            {!loading && bets.length === 0 && (
              <div className="text-center py-8">
                <Target className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <div className="text-lg font-semibold text-gray-800 mb-2">No bets yet</div>
                <div className="text-gray-600">Start betting to see your activity here!</div>
              </div>
            )}

            {!loading && bets.length > 0 && (
              <div className="space-y-3">
                {bets.slice(0, 5).map((bet) => (
                  <div
                    key={bet.id}
                    className="bg-white rounded-xl border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => router.push(`/dare/${bet.id}`)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                          <DollarSign className="w-4 h-4 text-[#7C3AED]" />
                        </div>
                        <span className="font-semibold text-gray-900">${bet.amount}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {bet.status === 'COMPLETED_BY_CHALLENGER' || bet.status === 'COMPLETED_BY_CHALLENGEE' ? (
                          ((bet.status === 'COMPLETED_BY_CHALLENGER' && bet.isChallenger) ||
                           (bet.status === 'COMPLETED_BY_CHALLENGEE' && bet.isChallengee)) ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )
                        ) : (
                          <Clock className="w-4 h-4 text-yellow-500" />
                        )}
                        <span className="text-sm text-gray-500 capitalize">{bet.statusLabel}</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 line-clamp-2">{bet.condition}</p>
                  </div>
                ))}
                
                {bets.length > 5 && (
                  <div className="text-center">
                    <button
                      onClick={() => router.push('/')}
                      className="text-[#7C3AED] font-medium text-sm hover:underline"
                    >
                      View all bets
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
