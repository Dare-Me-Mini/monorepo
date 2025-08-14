import { createConfig } from "ponder";

import { BettingHouseAbi } from "./abis/BettingHouseAbi";

if (!process.env.BASE_RPC_URL || !process.env.BETTING_HOUSE_ADDRESS) {
  throw new Error("Missing environment variables");
}

export default createConfig({
  chains: {
    base: {
      id: 8453,
      rpc: process.env.BASE_RPC_URL,
    },
  },
  contracts: {
    BettingHouse: {
      chain: "base",
      abi: BettingHouseAbi,
      address: process.env.BETTING_HOUSE_ADDRESS as `0x${string}`,
      startBlock: Number(process.env.PONDER_START_BLOCK || "0"),
    },
  },
});
