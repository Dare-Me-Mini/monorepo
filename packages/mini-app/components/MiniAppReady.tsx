'use client'

import { useEffect } from 'react'
import { sdk } from '@farcaster/miniapp-sdk'
import { managedToast } from '@/lib/toast'

export default function MiniAppReady() {
  useEffect(() => {
    (async () => {
      try {
        await sdk.actions.ready()
        // Only show success toast in development
        if (process.env.NODE_ENV === 'development') {
          managedToast.success('Mini app initialized successfully')
        }
      } catch (err) {
        console.error('sdk.actions.ready() failed', err)
        // Temporarily disabled to prevent toast spam
        console.log('Failed to initialize mini app')
      }
    })()
  }, [])
  return null
}
