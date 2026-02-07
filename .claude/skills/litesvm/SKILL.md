---
name: litesvm
description: Integration testing with LiteSVM for Solana programs. Use when setting up test infrastructure, cloning accounts/programs from mainnet, sending transactions, verifying state changes, or testing error conditions with the lightweight Solana VM.
---

# /litesvm

Comprehensive guide to integration testing Solana programs using LiteSVM - a lightweight Solana VM simulator.

## When to Use

Use this skill when:
- Setting up integration test infrastructure
- Testing program instructions end-to-end
- Loading programs and accounts into a test environment
- Cloning mainnet/devnet accounts for testing
- Verifying transaction success/failure
- Testing error conditions systematically

## LiteSVM Overview

LiteSVM is a fast, lightweight Solana Virtual Machine that runs directly in your test process. It eliminates the overhead of external validators while maintaining compatibility with Solana's runtime.

**Key Advantages:**
- **Performance**: Dramatically faster compilation and execution times compared to `solana-program-test` and `solana-test-validator`
- **Flexibility**: Direct account state manipulation for testing complex edge cases
- **Profiling**: Built-in performance profiling to identify optimization opportunities
- **In-Process**: Embeds the VM within tests instead of spawning separate validator processes
- **Multi-Language**: Supports Rust, TypeScript/JavaScript, and Python (via `solders`)
- **Intuitive API**: Smart defaults for quick setup, plus extensive configuration options for advanced scenarios

## Project Setup

### Cargo.toml

```toml
[package]
name = "my-program-tests"
version = "0.1.0"
edition = "2021"

[dependencies]
litesvm = "0.6.0"
solana-sdk = "2.1.13"
solana-program = "2.1.13"
solana-client = "2.1.13"           # For RPC cloning
solana-account-decoder = "2.1.13"  # For account encoding
bincode = "1.3"
borsh = "1.5.5"
base64 = "0.22.1"
serde_json = "1.0"

# Your program (with no-entrypoint for types only)
my-program = { path = "../program", features = ["no-entrypoint"] }
my-program-client = { path = "../clients/rust" }

# Token support
spl-token = { version = "7.0.0", features = ["no-entrypoint"] }
spl-token-2022 = { version = "7.0.0", features = ["no-entrypoint"] }
spl-associated-token-account-client = "2.0"

[dev-dependencies]
test-case = "3.3.1"
```

### Directory Structure

```
integration_tests/
├── Cargo.toml
├── fixtures/                    # Pre-compiled programs, account snapshots
│   ├── external_program.so
│   ├── usdc_mint.json
│   └── cache/                  # Cached RPC accounts
└── tests/
    ├── mod.rs                   # Root module
    ├── helpers/
    │   ├── mod.rs              # Helper exports
    │   ├── lite_svm.rs         # LiteSVM setup and account loading
    │   ├── assert.rs           # Custom assertions
    │   ├── constants.rs        # Test constants (pubkeys, RPC URLs)
    │   ├── macros.rs           # Test macros
    │   ├── spl.rs              # SPL token helpers
    │   └── invalid_account_testing.rs
    ├── subs/
    │   ├── mod.rs              # Instruction builder exports
    │   ├── setup.rs            # Program initialization helpers
    │   └── spl_token.rs        # Token operation helpers
    └── test_*.rs               # Test files
```

## Initializing LiteSVM

### Basic Initialization

```rust
use litesvm::LiteSVM;
use solana_pubkey::{pubkey, Pubkey};

// Define program ID - must match exactly with your deployed program
const PROGRAM_ID: Pubkey = pubkey!("YourProgram111111111111111111111111111111111");

fn create_test_svm() -> LiteSVM {
    let mut svm = LiteSVM::new();

    // Method 1: Load from bytes (compile-time inclusion)
    let program_bytes = include_bytes!("../../../target/deploy/my_program.so");
    svm.add_program(my_program_client::MY_PROGRAM_ID, program_bytes);

    svm
}

// Method 2: Load from file path (runtime loading)
fn create_test_svm_from_file() -> LiteSVM {
    let mut svm = LiteSVM::new();
    svm.add_program_from_file(PROGRAM_ID, "target/deploy/my_program.so");
    svm
}
```

**Key Pattern**: Use the exact program ID from your program definition to avoid `ProgramMismatch` errors. The program ID in your test must match what's declared in the program itself.

### With External Programs

```rust
use litesvm::LiteSVM;
use solana_sdk::pubkey::Pubkey;

pub const EXTERNAL_PROGRAM_ID: Pubkey = pubkey!("ExternProgram111111111111111111111111111");

fn lite_svm_with_programs() -> LiteSVM {
    let mut svm = LiteSVM::new();

    // Main program
    let program_bytes = include_bytes!("../../../target/deploy/my_program.so");
    svm.add_program(my_program_client::MY_PROGRAM_ID, program_bytes);

    // External programs from fixtures (dumped via: solana program dump <ID> file.so)
    let external_program = include_bytes!("../../fixtures/external_program.so");
    svm.add_program(EXTERNAL_PROGRAM_ID, external_program);

    // Add more programs as needed
    // let another_program = include_bytes!("../../fixtures/another.so");
    // svm.add_program(ANOTHER_PROGRAM_ID, another_program);

    svm
}
```

## Fixture Preparation (CLI-Based)

Before running LiteSVM tests that depend on mainnet/devnet state, you need to prepare fixture files. This section covers the CLI workflow for dumping programs and accounts to files.

### Prerequisites

```bash
# Ensure Solana CLI is installed and configured
solana --version

# Set cluster (choose one)
solana config set --url mainnet-beta
solana config set --url devnet
solana config set --url https://api.mainnet-beta.solana.com

# Or use -u flag per command
solana account <PUBKEY> -u mainnet-beta
```

### Directory Structure for Fixtures

```
integration_tests/
├── fixtures/
│   ├── programs/           # Compiled program bytecode (.so files)
│   │   ├── token_program.so
│   │   ├── associated_token.so
│   │   └── your_external_dep.so
│   ├── accounts/           # Account state snapshots (.json files)
│   │   ├── usdc_mint.json
│   │   ├── wsol_mint.json
│   │   └── oracle_price_feed.json
│   └── scripts/
│       └── refresh_fixtures.sh
```

### Dumping Programs (.so files)

Programs are deployed as BPF bytecode. Use `solana program dump` to extract:

