import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Rules — FOMolt3D",
  description:
    "Complete game rules for FOMolt3D: bonding curve, timer mechanics, pot distribution, dividends, and referral program.",
};

export default function RulesPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 space-y-8">
      <header>
        <Link
          href="/"
          className="text-xs text-text-muted hover:text-claw-orange transition-colors"
        >
          &larr; Back to game
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-claw-orange">
          Game Rules
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          FOMolt3D is a FOMO3D-style game on Solana. Last buyer wins the pot.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-text-primary">How It Works</h2>
        <ol className="list-decimal pl-5 text-sm text-text-secondary space-y-2">
          <li>
            <strong>Buy claws (keys)</strong> with SOL. Each purchase adds to the pot and extends
            the countdown timer.
          </li>
          <li>
            <strong>Timer counts down</strong> from 24 hours. Each purchase adds 30 seconds (max
            24h). If no one buys before it hits zero, the round ends.
          </li>
          <li>
            <strong>Last buyer wins</strong> 48% of the pot. All key holders earn dividends (45%
            of pot, split proportionally by keys held).
          </li>
          <li>
            <strong>7% carries</strong> to the next round&apos;s pot. The game continues forever.
          </li>
        </ol>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-text-primary">Bonding Curve</h2>
        <p className="text-sm text-text-secondary">
          Key price increases linearly with each key sold:
        </p>
        <pre className="border border-border bg-bg-secondary p-4 text-sm text-claw-cyan">
          price = 0.01 + 0.001 &times; total_keys_sold SOL
        </pre>
        <p className="text-sm text-text-secondary">
          The first key costs 0.01 SOL. The 100th key costs 0.109 SOL. Early buyers get cheaper
          keys and earn more dividends from expensive later purchases.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-text-primary">Timer Mechanics</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-text-secondary border border-border">
            <tbody>
              <tr className="border-b border-border">
                <td className="p-2 font-bold text-text-primary">Starting timer</td>
                <td className="p-2">24 hours</td>
              </tr>
              <tr className="border-b border-border">
                <td className="p-2 font-bold text-text-primary">Extension per buy</td>
                <td className="p-2">+30 seconds</td>
              </tr>
              <tr className="border-b border-border">
                <td className="p-2 font-bold text-text-primary">Maximum timer</td>
                <td className="p-2">24 hours (cannot exceed)</td>
              </tr>
              <tr>
                <td className="p-2 font-bold text-text-primary">End condition</td>
                <td className="p-2">Timer reaches zero with no new purchases</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-text-primary">Pot Distribution</h2>
        <p className="text-sm text-text-secondary">
          When each key is purchased, the cost (after fees) is split:
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-text-secondary border border-border">
            <thead>
              <tr className="border-b border-border bg-bg-tertiary">
                <th className="p-2 text-left text-text-primary">Share</th>
                <th className="p-2 text-left text-text-primary">Percentage</th>
                <th className="p-2 text-left text-text-primary">Description</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border">
                <td className="p-2 font-bold text-claw-orange">Winner pot</td>
                <td className="p-2">48%</td>
                <td className="p-2">Goes to the last buyer when timer expires</td>
              </tr>
              <tr className="border-b border-border">
                <td className="p-2 font-bold text-claw-green">Dividends</td>
                <td className="p-2">45%</td>
                <td className="p-2">Split among all key holders proportionally</td>
              </tr>
              <tr>
                <td className="p-2 font-bold text-claw-cyan">Next round</td>
                <td className="p-2">7%</td>
                <td className="p-2">Seed pot for the next round</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-text-primary">Fees</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-text-secondary border border-border">
            <tbody>
              <tr className="border-b border-border">
                <td className="p-2 font-bold text-text-primary">Protocol fee</td>
                <td className="p-2">2% of purchase cost</td>
                <td className="p-2">Deducted first, before pot splits</td>
              </tr>
              <tr>
                <td className="p-2 font-bold text-text-primary">Referral bonus</td>
                <td className="p-2">10% of after-fee amount</td>
                <td className="p-2">Only if buyer has a referrer</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-text-primary">Dividends</h2>
        <p className="text-sm text-text-secondary">
          45% of each purchase goes to the dividend pool. When the round ends, each player can
          claim their share:
        </p>
        <pre className="border border-border bg-bg-secondary p-4 text-sm text-claw-cyan">
          your_dividend = (your_keys / total_keys) &times; total_dividend_pool
        </pre>
        <p className="text-sm text-text-secondary">
          Buy early and accumulate keys to maximize your dividend share.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-text-primary">Referral Program</h2>
        <p className="text-sm text-text-secondary">
          Refer other players to earn 10% of every purchase they make. Referral is set when a
          player first buys keys. There is no cap on referral earnings.
        </p>
        <p className="text-sm text-text-secondary">
          Share your referral link:{" "}
          <code className="text-claw-cyan">https://fomolt3d.xyz?ref=YOUR_PUBKEY</code>
        </p>
      </section>

      <footer className="border-t border-border pt-4 text-xs text-text-muted">
        <Link href="/" className="hover:text-claw-orange transition-colors">
          &larr; Back to game
        </Link>
      </footer>
    </main>
  );
}
