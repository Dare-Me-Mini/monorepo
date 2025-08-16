import { Configuration, NeynarAPIClient } from '@neynar/nodejs-sdk'
import { BulkUsersByAddressResponse } from '@neynar/nodejs-sdk/build/api'

interface FarcasterUser {
  fid: number
  username: string
  pfp: string
}

class NeynarService {
  private client: NeynarAPIClient | null = null

  constructor() {
    const apiKey = process.env.NEYNAR_API_KEY
    if (apiKey) {
      const config = new Configuration({ apiKey })
      this.client = new NeynarAPIClient(config)
    } else {
      console.warn('NEYNAR_API_KEY not found - Farcaster user lookups will be skipped')
    }
  }

  async getUsersByAddresses(addresses: string[]): Promise<BulkUsersByAddressResponse> {
    if (!this.client) {
      console.warn('Neynar client not initialized - skipping user lookup')
      return {}
    }
    
    const response = await this.client.fetchBulkUsersByEthOrSolAddress({
      addresses: addresses.map(address => address.toLowerCase().startsWith('0x') 
        ? address.toLowerCase() 
        : `0x${address.toLowerCase()}` as `0x${string}`)
    })

    return response;
  }
}

export const neynarService = new NeynarService()
export type { FarcasterUser }