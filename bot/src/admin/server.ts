import express from "express";
import type { AgentState } from "../state/agent-state.js";
import type { Logger } from "../logging/logger.js";

export interface AdminServerDeps {
  state: AgentState;
  logger: Logger;
  onForcePost: () => Promise<void>;
}

export function createAdminServer(
  port: number,
  deps: AdminServerDeps,
): { app: express.Express; start: () => void } {
  const app = express();
  app.use(express.json());

  const { state, logger, onForcePost } = deps;

  app.get("/status", (_req, res) => {
    res.json(state.getStatus());
  });

  app.post("/pause", (_req, res) => {
    state.setPaused(true);
    logger.info("Bot paused via admin API");
    res.json({ paused: true });
  });

  app.post("/resume", (_req, res) => {
    state.setPaused(false);
    logger.info("Bot resumed via admin API");
    res.json({ paused: false });
  });

  app.post("/force-post", async (_req, res) => {
    try {
      logger.info("Force post triggered via admin API");
      await onForcePost();
      res.json({ success: true, message: "Force post executed" });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error("Force post failed", { error: message });
      res.status(500).json({ success: false, error: message });
    }
  });

  function start(): void {
    app.listen(port, "127.0.0.1", () => {
      logger.info(`Admin server listening on http://127.0.0.1:${port}`);
    });
  }

  return { app, start };
}
