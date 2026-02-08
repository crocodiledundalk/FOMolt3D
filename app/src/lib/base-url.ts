/**
 * Derive the public base URL from an incoming request.
 *
 * Priority:
 * 1. X-Forwarded-Host / X-Forwarded-Proto headers (reverse proxy / Vercel)
 * 2. Host header + protocol from request URL
 * 3. Fallback to https://fomolt3d.com
 *
 * Note: We deliberately do NOT read NEXT_PUBLIC_BASE_URL here.
 * That env var is often set to http://localhost:3000 for local dev,
 * which would leak into production if also present in the deployment
 * environment. Deriving from the request is correct in all cases:
 * - Local dev: request.url → http://localhost:3000
 * - Vercel/proxy: X-Forwarded-Host → https://fomolt3d.com
 */
export function getBaseUrl(request: Request): string {
  const headers = new Headers(request.headers);

  // Vercel / reverse proxy headers
  const forwardedHost = headers.get("x-forwarded-host");
  const forwardedProto = headers.get("x-forwarded-proto") || "https";
  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  // Derive from the request URL itself
  try {
    const url = new URL(request.url);
    return `${url.protocol}//${url.host}`;
  } catch {
    return "https://fomolt3d.com";
  }
}
