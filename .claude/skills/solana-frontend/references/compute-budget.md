# Compute Budget and Priority Fees

Guide for optimizing transaction landing through compute budget settings and priority fees. Covers estimation, dynamic pricing, and cost optimization.

## Table of Contents

1. [Understanding Compute Budget](#understanding-compute-budget)
2. [Priority Fees](#priority-fees)
3. [Estimating Compute Units](#estimating-compute-units)
4. [Dynamic Fee Strategies](#dynamic-fee-strategies)
5. [Jito Bundles](#jito-bundles)
6. [Implementation Patterns](#implementation-patterns)

---

## Understanding Compute Budget

### Fee Structure

```
Transaction Cost = Base Fee + Priority Fee

Base Fee = 5,000 lamports per signature (fixed)
Priority Fee = Compute Units × Compute Unit Price (micro-lamports)
```

### Default Limits

| Resource | Default | Maximum |
|----------|---------|---------|
| Compute Units per Transaction | 200,000 | 1,400,000 |
| Compute Unit Price | 0 | Unlimited |
| Account Data Loaded | 64MB | 64MB |

### Setting Compute Budget

```tsx
import { ComputeBudgetProgram, Transaction } from '@solana/web3.js';

// Set compute unit limit
const setLimitIx = ComputeBudgetProgram.setComputeUnitLimit({
  units: 300_000, // Adjust based on your transaction
});

// Set compute unit price (priority fee)
const setPriceIx = ComputeBudgetProgram.setComputeUnitPrice({
  microLamports: 50_000, // Price per CU in micro-lamports
});

// IMPORTANT: These must be the FIRST instructions
const transaction = new Transaction();
transaction.add(setLimitIx);
transaction.add(setPriceIx);
// ... then add your other instructions
```

### Cost Calculation

```tsx
function calculateTransactionCost(
  computeUnits: number,
  computeUnitPrice: number, // micro-lamports
  signatures: number = 1
): number {
  const baseFee = 5_000 * signatures; // lamports
  const priorityFee = (computeUnits * computeUnitPrice) / 1_000_000; // lamports
  return baseFee + priorityFee;
}

// Example: 200,000 CU at 50,000 micro-lamports/CU
const cost = calculateTransactionCost(200_000, 50_000);
// = 5,000 + (200,000 * 50,000 / 1,000,000)
// = 5,000 + 10,000
// = 15,000 lamports = 0.000015 SOL
```

---

## Priority Fees

### Getting Recent Priority Fees

```tsx
// lib/priorityFees.ts
import { Connection, PublicKey } from '@solana/web3.js';

interface PriorityFeeLevel {
  low: number;
  medium: number;
  high: number;
  veryHigh: number;
}

export async function getRecentPriorityFees(
  connection: Connection,
  accountsToWrite?: PublicKey[]
): Promise<PriorityFeeLevel> {
  const recentFees = await connection.getRecentPrioritizationFees({
    lockedWritableAccounts: accountsToWrite,
  });

  if (recentFees.length === 0) {
    return { low: 1000, medium: 10000, high: 100000, veryHigh: 1000000 };
  }

  // Sort fees
  const fees = recentFees
    .map((f) => f.prioritizationFee)
    .sort((a, b) => a - b);

  // Calculate percentiles
  const getPercentile = (arr: number[], p: number) =>
    arr[Math.floor(arr.length * p)] || 0;

  return {
    low: getPercentile(fees, 0.25),
    medium: getPercentile(fees, 0.5),
    high: getPercentile(fees, 0.75),
    veryHigh: getPercentile(fees, 0.95),
  };
}
```

### Using Helius Priority Fee API

```tsx
// lib/helius.ts
interface HeliusPriorityFee {
  priorityLevel: 'Low' | 'Medium' | 'High' | 'VeryHigh' | 'UnsafeMax';
  priorityLevelFee: number;
}

export async function getHeliusPriorityFees(
  accountKeys: string[],
  apiKey: string
): Promise<Record<string, number>> {
  const response = await fetch(
    `https://mainnet.helius-rpc.com/?api-key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getPriorityFeeEstimate',
        params: [
          {
            accountKeys,
            options: {
              includeAllPriorityFeeLevels: true,
            },
          },
        ],
      }),
    }
  );

  const data = await response.json();
  const levels = data.result.priorityFeeLevels;

  return {
    low: levels.low,
    medium: levels.medium,
    high: levels.high,
    veryHigh: levels.veryHigh,
  };
}
```

---

## Estimating Compute Units

### Simulation-Based Estimation

```tsx
// lib/computeEstimate.ts
import { Connection, Transaction, ComputeBudgetProgram } from '@solana/web3.js';

interface ComputeEstimate {
  unitsConsumed: number;
  recommendedLimit: number;
  logs: string[];
  error: string | null;
}

export async function estimateComputeUnits(
  connection: Connection,
  transaction: Transaction
): Promise<ComputeEstimate> {
  // Create a copy with max compute budget for accurate estimation
  const simulationTx = new Transaction();

  // Add max compute limit for simulation
  simulationTx.add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 })
  );

  // Add original instructions (skip any existing compute budget instructions)
  transaction.instructions.forEach((ix) => {
    if (!ix.programId.equals(ComputeBudgetProgram.programId)) {
      simulationTx.add(ix);
    }
  });

  simulationTx.feePayer = transaction.feePayer;
  simulationTx.recentBlockhash = transaction.recentBlockhash;

  const simulation = await connection.simulateTransaction(simulationTx, {
    sigVerify: false,
    replaceRecentBlockhash: true,
    commitment: 'confirmed',
  });

  const error = simulation.value.err
    ? JSON.stringify(simulation.value.err)
    : null;

  const unitsConsumed = simulation.value.unitsConsumed ?? 200_000;

  // Add buffer based on transaction complexity
  const buffer = unitsConsumed > 500_000 ? 1.3 : 1.2; // 30% for complex, 20% for simple
  const recommendedLimit = Math.min(
    Math.ceil(unitsConsumed * buffer),
    1_400_000
  );

  return {
    unitsConsumed,
    recommendedLimit,
    logs: simulation.value.logs ?? [],
    error,
  };
}
```

### Hook for Compute Estimation

```tsx
// hooks/useComputeEstimate.ts
import { useQuery } from '@tanstack/react-query';
import { useConnection } from '@solana/wallet-adapter-react';
import { Transaction } from '@solana/web3.js';
import { estimateComputeUnits } from '@/lib/computeEstimate';

