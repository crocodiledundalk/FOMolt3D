# Address Display and Formatting

Utilities and components for displaying Solana addresses and transaction signatures with consistent formatting, truncation, and copy functionality.

## Table of Contents

1. [Truncation Utilities](#truncation-utilities)
2. [Display Components](#display-components)
3. [Clipboard Integration](#clipboard-integration)
4. [Token Amount Formatting](#token-amount-formatting)
5. [Styling Conventions](#styling-conventions)

---

## Truncation Utilities

### Address Truncation

```tsx
// lib/formatters.ts

/**
 * Truncate a Solana address or signature for display
 * Default: 4 characters on each end
 */
export function truncateAddress(
  address: string,
  startChars: number = 4,
  endChars: number = 4
): string {
  if (!address) return '';
  if (address.length <= startChars + endChars) return address;

  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

// Preset configurations
export const truncatePresets = {
  short: (address: string) => truncateAddress(address, 4, 4),    // Abc1...xyz9
  medium: (address: string) => truncateAddress(address, 6, 6),   // Abc123...xyz789
  long: (address: string) => truncateAddress(address, 8, 8),     // Abc12345...xyz78901
  signature: (sig: string) => truncateAddress(sig, 8, 8),        // For tx signatures
};

/**
 * Format for different contexts
 */
export function formatAddress(
  address: string,
  context: 'table' | 'tooltip' | 'header' | 'inline' = 'inline'
): string {
  switch (context) {
    case 'table':
      return truncateAddress(address, 4, 4);
    case 'tooltip':
      return address; // Full address
    case 'header':
      return truncateAddress(address, 6, 6);
    case 'inline':
    default:
      return truncateAddress(address, 4, 4);
  }
}
```

### Signature Formatting

```tsx
// lib/formatters.ts

/**
 * Format transaction signature for display
 */
export function formatSignature(signature: string, length: 'short' | 'medium' | 'long' = 'short'): string {
  switch (length) {
    case 'short':
      return truncateAddress(signature, 8, 8);
    case 'medium':
      return truncateAddress(signature, 16, 16);
    case 'long':
      return truncateAddress(signature, 24, 24);
    default:
      return truncateAddress(signature, 8, 8);
  }
}

/**
 * Check if a string looks like a valid Solana address
 */
export function isValidAddress(address: string): boolean {
  // Base58 check - Solana addresses are 32-44 characters
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  return base58Regex.test(address);
}

/**
 * Check if a string looks like a valid signature
 */
export function isValidSignature(signature: string): boolean {
  // Signatures are typically 87-88 base58 characters
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{87,88}$/;
  return base58Regex.test(signature);
}
```

---

## Display Components

### Basic Address Component

```tsx
// components/Address.tsx
import { truncateAddress } from '@/lib/formatters';

interface AddressProps {
  address: string;
  truncate?: boolean;
  startChars?: number;
  endChars?: number;
  className?: string;
}

export function Address({
  address,
  truncate = true,
  startChars = 4,
  endChars = 4,
  className = '',
}: AddressProps) {
  const displayText = truncate
    ? truncateAddress(address, startChars, endChars)
    : address;

  return (
    <span
      className={`font-mono text-sm ${className}`}
      title={address}
    >
      {displayText}
    </span>
  );
}
```

### Address with Copy Button

```tsx
// components/CopyableAddress.tsx
import { useState } from 'react';
import { truncateAddress } from '@/lib/formatters';
import { toast } from 'sonner';

interface CopyableAddressProps {
  address: string;
  truncate?: boolean;
  startChars?: number;
  endChars?: number;
  showCopyButton?: boolean;
  className?: string;
}

export function CopyableAddress({
  address,
  truncate = true,
  startChars = 4,
  endChars = 4,
  showCopyButton = true,
  className = '',
}: CopyableAddressProps) {
  const [copied, setCopied] = useState(false);

  const displayText = truncate
    ? truncateAddress(address, startChars, endChars)
    : address;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      toast.success('Address copied');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy');
    }
  };

  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <span
        className="font-mono text-sm cursor-pointer hover:text-purple-400"
        title={address}
        onClick={handleCopy}
      >
        {displayText}
      </span>

      {showCopyButton && (
        <button
          onClick={handleCopy}
          className="p-0.5 text-gray-400 hover:text-gray-300 transition-colors"
          title="Copy to clipboard"
        >
          {copied ? (
            <CheckIcon className="w-3.5 h-3.5 text-green-400" />
          ) : (
            <CopyIcon className="w-3.5 h-3.5" />
          )}
        </button>
      )}
    </span>
  );
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}
```

### Full-Featured Address Component

```tsx
// components/FullAddress.tsx
import { useState } from 'react';
import { truncateAddress } from '@/lib/formatters';
import { useExplorerUrl } from '@/hooks/useExplorerUrl';
import { toast } from 'sonner';

interface FullAddressProps {
  address: string;
  label?: string;
  truncateLength?: number;
  showCopy?: boolean;
  showExplorer?: boolean;
  type?: 'account' | 'token';
  className?: string;
}

export function FullAddress({
  address,
  label,
  truncateLength = 4,
  showCopy = true,
  showExplorer = true,
  type = 'account',
  className = '',
}: FullAddressProps) {
  const [copied, setCopied] = useState(false);
  const { getAccountUrl, getTokenUrl } = useExplorerUrl();

  const displayText = label ?? truncateAddress(address, truncateLength, truncateLength);
  const explorerUrl = type === 'token' ? getTokenUrl(address) : getAccountUrl(address);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span
        className="font-mono text-sm"
        title={address}
      >
        {displayText}
      </span>

      {showCopy && (
        <button
          onClick={handleCopy}
          className="p-1 rounded hover:bg-gray-700/50 text-gray-400 hover:text-gray-300 transition-colors"
          title="Copy address"
        >
          {copied ? (
            <svg className="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          )}
        </button>
      )}

      {showExplorer && (
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1 rounded hover:bg-gray-700/50 text-gray-400 hover:text-purple-400 transition-colors"
          title="View on explorer"
          onClick={(e) => e.stopPropagation()}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      )}
    </span>
  );
}
```

---

## Clipboard Integration

### Copy Hook

```tsx
// hooks/useCopyToClipboard.ts
import { useState, useCallback } from 'react';
import { toast } from 'sonner';

interface UseCopyOptions {
  successMessage?: string;
  errorMessage?: string;
  resetDelay?: number;
}

export function useCopyToClipboard(options: UseCopyOptions = {}) {
  const [copied, setCopied] = useState(false);

  const {
    successMessage = 'Copied to clipboard',
    errorMessage = 'Failed to copy',
    resetDelay = 2000,
  } = options;

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(successMessage);

      setTimeout(() => {
        setCopied(false);
      }, resetDelay);

      return true;
    } catch (error) {
      toast.error(errorMessage);
      return false;
    }
  }, [successMessage, errorMessage, resetDelay]);

  return { copied, copy };
}

// Usage
function MyComponent({ address }: { address: string }) {
  const { copied, copy } = useCopyToClipboard();

  return (
    <button onClick={() => copy(address)}>
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}
```

### Copy Button Component

```tsx
// components/CopyButton.tsx
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';

interface CopyButtonProps {
  text: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'icon' | 'text';
  label?: string;
  className?: string;
}

export function CopyButton({
  text,
  size = 'sm',
  variant = 'icon',
  label = 'Copy',
  className = '',
}: CopyButtonProps) {
  const { copied, copy } = useCopyToClipboard();

  const sizeClasses = {
    sm: 'p-1',
    md: 'p-1.5',
    lg: 'p-2',
  };

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  if (variant === 'text') {
    return (
      <button
        onClick={() => copy(text)}
        className={`inline-flex items-center gap-1 text-gray-400 hover:text-gray-300 ${className}`}
      >
        <CopyIcon className={iconSizes[size]} copied={copied} />
        <span>{copied ? 'Copied!' : label}</span>
      </button>
    );
  }

  return (
    <button
      onClick={() => copy(text)}
      className={`${sizeClasses[size]} rounded hover:bg-gray-700/50 text-gray-400 hover:text-gray-300 transition-colors ${className}`}
      title={label}
    >
      <CopyIcon className={iconSizes[size]} copied={copied} />
    </button>
  );
}

function CopyIcon({ className, copied }: { className: string; copied: boolean }) {
  if (copied) {
    return (
      <svg className={`${className} text-green-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    );
  }

  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}
```

---

## Token Amount Formatting

See [token-amounts.md](token-amounts.md) for comprehensive token amount formatting.

### Quick Reference

```tsx
// lib/formatters.ts

/**
 * Format token amount with appropriate decimals
 */
export function formatTokenAmount(
  amount: number | bigint,
  decimals: number,
  maxDecimals?: number
): string {
  const value = typeof amount === 'bigint'
    ? Number(amount) / Math.pow(10, decimals)
    : amount;

  const displayDecimals = maxDecimals ?? Math.min(decimals, 6);

  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: displayDecimals,
  });
}

