import type { PostChannel } from "./types.js";
import type { PostResult } from "../types.js";
import type { Logger } from "../logging/logger.js";

const PRIORITY_COLORS: Record<string, number> = {
  high: 0xff4444,    // Red
  medium: 0xffaa00,  // Orange
  low: 0x44aaff,     // Blue
};

export class DiscordChannel implements PostChannel {
  readonly name = "discord";
  private readonly dryRun: boolean;

  constructor(
    private readonly webhookUrl: string,
    private readonly logger: Logger,
  ) {
    this.dryRun = !webhookUrl || webhookUrl.length === 0;
    if (this.dryRun) {
      this.logger.info("Discord channel in dry-run mode (no webhook URL)");
    } else {
      this.logger.info("Discord channel initialized with webhook URL");
    }
  }

  isAvailable(): boolean {
    return true; // Always available — dry-run mode when no webhook
  }

  async post(content: string, priority: string): Promise<PostResult> {
    if (this.dryRun) {
      this.logger.info("Discord dry-run post", { content });
      return {
        success: true,
        channel: this.name,
        dryRun: true,
      };
    }

    const color = PRIORITY_COLORS[priority] ?? PRIORITY_COLORS.low;

    const payload = {
      embeds: [
        {
          title: "FOMolt3D Update",
          description: content,
          color,
          timestamp: new Date().toISOString(),
          footer: {
            text: "FOMolt3D Bot",
          },
        },
      ],
    };

    try {
      const response = await fetch(this.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        const text = await response.text();
        this.logger.error("Discord webhook failed", {
          status: response.status,
          body: text,
        });
        return {
          success: false,
          channel: this.name,
          error: `HTTP ${response.status}: ${text}`,
          dryRun: false,
        };
      }

      this.logger.info("Discord message posted");
      return {
        success: true,
        channel: this.name,
        dryRun: false,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error("Discord post failed", { error: message });
      return {
        success: false,
        channel: this.name,
        error: message,
        dryRun: false,
      };
    }
  }
}
