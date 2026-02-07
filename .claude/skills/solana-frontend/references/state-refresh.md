# State Refresh

Patterns for refreshing application state after transactions to ensure UI reflects the latest on-chain data.

## Table of Contents

1. [Refresh Strategies](#refresh-strategies)
2. [Query Invalidation](#query-invalidation)
3. [Optimistic Updates](#optimistic-updates)
4. [Subscription-Based Updates](#subscription-based-updates)
5. [Best Practices](#best-practices)

---

## Refresh Strategies

### Overview

After a transaction confirms, the UI needs to reflect the new state. There are several strategies:

| Strategy | Pros | Cons |
|----------|------|------|
| Query Invalidation | Simple, always accurate | May cause loading flicker |
| Optimistic Updates | Instant feedback | Complex rollback on error |
| WebSocket Subscriptions | Real-time updates | More complex setup |
| Polling | Simple implementation | Inefficient, delayed |

### When to Use Each

```tsx
// Query Invalidation - Simple operations
await transfer(amount);
queryClient.invalidateQueries({ queryKey: ['balance'] });

// Optimistic Updates - Known outcome operations
queryClient.setQueryData(['balance'], (old) => old - amount);
await transfer(amount);

// WebSocket - Real-time critical data
connection.onAccountChange(account, handleUpdate);

// Polling - Non-critical background data
useQuery({ refetchInterval: 30000 });
```

---

## Query Invalidation

### Basic Invalidation After Transaction

```tsx
// hooks/useTransactionWithRefresh.ts
import { useQueryClient } from '@tanstack/react-query';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { TransactionInstruction } from '@solana/web3.js';

export function useTransactionWithRefresh() {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();
  const queryClient = useQueryClient();

  const execute = async (
    instructions: TransactionInstruction[],
    queryKeysToInvalidate: string[][]
  ) => {
    // ... transaction execution ...
    const signature = await sendAndConfirm(transaction);

    // Invalidate specified queries after confirmation
    await Promise.all(
      queryKeysToInvalidate.map((queryKey) =>
        queryClient.invalidateQueries({ queryKey })
      )
    );

    return signature;
  };

  return { execute };
}
```

### Smart Invalidation Hook

```tsx
// hooks/useInvalidateOnSuccess.ts
import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { PublicKey } from '@solana/web3.js';

type QueryKeyPattern = string | string[] | { queryKey: string[]; exact?: boolean };

export function useInvalidateOnSuccess() {
  const queryClient = useQueryClient();

  const invalidate = useCallback(
    async (patterns: QueryKeyPattern[]) => {
      await Promise.all(
        patterns.map((pattern) => {
          if (typeof pattern === 'string') {
            return queryClient.invalidateQueries({ queryKey: [pattern] });
          }
          if (Array.isArray(pattern)) {
            return queryClient.invalidateQueries({ queryKey: pattern });
          }
          return queryClient.invalidateQueries({
            queryKey: pattern.queryKey,
            exact: pattern.exact,
          });
        })
      );
    },
    [queryClient]
  );

  // Common invalidation patterns
  const invalidateBalances = useCallback(
    async (address?: PublicKey) => {
      const addressStr = address?.toBase58();
      await queryClient.invalidateQueries({
        queryKey: ['solBalance', addressStr],
      });
      await queryClient.invalidateQueries({
        queryKey: ['tokenBalances', addressStr],
      });
    },
    [queryClient]
  );

  const invalidateAccount = useCallback(
    async (programId: string, accountType: string, address?: string) => {
      await queryClient.invalidateQueries({
        queryKey: [programId, accountType, address],
      });
    },
    [queryClient]
  );

  return {
    invalidate,
    invalidateBalances,
    invalidateAccount,
  };
}
```

### Transaction Hook with Automatic Refresh

```tsx
// hooks/useTransfer.ts
import { useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { SystemProgram, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useInvalidateOnSuccess } from './useInvalidateOnSuccess';

export function useTransfer() {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();
  const { invalidateBalances } = useInvalidateOnSuccess();

  const transfer = useCallback(
    async (recipient: PublicKey, amountSol: number) => {
      if (!publicKey || !signTransaction) {
        throw new Error('Wallet not connected');
      }

      const instruction = SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: recipient,
        lamports: amountSol * LAMPORTS_PER_SOL,
      });

      // ... send transaction ...
      const signature = await sendTransaction(instruction);

      // Refresh balances for both parties
      await Promise.all([
        invalidateBalances(publicKey),
        invalidateBalances(recipient),
      ]);

      return signature;
    },
    [publicKey, signTransaction, connection, invalidateBalances]
  );

  return { transfer };
}
```

---

## Optimistic Updates

### Optimistic Balance Update

```tsx
// hooks/useOptimisticTransfer.ts
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

interface TransferParams {
  recipient: PublicKey;
  amountSol: number;
}

export function useOptimisticTransfer() {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ recipient, amountSol }: TransferParams) => {
      // ... send transaction ...
      return signature;
    },

    // Optimistically update before transaction confirms
    onMutate: async ({ recipient, amountSol }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: ['solBalance', publicKey?.toBase58()],
      });

      // Snapshot previous value
      const previousBalance = queryClient.getQueryData<number>([
        'solBalance',
        publicKey?.toBase58(),
      ]);

      // Optimistically update
      if (previousBalance !== undefined) {
        queryClient.setQueryData(
          ['solBalance', publicKey?.toBase58()],
          previousBalance - amountSol * LAMPORTS_PER_SOL
        );
      }

      // Return context for rollback
      return { previousBalance };
    },

    // Rollback on error
    onError: (err, variables, context) => {
      if (context?.previousBalance !== undefined) {
        queryClient.setQueryData(
          ['solBalance', publicKey?.toBase58()],
          context.previousBalance
        );
      }
    },

    // Always refetch after error or success
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ['solBalance', publicKey?.toBase58()],
      });
    },
  });
}
```

### Optimistic List Update

```tsx
// hooks/useOptimisticStake.ts
import { useQueryClient, useMutation } from '@tanstack/react-query';

interface StakePosition {
  id: string;
  amount: number;
  pool: string;
  createdAt: number;
}

export function useOptimisticStake() {
  const queryClient = useQueryClient();
  const { publicKey } = useWallet();

  return useMutation({
    mutationFn: async (params: { pool: string; amount: number }) => {
      // ... stake transaction ...
      return { id: signature, ...params };
    },

    onMutate: async ({ pool, amount }) => {
      await queryClient.cancelQueries({
        queryKey: ['stakePositions', publicKey?.toBase58()],
      });

      const previousPositions = queryClient.getQueryData<StakePosition[]>([
        'stakePositions',
        publicKey?.toBase58(),
      ]);

      // Optimistically add new position
      const optimisticPosition: StakePosition = {
        id: 'pending-' + Date.now(),
        amount,
        pool,
        createdAt: Date.now(),
      };

      queryClient.setQueryData<StakePosition[]>(
        ['stakePositions', publicKey?.toBase58()],
        (old) => [...(old ?? []), optimisticPosition]
      );

      return { previousPositions };
    },

    onError: (err, variables, context) => {
      queryClient.setQueryData(
        ['stakePositions', publicKey?.toBase58()],
        context?.previousPositions
      );
    },

    onSuccess: (data) => {
      // Replace optimistic entry with real one
      queryClient.setQueryData<StakePosition[]>(
        ['stakePositions', publicKey?.toBase58()],
        (old) =>
          old?.map((pos) =>
            pos.id.startsWith('pending-') ? { ...pos, id: data.id } : pos
          )
      );
    },

    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ['stakePositions', publicKey?.toBase58()],
      });
    },
  });
}
```

---

## Subscription-Based Updates

### Account Change Subscription

```tsx
// hooks/useAccountSubscription.ts
import { useEffect } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { useQueryClient } from '@tanstack/react-query';
import { PublicKey } from '@solana/web3.js';

export function useBalanceSubscription(address: PublicKey | null) {
  const { connection } = useConnection();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!address) return;

    const subscriptionId = connection.onAccountChange(
      address,
      (accountInfo) => {
        // Update balance directly in cache
        queryClient.setQueryData(
          ['solBalance', address.toBase58()],
          accountInfo.lamports
        );
      },
      'confirmed'
    );

    return () => {
      connection.removeAccountChangeListener(subscriptionId);
    };
  }, [connection, address, queryClient]);
}
```

### Token Account Subscription

```tsx
// hooks/useTokenAccountSubscription.ts
import { useEffect } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { useQueryClient } from '@tanstack/react-query';
import { PublicKey } from '@solana/web3.js';
import { AccountLayout } from '@solana/spl-token';

export function useTokenAccountSubscription(
  tokenAccount: PublicKey | null,
  mint: string
) {
  const { connection } = useConnection();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!tokenAccount) return;

    const subscriptionId = connection.onAccountChange(
      tokenAccount,
      (accountInfo) => {
        // Decode token account data
        const decoded = AccountLayout.decode(accountInfo.data);
        const amount = Number(decoded.amount);

        // Update token balance in cache
        queryClient.setQueryData(
          ['tokenBalance', tokenAccount.toBase58()],
          amount
        );

        // Also invalidate the token balances list
        queryClient.invalidateQueries({
          queryKey: ['tokenBalances'],
        });
      },
      'confirmed'
    );

    return () => {
      connection.removeAccountChangeListener(subscriptionId);
    };
  }, [connection, tokenAccount, queryClient]);
}
```

### Program Account Subscription

```tsx
// hooks/useProgramAccountSubscription.ts
import { useEffect } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { useQueryClient } from '@tanstack/react-query';
import { PublicKey } from '@solana/web3.js';
import { BorshCoder } from '@coral-xyz/anchor';
import { IDL } from '@/programs/myProgram';

export function usePoolSubscription(poolAddress: string | null) {
  const { connection } = useConnection();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!poolAddress) return;

    const pubkey = new PublicKey(poolAddress);
    const coder = new BorshCoder(IDL);

    const subscriptionId = connection.onAccountChange(
      pubkey,
      (accountInfo) => {
        try {
          // Decode using Anchor coder
          const decoded = coder.accounts.decode('pool', accountInfo.data);

          // Update pool data in cache
          queryClient.setQueryData(['pool', poolAddress], decoded);
        } catch (error) {
          console.error('Failed to decode pool account:', error);
        }
      },
      'confirmed'
    );

    return () => {
      connection.removeAccountChangeListener(subscriptionId);
    };
  }, [connection, poolAddress, queryClient]);
}
```

---

## Integrated Refresh Context

### Transaction Context with Refresh

```tsx
// contexts/TransactionRefreshContext.tsx
'use client';

import {
  createContext,
  useContext,
  useCallback,
  ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useWallet } from '@solana/wallet-adapter-react';

interface RefreshConfig {
  balances?: boolean;
  tokenBalances?: boolean;
  accounts?: string[]; // Account addresses to refresh
  queries?: string[][]; // Custom query keys
  delay?: number; // Delay before refresh (for RPC propagation)
}

interface TransactionRefreshContextValue {
  refreshAfterTransaction: (config?: RefreshConfig) => Promise<void>;
  refreshBalances: () => Promise<void>;
  refreshAccount: (address: string) => Promise<void>;
}

const TransactionRefreshContext = createContext<TransactionRefreshContextValue | null>(null);

export function TransactionRefreshProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { publicKey } = useWallet();

  const refreshBalances = useCallback(async () => {
    if (!publicKey) return;

    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ['solBalance', publicKey.toBase58()],
      }),
      queryClient.invalidateQueries({
        queryKey: ['tokenBalances', publicKey.toBase58()],
      }),
    ]);
  }, [queryClient, publicKey]);

  const refreshAccount = useCallback(
    async (address: string) => {
      await queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey;
          return key.some((k) => k === address);
        },
      });
    },
    [queryClient]
  );

  const refreshAfterTransaction = useCallback(
    async (config: RefreshConfig = {}) => {
      const {
        balances = true,
        tokenBalances = true,
        accounts = [],
        queries = [],
        delay = 500,
      } = config;

      // Small delay for RPC to propagate changes
      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      const refreshPromises: Promise<void>[] = [];

      if (balances && publicKey) {
        refreshPromises.push(
          queryClient.invalidateQueries({
            queryKey: ['solBalance', publicKey.toBase58()],
          })
        );
      }

      if (tokenBalances && publicKey) {
        refreshPromises.push(
          queryClient.invalidateQueries({
            queryKey: ['tokenBalances', publicKey.toBase58()],
          })
        );
      }

      accounts.forEach((address) => {
        refreshPromises.push(refreshAccount(address));
      });

      queries.forEach((queryKey) => {
        refreshPromises.push(
          queryClient.invalidateQueries({ queryKey })
        );
      });

      await Promise.all(refreshPromises);
    },
    [queryClient, publicKey, refreshAccount]
  );

  return (
    <TransactionRefreshContext.Provider
      value={{
        refreshAfterTransaction,
        refreshBalances,
        refreshAccount,
      }}
    >
      {children}
    </TransactionRefreshContext.Provider>
  );
}

export function useTransactionRefresh() {
  const context = useContext(TransactionRefreshContext);
  if (!context) {
    throw new Error(
      'useTransactionRefresh must be used within TransactionRefreshProvider'
    );
  }
  return context;
}
```

### Usage Example

```tsx
// components/StakeForm.tsx
import { useTransactionRefresh } from '@/contexts/TransactionRefreshContext';

export function StakeForm({ poolAddress }: { poolAddress: string }) {
  const { refreshAfterTransaction } = useTransactionRefresh();

  const handleStake = async (amount: number) => {
    // ... execute stake transaction ...
    const signature = await stake(poolAddress, amount);

    // Refresh relevant state
    await refreshAfterTransaction({
      balances: true,
      tokenBalances: true,
      accounts: [poolAddress],
      queries: [
        ['stakePositions'],
        ['pool', poolAddress],
      ],
    });

    return signature;
  };
}
```

---

## Best Practices

### 1. Add Delay for RPC Propagation

```tsx
// RPC nodes may take a moment to reflect changes
await new Promise(resolve => setTimeout(resolve, 500));
await queryClient.invalidateQueries({ queryKey: ['balance'] });
```

### 2. Invalidate Related Queries Together

```tsx
// Don't forget related data
await Promise.all([
  queryClient.invalidateQueries({ queryKey: ['balance'] }),
  queryClient.invalidateQueries({ queryKey: ['transactions'] }),
  queryClient.invalidateQueries({ queryKey: ['portfolio'] }),
]);
```

### 3. Use Optimistic Updates for Known Outcomes

```tsx
// Transfer outcome is predictable
onMutate: ({ amount }) => {
  queryClient.setQueryData(['balance'], (old) => old - amount);
}
```

### 4. Prefer Subscriptions for Critical Data

```tsx
// Balances should update in real-time
useBalanceSubscription(publicKey);
```

### 5. Handle Refresh Failures Gracefully

```tsx
try {
  await queryClient.invalidateQueries({ queryKey: ['balance'] });
} catch (error) {
  // Non-critical - log but don't fail the transaction
  console.warn('Failed to refresh balance:', error);
}
```

---

## External Resources

- [TanStack Query Invalidation](https://tanstack.com/query/latest/docs/react/guides/query-invalidation)
- [TanStack Query Optimistic Updates](https://tanstack.com/query/latest/docs/react/guides/optimistic-updates)
- [Solana Account Subscriptions](https://solana.com/docs/rpc/websocket/accountsubscribe)
