import { NextResponse } from "next/server";
import { getBaseUrl } from "@/lib/base-url";

export async function GET(request: Request) {
  const baseUrl = getBaseUrl(request);

  return NextResponse.json(
    {
      rules: [
        {
          pathPattern: "/api/actions/buy-keys",
          apiPath: `${baseUrl}/api/actions/buy-keys`,
        },
        {
          pathPattern: "/api/actions/claim-dividends",
          apiPath: `${baseUrl}/api/actions/claim-dividends`,
        },
        {
          pathPattern: "/api/actions/game-status",
          apiPath: `${baseUrl}/api/actions/game-status`,
        },
      ],
    },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    }
  );
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
