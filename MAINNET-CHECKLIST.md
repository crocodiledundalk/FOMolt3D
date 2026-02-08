# FOMolt3D Mainnet Migration Checklist

## Deployment Order

Run these steps in sequence:

### 1. Program Deployment
```bash
# Set Solana CLI to mainnet
solana config set --url mainnet-beta
# Or use your paid RPC:
solana config set --url https://your-rpc-provider.com

# Deploy
bash scripts/deploy-mainnet.sh
```

### 2. Transfer Upgrade Authority
```bash
bash scripts/transfer-authority.sh <MULTISIG_OR_COLD_WALLET_PUBKEY>
```

### 3. Configure Game (GlobalConfig + Round 1)
```bash
cd app && npx ts-node scripts/configure-mainnet.ts
```

### 4. Update App Environment & Deploy App
See sections below.

---

## Environment Variables

### `app/.env.local` — Required Changes

| Variable | Devnet Value | Mainnet Value | Notes |
|----------|-------------|---------------|-------|
| `RPC_URL` | `https://api.devnet.solana.com` | **Paid RPC endpoint** | Server-side only. Use Helius, Triton, QuickNode, etc. |
| `NEXT_PUBLIC_RPC_URL` | `https://api.devnet.solana.com` | **Public RPC endpoint** | Exposed to browsers. Can be same as RPC_URL or a separate public endpoint. |
| `PROGRAM_ID` | `EebbWtjHyocWPwZaQ4k2L61mSdW6y175knsEwppTpdWw` | Same (unchanged) | Same keypair = same program ID on both networks. |
| `NEXT_PUBLIC_BASE_URL` | `http://localhost:3000` | `https://fomolt3d.com` | Your production domain. Used for Blinks/Actions URLs. |
| `NEXT_PUBLIC_REFERRALS_ENABLED` | (unset) | `true` | Enable after Dialect Blink approval. |

**Example mainnet `app/.env.local`:**
```env
RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
NEXT_PUBLIC_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
PROGRAM_ID=EebbWtjHyocWPwZaQ4k2L61mSdW6y175knsEwppTpdWw
NEXT_PUBLIC_BASE_URL=https://fomolt3d.com
NEXT_PUBLIC_REFERRALS_ENABLED=true
```

### `bot/.env` — Required Changes

| Variable | Devnet Value | Mainnet Value |
|----------|-------------|---------------|
| `GAME_API_URL` | `http://localhost:3000` | `https://fomolt3d.com` |

---

## Auto-Detected Settings (No Changes Needed)

These settings auto-detect from the RPC URL:

| Setting | How It Works | File |
|---------|-------------|------|
| **Cluster detection** | `getCluster()` parses RPC URL for "devnet"/"testnet", defaults to "mainnet-beta" | `app/src/lib/network.ts` |
| **Genesis hash** | `getGenesisHash()` returns correct hash per cluster | `app/src/lib/network.ts` |
| **X-Blockchain-Ids header** | `getBlockchainId()` returns `solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp` for mainnet | `app/src/lib/actions-headers.ts` |
| **Explorer URLs** | Omits `?cluster=devnet` param for mainnet | `app/src/lib/network.ts` |
| **Base URL derivation** | Uses `X-Forwarded-Host` header from reverse proxy, falls back to `https://fomolt3d.com` | `app/src/lib/base-url.ts` |
| **Wallet endpoint** | Reads `NEXT_PUBLIC_RPC_URL`, falls back to devnet | `app/src/providers/wallet-provider.tsx` |

---

## Hardcoded Program ID Locations

The program ID `EebbWtjHyocWPwZaQ4k2L61mSdW6y175knsEwppTpdWw` is hardcoded in these files. Since we use the same keypair for mainnet, **no changes are needed**, but listing them for awareness:

| File | Type |
|------|------|
| `programs/fomolt3d/src/lib.rs:14` | `declare_id!()` |
| `app/src/lib/sdk/pdas.ts:4` | `PROGRAM_ID` constant |
| `app/src/lib/sdk/addresses.ts:32` | `PROGRAM_ADDRESS` constant |
| `app/src/lib/network.ts:57` | Fallback in `getProgramId()` |
| `Anchor.toml:8` | Anchor config |
| `scripts/deploy-mainnet.sh` | Deploy script |
| `scripts/transfer-authority.sh` | Authority script |
| `app/scripts/configure-mainnet.ts` | Config script |

---

## Anchor.toml — Optional Update

Add a mainnet section if you want to use `anchor` commands directly against mainnet:

```toml
[programs.mainnet]
fomolt3d = "EebbWtjHyocWPwZaQ4k2L61mSdW6y175knsEwppTpdWw"
```

The deploy scripts use `solana program deploy` directly, so this is not required.

---

## IDL Deployment

The deploy script attempts to deploy the IDL on-chain using `anchor idl init`. If that fails (which can happen with Anchor 0.32.1 due to IDL format changes), alternatives:

1. **Anchor IDL init** (standard): `anchor idl init <PROGRAM_ID> --filepath target/idl/fomolt3d.json --provider.cluster mainnet-beta`
2. **Anchor IDL upgrade** (if already initialized): `anchor idl upgrade <PROGRAM_ID> --filepath target/idl/fomolt3d.json --provider.cluster mainnet-beta`