export function useComputeEstimate(transaction: Transaction | null) {
  const { connection } = useConnection();

  return useQuery({
    queryKey: ['computeEstimate', transaction?.serialize().toString('base64')],
    queryFn: async () => {
      if (!transaction) throw new Error('No transaction');
      return estimateComputeUnits(connection, transaction);
    },
    enabled: !!transaction,
    staleTime: 1000 * 10, // 10 seconds
  });
}
```

---

## Dynamic Fee Strategies

### Transaction Priority Context

```tsx
// contexts/TransactionPriorityContext.tsx
'use client';

import { createContext, useContext, useState, ReactNode, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useConnection } from '@solana/wallet-adapter-react';

type PriorityLevel = 'low' | 'medium' | 'high' | 'custom';

interface TransactionPriorityContextValue {
  priorityLevel: PriorityLevel;
  setPriorityLevel: (level: PriorityLevel) => void;
  customFee: number;
  setCustomFee: (fee: number) => void;
  currentFee: number;
  feeLevels: Record<PriorityLevel, number>;
  isLoading: boolean;
}

const TransactionPriorityContext = createContext<TransactionPriorityContextValue | null>(null);

export function TransactionPriorityProvider({ children }: { children: ReactNode }) {
  const { connection } = useConnection();
  const [priorityLevel, setPriorityLevel] = useState<PriorityLevel>('medium');
  const [customFee, setCustomFee] = useState(100_000);

  const { data: feeLevels, isLoading } = useQuery({
    queryKey: ['priorityFees'],
    queryFn: async () => {
      const fees = await connection.getRecentPrioritizationFees();
      const sortedFees = fees
        .map((f) => f.prioritizationFee)
        .sort((a, b) => a - b);

      return {
        low: sortedFees[Math.floor(sortedFees.length * 0.25)] || 1000,
        medium: sortedFees[Math.floor(sortedFees.length * 0.5)] || 10000,
        high: sortedFees[Math.floor(sortedFees.length * 0.9)] || 100000,
        custom: customFee,
      };
    },
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 60, // 1 minute
  });

  const currentFee = useMemo(() => {
    if (priorityLevel === 'custom') return customFee;
    return feeLevels?.[priorityLevel] ?? 10000;
  }, [priorityLevel, customFee, feeLevels]);

  const value = useMemo(
    () => ({
      priorityLevel,
      setPriorityLevel,
      customFee,
      setCustomFee,
      currentFee,
      feeLevels: feeLevels ?? { low: 1000, medium: 10000, high: 100000, custom: customFee },
      isLoading,
    }),
    [priorityLevel, customFee, currentFee, feeLevels, isLoading]
  );

  return (
    <TransactionPriorityContext.Provider value={value}>
      {children}
    </TransactionPriorityContext.Provider>
  );
}

