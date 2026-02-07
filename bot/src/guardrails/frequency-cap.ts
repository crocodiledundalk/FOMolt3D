const MAX_POSTS_PER_DAY = 20;
const MAX_POSTS_PER_HOUR = 5;
const MIN_GAP_MS = 30 * 60 * 1000; // 30 minutes

interface PostRecord {
  timestamps: number[];
}

export class FrequencyCap {
  private channels: Map<string, PostRecord> = new Map();

  canPost(channel: string): boolean {
    const record = this.channels.get(channel);
    if (!record) {
      return true;
    }

    const now = Date.now();

    // Check minimum gap
    const lastPost = record.timestamps[record.timestamps.length - 1];
    if (lastPost && now - lastPost < MIN_GAP_MS) {
      return false;
    }

    // Check hourly limit
    const oneHourAgo = now - 60 * 60 * 1000;
    const postsThisHour = record.timestamps.filter(
      (t) => t > oneHourAgo,
    ).length;
    if (postsThisHour >= MAX_POSTS_PER_HOUR) {
      return false;
    }

    // Check daily limit
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const postsToday = record.timestamps.filter(
      (t) => t > oneDayAgo,
    ).length;
    if (postsToday >= MAX_POSTS_PER_DAY) {
      return false;
    }

    return true;
  }

  recordPost(channel: string): void {
    let record = this.channels.get(channel);
    if (!record) {
      record = { timestamps: [] };
      this.channels.set(channel, record);
    }

    const now = Date.now();
    record.timestamps.push(now);

    // Prune entries older than 24 hours
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    record.timestamps = record.timestamps.filter((t) => t > oneDayAgo);
  }

  getPostCount(channel: string, windowMs: number): number {
    const record = this.channels.get(channel);
    if (!record) return 0;
    const cutoff = Date.now() - windowMs;
    return record.timestamps.filter((t) => t > cutoff).length;
  }

  reset(): void {
    this.channels.clear();
  }
}
