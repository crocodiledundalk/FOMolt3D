#!/usr/bin/env bash
set -euo pipefail

# FOMolt3D Mainnet Deployment Script
# ---
# Prerequisites:
#   1. Solana CLI installed and configured for mainnet-beta
#   2. Anchor CLI v0.32.1 installed
#   3. Deployer wallet funded with ~10 SOL on mainnet
#   4. config/mainnet.json reviewed and all placeholders filled
#
# Usage:
#   bash scripts/deploy-mainnet.sh
#
# This script will:
#   1. Verify Solana CLI targets mainnet-beta
#   2. Validate program keypair matches declared Program ID
#   3. Check deployer balance (needs ~10 SOL)
#   4. Build the program
#   5. Deploy to mainnet-beta
#   6. Deploy the IDL on-chain
#   7. Copy IDL artifacts to app/
#
# After deployment, run:
#   bash scripts/transfer-authority.sh   (transfer upgrade authority)
#   cd app && npx ts-node scripts/configure-mainnet.ts  (initialize game)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
CONFIG_FILE="$PROJECT_DIR/config/mainnet.json"
PROGRAM_ID="EebbWtjHyocWPwZaQ4k2L61mSdW6y175knsEwppTpdWw"
KEYPAIR="$PROJECT_DIR/target/deploy/fomolt3d-keypair.json"
MIN_BALANCE_SOL=5

cd "$PROJECT_DIR"

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║          FOMolt3D MAINNET Deployment                        ║"
echo "║                                                              ║"
echo "║  WARNING: This deploys to mainnet-beta with REAL SOL.       ║"
echo "║  Ensure you have reviewed config/mainnet.json carefully.    ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# --- Safety confirmation ---
read -p "Are you sure you want to deploy to MAINNET? Type 'yes' to continue: " CONFIRM
if [[ "$CONFIRM" != "yes" ]]; then
    echo "Aborted."
    exit 1
fi

# --- 1. Verify config ---
echo "[1/7] Verifying Solana config..."
CLUSTER=$(solana config get | grep "RPC URL" | awk '{print $NF}')
if [[ "$CLUSTER" != *"mainnet"* && "$CLUSTER" != *"api.mainnet-beta"* ]]; then
    echo "ERROR: Solana CLI not pointed at mainnet-beta."
    echo "  Current: $CLUSTER"
    echo "  Run: solana config set --url mainnet-beta"
    echo "  Or:  solana config set --url YOUR_MAINNET_RPC_URL"
    exit 1
fi
echo "  Cluster: $CLUSTER"

# --- 2. Verify keypair ---
echo "[2/7] Verifying program keypair..."
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

# --- 3. Verify config file ---
echo "[3/7] Checking config/mainnet.json..."
if [[ ! -f "$CONFIG_FILE" ]]; then
    echo "ERROR: config/mainnet.json not found."
    echo "  Review and fill in the config file before deploying."
    exit 1
fi
# Check for unfilled placeholders
if grep -q "YOUR_.*_HERE" "$CONFIG_FILE"; then
    echo "WARNING: config/mainnet.json still contains placeholder values:"
    grep "YOUR_.*_HERE" "$CONFIG_FILE" | head -5
    echo ""
    read -p "Continue anyway? (The deploy script itself doesn't need these, but configure-mainnet.ts will.) [y/N] " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# --- 4. Check balance ---
echo "[4/7] Checking deployer balance..."
DEPLOYER=$(solana address)
BALANCE=$(solana balance | awk '{print $1}')
echo "  Deployer: $DEPLOYER"
echo "  Balance:  $BALANCE SOL"
if (( $(echo "$BALANCE < $MIN_BALANCE_SOL" | bc -l 2>/dev/null || echo 1) )); then
    echo "ERROR: Insufficient balance. Need at least $MIN_BALANCE_SOL SOL for mainnet deployment."
    echo "  Current: $BALANCE SOL"
    echo "  The program binary is ~300KB, which requires ~2.4 SOL in rent + tx fees."
    exit 1
fi

# --- 5. Build ---
echo "[5/7] Building program..."
anchor build
echo "  Build complete."

