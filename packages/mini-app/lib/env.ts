import {z} from "zod";

const publicEnvSchema = z.object({
    bettingHouseContractAddress: z.string().min(1, "Contract address is required"),
    rpcUrl: z.string().url("RPC URL must be a valid URL")
});

export const validatePublicEnv = () => {
    const env = {
        bettingHouseContractAddress: process.env.NEXT_PUBLIC_BETTING_HOUSE_CONTRACT_ADDRESS,
        rpcUrl: process.env.NEXT_PUBLIC_RPC_URL,
    };

    // Add debugging info
    console.log('Environment variables:', env);

    return publicEnvSchema.parse(env);
}
