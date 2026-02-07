export interface GameStateResponse {
  gameState: {
    round: number;
    potLamports: number;
    totalKeys: number;
    totalPlayers: number;
    lastBuyer: string;
    timerEnd: number;
    active: boolean;
    winnerPot: number;
    totalDividendPool: number;
  };
  keyPriceLamports: number;
  nextKeyPriceLamports: number;
  phase: "active" | "ending" | "ended" | "claiming" | "waiting";
}

export interface TriggerEvent {
  type:
    | "pot_milestone"
    | "timer_drama"
    | "round_start"
    | "round_end"
    | "hourly_summary"
    | "daily_recap";
  priority: "high" | "medium" | "low";
  data: Record<string, unknown>;
  template: string;
}

export interface PostResult {
  success: boolean;
  channel: string;
  messageId?: string;
  error?: string;
  dryRun: boolean;
}

export interface BotConfig {
  gameApiUrl: string;
  pollIntervalMs: number;
  adminPort: number;
  logLevel: string;
  twitter: {
    appKey: string;
    appSecret: string;
    accessToken: string;
    accessSecret: string;
  };
  discord: {
    webhookUrl: string;
  };
}
