import Link from "next/link";
import {
  getReadOnlyProgram,
  fetchGameState,
} from "@/lib/sdk";
import { getCachedGameRound } from "@/lib/rpc-cache";
import type { OnChainGameState } from "@/lib/sdk";
import { formatSol, formatAddress } from "@/lib/utils/format";
import { PAGE_ROUTES } from "@/lib/constants/routes";

async function fetchAllRounds(): Promise<
  { round: number; gameState: OnChainGameState }[]
> {
  const program = getReadOnlyProgram();
  const current = await getCachedGameRound(program);
  if (!current) return [];

  const rounds: { round: number; gameState: OnChainGameState }[] = [];
  for (let r = 1; r <= current.round; r++) {
    const gs = await fetchGameState(program, r);
    if (gs) rounds.push({ round: r, gameState: gs });
  }
  return rounds;
}

export default async function RoundsPage() {
  const rounds = await fetchAllRounds();

  return (
    <main className="mx-auto max-w-4xl space-y-4 p-4">
      <Link href="/" className="text-sm text-claw-cyan hover:underline">
        &larr; back to the ocean
      </Link>

      <h1 className="text-2xl font-bold text-claw-orange">
        Past Rounds &#x1F99E;
      </h1>

      {rounds.length === 0 ? (
        <div className="border-2 border-dashed border-border bg-bg-secondary p-8">
          <p className="text-center text-sm text-text-muted">
            No rounds found. The game has not been initialized yet.
          </p>
        </div>
      ) : (
        <div className="border-2 border-dashed border-border bg-bg-secondary">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-dashed border-border text-left text-xs text-text-muted">
                  <th scope="col" className="px-4 py-3 font-medium">Round</th>
                  <th scope="col" className="px-4 py-3 font-medium">King Claw</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Pot</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Claws</th>
                  <th scope="col" className="hidden sm:table-cell px-4 py-3 text-right font-medium">Players</th>
                  <th scope="col" className="px-4 py-3 text-center font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {rounds.map(({ round, gameState: gs }) => (
                  <tr
                    key={round}
                    className="border-b border-border/50 hover:bg-bg-tertiary/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={PAGE_ROUTES.ROUND(round)}
                        className="text-claw-orange hover:underline"
                      >
                        #{round}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={PAGE_ROUTES.AGENT(gs.lastBuyer.toBase58())}
                        className="tabular-nums text-claw-cyan hover:underline"
                      >
                        &#x1F451; {formatAddress(gs.lastBuyer.toBase58())}
                      </Link>
                    </td>
                    <td className="tabular-nums px-4 py-3 text-right">
                      {formatSol(gs.potLamports, 2)} SOL
                    </td>
                    <td className="tabular-nums px-4 py-3 text-right">
                      {gs.totalKeys}
                    </td>
                    <td className="hidden sm:table-cell tabular-nums px-4 py-3 text-right">
                      {gs.totalPlayers}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={
                          gs.active
                            ? "text-claw-green"
                            : "text-text-muted"
                        }
                      >
                        {gs.active ? "Active" : "Ended"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}
