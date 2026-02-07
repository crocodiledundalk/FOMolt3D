# WebSocket Subscriptions

Patterns for implementing real-time updates using Solana WebSocket subscriptions for accounts, programs, and transactions.

## Table of Contents

1. [Subscription Types](#subscription-types)
2. [Account Subscriptions](#account-subscriptions)
3. [Program Subscriptions](#program-subscriptions)
4. [Transaction Subscriptions](#transaction-subscriptions)
5. [Connection Management](#connection-management)

---

## Subscription Types

### Available Subscriptions

| Subscription | Use Case | Data Returned |
|--------------|----------|---------------|
| `accountSubscribe` | Single account changes | Account data |
| `programSubscribe` | All accounts owned by program | Account updates |
| `logsSubscribe` | Transaction logs | Log messages |
| `signatureSubscribe` | Transaction confirmation | Status update |
| `slotSubscribe` | New slots | Slot number |
| `rootSubscribe` | Root changes | Root slot |

### WebSocket URL

```tsx
// lib/constants/rpc.ts
export function getWsUrl(httpUrl: string): string {
  // Convert HTTP URL to WebSocket URL
  return httpUrl
    .replace('https://', 'wss://')
    .replace('http://', 'ws://');
}

// Example URLs
const HTTP_URL = 'https://mainnet.helius-rpc.com/?api-key=KEY';
const WS_URL = 'wss://mainnet.helius-rpc.com/?api-key=KEY';
```

---

## Account Subscriptions

### Basic Account Subscription Hook

```tsx
// hooks/useAccountSubscription.ts
import { useEffect, useRef, useCallback } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, AccountInfo, Commitment } from '@solana/web3.js';

interface UseAccountSubscriptionOptions {
  commitment?: Commitment;
  onData?: (accountInfo: AccountInfo<Buffer>) => void;
  enabled?: boolean;
}

export function useAccountSubscription(
  address: PublicKey | string | null,
  options: UseAccountSubscriptionOptions = {}
) {
  const { connection } = useConnection();
  const { commitment = 'confirmed', onData, enabled = true } = options;
  const subscriptionIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!address || !enabled) return;

    const pubkey = typeof address === 'string' ? new PublicKey(address) : address;

    subscriptionIdRef.current = connection.onAccountChange(
      pubkey,
      (accountInfo: AccountInfo<Buffer>) => {
        onData?.(accountInfo);
      },
      commitment
    );

    return () => {
      if (subscriptionIdRef.current !== null) {
        connection.removeAccountChangeListener(subscriptionIdRef.current);
        subscriptionIdRef.current = null;
      }
    };
  }, [connection, address, commitment, enabled, onData]);

  return {
    isSubscribed: subscriptionIdRef.current !== null,
  };
}
```

### Balance Subscription Hook

```tsx
// hooks/useBalanceSubscription.ts
import { useEffect, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useQueryClient } from '@tanstack/react-query';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

export function useBalanceSubscription() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!publicKey) return;

    const subscriptionId = connection.onAccountChange(
      publicKey,
      (accountInfo) => {
        // Update React Query cache immediately
        queryClient.setQueryData(
          ['solBalance', publicKey.toBase58()],
          accountInfo.lamports
        );
      },
      'confirmed'
    );

    return () => {
      connection.removeAccountChangeListener(subscriptionId);
    };
  }, [connection, publicKey, queryClient]);
}
```

### Token Account Subscription

```tsx
// hooks/useTokenAccountSubscription.ts
import { useEffect } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { useQueryClient } from '@tanstack/react-query';
import { PublicKey, AccountInfo } from '@solana/web3.js';
import { AccountLayout, RawAccount } from '@solana/spl-token';

interface TokenAccountUpdate {
  mint: string;
  owner: string;
  amount: bigint;
}

export function useTokenAccountSubscription(
  tokenAccountAddress: PublicKey | null,
  onUpdate?: (data: TokenAccountUpdate) => void
) {
  const { connection } = useConnection();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!tokenAccountAddress) return;

    const subscriptionId = connection.onAccountChange(
      tokenAccountAddress,
      (accountInfo: AccountInfo<Buffer>) => {
        try {
          // Decode token account data
          const decoded = AccountLayout.decode(accountInfo.data);

          const update: TokenAccountUpdate = {
            mint: new PublicKey(decoded.mint).toBase58(),
            owner: new PublicKey(decoded.owner).toBase58(),
            amount: decoded.amount,
          };

          // Call custom handler
          onUpdate?.(update);

          // Update cache
          queryClient.setQueryData(
            ['tokenAccount', tokenAccountAddress.toBase58()],
            update
          );

          // Invalidate related queries
          queryClient.invalidateQueries({
            queryKey: ['tokenBalances', update.owner],
          });
        } catch (error) {
          console.error('Failed to decode token account:', error);
        }
      },
      'confirmed'
    );

    return () => {
      connection.removeAccountChangeListener(subscriptionId);
    };
  }, [connection, tokenAccountAddress, queryClient, onUpdate]);
}
```

---

## Program Subscriptions

### Program Account Subscription

```tsx
// hooks/useProgramSubscription.ts
import { useEffect, useRef } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, KeyedAccountInfo, GetProgramAccountsFilter } from '@solana/web3.js';

interface UseProgramSubscriptionOptions {
  filters?: GetProgramAccountsFilter[];
  onAccountChange?: (keyedAccountInfo: KeyedAccountInfo) => void;
  enabled?: boolean;
}

export function useProgramSubscription(
  programId: PublicKey | string,
  options: UseProgramSubscriptionOptions = {}
) {
  const { connection } = useConnection();
  const { filters, onAccountChange, enabled = true } = options;
  const subscriptionIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const pubkey = typeof programId === 'string'
      ? new PublicKey(programId)
      : programId;

    subscriptionIdRef.current = connection.onProgramAccountChange(
      pubkey,
      (keyedAccountInfo: KeyedAccountInfo) => {
        onAccountChange?.(keyedAccountInfo);
      },
      'confirmed',
      filters
    );

    return () => {
      if (subscriptionIdRef.current !== null) {
        connection.removeProgramAccountChangeListener(subscriptionIdRef.current);
        subscriptionIdRef.current = null;
      }
    };
  }, [connection, programId, filters, enabled, onAccountChange]);
}
```

### Anchor Program Subscription

```tsx
// hooks/useProgramAccountsSubscription.ts
import { useEffect } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { useQueryClient } from '@tanstack/react-query';
import { PublicKey, KeyedAccountInfo } from '@solana/web3.js';
import { BorshCoder } from '@coral-xyz/anchor';
import { IDL, MyProgram } from '@/programs/myProgram';

const PROGRAM_ID = new PublicKey('YourProgramId111111111111111111111111');

export function usePoolAccountsSubscription() {
  const { connection } = useConnection();
  const queryClient = useQueryClient();

  useEffect(() => {
    const coder = new BorshCoder(IDL);

    // Filter for pool accounts (by discriminator)
    const poolDiscriminator = Buffer.from([/* pool discriminator bytes */]);

    const subscriptionId = connection.onProgramAccountChange(
      PROGRAM_ID,
      (keyedAccountInfo: KeyedAccountInfo) => {
        const { accountId, accountInfo } = keyedAccountInfo;

        try {
          // Decode account
          const decoded = coder.accounts.decode('pool', accountInfo.data);

          // Update specific pool in cache
          queryClient.setQueryData(
            ['pool', accountId.toBase58()],
            decoded
          );

          // Invalidate pool list
          queryClient.invalidateQueries({
            queryKey: ['allPools'],
          });
        } catch (error) {
          // Not a pool account or decoding failed
        }
      },
      'confirmed',
      [
        {
          memcmp: {
            offset: 0,
            bytes: poolDiscriminator.toString('base64'),
          },
        },
      ]
    );

    return () => {
      connection.removeProgramAccountChangeListener(subscriptionId);
    };
  }, [connection, queryClient]);
}
```

---

## Transaction Subscriptions

### Signature Subscription

```tsx
// hooks/useSignatureSubscription.ts
import { useEffect, useCallback } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { SignatureStatus, TransactionError } from '@solana/web3.js';

interface SignatureUpdate {
  signature: string;
  status: SignatureStatus;
  error: TransactionError | null;
}

export function useSignatureSubscription(
  signature: string | null,
  onUpdate: (update: SignatureUpdate) => void
) {
  const { connection } = useConnection();

  useEffect(() => {
    if (!signature) return;

    const subscriptionId = connection.onSignature(
      signature,
      (signatureStatus, context) => {
        onUpdate({
          signature,
          status: signatureStatus,
          error: signatureStatus.err,
        });
      },
      'confirmed'
    );

    return () => {
      connection.removeSignatureListener(subscriptionId);
    };
  }, [connection, signature, onUpdate]);
}
```

### Logs Subscription

```tsx
// hooks/useLogsSubscription.ts
import { useEffect, useRef } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Logs, PublicKey } from '@solana/web3.js';

interface UseLogsSubscriptionOptions {
  onLogs?: (logs: Logs) => void;
  filter?: 'all' | PublicKey;
  enabled?: boolean;
}

export function useLogsSubscription(options: UseLogsSubscriptionOptions = {}) {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const { onLogs, filter, enabled = true } = options;
  const subscriptionIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;

    // Use wallet address as filter by default
    const subscriptionFilter = filter ?? publicKey ?? 'all';

    subscriptionIdRef.current = connection.onLogs(
      subscriptionFilter,
      (logs: Logs) => {
        onLogs?.(logs);
      },
      'confirmed'
    );

    return () => {
      if (subscriptionIdRef.current !== null) {
        connection.removeOnLogsListener(subscriptionIdRef.current);
        subscriptionIdRef.current = null;
      }
    };
  }, [connection, filter, publicKey, enabled, onLogs]);
}
```

### Transaction Notification Hook

```tsx
// hooks/useTransactionNotifications.ts
import { useEffect, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Logs } from '@solana/web3.js';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export function useTransactionNotifications() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const queryClient = useQueryClient();

  const handleLogs = useCallback(
    (logs: Logs) => {
      if (logs.err) {
        toast.error('Transaction failed', {
          description: `Error in ${logs.signature.slice(0, 8)}...`,
        });
      } else {
        toast.success('Transaction confirmed', {
          description: `${logs.signature.slice(0, 8)}...`,
        });

        // Refresh relevant data
        queryClient.invalidateQueries({ queryKey: ['solBalance'] });
        queryClient.invalidateQueries({ queryKey: ['tokenBalances'] });
      }
    },
    [queryClient]
  );

  useEffect(() => {
    if (!publicKey) return;

    const subscriptionId = connection.onLogs(
      publicKey,
      handleLogs,
      'confirmed'
    );

    return () => {
      connection.removeOnLogsListener(subscriptionId);
    };
  }, [connection, publicKey, handleLogs]);
}
```

---

## Connection Management

### WebSocket Connection Manager

```tsx
// lib/websocket/connectionManager.ts
import { Connection, Commitment } from '@solana/web3.js';

interface SubscriptionInfo {
  id: number;
  type: 'account' | 'program' | 'logs' | 'signature';
  cleanup: () => void;
}

class WebSocketConnectionManager {
  private subscriptions: Map<string, SubscriptionInfo> = new Map();
  private connection: Connection;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor(endpoint: string, commitment: Commitment = 'confirmed') {
    this.connection = new Connection(endpoint, {
      commitment,
      wsEndpoint: endpoint.replace('https://', 'wss://').replace('http://', 'ws://'),
    });
  }

  subscribe(
    key: string,
    setupSubscription: (connection: Connection) => {
      id: number;
      cleanup: () => void;
      type: SubscriptionInfo['type'];
    }
  ): void {
    // Unsubscribe existing subscription with same key
    this.unsubscribe(key);

    const { id, cleanup, type } = setupSubscription(this.connection);
    this.subscriptions.set(key, { id, cleanup, type });
  }

  unsubscribe(key: string): void {
    const subscription = this.subscriptions.get(key);
    if (subscription) {
      subscription.cleanup();
      this.subscriptions.delete(key);
    }
  }

  unsubscribeAll(): void {
    this.subscriptions.forEach((subscription) => {
      subscription.cleanup();
    });
    this.subscriptions.clear();
  }

  getActiveSubscriptionCount(): number {
    return this.subscriptions.size;
  }
}

export const wsManager = new WebSocketConnectionManager(
  process.env.NEXT_PUBLIC_RPC_URL!
);
```

### Subscription Context

```tsx
// contexts/SubscriptionContext.tsx
'use client';

import {
  createContext,
  useContext,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useQueryClient } from '@tanstack/react-query';

interface SubscriptionContextValue {
  subscribeToBalance: () => void;
  subscribeToTokenAccounts: () => void;
  unsubscribeAll: () => void;
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const queryClient = useQueryClient();

  const subscriptionIds = useRef<number[]>([]);

  const subscribeToBalance = useCallback(() => {
    if (!publicKey) return;

    const id = connection.onAccountChange(
      publicKey,
      (accountInfo) => {
        queryClient.setQueryData(
          ['solBalance', publicKey.toBase58()],
          accountInfo.lamports
        );
      },
      'confirmed'
    );

    subscriptionIds.current.push(id);
  }, [connection, publicKey, queryClient]);

  const subscribeToTokenAccounts = useCallback(() => {
    // Implementation for token account subscriptions
  }, [connection, publicKey, queryClient]);

  const unsubscribeAll = useCallback(() => {
    subscriptionIds.current.forEach((id) => {
      connection.removeAccountChangeListener(id);
    });
    subscriptionIds.current = [];
  }, [connection]);

  // Auto-subscribe when wallet connects
  useEffect(() => {
    if (publicKey) {
      subscribeToBalance();
    }

    return () => {
      unsubscribeAll();
    };
  }, [publicKey, subscribeToBalance, unsubscribeAll]);

  return (
    <SubscriptionContext.Provider
      value={{
        subscribeToBalance,
        subscribeToTokenAccounts,
        unsubscribeAll,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscriptions() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscriptions must be used within SubscriptionProvider');
  }
  return context;
}
```

### Health Monitoring

```tsx
// hooks/useWebSocketHealth.ts
import { useEffect, useState, useCallback } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';

interface WebSocketHealth {
  isConnected: boolean;
  lastSlot: number | null;
  latency: number | null;
}

export function useWebSocketHealth() {
  const { connection } = useConnection();
  const [health, setHealth] = useState<WebSocketHealth>({
    isConnected: false,
    lastSlot: null,
    latency: null,
  });

  useEffect(() => {
    let lastPingTime = Date.now();

    const subscriptionId = connection.onSlotChange((slotInfo) => {
      const now = Date.now();
      setHealth({
        isConnected: true,
        lastSlot: slotInfo.slot,
        latency: now - lastPingTime,
      });
      lastPingTime = now;
    });

    // Detect disconnection
    const healthCheck = setInterval(() => {
      const timeSinceLastUpdate = Date.now() - lastPingTime;
      if (timeSinceLastUpdate > 5000) {
        setHealth((prev) => ({
          ...prev,
          isConnected: false,
        }));
      }
    }, 1000);

    return () => {
      connection.removeSlotChangeListener(subscriptionId);
      clearInterval(healthCheck);
    };
  }, [connection]);

  return health;
}
```

---

## Best Practices

### 1. Clean Up Subscriptions

```tsx
// Always remove listeners on unmount
useEffect(() => {
  const id = connection.onAccountChange(...);
  return () => connection.removeAccountChangeListener(id);
}, []);
```

### 2. Deduplicate Subscriptions

```tsx
// Use a key to prevent duplicate subscriptions
const subscriptionKey = `account-${address}`;
if (!activeSubscriptions.has(subscriptionKey)) {
  subscribe(subscriptionKey, ...);
}
```

### 3. Handle Reconnection

```tsx
// Monitor WebSocket health and resubscribe if needed
useEffect(() => {
  if (!health.isConnected) {
    resubscribeAll();
  }
}, [health.isConnected]);
```

### 4. Batch Updates

```tsx
// Don't update cache on every message for high-frequency updates
const throttledUpdate = useThrottle(updateCache, 100);
```

### 5. Use Appropriate Commitment

```tsx
// 'confirmed' is usually best for subscriptions
connection.onAccountChange(pubkey, callback, 'confirmed');
```

---

## External Resources

- [Solana WebSocket API](https://solana.com/docs/rpc/websocket)
- [accountSubscribe](https://solana.com/docs/rpc/websocket/accountsubscribe)
- [programSubscribe](https://solana.com/docs/rpc/websocket/programsubscribe)
- [logsSubscribe](https://solana.com/docs/rpc/websocket/logssubscribe)
