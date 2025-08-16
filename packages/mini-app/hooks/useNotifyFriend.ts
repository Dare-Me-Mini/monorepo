import { useState } from 'react'

interface NotifyFriendRequest {
  friendFid: number
  betId: string
  betName: string
  challengerUsername: string
  amount?: string
  token?: string
}

interface NotifyFriendResponse {
  success: boolean
  message?: string
  error?: string
}

export function useNotifyFriend() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const notifyFriend = async (request: NotifyFriendRequest): Promise<NotifyFriendResponse> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/neynar/notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`)
      }

      return {
        success: true,
        message: data.message
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send notification'
      setError(errorMessage)
      return {
        success: false,
        error: errorMessage
      }
    } finally {
      setIsLoading(false)
    }
  }

  return {
    notifyFriend,
    isLoading,
    error,
  }
}