```bash
# Dump a program to .so file
solana program dump <PROGRAM_ID> fixtures/programs/<name>.so -u mainnet-beta

# Common programs you might need:
# Token Program
solana program dump TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA fixtures/programs/token_program.so -u mainnet-beta

# Token-2022 Program
solana program dump TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb fixtures/programs/token_2022.so -u mainnet-beta

# Associated Token Account Program
solana program dump ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL fixtures/programs/associated_token.so -u mainnet-beta

# Metaplex Token Metadata
solana program dump metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s fixtures/programs/metaplex_metadata.so -u mainnet-beta

# A DeFi protocol (e.g., Raydium AMM)
solana program dump 675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8 fixtures/programs/raydium_amm.so -u mainnet-beta
```

### Dumping Account State (.json files)

```bash
# Dump account to JSON (includes all metadata)
solana account <PUBKEY> --output json -o fixtures/accounts/<name>.json -u mainnet-beta

# Dump with compact JSON (smaller files)
solana account <PUBKEY> --output json-compact -o fixtures/accounts/<name>.json -u mainnet-beta

# Common accounts:
# USDC Mint
solana account EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v --output json -o fixtures/accounts/usdc_mint.json -u mainnet-beta

# Wrapped SOL Mint
solana account So11111111111111111111111111111111111111112 --output json -o fixtures/accounts/wsol_mint.json -u mainnet-beta

# A specific token account or PDA
solana account <YOUR_PDA_ADDRESS> --output json -o fixtures/accounts/my_pda.json -u mainnet-beta
```

### Automation Script

Create a script to refresh all fixtures:

```bash
#!/bin/bash
# fixtures/scripts/refresh_fixtures.sh

set -e
CLUSTER="mainnet-beta"
FIXTURES_DIR="$(dirname "$0")/.."

echo "Refreshing fixtures from $CLUSTER..."

# Create directories
mkdir -p "$FIXTURES_DIR/programs"
mkdir -p "$FIXTURES_DIR/accounts"

# ============ PROGRAMS ============
echo "Dumping programs..."

# Token Program (SPL Token)
solana program dump TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA \
    "$FIXTURES_DIR/programs/token_program.so" -u $CLUSTER

# Token-2022
solana program dump TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb \
    "$FIXTURES_DIR/programs/token_2022.so" -u $CLUSTER

# Associated Token Account
solana program dump ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL \
    "$FIXTURES_DIR/programs/associated_token.so" -u $CLUSTER

# Add your external dependencies here:
# solana program dump <PROGRAM_ID> "$FIXTURES_DIR/programs/<name>.so" -u $CLUSTER

# ============ ACCOUNTS ============
echo "Dumping accounts..."

# USDC Mint
solana account EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v \
    --output json -o "$FIXTURES_DIR/accounts/usdc_mint.json" -u $CLUSTER

# USDT Mint
solana account Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB \
    --output json -o "$FIXTURES_DIR/accounts/usdt_mint.json" -u $CLUSTER

# Wrapped SOL Mint
solana account So11111111111111111111111111111111111111112 \
    --output json -o "$FIXTURES_DIR/accounts/wsol_mint.json" -u $CLUSTER

# Add your specific accounts here:
# solana account <PUBKEY> --output json -o "$FIXTURES_DIR/accounts/<name>.json" -u $CLUSTER

echo "Fixtures refreshed successfully!"
echo "Programs: $(ls -1 $FIXTURES_DIR/programs/*.so 2>/dev/null | wc -l)"
echo "Accounts: $(ls -1 $FIXTURES_DIR/accounts/*.json 2>/dev/null | wc -l)"
```

Make it executable:
```bash
chmod +x fixtures/scripts/refresh_fixtures.sh
./fixtures/scripts/refresh_fixtures.sh
```

### CLI vs RPC Scripting: When to Use Each

There are two approaches to fetching fixtures: using the Solana CLI or making direct JSON-RPC calls.

| Aspect | Solana CLI | Direct RPC Calls |
|--------|------------|------------------|
| **Setup** | Requires Solana CLI installed | Only needs curl/Python/Node |
| **CI/CD** | Need to install CLI in pipeline | Lighter dependencies |
| **Batch operations** | One command per account | Can batch multiple in one request |
| **Program dumps** | Simple one-liner | Complex (must handle programdata) |
| **Output format** | Standard JSON format | Full control over format |
| **Rate limits** | CLI handles retries | Must handle yourself |
| **Error handling** | CLI provides clear errors | Raw RPC errors |

**Use Solana CLI when:**
- Running locally with CLI already installed
- Dumping program bytecode (much simpler)
- You want reliable error messages
- One-off fixture generation

**Use direct RPC calls when:**
- Running in CI/CD without Solana CLI
- Fetching many accounts (batch with `getMultipleAccounts`)
- Need custom output formats
- Integrating into existing Python/Node tooling
- Want minimal dependencies

### Using JSON-RPC Directly in Scripts

You can fetch account state directly via Solana's JSON-RPC API without the CLI. This is useful for CI/CD pipelines or when you need more control.

#### Bash + curl

```bash
#!/bin/bash
# fetch_account.sh - Fetch account via RPC and save as JSON

RPC_URL="https://api.mainnet-beta.solana.com"
PUBKEY="EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"  # USDC Mint
OUTPUT_FILE="fixtures/accounts/usdc_mint.json"

# Fetch account using getAccountInfo RPC method
curl -s "$RPC_URL" \
  -X POST \
  -H "Content-Type: application/json" \
  -d "{
    \"jsonrpc\": \"2.0\",
    \"id\": 1,
    \"method\": \"getAccountInfo\",
    \"params\": [
      \"$PUBKEY\",
      {\"encoding\": \"base64\"}
    ]
  }" | jq '.result.value' > "$OUTPUT_FILE"

echo "Saved account to $OUTPUT_FILE"
```

#### Bash Script for Multiple Accounts

```bash
#!/bin/bash
# fetch_multiple_accounts.sh

RPC_URL="https://api.mainnet-beta.solana.com"
FIXTURES_DIR="./fixtures/accounts"
mkdir -p "$FIXTURES_DIR"

# Define accounts to fetch: "pubkey:filename"
ACCOUNTS=(
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v:usdc_mint"
  "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB:usdt_mint"
  "So11111111111111111111111111111111111111112:wsol_mint"
)

fetch_account() {
  local pubkey=$1
  local name=$2

  echo "Fetching $name ($pubkey)..."

  response=$(curl -s "$RPC_URL" \
    -X POST \
    -H "Content-Type: application/json" \
    -d "{
      \"jsonrpc\": \"2.0\",
      \"id\": 1,
      \"method\": \"getAccountInfo\",
      \"params\": [\"$pubkey\", {\"encoding\": \"base64\"}]
    }")

  # Extract and format for Solana CLI compatibility
  echo "$response" | jq '{
    pubkey: "'$pubkey'",
    account: {
      lamports: .result.value.lamports,
      data: [.result.value.data[0], .result.value.data[1]],
      owner: .result.value.owner,
      executable: .result.value.executable,
      rentEpoch: .result.value.rentEpoch
    }
  }' > "$FIXTURES_DIR/${name}.json"
}

for entry in "${ACCOUNTS[@]}"; do
  IFS=':' read -r pubkey name <<< "$entry"
  fetch_account "$pubkey" "$name"
done

echo "Done! Fetched ${#ACCOUNTS[@]} accounts."
```

