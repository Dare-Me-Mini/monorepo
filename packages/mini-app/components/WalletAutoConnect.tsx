'use client'

import { useEffect, useRef } from 'react'
import { useAccount, useConnect } from 'wagmi'

export default function WalletAutoConnect() {
  const { isConnected } = useAccount()
  const { connect, connectors, status: connectStatus } = useConnect()
  const hasShownConnectionSuccess = useRef(false)
  const hasAttemptedConnection = useRef(false)

  useEffect(() => {
    // Only attempt connection once and when not already connected
    if (!isConnected && !hasAttemptedConnection.current && connectors && connectors.length > 0 && connectStatus !== 'pending') {
      hasAttemptedConnection.current = true
      const farcasterConnector = connectors.find((c) => c.name.toLowerCase().includes('farcaster')) ?? connectors[0]

      console.log('Attempting auto-connect with connector:', farcasterConnector?.name)

      try {
        connect({ connector: farcasterConnector })
      } catch (err) {
        console.error('Auto-connect failed:', err)
      }
    }
  }, [isConnected, connect, connectors, connectStatus])

  // Reset attempt flag when connection status changes
  useEffect(() => {
    if (isConnected) {
      hasAttemptedConnection.current = false
    }
  }, [isConnected])

  useEffect(() => {
    if (isConnected && !hasShownConnectionSuccess.current) {
      // Temporarily disabled to prevent toast spam
      console.log('Wallet connected successfully!')
      hasShownConnectionSuccess.current = true
    }
    if (!isConnected) {
      hasShownConnectionSuccess.current = false
    }
  }, [isConnected])

  // Temporarily disabled error handling to prevent toast spam
  // useEffect(() => {
  //   if (error && error.message && error.message !== lastErrorMessage.current) {
  //     const errorMessage = error.message || 'Unknown error'
  //     console.log(`Wallet connection failed: ${errorMessage}`)
  //     lastErrorMessage.current = errorMessage
  //   }
  //   if (!error) {
  //     lastErrorMessage.current = null
  //   }
  // }, [error])

  return null
}


