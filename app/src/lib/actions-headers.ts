/** Standard headers for Solana Actions endpoints */
export const ACTIONS_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept-Encoding",
  "Access-Control-Expose-Headers": "X-Action-Version, X-Blockchain-Ids",
  "X-Action-Version": "2.2",
  "X-Blockchain-Ids": "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
} as const;

export function actionsOptions() {
  return new Response(null, {
    status: 204,
    headers: ACTIONS_CORS_HEADERS,
  });
}
