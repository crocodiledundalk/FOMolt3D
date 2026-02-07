import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { evaluateTriggers } from "../src/triggers/index.js";
import { AgentState } from "../src/state/agent-state.js";
import type { GameStateResponse } from "../src/types.js";

const LAMPORTS_PER_SOL = 1_000_000_000;

function makeGameState(overrides: Partial<{
  round: number;
  potLamports: number;
  totalKeys: number;
  totalPlayers: number;
  lastBuyer: string;
  timerEnd: number;
  active: boolean;
  winnerPot: number;
  totalDividendPool: number;
  keyPriceLamports: number;
  phase: GameStateResponse["phase"];
}>): GameStateResponse {
  return {
    gameState: {
      round: overrides.round ?? 1,
      potLamports: overrides.potLamports ?? 0,
      totalKeys: overrides.totalKeys ?? 0,
      totalPlayers: overrides.totalPlayers ?? 0,
      lastBuyer: overrides.lastBuyer ?? "SomeWallet111111111111111111111111111111111",
      timerEnd: overrides.timerEnd ?? Math.floor(Date.now() / 1000) + 3600,
      active: overrides.active ?? true,
      winnerPot: overrides.winnerPot ?? 0,
      totalDividendPool: overrides.totalDividendPool ?? 0,
    },
    keyPriceLamports: overrides.keyPriceLamports ?? 10_000_000,
    nextKeyPriceLamports: (overrides.keyPriceLamports ?? 10_000_000) + 1_000_000,
    phase: overrides.phase ?? "active",
  };
}

