import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker builds set NEXT_STANDALONE=1 to emit .next/standalone (a minimal server.js +
  // traced node_modules). Vercel builds leave it unset and use their native output.
  ...(process.env.NEXT_STANDALONE === "1" && { output: "standalone" as const }),
};

export default nextConfig;