/**
 * Format large numbers with K/M/B suffixes
 */
export function formatCompactNumber(num: number): string {
  if (num >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(2)}B`;
  }
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(2)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(2)}K`;
  }
  return num.toFixed(2);
}
```

---

## Styling Conventions

### Consistent CSS Classes

```tsx
// Tailwind classes for address display
const addressStyles = {
  // Base monospace font
  base: 'font-mono text-sm',

  // Interactive (clickable/copyable)
  interactive: 'font-mono text-sm cursor-pointer hover:text-purple-400 transition-colors',

  // With background
  withBg: 'font-mono text-sm px-2 py-1 bg-gray-800 rounded',

  // Link style
  link: 'font-mono text-sm text-purple-400 hover:text-purple-300 hover:underline',

  // In table cell
  table: 'font-mono text-xs',

  // Large display
  header: 'font-mono text-base md:text-lg',
};
```

### Address Display Variants

```tsx
// components/AddressVariants.tsx

// Minimal - just the address
export function AddressMinimal({ address }: { address: string }) {
  return (
    <span className="font-mono text-sm" title={address}>
      {truncateAddress(address)}
    </span>
  );
}

// Chip style
export function AddressChip({ address }: { address: string }) {
  return (
    <span className="inline-flex items-center px-2 py-1 bg-gray-800 rounded-full font-mono text-xs">
      {truncateAddress(address)}
    </span>
  );
}

