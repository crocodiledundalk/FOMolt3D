# Devnet Faucets

Patterns for providing devnet SOL and test tokens to users in development environments.

## Table of Contents

1. [SOL Airdrop](#sol-airdrop)
2. [Faucet UI Component](#faucet-ui-component)
3. [External Faucets](#external-faucets)
4. [Test Token Minting](#test-token-minting)
5. [Best Practices](#best-practices)

---

## SOL Airdrop

### Basic Airdrop Function

```tsx
// lib/airdrop.ts
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

export async function requestAirdrop(
  connection: Connection,
  publicKey: PublicKey,
  amount: number = 1 // SOL
): Promise<string> {
  const signature = await connection.requestAirdrop(
    publicKey,
    amount * LAMPORTS_PER_SOL
  );

  // Wait for confirmation
  const latestBlockhash = await connection.getLatestBlockhash();
  await connection.confirmTransaction({
    signature,
    ...latestBlockhash,
  });

  return signature;
}
```

### Airdrop Hook

```tsx
// hooks/useAirdrop.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { toast } from 'sonner';

interface AirdropResult {
  signature: string;
  amount: number;
}

export function useAirdrop() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (amount: number = 1): Promise<AirdropResult> => {
      if (!publicKey) {
        throw new Error('Wallet not connected');
      }

      try {
        const signature = await connection.requestAirdrop(
          publicKey,
          amount * LAMPORTS_PER_SOL
        );

        const latestBlockhash = await connection.getLatestBlockhash();
        await connection.confirmTransaction({
          signature,
          ...latestBlockhash,
        });

        return { signature, amount };
      } catch (error: any) {
        // Handle rate limiting
        if (error.message?.includes('429') || error.message?.includes('rate')) {
          throw new Error('Airdrop rate limited. Try the web faucet instead.');
        }
        throw error;
      }
    },
    onSuccess: ({ amount }) => {
      toast.success(`Received ${amount} SOL`);

      // Refresh balance
      queryClient.invalidateQueries({
        queryKey: ['solBalance', publicKey?.toBase58()],
      });
    },
    onError: (error: Error) => {
      if (error.message.includes('rate')) {
        toast.error('Airdrop rate limited', {
          description: 'Please use the web faucet',
          action: {
            label: 'Open Faucet',
            onClick: () => window.open('https://faucet.solana.com', '_blank'),
          },
        });
      } else {
        toast.error(`Airdrop failed: ${error.message}`);
      }
    },
  });
}
```

---

## Faucet UI Component

### Complete Faucet Component

```tsx
// components/Faucet.tsx
import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useAirdrop } from '@/hooks/useAirdrop';
import { useSolBalance } from '@/hooks/useSolBalance';
import { useNetwork } from '@/contexts/NetworkContext';

const AIRDROP_AMOUNTS = [0.5, 1, 2];

export function Faucet() {
  const { publicKey } = useWallet();
  const { isDevnet } = useNetwork();
  const { data: balance } = useSolBalance();
  const { mutate: requestAirdrop, isPending, error } = useAirdrop();
  const [selectedAmount, setSelectedAmount] = useState(1);

  // Only show on devnet
  if (!isDevnet) {
    return null;
  }

  // Require wallet connection
  if (!publicKey) {
    return (
      <div className="p-6 bg-gray-800 rounded-lg text-center">
        <h2 className="text-xl font-bold mb-4">Devnet Faucet</h2>
        <p className="text-gray-400">Connect your wallet to request devnet SOL</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-800 rounded-lg">
      <h2 className="text-xl font-bold mb-4">Devnet Faucet</h2>

      <div className="mb-4">
        <p className="text-gray-400 text-sm">Current Balance</p>
        <p className="text-2xl font-mono">{balance?.toFixed(4) ?? '0'} SOL</p>
      </div>

      <div className="mb-4">
        <p className="text-gray-400 text-sm mb-2">Select Amount</p>
        <div className="flex gap-2">
          {AIRDROP_AMOUNTS.map((amount) => (
            <button
              key={amount}
              onClick={() => setSelectedAmount(amount)}
              className={`px-4 py-2 rounded ${
                selectedAmount === amount
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {amount} SOL
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={() => requestAirdrop(selectedAmount)}
        disabled={isPending}
        className={`w-full py-3 rounded font-medium ${
          isPending
            ? 'bg-gray-600 cursor-not-allowed'
            : 'bg-purple-500 hover:bg-purple-600'
        }`}
      >
        {isPending ? 'Requesting...' : `Request ${selectedAmount} SOL`}
      </button>

      {error && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/50 rounded">
          <p className="text-red-400 text-sm">{error.message}</p>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-gray-700">
        <p className="text-gray-400 text-sm mb-2">Alternative Faucets:</p>
        <div className="flex flex-col gap-2">
          <a
            href="https://faucet.solana.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-400 hover:text-purple-300 text-sm"
          >
            faucet.solana.com →
          </a>
          <a
            href={`https://solfaucet.com?address=${publicKey.toBase58()}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-400 hover:text-purple-300 text-sm"
          >
            solfaucet.com →
          </a>
        </div>
      </div>
    </div>
  );
}
```

### Compact Faucet Button

```tsx
// components/FaucetButton.tsx
import { useAirdrop } from '@/hooks/useAirdrop';
import { useNetwork } from '@/contexts/NetworkContext';
import { useWallet } from '@solana/wallet-adapter-react';

export function FaucetButton() {
  const { publicKey } = useWallet();
  const { isDevnet } = useNetwork();
  const { mutate: requestAirdrop, isPending } = useAirdrop();

  if (!isDevnet || !publicKey) {
    return null;
  }

  return (
    <button
      onClick={() => requestAirdrop(1)}
      disabled={isPending}
      className="px-3 py-1.5 text-sm bg-purple-500/20 text-purple-400 rounded hover:bg-purple-500/30 disabled:opacity-50"
    >
      {isPending ? 'Airdropping...' : 'Get 1 SOL'}
    </button>
  );
}
```

---

## External Faucets

### Faucet Links Component

```tsx
// components/ExternalFaucets.tsx
import { useWallet } from '@solana/wallet-adapter-react';

interface FaucetInfo {
  name: string;
  url: string;
  supportsAddress: boolean;
}

const FAUCETS: FaucetInfo[] = [
  {
    name: 'Solana Faucet',
    url: 'https://faucet.solana.com',
    supportsAddress: false,
  },
  {
    name: 'Sol Faucet',
    url: 'https://solfaucet.com',
    supportsAddress: true,
  },
  {
    name: 'QuickNode Faucet',
    url: 'https://faucet.quicknode.com/solana/devnet',
    supportsAddress: false,
  },
];

export function ExternalFaucets() {
  const { publicKey } = useWallet();

  const getFaucetUrl = (faucet: FaucetInfo): string => {
    if (faucet.supportsAddress && publicKey) {
      return `${faucet.url}?address=${publicKey.toBase58()}`;
    }
    return faucet.url;
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-gray-400">External Faucets</h3>

      <div className="space-y-2">
        {FAUCETS.map((faucet) => (
          <a
            key={faucet.name}
            href={getFaucetUrl(faucet)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3 bg-gray-800 rounded hover:bg-gray-700 transition-colors"
          >
            <span>{faucet.name}</span>
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
        ))}
      </div>

      {publicKey && (
        <div className="p-3 bg-gray-800/50 rounded">
          <p className="text-xs text-gray-500 mb-1">Your address:</p>
          <p className="text-xs font-mono text-gray-300 break-all">
            {publicKey.toBase58()}
          </p>
        </div>
      )}
    </div>
  );
}
```

---

## Test Token Minting

### Token Mint Faucet

```tsx
// lib/testTokens.ts
import { Connection, PublicKey, Keypair, Transaction } from '@solana/web3.js';
import {
  createMintToInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
} from '@solana/spl-token';

// Test token mints (devnet)
export const TEST_TOKENS = {
  USDC: {
    mint: 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr',
    decimals: 6,
    symbol: 'USDC',
    name: 'Test USDC',
  },
  BONK: {
    mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
    decimals: 5,
    symbol: 'BONK',
    name: 'Test BONK',
  },
};

// This requires a mint authority keypair (server-side)
export async function mintTestTokens(
  connection: Connection,
  mintAuthority: Keypair,
  recipient: PublicKey,
  mint: PublicKey,
  amount: number,
  decimals: number
): Promise<string> {
  const ata = await getAssociatedTokenAddress(mint, recipient);

  const transaction = new Transaction();

  // Check if ATA exists
  const ataInfo = await connection.getAccountInfo(ata);
  if (!ataInfo) {
    transaction.add(
      createAssociatedTokenAccountInstruction(
        mintAuthority.publicKey,
        ata,
        recipient,
        mint
      )
    );
  }

  // Mint tokens
  transaction.add(
    createMintToInstruction(
      mint,
      ata,
      mintAuthority.publicKey,
      BigInt(amount * Math.pow(10, decimals))
    )
  );

  const signature = await connection.sendTransaction(transaction, [mintAuthority]);
  await connection.confirmTransaction(signature);

  return signature;
}
```

### Token Faucet API Route

```tsx
// app/api/faucet/token/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { mintTestTokens, TEST_TOKENS } from '@/lib/testTokens';

// Load mint authority from env (server-side only)
const MINT_AUTHORITY = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(process.env.MINT_AUTHORITY_KEYPAIR || '[]'))
);

export async function POST(request: NextRequest) {
  try {
    const { recipient, token, amount } = await request.json();

    // Validate inputs
    if (!recipient || !token || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const tokenInfo = TEST_TOKENS[token as keyof typeof TEST_TOKENS];
    if (!tokenInfo) {
      return NextResponse.json(
        { error: 'Unknown token' },
        { status: 400 }
      );
    }

    // Rate limiting would go here

    const connection = new Connection(process.env.NEXT_PUBLIC_RPC_URL!);

    const signature = await mintTestTokens(
      connection,
      MINT_AUTHORITY,
      new PublicKey(recipient),
      new PublicKey(tokenInfo.mint),
      amount,
      tokenInfo.decimals
    );

    return NextResponse.json({ signature, amount, token });
  } catch (error: any) {
    console.error('Token faucet error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

### Token Faucet Hook

```tsx
// hooks/useTokenFaucet.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useWallet } from '@solana/wallet-adapter-react';
import { toast } from 'sonner';

interface TokenFaucetParams {
  token: string;
  amount: number;
}

export function useTokenFaucet() {
  const { publicKey } = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ token, amount }: TokenFaucetParams) => {
      if (!publicKey) throw new Error('Wallet not connected');

      const response = await fetch('/api/faucet/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: publicKey.toBase58(),
          token,
          amount,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Faucet request failed');
      }

      return response.json();
    },
    onSuccess: ({ token, amount }) => {
      toast.success(`Received ${amount} ${token}`);
      queryClient.invalidateQueries({ queryKey: ['tokenBalances'] });
    },
    onError: (error: Error) => {
      toast.error(`Token faucet failed: ${error.message}`);
    },
  });
}
```

### Token Faucet Component

```tsx
// components/TokenFaucet.tsx
import { useState } from 'react';
import { useTokenFaucet } from '@/hooks/useTokenFaucet';
import { TEST_TOKENS } from '@/lib/testTokens';

export function TokenFaucet() {
  const [selectedToken, setSelectedToken] = useState<string>('USDC');
  const [amount, setAmount] = useState(1000);
  const { mutate: requestTokens, isPending } = useTokenFaucet();

  return (
    <div className="p-6 bg-gray-800 rounded-lg">
      <h2 className="text-xl font-bold mb-4">Test Token Faucet</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-2">Token</label>
          <div className="flex gap-2">
            {Object.entries(TEST_TOKENS).map(([key, info]) => (
              <button
                key={key}
                onClick={() => setSelectedToken(key)}
                className={`px-4 py-2 rounded ${
                  selectedToken === key
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                {info.symbol}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-2">Amount</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="w-full p-3 bg-gray-700 rounded border border-gray-600"
          />
        </div>

        <button
          onClick={() => requestTokens({ token: selectedToken, amount })}
          disabled={isPending}
          className="w-full py-3 bg-purple-500 hover:bg-purple-600 rounded font-medium disabled:opacity-50"
        >
          {isPending ? 'Minting...' : `Get ${amount} ${selectedToken}`}
        </button>
      </div>
    </div>
  );
}
```

---

## Best Practices

### 1. Only Show on Devnet

```tsx
const { isDevnet } = useNetwork();
if (!isDevnet) return null;
```

### 2. Handle Rate Limiting

```tsx
try {
  await connection.requestAirdrop(publicKey, amount);
} catch (error) {
  if (error.message.includes('429')) {
    // Redirect to web faucet
    toast.error('Rate limited. Try the web faucet.');
  }
}
```

### 3. Provide Fallback Options

```tsx
// Always show external faucet links as fallback
<ExternalFaucets />
```

### 4. Show Balance After Airdrop

```tsx
// Invalidate balance query after successful airdrop
queryClient.invalidateQueries({ queryKey: ['solBalance'] });
```

### 5. Rate Limit Token Faucet

```tsx
// Server-side rate limiting for token faucet
const rateLimit = new Map<string, number>();
const RATE_LIMIT_MS = 60 * 60 * 1000; // 1 hour

function checkRateLimit(address: string): boolean {
  const lastRequest = rateLimit.get(address);
  if (lastRequest && Date.now() - lastRequest < RATE_LIMIT_MS) {
    return false;
  }
  rateLimit.set(address, Date.now());
  return true;
}
```

---

## External Resources

- [Solana Faucet](https://faucet.solana.com/)
- [Sol Faucet](https://solfaucet.com/)
- [QuickNode Faucet](https://faucet.quicknode.com/solana/devnet)
- [Airdrop RPC Method](https://solana.com/docs/rpc/http/requestairdrop)
