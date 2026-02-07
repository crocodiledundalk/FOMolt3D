import { NextResponse, type NextRequest } from "next/server";

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
];

function isAgentRequest(request: NextRequest): boolean {
  // Explicit format override
  if (request.nextUrl.searchParams.get("format") === "md") return true;

  // Accept header
  const accept = request.headers.get("accept") || "";
  if (accept.includes("text/markdown")) return true;

  // User-Agent heuristic
  const ua = (request.headers.get("user-agent") || "").toLowerCase();
  return AGENT_PATTERNS.some((pattern) => ua.includes(pattern));
}

/** Map sub-page paths to their API equivalents for agent requests. */
const AGENT_REDIRECTS: Record<string, (url: URL) => string> = {
  "/rounds": () => "/api/state",
  "/round": () => "/api/state",
  "/agent": (url) => {
    const segments = url.pathname.split("/");
    const address = segments[2];
    return address ? `/api/player/${address}` : "/api/state";
  },
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip API routes, static assets, and actions.json
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/actions.json") ||
    pathname.endsWith(".ico") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".jpg")
  ) {
    return NextResponse.next();
  }

  // /dashboard → redirect to /
  if (pathname === "/dashboard") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url, 301);
  }

  // Content negotiation for / and /skill.md
  if (pathname === "/" || pathname === "/skill.md") {
    if (isAgentRequest(request)) {
      const url = request.nextUrl.clone();
      url.pathname = "/skill.md";
      const response = NextResponse.rewrite(url);
      response.headers.set("Vary", "Accept, User-Agent");
      return response;
    }
  }

  // Content negotiation for sub-pages (/rounds, /round/*, /agent/*)
  if (isAgentRequest(request)) {
    for (const [prefix, getApiPath] of Object.entries(AGENT_REDIRECTS)) {
      if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
        const url = request.nextUrl.clone();
        url.pathname = getApiPath(url);
        const response = NextResponse.rewrite(url);
        response.headers.set("Vary", "Accept, User-Agent");
        return response;
      }
    }
  }

  const response = NextResponse.next();
  response.headers.set("Vary", "Accept, User-Agent");
  return response;
}

export const config = {
  matcher: [
    "/",
    "/skill.md",
    "/skill.md/:path*",
    "/dashboard",
    "/rounds",
    "/round/:path*",
    "/agent/:path*",
  ],
};
