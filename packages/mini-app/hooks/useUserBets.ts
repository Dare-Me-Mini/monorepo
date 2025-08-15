"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { indexerClient, type IndexerBet, type BetStatus, getBetStatusLabel } from "@/lib/indexer";
import { getTokenByAddress, formatTokenAmount, type Token } from "@/lib/tokens";

export interface UserBetSummary {
  id: string;
  condition: string;
  amount: string;
  token: Token;
  status: BetStatus;
  statusLabel: string;
  challenger: string;
  challengee: string;
  isChallenger: boolean;
  isChallengee: boolean;
  proof: string;
  isClosed: boolean;
  createdAt: Date;
  acceptanceDeadline: Date;
  proofSubmissionDeadline: Date;
}

interface UseUserBetsOptions {
  includeAsChallenger?: boolean;
  includeAsChallengee?: boolean;
  statusFilter?: BetStatus[];
  limit?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useUserBets(options: UseUserBetsOptions = {}) {
  const { address } = useAccount();
  const [bets, setBets] = useState<UserBetSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const {
    includeAsChallenger = true,
    includeAsChallengee = true,
    statusFilter,
    limit = 20,
    autoRefresh = false,
    refreshInterval = 30000, // 30 seconds
  } = options;

  const fetchBets = async () => {
    if (!address) {
      setBets([]);
      setTotalCount(0);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await indexerClient.getUserBets(address, {
        includeAsChallenger,
        includeAsChallengee,
        status: statusFilter,
        limit,
        orderDirection: 'desc',
      });

      const formattedBets: UserBetSummary[] = response.items.map((bet): UserBetSummary => {
        const token = getTokenByAddress(bet.token);
        const formattedAmount = token ? formatTokenAmount(bet.amount, token) : bet.amount;
        const userAddress = address.toLowerCase();

        return {
          id: bet.id,
          condition: bet.condition,
          amount: formattedAmount,
          token: token || { address: bet.token as `0x${string}`, symbol: "UNKNOWN", name: "Unknown", decimals: 18 },
          status: bet.lastUpdatedStatus,
          statusLabel: getBetStatusLabel(bet.lastUpdatedStatus),
          challenger: bet.challenger,
          challengee: bet.challengee,
          isChallenger: bet.challenger.toLowerCase() === userAddress,
          isChallengee: bet.challengee.toLowerCase() === userAddress,
          proof: bet.proof,
          isClosed: bet.isClosed,
          createdAt: new Date(bet.createdTimestamp),
          acceptanceDeadline: new Date(bet.acceptanceDeadline),
          proofSubmissionDeadline: new Date(bet.proofSubmissionDeadline),
        };
      });

      setBets(formattedBets);
      setTotalCount(response.totalCount);
    } catch (err) {
      console.error("Failed to fetch user bets:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch bets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBets();
  }, [address, includeAsChallenger, includeAsChallengee, JSON.stringify(statusFilter), limit]);

  useEffect(() => {
    if (!autoRefresh || !address) return;

    const interval = setInterval(fetchBets, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, address]);

  // Categorize bets
  const activeBets = bets.filter(bet => !bet.isClosed);
  const pendingBets = bets.filter(bet => bet.status === 'OPEN');
  const acceptedBets = bets.filter(bet => bet.status === 'ACCEPTED');
  const completedBets = bets.filter(bet => bet.isClosed);

  // Role-based filtering
  const challengerBets = bets.filter(bet => bet.isChallenger);
  const challengeeBets = bets.filter(bet => bet.isChallengee);

  return {
    bets,
    activeBets,
    pendingBets,
    acceptedBets,
    completedBets,
    challengerBets,
    challengeeBets,
    totalCount,
    loading,
    error,
    refetch: fetchBets,
  };
}