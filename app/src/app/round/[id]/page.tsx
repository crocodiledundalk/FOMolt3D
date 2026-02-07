import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getReadOnlyProgram,
  fetchGameState,
  fetchAllPlayersInRound,
  estimateDividend,
} from "@/lib/sdk";
import {
  formatSol,
  formatAddress,
  formatTimestamp,
} from "@/lib/utils/format";
import { PAGE_ROUTES } from "@/lib/constants/routes";

export default async function RoundPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const roundId = parseInt(id, 10);
  if (isNaN(roundId) || roundId < 1) notFound();

  const program = getReadOnlyProgram();
  const gameState = await fetchGameState(program, roundId);
  if (!gameState) notFound();

  const players = await fetchAllPlayersInRound(program, roundId);

  const keyHolders = players
    .filter((p) => p.keys > 0)
    .sort((a, b) => b.keys - a.keys)
    .slice(0, 50);

  return (
    <main className="mx-auto max-w-4xl space-y-4 p-4">
      <Link href="/rounds" className="text-sm text-claw-cyan hover:underline">
        &larr; All Rounds
      </Link>

      {/* Round header */}
      <div className="border-2 border-claw-orange/30 bg-bg-secondary p-6 glow-orange">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-claw-orange">
            Round #{gameState.round} &#x1F99E;
          </h1>
          <span
            className={`px-2 py-0.5 text-xs font-bold ${
              gameState.active
                ? "border border-claw-green/30 bg-claw-green/10 text-claw-green"
                : "border border-text-muted/30 bg-bg-tertiary text-text-muted"
            }`}
          >
            {gameState.active ? "ACTIVE" : "ENDED"}
          </span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
          <div>
            <span className="text-text-muted">King Claw &#x1F451;</span>
            <p>
              <Link
                href={PAGE_ROUTES.AGENT(gameState.lastBuyer.toBase58())}
                className="tabular-nums text-claw-gold hover:underline"
              >
                {formatAddress(gameState.lastBuyer.toBase58())}
              </Link>
            </p>
          </div>
          <div>
            <span className="text-text-muted">Pot</span>
            <p className="tabular-nums font-bold text-claw-orange">
              {formatSol(gameState.potLamports, 2)} SOL
            </p>
          </div>
          <div>
            <span className="text-text-muted">Winner Pot</span>
            <p className="tabular-nums font-bold">
              {formatSol(gameState.winnerPot, 2)} SOL
            </p>
          </div>
          <div>
            <span className="text-text-muted">Claws Grabbed</span>
            <p className="tabular-nums">{gameState.totalKeys}</p>
          </div>
          <div>
            <span className="text-text-muted">Players</span>
            <p className="tabular-nums">{gameState.totalPlayers}</p>
          </div>
          <div>
            <span className="text-text-muted">Started</span>
            <p className="tabular-nums text-xs">
              {formatTimestamp(gameState.roundStart)}
            </p>
          </div>
          <div>
            <span className="text-text-muted">Dividend Pool</span>
            <p className="tabular-nums">
              {formatSol(gameState.totalDividendPool, 2)} SOL
            </p>
          </div>
          <div>
            <span className="text-text-muted">Next Round Carry</span>
            <p className="tabular-nums">
              {formatSol(gameState.nextRoundPot, 2)} SOL
            </p>
          </div>
          <div>
            <span className="text-text-muted">Winner Claimed</span>
            <p>{gameState.winnerClaimed ? "Yes" : "No"}</p>
          </div>
        </div>
      </div>

      {/* Players */}
      <div className="border-2 border-dashed border-border bg-bg-secondary p-4">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-text-secondary">
          Claw Holders
        </h2>
        {keyHolders.length === 0 ? (
          <p className="py-4 text-center text-sm text-text-muted">
            No players in this round yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-dashed border-border text-left text-xs text-text-muted">
                  <th className="px-3 py-2 font-medium">#</th>
                  <th className="px-3 py-2 font-medium">Player</th>
                  <th className="px-3 py-2 text-right font-medium">Claws</th>
                  <th className="px-3 py-2 text-right font-medium">
                    Est. Dividend
                  </th>
                </tr>
              </thead>
              <tbody>
                {keyHolders.map((p, i) => (
                  <tr
                    key={p.player.toBase58()}
                    className="border-b border-border/50"
                  >
                    <td className="tabular-nums px-3 py-2 text-text-muted">
                      {i + 1}
                    </td>
                    <td className="px-3 py-2">
                      <Link
                        href={PAGE_ROUTES.AGENT(p.player.toBase58())}
                        className="flex items-center gap-1.5 tabular-nums text-claw-cyan hover:underline"
                      >
                        <span className="text-sm">
                          {p.isAgent ? "\uD83E\uDD9E" : "\uD83D\uDC64"}
                        </span>
                        {formatAddress(p.player.toBase58())}
                      </Link>
                    </td>
                    <td className="tabular-nums px-3 py-2 text-right">
                      {p.keys}
                    </td>
                    <td className="tabular-nums px-3 py-2 text-right">
                      {formatSol(estimateDividend(gameState, p.keys), 3)} SOL
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
