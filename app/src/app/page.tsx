import { Suspense } from "react";
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { Dashboard } from "@/components/game/dashboard";
import { ReferralCapture } from "@/components/game/referral-capture";
import { GameRules } from "@/components/game/game-rules";
import { fetchGameStateServer } from "@/lib/server-fetch";

export const dynamic = "force-dynamic";

export default async function Home() {
  const queryClient = new QueryClient();

  // Prefetch game state on the server — populates React Query cache for instant first render
  await queryClient.prefetchQuery({
    queryKey: ["gameState"],
    queryFn: fetchGameStateServer,
  });

  return (
    <main id="main-content" className="min-h-screen">
      <Suspense fallback={null}>
        <ReferralCapture />
      </Suspense>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <Dashboard />
      </HydrationBoundary>
      {/* Server-rendered game rules — always in HTML, no JS required */}
      <GameRules />
    </main>
  );
}
