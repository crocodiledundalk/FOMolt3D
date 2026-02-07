# Project Structure

Opinionated project structure and organization patterns for Solana dApp frontends built with Next.js and TypeScript.

## Table of Contents

1. [Directory Structure](#directory-structure)
2. [File Organization](#file-organization)
3. [Naming Conventions](#naming-conventions)
4. [Module Organization](#module-organization)
5. [Configuration Files](#configuration-files)

---

## Directory Structure

### Recommended Structure

```
solana-dapp/
├── app/                          # Next.js App Router
│   ├── (routes)/                 # Route groups
│   │   ├── trade/
│   │   │   └── page.tsx
│   │   └── portfolio/
│   │       └── page.tsx
│   ├── api/                      # API routes
│   │   └── [...]/route.ts
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Home page
│   └── providers.tsx             # Provider composition
│
├── components/                   # React components
│   ├── common/                   # Shared UI components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   └── index.ts
│   ├── forms/                    # Transaction forms
│   │   ├── TransferForm.tsx
│   │   ├── SwapForm.tsx
│   │   └── index.ts
│   ├── layout/                   # Layout components
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── Sidebar.tsx
│   │   └── index.ts
│   ├── wallet/                   # Wallet-related
│   │   ├── ConnectButton.tsx
│   │   ├── WalletInfo.tsx
│   │   └── index.ts
│   └── transactions/             # Transaction UI
│       ├── TransactionStatus.tsx
│       ├── TransactionHistory.tsx
│       └── index.ts
│
├── contexts/                     # React contexts
│   ├── NetworkContext.tsx
│   ├── TransactionPriorityContext.tsx
│   ├── WalletStateContext.tsx
│   └── index.ts
│
├── hooks/                        # Custom hooks
│   ├── data/                     # Data fetching hooks
│   │   ├── useSolBalance.ts
│   │   ├── useTokenBalances.ts
│   │   ├── useProgramAccount.ts
│   │   └── index.ts
│   ├── transactions/             # Transaction hooks
│   │   ├── useTransaction.ts
│   │   ├── useAirdrop.ts
│   │   └── index.ts
│   ├── useBlockhash.ts
│   ├── useCopyToClipboard.ts
│   └── index.ts
│
├── lib/                          # Utilities and helpers
│   ├── constants/                # Constants
│   │   ├── networks.ts
│   │   ├── programs.ts
│   │   ├── tokens.ts
│   │   └── index.ts
│   ├── validation/               # Zod schemas
│   │   ├── schemas.ts
│   │   └── index.ts
│   ├── formatters.ts             # Formatting utilities
│   ├── errorParser.ts            # Error parsing
│   ├── explorerLinks.ts          # Explorer URL generation
│   ├── queryClient.ts            # React Query setup
│   └── index.ts
│
├── programs/                     # Program integration
│   ├── myProgram/
│   │   ├── idl.json              # Anchor IDL
│   │   ├── types.ts              # Generated types
│   │   ├── accounts.ts           # Account parsers
│   │   ├── instructions.ts       # Instruction builders
│   │   └── index.ts
│   └── index.ts
│
├── styles/                       # Global styles
│   ├── globals.css
│   └── wallet-adapter.css
│
├── types/                        # TypeScript types
│   ├── api.ts
│   ├── program.ts
│   └── index.ts
│
├── public/                       # Static assets
│   ├── images/
│   └── tokens/
│
├── .env.local                    # Environment variables
├── .env.example                  # Example env vars
├── next.config.js                # Next.js config
├── tailwind.config.ts            # Tailwind config
├── tsconfig.json                 # TypeScript config
└── package.json
```

---

## File Organization

### Components

```tsx
// components/forms/TransferForm.tsx
// Single component per file, named export

export function TransferForm() {
  // Component logic
}

// components/forms/index.ts
// Barrel exports
export { TransferForm } from './TransferForm';
export { SwapForm } from './SwapForm';
export { StakeForm } from './StakeForm';
```

### Hooks

```tsx
// hooks/data/useSolBalance.ts
// One hook per file

import { useQuery } from '@tanstack/react-query';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';

export function useSolBalance() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();

  return useQuery({
    queryKey: ['solBalance', publicKey?.toBase58()],
    queryFn: async () => {
      if (!publicKey) throw new Error('No wallet');
      return connection.getBalance(publicKey);
    },
    enabled: !!publicKey,
  });
}
```

### Contexts

```tsx
// contexts/WalletStateContext.tsx
// Context + Provider + Hook in same file

import { createContext, useContext, ReactNode } from 'react';

interface WalletStateContextValue {
  // ...
}

const WalletStateContext = createContext<WalletStateContextValue | null>(null);

export function WalletStateProvider({ children }: { children: ReactNode }) {
  // ...
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

### Library Utilities

```tsx
// lib/formatters.ts
// Group related utilities

export function truncateAddress(address: string, length = 4): string {
  return `${address.slice(0, length)}...${address.slice(-length)}`;
}

export function formatTokenAmount(amount: number, decimals: number): string {
  return amount.toLocaleString(undefined, {
    maximumFractionDigits: decimals,
  });
}

export function formatUsd(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}
```

---

## Naming Conventions

### Files and Directories

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `TransferForm.tsx` |
| Hooks | camelCase with `use` prefix | `useSolBalance.ts` |
| Contexts | PascalCase with `Context` suffix | `NetworkContext.tsx` |
| Utilities | camelCase | `formatters.ts` |
| Types | camelCase | `types.ts` |
| Constants | camelCase | `networks.ts` |
| API Routes | lowercase with hyphens | `token-balance/route.ts` |

### Code Naming

```tsx
// Components - PascalCase
export function TransferForm() {}
export function WalletConnectButton() {}

// Hooks - camelCase with 'use' prefix
export function useSolBalance() {}
export function useTokenBalances() {}

// Context values - PascalCase with 'Context' suffix
const NetworkContext = createContext<...>(null);

// Providers - PascalCase with 'Provider' suffix
export function NetworkProvider() {}

// Constants - SCREAMING_SNAKE_CASE
export const LAMPORTS_PER_SOL = 1_000_000_000;
export const TOKEN_PROGRAM_ID = new PublicKey('...');

// Types/Interfaces - PascalCase
interface TokenBalance {}
type TransferFormData = {};

// Functions - camelCase
export function truncateAddress() {}
export function formatTokenAmount() {}
```

---

## Module Organization

### Providers Composition

```tsx
// app/providers.tsx
'use client';

import { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { Toaster } from 'sonner';

import { queryClient } from '@/lib/queryClient';
import { NetworkProvider } from '@/contexts/NetworkContext';
import { WalletStateProvider } from '@/contexts/WalletStateContext';
import { TransactionPriorityProvider } from '@/contexts/TransactionPriorityContext';

import '@solana/wallet-adapter-react-ui/styles.css';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <NetworkProvider>
        <ConnectionProvider endpoint={...}>
          <WalletProvider wallets={wallets} autoConnect>
            <WalletModalProvider>
              <WalletStateProvider>
                <TransactionPriorityProvider>
                  {children}
                  <Toaster position="bottom-right" richColors />
                </TransactionPriorityProvider>
              </WalletStateProvider>
            </WalletModalProvider>
          </WalletProvider>
        </ConnectionProvider>
      </NetworkProvider>
    </QueryClientProvider>
  );
}
```

### Program Integration

```tsx
// programs/myProgram/index.ts
export { IDL } from './idl';
export type { MyProgramTypes } from './types';
export * from './accounts';
export * from './instructions';

// programs/myProgram/accounts.ts
import { PublicKey } from '@solana/web3.js';
import { Program } from '@coral-xyz/anchor';
import { IDL } from './idl';

export function getPoolPda(mint: PublicKey, programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('pool'), mint.toBuffer()],
    programId
  );
}

export async function fetchPool(program: Program<typeof IDL>, address: PublicKey) {
  return program.account.pool.fetch(address);
}

// programs/myProgram/instructions.ts
import { Program } from '@coral-xyz/anchor';
import { TransactionInstruction, PublicKey } from '@solana/web3.js';
import { IDL } from './idl';

export async function buildDepositInstruction(
  program: Program<typeof IDL>,
  pool: PublicKey,
  user: PublicKey,
  amount: number
): Promise<TransactionInstruction> {
  return program.methods
    .deposit(new BN(amount))
    .accounts({ pool, user })
    .instruction();
}
```

### Query Key Factory

```tsx
// lib/queryKeys.ts
export const queryKeys = {
  // Wallet
  wallet: {
    all: ['wallet'] as const,
    balance: (address: string) => ['wallet', 'balance', address] as const,
    tokens: (address: string) => ['wallet', 'tokens', address] as const,
  },

  // Program
  program: {
    all: (programId: string) => ['program', programId] as const,
    pools: (programId: string) => ['program', programId, 'pools'] as const,
    pool: (programId: string, address: string) =>
      ['program', programId, 'pool', address] as const,
  },

  // Tokens
  token: {
    metadata: (mint: string) => ['token', 'metadata', mint] as const,
    price: (mint: string) => ['token', 'price', mint] as const,
  },

  // System
  blockhash: ['blockhash'] as const,
  priorityFees: ['priorityFees'] as const,
};
```

---

## Configuration Files

### next.config.js

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Handle web3 polyfills
  webpack: (config) => {
    config.resolve.fallback = {
      fs: false,
      path: false,
      os: false,
      crypto: false,
    };
    return config;
  },

  // Image domains for token logos
  images: {
    domains: [
      'raw.githubusercontent.com',
      'arweave.net',
      'www.arweave.net',
    ],
  },

  // Environment variables
  env: {
    NEXT_PUBLIC_NETWORK: process.env.NEXT_PUBLIC_NETWORK,
    NEXT_PUBLIC_RPC_URL: process.env.NEXT_PUBLIC_RPC_URL,
  },
};

module.exports = nextConfig;
```

### tailwind.config.ts

```ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Custom brand colors
        brand: {
          50: '#faf5ff',
          100: '#f3e8ff',
          // ...
          500: '#8b5cf6',
          600: '#7c3aed',
          // ...
        },
      },
      fontFamily: {
        mono: ['var(--font-mono)', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### .env.example

```env
# Network Configuration
NEXT_PUBLIC_NETWORK=devnet
NEXT_PUBLIC_RPC_URL=https://devnet.helius-rpc.com/?api-key=YOUR_KEY
NEXT_PUBLIC_WS_URL=wss://devnet.helius-rpc.com/?api-key=YOUR_KEY

# Program IDs
NEXT_PUBLIC_PROGRAM_ID=YourProgramId111111111111111111111111

# API Keys (if needed)
HELIUS_API_KEY=your-helius-api-key

# Server-side only
MINT_AUTHORITY_KEYPAIR=[...]  # For devnet token faucet
```

---

## Best Practices

### 1. Colocation

```
# Keep related files together
components/forms/
├── TransferForm.tsx
├── TransferForm.test.tsx    # Tests next to component
└── TransferForm.module.css  # Styles if needed
```

### 2. Barrel Exports

```tsx
// components/index.ts
export * from './common';
export * from './forms';
export * from './wallet';

// Usage
import { Button, TransferForm, WalletInfo } from '@/components';
```

### 3. Absolute Imports

```tsx
// tsconfig.json paths
"@/*": ["./*"]

// Usage
import { useSolBalance } from '@/hooks';
import { formatTokenAmount } from '@/lib/formatters';
```

### 4. Feature-Based Organization

```
# For larger apps, organize by feature
features/
├── swap/
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   └── index.ts
├── stake/
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   └── index.ts
└── portfolio/
    └── ...
```

---

## External Resources

- [Next.js Project Structure](https://nextjs.org/docs/getting-started/project-structure)
- [Bulletproof React](https://github.com/alan2207/bulletproof-react)
- [Feature-Sliced Design](https://feature-sliced.design/)