export function useTransactionPriority() {
  const context = useContext(TransactionPriorityContext);
  if (!context) {
    throw new Error('useTransactionPriority must be used within TransactionPriorityProvider');
  }
  return context;
}
```

### Priority Fee Selector Component

```tsx
// components/PriorityFeeSelector.tsx
import { useTransactionPriority } from '@/contexts/TransactionPriorityContext';

export function PriorityFeeSelector() {
  const {
    priorityLevel,
    setPriorityLevel,
    customFee,
    setCustomFee,
    feeLevels,
    currentFee,
  } = useTransactionPriority();

  const formatFee = (microLamports: number) => {
    const lamports = (200_000 * microLamports) / 1_000_000;
    const sol = lamports / 1_000_000_000;
    return `~${sol.toFixed(6)} SOL`;
  };

  return (
    <div className="space-y-4">
      <h3 className="font-medium">Transaction Priority</h3>

      <div className="grid grid-cols-3 gap-2">
        {(['low', 'medium', 'high'] as const).map((level) => (
          <button
            key={level}
            onClick={() => setPriorityLevel(level)}
            className={`p-3 rounded border ${
              priorityLevel === level
                ? 'border-purple-500 bg-purple-500/10'
                : 'border-gray-600'
            }`}
          >
            <div className="font-medium capitalize">{level}</div>
            <div className="text-sm text-gray-400">
              {formatFee(feeLevels[level])}
            </div>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={priorityLevel === 'custom'}
          onChange={(e) => setPriorityLevel(e.target.checked ? 'custom' : 'medium')}
        />
        <span>Custom fee</span>
      </div>

      {priorityLevel === 'custom' && (
        <div>
          <input
            type="range"
            min={1000}
            max={10_000_000}
            step={1000}
            value={customFee}
            onChange={(e) => setCustomFee(Number(e.target.value))}
            className="w-full"
          />
          <div className="text-sm text-gray-400">
            {customFee.toLocaleString()} micro-lamports ({formatFee(customFee)})
          </div>
        </div>
      )}

      <div className="text-sm">
        Estimated fee: <strong>{formatFee(currentFee)}</strong>
      </div>
    </div>
  );
}
```

---

## Jito Bundles

### Jito Bundle Submission

```tsx
// lib/jito.ts
import { Transaction, VersionedTransaction, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';

const JITO_TIP_ACCOUNTS = [
  'Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY',
  'DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL',
  'HFqU5x63VTqvQss8hp11i4bVmkdzGtLpRNMYS3a9rC1V',
  '96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5',
  'ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49',
  '3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT',
  'DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh',
  'ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt',
];

export function getRandomTipAccount(): PublicKey {
  const index = Math.floor(Math.random() * JITO_TIP_ACCOUNTS.length);
  return new PublicKey(JITO_TIP_ACCOUNTS[index]);
}

export async function sendJitoBundle(
  transactions: (Transaction | VersionedTransaction)[],
  tipLamports: number = 10000
): Promise<string> {
  // Serialize transactions
  const serialized = transactions.map((tx) => {
    if (tx instanceof VersionedTransaction) {
      return bs58.encode(tx.serialize());
    }
    return bs58.encode(tx.serialize());
  });

  // Submit to Jito
  const response = await fetch('https://mainnet.block-engine.jito.wtf/api/v1/bundles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'sendBundle',
      params: [serialized],
    }),
  });

  const result = await response.json();

  if (result.error) {
    throw new Error(`Jito error: ${result.error.message}`);
  }

  return result.result; // Bundle ID
}

export async function checkBundleStatus(bundleId: string): Promise<{
  status: 'processed' | 'pending' | 'failed';
  slot?: number;
  error?: string;
}> {
  const response = await fetch('https://mainnet.block-engine.jito.wtf/api/v1/bundles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getBundleStatuses',
      params: [[bundleId]],
    }),
  });

  const result = await response.json();

  if (result.error) {
    return { status: 'failed', error: result.error.message };
  }

  const status = result.result.value[0];

  if (!status) {
    return { status: 'pending' };
  }

  if (status.confirmation_status === 'processed' || status.confirmation_status === 'confirmed') {
    return { status: 'processed', slot: status.slot };
  }

  return { status: 'failed', error: status.err?.toString() };
}
```

### Jito Transaction Hook

```tsx
// hooks/useJitoTransaction.ts
import { useMutation } from '@tanstack/react-query';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { sendJitoBundle, checkBundleStatus, getRandomTipAccount } from '@/lib/jito';
import { toast } from 'sonner';

