# RPC Connection Management

Guide for configuring Solana RPC connections, managing endpoints, and providing connection context throughout your application.

## Table of Contents

1. [RPC Providers](#rpc-providers)
2. [Connection Provider Setup](#connection-provider-setup)
3. [Connection Configuration](#connection-configuration)
4. [Multiple Endpoints](#multiple-endpoints)
5. [Custom Connection Hook](#custom-connection-hook)
6. [RPC Methods Reference](#rpc-methods-reference)

---

## RPC Providers

### Recommended Providers

| Provider | Free Tier | Best For | Features |
|----------|-----------|----------|----------|
| **Helius** | 100K credits/mo | Production apps | Priority fee API, enhanced RPC, webhooks |
| **QuickNode** | Limited | Enterprise | Global endpoints, add-ons |
| **Triton** | Limited | High performance | Dedicated infrastructure |
| **Alchemy** | 300M CU/mo | Multi-chain apps | Unified API |
| **Solana Public** | Free | Development | Rate limited, unreliable |

### Environment Configuration

```env
# .env.local

# Primary RPC (required)
NEXT_PUBLIC_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY

# Fallback RPCs (optional but recommended)
NEXT_PUBLIC_RPC_URL_FALLBACK_1=https://solana-mainnet.rpc.extrnode.com
NEXT_PUBLIC_RPC_URL_FALLBACK_2=https://api.mainnet-beta.solana.com

# WebSocket endpoint (for subscriptions)
NEXT_PUBLIC_WS_URL=wss://mainnet.helius-rpc.com/?api-key=YOUR_KEY

# Network
NEXT_PUBLIC_NETWORK=mainnet-beta  # or 'devnet'
```

---

## Connection Provider Setup

### Basic Setup

```tsx
// app/providers.tsx
'use client';

import { ConnectionProvider } from '@solana/wallet-adapter-react';
import { useMemo, ReactNode } from 'react';

interface ConnectionProviderProps {
  children: ReactNode;
}

export function SolanaConnectionProvider({ children }: ConnectionProviderProps) {
  const endpoint = useMemo(() => {
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;
    if (!rpcUrl) {
      console.warn('No RPC URL configured, using public endpoint');
      return 'https://api.mainnet-beta.solana.com';
    }
    return rpcUrl;
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      {children}
    </ConnectionProvider>
  );
}
```

### With Connection Config

```tsx
import { ConnectionProvider } from '@solana/wallet-adapter-react';
import { ConnectionConfig } from '@solana/web3.js';

export function SolanaConnectionProvider({ children }: { children: ReactNode }) {
  const endpoint = process.env.NEXT_PUBLIC_RPC_URL!;

  const config: ConnectionConfig = useMemo(() => ({
    commitment: 'confirmed',
    confirmTransactionInitialTimeout: 60000,
    disableRetryOnRateLimit: false,
    httpHeaders: {
      // Custom headers if needed
    },
  }), []);

  return (
    <ConnectionProvider endpoint={endpoint} config={config}>
      {children}
    </ConnectionProvider>
  );
}
```

---

## Connection Configuration

### ConnectionConfig Options

```tsx
import { Connection, ConnectionConfig, Commitment } from '@solana/web3.js';

const config: ConnectionConfig = {
  // Default commitment level for queries
  commitment: 'confirmed' as Commitment,

  // Timeout for confirming transactions (ms)
  confirmTransactionInitialTimeout: 60000,

  // Whether to throw on rate limit (429) responses
  disableRetryOnRateLimit: false,

  // Custom HTTP headers
  httpHeaders: {
    'X-Custom-Header': 'value',
  },

  // Custom fetch implementation
  fetch: customFetch,

  // WebSocket endpoint (different from HTTP)
  wsEndpoint: 'wss://mainnet.helius-rpc.com/?api-key=xxx',
};

const connection = new Connection(endpoint, config);
```

### Commitment Levels

| Level | Description | Use Case |
|-------|-------------|----------|
| `processed` | Just executed, may rollback | Fast UX, non-critical |
| `confirmed` | Voted on by supermajority | Most transactions |
| `finalized` | 31+ confirmations | Critical/financial |

```tsx
// Query with specific commitment
const balance = await connection.getBalance(publicKey, 'confirmed');

// Transaction with specific commitment
await connection.confirmTransaction(signature, 'confirmed');
```

---

## Multiple Endpoints

### Fallback Connection Context

```tsx
// contexts/ConnectionContext.tsx
'use client';

import { Connection } from '@solana/web3.js';
import { createContext, useContext, useMemo, ReactNode, useState, useCallback } from 'react';

interface ConnectionContextValue {
  connection: Connection;
  endpoint: string;
  switchEndpoint: (endpoint: string) => void;
  endpoints: string[];
}

const ConnectionContext = createContext<ConnectionContextValue | null>(null);

const DEFAULT_ENDPOINTS = [
  process.env.NEXT_PUBLIC_RPC_URL!,
  process.env.NEXT_PUBLIC_RPC_URL_FALLBACK_1!,
  process.env.NEXT_PUBLIC_RPC_URL_FALLBACK_2!,
].filter(Boolean);

export function ConnectionContextProvider({ children }: { children: ReactNode }) {
  const [endpointIndex, setEndpointIndex] = useState(0);

  const endpoint = DEFAULT_ENDPOINTS[endpointIndex] || DEFAULT_ENDPOINTS[0];

  const connection = useMemo(() => {
    return new Connection(endpoint, {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 60000,
    });
  }, [endpoint]);

  const switchEndpoint = useCallback((newEndpoint: string) => {
    const index = DEFAULT_ENDPOINTS.indexOf(newEndpoint);
    if (index !== -1) {
      setEndpointIndex(index);
    }
  }, []);

  const value = useMemo(() => ({
    connection,
    endpoint,
    switchEndpoint,
    endpoints: DEFAULT_ENDPOINTS,
  }), [connection, endpoint, switchEndpoint]);

  return (
    <ConnectionContext.Provider value={value}>
      {children}
    </ConnectionContext.Provider>
  );
}

export function useConnectionContext() {
  const context = useContext(ConnectionContext);
  if (!context) {
    throw new Error('useConnectionContext must be used within ConnectionContextProvider');
  }
  return context;
}
```

### Auto-Failover Connection

```tsx
// lib/connection.ts
import { Connection } from '@solana/web3.js';

class FailoverConnection {
  private endpoints: string[];
  private currentIndex: number = 0;
  private connection: Connection;
  private failureCount: Map<number, number> = new Map();
  private maxFailures: number = 3;

  constructor(endpoints: string[]) {
    this.endpoints = endpoints;
    this.connection = new Connection(endpoints[0], 'confirmed');
  }

  private rotateEndpoint(): void {
    this.currentIndex = (this.currentIndex + 1) % this.endpoints.length;
    this.connection = new Connection(this.endpoints[this.currentIndex], 'confirmed');
    console.log(`Switched to RPC endpoint: ${this.endpoints[this.currentIndex]}`);
  }

  private handleError(error: Error): void {
    const currentFailures = this.failureCount.get(this.currentIndex) || 0;
    this.failureCount.set(this.currentIndex, currentFailures + 1);

    if (currentFailures + 1 >= this.maxFailures) {
      this.rotateEndpoint();
    }
  }

  async executeWithFailover<T>(
    operation: (connection: Connection) => Promise<T>
  ): Promise<T> {
    const maxAttempts = this.endpoints.length;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const result = await operation(this.connection);
        // Reset failure count on success
        this.failureCount.set(this.currentIndex, 0);
        return result;
      } catch (error) {
        lastError = error as Error;

        // Check if it's a rate limit or connection error
        if (this.isRecoverableError(error)) {
          this.handleError(lastError);
        } else {
          throw error;
        }
      }
    }

    throw lastError || new Error('All RPC endpoints failed');
  }

  private isRecoverableError(error: any): boolean {
    const message = error?.message?.toLowerCase() || '';
    return (
      message.includes('429') ||
      message.includes('rate limit') ||
      message.includes('timeout') ||
      message.includes('econnrefused') ||
      message.includes('network')
    );
  }

  getConnection(): Connection {
    return this.connection;
  }

  getCurrentEndpoint(): string {
    return this.endpoints[this.currentIndex];
  }
}

// Singleton instance
let failoverConnection: FailoverConnection | null = null;

export function getFailoverConnection(): FailoverConnection {
  if (!failoverConnection) {
    const endpoints = [
      process.env.NEXT_PUBLIC_RPC_URL!,
      process.env.NEXT_PUBLIC_RPC_URL_FALLBACK_1!,
      process.env.NEXT_PUBLIC_RPC_URL_FALLBACK_2!,
    ].filter(Boolean);

    failoverConnection = new FailoverConnection(endpoints);
  }
  return failoverConnection;
}
```

### Usage with Failover

```tsx
// hooks/useFailoverConnection.ts
import { useCallback } from 'react';
import { getFailoverConnection } from '@/lib/connection';

export function useFailoverConnection() {
  const failover = getFailoverConnection();

  const execute = useCallback(async <T>(
    operation: (connection: Connection) => Promise<T>
  ): Promise<T> => {
    return failover.executeWithFailover(operation);
  }, []);

  return {
    connection: failover.getConnection(),
    endpoint: failover.getCurrentEndpoint(),
    execute,
  };
}

// Usage
function MyComponent() {
  const { execute } = useFailoverConnection();

  const fetchBalance = async (publicKey: PublicKey) => {
    return execute((connection) => connection.getBalance(publicKey));
  };
}
```

---

## Custom Connection Hook

### Enhanced useConnection Hook

```tsx
// hooks/useEnhancedConnection.ts
import { useConnection } from '@solana/wallet-adapter-react';
import { Connection, PublicKey, AccountInfo, Commitment } from '@solana/web3.js';
import { useCallback, useMemo } from 'react';

interface EnhancedConnectionOptions {
  retries?: number;
  retryDelay?: number;
  timeout?: number;
}

export function useEnhancedConnection(options: EnhancedConnectionOptions = {}) {
  const { connection } = useConnection();
  const { retries = 3, retryDelay = 1000, timeout = 30000 } = options;

  const withRetry = useCallback(async <T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> => {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        // Add timeout
        const result = await Promise.race([
          operation(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`${operationName} timeout`)), timeout)
          ),
        ]);
        return result;
      } catch (error) {
        lastError = error as Error;
        console.warn(`${operationName} attempt ${attempt + 1} failed:`, error);

        if (attempt < retries - 1) {
          await new Promise((resolve) =>
            setTimeout(resolve, retryDelay * Math.pow(2, attempt))
          );
        }
      }
    }

    throw lastError;
  }, [retries, retryDelay, timeout]);

  const getBalance = useCallback(async (
    publicKey: PublicKey,
    commitment?: Commitment
  ): Promise<number> => {
    return withRetry(
      () => connection.getBalance(publicKey, commitment),
      'getBalance'
    );
  }, [connection, withRetry]);

  const getAccountInfo = useCallback(async (
    publicKey: PublicKey,
    commitment?: Commitment
  ): Promise<AccountInfo<Buffer> | null> => {
    return withRetry(
      () => connection.getAccountInfo(publicKey, commitment),
      'getAccountInfo'
    );
  }, [connection, withRetry]);

  const getMultipleAccountsInfo = useCallback(async (
    publicKeys: PublicKey[],
    commitment?: Commitment
  ): Promise<(AccountInfo<Buffer> | null)[]> => {
    // Batch requests in chunks of 100
    const chunkSize = 100;
    const chunks: PublicKey[][] = [];

    for (let i = 0; i < publicKeys.length; i += chunkSize) {
      chunks.push(publicKeys.slice(i, i + chunkSize));
    }

    const results = await Promise.all(
      chunks.map((chunk) =>
        withRetry(
          () => connection.getMultipleAccountsInfo(chunk, commitment),
          'getMultipleAccountsInfo'
        )
      )
    );

    return results.flat();
  }, [connection, withRetry]);

  return useMemo(() => ({
    connection,
    getBalance,
    getAccountInfo,
    getMultipleAccountsInfo,
    withRetry,
  }), [connection, getBalance, getAccountInfo, getMultipleAccountsInfo, withRetry]);
}
```

---

## RPC Methods Reference

### Common Methods

```tsx
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

const connection = new Connection(endpoint, 'confirmed');

// Account queries
const balance = await connection.getBalance(publicKey);
const accountInfo = await connection.getAccountInfo(publicKey);
const accounts = await connection.getMultipleAccountsInfo([pk1, pk2]);

// Token accounts
const tokenAccounts = await connection.getTokenAccountsByOwner(publicKey, {
  programId: TOKEN_PROGRAM_ID,
});

// Transaction queries
const signature = 'xxx...';
const status = await connection.getSignatureStatus(signature);
const tx = await connection.getTransaction(signature, {
  maxSupportedTransactionVersion: 0,
});

// Blockhash
const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

// Slot and epoch
const slot = await connection.getSlot();
const epochInfo = await connection.getEpochInfo();

// Minimum balance for rent exemption
const minBalance = await connection.getMinimumBalanceForRentExemption(165);

// Recent performance samples
const samples = await connection.getRecentPerformanceSamples(10);
```

### Transaction Sending

```tsx
// Send raw transaction
const signature = await connection.sendRawTransaction(
  signedTransaction.serialize(),
  {
    skipPreflight: false,           // Run simulation first
    preflightCommitment: 'confirmed',
    maxRetries: 3,
  }
);

// Confirm transaction
await connection.confirmTransaction({
  signature,
  blockhash,
  lastValidBlockHeight,
}, 'confirmed');

// Or using the newer confirmation strategy
const latestBlockhash = await connection.getLatestBlockhash();
await connection.confirmTransaction({
  signature,
  ...latestBlockhash,
});
```

### Simulation

```tsx
const simulation = await connection.simulateTransaction(transaction, {
  commitment: 'confirmed',
  sigVerify: false,              // Skip signature verification
  replaceRecentBlockhash: true,  // Use fresh blockhash
  accounts: {
    encoding: 'base64',
    addresses: [publicKey.toBase58()],
  },
});

if (simulation.value.err) {
  console.error('Simulation failed:', simulation.value.err);
  console.log('Logs:', simulation.value.logs);
}

const unitsConsumed = simulation.value.unitsConsumed;
```

### WebSocket Subscriptions

```tsx
// Account subscription
const subscriptionId = connection.onAccountChange(
  publicKey,
  (accountInfo, context) => {
    console.log('Account changed:', accountInfo);
  },
  'confirmed'
);

// Cleanup
connection.removeAccountChangeListener(subscriptionId);

// Signature subscription (transaction confirmation)
connection.onSignature(
  signature,
  (signatureResult, context) => {
    if (signatureResult.err) {
      console.error('Transaction failed');
    } else {
      console.log('Transaction confirmed');
    }
  },
  'confirmed'
);

// Slot subscription
connection.onSlotChange((slotInfo) => {
  console.log('New slot:', slotInfo.slot);
});
```

---

## Best Practices

### 1. Never Use Public Endpoints in Production

```tsx
// Bad
const connection = new Connection('https://api.mainnet-beta.solana.com');

// Good
const connection = new Connection(process.env.NEXT_PUBLIC_RPC_URL!);
```

### 2. Match Commitment Levels

```tsx
// If you send with 'processed', query with 'processed'
await connection.sendRawTransaction(tx, { preflightCommitment: 'processed' });
const balance = await connection.getBalance(pk, 'processed');
```

### 3. Batch Requests

```tsx
// Bad - N requests
for (const pk of publicKeys) {
  const info = await connection.getAccountInfo(pk);
}

// Good - 1 request
const infos = await connection.getMultipleAccountsInfo(publicKeys);
```

### 4. Handle Rate Limits

```tsx
import pRetry from 'p-retry';

const fetchWithRetry = (fn: () => Promise<any>) =>
  pRetry(fn, {
    retries: 3,
    onFailedAttempt: (error) => {
      if (error.message.includes('429')) {
        console.log('Rate limited, retrying...');
      }
    },
  });
```

---

## External Resources

- [Solana RPC Methods](https://solana.com/docs/rpc)
- [Helius Documentation](https://www.helius.dev/docs)
- [QuickNode Solana](https://www.quicknode.com/chains/sol)
- [Connection Class Reference](https://solana-foundation.github.io/solana-web3.js/classes/Connection.html)