The app bundles the IDL locally (`app/src/lib/idl.json`), so on-chain IDL is a nice-to-have for explorers and third-party integrations, not a hard requirement.

---

## Priority Fees & Transaction Landing

### Current State
The app currently uses **no priority fees**. Transactions are sent with:
- `skipPreflight: false`
- `preflightCommitment: "confirmed"`
- Default compute budget (200K CU)
- No `ComputeBudgetProgram` instructions

### Recommendation for Mainnet

Priority fees are **strongly recommended** for mainnet. Without them, transactions may be dropped during congestion — which is especially bad for a time-sensitive game.

### What to Add

Add compute budget instructions to transaction construction in the Blinks/Actions routes:

```typescript
import { ComputeBudgetProgram } from "@solana/web3.js";

// Add to transaction before other instructions:
tx.add(
  ComputeBudgetProgram.setComputeUnitLimit({ units: 150_000 }), // tune per instruction
  ComputeBudgetProgram.setComputeUnitPrice({ microLamports: priorityFee })
);
```

### Priority Fee Strategy Options

| Strategy | Pros | Cons |
|----------|------|------|
| **Static fee** (e.g., 50,000 microlamports) | Simple, predictable | May overpay or underpay |
| **Dynamic via RPC** (`getRecentPrioritizationFees`) | Adapts to congestion | One extra RPC call per tx |
| **Helius Priority Fee API** | Best estimates, account-specific | Vendor lock-in |

**Recommended approach:** Dynamic via `getRecentPrioritizationFees` with a fallback static fee and a max cap. This is already stubbed in `config/mainnet.json`.

### Files to Modify

| File | Change |
|------|--------|
| `app/src/app/api/actions/buy-keys/route.ts` | Add compute budget IXs to POST handler |
| `app/src/app/api/actions/claim-dividends/route.ts` | Add compute budget IXs |
| `app/src/app/api/actions/claim-referral-earnings/route.ts` | Add compute budget IXs |
| `app/src/lib/sdk/composites.ts` | Add priority fee helper for buildSmartBuy, etc. |
| `app/src/app/api/tx/send/route.ts` | Consider `maxRetries` + `skipPreflight: true` for faster landing |

### Compute Unit Budgets (Estimated)

| Instruction | Estimated CU | Notes |
|------------|-------------|-------|
| `buy_keys` (new player) | ~120,000 | Includes `init_if_needed` for PlayerState |
| `buy_keys` (returning) | ~80,000 | No account creation |
| `claim` | ~60,000 | Read-heavy |
| `claim_referral_earnings` | ~50,000 | Simple transfer |
| `start_new_round` | ~100,000 | Creates new GameState + Vault |

---

## RPC Provider Selection

Public Solana RPCs (`api.mainnet-beta.solana.com`) are rate-limited and unreliable for production. Use a paid provider:

| Provider | Free Tier | Notes |
|----------|-----------|-------|
| **Helius** | 100K requests/day | Priority fee API, enhanced WebSocket, DAS |
| **QuickNode** | 10M API credits/mo | Global endpoints, add-ons |
| **Triton (RPC Pool)** | Varies | Staked connection options |
| **Alchemy** | 300M CU/mo | Good dashboard |

### WebSocket Support

The app uses WebSocket subscriptions for real-time events (`subscribeToGameEvents` in `sdk/events.ts`). Ensure your RPC provider supports WSS connections. Set `NEXT_PUBLIC_RPC_URL` to a provider that allows WSS from the browser.

---

## Security Checklist (Pre-Launch)

- [ ] Program upgrade authority transferred to multisig/cold wallet
- [ ] Protocol fee wallet is NOT the deployer wallet
- [ ] Admin keypair secured (not on a hot server)
- [ ] RPC API keys not exposed in client-side code (use `RPC_URL` for server, separate public key for `NEXT_PUBLIC_RPC_URL`)
- [ ] Rate limiting on API routes (Vercel/Cloudflare)
- [ ] No `.env` files committed to git
- [ ] IDL deployed on-chain for explorer decoding
- [ ] `config/mainnet.json` reviewed — all placeholders filled
- [ ] Test a full buy-keys → claim cycle on mainnet before announcing

---

## Post-Deploy Verification

```bash
# Verify program is deployed and executable
solana program show EebbWtjHyocWPwZaQ4k2L61mSdW6y175knsEwppTpdWw

# Verify upgrade authority was transferred
solana program show EebbWtjHyocWPwZaQ4k2L61mSdW6y175knsEwppTpdWw | grep Authority

# Verify GlobalConfig exists
# (check the config PDA address from configure-mainnet.ts output)

# Clean up buffer accounts to reclaim SOL
solana program show --buffers
solana program close <BUFFER_ADDRESS>
```

---

## Cost Estimate

| Item | Approximate Cost |
|------|-----------------|
| Program deployment (rent) | ~2.5 SOL |
| IDL deployment | ~0.1 SOL |
| GlobalConfig account rent | ~0.003 SOL |
| GameState account rent | ~0.003 SOL |
| Transaction fees | ~0.001 SOL |
| Buffer cleanup refund | -2.0 SOL (reclaimable after deploy) |
| **Net cost** | **~0.6 SOL** |

Fund the deployer wallet with at least **5 SOL** to be safe.
