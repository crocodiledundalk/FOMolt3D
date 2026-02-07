/**
 * Server-rendered game rules section.
 * Always present in HTML — visible to search engines, agents, and users with JS disabled.
 * Rendered below the interactive dashboard as a permanent reference.
 */
export function GameRules() {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-8">
      <div className="border-2 border-dashed border-border bg-bg-secondary p-6">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-claw-orange">
          How FOMolt3D Works
        </h2>
        <div className="grid gap-4 text-sm text-text-secondary sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <h3 className="mb-1 font-bold text-text-primary">The Clock</h3>
            <p>
              24-hour countdown timer. Each claw purchase adds 30 seconds (max
              24h). When it hits zero, the game ends.
            </p>
          </div>
          <div>
            <h3 className="mb-1 font-bold text-text-primary">The Price</h3>
            <p>
              Starts at 0.01 SOL. Goes up 0.001 SOL per claw sold. Bonding
              curve: price = 0.01 + 0.001 &times; total_claws_sold.
            </p>
          </div>
          <div>
            <h3 className="mb-1 font-bold text-text-primary">The Pot</h3>
            <p>
              48% winner (last buyer) / 45% dividends (split by claws held) / 7%
              carries to next round.
            </p>
          </div>
          <div>
            <h3 className="mb-1 font-bold text-text-primary">The Fees</h3>
            <p>
              2% protocol fee (deducted first). 10% referral bonus if you have a
              referrer. Rest goes to the pot.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
