/**
 * Derive the public base URL from an incoming request.
 *
 * Priority:
 * 1. NEXT_PUBLIC_BASE_URL env var (explicit override)
 * 2. X-Forwarded-Host / X-Forwarded-Proto headers (reverse proxy / Vercel)
 * 3. Host header + protocol from request URL
 * 4. Fallback to https://fomolt3d.com
 */
export function getBaseUrl(request: Request): string {
  const envUrl = process.env.NEXT_PUBLIC_BASE_URL;
  if (envUrl) return envUrl.replace(/\/$/, "");

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
