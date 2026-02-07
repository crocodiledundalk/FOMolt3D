# Network Environments

Configuration and patterns for handling different Solana network environments (mainnet, devnet, testnet, localnet).

## Table of Contents

1. [Environment Configuration](#environment-configuration)
2. [Network Context](#network-context)
3. [Feature Flags](#feature-flags)
4. [Environment-Specific Behavior](#environment-specific-behavior)
5. [Testing Considerations](#testing-considerations)

---

## Environment Configuration

### Environment Variables

```env
# .env.local (development - devnet)
NEXT_PUBLIC_NETWORK=devnet
NEXT_PUBLIC_RPC_URL=https://devnet.helius-rpc.com/?api-key=YOUR_KEY
NEXT_PUBLIC_WS_URL=wss://devnet.helius-rpc.com/?api-key=YOUR_KEY

# .env.production (production - mainnet)
NEXT_PUBLIC_NETWORK=mainnet-beta
NEXT_PUBLIC_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
NEXT_PUBLIC_WS_URL=wss://mainnet.helius-rpc.com/?api-key=YOUR_KEY
```

### Network Constants

```tsx
// lib/constants/networks.ts
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { clusterApiUrl } from '@solana/web3.js';

export type Network = 'mainnet-beta' | 'devnet' | 'testnet' | 'localnet';

export interface NetworkConfig {
  name: Network;
  displayName: string;
  rpcUrl: string;
  wsUrl?: string;
  explorerUrl: string;
  walletAdapterNetwork: WalletAdapterNetwork;
  isProduction: boolean;
}

export const NETWORK_CONFIGS: Record<Network, NetworkConfig> = {
  'mainnet-beta': {
    name: 'mainnet-beta',
    displayName: 'Mainnet',
    rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || 'https://api.mainnet-beta.solana.com',
    wsUrl: process.env.NEXT_PUBLIC_WS_URL,
    explorerUrl: 'https://solscan.io',
    walletAdapterNetwork: WalletAdapterNetwork.Mainnet,
    isProduction: true,
  },
  devnet: {
    name: 'devnet',
    displayName: 'Devnet',
    rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || clusterApiUrl('devnet'),
    wsUrl: process.env.NEXT_PUBLIC_WS_URL,
    explorerUrl: 'https://solscan.io',
    walletAdapterNetwork: WalletAdapterNetwork.Devnet,
    isProduction: false,
  },
  testnet: {
    name: 'testnet',
    displayName: 'Testnet',
    rpcUrl: clusterApiUrl('testnet'),
    explorerUrl: 'https://solscan.io',
    walletAdapterNetwork: WalletAdapterNetwork.Testnet,
    isProduction: false,
  },
  localnet: {
    name: 'localnet',
    displayName: 'Localnet',
    rpcUrl: 'http://localhost:8899',
    wsUrl: 'ws://localhost:8900',
    explorerUrl: 'https://explorer.solana.com',
    walletAdapterNetwork: WalletAdapterNetwork.Devnet,
    isProduction: false,
  },
};

export function getNetworkConfig(): NetworkConfig {
  const network = (process.env.NEXT_PUBLIC_NETWORK as Network) || 'mainnet-beta';
  return NETWORK_CONFIGS[network];
}

export function isProduction(): boolean {
  return getNetworkConfig().isProduction;
}

export function isDevnet(): boolean {
  return getNetworkConfig().name === 'devnet';
}
```

---

## Network Context

### Network Provider

```tsx
// contexts/NetworkContext.tsx
'use client';

import { createContext, useContext, useMemo, ReactNode, useState } from 'react';
import { getNetworkConfig, NetworkConfig, Network, NETWORK_CONFIGS } from '@/lib/constants/networks';

interface NetworkContextValue {
  network: Network;
  config: NetworkConfig;
  isProduction: boolean;
  isDevnet: boolean;
  switchNetwork?: (network: Network) => void; // Only in dev
}

const NetworkContext = createContext<NetworkContextValue | null>(null);

export function NetworkProvider({ children }: { children: ReactNode }) {
  const defaultConfig = getNetworkConfig();
  const [network, setNetwork] = useState<Network>(defaultConfig.name);

  const value = useMemo((): NetworkContextValue => {
    const config = NETWORK_CONFIGS[network];
    return {
      network,
      config,
      isProduction: config.isProduction,
      isDevnet: network === 'devnet',
      // Only allow switching in development
      switchNetwork: process.env.NODE_ENV === 'development' ? setNetwork : undefined,
    };
  }, [network]);

  return (
    <NetworkContext.Provider value={value}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetwork must be used within NetworkProvider');
  }
  return context;
}
```

### Network Selector (Dev Only)

```tsx
// components/NetworkSelector.tsx
import { useNetwork } from '@/contexts/NetworkContext';
import { Network, NETWORK_CONFIGS } from '@/lib/constants/networks';

export function NetworkSelector() {
  const { network, switchNetwork, isProduction } = useNetwork();

  // Don't show in production
  if (isProduction || !switchNetwork) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-2">
      <span className="text-yellow-500 text-sm font-medium">Network:</span>
      <select
        value={network}
        onChange={(e) => switchNetwork(e.target.value as Network)}
        className="bg-gray-900 text-white text-sm rounded px-2 py-1 border border-gray-700"
      >
        {Object.values(NETWORK_CONFIGS).map((config) => (
          <option key={config.name} value={config.name}>
            {config.displayName}
          </option>
        ))}
      </select>
    </div>
  );
}
```

### Network Badge

```tsx
// components/NetworkBadge.tsx
import { useNetwork } from '@/contexts/NetworkContext';

export function NetworkBadge() {
  const { network, isProduction } = useNetwork();

  // Don't show badge on production
  if (isProduction) {
    return null;
  }

  const colors = {
    devnet: 'bg-purple-500/20 text-purple-400 border-purple-500/50',
    testnet: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
    localnet: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
  };

  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded border ${colors[network] || colors.devnet}`}>
      {network.toUpperCase()}
    </span>
  );
}
```

---

## Feature Flags

### Environment-Based Features

```tsx
// lib/features.ts
import { getNetworkConfig } from './constants/networks';

export const features = {
  // Show faucet link on devnet
  showFaucet: (): boolean => {
    const { name } = getNetworkConfig();
    return name === 'devnet' || name === 'localnet';
  },

  // Enable priority fees on mainnet
  enablePriorityFees: (): boolean => {
    const { isProduction } = getNetworkConfig();
    return isProduction;
  },

  // Enable Jito bundles on mainnet
  enableJitoBundles: (): boolean => {
    const { isProduction } = getNetworkConfig();
    return isProduction;
  },

  // Show debug info in dev
  showDebugInfo: (): boolean => {
    return process.env.NODE_ENV === 'development';
  },

  // Different confirmation levels
  defaultCommitment: (): 'processed' | 'confirmed' | 'finalized' => {
    const { isProduction } = getNetworkConfig();
    return isProduction ? 'confirmed' : 'processed';
  },

  // Analytics tracking
  enableAnalytics: (): boolean => {
    const { isProduction } = getNetworkConfig();
    return isProduction;
  },
};
```

### Feature Flag Hook

```tsx
// hooks/useFeatures.ts
import { useMemo } from 'react';
import { features } from '@/lib/features';
import { useNetwork } from '@/contexts/NetworkContext';

export function useFeatures() {
  const { network, isProduction } = useNetwork();

  return useMemo(() => ({
    showFaucet: features.showFaucet(),
    enablePriorityFees: features.enablePriorityFees(),
    enableJitoBundles: features.enableJitoBundles(),
    showDebugInfo: features.showDebugInfo(),
    defaultCommitment: features.defaultCommitment(),
    enableAnalytics: features.enableAnalytics(),
    network,
    isProduction,
  }), [network, isProduction]);
}
```

### Conditional Rendering

```tsx
// components/Header.tsx
import { useFeatures } from '@/hooks/useFeatures';

export function Header() {
  const { showFaucet, showDebugInfo } = useFeatures();

  return (
    <header>
      <nav>
        <Link href="/">Home</Link>
        <Link href="/trade">Trade</Link>
        {showFaucet && <Link href="/faucet">Faucet</Link>}
      </nav>

      {showDebugInfo && <DebugPanel />}
    </header>
  );
}
```

---

## Environment-Specific Behavior

### Transaction Options

```tsx
// lib/transaction/options.ts
import { getNetworkConfig } from '@/lib/constants/networks';

export function getTransactionOptions() {
  const { isProduction } = getNetworkConfig();

  return {
    // Higher priority fees on mainnet
    defaultPriorityFee: isProduction ? 10000 : 0, // micro-lamports

    // Stricter preflight on mainnet
    skipPreflight: isProduction ? false : true,

    // Commitment level
    preflightCommitment: isProduction ? 'confirmed' : 'processed',

    // Max retries
    maxRetries: isProduction ? 3 : 1,

    // Confirmation timeout
    confirmationTimeout: isProduction ? 60000 : 30000,
  };
}
```

### Program IDs

```tsx
// lib/constants/programs.ts
import { PublicKey } from '@solana/web3.js';
import { getNetworkConfig } from './networks';

interface ProgramIds {
  myProgram: PublicKey;
  tokenProgram: PublicKey;
  systemProgram: PublicKey;
}

const MAINNET_PROGRAMS: ProgramIds = {
  myProgram: new PublicKey('MainnetProgramId111111111111111111111'),
  tokenProgram: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
  systemProgram: new PublicKey('11111111111111111111111111111111'),
};

const DEVNET_PROGRAMS: ProgramIds = {
  myProgram: new PublicKey('DevnetProgramId1111111111111111111111'),
  tokenProgram: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
  systemProgram: new PublicKey('11111111111111111111111111111111'),
};

export function getProgramIds(): ProgramIds {
  const { name } = getNetworkConfig();
  return name === 'mainnet-beta' ? MAINNET_PROGRAMS : DEVNET_PROGRAMS;
}
```

### Explorer URLs

```tsx
// lib/explorer.ts
import { getNetworkConfig } from './constants/networks';

export function getExplorerUrl(type: 'tx' | 'account', identifier: string): string {
  const { name, explorerUrl } = getNetworkConfig();

  const path = type === 'tx' ? '/tx' : '/account';
  const cluster = name === 'mainnet-beta' ? '' : `?cluster=${name}`;

  return `${explorerUrl}${path}/${identifier}${cluster}`;
}
```

### Token Lists

```tsx
// lib/tokens.ts
import { getNetworkConfig } from './constants/networks';

interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
}

const MAINNET_TOKENS: TokenInfo[] = [
  {
    address: 'So11111111111111111111111111111111111111112',
    symbol: 'SOL',
    name: 'Wrapped SOL',
    decimals: 9,
  },
  {
    address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
  },
  // ... more tokens
];

const DEVNET_TOKENS: TokenInfo[] = [
  {
    address: 'So11111111111111111111111111111111111111112',
    symbol: 'SOL',
    name: 'Wrapped SOL',
    decimals: 9,
  },
  // ... devnet test tokens
];

export function getTokenList(): TokenInfo[] {
  const { name } = getNetworkConfig();
  return name === 'mainnet-beta' ? MAINNET_TOKENS : DEVNET_TOKENS;
}
```

---

## Testing Considerations

### Test Environment Setup

```tsx
// test/setup.ts
import { NETWORK_CONFIGS } from '@/lib/constants/networks';

// Override for tests
process.env.NEXT_PUBLIC_NETWORK = 'devnet';
process.env.NEXT_PUBLIC_RPC_URL = 'https://api.devnet.solana.com';

// Mock network config for tests
export const mockNetworkConfig = NETWORK_CONFIGS.devnet;
```

### Mocking Network Context

```tsx
// test/mocks/NetworkContext.tsx
import { NetworkContext } from '@/contexts/NetworkContext';
import { NETWORK_CONFIGS } from '@/lib/constants/networks';

export function MockNetworkProvider({
  children,
  network = 'devnet',
}: {
  children: React.ReactNode;
  network?: Network;
}) {
  const config = NETWORK_CONFIGS[network];

  return (
    <NetworkContext.Provider
      value={{
        network,
        config,
        isProduction: config.isProduction,
        isDevnet: network === 'devnet',
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
}
```

### Environment-Aware Tests

```tsx
// __tests__/TransferForm.test.tsx
import { render, screen } from '@testing-library/react';
import { MockNetworkProvider } from '@/test/mocks/NetworkContext';
import { TransferForm } from '@/components/TransferForm';

describe('TransferForm', () => {
  it('shows priority fee selector on mainnet', () => {
    render(
      <MockNetworkProvider network="mainnet-beta">
        <TransferForm />
      </MockNetworkProvider>
    );

    expect(screen.getByLabelText('Priority Fee')).toBeInTheDocument();
  });

  it('hides priority fee selector on devnet', () => {
    render(
      <MockNetworkProvider network="devnet">
        <TransferForm />
      </MockNetworkProvider>
    );

    expect(screen.queryByLabelText('Priority Fee')).not.toBeInTheDocument();
  });
});
```

---

## Best Practices

### 1. Environment Variables

```tsx
// Always validate env vars at startup
const requiredEnvVars = ['NEXT_PUBLIC_RPC_URL', 'NEXT_PUBLIC_NETWORK'];

requiredEnvVars.forEach((envVar) => {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
});
```

### 2. Visual Indicators

```tsx
// Always show network on non-production
{!isProduction && <NetworkBadge />}
```

### 3. Fail-Safe Defaults

```tsx
// Default to mainnet for safety
const network = process.env.NEXT_PUBLIC_NETWORK || 'mainnet-beta';
```

### 4. Prevent Production Accidents

```tsx
// Add warning for destructive actions on mainnet
if (isProduction) {
  const confirmed = await confirm('This action uses real funds. Continue?');
  if (!confirmed) return;
}
```

---

## External Resources

- [Solana Clusters](https://solana.com/docs/references/clusters)
- [Helius RPC](https://www.helius.dev/)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
