import { NextRequest, NextResponse } from "next/server"
import { NeynarAPIClient, Configuration } from "@neynar/nodejs-sdk"
import { validateServerEnv } from "@/lib/env"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const query = (searchParams.get("q") || "").trim()

  if (!query) {
    return NextResponse.json(
      { error: "Missing 'q' query param" },
      { status: 400 }
    )
  }

  // Don't search for very short queries to avoid too many results
  if (query.length < 2) {
    return NextResponse.json({
      users: []
    })
  }

  try {
    const env = validateServerEnv();
    const config = new Configuration({ apiKey: env.neynarApiKey })
    const client = new NeynarAPIClient(config)

    // Use the search endpoint to find users
    const response = await client.searchUser({ 
      q: query,
      limit: 5 // Limit to 5 results for autocomplete
    })

    // Transform the response to include only the data we need
    const users = response.result.users.map(user => ({
      fid: user.fid,
      username: user.username,
      displayName: user.display_name,
      pfp: user.pfp_url,
      verifiedAddress: user.verified_addresses?.primary?.eth_address,
      custodyAddress: user.custody_address,
      followerCount: user.follower_count,
      powerBadge: user.power_badge
    }))

    return NextResponse.json({
      users
    })

  } catch (error: any) {
    console.error('Neynar search API error:', error);
    
    // Return empty results on error instead of failing
    return NextResponse.json({
      users: [],
      error: "Search temporarily unavailable"
    })
  }
}
