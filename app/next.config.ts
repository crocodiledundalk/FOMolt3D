import type { NextConfig } from "next";
import { getBlockchainId } from "./src/lib/network";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@coral-xyz/anchor",
    "@solana/web3.js",
    "bn.js",
    "borsh",
    "bs58",
    "@noble/curves",
    "@noble/hashes",
    "superstruct",
  ],
  webpack: (config) => {
    // pino-pretty is an optional peer dep of pino (used by WalletConnect).
    // Alias to false to suppress "Module not found" warnings.
    config.resolve.alias = {
      ...config.resolve.alias,
      "pino-pretty": false,
    };
    return config;
  },
  async headers() {
    return [
      {
        source: "/api/actions/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, OPTIONS" },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization, Accept-Encoding",
          },
          { key: "Access-Control-Expose-Headers", value: "X-Action-Version, X-Blockchain-Ids" },
          { key: "X-Action-Version", value: "2.4" },
          { key: "X-Blockchain-Ids", value: getBlockchainId() },
        ],
      },
      {
        source: "/actions.json",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type" },
        ],
      },
    ];
  },
};

export default nextConfig;
