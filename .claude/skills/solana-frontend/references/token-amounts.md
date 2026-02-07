# Token Amounts

Patterns for handling, formatting, and displaying token amounts with proper decimal handling, localization, and user-friendly formatting.

## Table of Contents

1. [Decimal Handling](#decimal-handling)
2. [Formatting Utilities](#formatting-utilities)
3. [Input Parsing](#input-parsing)
4. [Display Components](#display-components)
5. [Best Practices](#best-practices)

---

## Decimal Handling

### Understanding Solana Token Decimals

- **SOL**: 9 decimals (1 SOL = 1,000,000,000 lamports)
- **USDC**: 6 decimals (1 USDC = 1,000,000 base units)
- **Other tokens**: Varies (check token metadata)

### Conversion Utilities

```tsx
// lib/amounts.ts
import { BN } from '@coral-xyz/anchor';

/**
 * Convert raw amount to UI amount (divide by 10^decimals)
 */
export function toUiAmount(rawAmount: number | bigint | BN, decimals: number): number {
  const amount = typeof rawAmount === 'number'
    ? rawAmount
    : typeof rawAmount === 'bigint'
    ? Number(rawAmount)
    : rawAmount.toNumber();

  return amount / Math.pow(10, decimals);
}

/**
 * Convert UI amount to raw amount (multiply by 10^decimals)
 */
export function toRawAmount(uiAmount: number, decimals: number): number {
  return Math.floor(uiAmount * Math.pow(10, decimals));
}

/**
 * Convert UI amount to BN (for Anchor programs)
 */
export function toBN(uiAmount: number, decimals: number): BN {
  return new BN(toRawAmount(uiAmount, decimals));
}

/**
 * Convert UI amount to bigint (for web3.js v2)
 */
export function toBigInt(uiAmount: number, decimals: number): bigint {
  return BigInt(toRawAmount(uiAmount, decimals));
}

// SOL-specific helpers
export const LAMPORTS_PER_SOL = 1_000_000_000;

export function lamportsToSol(lamports: number | bigint): number {
  return Number(lamports) / LAMPORTS_PER_SOL;
}

export function solToLamports(sol: number): number {
  return Math.floor(sol * LAMPORTS_PER_SOL);
}
```

### Safe Math with BigInt

```tsx
// lib/safeMath.ts
/**
 * Safe multiplication avoiding floating point errors
 */
export function safeMultiply(a: bigint, b: bigint, decimals: number): bigint {
  const factor = BigInt(10 ** decimals);
  return (a * b) / factor;
}

/**
 * Safe division with precision
 */
export function safeDivide(a: bigint, b: bigint, decimals: number): bigint {
  if (b === BigInt(0)) {
    throw new Error('Division by zero');
  }
  const factor = BigInt(10 ** decimals);
  return (a * factor) / b;
}

/**
 * Calculate percentage of amount
 */
export function calculatePercentage(amount: bigint, basisPoints: number): bigint {
  return (amount * BigInt(basisPoints)) / BigInt(10000);
}

/**
 * Calculate amount after slippage
 */
export function applySlippage(
  amount: bigint,
  slippageBps: number,
  direction: 'in' | 'out'
): bigint {
  if (direction === 'in') {
    // Maximum you'd pay (amount + slippage)
    return amount + calculatePercentage(amount, slippageBps);
  } else {
    // Minimum you'd receive (amount - slippage)
    return amount - calculatePercentage(amount, slippageBps);
  }
}
```

---

## Formatting Utilities

### Number Formatting

```tsx
// lib/formatters.ts

/**
 * Format token amount with appropriate decimal places
 */
export function formatTokenAmount(
  amount: number,
  options: {
    decimals?: number;
    maxDecimals?: number;
    minDecimals?: number;
    compact?: boolean;
  } = {}
): string {
  const {
    decimals = 9,
    maxDecimals = 4,
    minDecimals = 0,
    compact = false,
  } = options;

  // Handle very small amounts
  if (amount > 0 && amount < Math.pow(10, -maxDecimals)) {
    return `<${(0).toFixed(maxDecimals - 1)}1`;
  }

  if (compact && Math.abs(amount) >= 1000) {
    return formatCompact(amount, maxDecimals);
  }

  // Determine decimal places based on amount size
  let displayDecimals = maxDecimals;
  if (Math.abs(amount) >= 1000) {
    displayDecimals = Math.min(2, maxDecimals);
  } else if (Math.abs(amount) >= 1) {
    displayDecimals = Math.min(4, maxDecimals);
  }

  return amount.toLocaleString(undefined, {
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: displayDecimals,
  });
}

/**
 * Format with compact notation (K, M, B)
 */
export function formatCompact(amount: number, maxDecimals = 2): string {
  const absAmount = Math.abs(amount);

  if (absAmount >= 1_000_000_000) {
    return `${(amount / 1_000_000_000).toFixed(maxDecimals)}B`;
  }
  if (absAmount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(maxDecimals)}M`;
  }
  if (absAmount >= 1_000) {
    return `${(amount / 1_000).toFixed(maxDecimals)}K`;
  }

  return amount.toFixed(maxDecimals);
}

/**
 * Format USD value
 */
export function formatUsd(
  amount: number,
  options: {
    compact?: boolean;
    showSign?: boolean;
  } = {}
): string {
  const { compact = false, showSign = false } = options;

  if (compact && Math.abs(amount) >= 1000) {
    const sign = showSign && amount > 0 ? '+' : '';
    return `${sign}$${formatCompact(amount, 2)}`;
  }

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: amount >= 1 ? 2 : 4,
    maximumFractionDigits: amount >= 1 ? 2 : 4,
    signDisplay: showSign ? 'always' : 'auto',
  });

  return formatter.format(amount);
}

/**
 * Format percentage
 */
export function formatPercent(
  value: number,
  options: {
    decimals?: number;
    showSign?: boolean;
  } = {}
): string {
  const { decimals = 2, showSign = false } = options;

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    signDisplay: showSign ? 'always' : 'auto',
  });

  return formatter.format(value / 100);
}

