import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const address = searchParams.get('address')

  if (!address) {
    return NextResponse.json(
      { error: 'Address is required' },
      { status: 400 }
    )
  }

  const domain = request.headers.get('host') || 'localhost:3000'
  const origin = `${request.headers.get('x-forwarded-proto') || 'http'}://${domain}`
  
  const message = `${domain} wants you to sign in with your Ethereum account:
${address}

Welcome to ibet! By signing, you are proving you own this wallet.

URI: ${origin}
Version: 1
Chain ID: 8453
Nonce: ${Math.floor(Math.random() * 1000000)}
Issued At: ${new Date().toISOString()}`

  return NextResponse.json({ message })
}

export async function POST(request: NextRequest) {
  try {
    const { message, signature, nonce } = await request.json()
    
    // In a real app, you would verify the signature here
    // For now, we'll just return success
    return NextResponse.json({ 
      success: true,
      token: 'mock-jwt-token' // In production, return a real JWT
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    )
  }
}