#### Fetch Multiple Accounts in One RPC Call

More efficient for many accounts:

```bash
#!/bin/bash
# fetch_batch.sh - Fetch multiple accounts in single RPC call

RPC_URL="https://api.mainnet-beta.solana.com"

# Array of pubkeys
PUBKEYS='[
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
  "So11111111111111111111111111111111111111112"
]'

curl -s "$RPC_URL" \
  -X POST \
  -H "Content-Type: application/json" \
  -d "{
    \"jsonrpc\": \"2.0\",
    \"id\": 1,
    \"method\": \"getMultipleAccounts\",
    \"params\": [$PUBKEYS, {\"encoding\": \"base64\"}]
  }" | jq '.result.value'
```

#### Python Script (More Readable for Complex Operations)

```python
#!/usr/bin/env python3
# fetch_fixtures.py

import json
import requests
from pathlib import Path

RPC_URL = "https://api.mainnet-beta.solana.com"
FIXTURES_DIR = Path("./fixtures/accounts")
FIXTURES_DIR.mkdir(parents=True, exist_ok=True)

# Accounts to fetch
ACCOUNTS = {
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v": "usdc_mint",
    "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB": "usdt_mint",
    "So11111111111111111111111111111111111111112": "wsol_mint",
}

def fetch_account(pubkey: str) -> dict:
    """Fetch single account via RPC."""
    response = requests.post(RPC_URL, json={
        "jsonrpc": "2.0",
        "id": 1,
        "method": "getAccountInfo",
        "params": [pubkey, {"encoding": "base64"}]
    })
    return response.json()["result"]["value"]

def fetch_multiple_accounts(pubkeys: list[str]) -> list[dict]:
    """Fetch multiple accounts in single RPC call."""
    response = requests.post(RPC_URL, json={
        "jsonrpc": "2.0",
        "id": 1,
        "method": "getMultipleAccounts",
        "params": [pubkeys, {"encoding": "base64"}]
    })
    return response.json()["result"]["value"]

def fetch_program_accounts(program_id: str, filters: list = None) -> list[tuple[str, dict]]:
    """Fetch all accounts owned by a program."""
    params = [program_id, {"encoding": "base64"}]
    if filters:
        params[1]["filters"] = filters

    response = requests.post(RPC_URL, json={
        "jsonrpc": "2.0",
        "id": 1,
        "method": "getProgramAccounts",
        "params": params
    })

    results = response.json()["result"]
    return [(item["pubkey"], item["account"]) for item in results]

def save_account(pubkey: str, account: dict, filename: str):
    """Save account in Solana CLI-compatible format."""
    output = {
        "pubkey": pubkey,
        "account": {
            "lamports": account["lamports"],
            "data": account["data"],
            "owner": account["owner"],
            "executable": account["executable"],
            "rentEpoch": account["rentEpoch"]
        }
    }

    filepath = FIXTURES_DIR / f"{filename}.json"
    with open(filepath, "w") as f:
        json.dump(output, f, indent=2)
    print(f"Saved {filepath}")

if __name__ == "__main__":
    # Fetch all accounts in batch (more efficient)
    pubkeys = list(ACCOUNTS.keys())
    accounts = fetch_multiple_accounts(pubkeys)

    for pubkey, account in zip(pubkeys, accounts):
        if account:
            save_account(pubkey, account, ACCOUNTS[pubkey])
        else:
            print(f"Warning: Account {pubkey} not found")

    # Example: Fetch all accounts for a specific program with filters
    # This fetches all token accounts for a specific mint
    # token_accounts = fetch_program_accounts(
    #     "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    #     filters=[
    #         {"dataSize": 165},  # Token account size
    #         {"memcmp": {"offset": 0, "bytes": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"}}  # Mint
    #     ]
    # )
```

#### Fetching Program Bytecode via RPC

Programs are trickier - they're stored in a separate programdata account:

```python
#!/usr/bin/env python3
# fetch_program.py

import requests
import base64
import struct
from pathlib import Path

RPC_URL = "https://api.mainnet-beta.solana.com"

def fetch_program_bytecode(program_id: str, output_path: str):
    """
    Fetch program bytecode via RPC.

    For upgradeable programs, we need to:
    1. Fetch the program account to get the programdata address
    2. Fetch the programdata account which contains the actual bytecode
    """
    # Step 1: Get program account
    response = requests.post(RPC_URL, json={
        "jsonrpc": "2.0",
        "id": 1,
        "method": "getAccountInfo",
        "params": [program_id, {"encoding": "base64"}]
    })

    program_account = response.json()["result"]["value"]
    program_data = base64.b64decode(program_account["data"][0])

    # Check if it's an upgradeable program (owner is BPFLoaderUpgradeable)
    if program_account["owner"] == "BPFLoaderUpgradeab1e11111111111111111111111":
        # Parse UpgradeableLoaderState::Program to get programdata address
        # Format: 4 bytes (variant) + 32 bytes (programdata pubkey)
        programdata_pubkey = base64.b58encode(program_data[4:36]).decode()

        # Step 2: Fetch programdata account
        response = requests.post(RPC_URL, json={
            "jsonrpc": "2.0",
            "id": 1,
            "method": "getAccountInfo",
            "params": [programdata_pubkey, {"encoding": "base64"}]
        })

        programdata_account = response.json()["result"]["value"]
        programdata = base64.b64decode(programdata_account["data"][0])

        # Skip the UpgradeableLoaderState::ProgramData header (45 bytes)
        # Format: 4 bytes (variant) + 8 bytes (slot) + 1 byte (option) + 32 bytes (authority)
        bytecode = programdata[45:]
    else:
        # Non-upgradeable program - bytecode is directly in account data
        bytecode = program_data

    # Write to .so file
    Path(output_path).write_bytes(bytecode)
    print(f"Saved {len(bytecode)} bytes to {output_path}")

# Usage
fetch_program_bytecode(
    "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    "./fixtures/programs/token_program.so"
)
```

