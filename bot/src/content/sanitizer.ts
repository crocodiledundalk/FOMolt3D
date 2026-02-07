const DEFAULT_BLOCKED_KEYWORDS = [
  "guaranteed profit",
  "risk-free",
  "get rich quick",
  "financial advice",
  "not a scam",
  "100% returns",
];

const DEFAULT_MAX_LENGTH = 280;

export function sanitize(
  content: string,
  maxLength: number = DEFAULT_MAX_LENGTH,
  blockedKeywords: string[] = DEFAULT_BLOCKED_KEYWORDS,
): string {
  let result = content;

  // Remove blocked keywords (case-insensitive)
  for (const keyword of blockedKeywords) {
    const regex = new RegExp(escapeRegExp(keyword), "gi");
    result = result.replace(regex, "");
  }

  // Clean UTF-8: remove non-printable characters except common whitespace
  result = result.replace(/[^\x20-\x7E\xA0-\uFFFF\n\r\t]/g, "");

  // Collapse multiple spaces into one
  result = result.replace(/  +/g, " ");

  // Trim whitespace
  result = result.trim();

  // Truncate to max length
  if (result.length > maxLength) {
    result = result.slice(0, maxLength - 1) + "\u2026";
  }

  return result;
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
