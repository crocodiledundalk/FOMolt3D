/** Shared agent User-Agent detection patterns, used by middleware and API routes. */
const AGENT_PATTERNS = [
  "bot",
  "agent",
  "curl",
  "python-requests",
  "node-fetch",
  "httpie",
  "wget",
  "axios",
  "got",
  "undici",
  "claude",
  "chatgpt",
  "openai",
  "anthropic",
  "gpt-",
  "llm",
  "cohere",
  "langchain",
  "autogpt",
  "scrapy",
  "aiohttp",
  "requests/",
  "spider",
  "crawler",
  "fetch/",
  "ruby",
  "perl",
  "java/",
  "go-http",
  "deno/",
];

/** Returns true if the User-Agent string matches a known agent pattern. */
export function isAgentUserAgent(ua: string): boolean {
  const lower = ua.toLowerCase();
  return AGENT_PATTERNS.some((pattern) => lower.includes(pattern));
}