#### Node.js / TypeScript Alternative

```typescript
// fetch_fixtures.ts
import * as fs from 'fs';
import * as path from 'path';

const RPC_URL = 'https://api.mainnet-beta.solana.com';

interface AccountInfo {
  lamports: number;
  data: [string, string];
  owner: string;
  executable: boolean;
  rentEpoch: number;
}

async function fetchAccount(pubkey: string): Promise<AccountInfo | null> {
  const response = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getAccountInfo',
      params: [pubkey, { encoding: 'base64' }],
    }),
  });

  const result = await response.json();
  return result.result?.value ?? null;
}

async function fetchMultipleAccounts(pubkeys: string[]): Promise<(AccountInfo | null)[]> {
  const response = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getMultipleAccounts',
      params: [pubkeys, { encoding: 'base64' }],
    }),
  });

  const result = await response.json();
  return result.result?.value ?? [];
}

async function main() {
  const accounts: Record<string, string> = {
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'usdc_mint',
    'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 'usdt_mint',
  };

  const pubkeys = Object.keys(accounts);
  const results = await fetchMultipleAccounts(pubkeys);

  const fixturesDir = './fixtures/accounts';
  fs.mkdirSync(fixturesDir, { recursive: true });

  pubkeys.forEach((pubkey, i) => {
    const account = results[i];
    if (account) {
      const output = { pubkey, account };
      const filename = path.join(fixturesDir, `${accounts[pubkey]}.json`);
      fs.writeFileSync(filename, JSON.stringify(output, null, 2));
      console.log(`Saved ${filename}`);
    }
  });
}

main();
```

### Understanding What to Clone

**For testing against a DeFi protocol:**
1. The protocol's program (.so)
2. Protocol state accounts (config PDAs, pools, vaults)
3. Token mints the protocol uses
4. Any oracle accounts it reads from

**For testing token operations:**
1. Token Program or Token-2022 (.so)
2. Associated Token Account Program (.so)
3. The mint account(s) you're testing with
4. Any existing token accounts you need

**For testing with oracles:**
1. The oracle program (.so) - e.g., Pyth, Switchboard
2. Price feed accounts (these change frequently - consider runtime cloning)

### When to Use Each Approach

There are three main approaches to getting mainnet/devnet state into LiteSVM:

| Approach | Best For | Trade-offs |
|----------|----------|------------|
| **CLI Fixtures** (`solana program dump`, `solana account`) | Programs, simple local setup | Requires Solana CLI installed |
| **RPC Script Fixtures** (curl/Python/Node) | CI/CD, batch fetching, custom formats | More code, but fewer dependencies |
| **Runtime Cloning** (in Rust tests) | Dynamic state, price feeds, latest data | Tests require network access |
| **Hybrid** | Most real-world scenarios | Programs from fixtures, dynamic state from RPC |

**Recommended approach for most projects:**
1. **Programs**: Use CLI (`solana program dump`) - it's simple and programs rarely change
2. **Stable accounts** (mints, configs): Use fixtures (CLI or RPC scripts) - deterministic tests
3. **Dynamic accounts** (oracles, pools): Clone at runtime - always current data

