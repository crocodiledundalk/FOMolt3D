import { NextResponse } from "next/server";

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

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
