# Data Fetching with React Query

Comprehensive patterns for fetching, caching, and managing Solana data using TanStack React Query. Covers account data, token balances, program state, and real-time updates.

## Table of Contents

1. [Setup](#setup)
2. [Query Key Conventions](#query-key-conventions)
3. [Account Data Fetching](#account-data-fetching)
4. [Token Data Patterns](#token-data-patterns)
5. [Program Account Queries](#program-account-queries)
6. [Polling and Real-Time](#polling-and-real-time)
7. [Mutation Patterns](#mutation-patterns)
8. [Cache Invalidation](#cache-invalidation)
9. [Error Handling](#error-handling)
10. [Best Practices](#best-practices)

---

## Setup

### QueryClient Configuration

```tsx
// lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is fresh for 30 seconds
      staleTime: 1000 * 30,

      // Keep in cache for 5 minutes
      gcTime: 1000 * 60 * 5,

      // Don't refetch on window focus for blockchain data
      refetchOnWindowFocus: false,

      // Retry failed queries 3 times
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

      // Don't refetch on reconnect by default
      refetchOnReconnect: false,
    },
    mutations: {
      // Retry failed mutations once
      retry: 1,
    },
  },
});
```

### Provider Setup

```tsx
// app/providers.tsx
'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from '@/lib/queryClient';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
```

---

## Query Key Conventions

### Hierarchical Key Structure

```tsx
// Query key factory pattern
export const queryKeys = {
  // Wallet-related queries
  wallet: {
    all: ['wallet'] as const,
    balance: (address: string) => ['wallet', 'balance', address] as const,
    tokens: (address: string) => ['wallet', 'tokens', address] as const,
    tokenBalance: (address: string, mint: string) =>
      ['wallet', 'tokens', address, mint] as const,
  },

  // Token metadata
  token: {
    all: ['token'] as const,
    metadata: (mint: string) => ['token', 'metadata', mint] as const,
    price: (mint: string) => ['token', 'price', mint] as const,
  },

  // Program accounts
  program: {
    all: (programId: string) => ['program', programId] as const,
    account: (programId: string, address: string) =>
      ['program', programId, 'account', address] as const,
    accounts: (programId: string, type: string) =>
      ['program', programId, 'accounts', type] as const,
  },

  // Transaction history
  transactions: {
    all: (address: string) => ['transactions', address] as const,
    bySignature: (signature: string) => ['transactions', 'signature', signature] as const,
  },

  // Blockhash
  blockhash: ['blockhash'] as const,

  // Slot
  slot: ['slot'] as const,
};
```

### Key Benefits

```tsx
// Invalidate all wallet queries
queryClient.invalidateQueries({ queryKey: queryKeys.wallet.all });

// Invalidate specific token balance
queryClient.invalidateQueries({
  queryKey: queryKeys.wallet.tokenBalance(address, mint),
});

// Prefetch data
queryClient.prefetchQuery({
  queryKey: queryKeys.token.metadata(mint),
  queryFn: () => fetchTokenMetadata(mint),
});
```

---

## Account Data Fetching

### Generic Account Hook

```tsx
// hooks/useAccountData.ts
import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, AccountInfo, Commitment } from '@solana/web3.js';

interface UseAccountDataOptions<T> extends Omit<UseQueryOptions<T, Error>, 'queryKey' | 'queryFn'> {
  commitment?: Commitment;
}

export function useAccountData<T>(
  address: PublicKey | string | null,
  parser: (data: Buffer) => T,
  options?: UseAccountDataOptions<T>
) {
  const { connection } = useConnection();

  const addressString = address
    ? typeof address === 'string'
      ? address
      : address.toBase58()
    : null;

  return useQuery({
    queryKey: ['account', addressString],
    queryFn: async (): Promise<T> => {
      if (!addressString) throw new Error('No address provided');

      const pubkey = new PublicKey(addressString);
      const accountInfo = await connection.getAccountInfo(pubkey, options?.commitment);

      if (!accountInfo) {
        throw new Error('Account not found');
      }

      return parser(accountInfo.data);
    },
    enabled: !!addressString && (options?.enabled ?? true),
    ...options,
  });
}
```

### Multiple Accounts Hook

```tsx
// hooks/useMultipleAccountsData.ts
import { useQuery } from '@tanstack/react-query';
import { useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';

interface AccountResult<T> {
  address: string;
  data: T | null;
  error?: string;
}

export function useMultipleAccountsData<T>(
  addresses: (PublicKey | string)[],
  parser: (data: Buffer) => T,
  options?: { enabled?: boolean }
) {
  const { connection } = useConnection();

  const addressStrings = addresses.map((a) =>
    typeof a === 'string' ? a : a.toBase58()
  );

  return useQuery({
    queryKey: ['accounts', addressStrings],
    queryFn: async (): Promise<AccountResult<T>[]> => {
      const pubkeys = addressStrings.map((a) => new PublicKey(a));

      // Batch in chunks of 100
      const chunkSize = 100;
      const results: (AccountInfo<Buffer> | null)[] = [];

      for (let i = 0; i < pubkeys.length; i += chunkSize) {
        const chunk = pubkeys.slice(i, i + chunkSize);
        const chunkResults = await connection.getMultipleAccountsInfo(chunk);
        results.push(...chunkResults);
      }

      return results.map((info, index) => {
        if (!info) {
          return {
            address: addressStrings[index],
            data: null,
            error: 'Account not found',
          };
        }

        try {
          return {
            address: addressStrings[index],
            data: parser(info.data),
          };
        } catch (e) {
          return {
            address: addressStrings[index],
            data: null,
            error: `Parse error: ${e}`,
          };
        }
      });
    },
    enabled: addresses.length > 0 && (options?.enabled ?? true),
  });
}
```

---

## Token Data Patterns

### SOL Balance Hook

```tsx
// hooks/useSolBalance.ts
import { useQuery } from '@tanstack/react-query';
import { useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { queryKeys } from '@/lib/queryKeys';

export function useSolBalance(address: PublicKey | null) {
  const { connection } = useConnection();

  return useQuery({
    queryKey: queryKeys.wallet.balance(address?.toBase58() ?? ''),
    queryFn: async () => {
      if (!address) throw new Error('No address');
      const balance = await connection.getBalance(address, 'confirmed');
      return balance / LAMPORTS_PER_SOL;
    },
    enabled: !!address,
    staleTime: 1000 * 10, // 10 seconds
    refetchInterval: 1000 * 30, // Refresh every 30 seconds
  });
}
```

### Token Accounts Hook

```tsx
// hooks/useTokenAccounts.ts
import { useQuery } from '@tanstack/react-query';
import { useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, AccountLayout } from '@solana/spl-token';
import { queryKeys } from '@/lib/queryKeys';

interface TokenAccount {
  mint: string;
  address: string;
  amount: bigint;
  decimals: number;
}

export function useTokenAccounts(owner: PublicKey | null) {
  const { connection } = useConnection();

  return useQuery({
    queryKey: queryKeys.wallet.tokens(owner?.toBase58() ?? ''),
    queryFn: async (): Promise<TokenAccount[]> => {
      if (!owner) throw new Error('No owner');

      const response = await connection.getTokenAccountsByOwner(owner, {
        programId: TOKEN_PROGRAM_ID,
      });

      const accounts: TokenAccount[] = [];

      for (const { pubkey, account } of response.value) {
        const data = AccountLayout.decode(account.data);

        accounts.push({
          mint: new PublicKey(data.mint).toBase58(),
          address: pubkey.toBase58(),
          amount: data.amount,
          decimals: 0, // Need to fetch from mint
        });
      }

      return accounts;
    },
    enabled: !!owner,
    staleTime: 1000 * 30,
  });
}
```

### Token Balance with Metadata

```tsx
// hooks/useTokenBalanceWithMetadata.ts
import { useQuery, useQueries } from '@tanstack/react-query';
import { useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { getMint } from '@solana/spl-token';
import { queryKeys } from '@/lib/queryKeys';

interface TokenBalanceWithMetadata {
  mint: string;
  symbol?: string;
  name?: string;
  logo?: string;
  balance: number;
  uiAmount: string;
  decimals: number;
  usdValue?: number;
}

export function useTokenBalancesWithMetadata(owner: PublicKey | null) {
  const { connection } = useConnection();
  const { data: tokenAccounts } = useTokenAccounts(owner);

  // Fetch mint info for each token
  const mintQueries = useQueries({
    queries: (tokenAccounts ?? []).map((account) => ({
      queryKey: queryKeys.token.metadata(account.mint),
      queryFn: async () => {
        const mintPubkey = new PublicKey(account.mint);
        const mintInfo = await getMint(connection, mintPubkey);

        // Fetch metadata from token list or on-chain metadata
        const metadata = await fetchTokenMetadata(account.mint);

        return {
          decimals: mintInfo.decimals,
          supply: mintInfo.supply,
          ...metadata,
        };
      },
      staleTime: 1000 * 60 * 60, // 1 hour - mint info rarely changes
    })),
  });

  const balances: TokenBalanceWithMetadata[] = (tokenAccounts ?? []).map(
    (account, index) => {
      const mintData = mintQueries[index]?.data;
      const decimals = mintData?.decimals ?? 0;
      const balance = Number(account.amount) / Math.pow(10, decimals);

      return {
        mint: account.mint,
        symbol: mintData?.symbol,
        name: mintData?.name,
        logo: mintData?.logo,
        balance,
        uiAmount: balance.toLocaleString(undefined, {
          maximumFractionDigits: decimals,
        }),
        decimals,
      };
    }
  );

  return {
    data: balances,
    isLoading: mintQueries.some((q) => q.isLoading),
    isError: mintQueries.some((q) => q.isError),
  };
}
```

---

## Program Account Queries

### Anchor Program Accounts

```tsx
// hooks/useProgramAccounts.ts
import { useQuery } from '@tanstack/react-query';
import { useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, GetProgramAccountsFilter } from '@solana/web3.js';
import { Program, AnchorProvider, BorshCoder } from '@coral-xyz/anchor';

export function useProgramAccounts<T>(
  program: Program | null,
  accountName: string,
  filters?: GetProgramAccountsFilter[]
) {
  const { connection } = useConnection();

  return useQuery({
    queryKey: ['program', program?.programId.toBase58(), 'accounts', accountName, filters],
    queryFn: async (): Promise<{ publicKey: PublicKey; account: T }[]> => {
      if (!program) throw new Error('No program');

      // Use Anchor's account fetching
      const accounts = await (program.account as any)[accountName].all(filters);

      return accounts;
    },
    enabled: !!program,
    staleTime: 1000 * 30,
  });
}

// Usage
function PoolList() {
  const { program } = useProgram();

  const { data: pools } = useProgramAccounts(program, 'pool', [
    {
      memcmp: {
        offset: 8, // After discriminator
        bytes: ownerPubkey.toBase58(),
      },
    },
  ]);

  return (
    <ul>
      {pools?.map((pool) => (
        <li key={pool.publicKey.toBase58()}>
          {pool.account.name}
        </li>
      ))}
    </ul>
  );
}
```

### Single Program Account

```tsx
// hooks/useProgramAccount.ts
import { useQuery } from '@tanstack/react-query';
import { Program } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { queryKeys } from '@/lib/queryKeys';

export function useProgramAccount<T>(
  program: Program | null,
  accountName: string,
  address: PublicKey | null
) {
  return useQuery({
    queryKey: queryKeys.program.account(
      program?.programId.toBase58() ?? '',
      address?.toBase58() ?? ''
    ),
    queryFn: async (): Promise<T> => {
      if (!program || !address) throw new Error('Missing program or address');

      const account = await (program.account as any)[accountName].fetch(address);
      return account;
    },
    enabled: !!program && !!address,
    staleTime: 1000 * 30,
  });
}

// Usage
function PoolDetail({ poolAddress }: { poolAddress: PublicKey }) {
  const { program } = useProgram();

  const { data: pool, isLoading } = useProgramAccount<Pool>(
    program,
    'pool',
    poolAddress
  );

  if (isLoading) return <Loading />;
  if (!pool) return <NotFound />;

  return <PoolCard pool={pool} />;
}
```

---

## Polling and Real-Time

### Configurable Polling

```tsx
// hooks/usePolledQuery.ts
import { useQuery, UseQueryOptions } from '@tanstack/react-query';

interface PollingOptions {
  interval?: number;      // Polling interval in ms
  enabled?: boolean;
  onlyWhenVisible?: boolean;
}

export function usePolledQuery<T>(
  queryKey: string[],
  queryFn: () => Promise<T>,
  options: PollingOptions = {}
) {
  const {
    interval = 10000,
    enabled = true,
    onlyWhenVisible = true,
  } = options;

  return useQuery({
    queryKey,
    queryFn,
    enabled,
    refetchInterval: interval,
    refetchIntervalInBackground: !onlyWhenVisible,
    staleTime: interval / 2,
  });
}

// Usage
function LivePrice({ mint }: { mint: string }) {
  const { data: price } = usePolledQuery(
    ['price', mint],
    () => fetchPrice(mint),
    { interval: 5000 } // Update every 5 seconds
  );

  return <span>${price?.toFixed(2)}</span>;
}
```

### Conditional Polling

```tsx
// Poll until condition is met
export function usePolledUntil<T>(
  queryKey: string[],
  queryFn: () => Promise<T>,
  isComplete: (data: T) => boolean,
  options: { interval?: number; maxAttempts?: number } = {}
) {
  const { interval = 1000, maxAttempts = 30 } = options;
  const attemptRef = useRef(0);

  return useQuery({
    queryKey,
    queryFn,
    refetchInterval: (query) => {
      attemptRef.current++;

      if (attemptRef.current >= maxAttempts) {
        return false;
      }

      if (query.state.data && isComplete(query.state.data)) {
        return false;
      }

      return interval;
    },
  });
}

// Usage: Poll for transaction confirmation
function TransactionStatus({ signature }: { signature: string }) {
  const { connection } = useConnection();

  const { data: status } = usePolledUntil(
    ['txStatus', signature],
    () => connection.getSignatureStatus(signature),
    (status) => status?.value?.confirmationStatus === 'confirmed',
    { interval: 500, maxAttempts: 60 }
  );

  return <span>{status?.value?.confirmationStatus || 'pending'}</span>;
}
```

---

## Mutation Patterns

### Transaction Mutation

```tsx
// hooks/useTransactionMutation.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Transaction, TransactionInstruction } from '@solana/web3.js';
import { toast } from 'sonner';

interface TransactionMutationOptions {
  onSuccess?: (signature: string) => void;
  onError?: (error: Error) => void;
  invalidateKeys?: string[][];
}

export function useTransactionMutation(options: TransactionMutationOptions = {}) {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (instructions: TransactionInstruction[]): Promise<string> => {
      if (!publicKey || !signTransaction) {
        throw new Error('Wallet not connected');
      }

      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash('confirmed');

      const transaction = new Transaction({
        feePayer: publicKey,
        blockhash,
        lastValidBlockHeight,
      }).add(...instructions);

      const signed = await signTransaction(transaction);

      const signature = await connection.sendRawTransaction(signed.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });

      await connection.confirmTransaction(
        { signature, blockhash, lastValidBlockHeight },
        'confirmed'
      );

      return signature;
    },
    onSuccess: (signature) => {
      // Invalidate specified queries
      options.invalidateKeys?.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });

      options.onSuccess?.(signature);
    },
    onError: (error) => {
      options.onError?.(error);
    },
  });
}
```

### Optimistic Updates

```tsx
// hooks/useOptimisticTransfer.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';

export function useOptimisticTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ amount, recipient }) => {
      // Execute transaction
      return executeTransfer(amount, recipient);
    },
    onMutate: async ({ amount }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.wallet.balance(address) });

      // Snapshot previous value
      const previousBalance = queryClient.getQueryData<number>(
        queryKeys.wallet.balance(address)
      );

      // Optimistically update
      queryClient.setQueryData(
        queryKeys.wallet.balance(address),
        (old: number) => old - amount
      );

      return { previousBalance };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousBalance !== undefined) {
        queryClient.setQueryData(
          queryKeys.wallet.balance(address),
          context.previousBalance
        );
      }
    },
    onSettled: () => {
      // Always refetch after mutation
      queryClient.invalidateQueries({ queryKey: queryKeys.wallet.balance(address) });
    },
  });
}
```

---

## Cache Invalidation

### Strategic Invalidation

```tsx
// lib/invalidation.ts
import { QueryClient } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';

export function invalidateWalletState(
  queryClient: QueryClient,
  walletAddress: string
) {
  // Invalidate all wallet-related queries
  queryClient.invalidateQueries({
    queryKey: queryKeys.wallet.all,
    predicate: (query) =>
      query.queryKey.includes(walletAddress),
  });
}

export function invalidateAfterTransaction(
  queryClient: QueryClient,
  walletAddress: string,
  affectedMints: string[] = []
) {
  // Invalidate SOL balance
  queryClient.invalidateQueries({
    queryKey: queryKeys.wallet.balance(walletAddress),
  });

  // Invalidate affected token balances
  affectedMints.forEach((mint) => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.wallet.tokenBalance(walletAddress, mint),
    });
  });

  // Invalidate token list
  queryClient.invalidateQueries({
    queryKey: queryKeys.wallet.tokens(walletAddress),
  });
}
```

### Delayed Invalidation

```tsx
// Wait for confirmation before invalidating
export function useDelayedInvalidation() {
  const queryClient = useQueryClient();
  const { connection } = useConnection();

  const invalidateAfterConfirmation = async (
    signature: string,
    keys: string[][],
    commitment: Commitment = 'confirmed'
  ) => {
    // Wait for confirmation
    await connection.confirmTransaction(signature, commitment);

    // Add small delay to ensure RPC reflects new state
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Invalidate queries
    keys.forEach((key) => {
      queryClient.invalidateQueries({ queryKey: key });
    });
  };

  return { invalidateAfterConfirmation };
}
```

---

## Error Handling

### Query Error Handling

```tsx
// hooks/useQueryWithErrorHandling.ts
import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { toast } from 'sonner';

export function useQueryWithErrorHandling<T>(
  options: UseQueryOptions<T, Error> & {
    errorMessage?: string;
    showErrorToast?: boolean;
  }
) {
  const { errorMessage, showErrorToast = false, ...queryOptions } = options;

  return useQuery({
    ...queryOptions,
    throwOnError: false,
    meta: {
      ...queryOptions.meta,
      onError: (error: Error) => {
        console.error(`Query error [${queryOptions.queryKey}]:`, error);

        if (showErrorToast) {
          toast.error(errorMessage || error.message);
        }
      },
    },
  });
}
```

### Global Error Handler

```tsx
// lib/queryClient.ts
import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { toast } from 'sonner';

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      // Only show toast for queries that have already succeeded before
      if (query.state.data !== undefined) {
        toast.error(`Background refresh failed: ${error.message}`);
      }
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, variables, context, mutation) => {
      // Handle mutation errors globally
      console.error('Mutation failed:', error);
    },
  }),
});
```

---

## Best Practices

### 1. Use Query Key Factories

```tsx
// Always use centralized query keys
const { data } = useQuery({
  queryKey: queryKeys.wallet.balance(address), // Good
  // queryKey: ['balance', address], // Avoid - harder to invalidate
});
```

### 2. Appropriate Stale Times

```tsx
// Frequently changing data
staleTime: 1000 * 10,  // 10 seconds for balances

// Rarely changing data
staleTime: 1000 * 60 * 60,  // 1 hour for token metadata

// Static data
staleTime: Infinity,  // Never stale for immutable data
```

### 3. Batch Related Queries

```tsx
// Instead of multiple individual queries
const { data: account1 } = useAccountData(address1);
const { data: account2 } = useAccountData(address2);

// Use batch query
const { data: accounts } = useMultipleAccountsData([address1, address2]);
```

### 4. Prefetch on Hover

```tsx
function TokenLink({ mint }: { mint: string }) {
  const queryClient = useQueryClient();

  const prefetch = () => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.token.metadata(mint),
      queryFn: () => fetchTokenMetadata(mint),
    });
  };

  return (
    <Link href={`/token/${mint}`} onMouseEnter={prefetch}>
      View Token
    </Link>
  );
}
```

### 5. Consistent Commitment Levels

```tsx
// If transaction sent with 'processed', query with 'processed'
const mutation = useMutation({
  mutationFn: async () => {
    await sendWithCommitment('processed');
  },
  onSuccess: () => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.wallet.balance(address),
      // Ensure invalidation triggers a 'processed' level fetch
    });
  },
});
```

---

## External Resources

- [TanStack Query Documentation](https://tanstack.com/query/latest/docs/react/overview)
- [React Query Solana Patterns](https://tanstack.com/query/latest/docs/react/examples)
- [Query Keys Best Practices](https://tkdodo.eu/blog/effective-react-query-keys)
