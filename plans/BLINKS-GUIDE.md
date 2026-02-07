# Solana Blinks Guide for FOMolt3D

> One Blink to rule them all: a shareable, referral-carrying, dynamic buy-keys card.

---

## Architecture

We have **one shareable Blink** and **several plain action endpoints**:

| What | URL | Shareable? | Dynamic Image? | Action Chaining? |
|------|-----|-----------|----------------|-----------------|
| **Buy Keys + Referral** | `/api/actions/buy-keys?ref={addr}` | **Yes — THE Blink** | Yes | Yes (post-buy callback) |
| Claim Dividends | `/api/actions/claim-dividends` | No | No | No |
| Claim Winner | `/api/actions/claim-winner` | No | No | No |
| Claim Referral | `/api/actions/claim-referral` | No | No | No |

The buy-keys Blink is the **only URL we share on X, dial.to, in tweets, and in agent skill.md**. It doubles as the referral mechanism — every player's shareable link is just this Blink with their address in `?ref=`.

Claim endpoints are functional action endpoints (GET metadata + POST transaction) but don't need OG images, chaining, or visual polish — they're utility actions triggered from the dashboard or by agents.

---

## The Buy-Keys Blink

### What the User Sees

```
┌──────────────────────────────────────┐
│                                      │
│   [Dynamic OG Image]                 │
│   Shows: pot size, timer, key price  │
│   If ref: "Invited by 7xKp..."      │
│   Color-coded by urgency             │
│                                      │
├──────────────────────────────────────┤
│  Molt #7 — 142.5 SOL Pot            │
│  Key price: 0.0834 SOL | Timer:     │
│  02:45:31 | Last buyer wins 48%     │
│  Referred by: 7xKp...               │
│                                      │
│  [1 Claw] [5 Claws] [10 Claws]      │
│  [_______ Custom amount ___] [Buy]   │
│                                      │
│  ⚠ Only 4:32 left! Last buyer       │  ← only when timer < 5min
│    wins 142.5 SOL!                   │
└──────────────────────────────────────┘
```

### Shareable URLs

```
# The canonical Blink (no referral)
https://fomolt3d.com/api/actions/buy-keys

# Player's personal referral link (THE viral mechanism)
https://fomolt3d.com/api/actions/buy-keys?ref=7xKpJ9...3nFq

# Via dial.to (renders for anyone without wallet extension)
https://dial.to/?action=solana-action:https://fomolt3d.com/api/actions/buy-keys?ref=7xKpJ9...3nFq
```

Every player gets one URL. When someone buys through it, the referrer earns 10%. The Blink itself shows "Invited by [addr]" and bakes the referral into every button's href. This is the entire referral system — no separate referral page needed.

---

## Dynamic OG Image

### Single Image Route: `/api/og/game`

One image endpoint handles all states. No separate urgency/winner/referral routes — just one route with smart rendering:

