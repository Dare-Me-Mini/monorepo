import { createConfig } from "ponder";

import { BettingHouseAbi } from "./abis/BettingHouseAbi";

export default createConfig({
  chains: {
    mainnet: {
      id: 1,
      rpc: process.env.PONDER_RPC_URL_1!,
    },
  },
  contracts: {
    BettingHouse: {
      chain: "mainnet",
      abi: BettingHouseAbi,
      address: process.env.BETTING_HOUSE_ADDRESS as `0x${string}`,
      startBlock: Number(process.env.PONDER_START_BLOCK || 0),
    },
  },
});
