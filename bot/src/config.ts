import { z } from "zod";
import type { BotConfig } from "./types.js";

const BotConfigSchema = z.object({
  gameApiUrl: z
    .string()
    .url()
    .default("http://localhost:3000"),
  pollIntervalMs: z.coerce.number().int().positive().default(10000),
  adminPort: z.coerce.number().int().positive().default(3001),
  logLevel: z
    .enum(["debug", "info", "warn", "error"])
    .default("info"),
  twitter: z.object({
    appKey: z.string().default(""),
    appSecret: z.string().default(""),
    accessToken: z.string().default(""),
    accessSecret: z.string().default(""),
  }),
  discord: z.object({
    webhookUrl: z.string().default(""),
  }),
});

export function loadConfig(env: Record<string, string | undefined> = process.env): BotConfig {
  const raw = {
    gameApiUrl: env.GAME_API_URL || "http://localhost:3000",
    pollIntervalMs: env.POLL_INTERVAL_MS || 10000,
    adminPort: env.ADMIN_PORT || 3001,
    logLevel: env.LOG_LEVEL || "info",
    twitter: {
      appKey: env.TWITTER_APP_KEY || "",
      appSecret: env.TWITTER_APP_SECRET || "",
      accessToken: env.TWITTER_ACCESS_TOKEN || "",
      accessSecret: env.TWITTER_ACCESS_SECRET || "",
    },
    discord: {
      webhookUrl: env.DISCORD_WEBHOOK_URL || "",
    },
  };

  const parsed = BotConfigSchema.parse(raw);
  return parsed;
}