```typescript
// app/api/og/game/route.tsx
import { ImageResponse } from "next/og";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pot = searchParams.get("pot") ?? "0";
  const timer = searchParams.get("timer") ?? "24:00:00";
  const round = searchParams.get("round") ?? "1";
  const price = searchParams.get("price") ?? "0.01";
  const ref = searchParams.get("ref");
  const ended = searchParams.get("ended") === "true";
  const winner = searchParams.get("winner");

  // Determine visual state from timer
  const parts = timer.split(":");
  const totalSeconds = (+parts[0]) * 3600 + (+parts[1]) * 60 + (+parts[2]);
  const isUrgent = totalSeconds < 300 && totalSeconds > 0;  // < 5 min
  const isCritical = totalSeconds < 60 && totalSeconds > 0;  // < 1 min

  // Pick colors based on state
  const bg = ended
    ? "linear-gradient(135deg, #0a0a0a 0%, #0a1a2e 50%, #0a0a0a 100%)"
    : isUrgent
      ? "linear-gradient(135deg, #1a0000 0%, #2e0a0a 50%, #1a0000 100%)"
      : "linear-gradient(135deg, #0a0a0a 0%, #1a0a2e 50%, #0a0a0a 100%)";

  const timerColor = ended ? "#666" : isCritical ? "#ff0000" : isUrgent ? "#ff4444" : "#00ff88";

  return new ImageResponse(
    (
      <div style={{
        width: "100%", height: "100%", display: "flex",
        flexDirection: "column", alignItems: "center", justifyContent: "center",
        background: bg, fontFamily: "monospace", color: "white", padding: "40px",
      }}>
        {/* Round badge */}
        <div style={{ fontSize: 28, color: "#ff6b35", letterSpacing: "4px", marginBottom: "20px" }}>
          {ended ? `MOLT #${round} — ENDED` : `MOLT #${round}`}
        </div>

        {/* Pot size — the hero number */}
        <div style={{
          fontSize: 96, fontWeight: "bold",
          background: ended
            ? "linear-gradient(90deg, #ffd700, #ff6b35)"
            : "linear-gradient(90deg, #ff6b35, #ffd700)",
          backgroundClip: "text", color: "transparent",
        }}>
          {pot} SOL
        </div>

        {/* Timer or winner */}
        {ended && winner ? (
          <div style={{ fontSize: 32, color: "#ffd700", marginTop: "16px" }}>
            Winner: {winner}
          </div>
        ) : (
          <div style={{ fontSize: 48, color: timerColor, marginTop: "10px" }}>
            {isCritical ? "⚠ " : "⏱ "}{timer}
          </div>
        )}

        {/* Price */}
        {!ended && (
          <div style={{ fontSize: 24, color: "#888", marginTop: "20px" }}>
            KEY PRICE: {price} SOL
          </div>
        )}

        {/* Referral badge */}
        {ref && (
          <div style={{
            fontSize: 20, color: "#ff6b35", marginTop: "16px",
            padding: "8px 20px", border: "1px solid #ff6b35", borderRadius: "8px",
          }}>
            Invited by {ref}
          </div>
        )}

        {/* Branding */}
        <div style={{
          position: "absolute", bottom: "20px",
          fontSize: 18, color: "#444", letterSpacing: "6px",
        }}>
          FOMOLT3D
        </div>
      </div>
    ),
    { width: 800, height: 800 }
  );
}
```

### Design Principles

- **One hero number** — the pot size dominates at 96px
- **Color shifts by urgency** — green timer (normal), red timer (< 5 min), pulsing red (< 1 min), blue-tinted (ended)
- **Dark background** — most X users are on dark mode
- **Referral badge** — orange border pill that says "Invited by 7xKp..." when `?ref=` present
- **800x800 PNG** — square, under 500KB, maximum compatibility
- **Cache-bust with `?t=`** — floor to 30-second epochs so platforms see fresh data

### Color Palette

```
Normal (timer > 5 min):     bg #0a0a0a→#1a0a2e | pot #ff6b35→#ffd700 | timer #00ff88
Urgent (timer < 5 min):     bg #1a0000→#2e0a0a | pot #ff0000→#ff6b35 | timer #ff4444
Critical (timer < 1 min):   bg #1a0000→#2e0a0a | timer #ff0000 with ⚠ prefix
Ended:                      bg #0a0a0a→#0a1a2e | winner #ffd700 | timer hidden
Referral badge always:      border #ff6b35, text #ff6b35
```

---

## GET Handler: The Heart of the Blink

The GET handler returns different content based on game state + referral:

```typescript
import { ACTIONS_CORS_HEADERS, ActionGetResponse } from "@solana/actions";

