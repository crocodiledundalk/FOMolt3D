import { TwitterApi } from "twitter-api-v2";
import type { PostChannel } from "./types.js";
import type { PostResult } from "../types.js";
import type { Logger } from "../logging/logger.js";

export class TwitterChannel implements PostChannel {
  readonly name = "twitter";
  private client: TwitterApi | null = null;
  private readonly dryRun: boolean;

  constructor(
    credentials: {
      appKey: string;
      appSecret: string;
      accessToken: string;
      accessSecret: string;
    },
    private readonly logger: Logger,
  ) {
    const hasCredentials =
      credentials.appKey.length > 0 &&
      credentials.appSecret.length > 0 &&
      credentials.accessToken.length > 0 &&
      credentials.accessSecret.length > 0;

    if (hasCredentials) {
      this.client = new TwitterApi({
        appKey: credentials.appKey,
        appSecret: credentials.appSecret,
        accessToken: credentials.accessToken,
        accessSecret: credentials.accessSecret,
      });
      this.dryRun = false;
      this.logger.info("Twitter channel initialized with credentials");
    } else {
      this.dryRun = true;
      this.logger.info("Twitter channel in dry-run mode (no credentials)");
    }
  }

  isAvailable(): boolean {
    return true; // Always available — dry-run mode when no credentials
  }

  async post(content: string, _priority: string): Promise<PostResult> {
    const truncated = content.slice(0, 280);

    if (this.dryRun) {
      this.logger.info("Twitter dry-run post", { content: truncated });
      return {
        success: true,
        channel: this.name,
        dryRun: true,
      };
    }

    try {
      const rwClient = this.client!.readWrite;
      const result = await rwClient.v2.tweet(truncated);
      this.logger.info("Tweet posted", { tweetId: result.data.id });
      return {
        success: true,
        channel: this.name,
        messageId: result.data.id,
        dryRun: false,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error("Twitter post failed", { error: message });
      return {
        success: false,
        channel: this.name,
        error: message,
        dryRun: false,
      };
    }
  }
}
