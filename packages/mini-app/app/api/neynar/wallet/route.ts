import { NextRequest, NextResponse } from "next/server"
import { NeynarAPIClient, Configuration } from "@neynar/nodejs-sdk"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const rawUsername = (searchParams.get("username") || "").trim()

  if (!rawUsername) {
    return NextResponse.json(
      { error: "Missing 'username' query param" },
      { status: 400 }
    )
  }

  const username = rawUsername.startsWith("@")
    ? rawUsername.slice(1)
    : rawUsername

  const apiKey = process.env.NEYNAR_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server misconfiguration: NEYNAR_API_KEY not set" },
      { status: 500 }
    )
  }

  try {
    const config = new Configuration({ apiKey })
    const client = new NeynarAPIClient(config)

    const response = await client.lookupUserByUsername({ username })
    const user = (response as any)?.user

    const ethAddresses: string[] =
      user?.verified_addresses?.eth_addresses || []
    const custodyAddress: string | null = user?.custody_address || user?.custodyAddress || null

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    const payload = {
      username,
      fid: user.fid,
      walletAddress: ethAddresses[0] || null,
      allVerifiedEthAddresses: ethAddresses,
      custodyAddress,
      hasVerifiedWallet: ethAddresses.length > 0,
    }
    return NextResponse.json(payload)
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Failed to fetch user wallet address",
        details: error?.message || String(error),
      },
      { status: 500 }
    )
  }
}