export const GET = async (req: Request) => {
  const { searchParams } = new URL(req.url);
  const ref = searchParams.get("ref");
  const baseUrl = new URL(req.url).origin;

  const game = await fetchGameState();

  // --- Round ended or no game ---
  if (!game || !game.active) {
    return Response.json(roundEndedBlink(game, baseUrl), {
      headers: ACTIONS_CORS_HEADERS,
    });
  }

  // --- Active round ---
  const pot = (game.winnerPot / 1e9).toFixed(2);
  const timer = formatCountdown(game.timerEnd);
  const price = calculateKeyPrice(game.totalKeysSold).toFixed(4);
  const minutesLeft = (game.timerEnd - Date.now() / 1000) / 60;

  // Dynamic image URL
  const ogUrl = new URL("/api/og/game", baseUrl);
  ogUrl.searchParams.set("pot", pot);
  ogUrl.searchParams.set("timer", timer);
  ogUrl.searchParams.set("round", game.round.toString());
  ogUrl.searchParams.set("price", price);
  if (ref) ogUrl.searchParams.set("ref", truncate(ref));
  ogUrl.searchParams.set("t", Math.floor(Date.now() / 30000).toString());

  // Build description — referral mention if present
  const descParts = [
    `Key price: ${price} SOL`,
    `Timer: ${timer}`,
    `Last buyer wins 48% of pot`,
  ];
  if (ref) descParts.push(`Referred by: ${truncate(ref)}`);

  const response: ActionGetResponse = {
    type: "action",
    icon: ogUrl.toString(),
    title: minutesLeft < 5
      ? `MOLT #${game.round} ENDING — ${timer} LEFT!`
      : `Molt #${game.round} — ${pot} SOL Pot`,
    description: descParts.join(" | "),
    label: "Grab Claws",
    links: {
      actions: [
        { type: "transaction", label: "1 Claw", href: buyHref(1, ref) },
        { type: "transaction", label: "5 Claws", href: buyHref(5, ref) },
        { type: "transaction", label: "10 Claws", href: buyHref(10, ref) },
        {
          type: "transaction",
          label: "Custom",
          href: buyHref("{amount}", ref),
          parameters: [{
            type: "number",
            name: "amount",
            label: "Number of claws",
            required: true,
            min: 1,
            max: 10000,
          }],
        },
      ],
    },
    // Urgency banner when timer is low
    ...(minutesLeft < 5 && {
      error: { message: `Only ${timer} remaining! Last buyer wins ${pot} SOL!` },
    }),
  };

  return Response.json(response, { headers: ACTIONS_CORS_HEADERS });
};

export const OPTIONS = GET;

function buyHref(amount: number | string, ref: string | null): string {
  const base = `/api/actions/buy-keys?amount=${amount}`;
  return ref ? `${base}&ref=${ref}` : base;
}

function truncate(addr: string): string {
  return addr.length > 8 ? `${addr.slice(0, 4)}...${addr.slice(-4)}` : addr;
}
```

### Round-Ended State

When the round has ended, the same Blink URL shows a different card — winner celebration + claim buttons:

```typescript
function roundEndedBlink(game: GameState | null, baseUrl: string): ActionGetResponse {
  if (!game) {
    return {
      type: "action",
      icon: `${baseUrl}/api/og/game?pot=0&timer=00:00:00&round=0`,
      title: "FOMolt3D — No Active Molt",
      description: "No molt is currently running. Check back soon!",
      label: "No Molt",
      disabled: true,
    };
  }

  const pot = (game.winnerPot / 1e9).toFixed(2);
  const ogUrl = new URL("/api/og/game", baseUrl);
  ogUrl.searchParams.set("pot", pot);
  ogUrl.searchParams.set("round", game.round.toString());
  ogUrl.searchParams.set("ended", "true");
  ogUrl.searchParams.set("winner", truncate(game.lastBuyer));

  return {
    type: "action",
    icon: ogUrl.toString(),
    title: `Molt #${game.round} — ENDED!`,
    description: `Winner: ${truncate(game.lastBuyer)} won ${pot} SOL!`,
    label: "Molt Over",
    disabled: true,
    links: {
      actions: [
        { type: "transaction", label: "Claim Dividends", href: "/api/actions/claim-dividends" },
        { type: "transaction", label: "Claim Referral", href: "/api/actions/claim-referral" },
        { type: "external-link", label: "View Results", href: `${baseUrl}/round/${game.round}` },
      ],
    },
  };
}
```

---

## POST Handler + Action Chaining

After the buy transaction confirms, show a personalized celebration via callback:

```typescript
// POST /api/actions/buy-keys
export const POST = async (req: Request) => {
  const { searchParams } = new URL(req.url);
  const amount = parseInt(searchParams.get("amount") ?? "1");
  const ref = searchParams.get("ref");
  const body = await req.json();
  const account = new PublicKey(body.account);

  const tx = await buildBuyKeysTransaction(account, amount, ref);

  return Response.json({
    type: "transaction",
    transaction: Buffer.from(tx.serialize()).toString("base64"),
    message: `Grabbing ${amount} claw${amount > 1 ? "s" : ""}...`,
    links: {
      next: {
        type: "post",
        href: `/api/actions/buy-keys/callback`,
      },
    },
  }, { headers: ACTIONS_CORS_HEADERS });
};
```

### Callback (Post-TX Celebration)

```typescript
// app/api/actions/buy-keys/callback/route.ts
export const POST = async (req: Request) => {
  const { account, signature } = await req.json();
  const baseUrl = new URL(req.url).origin;

  const player = await fetchPlayerState(account);
  const game = await fetchGameState();

  const pct = game.totalKeysSold > 0
    ? (player.keys / game.totalKeysSold * 100).toFixed(1)
    : "100";

  const pot = (game.winnerPot / 1e9).toFixed(2);

  // Reuse the same OG image route with success params
  const ogUrl = new URL("/api/og/game", baseUrl);
  ogUrl.searchParams.set("pot", pot);
  ogUrl.searchParams.set("round", game.round.toString());
  ogUrl.searchParams.set("timer", formatCountdown(game.timerEnd));

  return Response.json({
    type: "completed",
    icon: ogUrl.toString(),
    title: "Claws Grabbed!",
    description: `You hold ${player.keys} claws (${pct}% of total). Pot: ${pot} SOL. Timer: ${formatCountdown(game.timerEnd)}.`,
    label: "Done",
  }, { headers: ACTIONS_CORS_HEADERS });
};
```

---

## Claim Endpoints (Plain Actions — No Visual Treatment)

These are functional but minimal. No dynamic images, no chaining, no special states:

```typescript
// Shared pattern for all claim endpoints:
// GET → { type: "action", icon: static, title, description, label, links.actions: [one button] }
// POST → { type: "transaction", transaction: base64 }
// OPTIONS → same as GET

