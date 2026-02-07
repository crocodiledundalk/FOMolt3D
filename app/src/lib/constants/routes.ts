export const API_ROUTES = {
  STATE: "/api/state",
  PLAYER: (address: string) => `/api/player/${address}`,
  LEADERBOARD: "/api/leaderboard",
  EVENTS: "/api/events",

  REFERRAL_CREATE: "/api/referral/create",
  TX_BUY: "/api/tx/buy",
  TX_CLAIM: "/api/tx/claim",
} as const;

export const ACTION_ROUTES = {
  BUY_KEYS: "/api/actions/buy-keys",
  CLAIM_DIVIDENDS: "/api/actions/claim-dividends",
  CLAIM_WINNER: "/api/actions/claim-winner",
  CLAIM_REFERRAL_EARNINGS: "/api/actions/claim-referral-earnings",
  MANIFEST: "/actions.json",
} as const;

export const PAGE_ROUTES = {
  HOME: "/",
  ADMIN: "/admin",
  AGENT: (address: string) => `/agent/${address}`,
  ROUNDS: "/rounds",
  ROUND: (id: number) => `/round/${id}`,
  SKILL_MD: "/skill.md",
} as const;
