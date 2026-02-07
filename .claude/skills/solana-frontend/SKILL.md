---
name: solana-frontend
description: Build production-ready Solana dApp frontends with Next.js and TypeScript. Use when implementing wallet authentication, RPC connections, data fetching with React Query, transaction construction and execution, state management, form validation, error handling, and user feedback patterns. Covers the complete frontend architecture for Solana applications.
---

# Solana Frontend Development

Comprehensive guide for building production-ready Solana dApp frontends using Next.js and TypeScript. This skill provides opinionated, battle-tested patterns for wallet integration, state management, transaction handling, and user experience.

## Quick Start

### Essential Stack

```bash
# Core dependencies
npm install @solana/web3.js @solana/wallet-adapter-react @solana/wallet-adapter-react-ui @solana/wallet-adapter-wallets

# State management
npm install @tanstack/react-query

# UI feedback
npm install sonner

# Form handling (recommended)
npm install react-hook-form zod @hookform/resolvers
```

### Minimal Setup

```tsx
// app/providers.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import { useMemo } from 'react';
import { Toaster } from 'sonner';

import '@solana/wallet-adapter-react-ui/styles.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      refetchOnWindowFocus: false,
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  const network = WalletAdapterNetwork.Mainnet;
  const endpoint = useMemo(() => process.env.NEXT_PUBLIC_RPC_URL || clusterApiUrl(network), [network]);

  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    []
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>
            {children}
            <Toaster position="bottom-right" richColors />
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </QueryClientProvider>
  );
}
```

## Reference Documentation

### Authentication & Connection

| Reference | Description |
|-----------|-------------|
| **[wallet-adapter.md](references/wallet-adapter.md)** | Solana Wallet Adapter integration, hooks, and authentication patterns |
| **[social-login.md](references/social-login.md)** | Privy and embedded wallet solutions for social login experiences |
| **[rpc-connection.md](references/rpc-connection.md)** | RPC providers, connection context, and endpoint management |

### State Management & Data Fetching

| Reference | Description |
|-----------|-------------|
| **[data-fetching.md](references/data-fetching.md)** | React Query patterns for Solana data, caching, and invalidation |
| **[wallet-state.md](references/wallet-state.md)** | SOL and token balances, user-specific state, real-time updates |
| **[token-metadata.md](references/token-metadata.md)** | Token info, mint data, prices, and metadata resolution |
| **[program-contexts.md](references/program-contexts.md)** | IDL-based account parsing and program state management |
| **[websocket-subscriptions.md](references/websocket-subscriptions.md)** | Real-time account and slot subscriptions |

### Transaction Lifecycle

| Reference | Description |
|-----------|-------------|
| **[transaction-construction.md](references/transaction-construction.md)** | Building transactions with IDLs, pre/post instructions |
| **[blockhash-management.md](references/blockhash-management.md)** | Recent blockhash context and caching strategies |
| **[transaction-simulation.md](references/transaction-simulation.md)** | Preflight simulation, error detection, CU estimation |
| **[compute-budget.md](references/compute-budget.md)** | Priority fees, compute limits, and cost optimization |
| **[transaction-preferences.md](references/transaction-preferences.md)** | User settings for RPC, fees, Jito bundles |
| **[confirmation-handling.md](references/confirmation-handling.md)** | Awaiting confirmations and commitment levels |
| **[error-handling.md](references/error-handling.md)** | Transaction error parsing and user-friendly messages |
| **[transaction-history.md](references/transaction-history.md)** | Parsing transaction logs and Anchor events |

### Forms & UI Patterns

| Reference | Description |
|-----------|-------------|
| **[form-validation.md](references/form-validation.md)** | State-based validation, dynamic inputs, error feedback |
| **[form-state-transitions.md](references/form-state-transitions.md)** | UI states during transaction lifecycle |
| **[state-refresh.md](references/state-refresh.md)** | Post-transaction state updates and cache invalidation |
| **[toast-notifications.md](references/toast-notifications.md)** | Transaction feedback with sonner/toasts |

### Infrastructure & Utilities

| Reference | Description |
|-----------|-------------|
| **[rpc-resilience.md](references/rpc-resilience.md)** | Rate limiting, fallbacks, retry strategies |
| **[explorer-links.md](references/explorer-links.md)** | Account and transaction explorer URLs |
| **[address-display.md](references/address-display.md)** | Address formatting, truncation, clipboard |
| **[token-amounts.md](references/token-amounts.md)** | Number formatting, decimals, display utilities |
| **[network-environments.md](references/network-environments.md)** | Devnet vs mainnet configuration |
| **[faucets.md](references/faucets.md)** | Devnet SOL and test token distribution |

### Advanced Topics

