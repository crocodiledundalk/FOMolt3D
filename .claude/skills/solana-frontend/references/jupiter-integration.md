# Jupiter Integration

Guide for integrating Jupiter swap functionality into Solana dApps. Covers Ultra API, quote fetching, and transaction execution.

## Table of Contents

1. [Overview](#overview)
2. [Ultra API (Recommended)](#ultra-api-recommended)
3. [Swap API](#swap-api)
4. [React Integration](#react-integration)
5. [Advanced Features](#advanced-features)
6. [Best Practices](#best-practices)

---

## Overview

### API Options

| API | Description | Use Case |
|-----|-------------|----------|
| **Ultra API** | Latest, optimized for best execution | New projects, production |
| **Swap API (v6)** | Flexible, customizable | Custom tx building |
| **Self-Hosted** | Run your own quote server | High volume, low latency |

### Base URLs

```tsx
// Ultra API
const ULTRA_API = 'https://api.jup.ag/ultra/v1';

// Swap API v6
const SWAP_API = 'https://quote-api.jup.ag/v6';

// Price API
const PRICE_API = 'https://price.jup.ag/v4';
```

---

## Ultra API (Recommended)

### Get Order Quote

```tsx
// lib/jupiter/ultra.ts
import { PublicKey } from '@solana/web3.js';

interface UltraQuoteRequest {
  inputMint: string;
  outputMint: string;
  amount: string;         // Base units
  taker: string;          // User's wallet address
  slippageBps?: number;   // Default: 50 (0.5%)
}

interface UltraQuoteResponse {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  priceImpactPct: string;
  routePlan: RoutePlan[];
  contextSlot: number;
  swapType: 'ExactIn' | 'ExactOut';
}

export async function getUltraQuote(params: UltraQuoteRequest): Promise<UltraQuoteResponse> {
  const searchParams = new URLSearchParams({
    inputMint: params.inputMint,
    outputMint: params.outputMint,
    amount: params.amount,
    taker: params.taker,
    slippageBps: String(params.slippageBps ?? 50),
  });

  const response = await fetch(`https://api.jup.ag/ultra/v1/order?${searchParams}`);

  if (!response.ok) {
    throw new Error(`Jupiter API error: ${response.statusText}`);
  }

  return response.json();
}
```

### Execute Ultra Swap

```tsx
// lib/jupiter/ultra.ts
interface UltraSwapRequest {
  swapRequest: UltraQuoteResponse;
  taker: string;
}

interface UltraSwapResponse {
  transaction: string;        // Base64 encoded versioned transaction
  lastValidBlockHeight: number;
  prioritizationFeeLamports: number;
}

export async function getUltraSwapTransaction(
  quote: UltraQuoteResponse,
  taker: string
): Promise<UltraSwapResponse> {
  const response = await fetch('https://api.jup.ag/ultra/v1/order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      quoteResponse: quote,
      taker,
    }),
  });

  if (!response.ok) {
    throw new Error(`Jupiter swap error: ${response.statusText}`);
  }

  return response.json();
}
```

### Ultra Swap Hook

```tsx
// hooks/useUltraSwap.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { VersionedTransaction } from '@solana/web3.js';
import { getUltraQuote, getUltraSwapTransaction } from '@/lib/jupiter/ultra';
import { toast } from 'sonner';

interface SwapParams {
  inputMint: string;
  outputMint: string;
  amount: string;
  slippageBps?: number;
}

export function useUltraSwap() {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: SwapParams) => {
      if (!publicKey || !signTransaction) {
        throw new Error('Wallet not connected');
      }

      // Get quote
      const quote = await getUltraQuote({
        ...params,
        taker: publicKey.toBase58(),
      });

      // Get swap transaction
      const swapData = await getUltraSwapTransaction(quote, publicKey.toBase58());

      // Deserialize and sign
      const txBuffer = Buffer.from(swapData.transaction, 'base64');
      const transaction = VersionedTransaction.deserialize(txBuffer);
      const signed = await signTransaction(transaction);

      // Send transaction
      const signature = await connection.sendRawTransaction(signed.serialize(), {
        skipPreflight: true,
        maxRetries: 2,
      });

      // Confirm
      await connection.confirmTransaction({
        signature,
        blockhash: transaction.message.recentBlockhash,
        lastValidBlockHeight: swapData.lastValidBlockHeight,
      });

      return { signature, quote };
    },
    onSuccess: ({ signature }) => {
      toast.success('Swap completed', {
        action: {
          label: 'View',
          onClick: () => window.open(`https://solscan.io/tx/${signature}`, '_blank'),
        },
      });

      // Refresh balances
      queryClient.invalidateQueries({ queryKey: ['tokenBalances'] });
      queryClient.invalidateQueries({ queryKey: ['solBalance'] });
    },
    onError: (error) => {
      toast.error(`Swap failed: ${error.message}`);
    },
  });
}
```

---

## Swap API

### Get Quote

```tsx
// lib/jupiter/swap.ts
interface QuoteParams {
  inputMint: string;
  outputMint: string;
  amount: string;
  slippageBps?: number;
  swapMode?: 'ExactIn' | 'ExactOut';
  onlyDirectRoutes?: boolean;
  asLegacyTransaction?: boolean;
  maxAccounts?: number;
}