interface JitoTransactionOptions {
  tipLamports?: number;
  onBundleSubmitted?: (bundleId: string) => void;
}

export function useJitoTransaction(options: JitoTransactionOptions = {}) {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();

  return useMutation({
    mutationFn: async (transaction: Transaction) => {
      if (!publicKey || !signTransaction) {
        throw new Error('Wallet not connected');
      }

      const tipLamports = options.tipLamports ?? 10000; // 0.00001 SOL default

      // Add tip instruction
      const tipIx = SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: getRandomTipAccount(),
        lamports: tipLamports,
      });
      transaction.add(tipIx);

      // Get fresh blockhash
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash('confirmed');

      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      // Sign transaction
      const signed = await signTransaction(transaction);

      // Submit bundle
      const bundleId = await sendJitoBundle([signed], tipLamports);
      options.onBundleSubmitted?.(bundleId);

      // Poll for status
      let attempts = 0;
      const maxAttempts = 30;

      while (attempts < maxAttempts) {
        await new Promise((r) => setTimeout(r, 1000));

        const status = await checkBundleStatus(bundleId);

        if (status.status === 'processed') {
          return { bundleId, slot: status.slot };
        }

        if (status.status === 'failed') {
          throw new Error(status.error || 'Bundle failed');
        }

        attempts++;
      }

      throw new Error('Bundle confirmation timeout');
    },
    onSuccess: ({ bundleId }) => {
      toast.success('Transaction landed via Jito', {
        description: `Bundle: ${bundleId.slice(0, 8)}...`,
      });
    },
    onError: (error) => {
      toast.error(`Jito bundle failed: ${error.message}`);
    },
  });
}
```

---

## Implementation Patterns

### Smart Transaction Sender

```tsx
// hooks/useSmartTransaction.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Transaction, ComputeBudgetProgram } from '@solana/web3.js';
import { useTransactionPriority } from '@/contexts/TransactionPriorityContext';
import { estimateComputeUnits } from '@/lib/computeEstimate';
import { toast } from 'sonner';

