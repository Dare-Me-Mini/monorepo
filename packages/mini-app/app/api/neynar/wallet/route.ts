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
    const user = response.user;

    const walletAddress = user.verified_addresses?.primary?.eth_address;
    const custodyAddress = user.custody_address;

    return NextResponse.json({
      walletAddress,
      custodyAddress,
      user: {
        fid: user.fid,
        username: user.username,
        displayName: user.display_name,
        pfp: user.pfp_url,
      }
    })
  } catch (error: any) {
    console.error('Neynar API error:', error);
    
    // Check if it's a user not found error
    if (error?.message?.includes('not found') || error?.status === 404) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      {
        error: "Failed to fetch user wallet address",
        details: error?.message || String(error),
      },
      { status: 500 }
    )
  }
}


