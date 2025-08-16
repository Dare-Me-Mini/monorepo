import { useState, useEffect, useRef } from 'react'
import { useUsernameSearch, type FarcasterUser } from '@/hooks/useUsernameSearch'

interface UsernameSearchDropdownProps {
  value: string
  onChange: (value: string) => void
  onUserSelect?: (user: FarcasterUser) => void
  placeholder?: string
  className?: string
}

export function UsernameSearchDropdown({
  value,
  onChange,
  onUserSelect,
  placeholder = "@username",
  className = ""
}: UsernameSearchDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [inputValue, setInputValue] = useState(value)
  const { searchUsers, clearResults, results, isLoading, error } = useUsernameSearch()
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Update input value when prop changes
  useEffect(() => {
    setInputValue(value)
  }, [value])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    onChange(newValue)

    // Search for users
    if (newValue.length >= 2) {
      const query = newValue.startsWith('@') ? newValue.slice(1) : newValue
      searchUsers(query)
      setIsOpen(true)
    } else {
      clearResults()
      setIsOpen(false)
    }
  }

  const handleUserSelect = (user: FarcasterUser) => {
    const username = `@${user.username}`
    setInputValue(username)
    onChange(username)
    setIsOpen(false)
    clearResults()
    
    if (onUserSelect) {
      onUserSelect(user)
    }
  }

  const handleInputFocus = () => {
    if (results.length > 0) {
      setIsOpen(true)
    }
  }

  return (
    <div className="relative">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3">
          <img 
            src="https://api.dicebear.com/9.x/identicon/svg?seed=piyushxpj" 
            alt="avatar" 
            className="h-6 w-6 rounded-full" 
          />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          className={`h-11 pl-11 pr-4 rounded-2xl bg-white focus-visible:ring-[#6A33FF] border-transparent shadow-sm w-full ${className}`}
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-[#6A33FF] rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (results.length > 0 || error) && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto"
        >
          {error && (
            <div className="p-3 text-sm text-amber-600 bg-amber-50 border-b border-amber-100">
              {error}
            </div>
          )}
          
          {results.map((user) => (
            <button
              key={user.fid}
              onClick={() => handleUserSelect(user)}
              className="w-full p-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
            >
              <div className="flex items-center gap-3">
                <img
                  src={user.pfp || `https://api.dicebear.com/9.x/identicon/svg?seed=${user.username}`}
                  alt={user.displayName}
                  className="w-8 h-8 rounded-full"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 truncate">
                      {user.displayName}
                    </span>
                    {user.powerBadge && (
                      <span className="text-[#6A33FF]" title="Power Badge">
                        ⚡
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span>@{user.username}</span>
                    <span>•</span>
                    <span>{user.followerCount.toLocaleString()} followers</span>
                  </div>
                </div>
                {user.verifiedAddress && (
                  <div className="text-xs text-emerald-600" title="Verified Address">
                    ✓
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
