import { formatTime } from "./format";

export type UrgencyLevel = "CRITICAL" | "HOT" | "WARM" | "ACTIVE";

/** Determine urgency level from seconds remaining */
export function getUrgencyLevel(remainingSecs: number): UrgencyLevel {
  if (remainingSecs < 300) return "CRITICAL";
  if (remainingSecs < 3600) return "HOT";
  if (remainingSecs < 21600) return "WARM";
  return "ACTIVE";
}

/** Emoji for each urgency level */
export function getUrgencyEmoji(level: UrgencyLevel): string {
  switch (level) {
    case "CRITICAL":
      return "\uD83D\uDEA8";
    case "HOT":
      return "\uD83D\uDD25";
    case "WARM":
      return "\u23F3";
    case "ACTIVE":
      return "\uD83D\uDFE2";
  }
}

/** Format timer with urgency context */
export function formatUrgentTimer(remainingSecs: number): string {
  const time = formatTime(remainingSecs);
  const level = getUrgencyLevel(remainingSecs);
  switch (level) {
    case "CRITICAL":
      return `\u26A0\uFE0F ${time} \u2014 FINAL MINUTES`;
    case "HOT":
      return `\uD83D\uDD25 ${time} \u2014 ENDING SOON`;
    case "WARM":
      return `\u23F3 ${time}`;
    case "ACTIVE":
      return time;
  }
}