See [CLI vs RPC Scripting](#cli-vs-rpc-scripting-when-to-use-each) above for detailed comparison of fixture generation methods.

### Loading Fixtures in Tests

After preparing fixtures, load them in your tests:

```rust
use litesvm::LiteSVM;

fn setup_svm_with_fixtures() -> LiteSVM {
    let mut svm = LiteSVM::new();

    // Load programs from .so files
    let token_program = include_bytes!("../../fixtures/programs/token_program.so");
    svm.add_program(spl_token::ID, token_program);

    let ata_program = include_bytes!("../../fixtures/programs/associated_token.so");
    svm.add_program(spl_associated_token_account::ID, ata_program);

    // Load accounts from JSON files
    let usdc_mint = load_account_from_json("./fixtures/accounts/usdc_mint.json");
    svm.set_account(USDC_MINT, usdc_mint).unwrap();

    svm
}
```

### Gitignore Considerations

```gitignore
# Option 1: Ignore fixtures (regenerate locally)
fixtures/programs/
fixtures/accounts/

# Option 2: Track fixtures (reproducible builds)
# Don't ignore - commit the fixtures

# Option 3: Track programs, ignore dynamic accounts
fixtures/accounts/*.json
!fixtures/accounts/.gitkeep
```

### Verifying Fixtures

Check your dumped files are valid:

```bash
# Check program file size (should be > 0)
ls -la fixtures/programs/

# Verify JSON structure
cat fixtures/accounts/usdc_mint.json | jq '.account.owner'

# Test loading in Rust (quick sanity check)
cargo test test_fixtures_load --no-fail-fast
```

## Cloning from Mainnet/Devnet (Runtime)

For dynamic data or when you need the latest state, clone at runtime.

### RPC Endpoints

```rust
// Public endpoints (rate-limited, suitable for testing)
pub const MAINNET_RPC: &str = "https://api.mainnet-beta.solana.com";
pub const DEVNET_RPC: &str = "https://api.devnet.solana.com";

// For production tests, use a dedicated RPC provider:
// - Helius: https://mainnet.helius-rpc.com/?api-key=<KEY>
// - QuickNode: https://your-endpoint.quiknode.pro/<KEY>
// - Triton: https://your-pool.triton.one/<KEY>
```

### Programmatic Cloning with RpcClient

Clone accounts directly from mainnet at runtime using `solana-client`:

```toml
# Add to Cargo.toml
solana-client = "2.1.13"
```

```rust
use solana_client::rpc_client::RpcClient;
use solana_sdk::{account::Account, commitment_config::CommitmentConfig, pubkey::Pubkey};

/// Clone a single account from mainnet/devnet
pub fn clone_account_from_rpc(
    rpc_url: &str,
    pubkey: &Pubkey,
) -> Result<Account, Box<dyn std::error::Error>> {
    let client = RpcClient::new_with_commitment(
        rpc_url.to_string(),
        CommitmentConfig::confirmed(),
    );
    let account = client.get_account(pubkey)?;
    Ok(account)
}

/// Clone multiple accounts in a single RPC call (more efficient)
pub fn clone_accounts_from_rpc(
    rpc_url: &str,
    pubkeys: &[Pubkey],
) -> Result<Vec<Option<Account>>, Box<dyn std::error::Error>> {
    let client = RpcClient::new_with_commitment(
        rpc_url.to_string(),
        CommitmentConfig::confirmed(),
    );
    let accounts = client.get_multiple_accounts(pubkeys)?;
    Ok(accounts)
}

// Usage
const MAINNET_RPC: &str = "https://api.mainnet-beta.solana.com";
const USDC_MINT: Pubkey = pubkey!("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

let usdc_mint_account = clone_account_from_rpc(MAINNET_RPC, &USDC_MINT)?;
svm.set_account(USDC_MINT, usdc_mint_account)?;
```

### Cloning Programs from Mainnet

Programs require cloning both the program account and its data account:

```rust
use solana_sdk::bpf_loader_upgradeable::{self, UpgradeableLoaderState};

/// Clone a BPF upgradeable program from mainnet
pub fn clone_program_from_rpc(
    svm: &mut LiteSVM,
    rpc_url: &str,
    program_id: &Pubkey,
) -> Result<(), Box<dyn std::error::Error>> {
    let client = RpcClient::new(rpc_url.to_string());

    // Get the program account
    let program_account = client.get_account(program_id)?;

    // Parse to find the programdata address
    if let UpgradeableLoaderState::Program { programdata_address } =
        bincode::deserialize(&program_account.data)?
    {
        // Clone the programdata account (contains the actual bytecode)
        let programdata_account = client.get_account(&programdata_address)?;

        // Set both accounts in LiteSVM
        svm.set_account(*program_id, program_account)?;
        svm.set_account(programdata_address, programdata_account)?;
    }

    Ok(())
}

// Usage - clone Drift program
const DRIFT_PROGRAM_ID: Pubkey = pubkey!("dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH");
clone_program_from_rpc(&mut svm, MAINNET_RPC, &DRIFT_PROGRAM_ID)?;
```

### Cloning All Accounts for a Program

```rust
use solana_client::rpc_filter::{RpcFilterType, Memcmp};
use solana_client::rpc_config::{RpcAccountInfoConfig, RpcProgramAccountsConfig};
use solana_account_decoder::UiAccountEncoding;

/// Clone all accounts owned by a program
pub fn clone_program_accounts(
    svm: &mut LiteSVM,
    rpc_url: &str,
    program_id: &Pubkey,
    filters: Option<Vec<RpcFilterType>>,
) -> Result<usize, Box<dyn std::error::Error>> {
    let client = RpcClient::new(rpc_url.to_string());

    let config = RpcProgramAccountsConfig {
        filters,
        account_config: RpcAccountInfoConfig {
            encoding: Some(UiAccountEncoding::Base64),
            ..Default::default()
        },
        ..Default::default()
    };

    let accounts = client.get_program_accounts_with_config(program_id, config)?;

    for (pubkey, account) in &accounts {
        svm.set_account(*pubkey, account.clone())?;
    }

    Ok(accounts.len())
}

// Clone accounts with discriminator filter
let filters = vec![
    RpcFilterType::Memcmp(Memcmp::new_raw_bytes(0, vec![1])), // discriminator = 1
];
let count = clone_program_accounts(&mut svm, MAINNET_RPC, &MY_PROGRAM_ID, Some(filters))?;
```

### Caching Cloned Accounts

For faster test runs, cache cloned accounts to disk:

```rust
use std::collections::HashMap;
use std::fs;
use std::path::Path;

pub struct AccountCache {
    cache_dir: String,
}

impl AccountCache {
    pub fn new(cache_dir: &str) -> Self {
        fs::create_dir_all(cache_dir).ok();
        Self { cache_dir: cache_dir.to_string() }
    }

    pub fn get_or_fetch(
        &self,
        rpc_url: &str,
        pubkey: &Pubkey,
    ) -> Result<Account, Box<dyn std::error::Error>> {
        let cache_path = format!("{}/{}.bin", self.cache_dir, pubkey);

        if Path::new(&cache_path).exists() {
            let data = fs::read(&cache_path)?;
            return Ok(bincode::deserialize(&data)?);
        }

        let client = RpcClient::new(rpc_url.to_string());
        let account = client.get_account(pubkey)?;

        fs::write(&cache_path, bincode::serialize(&account)?)?;
        Ok(account)
    }
}

// Usage
let cache = AccountCache::new("./fixtures/cache");
let usdc_mint = cache.get_or_fetch(MAINNET_RPC, &USDC_MINT)?;
svm.set_account(USDC_MINT, usdc_mint)?;
```

## Loading Accounts from Fixtures

Once you've prepared your fixtures (see [Fixture Preparation](#fixture-preparation-cli-based) above), load them into LiteSVM.

### From JSON Fixtures

Load accounts exported via `solana account --output json`:

```rust
use base64;
use serde_json::Value;
use solana_sdk::account::Account;
use solana_sdk::pubkey::Pubkey;
use std::{fs, str::FromStr};

/// Load account from JSON file (Solana CLI format)
pub fn load_account_from_json(path: &str) -> Account {
    let json_data = fs::read_to_string(path).expect("Unable to read JSON file");
    let v: Value = serde_json::from_str(&json_data).expect("Unable to parse JSON");

    let lamports = v["account"]["lamports"].as_u64().unwrap();
    let base64_data = v["account"]["data"][0].as_str().unwrap();
    let data = base64::decode(base64_data).unwrap();
    let owner = Pubkey::from_str(v["account"]["owner"].as_str().unwrap()).unwrap();
    let executable = v["account"]["executable"].as_bool().unwrap();
    let rent_epoch = v["account"]["rentEpoch"].as_u64().unwrap();

    Account {
        lamports,
        data,
        owner,
        executable,
        rent_epoch,
    }
}

// Usage
let usdc_mint = load_account_from_json("./fixtures/usdc_mint.json");
svm.set_account(USDC_MINT_PUBKEY, usdc_mint).unwrap();
```

### Creating Accounts Programmatically

```rust
use solana_sdk::account::Account;

// Empty account with lamports
let account = Account {
    lamports: 1_000_000_000,  // 1 SOL
    data: vec![],
    owner: solana_sdk::system_program::ID,
    executable: false,
    rent_epoch: 0,
};
svm.set_account(pubkey, account).unwrap();
```

### Modifying Existing Accounts

```rust
// Get, modify, set pattern
let mut account = svm.get_account(&pubkey).unwrap();
account.lamports += 1_000_000;
account.data[0..8].copy_from_slice(&new_discriminator);
svm.set_account(pubkey, account).unwrap();
```

## Airdropping SOL

```rust
use litesvm::LiteSVM;
use solana_sdk::pubkey::Pubkey;

pub fn airdrop_lamports(
    svm: &mut LiteSVM,
    recipient: &Pubkey,
    lamports: u64,
) -> Result<(), Box<dyn std::error::Error>> {
    svm.airdrop(recipient, lamports)?;
    Ok(())
}

// Usage
let authority = Keypair::new();
airdrop_lamports(&mut svm, &authority.pubkey(), 10_000_000_000)?;  // 10 SOL
```

## Sending Transactions

### Basic Transaction

```rust
use solana_sdk::{
    signature::Keypair,
    signer::Signer,
    transaction::Transaction,
};

let payer = Keypair::new();
airdrop_lamports(&mut svm, &payer.pubkey(), 1_000_000_000)?;

let instruction = my_program_client::instructions::MyInstructionBuilder::new()
    .arg1(value)
    .account1(pubkey1)
    .account2(pubkey2)
    .instruction();

let tx = Transaction::new_signed_with_payer(
    &[instruction],
    Some(&payer.pubkey()),
    &[&payer],
    svm.latest_blockhash(),
);

let result = svm.send_transaction(tx);
assert!(result.is_ok(), "Transaction failed: {:?}", result);
```

### Multiple Instructions

```rust
let instructions = vec![
    compute_budget_instruction,  // Optional: increase CU limit
    create_account_instruction,
    initialize_instruction,
];

let tx = Transaction::new_signed_with_payer(
    &instructions,
    Some(&payer.pubkey()),
    &[&payer, &new_account_keypair],
    svm.latest_blockhash(),
);
```

### With Compute Budget

```rust
use solana_sdk::compute_budget::ComputeBudgetInstruction;

let cu_ix = ComputeBudgetInstruction::set_compute_unit_limit(1_400_000);

let tx = Transaction::new_signed_with_payer(
    &[cu_ix, main_instruction],
    Some(&payer.pubkey()),
    &[&payer],
    svm.latest_blockhash(),
);
```

### Transaction Simulation

Pre-test transactions before execution to catch errors early:

```rust
let tx = Transaction::new_signed_with_payer(
    &[instruction],
    Some(&payer.pubkey()),
    &[&payer],
    svm.latest_blockhash(),
);

// Simulate first - doesn't modify state
let simulated_result = svm.simulate_transaction(tx.clone());
match &simulated_result {
    Ok(meta) => {
        println!("Simulation logs: {:?}", meta.logs);
        println!("Would consume {} CUs", meta.compute_units_consumed);
    }
    Err(failed) => {
        println!("Simulation failed: {:?}", failed.err);
        println!("Logs: {:?}", failed.meta.logs);
    }
}

// If simulation passes, execute for real
if simulated_result.is_ok() {
    let result = svm.send_transaction(tx);
    // Process actual result...
}
```

## Handling Transaction Results

### Success Case

```rust
let result = svm.send_transaction(tx);

match result {
    Ok(meta) => {
        println!("Transaction succeeded!");
        println!("Logs: {:?}", meta.logs);
        println!("CU consumed: {:?}", meta.compute_units_consumed);

        // Access inner instructions (for CPI events)
        for (ix_idx, inner_ixs) in meta.inner_instructions.iter().enumerate() {
            for inner_ix in inner_ixs {
                // Process inner instruction
            }
        }
    }
    Err(failed_meta) => {
        println!("Transaction failed: {:?}", failed_meta.err);
        println!("Logs: {:?}", failed_meta.meta.logs);
    }
}
```

### Asserting Errors

```rust
use litesvm::types::{FailedTransactionMetadata, TransactionResult};
use solana_sdk::instruction::InstructionError;
use solana_sdk::transaction::TransactionError;

/// Assert transaction failed with specific custom program error
pub fn assert_custom_error(
    res: &TransactionResult,
    ix_idx: u8,
    expected_err: MyProgramErrors,
) {
    let expected_code = expected_err as u32;
    assert!(
        matches!(
            res,
            Err(FailedTransactionMetadata {
                err: TransactionError::InstructionError(i, InstructionError::Custom(c)),
                ..
            }) if *i == ix_idx && *c == expected_code
        ),
        "Expected error {:?}, got {:?}",
        expected_err,
        res
    );
}

/// Assert transaction failed with standard program error
pub fn assert_program_error(
    res: &TransactionResult,
    ix_idx: u8,
    expected_err: InstructionError,
) {
    assert!(
        matches!(
            res,
            Err(FailedTransactionMetadata {
                err: TransactionError::InstructionError(i, e),
                ..
            }) if *i == ix_idx && *e == expected_err
        )
    );
}
```

## Reading Account State

### Deserializing Program Accounts

```rust
use borsh::BorshDeserialize;

pub fn fetch_my_account(
    svm: &LiteSVM,
    pubkey: &Pubkey,
) -> Result<Option<MyAccount>, Box<dyn std::error::Error>> {
    match svm.get_account(pubkey) {
        Some(account) if !account.data.is_empty() => {
            // Skip discriminator byte
            MyAccount::try_from_slice(&account.data[1..])
                .map(Some)
                .map_err(Into::into)
        }
        _ => Ok(None),
    }
}
```

### Token Account Helpers

```rust
use solana_sdk::program_pack::Pack;
use spl_token_2022::extension::StateWithExtensions;
use spl_token_2022::state::{Account as TokenAccount, Mint};

/// Unpack token account (works for both Token and Token2022)
pub fn unpack_token_account(account: &Account) -> Result<TokenAccount, String> {
    if account.owner == spl_token_2022::ID {
        StateWithExtensions::unpack(&account.data)
            .map(|a| a.base)
            .map_err(|e| format!("Failed to unpack: {:?}", e))
    } else {
        TokenAccount::unpack(&account.data)
            .map_err(|e| format!("Failed to unpack: {:?}", e))
    }
}

/// Get token balance, returning 0 if account doesn't exist
pub fn get_token_balance_or_zero(svm: &LiteSVM, token_account: &Pubkey) -> u64 {
    svm.get_account(token_account)
        .and_then(|acc| unpack_token_account(&acc).ok())
        .map(|ta| ta.amount)
        .unwrap_or(0)
}
```

## Token Operations

### Initialize Mint

```rust
pub fn initialize_mint(
    svm: &mut LiteSVM,
    payer: &Keypair,
    mint_authority: &Pubkey,
    freeze_authority: Option<&Pubkey>,
    decimals: u8,
    token_program: &Pubkey,
) -> Result<Pubkey, Box<dyn std::error::Error>> {
    let mint_kp = Keypair::new();

    let space = Mint::LEN;
    let rent = svm.minimum_balance_for_rent_exemption(space);

    let create_ix = system_instruction::create_account(
        &payer.pubkey(),
        &mint_kp.pubkey(),
        rent,
        space as u64,
        token_program,
    );

    let init_ix = spl_token_2022::instruction::initialize_mint2(
        token_program,
        &mint_kp.pubkey(),
        mint_authority,
        freeze_authority,
        decimals,
    )?;

    let tx = Transaction::new_signed_with_payer(
        &[create_ix, init_ix],
        Some(&payer.pubkey()),
        &[payer, &mint_kp],
        svm.latest_blockhash(),
    );

    svm.send_transaction(tx)?;
    Ok(mint_kp.pubkey())
}
```

### Initialize ATA and Mint Tokens

```rust
use spl_associated_token_account_client::{
    address::get_associated_token_address_with_program_id,
    instruction::create_associated_token_account_idempotent,
};

pub fn mint_tokens(
    svm: &mut LiteSVM,
    payer: &Keypair,
    mint_authority: &Keypair,
    mint: &Pubkey,
    recipient: &Pubkey,
    amount: u64,
) -> Result<Pubkey, Box<dyn std::error::Error>> {
    let token_program = svm.get_account(mint).unwrap().owner;
    let ata = get_associated_token_address_with_program_id(recipient, mint, &token_program);

    let create_ata_ix = create_associated_token_account_idempotent(
        &payer.pubkey(),
        recipient,
        mint,
        &token_program,
    );

    let mint_ix = spl_token_2022::instruction::mint_to(
        &token_program,
        mint,
        &ata,
        &mint_authority.pubkey(),
        &[],
        amount,
    )?;

    let tx = Transaction::new_signed_with_payer(
        &[create_ata_ix, mint_ix],
        Some(&payer.pubkey()),
        &[payer, mint_authority],
        svm.latest_blockhash(),
    );

    svm.send_transaction(tx)?;
    Ok(ata)
}
```

### Direct Token Balance Manipulation

For testing edge cases, directly modify token balances:

```rust
pub fn set_token_balance(
    svm: &mut LiteSVM,
    token_account: &Pubkey,
    amount: u64,
) -> Result<(), Box<dyn std::error::Error>> {
    let mut account = svm.get_account(token_account).unwrap();

    // Amount is at offset 64 (after mint + owner)
    const AMOUNT_OFFSET: usize = 64;
    account.data[AMOUNT_OFFSET..AMOUNT_OFFSET + 8]
        .copy_from_slice(&amount.to_le_bytes());

    svm.set_account(*token_account, account)?;
    Ok(())
}
```

## Test Context Pattern

### Reusable Test Setup

```rust
pub struct TestContext {
    pub svm: LiteSVM,
    pub authority: Keypair,
    pub config_pda: Pubkey,
    pub mint: Pubkey,
    // Add other common state for your program
}

pub fn setup_test_context() -> Result<TestContext, Box<dyn std::error::Error>> {
    let mut svm = lite_svm_with_programs();
    let authority = Keypair::new();

    airdrop_lamports(&mut svm, &authority.pubkey(), 10_000_000_000)?;

    // Initialize your program's state
    let config_pda = initialize_config(&mut svm, &authority)?;

    // Set up test token
    let mint = initialize_mint(&mut svm, &authority, &authority.pubkey(), None, 6, &spl_token::ID)?;

    Ok(TestContext {
        svm,
        authority,
        config_pda,
        mint,
    })
}
```

### Using Test Context

```rust
#[test]
fn test_my_feature() -> Result<(), Box<dyn std::error::Error>> {
    let TestContext {
        mut svm,
        authority,
        config_pda,
        mint,
    } = setup_test_context()?;

    // Test logic here

    Ok(())
}
```

## Testing Invalid Accounts

### Invalid Account Test Builder

```rust
#[derive(Debug, Clone)]
pub enum InvalidAccountType {
    InvalidOwner,
    InvalidProgramId,
    AccountNotFound,
    InvalidData,
    Uninitialized,
    InvalidPubkey,
}

pub struct InvalidAccountTestBuilder<'a> {
    svm: LiteSVM,
    payer: Pubkey,
    signers: Vec<Box<&'a dyn Signer>>,
    valid_instruction: Instruction,
    // ... test configs
}

impl<'a> InvalidAccountTestBuilder<'a> {
    pub fn new(...) -> Self { ... }

    pub fn with_invalid_owner(self, account_index: usize, expected_error: InstructionError, description: &str) -> Self { ... }
    pub fn with_invalid_program_id(self, ...) -> Self { ... }
    pub fn with_invalid_pubkey(self, ...) -> Self { ... }

    pub fn run_tests(self) -> Result<(), Box<dyn std::error::Error>> { ... }
}
```

### Invalid Account Test Macro

```rust
#[macro_export]
macro_rules! test_invalid_accounts {
    (
        $svm:expr,
        $payer:expr,
        $signers:expr,
        $instruction:expr,
        {
            $($account_index:literal => $invalid_type:ident($expected_error:expr, $description:expr)),*
            $(,)?
        }
    ) => { ... };
}

// Usage
test_invalid_accounts!(
    svm.clone(),
    payer.pubkey(),
    signers,
    instruction,
    {
        0 => invalid_owner(InstructionError::InvalidAccountOwner, "Config: invalid owner"),
        1 => invalid_owner(InstructionError::InvalidAccountOwner, "User account: invalid owner"),
        2 => invalid_program_id(InstructionError::IncorrectProgramId, "Token program: invalid ID"),
    }
);
```

## Verifying Events (Inner Instructions)

For programs that emit events via self-CPI (calling back into own program with event data):

```rust
#[macro_export]
macro_rules! assert_contains_event {
    ($tx_meta:expr, $account_keys:expr, $expected_event:expr) => {
        use borsh::BorshDeserialize;

        let mut found = false;

        for ix in $tx_meta.inner_instructions.iter() {
            for inner_ix in ix.iter() {
                // Check if it's our program's EmitEvent instruction
                if MY_PROGRAM_ID.eq(inner_ix.instruction.program_id(&$account_keys))
                    && inner_ix.instruction.data[0] == EMIT_EVENT_DISCRIMINATOR
                {
                    // Skip discriminator and any prefix bytes to get event data
                    // Adjust offset based on your event format
                    let event_data = &inner_ix.instruction.data[1..];
                    if let Ok(event) = MyProgramEvent::try_from_slice(event_data) {
                        if event == $expected_event {
                            found = true;
                            break;
                        }
                    }
                }
            }
            if found { break; }
        }

        assert!(found, "Expected event not found: {:?}", $expected_event);
    };
}
```

## Parameterized Tests with test-case

```rust
use test_case::test_case;

#[test_case(true, false, false ; "Only permission A")]
#[test_case(false, true, false ; "Only permission B")]
#[test_case(false, false, true ; "Only permission C")]
#[test_case(true, true, true ; "All permissions")]
fn test_permission_combinations(
    perm_a: bool,
    perm_b: bool,
    perm_c: bool,
) -> Result<(), Box<dyn std::error::Error>> {
    let ctx = setup_test_context()?;
    // Test with different permission combinations
    Ok(())
}
```

## Advanced Runtime Configuration

LiteSVM provides extensive runtime configuration options for testing specific scenarios.

### Sysvar Manipulation

Modify clock and slot values for time-dependent testing:

```rust
use solana_sdk::clock::Clock;

// Get and modify the clock sysvar
let mut new_clock = svm.get_sysvar::<Clock>();
new_clock.unix_timestamp = 1735689600;  // Set specific timestamp
new_clock.slot = 1000;
svm.set_sysvar::<Clock>(&new_clock);

// Warp to a specific slot (updates clock.slot)
svm.warp_to_slot(500);

// Expire current blockhash (required between transactions in same test)
svm.expire_blockhash();
```

### Account & Protocol Inspection

Query execution state for verification:

```rust
// Get account data
let account = svm.get_account(&pubkey);
let balance = svm.get_balance(&pubkey);

// Get compute budget info
let compute_budget = svm.get_compute_budget();
```

### Runtime Behavior Configuration

Configure how the SVM processes transactions:

```rust
use solana_sdk::compute_budget::ComputeBudget;
use solana_sdk::feature_set::FeatureSet;

// Configure compute budget
let mut compute_budget = ComputeBudget::default();
compute_budget.compute_unit_limit = 2_000_000;
svm.with_compute_budget(compute_budget);

// Enable/disable signature verification (default: disabled for speed)
svm.with_sigverify(true);

// Enable/disable blockhash validation
svm.with_blockhash_check(true);

// Enable sysvars (Clock, Rent, etc.)
svm.with_sysvars();

// Configure feature set for testing specific Solana features
svm.with_feature_set(FeatureSet::default());
```

### Creating SPL Token Accounts with Pack Trait

For precise control over token account state, use the SPL Pack trait:

```rust
use spl_token::{ID as TOKEN_PROGRAM_ID, state::{Mint, Account as TokenAccount}};
use solana_program_pack::Pack;

// Create a mint account
let mint_data = Mint {
    mint_authority: COption::Some(authority),
    supply: 1_000_000_000,
    decimals: 6,
    is_initialized: true,
    freeze_authority: COption::None,
};
let mut mint_account_data = vec![0; Mint::LEN];
Mint::pack(mint_data, &mut mint_account_data).unwrap();

let mint_lamports = svm.minimum_balance_for_rent_exemption(Mint::LEN);
svm.set_account(
    mint_pubkey,
    Account {
        lamports: mint_lamports,
        data: mint_account_data,
        owner: TOKEN_PROGRAM_ID,
        executable: false,
        rent_epoch: 0,
    },
)?;

// Create a token account
let token_account_data = TokenAccount {
    mint: mint_pubkey,
    owner: user_pubkey,
    amount: 500_000_000,
    delegate: COption::None,
    state: AccountState::Initialized,
    is_native: COption::None,
    delegated_amount: 0,
    close_authority: COption::None,
};
let mut token_account_bytes = vec![0; TokenAccount::LEN];
TokenAccount::pack(token_account_data, &mut token_account_bytes).unwrap();

let token_lamports = svm.minimum_balance_for_rent_exemption(TokenAccount::LEN);
svm.set_account(
    token_account_pubkey,
    Account {
        lamports: token_lamports,
        data: token_account_bytes,
        owner: TOKEN_PROGRAM_ID,
        executable: false,
        rent_epoch: 0,
    },
)?;
```

## Best Practices

### Core Principles

1. **Fresh SVM per test** - Don't share LiteSVM instances between tests
2. **Expire blockhash** - Call `svm.expire_blockhash()` between transactions in same test
3. **Verify state before AND after** - Compare state changes
4. **Test both success and failure paths**
5. **Use fixtures for mainnet accounts** - Clone real protocol state
6. **Increase CU for complex transactions**
7. **Check logs on failure** - Transaction metadata includes logs

### Account Setup Best Practices

8. **Rent Testing**: In test environments, set large lamport values (e.g., `100_000_000_000`) and skip detailed rent calculations - these aren't real funds, so focus on testing logic rather than precise balances

9. **Uninitialized Accounts**: Empty accounts for program initialization require no additional setup beyond `Keypair::new()` - LiteSVM handles them correctly

10. **Program ID Matching**: Ensure program IDs match exactly between your program definition and test setup to prevent `ProgramMismatch` errors

### Account Types Reference

**Payer Accounts**: Funded accounts that pay for transactions and account creation
```rust
svm.set_account(
    payer.pubkey(),
    Account {
        lamports: 100_000_000_000,  // Large value for testing
        data: vec![],
        owner: system_program::ID,
        executable: false,
        rent_epoch: 0,
    },
)?;
```

**Uninitialized Accounts**: Empty accounts your program will initialize - just generate a keypair
```rust
let new_account = Keypair::new();
// No set_account needed - LiteSVM treats missing accounts as uninitialized
```

**Program Accounts**: Accounts with custom data owned by your program
```rust
let lamports = svm.minimum_balance_for_rent_exemption(data.len());
svm.set_account(
    account_pubkey,
    Account {
        lamports,
        data,  // Serialized with borsh/bincode
        owner: program_id,
        executable: false,
        rent_epoch: 0,
    },
)?;
```

## Running Tests

```bash
# Build program first
cd program && cargo build-sbf --features test && cd ..

# Run all tests
cargo test

# Run specific test
cargo test test_my_feature

# Run with output
cargo test -- --nocapture

# Run tests in parallel
cargo test -- --test-threads=4
```

## Related Skills

- `/pinocchio-test-integration` - Pinocchio-specific integration test patterns
- `/protocol-math` - Testing math functions
- `/unit-testing` - Unit testing patterns