// Badge style
export function AddressBadge({ address, label }: { address: string; label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded">
      {label && <span className="text-xs text-gray-400">{label}</span>}
      <span className="font-mono text-sm text-purple-400">
        {truncateAddress(address)}
      </span>
    </span>
  );
}

// Card style
export function AddressCard({ address, label }: { address: string; label: string }) {
  const { copy, copied } = useCopyToClipboard();

  return (
    <div className="p-3 bg-gray-800 rounded-lg">
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className="flex items-center justify-between">
        <span className="font-mono text-sm">{truncateAddress(address, 8, 8)}</span>
        <button
          onClick={() => copy(address)}
          className="text-gray-400 hover:text-gray-300"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
    </div>
  );
}
```

---

## Best Practices

### 1. Always Show Full Address on Hover

```tsx
<span title={fullAddress}>{truncatedAddress}</span>
```

### 2. Consistent Truncation Length

```tsx
// Pick one standard and stick to it across the app
const TRUNCATE_LENGTH = 4; // e.g., Abc1...xyz9

// Use constants, not magic numbers
truncateAddress(address, TRUNCATE_LENGTH, TRUNCATE_LENGTH)
```

### 3. Provide Copy Functionality

```tsx
// Users frequently need to copy addresses
<CopyableAddress address={address} />
```

### 4. Use Monospace Fonts

```tsx
// Addresses should always use monospace
<span className="font-mono">{address}</span>
```

### 5. Make Links Obvious

```tsx
// External links should be visually distinct
<a className="text-purple-400 hover:underline">
  {address}
  <ExternalLinkIcon />
</a>
```

---

## External Resources

- [Solana Address Format](https://solana.com/docs/terminology#account)
- [Base58 Encoding](https://en.wikipedia.org/wiki/Base58)
