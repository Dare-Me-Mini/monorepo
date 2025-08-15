import { getContract, createPublicClient, http, type GetContractReturnType, type WalletClient, type Transport, type Chain, type ParseAccount, type Address, type Client } from "viem";
import { base } from "viem/chains";
import { BettingHouseAbi } from "@/abis/BettingHouseAbi";
import { validatePublicEnv } from "./env";

const env = validatePublicEnv();

// Public client for read-only operations
export const publicClient = createPublicClient({
  chain: base,
  transport: http(env.rpcUrl),
});

export type BettingHouseContract = GetContractReturnType<
  typeof BettingHouseAbi,
  Client,
  Address
>;

export const getBettingHouseContract = (client: Client) =>
  getContract({
    abi: BettingHouseAbi,
    address: env.bettingHouseContractAddress as `0x${string}`,
    client,
  }) as BettingHouseContract;

export const getBettingHouseReadContract = () =>
  getContract({
    abi: BettingHouseAbi,
    address: env.bettingHouseContractAddress as `0x${string}`,
    client: publicClient,
  });