| Reference | Description |
|-----------|-------------|
| **[versioned-transactions.md](references/versioned-transactions.md)** | V0 transactions and Address Lookup Tables |
| **[jupiter-integration.md](references/jupiter-integration.md)** | Token swap integration with Jupiter |
| **[project-structure.md](references/project-structure.md)** | dApp organization and architecture patterns |
| **[testing-strategies.md](references/testing-strategies.md)** | Frontend testing for Solana dApps |
| **[security-practices.md](references/security-practices.md)** | Frontend security considerations |

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Next.js Application                          │
├─────────────────────────────────────────────────────────────────────┤
│  Providers Layer                                                     │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │
│  │ QueryClient │ │ Connection  │ │   Wallet    │ │   Custom    │   │
│  │  Provider   │ │  Provider   │ │  Provider   │ │  Contexts   │   │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘   │
├─────────────────────────────────────────────────────────────────────┤
│  State Layer (React Query)                                           │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │
│  │   Wallet    │ │   Token     │ │   Program   │ │  Blockhash  │   │
│  │   State     │ │  Metadata   │ │   State     │ │   Cache     │   │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘   │
├─────────────────────────────────────────────────────────────────────┤
│  Transaction Layer                                                   │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │
│  │   Build     │ │  Simulate   │ │    Sign     │ │   Confirm   │   │
│  │ Transaction │ │ & Estimate  │ │   & Send    │ │  & Refresh  │   │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘   │
├─────────────────────────────────────────────────────────────────────┤
│  UI Layer                                                            │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │
│  │   Forms     │ │   Toasts    │ │   Loading   │ │   Error     │   │
│  │ & Inputs    │ │ & Feedback  │ │   States    │ │  Handling   │   │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

## Core Principles

### 1. Consistency First

All agents working on this codebase must follow these conventions:

- **One source of truth**: State lives in React Query caches, not component state
- **Consistent commitment levels**: Match confirmation level with state refresh level
- **Standardized error handling**: All errors flow through the same parsing pipeline
- **Unified transaction flow**: Every transaction follows the same lifecycle

### 2. User Experience

- **Immediate feedback**: Toast when transaction is sent, update when confirmed
- **Clear error messages**: Parse program errors into human-readable text
- **Responsive forms**: Disable inputs during transaction, re-enable after state refresh
- **Progressive disclosure**: Show advanced options (priority fees, RPC) when needed

### 3. Resilience

- **RPC fallbacks**: Multiple endpoints with automatic failover
- **Graceful degradation**: Handle rate limits, network issues, RPC errors
- **Retry with backoff**: Exponential backoff for transient failures
- **State consistency**: Refresh all affected state after transactions

### 4. Type Safety

- **Strict TypeScript**: No `any` types, full type coverage
- **IDL-generated types**: Use Anchor IDL types for program interactions
- **Zod validation**: Runtime validation for user inputs
- **Discriminated unions**: Model all states explicitly

## Common Patterns

### Fetching Account Data

```tsx
// hooks/useAccountData.ts
import { useQuery } from '@tanstack/react-query';
import { useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';

export function useAccountData<T>(
  address: PublicKey | null,
  parser: (data: Buffer) => T,
  options?: { enabled?: boolean; refetchInterval?: number }
) {
  const { connection } = useConnection();

  return useQuery({
    queryKey: ['account', address?.toBase58()],
    queryFn: async () => {
      if (!address) throw new Error('No address');
      const accountInfo = await connection.getAccountInfo(address);
      if (!accountInfo) throw new Error('Account not found');
      return parser(accountInfo.data);
    },
    enabled: !!address && (options?.enabled ?? true),
    refetchInterval: options?.refetchInterval,
  });
}
```

### Executing Transactions

```tsx
// hooks/useTransaction.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Transaction, TransactionInstruction } from '@solana/web3.js';
import { toast } from 'sonner';

interface UseTransactionOptions {
  onSuccess?: (signature: string) => void;
  invalidateKeys?: string[][];
}

export function useTransaction(options?: UseTransactionOptions) {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (instructions: TransactionInstruction[]) => {
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

      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      }, 'confirmed');

      return signature;
    },
    onSuccess: (signature) => {
      toast.success('Transaction confirmed', {
        action: {
          label: 'View',
          onClick: () => window.open(`https://solscan.io/tx/${signature}`, '_blank'),
        },
      });

      // Invalidate relevant queries
      options?.invalidateKeys?.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });

      options?.onSuccess?.(signature);
    },
    onError: (error) => {
      const message = parseTransactionError(error);
      toast.error(message);
    },
  });
}
```

### Form with Transaction

```tsx
// components/TransferForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { useTransaction } from '@/hooks/useTransaction';
import { useSolBalance } from '@/hooks/useSolBalance';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

