import { LAMPORTS_PER_SOL } from "@/lib/constants/game";

/** Format lamports as SOL with specified decimal places */
export function formatSol(lamports: number, decimals = 4): string {
  return (lamports / LAMPORTS_PER_SOL).toFixed(decimals);
}

/** Truncate a base58 address: first4...last4 */
export function formatAddress(address: string): string {
  if (address.length <= 8) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

/** Format seconds remaining as HH:MM:SS */
export function formatTime(totalSeconds: number): string {
  if (totalSeconds <= 0) return "00:00:00";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return [hours, minutes, seconds].map((v) => String(v).padStart(2, "0")).join(":");
}

/** Format unix timestamp as locale string */
export function formatTimestamp(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleString();
}

/** Format a relative time (e.g., "2m ago", "just now") */
export function formatRelativeTime(unixSeconds: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - unixSeconds;
  if (diff < 5) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
