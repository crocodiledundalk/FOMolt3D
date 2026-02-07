/**
 * In-memory ring buffer for tracking game state changes over time.
 * Used for price trajectory and pot momentum displays in skill.md.
 * Resets on server restart.
 */

interface StateSnapshot {
  timestamp: number; // unix timestamp ms
  totalKeys: number;
  potLamports: number;
  keyPriceLamports: number;
}

const MAX_ENTRIES = 720; // 2 hours at 10s intervals
const snapshots: StateSnapshot[] = [];

/** Record a state snapshot. Called on each skill.md or state fetch. */
export function recordSnapshot(
  totalKeys: number,
  potLamports: number,
  keyPriceLamports: number
): void {
  const now = Date.now();
  // Deduplicate: don't record if last snapshot was < 5s ago
  const last = snapshots[snapshots.length - 1];
  if (last && now - last.timestamp < 5000) return;

  snapshots.push({ timestamp: now, totalKeys, potLamports, keyPriceLamports });

  // Trim ring buffer
  if (snapshots.length > MAX_ENTRIES) {
    snapshots.splice(0, snapshots.length - MAX_ENTRIES);
  }
}

/** Get the snapshot closest to `ageMs` milliseconds ago. */
function getSnapshotAt(ageMs: number): StateSnapshot | null {
  const target = Date.now() - ageMs;
  if (snapshots.length === 0) return null;

  // Binary search for closest timestamp
  let lo = 0;
  let hi = snapshots.length - 1;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const ts = snapshots[mid].timestamp;
    if (ts === target) return snapshots[mid];
    if (ts < target) {
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  const candidates: StateSnapshot[] = [];
  if (lo < snapshots.length) candidates.push(snapshots[lo]);
  if (hi >= 0) candidates.push(snapshots[hi]);

  if (candidates.length === 0) return null;

  let best = candidates[0];
  let bestDiff = Math.abs(best.timestamp - target);
  for (const s of candidates.slice(1)) {
    const diff = Math.abs(s.timestamp - target);
    if (diff < bestDiff) {
      best = s;
      bestDiff = diff;
    }
  }

  // Only return if within 2x the requested age (reasonable data)
  if (bestDiff > ageMs) return null;
  return best;
}

/**
 * Get price trajectory description.
 * Returns something like "Key price was 0.015 SOL an hour ago, now 0.022 SOL"
 * or null if insufficient data.
 */
export function getPriceTrajectory(
  currentPriceLamports: number
): string | null {
  const oneHourAgo = getSnapshotAt(60 * 60 * 1000);
  if (!oneHourAgo) return null;

  const oldPrice = oneHourAgo.keyPriceLamports / 1e9;
  const newPrice = currentPriceLamports / 1e9;
  const pctChange =
    oldPrice > 0 ? (((newPrice - oldPrice) / oldPrice) * 100).toFixed(1) : "0";

  const direction = newPrice > oldPrice ? "up" : newPrice < oldPrice ? "down" : "unchanged";

  return `Claw price was ${oldPrice.toFixed(4)} SOL an hour ago, now ${newPrice.toFixed(4)} SOL (${direction} ${Math.abs(Number(pctChange))}%)`;
}

/**
 * Get pot momentum description.
 * Returns something like "Pot grew by 2.5 SOL in the last hour"
 * or null if insufficient data.
 */
export function getPotMomentum(currentPotLamports: number): string | null {
  const oneHourAgo = getSnapshotAt(60 * 60 * 1000);
  if (!oneHourAgo) return null;

  const growthLamports = currentPotLamports - oneHourAgo.potLamports;
  const growthSol = growthLamports / 1e9;

  if (growthLamports === 0) return "Pot unchanged in the last hour";
  if (growthLamports > 0) return `Pot grew by ${growthSol.toFixed(4)} SOL in the last hour`;
  return `Pot decreased by ${Math.abs(growthSol).toFixed(4)} SOL in the last hour`;
}
