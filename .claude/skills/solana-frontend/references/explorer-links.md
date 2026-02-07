# Explorer Links

Patterns for generating and displaying links to Solana block explorers for accounts and transactions.

## Table of Contents

1. [Explorer URL Patterns](#explorer-url-patterns)
2. [Link Generation Utilities](#link-generation-utilities)
3. [User Preferences](#user-preferences)
4. [Link Components](#link-components)
5. [Best Practices](#best-practices)

---

## Explorer URL Patterns

### Supported Explorers

| Explorer | Base URL | Accounts | Transactions |
|----------|----------|----------|--------------|
| Solscan | solscan.io | /account/{address} | /tx/{signature} |
| Solana Explorer | explorer.solana.com | /address/{address} | /tx/{signature} |
| Solana.fm | solana.fm | /address/{address} | /tx/{signature} |
| XRAY | xray.helius.xyz | /account/{address} | /tx/{signature} |

### Network Parameters

```tsx
// Solscan
// Mainnet: https://solscan.io/tx/{sig}
// Devnet: https://solscan.io/tx/{sig}?cluster=devnet

// Solana Explorer
// Mainnet: https://explorer.solana.com/tx/{sig}
// Devnet: https://explorer.solana.com/tx/{sig}?cluster=devnet

// Solana.fm
// Mainnet: https://solana.fm/tx/{sig}
// Devnet: https://solana.fm/tx/{sig}?cluster=devnet-solana
```

---

## Link Generation Utilities

### Explorer URL Generator

```tsx
// lib/explorerLinks.ts
export type Explorer = 'solscan' | 'solana-explorer' | 'solana-fm' | 'xray';
export type Network = 'mainnet-beta' | 'devnet' | 'testnet' | 'localnet';

interface ExplorerConfig {
  baseUrl: string;
  accountPath: string;
  txPath: string;
  tokenPath?: string;
  networkParam: (network: Network) => string;
}

const EXPLORER_CONFIGS: Record<Explorer, ExplorerConfig> = {
  solscan: {
    baseUrl: 'https://solscan.io',
    accountPath: '/account',
    txPath: '/tx',
    tokenPath: '/token',
    networkParam: (network) => {
      if (network === 'mainnet-beta') return '';
      return `?cluster=${network}`;
    },
  },
  'solana-explorer': {
    baseUrl: 'https://explorer.solana.com',
    accountPath: '/address',
    txPath: '/tx',
    networkParam: (network) => {
      if (network === 'mainnet-beta') return '';
      return `?cluster=${network}`;
    },
  },
  'solana-fm': {
    baseUrl: 'https://solana.fm',
    accountPath: '/address',
    txPath: '/tx',
    networkParam: (network) => {
      if (network === 'mainnet-beta') return '';
      if (network === 'devnet') return '?cluster=devnet-solana';
      return `?cluster=${network}`;
    },
  },
  xray: {
    baseUrl: 'https://xray.helius.xyz',
    accountPath: '/account',
    txPath: '/tx',
    tokenPath: '/token',
    networkParam: (network) => {
      if (network === 'mainnet-beta') return '';
      return `?network=${network}`;
    },
  },
};

export function getExplorerUrl(
  explorer: Explorer,
  type: 'account' | 'tx' | 'token',
  identifier: string,
  network: Network = 'mainnet-beta'
): string {
  const config = EXPLORER_CONFIGS[explorer];

  let path: string;
  switch (type) {
    case 'account':
      path = config.accountPath;
      break;
    case 'tx':
      path = config.txPath;
      break;
    case 'token':
      path = config.tokenPath || config.accountPath;
      break;
    default:
      path = config.accountPath;
  }

  return `${config.baseUrl}${path}/${identifier}${config.networkParam(network)}`;
}

// Convenience functions
export function getAccountUrl(
  address: string,
  network: Network = 'mainnet-beta',
  explorer: Explorer = 'solscan'
): string {
  return getExplorerUrl(explorer, 'account', address, network);
}

export function getTransactionUrl(
  signature: string,
  network: Network = 'mainnet-beta',
  explorer: Explorer = 'solscan'
): string {
  return getExplorerUrl(explorer, 'tx', signature, network);
}

export function getTokenUrl(
  mint: string,
  network: Network = 'mainnet-beta',
  explorer: Explorer = 'solscan'
): string {
  return getExplorerUrl(explorer, 'token', mint, network);
}
```

### Hook for Explorer URLs

```tsx
// hooks/useExplorerUrl.ts
import { useMemo } from 'react';
import { getExplorerUrl, Explorer, Network } from '@/lib/explorerLinks';
import { useExplorerPreference } from '@/contexts/ExplorerPreferenceContext';
import { useNetwork } from '@/contexts/NetworkContext';

export function useExplorerUrl() {
  const { explorer } = useExplorerPreference();
  const { network } = useNetwork();

  return useMemo(() => ({
    getAccountUrl: (address: string) =>
      getExplorerUrl(explorer, 'account', address, network),
    getTransactionUrl: (signature: string) =>
      getExplorerUrl(explorer, 'tx', signature, network),
    getTokenUrl: (mint: string) =>
      getExplorerUrl(explorer, 'token', mint, network),
  }), [explorer, network]);
}
```

---

## User Preferences

### Explorer Preference Context

```tsx
// contexts/ExplorerPreferenceContext.tsx
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Explorer } from '@/lib/explorerLinks';

interface ExplorerPreferenceContextValue {
  explorer: Explorer;
  setExplorer: (explorer: Explorer) => void;
  explorers: Explorer[];
}

const ExplorerPreferenceContext = createContext<ExplorerPreferenceContextValue | null>(null);

const STORAGE_KEY = 'preferred-explorer';
const DEFAULT_EXPLORER: Explorer = 'solscan';
const AVAILABLE_EXPLORERS: Explorer[] = ['solscan', 'solana-explorer', 'solana-fm', 'xray'];

export function ExplorerPreferenceProvider({ children }: { children: ReactNode }) {
  const [explorer, setExplorerState] = useState<Explorer>(DEFAULT_EXPLORER);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Explorer | null;
    if (saved && AVAILABLE_EXPLORERS.includes(saved)) {
      setExplorerState(saved);
    }
  }, []);

  const setExplorer = (newExplorer: Explorer) => {
    setExplorerState(newExplorer);
    localStorage.setItem(STORAGE_KEY, newExplorer);
  };

  return (
    <ExplorerPreferenceContext.Provider
      value={{
        explorer,
        setExplorer,
        explorers: AVAILABLE_EXPLORERS,
      }}
    >
      {children}
    </ExplorerPreferenceContext.Provider>
  );
}

export function useExplorerPreference() {
  const context = useContext(ExplorerPreferenceContext);
  if (!context) {
    throw new Error('useExplorerPreference must be used within ExplorerPreferenceProvider');
  }
  return context;
}
```

### Explorer Selector Component

```tsx
// components/ExplorerSelector.tsx
import { useExplorerPreference } from '@/contexts/ExplorerPreferenceContext';
import { Explorer } from '@/lib/explorerLinks';

const EXPLORER_INFO: Record<Explorer, { name: string; icon: string }> = {
  solscan: { name: 'Solscan', icon: '🔍' },
  'solana-explorer': { name: 'Solana Explorer', icon: '🌐' },
  'solana-fm': { name: 'Solana FM', icon: '📻' },
  xray: { name: 'XRAY (Helius)', icon: '⚡' },
};

export function ExplorerSelector() {
  const { explorer, setExplorer, explorers } = useExplorerPreference();

  return (
    <div className="space-y-2">
      <label className="text-sm text-gray-400">Preferred Explorer</label>

      <div className="space-y-1">
        {explorers.map((exp) => (
          <button
            key={exp}
            onClick={() => setExplorer(exp)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded ${
              explorer === exp
                ? 'bg-purple-500/20 border border-purple-500'
                : 'bg-gray-800 border border-gray-700 hover:border-gray-600'
            }`}
          >
            <span>{EXPLORER_INFO[exp].icon}</span>
            <span>{EXPLORER_INFO[exp].name}</span>
            {explorer === exp && (
              <span className="ml-auto text-xs text-purple-400">Selected</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
```

---

## Link Components

### External Link Component

```tsx
// components/ExplorerLink.tsx
import { useExplorerUrl } from '@/hooks/useExplorerUrl';
import { truncateAddress } from '@/lib/utils';

interface ExplorerLinkProps {
  type: 'account' | 'transaction' | 'token';
  value: string;
  label?: string;
  truncate?: boolean;
  showIcon?: boolean;
  className?: string;
}

export function ExplorerLink({
  type,
  value,
  label,
  truncate = true,
  showIcon = true,
  className = '',
}: ExplorerLinkProps) {
  const { getAccountUrl, getTransactionUrl, getTokenUrl } = useExplorerUrl();

  const url = type === 'account'
    ? getAccountUrl(value)
    : type === 'transaction'
      ? getTransactionUrl(value)
      : getTokenUrl(value);

  const displayText = label ?? (truncate ? truncateAddress(value) : value);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1 text-purple-400 hover:text-purple-300 ${className}`}
    >
      <span className="font-mono">{displayText}</span>
      {showIcon && (
        <svg
          className="w-3 h-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
          />
        </svg>
      )}
    </a>
  );
}
```

### Transaction Link Component

```tsx
// components/TransactionLink.tsx
import { ExplorerLink } from './ExplorerLink';

interface TransactionLinkProps {
  signature: string;
  label?: string;
  className?: string;
}

export function TransactionLink({ signature, label, className }: TransactionLinkProps) {
  return (
    <ExplorerLink
      type="transaction"
      value={signature}
      label={label}
      truncate={!label}
      className={className}
    />
  );
}
```

### Account Link Component

```tsx
// components/AccountLink.tsx
import { ExplorerLink } from './ExplorerLink';

interface AccountLinkProps {
  address: string;
  label?: string;
  truncateLength?: number;
  className?: string;
}

export function AccountLink({
  address,
  label,
  truncateLength,
  className,
}: AccountLinkProps) {
  const displayLabel = label ?? (
    truncateLength
      ? `${address.slice(0, truncateLength)}...${address.slice(-truncateLength)}`
      : undefined
  );

  return (
    <ExplorerLink
      type="account"
      value={address}
      label={displayLabel}
      truncate={!label && !truncateLength}
      className={className}
    />
  );
}
```

### Clickable Address with Copy

```tsx
// components/AddressWithActions.tsx
import { useState } from 'react';
import { useExplorerUrl } from '@/hooks/useExplorerUrl';
import { truncateAddress } from '@/lib/utils';

interface AddressWithActionsProps {
  address: string;
  label?: string;
  truncateLength?: number;
}

export function AddressWithActions({
  address,
  label,
  truncateLength = 4,
}: AddressWithActionsProps) {
  const [copied, setCopied] = useState(false);
  const { getAccountUrl } = useExplorerUrl();

  const displayText = label ?? truncateAddress(address, truncateLength);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="inline-flex items-center gap-1">
      <a
        href={getAccountUrl(address)}
        target="_blank"
        rel="noopener noreferrer"
        className="font-mono text-purple-400 hover:text-purple-300"
        title={address}
      >
        {displayText}
      </a>

      <button
        onClick={handleCopy}
        className="p-1 text-gray-400 hover:text-gray-300"
        title="Copy address"
      >
        {copied ? (
          <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        )}
      </button>

      <a
        href={getAccountUrl(address)}
        target="_blank"
        rel="noopener noreferrer"
        className="p-1 text-gray-400 hover:text-gray-300"
        title="View on explorer"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
          />
        </svg>
      </a>
    </div>
  );
}
```

---

## Best Practices

### 1. Always Open in New Tab

```tsx
// Correct
<a href={url} target="_blank" rel="noopener noreferrer">

// Never navigate away from your app
<a href={url}>  // Bad - loses user state
```

### 2. Support User Preferences

```tsx
// Let users choose their explorer
const { explorer } = useExplorerPreference();
const url = getTransactionUrl(signature, network, explorer);
```

### 3. Handle Network Correctly

```tsx
// Always include network parameter for non-mainnet
const network = process.env.NEXT_PUBLIC_NETWORK;
const url = getTransactionUrl(signature, network);
```

### 4. Provide Full Address on Hover

```tsx
<a
  href={url}
  title={fullAddress}  // Show full address on hover
>
  {truncatedAddress}
</a>
```

### 5. Visual Indication of External Link

```tsx
// Use icon to indicate external link
<span>View on Explorer</span>
<ExternalLinkIcon />
```

---

## External Resources

- [Solscan](https://solscan.io/)
- [Solana Explorer](https://explorer.solana.com/)
- [Solana.fm](https://solana.fm/)
- [XRAY by Helius](https://xray.helius.xyz/)