describe("Triggers", () => {
  let state: AgentState;

  beforeEach(() => {
    state = new AgentState();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("Pot Milestones", () => {
    it("should detect when pot crosses a milestone", () => {
      const previous = makeGameState({ potLamports: 0.5 * LAMPORTS_PER_SOL });
      const current = makeGameState({ potLamports: 1.5 * LAMPORTS_PER_SOL });

      const events = evaluateTriggers(current, previous, state);
      const milestoneEvents = events.filter((e) => e.type === "pot_milestone");

      expect(milestoneEvents).toHaveLength(1);
      expect(milestoneEvents[0].data.milestone).toBe(1);
    });

    it("should detect multiple milestones crossed at once", () => {
      const previous = makeGameState({ potLamports: 0 });
      const current = makeGameState({ potLamports: 6 * LAMPORTS_PER_SOL });

      const events = evaluateTriggers(current, previous, state);
      const milestoneEvents = events.filter((e) => e.type === "pot_milestone");

      expect(milestoneEvents).toHaveLength(2); // 1 SOL and 5 SOL
      expect(milestoneEvents.map((e) => e.data.milestone)).toContain(1);
      expect(milestoneEvents.map((e) => e.data.milestone)).toContain(5);
    });

    it("should not re-fire a milestone that already fired", () => {
      const previous = makeGameState({ potLamports: 0.5 * LAMPORTS_PER_SOL });
      const current = makeGameState({ potLamports: 1.5 * LAMPORTS_PER_SOL });

      // First evaluation fires the milestone
      evaluateTriggers(current, previous, state);

      // Second evaluation should not fire again
      const events = evaluateTriggers(current, previous, state);
      const milestoneEvents = events.filter((e) => e.type === "pot_milestone");

      expect(milestoneEvents).toHaveLength(0);
    });

    it("should not fire when pot is below all milestones", () => {
      const previous = makeGameState({ potLamports: 0 });
      const current = makeGameState({ potLamports: 0.5 * LAMPORTS_PER_SOL });

      const events = evaluateTriggers(current, previous, state);
      const milestoneEvents = events.filter((e) => e.type === "pot_milestone");

      expect(milestoneEvents).toHaveLength(0);
    });
  });

  describe("Timer Drama", () => {
    it("should fire when timer is under 60 seconds", () => {
      const nowSec = Math.floor(Date.now() / 1000);
      const current = makeGameState({
        timerEnd: nowSec + 30,
        active: true,
        winnerPot: 10 * LAMPORTS_PER_SOL,
      });

      const events = evaluateTriggers(current, null, state);
      const dramaEvents = events.filter((e) => e.type === "timer_drama");

      expect(dramaEvents).toHaveLength(1);
      expect(dramaEvents[0].priority).toBe("high");
    });

    it("should only fire once per drama window", () => {
      const nowSec = Math.floor(Date.now() / 1000);
      const current = makeGameState({
        timerEnd: nowSec + 30,
        active: true,
      });

      // First evaluation fires
      const events1 = evaluateTriggers(current, null, state);
      expect(events1.filter((e) => e.type === "timer_drama")).toHaveLength(1);

      // Second evaluation should not fire again
      const events2 = evaluateTriggers(current, null, state);
      expect(events2.filter((e) => e.type === "timer_drama")).toHaveLength(0);
    });

    it("should not fire when timer is above 60 seconds", () => {
      const nowSec = Math.floor(Date.now() / 1000);
      const current = makeGameState({
        timerEnd: nowSec + 3600,
        active: true,
      });

      const events = evaluateTriggers(current, null, state);
      const dramaEvents = events.filter((e) => e.type === "timer_drama");

      expect(dramaEvents).toHaveLength(0);
    });

    it("should not fire when game is inactive", () => {
      const nowSec = Math.floor(Date.now() / 1000);
      const current = makeGameState({
        timerEnd: nowSec + 10,
        active: false,
      });

      const events = evaluateTriggers(current, null, state);
      const dramaEvents = events.filter((e) => e.type === "timer_drama");

      expect(dramaEvents).toHaveLength(0);
    });
  });

  describe("Round Lifecycle", () => {
    it("should detect round start when round number changes", () => {
      const previous = makeGameState({ round: 1 });
      const current = makeGameState({ round: 2 });

      const events = evaluateTriggers(current, previous, state);
      const startEvents = events.filter((e) => e.type === "round_start");

      expect(startEvents).toHaveLength(1);
      expect(startEvents[0].data.round).toBe(2);
    });

    it("should detect round end when active changes to false", () => {
      const previous = makeGameState({
        round: 1,
        active: true,
        winnerPot: 50 * LAMPORTS_PER_SOL,
        lastBuyer: "WinnerWallet1111111111111111111111111111111",
      });
      const current = makeGameState({ round: 1, active: false });

      const events = evaluateTriggers(current, previous, state);
      const endEvents = events.filter((e) => e.type === "round_end");

      expect(endEvents).toHaveLength(1);
      expect(endEvents[0].data.winner).toBe(
        "WinnerWallet1111111111111111111111111111111",
      );
    });

    it("should not fire lifecycle events when nothing changed", () => {
      const previous = makeGameState({ round: 1, active: true });
      const current = makeGameState({ round: 1, active: true });

      const events = evaluateTriggers(current, previous, state);
      const lifecycleEvents = events.filter(
        (e) => e.type === "round_start" || e.type === "round_end",
      );

      expect(lifecycleEvents).toHaveLength(0);
    });

    it("should not fire lifecycle events with no previous state", () => {
      const current = makeGameState({ round: 1, active: true });

      const events = evaluateTriggers(current, null, state);
      const lifecycleEvents = events.filter(
        (e) => e.type === "round_start" || e.type === "round_end",
      );

      expect(lifecycleEvents).toHaveLength(0);
    });
  });

  describe("Trigger Ordering", () => {
    it("should sort events by priority (high first)", () => {
      const nowSec = Math.floor(Date.now() / 1000);
      const previous = makeGameState({
        potLamports: 0.5 * LAMPORTS_PER_SOL,
        active: true,
      });
      const current = makeGameState({
        potLamports: 1.5 * LAMPORTS_PER_SOL,
        timerEnd: nowSec + 30,
        active: true,
      });

      const events = evaluateTriggers(current, previous, state);

      // timer_drama is high priority, pot_milestone (1 SOL) is medium
      expect(events.length).toBeGreaterThanOrEqual(2);

      const highEvents = events.filter((e) => e.priority === "high");
      const mediumEvents = events.filter((e) => e.priority === "medium");

      if (highEvents.length > 0 && mediumEvents.length > 0) {
        const firstHighIdx = events.indexOf(highEvents[0]);
        const firstMediumIdx = events.indexOf(mediumEvents[0]);
        expect(firstHighIdx).toBeLessThan(firstMediumIdx);
      }
    });
  });
});