// /api/actions/claim-dividends
// /api/actions/claim-winner
// /api/actions/claim-referral
```

Each returns a static icon (`/icon.png`), a simple title/description, and one action button. No `?ref=` handling, no dynamic OG images, no callbacks. They get the job done.

---

## Spec Reference

### Action Types

```typescript
// GET response
interface Action {
  type: "action" | "completed";
  icon: string;               // Absolute HTTPS URL — SVG, PNG, or WebP only
  title: string;
  description: string;
  label: string;              // Button text (max ~5 words, verb-first)
  disabled?: boolean;
  links?: { actions: LinkedAction[] };
  error?: { message: string };
}

// Linked action button
type LinkedActionType = "transaction" | "post" | "message" | "external-link";
interface LinkedAction {
  type: LinkedActionType;
  href: string;
  label: string;
  parameters?: ActionParameter[];
}

// Parameter types
type ActionParameterType =
  | "text" | "email" | "url" | "number"
  | "date" | "datetime-local" | "textarea"
  | "select" | "radio" | "checkbox";

interface ActionParameter {
  type?: ActionParameterType;  // default: "text"
  name: string;
  label?: string;
  required?: boolean;
  pattern?: string;
  patternDescription?: string;
  min?: number | string;
  max?: number | string;
}

// For select/radio/checkbox
interface ActionParameterSelectable extends ActionParameter {
  options: Array<{ label: string; value: string; selected?: boolean }>;
}

// POST response (union — we only use "transaction")
interface TransactionResponse {
  type: "transaction";
  transaction: string;         // base64 serialized unsigned tx
  message?: string;
  links?: { next: NextActionLink };
}

// Action chaining
type NextActionLink =
  | { type: "post"; href: string }        // Callback URL (same-origin)
  | { type: "inline"; action: Action };    // Embed next action directly

// Callback request body
interface NextActionPostRequest {
  account: string;
  signature: string;           // base58 tx signature
}
```

### Required Headers

```typescript
import { createActionHeaders } from "@solana/actions";

// Development
const headers = createActionHeaders({ chainId: "devnet" });

// Production
const headers = createActionHeaders({ chainId: "mainnet" });