interface QuoteResponse {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  priceImpactPct: string;
  routePlan: RoutePlan[];
  contextSlot: number;
}

export async function getQuote(params: QuoteParams): Promise<QuoteResponse> {
  const searchParams = new URLSearchParams({
    inputMint: params.inputMint,
    outputMint: params.outputMint,
    amount: params.amount,
    slippageBps: String(params.slippageBps ?? 50),
    ...(params.swapMode && { swapMode: params.swapMode }),
    ...(params.onlyDirectRoutes && { onlyDirectRoutes: 'true' }),
    ...(params.asLegacyTransaction && { asLegacyTransaction: 'true' }),
    ...(params.maxAccounts && { maxAccounts: String(params.maxAccounts) }),
  });

  const response = await fetch(
    `https://quote-api.jup.ag/v6/quote?${searchParams}`
  );

  if (!response.ok) {
    throw new Error(`Quote error: ${response.statusText}`);
  }

  return response.json();
}
```

### Build Swap Transaction

```tsx
// lib/jupiter/swap.ts
interface SwapRequest {
  quoteResponse: QuoteResponse;
  userPublicKey: string;
  wrapAndUnwrapSol?: boolean;
  useSharedAccounts?: boolean;
  dynamicComputeUnitLimit?: boolean;
  prioritizationFeeLamports?: number | 'auto';
}

interface SwapResponse {
  swapTransaction: string;  // Base64 serialized transaction
  lastValidBlockHeight: number;
}

export async function getSwapTransaction(params: SwapRequest): Promise<SwapResponse> {
  const response = await fetch('https://quote-api.jup.ag/v6/swap', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...params,
      wrapAndUnwrapSol: params.wrapAndUnwrapSol ?? true,
      useSharedAccounts: params.useSharedAccounts ?? true,
      dynamicComputeUnitLimit: params.dynamicComputeUnitLimit ?? true,
      prioritizationFeeLamports: params.prioritizationFeeLamports ?? 'auto',
    }),
  });

  if (!response.ok) {
    throw new Error(`Swap transaction error: ${response.statusText}`);
  }

  return response.json();
}
```

### Quote Hook

```tsx
// hooks/useJupiterQuote.ts
import { useQuery } from '@tanstack/react-query';
import { getQuote } from '@/lib/jupiter/swap';

interface UseQuoteParams {
  inputMint: string | null;
  outputMint: string | null;
  amount: string | null;
  slippageBps?: number;
  enabled?: boolean;
}

export function useJupiterQuote(params: UseQuoteParams) {
  return useQuery({
    queryKey: [
      'jupiterQuote',
      params.inputMint,
      params.outputMint,
      params.amount,
      params.slippageBps,
    ],
    queryFn: async () => {
      if (!params.inputMint || !params.outputMint || !params.amount) {
        throw new Error('Missing parameters');
      }

      return getQuote({
        inputMint: params.inputMint,
        outputMint: params.outputMint,
        amount: params.amount,
        slippageBps: params.slippageBps ?? 50,
      });
    },
    enabled:
      (params.enabled ?? true) &&
      !!params.inputMint &&
      !!params.outputMint &&
      !!params.amount &&
      params.amount !== '0',
    staleTime: 10000, // 10 seconds
    refetchInterval: 15000, // Refresh every 15 seconds
  });
}
```

---

## React Integration

### Complete Swap Form

```tsx
// components/SwapForm.tsx
import { useState, useMemo, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useJupiterQuote } from '@/hooks/useJupiterQuote';
import { useUltraSwap } from '@/hooks/useUltraSwap';
import { useTokenBalance } from '@/hooks/useTokenBalance';
import { TokenSelector } from '@/components/TokenSelector';
import { formatTokenAmount } from '@/lib/formatters';

const SOL_MINT = 'So11111111111111111111111111111111111111112';
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

