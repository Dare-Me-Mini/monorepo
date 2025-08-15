"use server"

import { Configuration, NeynarAPIClient } from '@neynar/nodejs-sdk'

export async function getUserAddressByUsername(username: string): Promise<{ success: true; address: string } | { success: false; error: string }> {
  try {
    if (!username || username.trim() === '') {
      return { success: false, error: 'Username is required' }
    }

    const apiKey = process.env.NEYNAR_API_KEY
    if (!apiKey) {
      return { success: false, error: 'Neynar API key not configured' }
    }

    const config = new Configuration({ apiKey })
    const client = new NeynarAPIClient(config)

    // Remove @ symbol if present
    const cleanUsername = username.replace(/^@/, '')

    const response = await client.lookupUserByUsername({ username: cleanUsername })
    const user = response.user

    const address = user.verified_addresses?.primary?.eth_address
    
    if (!address) {
      return { success: false, error: 'User has no verified Ethereum address' }
    }

    return { success: true, address }
  } catch (error) {
    console.error('Error looking up user by username:', error)
    
    // Check if it's a user not found error
    if (error instanceof Error && error.message.includes('not found')) {
      return { success: false, error: 'User not found' }
    }
    
    return { success: false, error: 'Failed to lookup user' }
  }
}