# Verify the built .so exists
if [[ ! -f "$PROJECT_DIR/target/deploy/fomolt3d.so" ]]; then
    echo "ERROR: Built program binary not found at target/deploy/fomolt3d.so"
    exit 1
fi
SO_SIZE=$(wc -c < "$PROJECT_DIR/target/deploy/fomolt3d.so")
echo "  Binary size: $(( SO_SIZE / 1024 )) KB"

# --- 6. Deploy program ---
echo "[6/7] Deploying program to mainnet-beta..."
echo ""
echo "  This will cost approximately 2-4 SOL in rent."
read -p "  Proceed with deployment? [y/N] " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

solana program deploy \
    --program-id "$KEYPAIR" \
    --url mainnet-beta \
    "$PROJECT_DIR/target/deploy/fomolt3d.so"
echo "  Program deployed!"

# --- 7. Deploy IDL on-chain ---
echo "[7/7] Deploying IDL on-chain..."

IDL_FILE="$PROJECT_DIR/target/idl/fomolt3d.json"
if [[ ! -f "$IDL_FILE" ]]; then
    echo "WARNING: IDL file not found at $IDL_FILE"
    echo "  Skipping IDL deployment. You can deploy it later with:"
    echo "  anchor idl init $PROGRAM_ID --filepath $IDL_FILE --provider.cluster mainnet-beta"
else
    # Try anchor idl init (works for first-time deployment)
    # If IDL already exists on-chain, use anchor idl upgrade instead
    if anchor idl init "$PROGRAM_ID" \
        --filepath "$IDL_FILE" \
        --provider.cluster mainnet-beta 2>/dev/null; then
        echo "  IDL deployed on-chain (init)."
    elif anchor idl upgrade "$PROGRAM_ID" \
        --filepath "$IDL_FILE" \
        --provider.cluster mainnet-beta 2>/dev/null; then
        echo "  IDL deployed on-chain (upgrade)."
    else
        echo "  WARNING: anchor idl init/upgrade failed."
        echo "  This may be due to Anchor version differences."
        echo ""
        echo "  Alternative: Deploy IDL manually using anchor CLI:"
        echo "    anchor idl init $PROGRAM_ID --filepath $IDL_FILE --provider.cluster mainnet-beta"
        echo ""
        echo "  Or use the program metadata approach if anchor idl commands are not supported:"
        echo "    See: https://github.com/coral-xyz/anchor/blob/master/CHANGELOG.md"
    fi
fi

# Copy IDL artifacts to local directories
mkdir -p "$PROJECT_DIR/idl"
cp "$PROJECT_DIR/target/idl/fomolt3d.json" "$PROJECT_DIR/idl/fomolt3d.json"
cp "$PROJECT_DIR/target/types/fomolt3d.ts" "$PROJECT_DIR/idl/fomolt3d.ts" 2>/dev/null || true
# Sync to app
cp "$PROJECT_DIR/target/idl/fomolt3d.json" "$PROJECT_DIR/app/src/lib/idl.json" 2>/dev/null || true

echo "  IDL artifacts copied to idl/ and app/src/lib/"

# --- Done ---
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  Deployment Complete!                                        ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "  Program ID: $PROGRAM_ID"
echo "  Explorer:   https://explorer.solana.com/address/$PROGRAM_ID"
echo "  Deployer:   $DEPLOYER"
echo ""
echo "Next steps:"
echo "  1. Verify deployment:"
echo "     solana program show $PROGRAM_ID"
echo ""
echo "  2. Transfer upgrade authority (recommended):"
echo "     bash scripts/transfer-authority.sh"
echo ""
echo "  3. Configure the game & start round 1:"
echo "     cd app && npx ts-node scripts/configure-mainnet.ts"
echo ""
echo "  4. Update app/.env.local for mainnet:"
echo "     See config/mainnet.json and MAINNET-CHECKLIST.md"
echo ""
echo "  5. Clean up buffer accounts to reclaim SOL:"
echo "     solana program show --buffers"
echo "     solana program close <BUFFER_ADDRESS>"
