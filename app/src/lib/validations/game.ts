import { z } from "zod";
import { isValidSolanaAddress } from "@/lib/sdk/addresses";

/** Solana base58 public key — validated via @solana/kit-compatible check. */
export const pubkeySchema = z
  .string()
  .refine(isValidSolanaAddress, "Invalid Solana public key");

export const buyKeysRequestSchema = z.object({
  account: pubkeySchema,
  keysToBuy: z.number().int().positive().max(10000),
  referrer: pubkeySchema.optional(),
});

export const claimRequestSchema = z.object({
  account: pubkeySchema,
});

export const referralCreateSchema = z.object({
  pubkey: pubkeySchema,
});

export const playerParamSchema = z.object({
  address: pubkeySchema,
});

export const gameStateSchema = z.object({
  round: z.number().int().nonnegative(),
  potLamports: z.number().int().nonnegative(),
  timerEnd: z.number().int(),
  lastBuyer: z.string(),
  totalKeys: z.number().int().nonnegative(),
  roundStart: z.number().int(),
  active: z.boolean(),
  winnerClaimed: z.boolean(),
  totalPlayers: z.number().int().nonnegative(),
  totalDividendPool: z.number().int().nonnegative(),
  nextRoundPot: z.number().int().nonnegative(),
  winnerPot: z.number().int().nonnegative(),
  basePriceLamports: z.number().int().nonnegative(),
  priceIncrementLamports: z.number().int().nonnegative(),
  timerExtensionSecs: z.number().int().nonnegative(),
  maxTimerSecs: z.number().int().nonnegative(),
  winnerBps: z.number().int().nonnegative(),
  dividendBps: z.number().int().nonnegative(),
  nextRoundBps: z.number().int().nonnegative(),
  protocolFeeBps: z.number().int().nonnegative(),
  referralBonusBps: z.number().int().nonnegative(),
  protocolWallet: z.string(),
});

export const actionGetResponseSchema = z.object({
  type: z.literal("action"),
  icon: z.string().url(),
  title: z.string(),
  description: z.string(),
  label: z.string(),
  links: z
    .object({
      actions: z.array(
        z.object({
          label: z.string(),
          href: z.string(),
          parameters: z
            .array(
              z.object({
                name: z.string(),
                label: z.string(),
                required: z.boolean().optional(),
              })
            )
            .optional(),
        })
      ),
    })
    .optional(),
});

export const actionPostRequestSchema = z.object({
  account: pubkeySchema,
});
