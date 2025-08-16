import {z} from "zod";

const publicEnvSchema = z.object({
    bettingHouseContractAddress: z.string(),
    rpcUrl: z.url(),
    appUrl: z.url().optional().default("https://www.ibetyou.today"),
    indexerUrl: z.url().optional().default("http://localhost:42069"),
    supabaseUrl: z.url(),
    supabaseAnonKey: z.string(),
});

export const validatePublicEnv = () => {
    return publicEnvSchema.parse({
        bettingHouseContractAddress: process.env.NEXT_PUBLIC_BETTING_HOUSE_CONTRACT_ADDRESS,
        rpcUrl: process.env.NEXT_PUBLIC_RPC_URL,
        appUrl: process.env.NEXT_PUBLIC_APP_URL,
        indexerUrl: process.env.NEXT_PUBLIC_INDEXER_URL,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    });
}

const serverEnvSchema = z.object({
    neynarApiKey: z.string(),
    geminiApiKey: z.string(),
});

export const validateServerEnv = () => {
    return serverEnvSchema.parse({
        neynarApiKey: process.env.NEYNAR_API_KEY,
        geminiApiKey: process.env.GEMINI_API_KEY,
    });
}
