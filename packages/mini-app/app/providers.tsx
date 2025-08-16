'use client'

import React, { useState } from 'react'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { wagmiConfig } from '@/lib/wagmi'
import { AuthKitProvider } from '@farcaster/auth-kit'
import { AppStateProvider } from '@/components/AppStateProvider'
import { Toaster } from 'react-hot-toast'

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <AuthKitProvider
          config={{
            domain: typeof window !== 'undefined' ? window.location.host : 'localhost:3000',
            siweUri: typeof window !== 'undefined' ? `${window.location.origin}/api/siwe` : 'http://localhost:3000/api/siwe',
          }}
        >
          <AppStateProvider>
            {children}
{/*             <Toaster
              position="top-center"
              reverseOrder={false}
              gutter={8}
              toastOptions={{
                // Default options for all toasts
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
                // Default options for specific types
                success: {
                  duration: 3000,
                  style: {
                    background: '#10b981',
                    color: '#fff',
                  },
                },
                error: {
                  duration: 5000,
                  style: {
                    background: '#ef4444',
                    color: '#fff',
                  },
                },
                loading: {
                  style: {
                    background: '#3b82f6',
                    color: '#fff',
                  },
                },
              }}
            /> */}
          </AppStateProvider>
        </AuthKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}


