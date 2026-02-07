# Wallet Adapter Integration

Comprehensive guide for integrating Solana Wallet Adapter into Next.js applications. Covers setup, hooks, authentication patterns, and best practices.

## Table of Contents

1. [Installation](#installation)
2. [Provider Setup](#provider-setup)
3. [Core Hooks](#core-hooks)
4. [Wallet Connection UI](#wallet-connection-ui)
5. [Authentication Patterns](#authentication-patterns)
6. [Mobile Wallet Adapter](#mobile-wallet-adapter)
7. [Advanced Patterns](#advanced-patterns)
8. [Troubleshooting](#troubleshooting)

---

## Installation

```bash
npm install @solana/wallet-adapter-base \
  @solana/wallet-adapter-react \
  @solana/wallet-adapter-react-ui \
  @solana/wallet-adapter-wallets \
  @solana/web3.js
```

### Recommended Wallet Adapters

```bash
# Individual wallets (tree-shakeable, recommended)
npm install @solana/wallet-adapter-phantom \
  @solana/wallet-adapter-solflare \
  @solana/wallet-adapter-backpack \
  @solana/wallet-adapter-coinbase
```

### Package Versions (Recommended)

```json
{
  "@solana/wallet-adapter-base": "^0.9.23",
  "@solana/wallet-adapter-react": "^0.15.35",
  "@solana/wallet-adapter-react-ui": "^0.9.35",
  "@solana/wallet-adapter-wallets": "^0.19.32",
  "@solana/web3.js": "^1.95.0"
}
```

---

## Provider Setup

### Basic Setup (Next.js App Router)

```tsx
// app/providers.tsx
'use client';

import { useMemo, ReactNode } from 'react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';

// Import wallet adapter styles
import '@solana/wallet-adapter-react-ui/styles.css';

interface ProvidersProps {
  children: ReactNode;
}

export function WalletProviders({ children }: ProvidersProps) {
  // Configure network - use env var or default to mainnet
  const network = (process.env.NEXT_PUBLIC_NETWORK as WalletAdapterNetwork) || WalletAdapterNetwork.Mainnet;

  // Use custom RPC or fallback to public endpoint
  const endpoint = useMemo(() => {
    const customRpc = process.env.NEXT_PUBLIC_RPC_URL;
    if (customRpc) return customRpc;
    return clusterApiUrl(network);
  }, [network]);

  // Initialize wallet adapters
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [network]
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
```

### App Layout Integration

```tsx
// app/layout.tsx
import { WalletProviders } from './providers';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <WalletProviders>
          {children}
        </WalletProviders>
      </body>
    </html>
  );
}
```

### WalletProvider Options

```tsx
<WalletProvider
  wallets={wallets}
  autoConnect={true}              // Auto-reconnect on page load
  onError={(error) => {           // Global error handler
    console.error('Wallet error:', error);
    toast.error(error.message);
  }}
  localStorageKey="walletAdapter" // Custom storage key
>
```

---

## Core Hooks

### useWallet

Primary hook for wallet state and operations.

```tsx
import { useWallet } from '@solana/wallet-adapter-react';

function WalletInfo() {
  const {
    // State
    publicKey,           // PublicKey | null - connected wallet address
    connected,           // boolean - is wallet connected
    connecting,          // boolean - connection in progress
    disconnecting,       // boolean - disconnection in progress
    wallet,              // Wallet | null - current wallet adapter
    wallets,             // Wallet[] - all available wallets

    // Methods
    connect,             // () => Promise<void>
    disconnect,          // () => Promise<void>
    select,              // (walletName: WalletName) => void

    // Transaction methods
    signTransaction,     // (tx: Transaction) => Promise<Transaction>
    signAllTransactions, // (txs: Transaction[]) => Promise<Transaction[]>
    signMessage,         // (message: Uint8Array) => Promise<Uint8Array>
    sendTransaction,     // (tx: Transaction, connection, options?) => Promise<string>
  } = useWallet();

  if (!connected) {
    return <p>Please connect your wallet</p>;
  }

  return (
    <div>
      <p>Connected: {publicKey?.toBase58()}</p>
      <button onClick={disconnect}>Disconnect</button>
    </div>
  );
}
```

### useConnection

Access the Solana connection instance.

```tsx
import { useConnection } from '@solana/wallet-adapter-react';

function ConnectionInfo() {
  const { connection } = useConnection();

  const fetchBalance = async (publicKey: PublicKey) => {
    const balance = await connection.getBalance(publicKey);
    return balance / LAMPORTS_PER_SOL;
  };

  return <div>RPC: {connection.rpcEndpoint}</div>;
}
```

### useAnchorWallet

Get wallet interface compatible with Anchor's `Provider`.

```tsx
import { useAnchorWallet } from '@solana/wallet-adapter-react';
import { AnchorProvider, Program } from '@coral-xyz/anchor';

function useProgram() {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();

  const provider = useMemo(() => {
    if (!wallet) return null;
    return new AnchorProvider(connection, wallet, {
      commitment: 'confirmed',
    });
  }, [connection, wallet]);

  const program = useMemo(() => {
    if (!provider) return null;
    return new Program(IDL, PROGRAM_ID, provider);
  }, [provider]);

  return { program, provider };
}
```

---

## Wallet Connection UI

### Built-in Components

```tsx
import {
  WalletMultiButton,
  WalletConnectButton,
  WalletDisconnectButton,
  WalletModalButton,
} from '@solana/wallet-adapter-react-ui';

function Header() {
  return (
    <header>
      {/* All-in-one button - recommended */}
      <WalletMultiButton />

      {/* Or individual buttons */}
      <WalletConnectButton />
      <WalletDisconnectButton />
      <WalletModalButton />
    </header>
  );
}
```

### Custom Connect Button

```tsx
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';

function CustomConnectButton() {
  const { publicKey, connected, disconnect } = useWallet();
  const { setVisible } = useWalletModal();

  if (connected && publicKey) {
    return (
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm">
          {publicKey.toBase58().slice(0, 4)}...{publicKey.toBase58().slice(-4)}
        </span>
        <button
          onClick={disconnect}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setVisible(true)}
      className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
    >
      Connect Wallet
    </button>
  );
}
```

### Styling the Modal

```css
/* Override wallet adapter styles */
.wallet-adapter-modal-wrapper {
  background-color: rgba(0, 0, 0, 0.8);
}

.wallet-adapter-modal {
  background-color: #1a1a2e;
  border-radius: 16px;
}

.wallet-adapter-button {
  background-color: #7c3aed;
}

.wallet-adapter-button:hover {
  background-color: #6d28d9;
}
```

---

## Authentication Patterns

### Sign-In with Solana (SIWS)

```tsx
// lib/auth.ts
import { SigninMessage } from '@solana/wallet-standard-features';
import bs58 from 'bs58';

interface SIWSMessage {
  domain: string;
  address: string;
  statement: string;
  nonce: string;
  issuedAt: string;
  expirationTime?: string;
}

export function createSIWSMessage(params: SIWSMessage): string {
  return `${params.domain} wants you to sign in with your Solana account:
${params.address}

${params.statement}

Nonce: ${params.nonce}
Issued At: ${params.issuedAt}${params.expirationTime ? `\nExpiration Time: ${params.expirationTime}` : ''}`;
}

export function verifySIWSSignature(
  message: string,
  signature: Uint8Array,
  publicKey: PublicKey
): boolean {
  const messageBytes = new TextEncoder().encode(message);
  return nacl.sign.detached.verify(messageBytes, signature, publicKey.toBytes());
}
```

### Authentication Hook

```tsx
// hooks/useAuth.ts
import { useWallet } from '@solana/wallet-adapter-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export function useAuth() {
  const { publicKey, signMessage, connected } = useWallet();
  const queryClient = useQueryClient();

  const { data: session, isLoading: isLoadingSession } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const res = await fetch('/api/auth/session');
      if (!res.ok) return null;
      return res.json();
    },
  });

  const signIn = useMutation({
    mutationFn: async () => {
      if (!publicKey || !signMessage) {
        throw new Error('Wallet not connected');
      }

      // Get nonce from server
      const nonceRes = await fetch('/api/auth/nonce');
      const { nonce } = await nonceRes.json();

      // Create SIWS message
      const message = createSIWSMessage({
        domain: window.location.host,
        address: publicKey.toBase58(),
        statement: 'Sign in to MyApp',
        nonce,
        issuedAt: new Date().toISOString(),
      });

      // Sign message
      const signature = await signMessage(new TextEncoder().encode(message));

      // Verify with server
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          signature: bs58.encode(signature),
          publicKey: publicKey.toBase58(),
        }),
      });

      if (!res.ok) {
        throw new Error('Authentication failed');
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session'] });
    },
  });

  const signOut = useMutation({
    mutationFn: async () => {
      await fetch('/api/auth/logout', { method: 'POST' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session'] });
    },
  });

  return {
    session,
    isLoadingSession,
    isAuthenticated: !!session,
    signIn,
    signOut,
  };
}
```

### Protected Route Component

```tsx
// components/ProtectedRoute.tsx
import { useWallet } from '@solana/wallet-adapter-react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;  // Require SIWS signature
}

export function ProtectedRoute({ children, requireAuth = false }: ProtectedRouteProps) {
  const { connected, connecting } = useWallet();
  const { isAuthenticated, isLoadingSession } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!connecting && !connected) {
      router.push('/');
    }
  }, [connected, connecting, router]);

  if (connecting || isLoadingSession) {
    return <LoadingSpinner />;
  }

  if (!connected) {
    return null;
  }

  if (requireAuth && !isAuthenticated) {
    return <SignInPrompt />;
  }

  return <>{children}</>;
}
```

---

## Mobile Wallet Adapter

### Setup for React Native / Mobile Web

```tsx
// For mobile web, the standard adapter works
// For React Native, use @solana-mobile/mobile-wallet-adapter-protocol

import { SolanaMobileWalletAdapter } from '@solana-mobile/wallet-adapter-mobile';

const wallets = useMemo(
  () => [
    new SolanaMobileWalletAdapter({
      appIdentity: {
        name: 'My App',
        uri: 'https://myapp.com',
        icon: 'https://myapp.com/icon.png',
      },
      authorizationResultCache: createDefaultAuthorizationResultCache(),
      cluster: WalletAdapterNetwork.Mainnet,
    }),
    // Fallback to browser wallets
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter(),
  ],
  []
);
```

### Mobile Detection

```tsx
// hooks/useMobileDetect.ts
export function useMobileDetect() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor;
      const isMobileDevice = /android|iphone|ipad|ipod|windows phone/i.test(userAgent);
      setIsMobile(isMobileDevice);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}
```

---

## Advanced Patterns

### Wallet Event Listeners

```tsx
// hooks/useWalletEvents.ts
import { useWallet } from '@solana/wallet-adapter-react';
import { useEffect } from 'react';

export function useWalletEvents() {
  const { wallet, publicKey } = useWallet();

  useEffect(() => {
    if (!wallet) return;

    const handleConnect = () => {
      console.log('Wallet connected:', publicKey?.toBase58());
      // Track analytics, initialize user state, etc.
    };

    const handleDisconnect = () => {
      console.log('Wallet disconnected');
      // Clear user state, redirect, etc.
    };

    const handleError = (error: Error) => {
      console.error('Wallet error:', error);
      toast.error(`Wallet error: ${error.message}`);
    };

    wallet.adapter.on('connect', handleConnect);
    wallet.adapter.on('disconnect', handleDisconnect);
    wallet.adapter.on('error', handleError);

    return () => {
      wallet.adapter.off('connect', handleConnect);
      wallet.adapter.off('disconnect', handleDisconnect);
      wallet.adapter.off('error', handleError);
    };
  }, [wallet, publicKey]);
}
```

### Multiple Wallet Support

```tsx
// components/WalletSelector.tsx
import { useWallet } from '@solana/wallet-adapter-react';

function WalletSelector() {
  const { wallets, select, wallet } = useWallet();

  const installedWallets = wallets.filter(
    (w) => w.readyState === 'Installed' || w.readyState === 'Loadable'
  );

  return (
    <div className="space-y-2">
      <h3>Select Wallet</h3>
      {installedWallets.map((w) => (
        <button
          key={w.adapter.name}
          onClick={() => select(w.adapter.name)}
          className={`flex items-center gap-2 p-2 rounded ${
            wallet?.adapter.name === w.adapter.name ? 'bg-purple-500' : 'bg-gray-700'
          }`}
        >
          <img src={w.adapter.icon} alt={w.adapter.name} className="w-6 h-6" />
          <span>{w.adapter.name}</span>
        </button>
      ))}
    </div>
  );
}
```

### Persistent Wallet Selection

```tsx
// hooks/usePersistedWallet.ts
import { useWallet } from '@solana/wallet-adapter-react';
import { useEffect } from 'react';

const WALLET_KEY = 'preferredWallet';

export function usePersistedWallet() {
  const { wallet, select, wallets, connected } = useWallet();

  // Restore saved wallet on mount
  useEffect(() => {
    const savedWallet = localStorage.getItem(WALLET_KEY);
    if (savedWallet && !connected) {
      const walletToSelect = wallets.find(
        (w) => w.adapter.name === savedWallet
      );
      if (walletToSelect) {
        select(walletToSelect.adapter.name);
      }
    }
  }, [wallets, select, connected]);

  // Save wallet selection
  useEffect(() => {
    if (wallet) {
      localStorage.setItem(WALLET_KEY, wallet.adapter.name);
    }
  }, [wallet]);
}
```

---

## Troubleshooting

### Common Issues

**"WalletNotConnectedError"**
```tsx
// Always check wallet state before operations
const { publicKey, signTransaction } = useWallet();

if (!publicKey || !signTransaction) {
  toast.error('Please connect your wallet');
  return;
}
```

**"User rejected the request"**
```tsx
try {
  await signTransaction(tx);
} catch (error) {
  if (error.message.includes('User rejected')) {
    toast.info('Transaction cancelled');
    return;
  }
  throw error;
}
```

**Wallet not detected**
```tsx
const { wallets } = useWallet();

const hasInstalledWallet = wallets.some(
  (w) => w.readyState === 'Installed'
);

if (!hasInstalledWallet) {
  return (
    <a href="https://phantom.app" target="_blank">
      Install Phantom Wallet
    </a>
  );
}
```

**SSR Hydration Issues**
```tsx
// Ensure wallet components only render client-side
'use client';

import dynamic from 'next/dynamic';

const WalletMultiButton = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then((mod) => mod.WalletMultiButton),
  { ssr: false }
);
```

### Best Practices

1. **Always check connection state** before wallet operations
2. **Handle user rejection gracefully** - it's not an error
3. **Use autoConnect** for returning users
4. **Provide fallback UI** when no wallet is installed
5. **Test on mobile** - behavior differs from desktop
6. **Clear state on disconnect** - don't assume persistence

---

## External Resources

- [Wallet Adapter GitHub](https://github.com/anza-xyz/wallet-adapter)
- [Solana Cookbook - Connect Wallet React](https://solana.com/developers/cookbook/wallets/connect-wallet-react)
- [Sign In With Solana](https://siws.web3auth.io/)
- [Mobile Wallet Adapter Docs](https://docs.solanamobile.com/react-native/using_mobile_wallet_adapter)
