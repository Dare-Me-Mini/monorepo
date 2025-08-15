import { publicClient } from './contracts'
import { BettingHouseAbi } from '@/abis/BettingHouseAbi'
import { validatePublicEnv } from './env'
import { parseEventLogs } from 'viem'

const env = validatePublicEnv()

export const extractBetIdFromTxHash = async (txHash: `0x${string}`): Promise<number | null> => {
  try {
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
    })

    const logs = parseEventLogs({
      abi: BettingHouseAbi,
      logs: receipt.logs,
    })

    const betCreatedLog = logs.find(log => log.eventName === 'BetCreated')
    
    if (betCreatedLog && 'args' in betCreatedLog && betCreatedLog.args && 'betId' in betCreatedLog.args) {
      return Number(betCreatedLog.args.betId)
    }

    return null
  } catch (error) {
    console.error('Failed to extract bet ID from transaction:', error)
    return null
  }
}

export const formatBetCondition = (name: string, description?: string): string => {
  return description ? `${name.trim()} - ${description.trim()}` : name.trim()
}

export const calculateDeadline = (date?: string, time?: string): number => {
  if (date && time) {
    const deadlineDate = new Date(`${date}T${time}`)
    return Math.floor(deadlineDate.getTime() / 1000)
  }
  // Default to 24 hours from now
  return Math.floor(Date.now() / 1000) + (24 * 60 * 60)
}

export const formatStakeAmount = (amount: string | number): string => {
  const numAmount = typeof amount === 'string' ? Number(amount) : amount
  return numAmount.toLocaleString()
}