const schema = z.object({
  recipient: z.string().refine((val) => {
    try {
      new PublicKey(val);
      return true;
    } catch {
      return false;
    }
  }, 'Invalid address'),
  amount: z.number().positive('Amount must be positive'),
});

type FormData = z.infer<typeof schema>;

export function TransferForm() {
  const { publicKey } = useWallet();
  const { data: balance } = useSolBalance(publicKey);
  const { mutate, isPending } = useTransaction({
    invalidateKeys: [['solBalance', publicKey?.toBase58()]],
  });

  const { register, handleSubmit, formState: { errors }, watch } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const amount = watch('amount');
  const insufficientBalance = balance !== undefined && amount > balance;

  const onSubmit = (data: FormData) => {
    if (!publicKey) return;

    const instruction = SystemProgram.transfer({
      fromPubkey: publicKey,
      toPubkey: new PublicKey(data.recipient),
      lamports: Math.floor(data.amount * LAMPORTS_PER_SOL),
    });

    mutate([instruction]);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input
        {...register('recipient')}
        placeholder="Recipient address"
        disabled={isPending}
      />
      {errors.recipient && <span>{errors.recipient.message}</span>}

      <input
        {...register('amount', { valueAsNumber: true })}
        type="number"
        step="0.001"
        placeholder="Amount (SOL)"
        disabled={isPending}
      />
      {errors.amount && <span>{errors.amount.message}</span>}
      {insufficientBalance && <span>Insufficient balance</span>}

      <button
        type="submit"
        disabled={isPending || insufficientBalance || !publicKey}
      >
        {isPending ? 'Sending...' : 'Send SOL'}
      </button>
    </form>
  );
}
```

## Decision Guide

| Scenario | Recommendation | Reference |
|----------|----------------|-----------|
| Standard wallet connect | Wallet Adapter | [wallet-adapter.md](references/wallet-adapter.md) |
| Email/social login needed | Privy | [social-login.md](references/social-login.md) |
| Real-time balance updates | WebSocket subscriptions | [websocket-subscriptions.md](references/websocket-subscriptions.md) |
| Complex program state | IDL-based contexts | [program-contexts.md](references/program-contexts.md) |
| High-value transactions | Confirmed commitment | [confirmation-handling.md](references/confirmation-handling.md) |
| Fast UX priority | Processed commitment | [confirmation-handling.md](references/confirmation-handling.md) |
| Congested network | Priority fees + Jito | [compute-budget.md](references/compute-budget.md) |
| Token swaps | Jupiter integration | [jupiter-integration.md](references/jupiter-integration.md) |
| Many accounts (>35) | Versioned transactions | [versioned-transactions.md](references/versioned-transactions.md) |

## External Resources

### Official Documentation

- [Solana Cookbook - Connect Wallet React](https://solana.com/developers/cookbook/wallets/connect-wallet-react)
- [Wallet Adapter GitHub](https://github.com/anza-xyz/wallet-adapter)
- [Solana Web3.js v2](https://solana-foundation.github.io/solana-web3.js/)
- [TanStack Query](https://tanstack.com/query/latest)

### RPC Providers

- [Helius](https://www.helius.dev/) - Priority fee API, enhanced RPC
- [QuickNode](https://www.quicknode.com/) - Solana RPC endpoints
- [Triton](https://triton.one/) - High-performance RPC

### Tools & Services

- [Jupiter](https://jup.ag/) - DEX aggregator and swap API
- [Jito](https://jito.wtf/) - MEV and bundle services
- [Privy](https://privy.io/) - Embedded wallets and social login

### Block Explorers

- [Solscan](https://solscan.io/) - Primary explorer
- [Solana Explorer](https://explorer.solana.com/) - Official explorer
- [Solana.fm](https://solana.fm/) - Alternative explorer

## Next Steps

**New to Solana frontend development?**
1. Start with [wallet-adapter.md](references/wallet-adapter.md) for authentication
2. Read [rpc-connection.md](references/rpc-connection.md) for connection setup
3. Study [data-fetching.md](references/data-fetching.md) for state patterns
4. Follow [transaction-construction.md](references/transaction-construction.md) for transactions

**Building a production app?**
1. Review [project-structure.md](references/project-structure.md) for architecture
2. Implement [rpc-resilience.md](references/rpc-resilience.md) for reliability
3. Add [compute-budget.md](references/compute-budget.md) for transaction landing
4. Study [security-practices.md](references/security-practices.md) for security

**Optimizing user experience?**
1. Add [toast-notifications.md](references/toast-notifications.md) for feedback
2. Implement [form-state-transitions.md](references/form-state-transitions.md) for smooth UX
3. Use [websocket-subscriptions.md](references/websocket-subscriptions.md) for real-time updates
