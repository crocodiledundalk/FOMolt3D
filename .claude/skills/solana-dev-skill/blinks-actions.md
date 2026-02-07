# Solana Blinks & Actions Reference

## Overview

**Solana Actions** are spec-compliant HTTP APIs that return signable Solana transactions. **Blinks (Blockchain Links)** are shareable URLs that Action-aware clients (browser extensions, wallets, embedded SDKs) unfurl into interactive transaction cards.

Any HTTP endpoint conforming to the Actions spec becomes an interactive blockchain widget that renders on X/Twitter (via browser extensions), in wallets, on websites (via Dialect SDK), and at `dial.to` interstitial pages.

## Core Spec

### actions.json Manifest

Serve at domain root. Maps website URL paths to Action API endpoints. Must include CORS headers.

```json
{
  "rules": [
    { "pathPattern": "/api/actions/**", "apiPath": "/api/actions/**" },
    { "pathPattern": "/buy/*", "apiPath": "/api/actions/buy/*" }
  ]
}
```

Wildcards: `*` matches one segment, `**` matches zero or more segments (must be last). Query params are preserved.

### CORS Headers (Required on ALL Action endpoints + actions.json)

```typescript
import { ACTIONS_CORS_HEADERS, createActionHeaders } from "@solana/actions";

// Use on every route:
const headers = createActionHeaders();
// Or manually:
// Access-Control-Allow-Origin: *
// Access-Control-Allow-Methods: GET,POST,PUT,OPTIONS
// Access-Control-Allow-Headers: Content-Type, Authorization, Content-Encoding, Accept-Encoding

// Every route MUST handle OPTIONS:
export const OPTIONS = async () => Response.json(null, { headers });
```

### GET — Fetch Action Metadata

Returns the interactive card definition: title, icon, description, buttons, and input fields.

```typescript
interface ActionGetResponse {
  type?: "action";       // defaults to "action"
  icon: string;          // absolute HTTPS URL to image (SVG, PNG, WebP)
  title: string;
  description: string;
  label: string;         // button text, <=5 words, verb-first
  disabled?: boolean;
  error?: { message: string };
  links?: {
    actions: LinkedAction[];
  };
}

interface LinkedAction {
  type: "transaction" | "message" | "post" | "external-link";
  href: string;          // can contain {param} substitution placeholders
  label: string;
  parameters?: ActionParameter[];
}

interface ActionParameter {
  type?: "text" | "number" | "email" | "url" | "date" | "select" | "radio" | "checkbox" | "textarea";
  name: string;
  label?: string;
  required?: boolean;
  pattern?: string;           // regex validation
  patternDescription?: string;
  min?: string | number;
  max?: string | number;
  options?: Array<{ label: string; value: string; selected?: boolean }>;  // for select/radio/checkbox
}
```

### POST — Build Transaction

Client sends the user's public key. Server returns a base64-encoded transaction to sign.

```typescript
// Request
interface ActionPostRequest {
  account: string;  // base58-encoded public key
  data?: Record<string, string | string[]>;  // form field values
}

// Response
interface TransactionResponse {
  type: "transaction";
  transaction: string;  // base64-encoded serialized transaction
  message?: string;     // shown to user
  links?: {
    next: NextActionLink;  // for action chaining
  };
}
```

**Transaction rules:**
- If transaction has NO signatures (empty/unsigned): client sets `feePayer` to the POST `account` and fetches fresh `recentBlockhash`
- If partially signed: client must NOT alter `feePayer` or `recentBlockhash`, must verify existing signatures

### Action Chaining

After a transaction confirms, chain to a follow-up action:

```typescript
// Inline: embed the next action directly
links: {
  next: {
    type: "inline",
    action: {
      type: "completed",  // or "action" for another step
      icon: "...", title: "...", description: "...", label: "Done"
    }
  }
}

// Post: fetch next action from server
links: {
  next: {
    type: "post",
    href: "/api/actions/status"  // must be same-origin
  }
}
```

## NPM Packages

```bash
npm install @solana/actions           # SDK: createPostResponse, ACTIONS_CORS_HEADERS, etc.
npm install @solana/actions-spec      # TypeScript types only
npm install @dialectlabs/blinks       # React SDK for embedding Blinks in your site
```

