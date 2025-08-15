import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter, Space_Grotesk } from "next/font/google"
import "./globals.css"
import MiniAppReady from "../components/MiniAppReady"
import BottomNav from "@/components/BottomNav"
import Providers from "./providers"
import WalletAutoConnect from "@/components/WalletAutoConnect"

const PROD = process.env.NEXT_PUBLIC_APP_URL || "https://dare-me-eight.vercel.app"

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
})

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-space-grotesk",
})

const miniappEmbed = {
  version: "1",
  imageUrl: `${PROD}/og.png`,
  button: {
    title: "Open Dares",
    action: {
      type: "launch_miniapp",
      name: "Dares",
      url: PROD,
      splashImageUrl: `${PROD}/splash-200.png`,
      splashBackgroundColor: "#0f0f23",
    },
  },
}

export const metadata: Metadata = {
  title: "Dares Mini App",
  description: "Create and accept dares",
  other: {
    "fc:miniapp": JSON.stringify(miniappEmbed),
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable} antialiased`}>
      <body className="min-h-dvh bg-background text-foreground pb-[env(safe-area-inset-bottom)]">
        <Providers>
          <MiniAppReady />
          <WalletAutoConnect />
          {children}
          <BottomNav />
        </Providers>
      </body>
    </html>
  )
}
