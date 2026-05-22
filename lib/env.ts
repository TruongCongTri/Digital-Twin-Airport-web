import { z } from "zod";

// 1. Schema definitions
const envSchema = z.object({
  // CLIENT-SIDE (Public - must have NEXT_PUBLIC_)
  NEXT_PUBLIC_API_URL: z
    .string()
    .url({ message: "API URL must be a valid URL" }),
  NEXT_PUBLIC_URL: z
    .string()
    .url({ message: "Public URL must be a valid URL" }),
  // SERVER-SIDE (Private - only used in Route Handlers/Server Components)
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  // Add private environment variables here (EG: STRIPE_SECRET_KEY...)
});

// 2. Parse and validate environment variables
// IMPORTANT NOTE FOR NEXT.JS: Must explicitly declare process.env.NEXT_PUBLIC_...
// here so Webpack can read and replace the strings at build time.
export const env = envSchema.parse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_URL: process.env.NEXT_PUBLIC_URL,
  NODE_ENV: process.env.NODE_ENV,
});
