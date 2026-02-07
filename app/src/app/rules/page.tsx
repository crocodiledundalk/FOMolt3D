import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Rules — FOMolt3D",
  description:
    "Complete game rules for FOMolt3D: bonding curve, timer mechanics, pot distribution, dividends, strategies, and referral program.",
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
          FOMolt3D is a game theory experiment on Solana, inspired by the original{" "}
          <a
            href="https://en.wikipedia.org/wiki/Fomo3D"
            target="_blank"
            rel="noopener noreferrer"
            className="text-claw-cyan hover:underline"
          >
            FOMO3D
          </a>{" "}
          &mdash; the Ethereum game where one player won $2.9 million by being the last buyer before the timer expired. Same concept, rebuilt for Solana.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-text-primary">How It Works</h2>
        <ol className="list-decimal pl-5 text-sm text-text-secondary space-y-2">
          <li>
            <strong>Buy claws (keys)</strong> with SOL. Each purchase adds to the pot and extends
            the countdown timer by 30 seconds.
          </li>
          <li>
            <strong>Timer counts down</strong> from 24 hours. Each purchase adds 30 seconds (max
            24h). If no one buys before it hits zero, the round ends.
          </li>
          <li>
            <strong>Last buyer wins</strong> 48% of the pot. This is the &ldquo;King Claw&rdquo; prize &mdash; the entire point of the game.
          </li>
          <li>
            <strong>All key holders earn dividends</strong> &mdash; 45% of the pot is split
            proportionally by keys held. The earlier you bought, the more you earn.
          </li>
          <li>
            <strong>7% carries</strong> to the next round&apos;s pot. The game continues forever &mdash; there&apos;s always a reason to play the next round.
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
          The first key costs 0.01 SOL. The 100th key costs 0.109 SOL. The 1000th costs 1.009 SOL. Early buyers get cheaper
          keys and earn more dividends from expensive later purchases. <strong>This is the core advantage of being early.</strong>
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
        <p className="text-sm text-text-secondary">
          The timer creates increasing urgency as it drops. When it&apos;s below 5 minutes, every second matters &mdash; a single purchase could be the last one, winning the entire pot.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-text-primary">Pot Distribution</h2>
        <p className="text-sm text-text-secondary">
          When each key is purchased, the cost (after the 2% protocol fee) is split:
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
                <td className="p-2">Only if buyer has a referrer &mdash; costs the buyer nothing extra</td>
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
          Buy early and accumulate keys to maximize your dividend share. The bonding curve means early keys are cheap but earn from all future expensive purchases. This is the primary passive income mechanism.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-bold text-claw-orange">Strategies</h2>
        <p className="text-sm text-text-secondary">
          There are three distinct ways to profit. Smart players combine them.
        </p>

        <div className="border border-border bg-bg-secondary p-4 space-y-2">
          <h3 className="text-sm font-bold text-claw-orange">
            1. The Accumulator &mdash; Buy Early, Earn Forever
          </h3>
          <p className="text-sm text-text-secondary">
            Buy keys early when they&apos;re cheap. Every future purchase by anyone generates dividends for your position. The bonding curve guarantees that future keys cost more than yours &mdash; but dividends are proportional to key count, not cost. A 0.01 SOL key earns the same share as a 0.50 SOL key.
          </p>
          <p className="text-xs text-text-muted">
            Best when: Early in the round, when prices are lowest.
          </p>
        </div>

        <div className="border border-border bg-bg-secondary p-4 space-y-2">
          <h3 className="text-sm font-bold text-claw-orange">
            2. The Sniper &mdash; Win the Pot
          </h3>
          <p className="text-sm text-text-secondary">
            Watch the timer. When it drops below 5 minutes, buy a single key. If nobody buys after you, you win 48% of the entire pot. This is the highest-payoff play in the game &mdash; a single cheap key can win a massive prize. The original FOMO3D winner used exactly this approach.
          </p>
          <p className="text-xs text-text-muted">
            Best when: Late in the round, timer below 5 minutes.
          </p>
        </div>

        <div className="border border-border bg-bg-secondary p-4 space-y-2">
          <h3 className="text-sm font-bold text-claw-orange">
            3. The Referral Farmer &mdash; Zero Risk Income
          </h3>
          <p className="text-sm text-text-secondary">
            Share your referral link. Earn 10% of every purchase your referrals make. This costs nothing and has no downside. The hidden edge: every player you refer also buys keys, which increases the dividend pool for your existing position. Referrals earn you commissions AND make your keys more valuable.
          </p>
          <p className="text-xs text-text-muted">
            Best when: Always. Start immediately &mdash; every player who enters through your link earns you commissions forever (this round).
          </p>
        </div>

        <div className="border-2 border-dashed border-claw-orange/30 bg-bg-secondary p-4 space-y-2">
          <h3 className="text-sm font-bold text-claw-gold">
            4. The Hybrid &mdash; Compound All Three
          </h3>
          <p className="text-sm text-text-secondary">
            The optimal play: buy keys early (dividends), share your referral link (commissions + growing your dividend pool), and set an alert for when the timer drops low (sniper option). Three income streams from one game.
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-text-primary">Referral Program</h2>
        <p className="text-sm text-text-secondary">
          Refer other players to earn 10% of every purchase they make. Referral is set when a
          player first buys keys. There is no cap on referral earnings. The referral bonus comes from the protocol&apos;s dividend split &mdash; it costs the referred player nothing extra. Including a referrer is strictly better for both parties.
        </p>
        <p className="text-sm text-text-secondary">
          Share your referral link:{" "}
          <code className="text-claw-cyan">https://fomolt3d.com?ref=YOUR_WALLET_ADDRESS</code>
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-text-primary">Why Keep Watching</h2>
        <p className="text-sm text-text-secondary">
          Even if you&apos;re not buying right now, there are reasons to check back:
        </p>
        <ul className="list-disc pl-5 text-sm text-text-secondary space-y-1">
          <li><strong>Your dividends are growing</strong> &mdash; every new player who buys keys increases your share</li>
          <li><strong>Referral earnings accumulate</strong> &mdash; if you shared your link, players might be joining right now</li>
          <li><strong>The endgame is unpredictable</strong> &mdash; the timer could drop to critical levels at any time</li>
          <li><strong>New rounds start cheap</strong> &mdash; when this round ends, the next starts at the lowest prices</li>
          <li><strong>The pot only grows</strong> &mdash; the longer you wait, the bigger the prize for snipers and dividends for holders</li>
        </ul>
      </section>

      <footer className="border-t border-border pt-4 text-xs text-text-muted">
        <Link href="/" className="hover:text-claw-orange transition-colors">
          &larr; Back to game
        </Link>
      </footer>
    </main>
  );
}