/**
 * Format lamports as SOL
 */
export function formatSol(
  lamports: number | bigint,
  options: { maxDecimals?: number; compact?: boolean } = {}
): string {
  const sol = lamportsToSol(Number(lamports));
  return formatTokenAmount(sol, { ...options, decimals: 9 });
}
```

### Token-Specific Formatting

```tsx
// lib/formatToken.ts
import { formatTokenAmount } from './formatters';

interface TokenFormatOptions {
  showSymbol?: boolean;
  compact?: boolean;
  maxDecimals?: number;
}

export function formatToken(
  amount: number | bigint,
  token: {
    symbol: string;
    decimals: number;
  },
  options: TokenFormatOptions = {}
): string {
  const { showSymbol = true, compact = false, maxDecimals } = options;

  const uiAmount = typeof amount === 'bigint'
    ? Number(amount) / Math.pow(10, token.decimals)
    : amount;

  const formatted = formatTokenAmount(uiAmount, {
    decimals: token.decimals,
    maxDecimals: maxDecimals ?? Math.min(token.decimals, 6),
    compact,
  });

  return showSymbol ? `${formatted} ${token.symbol}` : formatted;
}
```

---

## Input Parsing

### Amount Input Handling

```tsx
// lib/parseAmount.ts

/**
 * Parse user input to number, handling various formats
 */
export function parseAmountInput(input: string): number | null {
  if (!input || input.trim() === '') {
    return null;
  }

  // Remove commas and spaces
  let cleaned = input.replace(/[,\s]/g, '');

  // Handle percentage of max (e.g., "50%")
  // This would need maxAmount context, so return null
  if (cleaned.endsWith('%')) {
    return null;
  }

  // Parse the number
  const parsed = parseFloat(cleaned);

  if (isNaN(parsed) || !isFinite(parsed)) {
    return null;
  }

  return parsed;
}

/**
 * Validate amount against constraints
 */
export function validateAmount(
  amount: number | null,
  options: {
    min?: number;
    max?: number;
    decimals?: number;
  } = {}
): { valid: boolean; error?: string } {
  const { min = 0, max, decimals = 9 } = options;

  if (amount === null) {
    return { valid: false, error: 'Invalid amount' };
  }

  if (amount < min) {
    return { valid: false, error: `Minimum amount is ${min}` };
  }

  if (max !== undefined && amount > max) {
    return { valid: false, error: `Maximum amount is ${max}` };
  }

  // Check decimal places
  const parts = amount.toString().split('.');
  if (parts[1] && parts[1].length > decimals) {
    return { valid: false, error: `Maximum ${decimals} decimal places` };
  }

  return { valid: true };
}
```

### Amount Input Component

```tsx
// components/AmountInput.tsx
import { useState, useCallback, ChangeEvent } from 'react';
import { parseAmountInput, validateAmount } from '@/lib/parseAmount';
import { formatTokenAmount } from '@/lib/formatters';

interface AmountInputProps {
  value: string;
  onChange: (value: string, parsed: number | null) => void;
  decimals: number;
  max?: number;
  symbol?: string;
  disabled?: boolean;
  placeholder?: string;
}

