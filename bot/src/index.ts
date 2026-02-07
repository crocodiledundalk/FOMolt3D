import cron from "node-cron";
import { loadConfig } from "./config.js";
import { GameClient } from "./game-client.js";
import { AgentState } from "./state/agent-state.js";
import { FrequencyCap } from "./guardrails/frequency-cap.js";
import { Deduplicator } from "./guardrails/deduplicator.js";
import { TwitterChannel } from "./channels/twitter.js";
import { DiscordChannel } from "./channels/discord.js";
import type { PostChannel } from "./channels/types.js";
import { evaluateTriggers } from "./triggers/index.js";
import { createHourlySummary, createDailyRecap } from "./triggers/scheduled.js";
import { renderTemplate } from "./content/template-engine.js";
import { sanitize } from "./content/sanitizer.js";
import { createLogger } from "./logging/logger.js";
import { createAdminServer } from "./admin/server.js";
import type { GameStateResponse, TriggerEvent } from "./types.js";

async function main(): Promise<void> {
  // 1. Load config from env
  const config = loadConfig();
  const logger = createLogger(config.logLevel);

  logger.info("FOMolt3D Bot starting", {
    gameApiUrl: config.gameApiUrl,
    pollIntervalMs: config.pollIntervalMs,
    adminPort: config.adminPort,
  });

  // 2. Initialize channels
  const channels: PostChannel[] = [
    new TwitterChannel(config.twitter, logger),
    new DiscordChannel(config.discord.webhookUrl, logger),
  ];

  // 3. Initialize state, guardrails
  const state = new AgentState();
  const frequencyCap = new FrequencyCap();
  const deduplicator = new Deduplicator();
  const gameClient = new GameClient(config.gameApiUrl, logger);

  // Process trigger events through the pipeline
  async function processEvents(events: TriggerEvent[]): Promise<void> {
    for (const event of events) {
      const content = renderTemplate(event.template, event.data);
      const sanitized = sanitize(content);

      if (deduplicator.isDuplicate(sanitized)) {
        logger.debug("Skipping duplicate content", {
          type: event.type,
          content: sanitized,
        });
        continue;
      }

      for (const channel of channels) {
        if (!channel.isAvailable()) continue;

        if (!frequencyCap.canPost(channel.name)) {
          logger.debug("Frequency cap hit", { channel: channel.name });
          continue;
        }

        const result = await channel.post(sanitized, event.priority);

        if (result.success) {
          frequencyCap.recordPost(channel.name);
          deduplicator.record(sanitized);
          state.incrementPostCount(channel.name);
          logger.info("Post sent", {
            channel: channel.name,
            type: event.type,
            dryRun: result.dryRun,
          });
        } else {
          logger.error("Post failed", {
            channel: channel.name,
            type: event.type,
            error: result.error,
          });
        }
      }
    }
  }

  // Poll loop logic
  async function pollAndProcess(): Promise<void> {
    if (state.isPaused()) {
      logger.debug("Bot is paused, skipping poll");
      return;
    }

    const previous = state.getLastPoll();
    const current = await gameClient.fetchGameState();

    if (!current) {
      return;
    }

    state.updateFromPoll(current);
    const events = evaluateTriggers(current, previous, state);

    if (events.length > 0) {
      logger.info("Triggers fired", {
        count: events.length,
        types: events.map((e) => e.type),
      });
      await processEvents(events);
    }
  }

  // Force post handler for admin API
  async function onForcePost(): Promise<void> {
    const current = await gameClient.fetchGameState();
    if (!current) {
      throw new Error("Cannot fetch game state for force post");
    }

    state.updateFromPoll(current);
    const previous = state.getLastPoll();
    const events = evaluateTriggers(current, previous, state);

    // If no triggers, create an hourly summary anyway
    if (events.length === 0) {
      events.push(createHourlySummary(current));
    }

    await processEvents(events);
  }

  // 4. Start poll loop
  const pollInterval = setInterval(pollAndProcess, config.pollIntervalMs);
  logger.info("Poll loop started", {
    intervalMs: config.pollIntervalMs,
  });

  // Run first poll immediately
  await pollAndProcess();

  // 5. Start cron jobs

  // Hourly summary at the top of each hour
  cron.schedule("0 * * * *", async () => {
    if (state.isPaused()) return;
    const current = state.getLastPoll();
    if (!current) return;

    logger.info("Running hourly summary cron");
    const event = createHourlySummary(current);
    await processEvents([event]);
  });

  // Daily recap at 9 AM UTC
  cron.schedule("0 9 * * *", async () => {
    if (state.isPaused()) return;
    const current = state.getLastPoll();
    if (!current) return;

    logger.info("Running daily recap cron");
    const event = createDailyRecap(current);
    await processEvents([event]);
  });

  logger.info("Cron jobs scheduled (hourly summary, daily recap)");

  // 6. Start admin server
  const admin = createAdminServer(config.adminPort, {
    state,
    logger,
    onForcePost,
  });
  admin.start();

  // 7. Log startup complete
  logger.info("FOMolt3D Bot fully started");

  // Graceful shutdown
  function shutdown(): void {
    logger.info("Shutting down FOMolt3D Bot");
    clearInterval(pollInterval);
    process.exit(0);
  }

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("Fatal error starting bot:", err);
  process.exit(1);
});
