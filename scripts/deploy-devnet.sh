#!/usr/bin/env bash
set -euo pipefail

# FOMolt3D Devnet Deployment Script
# ---
# Prerequisites:
#   1. Solana CLI installed and configured for devnet
#   2. Anchor CLI v0.32.1 installed
#   3. Deployer wallet funded with ~5 SOL on devnet
#
# Fund your wallet:
#   Visit https://faucet.solana.com and airdrop to the deployer address.
#   Or: solana airdrop 2 --url devnet  (may be rate-limited)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PROGRAM_ID="EebbWtjHyocWPwZaQ4k2L61mSdW6y175knsEwppTpdWw"
KEYPAIR="$PROJECT_DIR/target/deploy/fomolt3d-keypair.json"

cd "$PROJECT_DIR"

echo "=== FOMolt3D Devnet Deployment ==="
echo ""

# 1. Verify config
echo "[1/6] Verifying Solana config..."
CLUSTER=$(solana config get | grep "RPC URL" | awk '{print $NF}')
if [[ "$CLUSTER" != *"devnet"* ]]; then
    echo "ERROR: Solana CLI not pointed at devnet. Run: solana config set --url devnet"
    exit 1
fi
echo "  Cluster: $CLUSTER"

# 2. Verify keypair
echo "[2/6] Verifying program keypair..."
if [[ ! -f "$KEYPAIR" ]]; then
    echo "ERROR: Program keypair not found at $KEYPAIR"
    echo "  Run 'anchor build' first to generate the keypair."
    exit 1
fi
ACTUAL_ID=$(solana-keygen pubkey "$KEYPAIR")
if [[ "$ACTUAL_ID" != "$PROGRAM_ID" ]]; then
    echo "ERROR: Keypair pubkey ($ACTUAL_ID) does not match declared program ID ($PROGRAM_ID)"
    exit 1
fi
echo "  Program ID: $PROGRAM_ID"

# 3. Check balance
echo "[3/6] Checking deployer balance..."
DEPLOYER=$(solana address)
BALANCE=$(solana balance --url devnet | awk '{print $1}')
echo "  Deployer: $DEPLOYER"
echo "  Balance: $BALANCE SOL"
# Check if balance is sufficient (need ~4 SOL)
if (( $(echo "$BALANCE < 3" | bc -l 2>/dev/null || echo 1) )); then
    echo "WARNING: Balance may be insufficient. Recommend at least 4 SOL for deployment."
    echo "  Fund at: https://faucet.solana.com"
    read -p "  Continue anyway? [y/N] " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 4. Build
echo "[4/6] Building program..."
anchor build
echo "  Build complete."

# 5. Deploy
echo "[5/6] Deploying to devnet..."
solana program deploy \
    --program-id "$KEYPAIR" \
    --url devnet \
    "$PROJECT_DIR/target/deploy/fomolt3d.so"
echo "  Deployed!"

# 6. Copy IDL
echo "[6/6] Copying IDL artifacts..."
mkdir -p "$PROJECT_DIR/idl"
cp "$PROJECT_DIR/target/idl/fomolt3d.json" "$PROJECT_DIR/idl/fomolt3d.json"
cp "$PROJECT_DIR/target/types/fomolt3d.ts" "$PROJECT_DIR/idl/fomolt3d.ts"
echo "  IDL saved to idl/fomolt3d.json"
echo "  Types saved to idl/fomolt3d.ts"

echo ""
echo "=== Deployment Complete ==="
echo "  Program ID: $PROGRAM_ID"
echo "  Explorer: https://explorer.solana.com/address/$PROGRAM_ID?cluster=devnet"
echo ""
echo "Next steps:"
echo "  1. Run the smoke test:  bash scripts/smoke-test-devnet.sh"
echo "  2. Configure & start:   cd app && npx ts-node scripts/configure-devnet.ts"
echo "     (creates GlobalConfig + initializes round 1)"