// Or manual:
const ACTIONS_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, Content-Encoding, Accept-Encoding, X-Accept-Action-Version, X-Accept-Blockchain-Ids",
  "Access-Control-Expose-Headers": "X-Action-Version, X-Blockchain-Ids",
  "Content-Type": "application/json",
  "X-Action-Version": "2.4",
  "X-Blockchain-Ids": "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
};
```

### actions.json

```json
{
  "rules": [
    { "pathPattern": "/api/actions/buy-keys**", "apiPath": "/api/actions/buy-keys**" },
    { "pathPattern": "/api/actions/claim-dividends**", "apiPath": "/api/actions/claim-dividends**" },
    { "pathPattern": "/api/actions/claim-winner**", "apiPath": "/api/actions/claim-winner**" },
    { "pathPattern": "/api/actions/claim-referral**", "apiPath": "/api/actions/claim-referral**" }
  ]
}
```

---

## Distribution Checklist

### Pre-Launch

- [ ] Create `/api/og/game` dynamic image route
- [ ] Deploy buy-keys Blink with referral support
- [ ] Deploy claim endpoints (plain actions)
- [ ] Serve `actions.json` at domain root
- [ ] Test on [dial.to](https://dial.to/?action=solana-action:YOUR_URL)
- [ ] Test with [Blinks Inspector](https://www.blinks.xyz/inspector)
- [ ] Register on [Dialect Actions Registry](https://dial.to/register) (required for X/Twitter unfurling)

### Launch

- [ ] Share buy-keys Blink URL on X (unfurls via Phantom extension for registered actions)
- [ ] Give every player their `?ref=` URL in the dashboard
- [ ] Add referral Blink URL to skill.md for agent consumption
- [ ] Embed Miniblink on landing page (optional):

```html
<dialect-blink
  action="solana-action:https://fomolt3d.com/api/actions/buy-keys"
  style-preset="x-dark"
/>
```

### Rendering Contexts

| Platform | How It Renders | Requirement |
|----------|---------------|-------------|
| X/Twitter | Phantom/Backpack extension intercepts URL → interactive card | Dialect registry |
| dial.to | Standalone rendered page | None (wrap URL) |
| Phantom wallet | Native Blink rendering | Dialect registry |
| Any website | Miniblink embed or Dialect SDK | `@dialectlabs/blinks` |
| AI agents | Read GET response JSON directly | None |

---

## Image Specifications

| Property | Value |
|----------|-------|
| Dimensions | 800x800px (1:1) |
| Format | PNG |
| Max file size | 500KB |
| URL | Absolute HTTPS, required |
| Cache strategy | `?t={Math.floor(Date.now()/30000)}` busts every 30s |
| Generated via | Next.js `ImageResponse` (Satori) |

---

## Sources

### Official
- [Solana Actions Documentation](https://solana.com/docs/advanced/actions)
- [Solana Actions Developer Guide](https://solana.com/developers/guides/advanced/actions)
- [Actions Spec TypeScript Definitions](https://github.com/solana-developers/solana-actions/blob/main/packages/actions-spec/index.d.ts)
- [@solana/actions-spec npm](https://www.npmjs.com/package/@solana/actions-spec)

### Dialect
- [Dialect Blinks Documentation](https://docs.dialect.to/blinks)
- [Dialect Forms (Input Types)](https://docs.dialect.to/blinks/blinks-provider/advanced/forms)
- [Dialect Actions Registry](https://dashboard.dialect.to)
- [Miniblinks](https://www.dialect.to/blog/introducing-miniblinks)

### RFCs
- [sRFC 28: Action Chaining](https://forum.solana.com/t/srfc-28-blinks-chaining/1734)
- [sRFC 29: Input Types](https://forum.solana.com/t/srfc-29-input-types-of-blinks-and-actions/1804)
- [sRFC 31: Versioning](https://forum.solana.com/t/srfc-31-compatibility-of-blinks-and-actions/1892)
- [sRFC 32: Optional Transactions](https://forum.solana.com/t/srfc-32-optional-transactions-in-action-chaining/1971)
- [sRFC 33: Sign Message](https://forum.solana.com/t/srfc-33-sign-message-in-actions-blinks/2026)

### Guides
- [Chainstack Blinks Guide](https://docs.chainstack.com/docs/solana-how-to-build-actions-and-blinks)
- [QuickNode Actions Guide](https://www.quicknode.com/guides/solana-development/transactions/actions-and-blinks)
- [Next.js ImageResponse API](https://nextjs.org/docs/app/api-reference/functions/image-response)
- [Phantom Blinks Docs](https://docs.phantom.com/developer-powertools/solana-actions-and-blinks)
- [Blinks Inspector](https://www.blinks.xyz/inspector)