## Next.js Implementation Pattern

### actions.json route

```typescript
// app/actions.json/route.ts
import { ACTIONS_CORS_HEADERS } from "@solana/actions";

export const GET = async () => {
  return Response.json({
    rules: [{ pathPattern: "/api/actions/**", apiPath: "/api/actions/**" }]
  }, { headers: ACTIONS_CORS_HEADERS });
};
export const OPTIONS = GET;
```

### Action endpoint (GET + POST + OPTIONS)

```typescript
// app/api/actions/buy-keys/route.ts
import { createActionHeaders, createPostResponse, ActionGetResponse, ActionPostRequest } from "@solana/actions";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";

const headers = createActionHeaders();

export const GET = async (req: Request) => {
  const url = new URL(req.url);
  const baseHref = new URL("/api/actions/buy-keys", url.origin).toString();

  const payload: ActionGetResponse = {
    type: "action",
    title: "FOMolt3D — Buy Keys",
    icon: new URL("/icon.png", url.origin).toString(),
    description: "Buy keys in the current round. Last buyer wins 48% of the pot!",
    label: "Buy Keys",
    links: {
      actions: [
        { type: "transaction", label: "Buy 1 Key", href: `${baseHref}?amount=1` },
        { type: "transaction", label: "Buy 5 Keys", href: `${baseHref}?amount=5` },
        {
          type: "transaction",
          label: "Buy Keys",
          href: `${baseHref}?amount={amount}`,
          parameters: [{
            name: "amount", label: "Number of keys",
            required: true, type: "number", min: 1
          }]
        }
      ]
    }
  };
  return Response.json(payload, { headers });
};

export const OPTIONS = async () => Response.json(null, { headers });

export const POST = async (req: Request) => {
  const url = new URL(req.url);
  const amount = parseInt(url.searchParams.get("amount") || "1");
  const body: ActionPostRequest = await req.json();
  const account = new PublicKey(body.account);

  // Build your Anchor instruction here
  const connection = new Connection(process.env.RPC_URL!);
  const transaction = new Transaction();
  // ... add program instructions ...

  const payload = await createPostResponse({
    fields: {
      transaction,
      message: `Buying ${amount} key(s)!`,
      links: {
        next: {
          type: "inline",
          action: {
            type: "completed",
            icon: new URL("/icon.png", url.origin).toString(),
            title: "Keys Purchased!",
            description: `You bought ${amount} key(s). Timer reset!`,
            label: "Done"
          }
        }
      }
    }
  });
  return Response.json(payload, { headers });
};
```

### Embedding Blinks in your own site

```tsx
import "@dialectlabs/blinks/index.css";
import { Blink, useBlink } from "@dialectlabs/blinks/react";
import { useBlinkSolanaWalletAdapter } from "@dialectlabs/blinks/hooks/solana";

function GameBlink({ actionUrl }: { actionUrl: string }) {
  const { adapter } = useBlinkSolanaWalletAdapter(RPC_URL);
  const { blink, isLoading } = useBlink({ url: actionUrl });
  if (isLoading) return <div>Loading...</div>;
  return <Blink blink={blink} adapter={adapter} stylePreset="x-dark" />;
}
```

Style presets: `"x-dark"`, `"x-light"`, `"default"`, `"custom"`.

## Deployment & Registration

1. Deploy Action endpoints with CORS headers
2. Verify with Blinks Inspector: `https://www.blinks.xyz/inspector`
3. Test via dial.to: `https://dial.to/?action=solana-action:https://your-domain.com/api/actions/buy-keys`
4. Register at Dialect registry: `https://dial.to/register`
5. After approval, Blinks unfurl on X/Twitter via Phantom/Backpack/Dialect extensions

## Limitations

- **X/Twitter is extension-only**: Requires Phantom, Backpack, or Dialect Chrome extension. No native X support.
- **Mobile gap**: No browser extensions on mobile. Mobile users must open links in wallet in-app browsers or use dial.to.
- **Registry gatekeeper**: Unregistered Actions show warnings or don't render on X.
- **CORS required**: Forgetting CORS headers is the #1 implementation bug.
- **Same-origin for chaining**: `links.next.href` with `type: "post"` must be same-origin as the initial POST.
