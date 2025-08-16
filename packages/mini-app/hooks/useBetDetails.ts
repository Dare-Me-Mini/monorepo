"use client";

import { useEffect, useState } from "react";
import { indexerClient, type IndexerBet, type BetStatus, getBetStatusLabel } from "@/lib/indexer";
import { getTokenByAddress, formatTokenAmount, type Token } from "@/lib/tokens";

interface BetDetails {
  id: string;
  amount: string;
  token: Token;
  status: BetStatus;
  statusLabel: string;
  condition: string;
  challenger: string;
  challengee: string;
  mediator: string;
  proof: string;
  acceptanceDeadline: Date;
  proofSubmissionDeadline: Date;
  proofAcceptanceDeadline: Date;
  isClosed: boolean;
  createdAt: Date;
  updatedAt: Date;
  loading: boolean;
  error: string | null;
  // Farcaster user data
  challengerFid?: number;
  challengerUsername?: string;
  challengerPfp?: string;
  challengeeFid?: number;
  challengeeUsername?: string;
  challengeePfp?: string;
}

export function useBetDetails(betId: string | number | null) {
  const [betDetails, setBetDetails] = useState<BetDetails | null>(null);

  useEffect(() => {
    if (!betId) return;

    const fetchBetDetails = async () => {
      try {
        setBetDetails(prev => prev ? { ...prev, loading: true } : null);
        
        const bet = await indexerClient.getBet(betId.toString());

        if (!bet) {
          setBetDetails({
            id: betId.toString(),
            amount: "0",
            token: { address: "0x0", symbol: "UNKNOWN", name: "Unknown", decimals: 18 },
            status: "OPEN",
            statusLabel: "Unknown",
            condition: "",
            challenger: "",
            challengee: "",
            mediator: "",
            proof: "",
            acceptanceDeadline: new Date(),
            proofSubmissionDeadline: new Date(),
            proofAcceptanceDeadline: new Date(),
            isClosed: false,
            createdAt: new Date(),
            updatedAt: new Date(),
            loading: false,
            error: "Bet not found",
            // Farcaster user data
            challengerFid: undefined,
            challengerUsername: undefined,
            challengerPfp: undefined,
            challengeeFid: undefined,
            challengeeUsername: undefined,
            challengeePfp: undefined,
          });
          return;
        }

        const token = getTokenByAddress(bet.token);
        if (!token) {
          throw new Error(`Unsupported token: ${bet.token}`);
        }

        const formattedAmount = formatTokenAmount(bet.amount, token);

        setBetDetails({
          id: bet.id,
          amount: formattedAmount,
          token,
          status: bet.lastUpdatedStatus,
          statusLabel: getBetStatusLabel(bet.lastUpdatedStatus),
          condition: bet.condition,
          challenger: bet.challenger,
          challengee: bet.challengee,
          mediator: bet.mediator,
          proof: bet.proof,
          acceptanceDeadline: new Date(bet.acceptanceDeadline),
          proofSubmissionDeadline: new Date(bet.proofSubmissionDeadline),
          proofAcceptanceDeadline: new Date(bet.proofAcceptanceDeadline),
          isClosed: bet.isClosed,
          createdAt: new Date(bet.createdTimestamp),
          updatedAt: new Date(bet.updatedAt),
          loading: false,
          error: null,
          // Farcaster user data
          challengerFid: bet.challengerFid,
          challengerUsername: bet.challengerUsername,
          challengerPfp: bet.challengerPfp,
          challengeeFid: bet.challengeeFid,
          challengeeUsername: bet.challengeeUsername,
          challengeePfp: bet.challengeePfp,
        });
      } catch (error) {
        console.error("Failed to fetch bet details:", error);
        setBetDetails(prev => prev ? { 
          ...prev, 
          loading: false, 
          error: error instanceof Error ? error.message : "Failed to load bet details" 
        } : null);
      }
    };

    fetchBetDetails();
  }, [betId]);

  return betDetails;
}