# Blockhash Management

Patterns for fetching, caching, and managing recent blockhashes for transaction construction and submission.

## Table of Contents

1. [Blockhash Fundamentals](#blockhash-fundamentals)
2. [Fetching Blockhashes](#fetching-blockhashes)
3. [Blockhash Context](#blockhash-context)
4. [Durable Nonces](#durable-nonces)
5. [Best Practices](#best-practices)

---

## Blockhash Fundamentals

### What is a Blockhash?

A blockhash is a unique identifier for a recent block on Solana. Every transaction must include a recent blockhash to:

1. **Prevent replay attacks** - Transactions can only be processed once
2. **Set expiration** - Transactions expire after ~60-90 seconds (150 blocks)
3. **Order transactions** - Validators use blockhash to determine transaction validity

### Blockhash Lifecycle

```
Block produced → Blockhash valid (~150 blocks / ~60-90 seconds) → Blockhash expires
```

---

## Fetching Blockhashes

### Basic Hook

```tsx
// hooks/useBlockhash.ts
import { useQuery } from '@tanstack/react-query';
import { useConnection } from '@solana/wallet-adapter-react';
import { BlockhashWithExpiryBlockHeight } from '@solana/web3.js';

export function useBlockhash() {
  const { connection } = useConnection();

  return useQuery({
    queryKey: ['blockhash'],
    queryFn: async (): Promise<BlockhashWithExpiryBlockHeight> => {
      return connection.getLatestBlockhash('confirmed');
    },
    staleTime: 1000 * 10, // 10 seconds - blockhash valid for ~60-90s
    refetchInterval: 1000 * 30, // Refetch every 30 seconds
    refetchOnWindowFocus: true,
  });
}

// Get just the blockhash string
export function useRecentBlockhash() {
  const { data } = useBlockhash();
  return data?.blockhash;
}
```

### Blockhash with Slot

```tsx
// hooks/useBlockhashWithSlot.ts
import { useQuery } from '@tanstack/react-query';
import { useConnection } from '@solana/wallet-adapter-react';

interface BlockhashInfo {
  blockhash: string;
  lastValidBlockHeight: number;
  slot: number;
  fetchedAt: number;
}

export function useBlockhashWithSlot() {
  const { connection } = useConnection();

  return useQuery({
    queryKey: ['blockhashWithSlot'],
    queryFn: async (): Promise<BlockhashInfo> => {
      const [blockhashResponse, slot] = await Promise.all([
        connection.getLatestBlockhash('confirmed'),
        connection.getSlot('confirmed'),
      ]);

      return {
        blockhash: blockhashResponse.blockhash,
        lastValidBlockHeight: blockhashResponse.lastValidBlockHeight,
        slot,
        fetchedAt: Date.now(),
      };
    },
    staleTime: 1000 * 10,
    refetchInterval: 1000 * 30,
  });
}
```

### Pre-fetched Blockhash for Forms

```tsx
// hooks/usePreFetchedBlockhash.ts
import { useCallback, useRef } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { BlockhashWithExpiryBlockHeight } from '@solana/web3.js';

export function usePreFetchedBlockhash() {
  const { connection } = useConnection();
  const blockhashRef = useRef<{
    data: BlockhashWithExpiryBlockHeight;
    fetchedAt: number;
  } | null>(null);

  const getBlockhash = useCallback(async (): Promise<BlockhashWithExpiryBlockHeight> => {
    const now = Date.now();
    const cached = blockhashRef.current;

    // Use cached if less than 20 seconds old
    if (cached && now - cached.fetchedAt < 20000) {
      return cached.data;
    }

    // Fetch fresh blockhash
    const blockhash = await connection.getLatestBlockhash('confirmed');
    blockhashRef.current = {
      data: blockhash,
      fetchedAt: now,
    };

    return blockhash;
  }, [connection]);

  const prefetch = useCallback(async () => {
    const blockhash = await connection.getLatestBlockhash('confirmed');
    blockhashRef.current = {
      data: blockhash,
      fetchedAt: Date.now(),
    };
  }, [connection]);

  return { getBlockhash, prefetch };
}
```

---

## Blockhash Context

### Blockhash Provider

```tsx
// contexts/BlockhashContext.tsx
'use client';

import {
  createContext,
  useContext,
  useMemo,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { BlockhashWithExpiryBlockHeight } from '@solana/web3.js';

interface BlockhashContextValue {
  blockhash: string | null;
  lastValidBlockHeight: number | null;
  isStale: boolean;
  isFetching: boolean;
  refresh: () => Promise<void>;
  getBlockhash: () => Promise<BlockhashWithExpiryBlockHeight>;
}

const BlockhashContext = createContext<BlockhashContextValue | null>(null);

const REFRESH_INTERVAL = 30000; // 30 seconds
const STALE_THRESHOLD = 45000; // Consider stale after 45 seconds

export function BlockhashProvider({ children }: { children: ReactNode }) {
  const { connection } = useConnection();
  const [blockhashData, setBlockhashData] = useState<BlockhashWithExpiryBlockHeight | null>(null);
  const [fetchedAt, setFetchedAt] = useState<number>(0);
  const [isFetching, setIsFetching] = useState(false);

  const fetchBlockhash = useCallback(async () => {
    setIsFetching(true);
    try {
      const data = await connection.getLatestBlockhash('confirmed');
      setBlockhashData(data);
      setFetchedAt(Date.now());
    } finally {
      setIsFetching(false);
    }
  }, [connection]);

  // Initial fetch
  useEffect(() => {
    fetchBlockhash();
  }, [fetchBlockhash]);

  // Periodic refresh
  useEffect(() => {
    const interval = setInterval(fetchBlockhash, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchBlockhash]);

  // Refresh on window focus
  useEffect(() => {
    const handleFocus = () => {
      const age = Date.now() - fetchedAt;
      if (age > STALE_THRESHOLD) {
        fetchBlockhash();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchedAt, fetchBlockhash]);

  const isStale = useMemo(() => {
    return Date.now() - fetchedAt > STALE_THRESHOLD;
  }, [fetchedAt]);

  const getBlockhash = useCallback(async (): Promise<BlockhashWithExpiryBlockHeight> => {
    // If current blockhash is fresh enough, use it
    if (blockhashData && !isStale) {
      return blockhashData;
    }

    // Otherwise fetch fresh
    const data = await connection.getLatestBlockhash('confirmed');
    setBlockhashData(data);
    setFetchedAt(Date.now());
    return data;
  }, [connection, blockhashData, isStale]);

  const value = useMemo(
    () => ({
      blockhash: blockhashData?.blockhash ?? null,
      lastValidBlockHeight: blockhashData?.lastValidBlockHeight ?? null,
      isStale,
      isFetching,
      refresh: fetchBlockhash,
      getBlockhash,
    }),
    [blockhashData, isStale, isFetching, fetchBlockhash, getBlockhash]
  );

  return (
    <BlockhashContext.Provider value={value}>
      {children}
    </BlockhashContext.Provider>
  );
}

export function useBlockhashContext() {
  const context = useContext(BlockhashContext);
  if (!context) {
    throw new Error('useBlockhashContext must be used within BlockhashProvider');
  }
  return context;
}
```

### Usage in Transaction Building

```tsx
// hooks/useTransaction.ts
import { useBlockhashContext } from '@/contexts/BlockhashContext';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import {
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';

export function useTransaction() {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();
  const { getBlockhash } = useBlockhashContext();

  const execute = async (instructions: TransactionInstruction[]) => {
    if (!publicKey || !signTransaction) {
      throw new Error('Wallet not connected');
    }

    // Get fresh blockhash
    const { blockhash, lastValidBlockHeight } = await getBlockhash();

    // Build transaction
    const transaction = new Transaction();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = publicKey;
    transaction.add(...instructions);

    // Sign and send
    const signed = await signTransaction(transaction);
    const signature = await connection.sendRawTransaction(signed.serialize());

    // Confirm with blockhash
    await connection.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight,
    });

    return signature;
  };

  return { execute };
}
```

---

## Durable Nonces

For transactions that need to be signed offline or submitted later, use durable nonces instead of blockhashes.

### Nonce Account Creation

```tsx
// lib/nonce.ts
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  NONCE_ACCOUNT_LENGTH,
  NonceAccount,
} from '@solana/web3.js';

export async function createNonceAccount(
  connection: Connection,
  payer: PublicKey,
  authority: PublicKey
): Promise<{ nonceKeypair: Keypair; instructions: TransactionInstruction[] }> {
  const nonceKeypair = Keypair.generate();
  const lamports = await connection.getMinimumBalanceForRentExemption(
    NONCE_ACCOUNT_LENGTH
  );

  const instructions = [
    SystemProgram.createAccount({
      fromPubkey: payer,
      newAccountPubkey: nonceKeypair.publicKey,
      lamports,
      space: NONCE_ACCOUNT_LENGTH,
      programId: SystemProgram.programId,
    }),
    SystemProgram.nonceInitialize({
      noncePubkey: nonceKeypair.publicKey,
      authorizedPubkey: authority,
    }),
  ];

  return { nonceKeypair, instructions };
}

export async function fetchNonceAccount(
  connection: Connection,
  nonceAddress: PublicKey
): Promise<NonceAccount | null> {
  const accountInfo = await connection.getAccountInfo(nonceAddress);
  if (!accountInfo) return null;

  return NonceAccount.fromAccountData(accountInfo.data);
}
```

### Using Nonce in Transaction

```tsx
// lib/nonceTransaction.ts
import {
  Transaction,
  TransactionInstruction,
  PublicKey,
  SystemProgram,
  NonceAccount,
} from '@solana/web3.js';

export function createNonceTransaction(
  instructions: TransactionInstruction[],
  nonceAccount: NonceAccount,
  nonceAddress: PublicKey,
  nonceAuthority: PublicKey,
  feePayer: PublicKey
): Transaction {
  const transaction = new Transaction();

  // Add nonce advance instruction FIRST
  transaction.add(
    SystemProgram.nonceAdvance({
      noncePubkey: nonceAddress,
      authorizedPubkey: nonceAuthority,
    })
  );

  // Add other instructions
  transaction.add(...instructions);

  // Set transaction fields
  transaction.recentBlockhash = nonceAccount.nonce;
  transaction.feePayer = feePayer;

  return transaction;
}
```

### Nonce Hook

```tsx
// hooks/useNonceAccount.ts
import { useQuery } from '@tanstack/react-query';
import { useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, NonceAccount } from '@solana/web3.js';
import { fetchNonceAccount } from '@/lib/nonce';

export function useNonceAccount(nonceAddress: string | undefined) {
  const { connection } = useConnection();

  return useQuery({
    queryKey: ['nonceAccount', nonceAddress],
    queryFn: async (): Promise<NonceAccount | null> => {
      if (!nonceAddress) throw new Error('No nonce address');
      return fetchNonceAccount(connection, new PublicKey(nonceAddress));
    },
    enabled: !!nonceAddress,
    staleTime: 1000 * 60, // 1 minute
  });
}
```

---

## Best Practices

### 1. Fetch Blockhash Just Before Signing

```tsx
// Good - Fresh blockhash
const handleSubmit = async () => {
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  await signAndSend(transaction);
};

// Bad - Stale blockhash from minutes ago
const blockhash = await connection.getLatestBlockhash(); // On mount
// ... user fills form for 5 minutes ...
const handleSubmit = async () => {
  transaction.recentBlockhash = blockhash; // May be expired!
};
```

### 2. Use lastValidBlockHeight for Confirmation

```tsx
// Good - Proper confirmation
const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
const signature = await connection.sendRawTransaction(tx.serialize());
await connection.confirmTransaction({
  signature,
  blockhash,
  lastValidBlockHeight,
});

// Bad - No expiration awareness
const signature = await connection.sendRawTransaction(tx.serialize());
await connection.confirmTransaction(signature); // May hang forever
```

### 3. Pre-fetch for Better UX

```tsx
// Pre-fetch blockhash when user starts filling form
useEffect(() => {
  prefetchBlockhash();
}, []);

// Use cached if fresh, fetch new if stale
const handleSubmit = async () => {
  const blockhash = await getBlockhash(); // Smart caching
};
```

### 4. Handle Blockhash Expiration

```tsx
try {
  await connection.sendRawTransaction(tx.serialize());
} catch (error) {
  if (error.message?.includes('blockhash not found')) {
    // Blockhash expired - refetch and retry
    const { blockhash } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    const resigned = await wallet.signTransaction(tx);
    await connection.sendRawTransaction(resigned.serialize());
  }
}
```

### 5. Use Durable Nonces for Offline Signing

```tsx
// For transactions that will be signed offline or later
const nonceAccount = await fetchNonceAccount(connection, nonceAddress);
const tx = createNonceTransaction(
  instructions,
  nonceAccount,
  nonceAddress,
  authority,
  feePayer
);
// Transaction can be signed anytime, won't expire
```

---

## Blockhash Validity Timing

| Network | Block Time | Blockhash Valid For |
|---------|------------|---------------------|
| Mainnet | ~400ms | ~60-90 seconds (150 blocks) |
| Devnet | ~400ms | ~60-90 seconds (150 blocks) |
| Localnet | Variable | Depends on configuration |

---

## External Resources

- [Solana Blockhash Documentation](https://solana.com/docs/core/transactions#recent-blockhash)
- [Durable Transaction Nonces](https://solana.com/docs/advanced/durable-nonces)
- [Transaction Confirmation](https://solana.com/docs/advanced/confirmation)