export function SwapForm() {
  const { publicKey } = useWallet();
  const { mutate: executeSwap, isPending } = useUltraSwap();

  // Form state
  const [inputMint, setInputMint] = useState(SOL_MINT);
  const [outputMint, setOutputMint] = useState(USDC_MINT);
  const [inputAmount, setInputAmount] = useState('');
  const [slippageBps, setSlippageBps] = useState(50);

  // Get balances
  const { data: inputBalance } = useTokenBalance(inputMint);
  const { data: outputBalance } = useTokenBalance(outputMint);

  // Calculate amount in base units
  const amountInBaseUnits = useMemo(() => {
    if (!inputAmount || !inputBalance) return null;
    const amount = parseFloat(inputAmount);
    if (isNaN(amount) || amount <= 0) return null;
    return String(Math.floor(amount * Math.pow(10, inputBalance.decimals)));
  }, [inputAmount, inputBalance]);

  // Get quote
  const { data: quote, isLoading: isQuoteLoading } = useJupiterQuote({
    inputMint,
    outputMint,
    amount: amountInBaseUnits,
    slippageBps,
  });

  // Calculate output amount
  const outputAmount = useMemo(() => {
    if (!quote || !outputBalance) return '0';
    const amount = Number(quote.outAmount) / Math.pow(10, outputBalance.decimals);
    return formatTokenAmount(amount, outputBalance.decimals);
  }, [quote, outputBalance]);

  // Validation
  const insufficientBalance =
    inputBalance && parseFloat(inputAmount) > inputBalance.balance;

  const canSwap =
    !!publicKey &&
    !!quote &&
    !insufficientBalance &&
    parseFloat(inputAmount) > 0;

  // Swap tokens
  const handleSwapTokens = () => {
    setInputMint(outputMint);
    setOutputMint(inputMint);
    setInputAmount('');
  };

  // Execute swap
  const handleSwap = () => {
    if (!amountInBaseUnits) return;

    executeSwap({
      inputMint,
      outputMint,
      amount: amountInBaseUnits,
      slippageBps,
    });
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-gray-800 rounded-xl">
      <h2 className="text-xl font-bold mb-6">Swap</h2>

      {/* Input */}
      <div className="p-4 bg-gray-700 rounded-lg mb-2">
        <div className="flex justify-between mb-2">
          <span className="text-sm text-gray-400">You pay</span>
          <span className="text-sm text-gray-400">
            Balance: {inputBalance?.uiBalance ?? '0'}
          </span>
        </div>
        <div className="flex gap-4">
          <input
            type="number"
            value={inputAmount}
            onChange={(e) => setInputAmount(e.target.value)}
            placeholder="0.00"
            className="flex-1 bg-transparent text-2xl outline-none"
            disabled={isPending}
          />
          <TokenSelector
            value={inputMint}
            onChange={setInputMint}
            excludeMints={[outputMint]}
          />
        </div>
        {insufficientBalance && (
          <p className="text-red-400 text-sm mt-2">Insufficient balance</p>
        )}
      </div>

      {/* Swap direction button */}
      <div className="flex justify-center -my-3 relative z-10">
        <button
          onClick={handleSwapTokens}
          className="p-2 bg-gray-600 rounded-full hover:bg-gray-500"
        >
          ↕
        </button>
      </div>

      {/* Output */}
      <div className="p-4 bg-gray-700 rounded-lg mt-2">
        <div className="flex justify-between mb-2">
          <span className="text-sm text-gray-400">You receive</span>
          <span className="text-sm text-gray-400">
            Balance: {outputBalance?.uiBalance ?? '0'}
          </span>
        </div>
        <div className="flex gap-4">
          <div className="flex-1 text-2xl">
            {isQuoteLoading ? (
              <span className="animate-pulse">...</span>
            ) : (
              outputAmount
            )}
          </div>
          <TokenSelector
            value={outputMint}
            onChange={setOutputMint}
            excludeMints={[inputMint]}
          />
        </div>
      </div>

      {/* Quote details */}
      {quote && (
        <div className="mt-4 p-3 bg-gray-700/50 rounded-lg text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Rate</span>
            <span>
              1 {inputBalance?.symbol} ={' '}
              {(Number(quote.outAmount) / Number(quote.inAmount)).toFixed(6)}{' '}
              {outputBalance?.symbol}
            </span>
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-gray-400">Price Impact</span>
            <span className={parseFloat(quote.priceImpactPct) > 1 ? 'text-red-400' : ''}>
              {parseFloat(quote.priceImpactPct).toFixed(2)}%
            </span>
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-gray-400">Slippage</span>
            <span>{slippageBps / 100}%</span>
          </div>
        </div>
      )}

      {/* Slippage selector */}
      <div className="mt-4">
        <div className="text-sm text-gray-400 mb-2">Slippage Tolerance</div>
        <div className="flex gap-2">
          {[10, 50, 100, 300].map((bps) => (
            <button
              key={bps}
              onClick={() => setSlippageBps(bps)}
              className={`px-3 py-1 rounded ${
                slippageBps === bps
                  ? 'bg-purple-500'
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              {bps / 100}%
            </button>
          ))}
        </div>
      </div>

      {/* Submit button */}
      <button
        onClick={handleSwap}
        disabled={!canSwap || isPending}
        className={`w-full mt-6 py-4 rounded-lg font-medium text-lg ${
          canSwap && !isPending
            ? 'bg-purple-500 hover:bg-purple-600'
            : 'bg-gray-600 cursor-not-allowed'
        }`}
      >
        {!publicKey
          ? 'Connect Wallet'
          : isPending
          ? 'Swapping...'
          : insufficientBalance
          ? 'Insufficient Balance'
          : 'Swap'}
      </button>
    </div>
  );
}
```

---

## Advanced Features

### Price Impact Warning

```tsx
// lib/jupiter/priceImpact.ts
export function getPriceImpactSeverity(priceImpactPct: string): 'low' | 'medium' | 'high' {
  const impact = parseFloat(priceImpactPct);

  if (impact < 0.1) return 'low';
  if (impact < 1) return 'medium';
  return 'high';
}

export function getPriceImpactColor(severity: 'low' | 'medium' | 'high'): string {
  switch (severity) {
    case 'low':
      return 'text-green-400';
    case 'medium':
      return 'text-yellow-400';
    case 'high':
      return 'text-red-400';
  }
}
```

### Route Display

```tsx
// components/RouteDisplay.tsx
interface RouteDisplayProps {
  routePlan: RoutePlan[];
}

export function RouteDisplay({ routePlan }: RouteDisplayProps) {
  return (
    <div className="flex items-center gap-2 text-sm text-gray-400">
      {routePlan.map((hop, index) => (
        <Fragment key={index}>
          {index > 0 && <span>→</span>}
          <span className="px-2 py-1 bg-gray-700 rounded">
            {hop.swapInfo.label}
          </span>
        </Fragment>
      ))}
    </div>
  );
}
```

### Token Prices

```tsx
// hooks/useJupiterPrice.ts
import { useQuery } from '@tanstack/react-query';

interface TokenPrice {
  id: string;
  mintSymbol: string;
  vsToken: string;
  vsTokenSymbol: string;
  price: number;
}

export function useJupiterPrice(mints: string[]) {
  return useQuery({
    queryKey: ['jupiterPrice', mints],
    queryFn: async () => {
      const ids = mints.join(',');
      const response = await fetch(
        `https://price.jup.ag/v4/price?ids=${ids}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch prices');
      }

      const data = await response.json();
      return data.data as Record<string, TokenPrice>;
    },
    enabled: mints.length > 0,
    staleTime: 30000, // 30 seconds
  });
}
```

---

## Best Practices

### 1. Debounce Quote Requests

```tsx
const debouncedAmount = useDebounce(inputAmount, 300);

const { data: quote } = useJupiterQuote({
  amount: debouncedAmount,
  // ...
});
```

### 2. Handle Errors Gracefully

```tsx
try {
  await executeSwap();
} catch (error) {
  if (error.message.includes('slippage')) {
    toast.error('Price moved too much. Try increasing slippage.');
  }
}
```

### 3. Show Loading States

```tsx
{isQuoteLoading ? (
  <Skeleton />
) : (
  <span>{outputAmount}</span>
)}
```

### 4. Warn on High Price Impact

```tsx
{parseFloat(quote.priceImpactPct) > 1 && (
  <div className="p-3 bg-red-500/10 border border-red-500 rounded">
    High price impact! You may receive significantly fewer tokens.
  </div>
)}
```

### 5. Refresh Quotes Regularly

```tsx
refetchInterval: 15000, // Refresh every 15 seconds
```

---

## External Resources

- [Jupiter Documentation](https://station.jup.ag/docs/)
- [Jupiter Ultra API](https://dev.jup.ag/docs/ultra-api)
- [Jupiter Swap API v6](https://hub.jup.ag/docs/apis/swap-api)
- [Jupiter GitHub](https://github.com/jup-ag)

**Important**: The `lite-api.jup.ag` endpoint will be deprecated on January 31st, 2026. Use the current API endpoints.
