'use client'

import React, { useState } from 'react'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { wagmiConfig } from '@/lib/wagmi'
import { AuthKitProvider } from '@farcaster/auth-kit'
import { AppStateProvider } from '@/components/AppStateProvider'
import { Toaster } from '@/components/ui/sonner'

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
            <Toaster />
          </AppStateProvider>
        </AuthKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}


