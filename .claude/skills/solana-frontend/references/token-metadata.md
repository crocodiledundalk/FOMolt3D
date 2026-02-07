# Token Metadata

Patterns for fetching, caching, and displaying token metadata including mints, decimals, symbols, logos, and prices.

## Table of Contents

1. [Token Data Sources](#token-data-sources)
2. [Metadata Fetching](#metadata-fetching)
3. [Token List Management](#token-list-management)
4. [Price Data](#price-data)
5. [Caching Strategies](#caching-strategies)

---

## Token Data Sources

### Primary Sources

```tsx
// lib/constants/tokenSources.ts

// Jupiter Token List - Most comprehensive for Solana
export const JUPITER_TOKEN_LIST_URL = 'https://token.jup.ag/all';
export const JUPITER_STRICT_TOKEN_LIST_URL = 'https://token.jup.ag/strict';

// Metaplex Token Metadata Program
export const TOKEN_METADATA_PROGRAM_ID = 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s';

// Common token addresses
export const NATIVE_SOL_MINT = 'So11111111111111111111111111111111111111112';
export const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
export const USDT_MINT = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB';
```

### Token Info Interface

```tsx
// types/token.ts
export interface TokenInfo {
  address: string;
  chainId: number;
  decimals: number;
  name: string;
  symbol: string;
  logoURI?: string;
  tags?: string[];
  extensions?: {
    coingeckoId?: string;
    website?: string;
    twitter?: string;
  };
}

export interface TokenMetadata {
  mint: string;
  name: string;
  symbol: string;
  decimals: number;
  logoURI?: string;
  price?: number;
  priceChange24h?: number;
}
```

---

## Metadata Fetching

### Jupiter Token List Hook

```tsx
// hooks/data/useTokenList.ts
import { useQuery } from '@tanstack/react-query';
import { TokenInfo } from '@/types/token';

const JUPITER_TOKEN_LIST_URL = 'https://token.jup.ag/strict';

export function useTokenList() {
  return useQuery({
    queryKey: ['tokenList', 'jupiter'],
    queryFn: async (): Promise<TokenInfo[]> => {
      const response = await fetch(JUPITER_TOKEN_LIST_URL);
      if (!response.ok) {
        throw new Error('Failed to fetch token list');
      }
      return response.json();
    },
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  });
}

// Hook to get a single token's info
export function useTokenInfo(mint: string | undefined) {
  const { data: tokenList } = useTokenList();

  return useQuery({
    queryKey: ['tokenInfo', mint],
    queryFn: () => {
      if (!tokenList || !mint) return null;
      return tokenList.find((t) => t.address === mint) || null;
    },
    enabled: !!tokenList && !!mint,
    staleTime: Infinity, // Token metadata rarely changes
  });
}
```

### On-Chain Metadata Fetching

```tsx
// hooks/data/useOnChainMetadata.ts
import { useQuery } from '@tanstack/react-query';
import { useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { Metaplex } from '@metaplex-foundation/js';

export function useOnChainMetadata(mint: string | undefined) {
  const { connection } = useConnection();

  return useQuery({
    queryKey: ['onChainMetadata', mint],
    queryFn: async () => {
      if (!mint) throw new Error('No mint');

      const metaplex = Metaplex.make(connection);
      const mintPubkey = new PublicKey(mint);

      const nft = await metaplex.nfts().findByMint({ mintAddress: mintPubkey });

      return {
        name: nft.name,
        symbol: nft.symbol,
        uri: nft.uri,
        sellerFeeBasisPoints: nft.sellerFeeBasisPoints,
        creators: nft.creators,
        collection: nft.collection,
        image: nft.json?.image,
        attributes: nft.json?.attributes,
      };
    },
    enabled: !!mint,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}
```

### Mint Account Info

```tsx
// hooks/data/useMintInfo.ts
import { useQuery } from '@tanstack/react-query';
import { useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { getMint, Mint } from '@solana/spl-token';

export function useMintInfo(mintAddress: string | undefined) {
  const { connection } = useConnection();

  return useQuery({
    queryKey: ['mintInfo', mintAddress],
    queryFn: async (): Promise<Mint> => {
      if (!mintAddress) throw new Error('No mint address');
      const mint = new PublicKey(mintAddress);
      return getMint(connection, mint);
    },
    enabled: !!mintAddress,
    staleTime: Infinity, // Mint info never changes
  });
}

// Get decimals specifically
export function useTokenDecimals(mintAddress: string | undefined) {
  const { data: mintInfo } = useMintInfo(mintAddress);
  return mintInfo?.decimals;
}
```

---

## Token List Management

### Token Registry Context

```tsx
// contexts/TokenRegistryContext.tsx
'use client';

import { createContext, useContext, useMemo, ReactNode } from 'react';
import { useTokenList } from '@/hooks/data/useTokenList';
import { TokenInfo } from '@/types/token';

interface TokenRegistryContextValue {
  tokens: TokenInfo[];
  tokensByMint: Map<string, TokenInfo>;
  getToken: (mint: string) => TokenInfo | undefined;
  searchTokens: (query: string) => TokenInfo[];
  isLoading: boolean;
}

const TokenRegistryContext = createContext<TokenRegistryContextValue | null>(null);

export function TokenRegistryProvider({ children }: { children: ReactNode }) {
  const { data: tokens = [], isLoading } = useTokenList();

  const tokensByMint = useMemo(() => {
    const map = new Map<string, TokenInfo>();
    tokens.forEach((token) => {
      map.set(token.address, token);
    });
    return map;
  }, [tokens]);

  const getToken = (mint: string) => tokensByMint.get(mint);

  const searchTokens = (query: string): TokenInfo[] => {
    if (!query) return tokens.slice(0, 20); // Return top tokens
    const lower = query.toLowerCase();
    return tokens.filter(
      (t) =>
        t.symbol.toLowerCase().includes(lower) ||
        t.name.toLowerCase().includes(lower) ||
        t.address === query
    );
  };

  const value = useMemo(
    () => ({
      tokens,
      tokensByMint,
      getToken,
      searchTokens,
      isLoading,
    }),
    [tokens, tokensByMint, isLoading]
  );

  return (
    <TokenRegistryContext.Provider value={value}>
      {children}
    </TokenRegistryContext.Provider>
  );
}

export function useTokenRegistry() {
  const context = useContext(TokenRegistryContext);
  if (!context) {
    throw new Error('useTokenRegistry must be used within TokenRegistryProvider');
  }
  return context;
}
```

### Token Search Component

```tsx
// components/TokenSearch.tsx
import { useState, useMemo } from 'react';
import { useTokenRegistry } from '@/contexts/TokenRegistryContext';
import { TokenInfo } from '@/types/token';

interface TokenSearchProps {
  onSelect: (token: TokenInfo) => void;
  selectedMint?: string;
  excludeMints?: string[];
}

export function TokenSearch({ onSelect, selectedMint, excludeMints = [] }: TokenSearchProps) {
  const [query, setQuery] = useState('');
  const { searchTokens, getToken, isLoading } = useTokenRegistry();

  const selectedToken = selectedMint ? getToken(selectedMint) : undefined;

  const results = useMemo(() => {
    return searchTokens(query)
      .filter((t) => !excludeMints.includes(t.address))
      .slice(0, 10);
  }, [query, searchTokens, excludeMints]);

  if (isLoading) {
    return <div className="animate-pulse">Loading tokens...</div>;
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search token..."
        className="w-full px-4 py-2 border rounded-lg"
      />

      {query && (
        <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {results.map((token) => (
            <button
              key={token.address}
              onClick={() => {
                onSelect(token);
                setQuery('');
              }}
              className="w-full px-4 py-2 flex items-center gap-3 hover:bg-gray-50"
            >
              {token.logoURI && (
                <img
                  src={token.logoURI}
                  alt={token.symbol}
                  className="w-6 h-6 rounded-full"
                />
              )}
              <div className="text-left">
                <div className="font-medium">{token.symbol}</div>
                <div className="text-sm text-gray-500">{token.name}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Token Display Component

```tsx
// components/TokenDisplay.tsx
import { useTokenRegistry } from '@/contexts/TokenRegistryContext';

interface TokenDisplayProps {
  mint: string;
  showName?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const sizes = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
};

export function TokenDisplay({ mint, showName = false, size = 'md' }: TokenDisplayProps) {
  const { getToken } = useTokenRegistry();
  const token = getToken(mint);

  if (!token) {
    return (
      <div className="flex items-center gap-2">
        <div className={`${sizes[size]} rounded-full bg-gray-200`} />
        <span className="font-mono text-sm">
          {mint.slice(0, 4)}...{mint.slice(-4)}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {token.logoURI ? (
        <img
          src={token.logoURI}
          alt={token.symbol}
          className={`${sizes[size]} rounded-full`}
        />
      ) : (
        <div className={`${sizes[size]} rounded-full bg-gray-200 flex items-center justify-center`}>
          {token.symbol[0]}
        </div>
      )}
      <span className="font-medium">{token.symbol}</span>
      {showName && <span className="text-gray-500 text-sm">{token.name}</span>}
    </div>
  );
}
```

---

## Price Data

### Jupiter Price API

```tsx
// lib/api/prices.ts
const JUPITER_PRICE_API = 'https://api.jup.ag/price/v2';

export interface PriceData {
  id: string;
  type: string;
  price: string;
  extraInfo?: {
    lastSwappedPrice?: {
      lastJupiterSellAt: number;
      lastJupiterSellPrice: string;
      lastJupiterBuyAt: number;
      lastJupiterBuyPrice: string;
    };
    quotedPrice?: {
      buyPrice: string;
      buyAt: number;
      sellPrice: string;
      sellAt: number;
    };
  };
}

export async function fetchTokenPrices(
  mints: string[],
  vsToken: string = 'USDC'
): Promise<Record<string, PriceData>> {
  if (mints.length === 0) return {};

  const ids = mints.join(',');
  const response = await fetch(
    `${JUPITER_PRICE_API}?ids=${ids}&vsToken=${vsToken}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch prices');
  }

  const data = await response.json();
  return data.data;
}

// Fetch single token price
export async function fetchTokenPrice(mint: string): Promise<number | null> {
  const prices = await fetchTokenPrices([mint]);
  const priceData = prices[mint];
  return priceData ? parseFloat(priceData.price) : null;
}
```

### Price Hook

```tsx
// hooks/data/useTokenPrice.ts
import { useQuery, useQueries } from '@tanstack/react-query';
import { fetchTokenPrices } from '@/lib/api/prices';

export function useTokenPrice(mint: string | undefined) {
  return useQuery({
    queryKey: ['tokenPrice', mint],
    queryFn: async () => {
      if (!mint) throw new Error('No mint');
      const prices = await fetchTokenPrices([mint]);
      const priceData = prices[mint];
      return priceData ? parseFloat(priceData.price) : null;
    },
    enabled: !!mint,
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 60, // Refetch every minute
  });
}

export function useTokenPrices(mints: string[]) {
  return useQuery({
    queryKey: ['tokenPrices', mints.sort().join(',')],
    queryFn: async () => {
      if (mints.length === 0) return {};
      const prices = await fetchTokenPrices(mints);
      return Object.fromEntries(
        Object.entries(prices).map(([mint, data]) => [
          mint,
          parseFloat(data.price),
        ])
      );
    },
    enabled: mints.length > 0,
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 60,
  });
}
```

### Price Display Component

```tsx
// components/TokenPrice.tsx
import { useTokenPrice } from '@/hooks/data/useTokenPrice';
import { formatUsd } from '@/lib/formatters';

interface TokenPriceProps {
  mint: string;
  amount?: number; // Token amount to multiply by price
  showChange?: boolean;
}

export function TokenPrice({ mint, amount, showChange }: TokenPriceProps) {
  const { data: price, isLoading, error } = useTokenPrice(mint);

  if (isLoading) {
    return <span className="animate-pulse">$--</span>;
  }

  if (error || price === null) {
    return <span className="text-gray-400">--</span>;
  }

  const displayPrice = amount ? price * amount : price;

  return (
    <span className="font-mono">
      {formatUsd(displayPrice)}
    </span>
  );
}
```

### Portfolio Value Hook

```tsx
// hooks/data/usePortfolioValue.ts
import { useMemo } from 'react';
import { useTokenBalances } from './useTokenBalances';
import { useTokenPrices } from './useTokenPrice';

export function usePortfolioValue() {
  const { data: balances } = useTokenBalances();

  const mints = useMemo(() => {
    if (!balances) return [];
    return balances.map((b) => b.mint);
  }, [balances]);

  const { data: prices, isLoading } = useTokenPrices(mints);

  const value = useMemo(() => {
    if (!balances || !prices) return null;

    return balances.reduce((total, balance) => {
      const price = prices[balance.mint] || 0;
      return total + balance.uiAmount * price;
    }, 0);
  }, [balances, prices]);

  return {
    totalValue: value,
    isLoading,
    balancesWithPrices: balances?.map((b) => ({
      ...b,
      price: prices?.[b.mint] || 0,
      value: (prices?.[b.mint] || 0) * b.uiAmount,
    })),
  };
}
```

---

## Caching Strategies

### Query Key Factory

```tsx
// lib/queryKeys.ts
export const tokenQueryKeys = {
  all: ['token'] as const,
  list: () => [...tokenQueryKeys.all, 'list'] as const,
  info: (mint: string) => [...tokenQueryKeys.all, 'info', mint] as const,
  metadata: (mint: string) => [...tokenQueryKeys.all, 'metadata', mint] as const,
  mint: (address: string) => [...tokenQueryKeys.all, 'mint', address] as const,
  price: (mint: string) => [...tokenQueryKeys.all, 'price', mint] as const,
  prices: (mints: string[]) => [...tokenQueryKeys.all, 'prices', mints.sort().join(',')] as const,
};
```

### Prefetching Token Data

```tsx
// lib/prefetch.ts
import { QueryClient } from '@tanstack/react-query';
import { tokenQueryKeys } from './queryKeys';
import { fetchTokenPrices } from './api/prices';

export async function prefetchTokenPrices(
  queryClient: QueryClient,
  mints: string[]
) {
  await queryClient.prefetchQuery({
    queryKey: tokenQueryKeys.prices(mints),
    queryFn: () => fetchTokenPrices(mints),
    staleTime: 1000 * 30,
  });
}
```

### Local Storage Cache

```tsx
// lib/tokenCache.ts
const CACHE_KEY = 'token-metadata-cache';
const CACHE_VERSION = 1;
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

interface CacheEntry {
  data: TokenInfo;
  timestamp: number;
}

interface TokenCache {
  version: number;
  entries: Record<string, CacheEntry>;
}

export function getCachedTokenInfo(mint: string): TokenInfo | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const cache: TokenCache = JSON.parse(cached);
    if (cache.version !== CACHE_VERSION) return null;

    const entry = cache.entries[mint];
    if (!entry) return null;

    if (Date.now() - entry.timestamp > CACHE_TTL) {
      return null;
    }

    return entry.data;
  } catch {
    return null;
  }
}

export function setCachedTokenInfo(mint: string, data: TokenInfo): void {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    const cache: TokenCache = cached
      ? JSON.parse(cached)
      : { version: CACHE_VERSION, entries: {} };

    cache.entries[mint] = {
      data,
      timestamp: Date.now(),
    };

    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore cache errors
  }
}
```

---

## Best Practices

### 1. Use Jupiter Token List for Standard Tokens

```tsx
// Prefer Jupiter's curated list over on-chain fetching
const { getToken } = useTokenRegistry();
const tokenInfo = getToken(mintAddress);
```

### 2. Cache Aggressively

```tsx
// Token metadata rarely changes
staleTime: Infinity, // For mint info
staleTime: 1000 * 60 * 60, // 1 hour for metadata
```

### 3. Batch Price Requests

```tsx
// Fetch multiple prices in one request
const { data: prices } = useTokenPrices(allMints);
```

### 4. Handle Missing Metadata Gracefully

```tsx
// Always provide fallbacks
const symbol = token?.symbol || mint.slice(0, 4);
const logo = token?.logoURI || '/images/unknown-token.png';
```

### 5. Deduplicate Token Fetches

```tsx
// Use React Query's deduplication
// Same query key = same request
useTokenInfo(mint); // Called in multiple components, only one request
```

---

## External Resources

- [Jupiter Token List API](https://station.jup.ag/docs/token-list/token-list-api)
- [Jupiter Price API v2](https://station.jup.ag/docs/apis/price-api-v2)
- [Metaplex Token Metadata](https://developers.metaplex.com/token-metadata)
- [SPL Token](https://spl.solana.com/token)
