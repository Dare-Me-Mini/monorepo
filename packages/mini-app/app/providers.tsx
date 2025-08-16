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
            <Toaster
              position="top-center"
              reverseOrder={false}
              gutter={8}
              toastOptions={{
                // Default options for all toasts
                duration: 4000,
                style: {
                  background: '#ffffff',
                  color: '#000000',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  fontSize: '14px',
                  fontWeight: '500',
                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
                },
                // Default options for specific types
                success: {
                  duration: 3000,
                  style: {
                    background: '#ffffff',
                    color: '#000000',
                    borderRadius: '12px',
                    border: '1px solid rgba(79, 70, 229, 0.3)',
                    fontSize: '14px',
                    fontWeight: '500',
                    boxShadow: '0 10px 25px rgba(79, 70, 229, 0.3)',
                  },
                  iconTheme: {
                    primary: '#4f46e5',
                    secondary: '#ffffff',
                  },
                },
                error: {
                  duration: 5000,
                  style: {
                    background: '#ffffff',
                    color: '#000000',
                    borderRadius: '12px',
                    border: '1px solid rgba(220, 38, 38, 0.3)',
                    fontSize: '14px',
                    fontWeight: '500',
                    boxShadow: '0 10px 25px rgba(220, 38, 38, 0.3)',
                  },
                },
                loading: {
                  style: {
                    background: '#ffffff',
                    color: '#000000',
                    borderRadius: '12px',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    fontSize: '14px',
                    fontWeight: '500',
                    boxShadow: '0 10px 25px rgba(99, 102, 241, 0.3)',
                  },
                },
              }}
            />
          </AppStateProvider>
        </AuthKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}


