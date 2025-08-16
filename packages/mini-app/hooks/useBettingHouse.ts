"use client";

import { useAccount, useWalletClient, usePublicClient } from "wagmi";
import { useState } from "react";
import toast from "react-hot-toast";
import { getBettingHouseContract, getBettingHouseReadContract } from "@/lib/contracts";
import { zeroAddress } from "viem";
import { parseTokenAmount, formatTokenAmount, getTokenByAddress, type Token } from "@/lib/tokens";
import { useTokenAllowance } from "@/hooks/useTokenAllowance";

export function useBettingHouse() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { checkAndApproveIfNeeded, isApproving } = useTokenAllowance();

  const readContract = getBettingHouseReadContract();

  const executeTransaction = async (
    contractMethod: (contract: any) => Promise<`0x${string}`>,
    options?: {
      loadingMessage?: string;
      successMessage?: string;
      errorMessage?: string;
    }
  ) => {
    if (!walletClient || !isConnected) {
      toast.error("Please connect your wallet");
      return { success: false, error: "No wallet connected" };
    }

    setIsSubmitting(true);
    const toastId = options?.loadingMessage ? toast.loading(options.loadingMessage) : undefined;

    try {
      const contract = getBettingHouseContract(walletClient);
      const hash = await contractMethod(contract);

      if (toastId) {
        toast.success(options?.successMessage || "Transaction successful!", { id: toastId });
      }

      return { success: true, hash };
    } catch (error: any) {
      console.error("Transaction failed:", error);
      const errorMessage = error?.message || options?.errorMessage || "Transaction failed";
      
      if (toastId) {
        toast.error(errorMessage, { id: toastId });
      }

      return { success: false, error: errorMessage };
    } finally {
      setIsSubmitting(false);
    }
  };

  const createBet = async (
    challengee: `0x${string}`,
    condition: string,
    amount: string,
    deadline: number,
    token: Token,
    mediator?: `0x${string}`
  ) => {
    const amountParsed = parseTokenAmount(amount, token);
    const mediatorAddress = mediator || zeroAddress;
    
    try {
      // Check and approve token allowance first
      const approvalResult = await checkAndApproveIfNeeded(token, amountParsed);
      if (!approvalResult.success) {
        return { success: false, error: approvalResult.error };
      }
      
      return executeTransaction(
        (contract) =>
          contract.write.createBet([
            challengee,
            condition,
            amountParsed,
            BigInt(deadline),
            token.address,
            mediatorAddress,
          ]),
        {
          loadingMessage: "Creating bet...",
          successMessage: "Bet created successfully!",
          errorMessage: "Failed to create bet",
        }
      );
    } catch (error: any) {
      console.error("Failed in createBet flow:", error);
      return { success: false, error: error?.message || "Failed to create bet" };
    }
  };

  const acceptBet = async (betId: number) => {
    try {
      // Get bet details to check token allowance
      const bet = await getBet(betId);
      if (!bet) {
        return { success: false, error: "Bet not found" };
      }

      const token = getTokenByAddress(bet.token as string);
      if (!token) {
        return { success: false, error: "Unsupported token" };
      }

      // Check and approve token allowance first
      const approvalResult = await checkAndApproveIfNeeded(token, bet.amount);
      if (!approvalResult.success) {
        return { success: false, error: approvalResult.error };
      }

      return executeTransaction(
        (contract) => contract.write.acceptBet([BigInt(betId)]),
        {
          loadingMessage: "Accepting bet...",
          successMessage: "Bet accepted successfully!",
          errorMessage: "Failed to accept bet",
        }
      );
    } catch (error: any) {
      console.error("Failed in acceptBet flow:", error);
      return { success: false, error: error?.message || "Failed to accept bet" };
    }
  };

  const rejectBet = async (betId: number) => {
    return executeTransaction(
      (contract) => contract.write.rejectBet([BigInt(betId)]),
      {
        loadingMessage: "Rejecting bet...",
        successMessage: "Bet rejected successfully!",
        errorMessage: "Failed to reject bet",
      }
    );
  };

  const submitProof = async (betId: number, proof: string) => {
    return executeTransaction(
      (contract) => contract.write.submitProof([BigInt(betId), proof]),
      {
        loadingMessage: "Submitting proof...",
        successMessage: "Proof submitted successfully!",
        errorMessage: "Failed to submit proof",
      }
    );
  };

  const acceptProof = async (betId: number) => {
    return executeTransaction(
      (contract) => contract.write.acceptProof([BigInt(betId)]),
      {
        loadingMessage: "Accepting proof...",
        successMessage: "Proof accepted successfully!",
        errorMessage: "Failed to accept proof",
      }
    );
  };

  const disputeProof = async (betId: number) => {
    return executeTransaction(
      (contract) => contract.write.disputeProof([BigInt(betId)]),
      {
        loadingMessage: "Disputing proof...",
        successMessage: "Proof disputed successfully!",
        errorMessage: "Failed to dispute proof",
      }
    );
  };

  const forfeitBet = async (betId: number) => {
    return executeTransaction(
      (contract) => contract.write.forfeitBet([BigInt(betId)]),
      {
        loadingMessage: "Forfeiting bet...",
        successMessage: "Bet forfeited successfully!",
        errorMessage: "Failed to forfeit bet",
      }
    );
  };

  const claimMoney = async (betId: number) => {
    return executeTransaction(
      (contract) => contract.write.claimMoney([BigInt(betId)]),
      {
        loadingMessage: "Claiming winnings...",
        successMessage: "Winnings claimed successfully!",
        errorMessage: "Failed to claim winnings",
      }
    );
  };

  const cancelBet = async (betId: number) => {
    return executeTransaction(
      (contract) => contract.write.cancelBet([BigInt(betId)]),
      {
        loadingMessage: "Cancelling bet...",
        successMessage: "Bet cancelled successfully!",
        errorMessage: "Failed to cancel bet",
      }
    );
  };

  // Read functions
  const getBet = async (betId: number) => {
    try {
      return await readContract.read.bets([BigInt(betId)]);
    } catch (error) {
      console.error("Failed to get bet:", error);
      return null;
    }
  };

  const getCurrentStatus = async (betId: number) => {
    try {
      return await readContract.read.getCurrentStatus([BigInt(betId)]);
    } catch (error) {
      console.error("Failed to get bet status:", error);
      return null;
    }
  };

  const getTotalBets = async () => {
    try {
      return await readContract.read.totalBets();
    } catch (error) {
      console.error("Failed to get total bets:", error);
      return null;
    }
  };

  const getFees = async () => {
    try {
      return await readContract.read.fees();
    } catch (error) {
      console.error("Failed to get fees:", error);
      return null;
    }
  };

  const getFormattedBetAmount = async (betId: number) => {
    try {
      const bet = await getBet(betId);
      if (!bet) return null;
      
      const token = getTokenByAddress(bet.token as string);
      if (!token) return null;
      
      return {
        formatted: formatTokenAmount(bet.amount, token),
        token: token
      };
    } catch (error) {
      console.error("Failed to get formatted bet amount:", error);
      return null;
    }
  };

  return {
    // Connection status
    isConnected,
    address,
    isSubmitting,
    isApproving,

    // Write functions
    createBet,
    acceptBet,
    rejectBet,
    submitProof,
    acceptProof,
    disputeProof,
    forfeitBet,
    claimMoney,
    cancelBet,

    // Read functions
    getBet,
    getCurrentStatus,
    getTotalBets,
    getFees,
    getFormattedBetAmount,

    // Raw contract access
    readContract,
  };
}