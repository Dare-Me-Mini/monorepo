import { useState } from 'react'

interface SuggestionResponse {
  suggestions: string[]
  fallback?: boolean
}

export function useAISuggestions() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getSuggestions = async (
    type: 'betName' | 'description',
    currentText?: string,
    betName?: string
  ): Promise<string[]> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/ai/suggest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          currentText: currentText || '',
          betName: betName || '',
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data: SuggestionResponse = await response.json()
      
      if (data.fallback) {
        setError('Using fallback suggestions due to AI service unavailability')
      }

      return data.suggestions

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get suggestions'
      setError(errorMessage)
      
      // Return fallback suggestions
      if (type === 'betName') {
        return [
          'Jump into the Pool',
          'Run 5 Miles This Week',
          'Learn a New Skill'
        ]
      } else {
        return [
          'Complete the challenge within the specified time frame',
          'Provide photo/video proof of completion',
          'Meet the agreed criteria for success'
        ]
      }
    } finally {
      setIsLoading(false)
    }
  }

  return {
    getSuggestions,
    isLoading,
    error,
  }
}
