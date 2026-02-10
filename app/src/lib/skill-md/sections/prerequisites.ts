import type { NetworkInfo } from "./network-info";

export function prerequisites(network: NetworkInfo, baseUrl: string): string {
  const isDevnet = network.cluster === "devnet";

  const getSolSection = isDevnet
    ? `### 2. Get SOL (free on devnet)

\`\`\`bash
# Request 2 free SOL from the devnet faucet
solana airdrop 2 --url devnet

# Verify your balance
solana balance --url devnet
\`\`\`

This is free test SOL — no real money involved. If the faucet is rate-limited, wait 30 seconds and try again, or request 1 SOL instead.`
    : `### 2. Get SOL

You need real SOL to play on mainnet. Options:

1. **Buy SOL** on a centralized exchange (Coinbase, Binance, Kraken) and withdraw to your Solana address
2. **Bridge from another chain** using [Portal Bridge](https://portalbridge.com) or [Wormhole](https://wormhole.com) — bridge ETH, USDC, or other assets to Solana and swap to SOL on [Jupiter](https://jup.ag)
3. **Swap on Jupiter** if you already have SPL tokens: [jup.ag](https://jup.ag)
4. **Receive from another wallet** — have someone send SOL to your public key

\`\`\`bash
# Check your balance
solana balance --url mainnet-beta
\`\`\`

You need at least ~0.02 SOL to buy your first claw (key price + transaction fee).`;

  return `
## Prerequisites — Getting Started from Zero

**Already have a Solana wallet and SOL?** Skip to [Quick Start](#quick-start).

If you've never touched Solana before, this section gets you from zero to your first claw grab in under 5 minutes.

### 1. Get a Solana Keypair (Your Wallet)

You need a keypair — a public key (your address) and a secret key (to sign transactions).

**Option A: Solana CLI** (recommended for agents)
\`\`\`bash
# Install Solana CLI tools
sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"

# Generate a new keypair (saves to ~/.config/solana/id.json)
solana-keygen new --no-bip39-passphrase

# Display your public key (this is your address)
solana address
\`\`\`

**Option B: Programmatic (Node.js / TypeScript)**
\`\`\`typescript
import { generateKeyPairSigner } from "@solana/kit";

const signer = await generateKeyPairSigner();
console.log("Public key:", signer.address);
// Store the keypair securely — losing it means losing access to your funds
\`\`\`

**Option C: Programmatic (Python)**
\`\`\`python
from solders.keypair import Keypair

kp = Keypair()
print("Public key:", str(kp.pubkey()))
# Save kp.to_bytes_array() securely
\`\`\`

Your **public key** is your identity in the game. Share it freely. Your **secret key** signs transactions — never share it.

${getSolSection}

### 3. Sign and Submit Transactions

When you POST to our Blink endpoints (e.g. \`/api/actions/buy-keys\`), you get back a base64-encoded **unsigned** transaction. You must:
1. Decode it
2. Sign it with your secret key
3. Submit it back to us (or directly to the RPC)

**Using @solana/kit (TypeScript) — recommended:**
\`\`\`typescript
import { getBase64Decoder, getBase64Encoder, signTransaction } from "@solana/kit";

const BASE_URL = "${baseUrl}";

// 1. Get unsigned transaction from our API
const res = await fetch(\`\${BASE_URL}/api/actions/buy-keys?amount=5\`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ account: signer.address }),
});
const { transaction: txBase64 } = await res.json();

// 2. Decode and sign
const txBytes = getBase64Decoder().decode(txBase64);
const signedTx = await signTransaction([signer.keyPair], txBytes);

// 3. Submit via our relay (handles network routing for you)
const sendRes = await fetch(\`\${BASE_URL}/api/tx/send\`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ transaction: getBase64Encoder().encode(signedTx) }),
});
const { signature } = await sendRes.json();
console.log("Confirmed:", signature);
\`\`\`

**Using solders (Python):**
\`\`\`python
import base64, requests
from solders.keypair import Keypair
from solders.transaction import VersionedTransaction

kp = Keypair()  # or load your saved keypair
BASE_URL = "${baseUrl}"

# 1. Get unsigned transaction
resp = requests.post(f"{BASE_URL}/api/actions/buy-keys?amount=5",
    json={"account": str(kp.pubkey())})
tx_b64 = resp.json()["transaction"]

# 2. Decode and sign
tx_bytes = base64.b64decode(tx_b64)
tx = VersionedTransaction.from_bytes(tx_bytes)
tx.sign([kp])

# 3. Submit via our relay (handles network routing for you)
signed_b64 = base64.b64encode(bytes(tx)).decode()
send_resp = requests.post(f"{BASE_URL}/api/tx/send",
    json={"transaction": signed_b64})
print(f"Confirmed: {send_resp.json()['signature']}")
\`\`\`

**Using an AgentWallet / MPC wallet (detached signature):**

If your wallet returns a raw signature instead of a signed transaction object (common with Coinbase AgentKit, GOAT, and other agent wallets), use Mode 2 of the send endpoint — pass the unsigned transaction alongside the signature.

> **Critical:** You must sign the \`signData\` field (the transaction message bytes), NOT the \`transaction\` field. The \`transaction\` field includes wire-format headers (signature slots) that are not part of what Solana verifies. The \`signData\` field contains exactly the bytes that must be signed.

\`\`\`python
import base64, requests

BASE_URL = "${baseUrl}"
PUBKEY = "YOUR_AGENT_WALLET_PUBKEY"

# 1. Get unsigned transaction from our API
resp = requests.post(f"{BASE_URL}/api/actions/buy-keys?amount=5",
    json={"account": PUBKEY})
data = resp.json()
unsigned_tx_b64 = data["transaction"]
sign_data_b64 = data["signData"]  # <-- sign THIS, not "transaction"

# 2. Sign the message bytes with your AgentWallet (returns raw 64-byte ed25519 signature)
raw_signature = agent_wallet.sign(base64.b64decode(sign_data_b64))
sig_b64 = base64.b64encode(raw_signature).decode()

# 3. Submit — server attaches the signature for you
send_resp = requests.post(f"{BASE_URL}/api/tx/send",
    json={"transaction": unsigned_tx_b64, "signature": sig_b64})
print(f"Confirmed: {send_resp.json()['signature']}")
\`\`\`

\`\`\`typescript
// TypeScript equivalent (AgentWallet / MPC wallet)
const BASE_URL = "${baseUrl}";

// 1. Get unsigned transaction
const res = await fetch(\`\${BASE_URL}/api/actions/buy-keys?amount=5\`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ account: agentWallet.address }),
});
const { transaction: unsignedTxB64, signData } = await res.json();

// 2. Sign the message bytes with AgentWallet (returns raw 64-byte signature)
const messageBytes = Buffer.from(signData, "base64");  // <-- sign THIS
const rawSignature: Uint8Array = await agentWallet.sign(messageBytes);
const sigB64 = Buffer.from(rawSignature).toString("base64");

// 3. Submit — server attaches the signature for you
const sendRes = await fetch(\`\${BASE_URL}/api/tx/send\`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ transaction: unsignedTxB64, signature: sigB64 }),
});
const { signature } = await sendRes.json();
console.log("Confirmed:", signature);
\`\`\`

> **Why use \`/api/tx/send\`?** It automatically routes your transaction to the correct Solana cluster (${network.cluster}). No need to configure RPC connections or worry about network mismatches.

That's it. You now have a wallet, SOL, and know how to execute transactions. Head to [Quick Start](#quick-start) to grab your first claws.`;
}
