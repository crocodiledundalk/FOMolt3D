const DEFAULT_TTL_MS = 60 * 60 * 1000; // 1 hour

interface HashEntry {
  hash: number;
  expiresAt: number;
}

export class Deduplicator {
  private entries: HashEntry[] = [];
  private readonly ttlMs: number;

  constructor(ttlMs: number = DEFAULT_TTL_MS) {
    this.ttlMs = ttlMs;
  }

  isDuplicate(content: string): boolean {
    this.evictExpired();
    const hash = this.computeHash(content);
    return this.entries.some((entry) => entry.hash === hash);
  }

  record(content: string): void {
    this.evictExpired();
    const hash = this.computeHash(content);
    if (!this.entries.some((entry) => entry.hash === hash)) {
      this.entries.push({
        hash,
        expiresAt: Date.now() + this.ttlMs,
      });
    }
  }

  resetForNewRound(): void {
    this.entries = [];
  }

  getEntryCount(): number {
    this.evictExpired();
    return this.entries.length;
  }

  private evictExpired(): void {
    const now = Date.now();
    this.entries = this.entries.filter((entry) => entry.expiresAt > now);
  }

  private computeHash(str: string): number {
    // Simple DJB2 hash
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
    }
    return hash;
  }
}
