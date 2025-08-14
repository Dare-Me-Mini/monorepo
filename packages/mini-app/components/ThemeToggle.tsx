'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline'

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(true)

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('theme')
      const prefersDark = stored
        ? stored === 'dark'
        : window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      setIsDark(prefersDark)
      document.documentElement.classList.toggle('dark', prefersDark)
    } catch {}
  }, [])

  const toggle = () => {
    const next = !isDark
    setIsDark(next)
    try {
      window.localStorage.setItem('theme', next ? 'dark' : 'light')
    } catch {}
    document.documentElement.classList.toggle('dark', next)
  }

  return (
    <Button variant="outline" size="icon" aria-label="Toggle theme" onClick={toggle}>
      {isDark ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
    </Button>
  )
}


