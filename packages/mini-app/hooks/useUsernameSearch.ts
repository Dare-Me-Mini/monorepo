import { useState, useCallback } from 'react'

// Simple debounce function
function debounce<T extends (...args: any[]) => any>(func: T, delay: number): T {
  let timeoutId: NodeJS.Timeout
  return ((...args: any[]) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), delay)
  }) as T
}

export interface FarcasterUser {
  fid: number
  username: string
  displayName: string
  pfp: string
  verifiedAddress?: string
  custodyAddress: string
  followerCount: number
  powerBadge: boolean
}

interface SearchResponse {
  users: FarcasterUser[]
  error?: string
}

export function useUsernameSearch() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<FarcasterUser[]>([])

  const searchUsers = useCallback(
    debounce(async (query: string) => {
      if (!query || query.length < 2) {
        setResults([])
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/neynar/search?q=${encodeURIComponent(query)}`)
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const data: SearchResponse = await response.json()
        
        if (data.error) {
          setError(data.error)
        }

        setResults(data.users || [])

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Search failed'
        setError(errorMessage)
        setResults([])
      } finally {
        setIsLoading(false)
      }
    }, 300), // 300ms debounce
    []
  )

  const clearResults = useCallback(() => {
    setResults([])
    setError(null)
    setIsLoading(false)
  }, [])

  return {
    searchUsers,
    clearResults,
    results,
    isLoading,
    error,
  }
}
