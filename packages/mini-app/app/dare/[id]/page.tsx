import type { Metadata } from "next"
import DareClient from "./DareClient"
import { validatePublicEnv } from "@/lib/env"

const env = validatePublicEnv();

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function generateMetadata({ params, searchParams }: { params: { id: string }, searchParams: { desc?: string, stake?: string, from?: string, to?: string, status?: string, t?: string } }): Promise<Metadata> {
  const url = `${env.appUrl}/dare/${params.id}`
  const sp = new URLSearchParams()
  if (searchParams?.desc) sp.set('desc', searchParams.desc)
  if (searchParams?.stake) sp.set('stake', searchParams.stake)
  if (searchParams?.from) sp.set('from', searchParams.from)
  if (searchParams?.to) sp.set('to', searchParams.to)
  if (searchParams?.status) sp.set('status', searchParams.status)
  // Always include a cache-busting token to avoid stale previews in Farcaster
  sp.set('t', searchParams?.t ?? String(Math.floor(Date.now() / 1000)))
  const qs = sp.toString()
  const miniapp = {
    version: "1",
    imageUrl: `${env.appUrl}/dare/${params.id}/image${qs ? `?${qs}` : ''}`,
    button: {
      title: "Open Dare",
      action: {
        type: "launch_miniapp",
        name: "Dares",
        url,
        splashImageUrl: `${env.appUrl}/splash-200.png`,
        splashBackgroundColor: "#0f0f23",
      },
    },
  }

  return {
    title: "Dares – Challenge",
    description: "Create and accept dares with stakes",
    other: {
      "fc:miniapp": JSON.stringify(miniapp),
    },
  }
}

export default function Page({ params }: { params: { id: string } }) {
  return <DareClient id={params.id} />
}


