import {z} from "zod";

const publicEnvSchema = z.object({
    bettingHouseContractAddress: z.string(),
    rpcUrl: z.url()
});

export const validatePublicEnv = () => {
    return publicEnvSchema.parse({
        bettingHouseContractAddress: process.env.BETTING_HOUSE_CONTRACT_ADDRESS,
        rpcUrl: process.env.RPC_URL,
    });
}
