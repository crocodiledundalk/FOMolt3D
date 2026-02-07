import type { GameStateResponse } from "../types.js";

export class AgentState {
  private lastPoll: GameStateResponse | null = null;
  private firedMilestones: Set<number> = new Set();
  private timerDramaActive = false;
  private postCounts: Map<string, number> = new Map();
  private paused = false;
  private startedAt: number = Date.now();
  private lastPollTime: number = 0;
  private currentRound: number = 0;

  updateFromPoll(state: GameStateResponse): void {
    // If round changed, reset milestones and timer drama state
    if (this.currentRound !== 0 && state.gameState.round !== this.currentRound) {
      this.firedMilestones.clear();
      this.timerDramaActive = false;
    }
    this.currentRound = state.gameState.round;
    this.lastPoll = state;
    this.lastPollTime = Date.now();
  }

  getLastPoll(): GameStateResponse | null {
    return this.lastPoll;
  }

  getLastPollTime(): number {
    return this.lastPollTime;
  }

  hasMilestoneFired(milestone: number): boolean {
    return this.firedMilestones.has(milestone);
  }

  recordMilestone(milestone: number): void {
    this.firedMilestones.add(milestone);
  }

  isTimerDramaActive(): boolean {
    return this.timerDramaActive;
  }

  setTimerDramaActive(active: boolean): void {
    this.timerDramaActive = active;
  }

  incrementPostCount(channel: string): void {
    const current = this.postCounts.get(channel) ?? 0;
    this.postCounts.set(channel, current + 1);
  }

  getPostCount(channel: string): number {
    return this.postCounts.get(channel) ?? 0;
  }

  getTotalPostCount(): number {
    let total = 0;
    for (const count of this.postCounts.values()) {
      total += count;
    }
    return total;
  }

  isPaused(): boolean {
    return this.paused;
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
  }

  getUptime(): number {
    return Date.now() - this.startedAt;
  }

  getCurrentRound(): number {
    return this.currentRound;
  }

  getStatus(): Record<string, unknown> {
    return {
      paused: this.paused,
      currentRound: this.currentRound,
      lastPollTime: this.lastPollTime
        ? new Date(this.lastPollTime).toISOString()
        : null,
      uptimeMs: this.getUptime(),
      totalPosts: this.getTotalPostCount(),
      postsByChannel: Object.fromEntries(this.postCounts),
      firedMilestones: Array.from(this.firedMilestones),
      timerDramaActive: this.timerDramaActive,
    };
  }
}
