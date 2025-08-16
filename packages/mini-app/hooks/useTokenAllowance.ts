"use client";

import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { useState, useCallback } from "react";
import { getContract, erc20Abi, maxUint256 } from "viem";
import toast from "react-hot-toast";
import { getBettingHouseReadContract } from "@/lib/contracts";
import { validatePublicEnv } from "@/lib/env";
import type { Token } from "@/lib/tokens";

const env = validatePublicEnv();

export function useTokenAllowance() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const [isApproving, setIsApproving] = useState(false);

  const checkAllowance = useCallback(async (token: Token): Promise<bigint> => {
    if (!address || !publicClient) return BigInt(0);

    try {
      const tokenContract = getContract({
        address: token.address,
        abi: erc20Abi,
        client: publicClient,
      });

      const allowance = await tokenContract.read.allowance([
        address,
        env.bettingHouseContractAddress as `0x${string}`,
      ]);

      return allowance;
    } catch (error) {
      console.error("Failed to check allowance:", error);
      return BigInt(0);
    }
  }, [address, publicClient]);

  const checkBalance = useCallback(async (token: Token): Promise<bigint> => {
    if (!address || !publicClient) return BigInt(0);

    try {
      const tokenContract = getContract({
        address: token.address,
        abi: erc20Abi,
        client: publicClient,
      });

      const balance = await tokenContract.read.balanceOf([address]);
      return balance;
    } catch (error) {
      console.error("Failed to check balance:", error);
      return BigInt(0);
    }
  }, [address, publicClient]);

  const approveToken = useCallback(async (
    token: Token,
    amount?: bigint
  ): Promise<{ success: boolean; hash?: `0x${string}`; error?: string }> => {
    if (!walletClient || !address || !publicClient) {
      return { success: false, error: "No wallet connected" };
    }

    setIsApproving(true);
    const toastId = toast.loading(`Approving ${token.symbol} for this transaction...`);

    try {
      const tokenContract = getContract({
        address: token.address,
        abi: erc20Abi,
        client: walletClient,
      });

      // Use maxUint256 for unlimited approval or specific amount
      const approvalAmount = amount || maxUint256;

      const hash = await tokenContract.write.approve([
        env.bettingHouseContractAddress as `0x${string}`,
        approvalAmount,
      ]);

      // Wait for transaction confirmation
      toast.loading(`Waiting for ${token.symbol} approval confirmation...`, { id: toastId });
      
      const receipt = await publicClient.waitForTransactionReceipt({ 
        hash,
        confirmations: 1 
      });

      if (receipt.status === 'success') {
        toast.success(`${token.symbol} approved successfully!`, { id: toastId });
        return { success: true, hash };
      } else {
        throw new Error("Transaction failed");
      }
    } catch (error: any) {
      console.error("Failed to approve token:", error);
      const errorMessage = error?.message || "Failed to approve token";
      toast.error(errorMessage, { id: toastId });
      return { success: false, error: errorMessage };
    } finally {
      setIsApproving(false);
    }
  }, [walletClient, address, publicClient]);

  const checkAndApproveIfNeeded = useCallback(async (
    token: Token,
    requiredAmount: bigint
  ): Promise<{ success: boolean; hash?: `0x${string}`; error?: string }> => {
    try {
      // First check current allowance
      const currentAllowance = await checkAllowance(token);
      
      // If allowance is sufficient, no approval needed
      if (currentAllowance >= requiredAmount) {
        return { success: true };
      }

      // Check if user has sufficient balance
      const balance = await checkBalance(token);
      if (balance < requiredAmount) {
        return { 
          success: false, 
          error: `Insufficient ${token.symbol} balance. Required: ${requiredAmount}, Available: ${balance}` 
        };
      }

      // Need to approve - request approval for unlimited amount for better UX
      return await approveToken(token);
    } catch (error: any) {
      console.error("Failed to check and approve:", error);
      return { success: false, error: error?.message || "Failed to check allowance" };
    }
  }, [checkAllowance, checkBalance, approveToken]);

  return {
    checkAllowance,
    checkBalance,
    approveToken,
    checkAndApproveIfNeeded,
    isApproving,
  };
}