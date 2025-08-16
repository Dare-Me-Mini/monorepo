import { NextRequest, NextResponse } from "next/server"
import { NeynarAPIClient, Configuration } from "@neynar/nodejs-sdk"
import { validateServerEnv } from "@/lib/env"

export async function POST(req: NextRequest) {
  const env = validateServerEnv();

  try {
    const { 
      friendFid, 
      betId,
      betName,
      challengerUsername,
      amount,
      token
    } = await req.json()

    if (!friendFid) {
      return NextResponse.json(
        { error: "friendFid is required" },
        { status: 400 }
      )
    }

    if (!betId || !betName || !challengerUsername) {
      return NextResponse.json(
        { error: "betId, betName, and challengerUsername are required" },
        { status: 400 }
      )
    }

    const config = new Configuration({ apiKey: env.neynarApiKey })
    const client = new NeynarAPIClient(config)

    // Create notification content
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.ibetyou.today'
    const notification = {
      title: "🎯 New Bet Challenge!",
      body: `${challengerUsername} challenged you to: ${betName}${amount ? ` for ${amount} ${token || 'USDC'}` : ''}`,
      target_url: `${appUrl}/dare/${betId}`
    }

    // Send notification to the specific friend
    const response = await client.publishFrameNotifications({
      targetFids: [parseInt(friendFid.toString())],
      notification
    })

    return NextResponse.json({
      success: true,
      message: `Notification sent to user ${friendFid}`,
      response: response
    })

  } catch (error: any) {
    console.error('Neynar notification error:', error);
    
    // Handle specific error cases
    if (error?.message?.includes('not found')) {
      return NextResponse.json(
        { error: "User not found or doesn't have notifications enabled" },
        { status: 404 }
      )
    }

    if (error?.message?.includes('rate limit')) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429 }
      )
    }
    
    return NextResponse.json(
      {
        error: "Failed to send notification",
        details: error?.message || String(error),
      },
      { status: 500 }
    )
  }
}
