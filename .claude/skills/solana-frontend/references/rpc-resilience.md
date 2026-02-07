# RPC Resilience

Patterns for handling RPC rate limits, failures, and implementing fallback strategies for reliable Solana dApp operation.

## Table of Contents

1. [Rate Limiting](#rate-limiting)
2. [Fallback RPC Providers](#fallback-rpc-providers)
3. [Request Retry Logic](#request-retry-logic)
4. [Connection Health Monitoring](#connection-health-monitoring)
5. [Best Practices](#best-practices)

---

## Rate Limiting

### Understanding Rate Limits

| Provider | Free Tier Limits | Notes |
|----------|-----------------|-------|
| Public RPC | ~10 req/s | Frequently throttled |
| Helius | 100-1000 req/s | Depends on plan |
| QuickNode | Varies by plan | Dedicated nodes available |
| Triton | High throughput | Enterprise focus |

### Request Throttling

```tsx
// lib/rpc/throttle.ts
class RequestThrottle {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  private requestsThisSecond = 0;
  private lastSecondStart = Date.now();
  private maxRequestsPerSecond: number;

  constructor(maxRequestsPerSecond = 10) {
    this.maxRequestsPerSecond = maxRequestsPerSecond;
  }

  async add<T>(request: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          resolve(await request());
        } catch (error) {
          reject(error);
        }
      });
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const now = Date.now();

      // Reset counter every second
      if (now - this.lastSecondStart >= 1000) {
        this.requestsThisSecond = 0;
        this.lastSecondStart = now;
      }

      // Wait if at limit
      if (this.requestsThisSecond >= this.maxRequestsPerSecond) {
        const waitTime = 1000 - (now - this.lastSecondStart);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        continue;
      }

      const request = this.queue.shift();
      if (request) {
        this.requestsThisSecond++;
        await request();
      }
    }

    this.processing = false;
  }
}

export const rpcThrottle = new RequestThrottle(10);
```

### Throttled Connection Wrapper

```tsx
// lib/rpc/throttledConnection.ts
import { Connection, PublicKey, AccountInfo, GetProgramAccountsFilter } from '@solana/web3.js';
import { rpcThrottle } from './throttle';

export class ThrottledConnection {
  private connection: Connection;

  constructor(endpoint: string) {
    this.connection = new Connection(endpoint, 'confirmed');
  }

  async getBalance(address: PublicKey): Promise<number> {
    return rpcThrottle.add(() => this.connection.getBalance(address));
  }

  async getAccountInfo(address: PublicKey): Promise<AccountInfo<Buffer> | null> {
    return rpcThrottle.add(() => this.connection.getAccountInfo(address));
  }

  async getProgramAccounts(
    programId: PublicKey,
    filters?: GetProgramAccountsFilter[]
  ) {
    return rpcThrottle.add(() =>
      this.connection.getProgramAccounts(programId, { filters })
    );
  }

  // Expose underlying connection for operations that need it
  get raw(): Connection {
    return this.connection;
  }
}
```

---

## Fallback RPC Providers

### Multi-Provider Connection

```tsx
// lib/rpc/multiConnection.ts
import { Connection, ConnectionConfig } from '@solana/web3.js';

interface RPCProvider {
  url: string;
  weight: number; // Priority weight (higher = preferred)
  maxRetries: number;
}

export class MultiProviderConnection {
  private providers: RPCProvider[];
  private currentIndex = 0;
  private failureCounts: Map<string, number> = new Map();

  constructor(providers: RPCProvider[]) {
    // Sort by weight descending
    this.providers = [...providers].sort((a, b) => b.weight - a.weight);
  }

  private getConnection(): Connection {
    const provider = this.providers[this.currentIndex];
    return new Connection(provider.url, 'confirmed');
  }

  private markFailure(url: string) {
    const current = this.failureCounts.get(url) || 0;
    this.failureCounts.set(url, current + 1);

    // If too many failures, try next provider
    const provider = this.providers[this.currentIndex];
    if (current + 1 >= provider.maxRetries) {
      this.switchToNext();
    }
  }

  private switchToNext() {
    this.currentIndex = (this.currentIndex + 1) % this.providers.length;
    console.log(`Switching to RPC: ${this.providers[this.currentIndex].url}`);
  }

  async request<T>(operation: (connection: Connection) => Promise<T>): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.providers.length; attempt++) {
      const connection = this.getConnection();
      const provider = this.providers[this.currentIndex];

      try {
        const result = await operation(connection);
        // Success - reset failure count
        this.failureCounts.set(provider.url, 0);
        return result;
      } catch (error: any) {
        lastError = error;
        this.markFailure(provider.url);

        // Check if it's a rate limit error
        if (this.isRateLimitError(error)) {
          console.warn(`Rate limited on ${provider.url}, switching provider`);
          this.switchToNext();
        }
      }
    }

    throw lastError || new Error('All RPC providers failed');
  }

  private isRateLimitError(error: any): boolean {
    const message = error.message?.toLowerCase() || '';
    return (
      message.includes('429') ||
      message.includes('rate limit') ||
      message.includes('too many requests')
    );
  }
}

// Usage
const multiConnection = new MultiProviderConnection([
  { url: 'https://api.mainnet-beta.solana.com', weight: 1, maxRetries: 3 },
  { url: 'https://mainnet.helius-rpc.com/?api-key=KEY', weight: 10, maxRetries: 5 },
  { url: 'https://solana-mainnet.rpc.extrnode.com', weight: 5, maxRetries: 3 },
]);
```

### Connection Context with Fallback

```tsx
// contexts/ResilientConnectionContext.tsx
'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  ReactNode,
} from 'react';
import { Connection } from '@solana/web3.js';

interface ResilientConnectionContextValue {
  connection: Connection;
  currentEndpoint: string;
  isHealthy: boolean;
  switchEndpoint: (endpoint: string) => void;
}

const ENDPOINTS = [
  process.env.NEXT_PUBLIC_RPC_URL_PRIMARY!,
  process.env.NEXT_PUBLIC_RPC_URL_SECONDARY!,
  'https://api.mainnet-beta.solana.com',
];

const ResilientConnectionContext = createContext<ResilientConnectionContextValue | null>(
  null
);

export function ResilientConnectionProvider({ children }: { children: ReactNode }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHealthy, setIsHealthy] = useState(true);

  const currentEndpoint = ENDPOINTS[currentIndex];
  const connection = useMemo(
    () => new Connection(currentEndpoint, 'confirmed'),
    [currentEndpoint]
  );

  const switchEndpoint = useCallback((endpoint: string) => {
    const index = ENDPOINTS.indexOf(endpoint);
    if (index !== -1) {
      setCurrentIndex(index);
    }
  }, []);

  const switchToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % ENDPOINTS.length);
  }, []);

  // Health check
  useEffect(() => {
    const checkHealth = async () => {
      try {
        await connection.getSlot();
        setIsHealthy(true);
      } catch (error) {
        setIsHealthy(false);
        console.warn(`RPC unhealthy: ${currentEndpoint}`);
        switchToNext();
      }
    };

    const interval = setInterval(checkHealth, 30000);
    checkHealth();

    return () => clearInterval(interval);
  }, [connection, currentEndpoint, switchToNext]);

  const value = useMemo(
    () => ({
      connection,
      currentEndpoint,
      isHealthy,
      switchEndpoint,
    }),
    [connection, currentEndpoint, isHealthy, switchEndpoint]
  );

  return (
    <ResilientConnectionContext.Provider value={value}>
      {children}
    </ResilientConnectionContext.Provider>
  );
}

export function useResilientConnection() {
  const context = useContext(ResilientConnectionContext);
  if (!context) {
    throw new Error(
      'useResilientConnection must be used within ResilientConnectionProvider'
    );
  }
  return context;
}
```

---

## Request Retry Logic

### Retry with Exponential Backoff

```tsx
// lib/rpc/retry.ts
interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryOn?: (error: any) => boolean;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryOn: () => true,
};

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | null = null;
  let delay = opts.initialDelay;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;

      // Check if we should retry this error
      if (!opts.retryOn(error)) {
        throw error;
      }

      // Don't wait after last attempt
      if (attempt < opts.maxRetries) {
        console.warn(
          `Attempt ${attempt + 1} failed, retrying in ${delay}ms:`,
          error.message
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelay);
      }
    }
  }

  throw lastError || new Error('All retries failed');
}

// Determine if error is retryable
export function isRetryableError(error: any): boolean {
  const message = error.message?.toLowerCase() || '';

  // Rate limits
  if (message.includes('429') || message.includes('rate limit')) {
    return true;
  }

  // Network errors
  if (
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('econnrefused')
  ) {
    return true;
  }

  // Blockhash errors (get new blockhash and retry)
  if (message.includes('blockhash not found')) {
    return true;
  }

  // Server errors
  if (message.includes('500') || message.includes('502') || message.includes('503')) {
    return true;
  }

  return false;
}
```

### Retry Hook

```tsx
// hooks/useRetryableQuery.ts
import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { withRetry, isRetryableError } from '@/lib/rpc/retry';

export function useRetryableQuery<T>(
  queryKey: string[],
  queryFn: () => Promise<T>,
  options?: Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey,
    queryFn: () =>
      withRetry(queryFn, {
        maxRetries: 3,
        retryOn: isRetryableError,
      }),
    retry: false, // We handle retries ourselves
    ...options,
  });
}
```

### Transaction Retry

```tsx
// lib/transaction/sendWithRetry.ts
import { Connection, Transaction, Signer } from '@solana/web3.js';
import { withRetry, isRetryableError } from '@/lib/rpc/retry';

interface SendOptions {
  connection: Connection;
  transaction: Transaction;
  signers: Signer[];
  maxRetries?: number;
}

export async function sendTransactionWithRetry({
  connection,
  transaction,
  signers,
  maxRetries = 3,
}: SendOptions): Promise<string> {
  return withRetry(
    async () => {
      // Get fresh blockhash for each attempt
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash();

      transaction.recentBlockhash = blockhash;
      transaction.feePayer = signers[0].publicKey;

      // Sign
      transaction.sign(...signers);

      // Send
      const signature = await connection.sendRawTransaction(
        transaction.serialize(),
        { skipPreflight: false }
      );

      // Confirm
      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      });

      return signature;
    },
    {
      maxRetries,
      retryOn: (error) => {
        // Don't retry user rejections
        if (error.message?.includes('User rejected')) {
          return false;
        }
        // Don't retry program errors
        if (error.message?.includes('custom program error')) {
          return false;
        }
        return isRetryableError(error);
      },
    }
  );
}
```

---

## Connection Health Monitoring

### Health Check Hook

```tsx
// hooks/useConnectionHealth.ts
import { useState, useEffect, useCallback } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';

interface ConnectionHealth {
  isHealthy: boolean;
  latency: number | null;
  slot: number | null;
  lastChecked: Date | null;
  error: string | null;
}

export function useConnectionHealth(checkInterval = 30000) {
  const { connection } = useConnection();
  const [health, setHealth] = useState<ConnectionHealth>({
    isHealthy: true,
    latency: null,
    slot: null,
    lastChecked: null,
    error: null,
  });

  const checkHealth = useCallback(async () => {
    const startTime = Date.now();

    try {
      const slot = await connection.getSlot();
      const latency = Date.now() - startTime;

      setHealth({
        isHealthy: true,
        latency,
        slot,
        lastChecked: new Date(),
        error: null,
      });
    } catch (error: any) {
      setHealth((prev) => ({
        ...prev,
        isHealthy: false,
        lastChecked: new Date(),
        error: error.message,
      }));
    }
  }, [connection]);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, checkInterval);
    return () => clearInterval(interval);
  }, [checkHealth, checkInterval]);

  return { ...health, refresh: checkHealth };
}
```

### Health Indicator Component

```tsx
// components/ConnectionHealthIndicator.tsx
import { useConnectionHealth } from '@/hooks/useConnectionHealth';

export function ConnectionHealthIndicator() {
  const { isHealthy, latency, slot, error } = useConnectionHealth();

  return (
    <div className="flex items-center gap-2 text-sm">
      <div
        className={`w-2 h-2 rounded-full ${
          isHealthy ? 'bg-green-500' : 'bg-red-500'
        }`}
      />
      {isHealthy ? (
        <span className="text-gray-600">
          {latency}ms · Slot {slot?.toLocaleString()}
        </span>
      ) : (
        <span className="text-red-600">Connection issue: {error}</span>
      )}
    </div>
  );
}
```

### Automatic Endpoint Switching

```tsx
// hooks/useAutoSwitchEndpoint.ts
import { useEffect, useRef } from 'react';
import { useConnectionHealth } from './useConnectionHealth';
import { useResilientConnection } from '@/contexts/ResilientConnectionContext';

const FAILURE_THRESHOLD = 3;
const RECOVERY_TIMEOUT = 60000; // 1 minute

export function useAutoSwitchEndpoint() {
  const { isHealthy, error } = useConnectionHealth(10000);
  const { currentEndpoint, switchEndpoint } = useResilientConnection();
  const failureCount = useRef(0);
  const lastSwitch = useRef(0);

  useEffect(() => {
    if (!isHealthy) {
      failureCount.current++;

      // Switch if too many failures and enough time since last switch
      const timeSinceSwitch = Date.now() - lastSwitch.current;
      if (
        failureCount.current >= FAILURE_THRESHOLD &&
        timeSinceSwitch > RECOVERY_TIMEOUT
      ) {
        console.warn('Too many failures, switching endpoint');
        // Implementation depends on available endpoints
        lastSwitch.current = Date.now();
        failureCount.current = 0;
      }
    } else {
      // Reset on success
      failureCount.current = 0;
    }
  }, [isHealthy, error]);
}
```

---

## Best Practices

### 1. Use Multiple RPC Providers

```tsx
// Always have fallbacks
const ENDPOINTS = [
  process.env.NEXT_PUBLIC_PRIMARY_RPC,
  process.env.NEXT_PUBLIC_SECONDARY_RPC,
  'https://api.mainnet-beta.solana.com', // Last resort
];
```

### 2. Implement Request Queuing

```tsx
// Prevent overwhelming the RPC
const queue = new RequestQueue({ maxConcurrent: 10 });
await queue.add(() => connection.getBalance(address));
```

### 3. Cache Aggressively

```tsx
// Reduce RPC calls with proper caching
useQuery({
  queryKey: ['balance', address],
  queryFn: fetchBalance,
  staleTime: 1000 * 10, // 10 seconds
  gcTime: 1000 * 60 * 5, // 5 minutes
});
```

### 4. Handle Errors Gracefully

```tsx
// Don't crash on RPC errors
try {
  const balance = await connection.getBalance(address);
} catch (error) {
  if (isRateLimitError(error)) {
    showToast('Rate limited, please wait...');
  } else {
    showToast('Network error, retrying...');
  }
}
```

### 5. Monitor RPC Health

```tsx
// Show users when there are issues
{!isHealthy && (
  <Banner variant="warning">
    Network connection unstable. Some features may be slow.
  </Banner>
)}
```

### 6. Use Dedicated RPC for Critical Operations

```tsx
// Transactions need reliable RPC
const transactionConnection = new Connection(PREMIUM_RPC_URL);
// Read operations can use cheaper/free RPC
const readConnection = new Connection(FREE_RPC_URL);
```

---

## External Resources

- [Helius RPC](https://www.helius.dev/)
- [QuickNode Solana](https://www.quicknode.com/chains/sol)
- [Triton RPC](https://triton.one/)
- [Solana RPC Best Practices](https://solana.com/docs/rpc)