export function AmountInput({
  value,
  onChange,
  decimals,
  max,
  symbol,
  disabled = false,
  placeholder = '0.00',
}: AmountInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;

      // Allow empty input
      if (!inputValue) {
        onChange('', null);
        return;
      }

      // Only allow valid number characters
      if (!/^[\d.,]*$/.test(inputValue)) {
        return;
      }

      // Prevent multiple decimal points
      if ((inputValue.match(/\./g) || []).length > 1) {
        return;
      }

      // Limit decimal places
      const parts = inputValue.split('.');
      if (parts[1] && parts[1].length > decimals) {
        return;
      }

      const parsed = parseAmountInput(inputValue);
      onChange(inputValue, parsed);
    },
    [onChange, decimals]
  );

  const handleMax = useCallback(() => {
    if (max !== undefined) {
      const formatted = max.toString();
      onChange(formatted, max);
    }
  }, [max, onChange]);

  const validation = validateAmount(parseAmountInput(value), { max, decimals });

  return (
    <div className="relative">
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={handleChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        disabled={disabled}
        placeholder={placeholder}
        className={`
          w-full px-4 py-3 pr-20 text-lg font-mono
          border rounded-lg outline-none transition-colors
          ${!validation.valid && value ? 'border-red-500' : 'border-gray-200'}
          ${isFocused ? 'border-blue-500' : ''}
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
      />

      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
        {max !== undefined && (
          <button
            type="button"
            onClick={handleMax}
            disabled={disabled}
            className="px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded"
          >
            MAX
          </button>
        )}
        {symbol && <span className="text-gray-500">{symbol}</span>}
      </div>

      {!validation.valid && value && (
        <p className="text-red-500 text-sm mt-1">{validation.error}</p>
      )}
    </div>
  );
}
```

---

## Display Components

### Token Amount Display

```tsx
// components/TokenAmount.tsx
import { useMemo } from 'react';
import { formatToken } from '@/lib/formatToken';
import { useTokenRegistry } from '@/contexts/TokenRegistryContext';

interface TokenAmountProps {
  mint: string;
  amount: number | bigint;
  showSymbol?: boolean;
  compact?: boolean;
  className?: string;
}

export function TokenAmount({
  mint,
  amount,
  showSymbol = true,
  compact = false,
  className = '',
}: TokenAmountProps) {
  const { getToken } = useTokenRegistry();
  const token = getToken(mint);

  const formatted = useMemo(() => {
    if (!token) {
      // Fallback for unknown tokens
      return typeof amount === 'bigint'
        ? amount.toString()
        : amount.toLocaleString();
    }

    return formatToken(amount, token, { showSymbol, compact });
  }, [amount, token, showSymbol, compact]);

  return (
    <span className={`font-mono ${className}`} title={amount.toString()}>
      {formatted}
    </span>
  );
}
```

### Balance Display with Loading

```tsx
// components/BalanceDisplay.tsx
import { useSolBalance } from '@/hooks/data/useSolBalance';
import { formatSol } from '@/lib/formatters';

interface BalanceDisplayProps {
  compact?: boolean;
  showSymbol?: boolean;
  className?: string;
}

export function BalanceDisplay({
  compact = false,
  showSymbol = true,
  className = '',
}: BalanceDisplayProps) {
  const { data: balance, isLoading, error } = useSolBalance();

  if (isLoading) {
    return (
      <span className={`animate-pulse ${className}`}>
        <span className="bg-gray-200 rounded">0.0000</span>
        {showSymbol && ' SOL'}
      </span>
    );
  }

  if (error || balance === undefined) {
    return (
      <span className={`text-gray-400 ${className}`}>
        --{showSymbol && ' SOL'}
      </span>
    );
  }

  return (
    <span className={`font-mono ${className}`}>
      {formatSol(balance, { compact })}
      {showSymbol && ' SOL'}
    </span>
  );
}
```

### Price Change Display

```tsx
// components/PriceChange.tsx
import { formatPercent, formatUsd } from '@/lib/formatters';

interface PriceChangeProps {
  value: number; // Percentage change
  absolute?: number; // Absolute USD change
  period?: string;
}

export function PriceChange({ value, absolute, period = '24h' }: PriceChangeProps) {
  const isPositive = value >= 0;
  const colorClass = isPositive ? 'text-green-600' : 'text-red-600';

  return (
    <span className={colorClass}>
      {isPositive ? '+' : ''}
      {formatPercent(value, { decimals: 2 })}
      {absolute !== undefined && (
        <span className="text-gray-500 ml-1">
          ({formatUsd(absolute, { compact: true, showSign: true })})
        </span>
      )}
      <span className="text-gray-400 ml-1 text-sm">{period}</span>
    </span>
  );
}
```

---

## Best Practices

### 1. Always Use BigInt for Calculations

```tsx
// Good - No precision loss
const rawAmount = BigInt(Math.floor(uiAmount * 10 ** decimals));

// Bad - Floating point errors
const rawAmount = uiAmount * 10 ** decimals;
```

### 2. Handle Dust Amounts

```tsx
// Show "< 0.0001" instead of "0.000000001234"
if (amount > 0 && amount < 0.0001) {
  return '< 0.0001';
}
```

### 3. Use Consistent Decimal Places

```tsx
// SOL: 4 decimals for display
// USDC: 2 decimals for display
// Small amounts: More decimals
const displayDecimals = amount < 0.01 ? 6 : amount < 1 ? 4 : 2;
```

### 4. Validate Input Early

```tsx
// Validate as user types
const validation = validateAmount(parsed, { max: balance, decimals });
if (!validation.valid) {
  setError(validation.error);
}
```

### 5. Preserve Full Precision

```tsx
// Store raw amount, format only for display
const [rawAmount, setRawAmount] = useState<bigint>(BigInt(0));
const displayAmount = formatToken(rawAmount, token);
```

---

## External Resources

- [JavaScript BigInt](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt)
- [Intl.NumberFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat)
- [SPL Token Decimals](https://spl.solana.com/token)