interface SmartTransactionOptions {
  useJito?: boolean;
  jitoTip?: number;
  autoEstimate?: boolean;
  onSuccess?: (signature: string) => void;
  invalidateKeys?: string[][];
}

export function useSmartTransaction(options: SmartTransactionOptions = {}) {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();
  const { currentFee } = useTransactionPriority();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (instructions: TransactionInstruction[]) => {
      if (!publicKey || !signTransaction) {
        throw new Error('Wallet not connected');
      }

      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash('confirmed');

      // Build base transaction for estimation
      const baseTx = new Transaction({
        feePayer: publicKey,
        blockhash,
        lastValidBlockHeight,
      });
      instructions.forEach((ix) => baseTx.add(ix));

      // Estimate compute units
      let computeLimit = 200_000;
      if (options.autoEstimate !== false) {
        const estimate = await estimateComputeUnits(connection, baseTx);
        if (!estimate.error) {
          computeLimit = estimate.recommendedLimit;
        }
      }

      // Build final transaction with compute budget
      const transaction = new Transaction({
        feePayer: publicKey,
        blockhash,
        lastValidBlockHeight,
      });

      transaction.add(
        ComputeBudgetProgram.setComputeUnitLimit({ units: computeLimit })
      );
      transaction.add(
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: currentFee })
      );
      instructions.forEach((ix) => transaction.add(ix));

      // Sign
      const signed = await signTransaction(transaction);

      // Send (with or without Jito)
      if (options.useJito) {
        // Use Jito bundle
        const bundleResult = await sendJitoBundle([signed], options.jitoTip);
        return bundleResult.bundleId;
      }

      // Standard send
      const signature = await connection.sendRawTransaction(signed.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
        maxRetries: 3,
      });

      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      });

      return signature;
    },
    onSuccess: (signature) => {
      toast.success('Transaction confirmed');

      options.invalidateKeys?.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });

      options.onSuccess?.(signature);
    },
    onError: (error) => {
      toast.error(parseTransactionError(error));
    },
  });
}
```

### Usage Example

```tsx
function DepositButton({ amount, poolAddress }: { amount: number; poolAddress: string }) {
  const { mutate, isPending } = useSmartTransaction({
    autoEstimate: true,
    invalidateKeys: [
      ['tokenBalance', publicKey?.toBase58(), mintAddress],
      ['poolData', poolAddress],
    ],
  });

  const handleDeposit = async () => {
    const instructions = await buildDepositInstructions(poolAddress, amount);
    mutate(instructions);
  };

  return (
    <button onClick={handleDeposit} disabled={isPending}>
      {isPending ? 'Depositing...' : 'Deposit'}
    </button>
  );
}
```

---

## Best Practices

1. **Estimate compute units** - Don't use defaults for complex transactions
2. **Add buffer** - Use 20-30% buffer on estimated CU
3. **Dynamic priority fees** - Fetch recent fees, don't hardcode
4. **Monitor congestion** - Increase fees during high activity
5. **Use Jito for MEV-sensitive** - Swaps, liquidations, etc.
6. **Optimize instructions** - Fewer CU = lower fees

---

## External Resources

- [Solana Transaction Fees](https://solana.com/docs/core/fees)
- [Helius Priority Fee API](https://www.helius.dev/docs/priority-fee-api)
- [Jito Documentation](https://docs.jito.wtf/)
- [QuickNode Priority Fees Guide](https://www.quicknode.com/guides/solana-development/transactions/how-to-use-priority-fees)
