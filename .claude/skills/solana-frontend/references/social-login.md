# Social Login with Privy

Guide for implementing social login and embedded wallets using Privy for Solana applications. Enables email, phone, and social authentication without requiring users to have an existing wallet.

## Table of Contents

1. [Overview](#overview)
2. [Installation](#installation)
3. [Provider Setup](#provider-setup)
4. [Authentication Methods](#authentication-methods)
5. [Solana Wallet Integration](#solana-wallet-integration)
6. [Transaction Signing](#transaction-signing)
7. [External Wallet Support](#external-wallet-support)
8. [Advanced Patterns](#advanced-patterns)

---

## Overview

### When to Use Privy

| Use Case | Recommended |
|----------|-------------|
| Consumer-facing app | Yes - lower friction onboarding |
| Crypto-native audience | Consider standard wallet adapter |
| Fiat on-ramp needed | Yes - built-in funding |
| Email/SMS auth required | Yes - core feature |
| Enterprise compliance | Yes - SOC 2 compliant |

### Features

- **Embedded Wallets**: Auto-generated Solana wallets for new users
- **Social Login**: Google, Apple, Twitter, Discord, GitHub
- **Email/Phone**: Passwordless magic links and OTP
- **External Wallets**: Phantom, Solflare, Backpack support
- **Fiat On-Ramp**: Credit card, ACH, and exchange funding
- **MFA**: Transaction-level multi-factor authentication

---

## Installation

```bash
npm install @privy-io/react-auth @privy-io/server-auth
```

### Environment Variables

```env
# .env.local
NEXT_PUBLIC_PRIVY_APP_ID=your-app-id
PRIVY_APP_SECRET=your-app-secret  # Server-side only
```

---

## Provider Setup

### Basic Configuration

```tsx
// app/providers.tsx
'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { toSolanaWalletConnectors } from '@privy-io/react-auth/solana';

const solanaConnectors = toSolanaWalletConnectors({
  // Enable external wallet detection
  shouldAutoConnect: true,
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        // Appearance
        appearance: {
          theme: 'dark',
          accentColor: '#7c3aed',
          logo: 'https://myapp.com/logo.png',
        },

        // Login methods
        loginMethods: ['email', 'google', 'twitter', 'wallet'],

        // Solana configuration
        solanaClusters: [
          { name: 'mainnet-beta', rpcUrl: process.env.NEXT_PUBLIC_RPC_URL! },
        ],

        // External wallet connectors
        externalWallets: {
          solana: {
            connectors: solanaConnectors,
          },
        },

        // Embedded wallet configuration
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
          requireUserPasswordOnCreate: false,
        },

        // MFA settings
        mfa: {
          noPromptOnMfaRequired: false,
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
```

### Full Configuration Options

```tsx
config={{
  // Login methods - order determines display order
  loginMethods: [
    'email',           // Email magic links
    'sms',             // Phone OTP
    'google',          // Google OAuth
    'apple',           // Apple OAuth
    'twitter',         // Twitter/X OAuth
    'discord',         // Discord OAuth
    'github',          // GitHub OAuth
    'linkedin',        // LinkedIn OAuth
    'wallet',          // External wallet connect
  ],

  // Appearance customization
  appearance: {
    theme: 'dark',                    // 'light' | 'dark'
    accentColor: '#7c3aed',           // Brand color
    logo: 'https://myapp.com/logo.png',
    showWalletLoginFirst: false,      // Prioritize wallet login
    walletChainType: 'solana-only',   // 'ethereum-and-solana' | 'solana-only'
  },

  // Solana clusters
  solanaClusters: [
    { name: 'mainnet-beta', rpcUrl: 'https://mainnet.helius-rpc.com/?api-key=xxx' },
    { name: 'devnet', rpcUrl: 'https://devnet.helius-rpc.com/?api-key=xxx' },
  ],

  // Default chain
  defaultChain: 'solana',

  // Embedded wallet settings
  embeddedWallets: {
    createOnLogin: 'users-without-wallets',  // 'all-users' | 'off'
    requireUserPasswordOnCreate: false,
    noPromptOnSignature: false,              // Skip confirmation for trusted apps
  },

  // Legal requirements
  legal: {
    termsAndConditionsUrl: 'https://myapp.com/terms',
    privacyPolicyUrl: 'https://myapp.com/privacy',
  },

  // Captcha (optional)
  captchaEnabled: true,
}}
```

---

## Authentication Methods

### Login Button

```tsx
import { usePrivy } from '@privy-io/react-auth';

function LoginButton() {
  const { login, logout, authenticated, ready, user } = usePrivy();

  if (!ready) {
    return <LoadingSpinner />;
  }

  if (authenticated) {
    return (
      <div className="flex items-center gap-4">
        <span>{user?.email?.address || user?.wallet?.address}</span>
        <button onClick={logout}>Logout</button>
      </div>
    );
  }

  return (
    <button onClick={login}>
      Sign In
    </button>
  );
}
```

### Programmatic Login

```tsx
import { usePrivy } from '@privy-io/react-auth';

function AuthFlow() {
  const { login, linkEmail, linkWallet, user } = usePrivy();

  // Login with specific method
  const handleEmailLogin = () => {
    login({ loginMethods: ['email'] });
  };

  const handleSocialLogin = () => {
    login({ loginMethods: ['google', 'twitter'] });
  };

  const handleWalletLogin = () => {
    login({ loginMethods: ['wallet'] });
  };

  // Link additional methods to existing account
  const handleLinkEmail = async () => {
    if (!user?.email) {
      await linkEmail();
    }
  };

  const handleLinkWallet = async () => {
    await linkWallet();
  };

  return (
    <div className="space-y-4">
      <button onClick={handleEmailLogin}>Continue with Email</button>
      <button onClick={handleSocialLogin}>Continue with Social</button>
      <button onClick={handleWalletLogin}>Connect Wallet</button>
    </div>
  );
}
```

### User Object

```tsx
const { user } = usePrivy();

// User object structure
interface PrivyUser {
  id: string;                    // Privy user ID
  createdAt: Date;

  // Linked accounts
  email?: { address: string };
  phone?: { number: string };
  google?: { email: string; name: string };
  twitter?: { username: string };
  discord?: { username: string };
  github?: { username: string };

  // Wallets
  wallet?: {                     // Embedded wallet
    address: string;
    chainType: 'solana' | 'ethereum';
  };
  linkedAccounts: LinkedAccount[];
}
```

---

## Solana Wallet Integration

### Getting the Solana Wallet

```tsx
import { usePrivy, useSolanaWallets } from '@privy-io/react-auth';

function WalletInfo() {
  const { ready, authenticated } = usePrivy();
  const { wallets } = useSolanaWallets();

  if (!ready || !authenticated) {
    return null;
  }

  // Get embedded wallet (created by Privy)
  const embeddedWallet = wallets.find(
    (wallet) => wallet.walletClientType === 'privy'
  );

  // Get external wallets (Phantom, Solflare, etc.)
  const externalWallets = wallets.filter(
    (wallet) => wallet.walletClientType !== 'privy'
  );

  return (
    <div>
      {embeddedWallet && (
        <div>
          <h3>Embedded Wallet</h3>
          <p>{embeddedWallet.address}</p>
        </div>
      )}

      {externalWallets.map((wallet) => (
        <div key={wallet.address}>
          <h3>{wallet.walletClientType}</h3>
          <p>{wallet.address}</p>
        </div>
      ))}
    </div>
  );
}
```

### Selecting Active Wallet

```tsx
import { useSolanaWallets } from '@privy-io/react-auth';
import { useState } from 'react';

function WalletSelector() {
  const { wallets } = useSolanaWallets();
  const [activeWallet, setActiveWallet] = useState(wallets[0]);

  return (
    <select
      value={activeWallet?.address}
      onChange={(e) => {
        const wallet = wallets.find((w) => w.address === e.target.value);
        if (wallet) setActiveWallet(wallet);
      }}
    >
      {wallets.map((wallet) => (
        <option key={wallet.address} value={wallet.address}>
          {wallet.walletClientType}: {wallet.address.slice(0, 8)}...
        </option>
      ))}
    </select>
  );
}
```

---

## Transaction Signing

### Basic Transaction

```tsx
import { useSolanaWallets } from '@privy-io/react-auth';
import { Connection, Transaction, SystemProgram, PublicKey } from '@solana/web3.js';

function SendTransaction() {
  const { wallets } = useSolanaWallets();
  const embeddedWallet = wallets.find((w) => w.walletClientType === 'privy');

  const sendSol = async (recipient: string, amount: number) => {
    if (!embeddedWallet) {
      throw new Error('No wallet available');
    }

    const connection = new Connection(process.env.NEXT_PUBLIC_RPC_URL!);
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

    const transaction = new Transaction({
      feePayer: new PublicKey(embeddedWallet.address),
      blockhash,
      lastValidBlockHeight,
    }).add(
      SystemProgram.transfer({
        fromPubkey: new PublicKey(embeddedWallet.address),
        toPubkey: new PublicKey(recipient),
        lamports: amount * 1e9,
      })
    );

    // Sign with Privy embedded wallet
    const signedTx = await embeddedWallet.signTransaction(transaction);

    // Send transaction
    const signature = await connection.sendRawTransaction(signedTx.serialize());

    // Confirm
    await connection.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight,
    });

    return signature;
  };

  return (
    <button onClick={() => sendSol('recipient...', 0.1)}>
      Send 0.1 SOL
    </button>
  );
}
```

### Sign Message

```tsx
import { useSolanaWallets } from '@privy-io/react-auth';

function SignMessage() {
  const { wallets } = useSolanaWallets();
  const wallet = wallets[0];

  const signMessage = async (message: string) => {
    if (!wallet) throw new Error('No wallet');

    const encodedMessage = new TextEncoder().encode(message);
    const signature = await wallet.signMessage(encodedMessage);

    return {
      signature: Buffer.from(signature).toString('base64'),
      publicKey: wallet.address,
    };
  };

  return (
    <button onClick={() => signMessage('Hello, Solana!')}>
      Sign Message
    </button>
  );
}
```

### Integration with Anchor

```tsx
import { useSolanaWallets } from '@privy-io/react-auth';
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';

function useAnchorProgram() {
  const { wallets } = useSolanaWallets();
  const wallet = wallets[0];

  const getProvider = () => {
    if (!wallet) return null;

    const connection = new Connection(process.env.NEXT_PUBLIC_RPC_URL!);

    // Create Anchor-compatible wallet interface
    const anchorWallet = {
      publicKey: new PublicKey(wallet.address),
      signTransaction: async (tx: Transaction) => wallet.signTransaction(tx),
      signAllTransactions: async (txs: Transaction[]) =>
        Promise.all(txs.map((tx) => wallet.signTransaction(tx))),
    };

    return new AnchorProvider(connection, anchorWallet, {
      commitment: 'confirmed',
    });
  };

  const program = useMemo(() => {
    const provider = getProvider();
    if (!provider) return null;
    return new Program(IDL, PROGRAM_ID, provider);
  }, [wallet]);

  return { program, wallet };
}
```

---

## External Wallet Support

### Connecting External Wallets

```tsx
import { usePrivy, useConnectWallet, useSolanaWallets } from '@privy-io/react-auth';

function ExternalWalletConnect() {
  const { authenticated } = usePrivy();
  const { connectWallet } = useConnectWallet();
  const { wallets } = useSolanaWallets();

  const handleConnect = async () => {
    // This opens the wallet selection modal
    await connectWallet();
  };

  const externalWallets = wallets.filter(
    (w) => w.walletClientType !== 'privy'
  );

  return (
    <div>
      <button onClick={handleConnect}>
        Connect External Wallet
      </button>

      {externalWallets.map((wallet) => (
        <div key={wallet.address}>
          {wallet.walletClientType}: {wallet.address.slice(0, 8)}...
        </div>
      ))}
    </div>
  );
}
```

### Hybrid Wallet Strategy

```tsx
// hooks/useActiveWallet.ts
import { useSolanaWallets } from '@privy-io/react-auth';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WalletStore {
  preferredWalletType: 'embedded' | 'external' | null;
  setPreferredWalletType: (type: 'embedded' | 'external') => void;
}

const useWalletStore = create<WalletStore>()(
  persist(
    (set) => ({
      preferredWalletType: null,
      setPreferredWalletType: (type) => set({ preferredWalletType: type }),
    }),
    { name: 'wallet-preference' }
  )
);

export function useActiveWallet() {
  const { wallets } = useSolanaWallets();
  const { preferredWalletType, setPreferredWalletType } = useWalletStore();

  const embeddedWallet = wallets.find((w) => w.walletClientType === 'privy');
  const externalWallets = wallets.filter((w) => w.walletClientType !== 'privy');

  // Determine active wallet based on preference
  const activeWallet = useMemo(() => {
    if (preferredWalletType === 'external' && externalWallets.length > 0) {
      return externalWallets[0];
    }
    if (preferredWalletType === 'embedded' && embeddedWallet) {
      return embeddedWallet;
    }
    // Default: prefer external if available
    return externalWallets[0] || embeddedWallet;
  }, [preferredWalletType, embeddedWallet, externalWallets]);

  return {
    activeWallet,
    embeddedWallet,
    externalWallets,
    setPreferredWalletType,
    isEmbedded: activeWallet?.walletClientType === 'privy',
  };
}
```

---

## Advanced Patterns

### Server-Side Verification

```tsx
// app/api/auth/verify/route.ts
import { PrivyClient } from '@privy-io/server-auth';
import { NextRequest, NextResponse } from 'next/server';

const privy = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!
);

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const claims = await privy.verifyAuthToken(token);

    return NextResponse.json({
      userId: claims.userId,
      walletAddress: claims.walletAddress,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
}
```

### Auth Token Hook

```tsx
// hooks/useAuthToken.ts
import { usePrivy } from '@privy-io/react-auth';

export function useAuthToken() {
  const { getAccessToken } = usePrivy();

  const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    const token = await getAccessToken();

    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
      },
    });
  };

  return { fetchWithAuth, getAccessToken };
}
```

### Funding Embedded Wallet

```tsx
import { useFundWallet } from '@privy-io/react-auth';

function FundWallet() {
  const { fundWallet } = useFundWallet();

  const handleFund = async (walletAddress: string) => {
    await fundWallet(walletAddress, {
      chain: 'solana',
      amount: '10', // USD amount
    });
  };

  return (
    <button onClick={() => handleFund(walletAddress)}>
      Add Funds
    </button>
  );
}
```

### Export Embedded Wallet

```tsx
import { usePrivy } from '@privy-io/react-auth';

function ExportWallet() {
  const { exportWallet } = usePrivy();

  // User can export their embedded wallet to an external wallet
  const handleExport = async () => {
    await exportWallet();
  };

  return (
    <button onClick={handleExport}>
      Export to External Wallet
    </button>
  );
}
```

---

## Best Practices

### 1. Graceful Degradation

```tsx
function TransactionButton({ onSubmit }: { onSubmit: () => void }) {
  const { ready, authenticated } = usePrivy();
  const { wallets } = useSolanaWallets();

  if (!ready) {
    return <button disabled>Loading...</button>;
  }

  if (!authenticated) {
    return <LoginButton />;
  }

  if (wallets.length === 0) {
    return <button disabled>No wallet available</button>;
  }

  return <button onClick={onSubmit}>Submit Transaction</button>;
}
```

### 2. Wallet Type Awareness

```tsx
// Different UX based on wallet type
function TransactionConfirmation({ wallet }) {
  const isEmbedded = wallet.walletClientType === 'privy';

  if (isEmbedded) {
    // Privy handles confirmation UI
    return <p>Confirm in the popup...</p>;
  } else {
    // External wallet shows its own UI
    return <p>Check your {wallet.walletClientType} wallet...</p>;
  }
}
```

### 3. Error Handling

```tsx
import { useSolanaWallets } from '@privy-io/react-auth';
import { toast } from 'sonner';

function useSignTransaction() {
  const { wallets } = useSolanaWallets();

  const sign = async (transaction: Transaction) => {
    const wallet = wallets[0];
    if (!wallet) throw new Error('No wallet available');

    try {
      return await wallet.signTransaction(transaction);
    } catch (error: any) {
      if (error.message?.includes('User rejected')) {
        toast.info('Transaction cancelled');
        return null;
      }
      if (error.message?.includes('session expired')) {
        toast.error('Session expired. Please log in again.');
        // Trigger re-auth
        return null;
      }
      throw error;
    }
  };

  return { sign };
}
```

---

## External Resources

- [Privy Documentation](https://docs.privy.io/)
- [Privy Solana Guide](https://docs.privy.io/guide/react/wallets/usage/solana/)
- [Privy + Solana Recipe](https://docs.privy.io/recipes/solana/getting-started-with-privy-and-solana)
- [Privy + Helius Integration](https://privy.io/blog/frictionless-and-secure-ux-the-tech-stack-for-solana-onboarding)
