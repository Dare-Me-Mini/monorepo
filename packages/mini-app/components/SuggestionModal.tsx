import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { useAISuggestions } from '@/hooks/useAISuggestions'

interface SuggestionModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (suggestion: string) => void
  type: 'betName' | 'description'
  currentText?: string
  betName?: string
}

export function SuggestionModal({
  isOpen,
  onClose,
  onSelect,
  type,
  currentText,
  betName
}: SuggestionModalProps) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const { getSuggestions, isLoading, error } = useAISuggestions()

  useEffect(() => {
    if (isOpen) {
      loadSuggestions()
    }
  }, [isOpen, currentText, betName])

  const loadSuggestions = async () => {
    try {
      const newSuggestions = await getSuggestions(type, currentText, betName)
      setSuggestions(newSuggestions)
    } catch (err) {
      console.error('Failed to load suggestions:', err)
    }
  }

  const handleSelect = (suggestion: string) => {
    onSelect(suggestion)
    onClose()
  }

  const handleRefresh = () => {
    loadSuggestions()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md mx-auto shadow-xl">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {type === 'betName' ? 'Bet Name Suggestions' : 'Description Suggestions'}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl font-bold"
            >
              ×
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-700">{error}</p>
            </div>
          )}

          <div className="space-y-3 mb-6">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : (
              suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSelect(suggestion)}
                  className="w-full p-3 text-left bg-gray-50 hover:bg-[#6A33FF]/10 rounded-lg border border-gray-200 hover:border-[#6A33FF]/30 transition-all duration-200"
                >
                  <span className="text-gray-900 text-sm">{suggestion}</span>
                </button>
              ))
            )}
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleRefresh}
              disabled={isLoading}
              variant="outline"
              className="flex-1 h-10 rounded-xl border-gray-200 hover:bg-gray-50"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-[#6A33FF] rounded-full animate-spin" />
                  <span>Loading...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Refresh</span>
                </div>
              )}
            </Button>
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 h-10 rounded-xl border-gray-200 hover:bg-gray-50"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
