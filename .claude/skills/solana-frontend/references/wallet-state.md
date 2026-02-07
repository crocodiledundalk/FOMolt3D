# Wallet State Management

Patterns for managing connected wallet state including SOL balances, token balances, and user-specific state with real-time updates.

## Table of Contents

1. [SOL Balance](#sol-balance)
2. [Token Balances](#token-balances)
3. [Wallet Context](#wallet-context)
4. [Real-Time Updates](#real-time-updates)
5. [Refresh Patterns](#refresh-patterns)

---

## SOL Balance

### Basic SOL Balance Hook

```tsx
// hooks/useSolBalance.ts
import { useQuery } from '@tanstack/react-query';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

export function useSolBalance() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();

  return useQuery({
    queryKey: ['solBalance', publicKey?.toBase58()],
    queryFn: async () => {
      if (!publicKey) throw new Error('Wallet not connected');

      const balance = await connection.getBalance(publicKey, 'confirmed');
      return {
        lamports: balance,
        sol: balance / LAMPORTS_PER_SOL,
      };
    },
    enabled: !!publicKey,
    staleTime: 1000 * 10, // 10 seconds
    refetchInterval: 1000 * 30, // 30 seconds
  });
}
```

### With Rent Calculation

```tsx
// hooks/useSolBalanceWithRent.ts
export function useSolBalanceWithRent() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();

  return useQuery({
    queryKey: ['solBalance', 'withRent', publicKey?.toBase58()],
    queryFn: async () => {
      if (!publicKey) throw new Error('Wallet not connected');

      const [balance, rentExempt] = await Promise.all([
        connection.getBalance(publicKey, 'confirmed'),
        connection.getMinimumBalanceForRentExemption(0),
      ]);

      const availableBalance = Math.max(0, balance - rentExempt);

      return {
        total: balance / LAMPORTS_PER_SOL,
        available: availableBalance / LAMPORTS_PER_SOL,
        rentReserve: rentExempt / LAMPORTS_PER_SOL,
      };
    },
    enabled: !!publicKey,
    staleTime: 1000 * 30,
  });
}
```

---

## Token Balances

### All Token Balances

```tsx
// hooks/useTokenBalances.ts
import { useQuery } from '@tanstack/react-query';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, AccountLayout } from '@solana/spl-token';
import { PublicKey } from '@solana/web3.js';

export interface TokenBalance {
  mint: string;
  address: string;
  amount: bigint;
  decimals: number;
  uiAmount: number;
  programId: string;
}

export function useTokenBalances() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();

  return useQuery({
    queryKey: ['tokenBalances', publicKey?.toBase58()],
    queryFn: async (): Promise<TokenBalance[]> => {
      if (!publicKey) throw new Error('Wallet not connected');

      // Fetch from both token programs
      const [splAccounts, token2022Accounts] = await Promise.all([
        connection.getTokenAccountsByOwner(publicKey, {
          programId: TOKEN_PROGRAM_ID,
        }),
        connection.getTokenAccountsByOwner(publicKey, {
          programId: TOKEN_2022_PROGRAM_ID,
        }),
      ]);

      const allAccounts = [
        ...splAccounts.value.map((a) => ({ ...a, programId: TOKEN_PROGRAM_ID })),
        ...token2022Accounts.value.map((a) => ({ ...a, programId: TOKEN_2022_PROGRAM_ID })),
      ];

      // Parse account data
      const balances: TokenBalance[] = [];

      for (const { pubkey, account, programId } of allAccounts) {
        try {
          const data = AccountLayout.decode(account.data);

          // Skip zero balances
          if (data.amount === BigInt(0)) continue;

          balances.push({
            mint: new PublicKey(data.mint).toBase58(),
            address: pubkey.toBase58(),
            amount: data.amount,
            decimals: 0, // Will be enriched later
            uiAmount: 0,
            programId: programId.toBase58(),
          });
        } catch (e) {
          console.warn('Failed to parse token account:', pubkey.toBase58(), e);
        }
      }

      return balances;
    },
    enabled: !!publicKey,
    staleTime: 1000 * 30,
  });
}
```

### Specific Token Balance

```tsx
// hooks/useTokenBalance.ts
import { useQuery } from '@tanstack/react-query';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { getAssociatedTokenAddress, getAccount, getMint } from '@solana/spl-token';
import { PublicKey } from '@solana/web3.js';

interface TokenBalanceResult {
  balance: number;
  uiBalance: string;
  decimals: number;
  hasAccount: boolean;
}

export function useTokenBalance(
  mintAddress: string | PublicKey | null,
  options?: { refetchInterval?: number }
) {
  const { connection } = useConnection();
  const { publicKey } = useWallet();

  const mintString = mintAddress
    ? typeof mintAddress === 'string'
      ? mintAddress
      : mintAddress.toBase58()
    : null;

  return useQuery({
    queryKey: ['tokenBalance', publicKey?.toBase58(), mintString],
    queryFn: async (): Promise<TokenBalanceResult> => {
      if (!publicKey || !mintString) {
        throw new Error('Missing wallet or mint');
      }

      const mint = new PublicKey(mintString);
      const ata = await getAssociatedTokenAddress(mint, publicKey);

      try {
        const [tokenAccount, mintInfo] = await Promise.all([
          getAccount(connection, ata),
          getMint(connection, mint),
        ]);

        const balance = Number(tokenAccount.amount) / Math.pow(10, mintInfo.decimals);

        return {
          balance,
          uiBalance: balance.toLocaleString(undefined, {
            maximumFractionDigits: mintInfo.decimals,
          }),
          decimals: mintInfo.decimals,
          hasAccount: true,
        };
      } catch (e) {
        // Account doesn't exist
        const mintInfo = await getMint(connection, mint);
        return {
          balance: 0,
          uiBalance: '0',
          decimals: mintInfo.decimals,
          hasAccount: false,
        };
      }
    },
    enabled: !!publicKey && !!mintString,
    staleTime: 1000 * 10,
    refetchInterval: options?.refetchInterval,
  });
}
```

### Enriched Token Balances with Metadata

```tsx
// hooks/useEnrichedTokenBalances.ts
import { useQuery } from '@tanstack/react-query';
import { useTokenBalances } from './useTokenBalances';

interface EnrichedTokenBalance {
  mint: string;
  address: string;
  symbol: string;
  name: string;
  logo?: string;
  balance: number;
  uiBalance: string;
  decimals: number;
  usdValue?: number;
  usdPrice?: number;
}

export function useEnrichedTokenBalances() {
  const { data: rawBalances, isLoading: balancesLoading } = useTokenBalances();

  return useQuery({
    queryKey: ['enrichedTokenBalances', rawBalances?.map((b) => b.mint)],
    queryFn: async (): Promise<EnrichedTokenBalance[]> => {
      if (!rawBalances || rawBalances.length === 0) return [];

      const mints = rawBalances.map((b) => b.mint);

      // Fetch metadata and prices in parallel
      const [metadata, prices, mintInfos] = await Promise.all([
        fetchTokenMetadataBatch(mints),
        fetchTokenPrices(mints),
        fetchMintInfoBatch(mints),
      ]);

      return rawBalances.map((balance) => {
        const meta = metadata[balance.mint];
        const price = prices[balance.mint];
        const mintInfo = mintInfos[balance.mint];
        const decimals = mintInfo?.decimals ?? 0;
        const uiBalance = Number(balance.amount) / Math.pow(10, decimals);

        return {
          mint: balance.mint,
          address: balance.address,
          symbol: meta?.symbol ?? 'Unknown',
          name: meta?.name ?? 'Unknown Token',
          logo: meta?.logo,
          balance: uiBalance,
          uiBalance: formatTokenAmount(uiBalance, decimals),
          decimals,
          usdPrice: price,
          usdValue: price ? uiBalance * price : undefined,
        };
      });
    },
    enabled: !!rawBalances && rawBalances.length > 0,
    staleTime: 1000 * 60, // 1 minute
  });
}
```

---

## Wallet Context

### Comprehensive Wallet Context

```tsx
// contexts/WalletStateContext.tsx
'use client';

import { createContext, useContext, useMemo, ReactNode, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useQueryClient } from '@tanstack/react-query';
import { useSolBalance } from '@/hooks/useSolBalance';
import { useEnrichedTokenBalances } from '@/hooks/useEnrichedTokenBalances';

interface WalletStateContextValue {
  // Connection state
  isConnected: boolean;
  address: string | null;

  // SOL balance
  solBalance: number;
  solBalanceLoading: boolean;

  // Token balances
  tokenBalances: EnrichedTokenBalance[];
  tokenBalancesLoading: boolean;
  getTokenBalance: (mint: string) => EnrichedTokenBalance | undefined;

  // Total portfolio value
  totalUsdValue: number;

  // Refresh functions
  refreshSolBalance: () => void;
  refreshTokenBalances: () => void;
  refreshAll: () => void;
}

const WalletStateContext = createContext<WalletStateContextValue | null>(null);

export function WalletStateProvider({ children }: { children: ReactNode }) {
  const { publicKey, connected } = useWallet();
  const queryClient = useQueryClient();

  const { data: solData, isLoading: solLoading, refetch: refetchSol } = useSolBalance();
  const { data: tokenData, isLoading: tokensLoading, refetch: refetchTokens } = useEnrichedTokenBalances();

  const getTokenBalance = useCallback(
    (mint: string) => tokenData?.find((t) => t.mint === mint),
    [tokenData]
  );

  const totalUsdValue = useMemo(() => {
    const solValue = (solData?.sol ?? 0) * (getSolPrice() ?? 0);
    const tokenValue = (tokenData ?? []).reduce(
      (sum, t) => sum + (t.usdValue ?? 0),
      0
    );
    return solValue + tokenValue;
  }, [solData, tokenData]);

  const refreshSolBalance = useCallback(() => {
    refetchSol();
  }, [refetchSol]);

  const refreshTokenBalances = useCallback(() => {
    refetchTokens();
  }, [refetchTokens]);

  const refreshAll = useCallback(() => {
    queryClient.invalidateQueries({
      predicate: (query) =>
        query.queryKey[0] === 'solBalance' ||
        query.queryKey[0] === 'tokenBalances' ||
        query.queryKey[0] === 'enrichedTokenBalances',
    });
  }, [queryClient]);

  const value = useMemo(
    (): WalletStateContextValue => ({
      isConnected: connected,
      address: publicKey?.toBase58() ?? null,
      solBalance: solData?.sol ?? 0,
      solBalanceLoading: solLoading,
      tokenBalances: tokenData ?? [],
      tokenBalancesLoading: tokensLoading,
      getTokenBalance,
      totalUsdValue,
      refreshSolBalance,
      refreshTokenBalances,
      refreshAll,
    }),
    [
      connected,
      publicKey,
      solData,
      solLoading,
      tokenData,
      tokensLoading,
      getTokenBalance,
      totalUsdValue,
      refreshSolBalance,
      refreshTokenBalances,
      refreshAll,
    ]
  );

  return (
    <WalletStateContext.Provider value={value}>
      {children}
    </WalletStateContext.Provider>
  );
}

export function useWalletState() {
  const context = useContext(WalletStateContext);
  if (!context) {
    throw new Error('useWalletState must be used within WalletStateProvider');
  }
  return context;
}
```

### Usage

```tsx
function WalletDisplay() {
  const {
    isConnected,
    address,
    solBalance,
    tokenBalances,
    totalUsdValue,
    refreshAll,
  } = useWalletState();

  if (!isConnected) {
    return <ConnectWalletPrompt />;
  }

  return (
    <div>
      <h2>{truncateAddress(address!)}</h2>
      <p>{solBalance.toFixed(4)} SOL</p>
      <p>${totalUsdValue.toFixed(2)} USD</p>

      <button onClick={refreshAll}>Refresh</button>

      <TokenList tokens={tokenBalances} />
    </div>
  );
}
```

---

## Real-Time Updates

### WebSocket Balance Subscription

```tsx
// hooks/useRealtimeSolBalance.ts
import { useEffect, useState, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useQueryClient } from '@tanstack/react-query';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

export function useRealtimeSolBalance() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const queryClient = useQueryClient();
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    if (!publicKey) return;

    let subscriptionId: number;

    const subscribe = async () => {
      subscriptionId = connection.onAccountChange(
        publicKey,
        (accountInfo) => {
          const balance = accountInfo.lamports / LAMPORTS_PER_SOL;

          // Update React Query cache
          queryClient.setQueryData(['solBalance', publicKey.toBase58()], {
            lamports: accountInfo.lamports,
            sol: balance,
          });
        },
        'confirmed'
      );

      setIsSubscribed(true);
    };

    subscribe();

    return () => {
      if (subscriptionId !== undefined) {
        connection.removeAccountChangeListener(subscriptionId);
        setIsSubscribed(false);
      }
    };
  }, [connection, publicKey, queryClient]);

  return { isSubscribed };
}
```

### Token Account Subscription

```tsx
// hooks/useRealtimeTokenBalance.ts
import { useEffect, useRef } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useQueryClient } from '@tanstack/react-query';
import { getAssociatedTokenAddress, AccountLayout } from '@solana/spl-token';
import { PublicKey } from '@solana/web3.js';

export function useRealtimeTokenBalance(mintAddress: string) {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<number | null>(null);

  useEffect(() => {
    if (!publicKey || !mintAddress) return;

    const subscribe = async () => {
      const mint = new PublicKey(mintAddress);
      const ata = await getAssociatedTokenAddress(mint, publicKey);

      subscriptionRef.current = connection.onAccountChange(
        ata,
        (accountInfo) => {
          try {
            const data = AccountLayout.decode(accountInfo.data);

            queryClient.setQueryData(
              ['tokenBalance', publicKey.toBase58(), mintAddress],
              (old: any) => ({
                ...old,
                amount: data.amount,
              })
            );
          } catch (e) {
            console.warn('Failed to parse token account update:', e);
          }
        },
        'confirmed'
      );
    };

    subscribe();

    return () => {
      if (subscriptionRef.current !== null) {
        connection.removeAccountChangeListener(subscriptionRef.current);
      }
    };
  }, [connection, publicKey, mintAddress, queryClient]);
}
```

### Batch Subscription Manager

```tsx
// hooks/useBalanceSubscriptions.ts
import { useEffect, useRef, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useQueryClient } from '@tanstack/react-query';
import { PublicKey } from '@solana/web3.js';

export function useBalanceSubscriptions(mintAddresses: string[]) {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const queryClient = useQueryClient();
  const subscriptionsRef = useRef<Map<string, number>>(new Map());

  const subscribe = useCallback(async (mint: string) => {
    if (!publicKey) return;
    if (subscriptionsRef.current.has(mint)) return;

    const ata = await getAssociatedTokenAddress(new PublicKey(mint), publicKey);

    const id = connection.onAccountChange(
      ata,
      (accountInfo) => {
        const data = AccountLayout.decode(accountInfo.data);
        queryClient.setQueryData(
          ['tokenBalance', publicKey.toBase58(), mint],
          (old: any) => ({ ...old, amount: data.amount })
        );
      },
      'confirmed'
    );

    subscriptionsRef.current.set(mint, id);
  }, [connection, publicKey, queryClient]);

  const unsubscribe = useCallback((mint: string) => {
    const id = subscriptionsRef.current.get(mint);
    if (id !== undefined) {
      connection.removeAccountChangeListener(id);
      subscriptionsRef.current.delete(mint);
    }
  }, [connection]);

  useEffect(() => {
    mintAddresses.forEach(subscribe);

    // Cleanup removed mints
    subscriptionsRef.current.forEach((_, mint) => {
      if (!mintAddresses.includes(mint)) {
        unsubscribe(mint);
      }
    });

    return () => {
      subscriptionsRef.current.forEach((id) => {
        connection.removeAccountChangeListener(id);
      });
      subscriptionsRef.current.clear();
    };
  }, [mintAddresses, subscribe, unsubscribe, connection]);
}
```

---

## Refresh Patterns

### Manual Refresh with Loading State

```tsx
// hooks/useRefreshableBalance.ts
import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useWallet } from '@solana/wallet-adapter-react';

export function useRefreshableBalance() {
  const { publicKey } = useWallet();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    if (!publicKey) return;

    setIsRefreshing(true);

    try {
      await queryClient.invalidateQueries({
        queryKey: ['solBalance', publicKey.toBase58()],
      });
      await queryClient.invalidateQueries({
        queryKey: ['tokenBalances', publicKey.toBase58()],
      });

      // Wait for refetch to complete
      await queryClient.refetchQueries({
        queryKey: ['solBalance', publicKey.toBase58()],
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [publicKey, queryClient]);

  return { refresh, isRefreshing };
}
```

### Post-Transaction Refresh

```tsx
// hooks/useTransactionWithRefresh.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';

interface TransactionOptions {
  affectedMints?: string[];
  refreshDelay?: number;
}

export function useTransactionWithRefresh(options: TransactionOptions = {}) {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (transaction: Transaction) => {
      if (!publicKey || !signTransaction) {
        throw new Error('Wallet not connected');
      }

      const signed = await signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signed.serialize());

      // Wait for confirmation with same commitment as future queries
      await connection.confirmTransaction(signature, 'confirmed');

      return signature;
    },
    onSuccess: async () => {
      // Small delay to ensure RPC has updated state
      if (options.refreshDelay) {
        await new Promise((r) => setTimeout(r, options.refreshDelay));
      }

      // Invalidate SOL balance
      await queryClient.invalidateQueries({
        queryKey: ['solBalance', publicKey?.toBase58()],
      });

      // Invalidate affected token balances
      for (const mint of options.affectedMints ?? []) {
        await queryClient.invalidateQueries({
          queryKey: ['tokenBalance', publicKey?.toBase58(), mint],
        });
      }

      // Invalidate token list
      await queryClient.invalidateQueries({
        queryKey: ['tokenBalances', publicKey?.toBase58()],
      });
    },
  });
}
```

---

## Best Practices

### 1. Match Commitment Levels

```tsx
// Always use the same commitment for sending and querying
const COMMITMENT = 'confirmed';

// Send with confirmed
await connection.confirmTransaction(signature, COMMITMENT);

// Query with confirmed
const balance = await connection.getBalance(publicKey, COMMITMENT);
```

### 2. Graceful Degradation

```tsx
function BalanceDisplay() {
  const { solBalance, solBalanceLoading, isConnected } = useWalletState();

  if (!isConnected) {
    return <span>--.--</span>;
  }

  if (solBalanceLoading) {
    return <Skeleton width={80} />;
  }

  return <span>{solBalance.toFixed(4)} SOL</span>;
}
```

### 3. Avoid Subscription Leaks

```tsx
// Always clean up subscriptions
useEffect(() => {
  const id = connection.onAccountChange(publicKey, callback);

  return () => {
    connection.removeAccountChangeListener(id);
  };
}, [connection, publicKey]);
```

### 4. Batch Refreshes

```tsx
// Batch related invalidations
const refreshAfterTransaction = async () => {
  await queryClient.invalidateQueries({
    predicate: (query) => {
      const key = query.queryKey;
      return (
        key[0] === 'solBalance' ||
        key[0] === 'tokenBalances' ||
        key[0] === 'tokenBalance'
      ) && key[1] === publicKey?.toBase58();
    },
  });
};
```

---

## External Resources

- [Solana Token Program](https://spl.solana.com/token)
- [SPL Token JS Library](https://github.com/solana-labs/solana-program-library/tree/master/token/js)
- [TanStack Query Optimistic Updates](https://tanstack.com/query/latest/docs/react/guides/optimistic-updates)
