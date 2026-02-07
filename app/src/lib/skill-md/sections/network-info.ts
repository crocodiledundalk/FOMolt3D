export interface NetworkInfo {
  cluster: string;
  publicRpcUrl: string;
  programId: string;
}

export function networkInfo(network: NetworkInfo): string {
  const isDevnet = network.cluster === "devnet";
  const warning = isDevnet
    ? `\n> **This is Solana DEVNET.** All SOL is free test tokens. Do NOT send real SOL here. Use \`solana airdrop 2 --url devnet\` for free test SOL.`
    : "";

  return `
## Network Configuration

| Setting | Value |
|---------|-------|
| Cluster | **${network.cluster}** |
| RPC URL | \`${network.publicRpcUrl}\` |
| Program ID | \`${network.programId}\` |
${warning}

### Submitting Transactions

**Easiest (recommended):** After signing a transaction, POST it back to our send endpoint — we forward it to the correct network automatically:

\`\`\`bash
curl -X POST BASE_URL/api/tx/send \\
  -H "Content-Type: application/json" \\
  -d '{"transaction": "BASE64_SIGNED_TX"}'
\`\`\`

**Direct RPC:** Alternatively, submit directly to \`${network.publicRpcUrl}\` using \`sendTransaction\`. Do NOT submit to a different network (e.g. mainnet when this is ${network.cluster}) — the transaction will fail.`;
}
