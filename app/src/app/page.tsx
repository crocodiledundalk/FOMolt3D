import { Suspense } from "react";
import { Dashboard } from "@/components/game/dashboard";
import { ReferralCapture } from "@/components/game/referral-capture";

export default function Home() {
  return (
    <main id="main-content" className="min-h-screen">
      <Suspense fallback={null}>
        <ReferralCapture />
      </Suspense>
      <Dashboard />
    </main>
  );
}
