#!/usr/bin/env bash
set -euo pipefail

# FOMolt3D — Transfer Program Upgrade Authority
# ---
# Transfers the program's upgrade authority to a new address (e.g., multisig).
# Run this AFTER deploying and configuring the game on mainnet.
#
# Usage:
#   bash scripts/transfer-authority.sh <NEW_AUTHORITY_PUBKEY>
#
# To make the program immutable (non-upgradeable), pass --immutable:
#   bash scripts/transfer-authority.sh --immutable
#
# WARNING: Making the program immutable is IRREVERSIBLE.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PROGRAM_ID="EebbWtjHyocWPwZaQ4k2L61mSdW6y175knsEwppTpdWw"

echo ""
echo "=== FOMolt3D — Transfer Program Upgrade Authority ==="
echo ""

# Show current authority
echo "[1/3] Current program state:"
solana program show "$PROGRAM_ID"
echo ""

# Parse argument
if [[ $# -lt 1 ]]; then
    echo "Usage:"
    echo "  bash scripts/transfer-authority.sh <NEW_AUTHORITY_PUBKEY>"
    echo "  bash scripts/transfer-authority.sh --immutable"
    echo ""
    echo "Examples:"
    echo "  # Transfer to a Squads multisig:"
    echo "  bash scripts/transfer-authority.sh SQUADSxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
    echo ""
    echo "  # Make program immutable (IRREVERSIBLE):"
    echo "  bash scripts/transfer-authority.sh --immutable"
    exit 1
fi

NEW_AUTHORITY="$1"

if [[ "$NEW_AUTHORITY" == "--immutable" ]]; then
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║  WARNING: You are about to make this program IMMUTABLE.    ║"
    echo "║  This action is IRREVERSIBLE. The program can never be     ║"
    echo "║  upgraded or modified again.                                ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo ""
    echo "  Program: $PROGRAM_ID"
    echo ""
    read -p "  Type 'make-immutable' to confirm: " CONFIRM
    if [[ "$CONFIRM" != "make-immutable" ]]; then
        echo "Aborted."
        exit 1
    fi

    echo ""
    echo "[2/3] Removing upgrade authority..."
    solana program set-upgrade-authority "$PROGRAM_ID" --final
    echo "  Done. Program is now immutable."
else
    echo "[2/3] Transferring upgrade authority..."
    echo "  Program:       $PROGRAM_ID"
    echo "  New authority: $NEW_AUTHORITY"
    echo ""
    read -p "  Confirm transfer? Type 'yes': " CONFIRM
    if [[ "$CONFIRM" != "yes" ]]; then
        echo "Aborted."
        exit 1
    fi

    solana program set-upgrade-authority "$PROGRAM_ID" --new-upgrade-authority "$NEW_AUTHORITY"
    echo "  Done. Upgrade authority transferred."
fi

echo ""
echo "[3/3] Verifying new state:"
solana program show "$PROGRAM_ID"
echo ""
echo "=== Authority Transfer Complete ==="
