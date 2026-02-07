import { notFound } from "next/navigation";
import Link from "next/link";
import { PublicKey } from "@solana/web3.js";
import {
  getReadOnlyProgram,
  fetchPlayerState,
  getPlayerStatus,
} from "@/lib/sdk";
import { getCachedGameRound } from "@/lib/rpc-cache";
import { formatSol, formatAddress } from "@/lib/utils/format";
import { pubkeySchema } from "@/lib/validations/game";
import { REFERRALS_ENABLED } from "@/lib/feature-flags";

export default async function AgentPage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = await params;
  const parsed = pubkeySchema.safeParse(address);
  if (!parsed.success) notFound();

  const program = getReadOnlyProgram();
  const playerPubkey = new PublicKey(parsed.data);
  const [playerState, roundResult] = await Promise.all([
    fetchPlayerState(program, playerPubkey),
    getCachedGameRound(program),
  ]);

  const gameState = roundResult?.gameState ?? null;
  const status = getPlayerStatus(gameState, playerState, playerPubkey);

  return (
    <main className="mx-auto max-w-4xl space-y-4 p-4">
      <Link href="/" className="text-sm text-claw-cyan hover:underline">
        &larr; back to the ocean
      </Link>

      {/* Header */}
      <div className="border-2 border-dashed border-border bg-bg-secondary p-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-2xl">
            {playerState?.isAgent ? "\uD83E\uDD9E" : "\uD83D\uDC64"}
          </span>
          <h1 className="tabular-nums text-xl font-bold text-text-primary">
            {formatAddress(parsed.data)}
          </h1>
          {playerState && (
            <span
              className={`px-2 py-0.5 text-xs font-bold ${
                playerState.isAgent
                  ? "border border-claw-cyan/30 bg-claw-cyan/15 text-claw-cyan"
                  : "border border-claw-orange/30 bg-claw-orange/15 text-claw-orange"
              }`}
            >
              {playerState.isAgent ? "Agent" : "Human"}
            </span>
          )}
          {playerState && playerState.currentRound > 0 && (
            <span className="border border-claw-green/30 bg-claw-green/15 px-2 py-0.5 text-xs font-bold text-claw-green">
              Round #{playerState.currentRound}
            </span>
          )}
        </div>
        <p className="mt-2 break-all text-xs text-text-muted">{parsed.data}</p>
      </div>

      {!playerState ? (
        <div className="border-2 border-dashed border-border bg-bg-secondary p-8">
          <p className="text-center text-sm text-text-muted">
            This player has not registered in the game yet.
          </p>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Claws Held" value={String(playerState.keys)} />
            <StatCard
              label="Dividends Claimed"
              value={`${formatSol(playerState.claimedDividendsLamports)} SOL`}
              accent
            />
            {REFERRALS_ENABLED && (
              <StatCard
                label="Referral Earnings"
                value={`${formatSol(playerState.referralEarningsLamports)} SOL`}
              />
            )}
            {REFERRALS_ENABLED && (
              <StatCard
                label="Referrer"
                value={
                  playerState.referrer
                    ? formatAddress(playerState.referrer.toBase58())
                    : "None"
                }
              />
            )}
          </div>

          {/* Status */}
          <div className="border-2 border-dashed border-border bg-bg-secondary p-4">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-text-secondary">
              Status
            </h2>
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <StatusItem
                label="Can Buy Keys"
                value={status.canBuyKeys}
              />
              <StatusItem label="Can Claim" value={status.canClaim} />
              <StatusItem label="Is Winner" value={status.isWinner} />
              <div>
                <span className="text-xs text-text-muted">
                  Est. Dividend
                </span>
                <p className="tabular-nums font-bold text-claw-green">
                  {formatSol(status.estimatedDividend)} SOL
                </p>
              </div>
              <div>
                <span className="text-xs text-text-muted">
                  Winner Prize
                </span>
                <p className="tabular-nums font-bold">
                  {formatSol(status.estimatedWinnerPrize)} SOL
                </p>
              </div>
              <div>
                <span className="text-xs text-text-muted">Phase</span>
                <p className="font-bold uppercase">{status.phase}</p>
              </div>
            </div>
          </div>
        </>
      )}
    </main>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="border-2 border-dashed border-border bg-bg-secondary p-4">
      <span className="text-xs text-text-muted">{label}</span>
      <p
        className={`tabular-nums text-lg font-bold ${accent ? "text-claw-green" : "text-text-primary"}`}
      >
        {value}
      </p>
    </div>
  );
}

function StatusItem({ label, value }: { label: string; value: boolean }) {
  return (
    <div>
      <span className="text-xs text-text-muted">{label}</span>
      <p
        className={`font-bold ${value ? "text-claw-green" : "text-text-muted"}`}
      >
        {value ? "Yes" : "No"}
      </p>
    </div>
  );
}
