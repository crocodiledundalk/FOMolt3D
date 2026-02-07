import { z } from "zod";
import type { GameStateResponse } from "./types.js";
import type { Logger } from "./logging/logger.js";

const GameStateSchema = z.object({
  gameState: z.object({
    round: z.number(),
    potLamports: z.number(),
    totalKeys: z.number(),
    totalPlayers: z.number(),
    lastBuyer: z.string(),
    timerEnd: z.number(),
    active: z.boolean(),
    winnerPot: z.number(),
    totalDividendPool: z.number(),
  }),
  keyPriceLamports: z.number(),
  nextKeyPriceLamports: z.number(),
  phase: z.enum(["active", "ending", "ended", "claiming", "waiting"]),
});

export class GameClient {
  private consecutiveFailures = 0;
  private readonly maxLoggedFailures = 5;

  constructor(
    private readonly apiUrl: string,
    private readonly logger: Logger,
  ) {}

  async fetchGameState(): Promise<GameStateResponse | null> {
    try {
      const response = await fetch(`${this.apiUrl}/api/state`, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        this.recordFailure(`HTTP ${response.status}: ${response.statusText}`);
        return null;
      }

      const json: unknown = await response.json();
      const parsed = GameStateSchema.safeParse(json);

      if (!parsed.success) {
        this.recordFailure(`Invalid response schema: ${parsed.error.message}`);
        return null;
      }

      if (this.consecutiveFailures > 0) {
        this.logger.info("Game API connection restored", {
          previousFailures: this.consecutiveFailures,
        });
      }
      this.consecutiveFailures = 0;
      return parsed.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.recordFailure(message);
      return null;
    }
  }

  getConsecutiveFailures(): number {
    return this.consecutiveFailures;
  }

  private recordFailure(reason: string): void {
    this.consecutiveFailures++;
    if (this.consecutiveFailures <= this.maxLoggedFailures) {
      this.logger.warn("Game API fetch failed", {
        reason,
        consecutiveFailures: this.consecutiveFailures,
      });
    } else if (this.consecutiveFailures % 10 === 0) {
      this.logger.error("Game API persistently failing", {
        reason,
        consecutiveFailures: this.consecutiveFailures,
      });
    }
  }
}
