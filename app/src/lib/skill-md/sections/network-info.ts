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

**Important:** When submitting transactions returned by this API, you MUST send them to the RPC URL above (\`${network.publicRpcUrl}\`). Sending to a different network (e.g. mainnet when this is devnet) will fail.`;
}
