# Admin Dashboard Plan

## Context

The program's GlobalConfig has an admin pubkey field — only this wallet can call `create_or_update_config` and `initialize_first_round`. Currently there's no UI for these admin actions. We need a hidden admin page that only renders when the connected wallet matches the on-chain authority, providing config management, round lifecycle controls, and account inspection.

## Architecture

Single client-rendered page at `/admin` with a `useAdmin` hook that gates access. All data fetched directly from chain via SDK (no API routes needed — admin is always the signer so we need the wallet-connected program anyway).

## New Files

| File | Purpose |
|------|---------|
| `app/src/app/admin/page.tsx` | Next.js page — `'use client'`, renders `<AdminDashboard />` |
| `app/src/hooks/use-anchor-program.ts` | Hook: creates AnchorProvider + Program from wallet + connection |
| `app/src/hooks/use-admin.ts` | Hook: fetches GlobalConfig, compares config.admin to connected wallet, returns `{ isAdmin, config, program }` |
| `app/src/components/admin/admin-dashboard.tsx` | Main layout — gates on isAdmin, renders sections |
| `app/src/components/admin/config-panel.tsx` | View/edit GlobalConfig fields, submit `create_or_update_config` |
| `app/src/components/admin/round-panel.tsx` | Round lifecycle: initialize, start new, view current state |
| `app/src/components/admin/accounts-panel.tsx` | Inspect any account: config, game state, player state, vault balance |

## Modified Files

| File | Change |
|------|--------|
| `app/src/components/dashboard/dashboard-header.tsx` | Add conditional admin link when `isAdmin` |

## Detailed Design

### 1. use-anchor-program.ts

- Uses `useAnchorWallet()` + `useConnection()` to create `AnchorProvider`
- Returns `{ program, provider }` or null when wallet not connected
- Memoized to avoid recreating on every render

### 2. use-admin.ts

- Uses `use-anchor-program` + `useQuery` to fetch GlobalConfig
- Compares `config.admin.toBase58() === publicKey.toBase58()`
- Returns `{ isAdmin: boolean, config: OnChainGlobalConfig | null, program, isLoading }`
- Refetch interval: 10s (config rarely changes)

### 3. admin-dashboard.tsx — Sections

Three panels stacked vertically:

#### A. Config Panel (config-panel.tsx)
- Displays all current config values in a stat grid (readonly by default)
- "Edit Config" button opens an inline form
- Form fields: base price, price increment, timer extension, max timer, winner/dividend/next_round BPS, protocol fee BPS, referral BPS, protocol wallet
- Client-side BPS validation: `winner + dividend + nextRound === 10000`
- On submit: `buildCreateOrUpdateConfig()` → sign + send via wallet adapter → toast result
- Revalidate config query on success

#### B. Round Panel (round-panel.tsx)
- Fetches current round via `findCurrentRound()`
- Displays: round #, pot, timer (countdown), total keys, total players, active status, winner claimed, vault balance, carry-over
- Actions:
  - "Initialize Round 1" button (shown when no rounds exist) → `buildInitializeFirstRound()`
  - "Start New Round" button (shown when current round is inactive + winner claimed) → `buildStartNewRound(prevRound, prevRound+1)`
- Disabled states with explanations when preconditions not met
- Shows round history: scan rounds 1..N, display summary table

#### C. Accounts Panel (accounts-panel.tsx)
- Three tabs/sections: Config, Game State, Player Lookup
- Each account data displayed in a definition-list/grid format
- PublicKey fields shown as base58 with copy button
- Lamport fields shown with SOL conversion

### 4. Transaction Flow

All admin transactions use the same pattern:
1. Build instruction via SDK builder
2. Create Transaction, set feePayer + recentBlockhash
3. `wallet.sendTransaction(tx, connection)` (wallet adapter handles signing)
4. Wait for confirmation, toast success/error
5. Invalidate relevant React Query caches

### 5. Access Control

- No API route needed — all reads/writes go directly to chain
- No server-side auth — the on-chain program enforces admin via signer check
- UI gating only — isAdmin hides the page content; even if someone navigates to /admin, they can't sign admin transactions without the authority key
- No admin link in nav unless isAdmin is true

## Existing Code Reused

- `fetchGlobalConfig()` — `app/src/lib/sdk/accounts.ts`
- `fetchGameState()` — `app/src/lib/sdk/accounts.ts`
- `fetchPlayerState()` — `app/src/lib/sdk/accounts.ts`
- `fetchVaultBalance()` — `app/src/lib/sdk/accounts.ts`
- `findCurrentRound()` — `app/src/lib/sdk/accounts.ts`
- `fetchAllPlayersInRound()` — `app/src/lib/sdk/accounts.ts`
- `buildCreateOrUpdateConfig()` — `app/src/lib/sdk/instructions.ts`
- `buildInitializeFirstRound()` — `app/src/lib/sdk/instructions.ts`
- `buildStartNewRound()` — `app/src/lib/sdk/instructions.ts`
- `getProgram(provider)` — `app/src/lib/sdk/connection.ts`
- `getConnection()` — `app/src/lib/sdk/connection.ts`
- `formatSol()`, `formatAddress()`, `formatTimestamp()` — `app/src/lib/utils/format.ts`
- Toast via sonner — same pattern as `referral-cta.tsx`
- UI patterns: dashed borders, bg-secondary, tabular-nums, stat grids — from dashboard components

## Verification

1. `tsc --noEmit` — zero type errors
2. `npx vitest run` — all existing tests still pass
3. Manual check: navigate to /admin without wallet → shows "connect wallet" prompt
4. Manual check: connect non-admin wallet → shows "not authorized" message
5. Manual check: connect admin wallet → full admin UI visible
6. Admin link only appears in dashboard header when admin wallet connected
