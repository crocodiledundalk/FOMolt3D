# Transaction Preferences

Patterns for managing user preferences for transaction settings including priority fees, slippage tolerance, and confirmation levels.

## Table of Contents

1. [Preference Types](#preference-types)
2. [Preferences Context](#preferences-context)
3. [Settings UI](#settings-ui)
4. [Persistence](#persistence)
5. [Integration](#integration)

---

## Preference Types

### Transaction Settings Interface

```tsx
// types/preferences.ts
export type PriorityLevel = 'none' | 'low' | 'medium' | 'high' | 'custom';
export type CommitmentLevel = 'processed' | 'confirmed' | 'finalized';
export type ExplorerPreference = 'solscan' | 'solana-explorer' | 'solana-fm' | 'xray';

export interface TransactionPreferences {
  // Priority Fees
  priorityLevel: PriorityLevel;
  customPriorityFee: number; // micro-lamports per CU
  maxPriorityFee: number; // Cap for dynamic fees

  // Slippage
  slippageBps: number; // Basis points (100 = 1%)
  customSlippage: boolean;

  // Confirmation
  commitment: CommitmentLevel;
  skipPreflight: boolean;

  // UI Preferences
  explorerPreference: ExplorerPreference;
  showAdvancedSettings: boolean;
  autoApprove: boolean; // For trusted dApps
}

export const DEFAULT_PREFERENCES: TransactionPreferences = {
  priorityLevel: 'medium',
  customPriorityFee: 10000,
  maxPriorityFee: 1000000, // 1M micro-lamports

  slippageBps: 50, // 0.5%
  customSlippage: false,

  commitment: 'confirmed',
  skipPreflight: false,

  explorerPreference: 'solscan',
  showAdvancedSettings: false,
  autoApprove: false,
};
```

### Priority Fee Presets

```tsx
// lib/constants/priorityFees.ts
export const PRIORITY_FEE_PRESETS: Record<PriorityLevel, number> = {
  none: 0,
  low: 1000,      // 1,000 micro-lamports
  medium: 10000,  // 10,000 micro-lamports
  high: 100000,   // 100,000 micro-lamports
  custom: 0,      // User-defined
};

export const PRIORITY_LABELS: Record<PriorityLevel, string> = {
  none: 'No Priority',
  low: 'Low (~$0.0001)',
  medium: 'Medium (~$0.001)',
  high: 'High (~$0.01)',
  custom: 'Custom',
};
```

---

## Preferences Context

### Transaction Preferences Provider

```tsx
// contexts/TransactionPreferencesContext.tsx
'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  ReactNode,
} from 'react';
import {
  TransactionPreferences,
  DEFAULT_PREFERENCES,
  PriorityLevel,
  CommitmentLevel,
  ExplorerPreference,
} from '@/types/preferences';
import { PRIORITY_FEE_PRESETS } from '@/lib/constants/priorityFees';

interface TransactionPreferencesContextValue {
  preferences: TransactionPreferences;

  // Setters
  setPriorityLevel: (level: PriorityLevel) => void;
  setCustomPriorityFee: (fee: number) => void;
  setSlippageBps: (bps: number) => void;
  setCommitment: (commitment: CommitmentLevel) => void;
  setSkipPreflight: (skip: boolean) => void;
  setExplorerPreference: (explorer: ExplorerPreference) => void;
  setShowAdvancedSettings: (show: boolean) => void;
  resetToDefaults: () => void;

  // Computed values
  effectivePriorityFee: number;
  slippagePercent: number;
}

const TransactionPreferencesContext = createContext<TransactionPreferencesContextValue | null>(null);

const STORAGE_KEY = 'solana-tx-preferences';

export function TransactionPreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<TransactionPreferences>(DEFAULT_PREFERENCES);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setPreferences((prev) => ({ ...prev, ...parsed }));
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }
    setIsLoaded(true);
  }, []);

  // Persist to localStorage on changes
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
      } catch (error) {
        console.error('Failed to save preferences:', error);
      }
    }
  }, [preferences, isLoaded]);

  const updatePreference = useCallback(
    <K extends keyof TransactionPreferences>(
      key: K,
      value: TransactionPreferences[K]
    ) => {
      setPreferences((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const setPriorityLevel = useCallback(
    (level: PriorityLevel) => updatePreference('priorityLevel', level),
    [updatePreference]
  );

  const setCustomPriorityFee = useCallback(
    (fee: number) => {
      updatePreference('customPriorityFee', fee);
      updatePreference('priorityLevel', 'custom');
    },
    [updatePreference]
  );

  const setSlippageBps = useCallback(
    (bps: number) => {
      updatePreference('slippageBps', bps);
      updatePreference('customSlippage', true);
    },
    [updatePreference]
  );

  const setCommitment = useCallback(
    (commitment: CommitmentLevel) => updatePreference('commitment', commitment),
    [updatePreference]
  );

  const setSkipPreflight = useCallback(
    (skip: boolean) => updatePreference('skipPreflight', skip),
    [updatePreference]
  );

  const setExplorerPreference = useCallback(
    (explorer: ExplorerPreference) => updatePreference('explorerPreference', explorer),
    [updatePreference]
  );

  const setShowAdvancedSettings = useCallback(
    (show: boolean) => updatePreference('showAdvancedSettings', show),
    [updatePreference]
  );

  const resetToDefaults = useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES);
  }, []);

  // Computed values
  const effectivePriorityFee = useMemo(() => {
    if (preferences.priorityLevel === 'custom') {
      return Math.min(preferences.customPriorityFee, preferences.maxPriorityFee);
    }
    return PRIORITY_FEE_PRESETS[preferences.priorityLevel];
  }, [preferences.priorityLevel, preferences.customPriorityFee, preferences.maxPriorityFee]);

  const slippagePercent = useMemo(() => {
    return preferences.slippageBps / 100;
  }, [preferences.slippageBps]);

  const value = useMemo(
    () => ({
      preferences,
      setPriorityLevel,
      setCustomPriorityFee,
      setSlippageBps,
      setCommitment,
      setSkipPreflight,
      setExplorerPreference,
      setShowAdvancedSettings,
      resetToDefaults,
      effectivePriorityFee,
      slippagePercent,
    }),
    [
      preferences,
      setPriorityLevel,
      setCustomPriorityFee,
      setSlippageBps,
      setCommitment,
      setSkipPreflight,
      setExplorerPreference,
      setShowAdvancedSettings,
      resetToDefaults,
      effectivePriorityFee,
      slippagePercent,
    ]
  );

  // Don't render until loaded to prevent hydration mismatch
  if (!isLoaded) {
    return null;
  }

  return (
    <TransactionPreferencesContext.Provider value={value}>
      {children}
    </TransactionPreferencesContext.Provider>
  );
}

export function useTransactionPreferences() {
  const context = useContext(TransactionPreferencesContext);
  if (!context) {
    throw new Error(
      'useTransactionPreferences must be used within TransactionPreferencesProvider'
    );
  }
  return context;
}
```

---

## Settings UI

### Priority Fee Selector

```tsx
// components/settings/PriorityFeeSelector.tsx
import { useTransactionPreferences } from '@/contexts/TransactionPreferencesContext';
import { PriorityLevel } from '@/types/preferences';
import { PRIORITY_LABELS, PRIORITY_FEE_PRESETS } from '@/lib/constants/priorityFees';

export function PriorityFeeSelector() {
  const {
    preferences,
    setPriorityLevel,
    setCustomPriorityFee,
    effectivePriorityFee,
  } = useTransactionPreferences();

  const levels: PriorityLevel[] = ['none', 'low', 'medium', 'high', 'custom'];

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">Priority Fee</label>

      <div className="grid grid-cols-5 gap-2">
        {levels.map((level) => (
          <button
            key={level}
            onClick={() => setPriorityLevel(level)}
            className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
              preferences.priorityLevel === level
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            {level.charAt(0).toUpperCase() + level.slice(1)}
          </button>
        ))}
      </div>

      {preferences.priorityLevel === 'custom' && (
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={preferences.customPriorityFee}
            onChange={(e) => setCustomPriorityFee(Number(e.target.value))}
            className="flex-1 px-3 py-2 border rounded-lg"
            placeholder="Micro-lamports per CU"
          />
          <span className="text-sm text-gray-500">μL/CU</span>
        </div>
      )}

      <p className="text-xs text-gray-500">
        Current fee: {effectivePriorityFee.toLocaleString()} micro-lamports per compute unit
      </p>
    </div>
  );
}
```

### Slippage Selector

```tsx
// components/settings/SlippageSelector.tsx
import { useState } from 'react';
import { useTransactionPreferences } from '@/contexts/TransactionPreferencesContext';

const PRESETS = [10, 50, 100, 300]; // basis points

export function SlippageSelector() {
  const { preferences, setSlippageBps, slippagePercent } = useTransactionPreferences();
  const [isCustom, setIsCustom] = useState(
    !PRESETS.includes(preferences.slippageBps)
  );

  const handlePresetClick = (bps: number) => {
    setSlippageBps(bps);
    setIsCustom(false);
  };

  const handleCustomChange = (value: string) => {
    const bps = Math.round(parseFloat(value) * 100);
    if (!isNaN(bps) && bps >= 0 && bps <= 5000) {
      setSlippageBps(bps);
    }
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">Slippage Tolerance</label>

      <div className="flex gap-2">
        {PRESETS.map((bps) => (
          <button
            key={bps}
            onClick={() => handlePresetClick(bps)}
            className={`px-3 py-1.5 text-sm rounded-lg border ${
              preferences.slippageBps === bps && !isCustom
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            {bps / 100}%
          </button>
        ))}
        <button
          onClick={() => setIsCustom(true)}
          className={`px-3 py-1.5 text-sm rounded-lg border ${
            isCustom
              ? 'border-blue-500 bg-blue-50 text-blue-700'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          Custom
        </button>
      </div>

      {isCustom && (
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={slippagePercent}
            onChange={(e) => handleCustomChange(e.target.value)}
            step="0.1"
            min="0"
            max="50"
            className="w-24 px-3 py-2 border rounded-lg"
          />
          <span className="text-sm text-gray-500">%</span>
        </div>
      )}

      {preferences.slippageBps > 100 && (
        <p className="text-xs text-yellow-600">
          High slippage may result in unfavorable trades
        </p>
      )}
    </div>
  );
}
```

### Full Settings Panel

```tsx
// components/settings/TransactionSettingsPanel.tsx
import { useTransactionPreferences } from '@/contexts/TransactionPreferencesContext';
import { PriorityFeeSelector } from './PriorityFeeSelector';
import { SlippageSelector } from './SlippageSelector';
import { CommitmentLevel, ExplorerPreference } from '@/types/preferences';

export function TransactionSettingsPanel() {
  const {
    preferences,
    setCommitment,
    setSkipPreflight,
    setExplorerPreference,
    setShowAdvancedSettings,
    resetToDefaults,
  } = useTransactionPreferences();

  const commitments: CommitmentLevel[] = ['processed', 'confirmed', 'finalized'];
  const explorers: ExplorerPreference[] = ['solscan', 'solana-explorer', 'solana-fm', 'xray'];

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Transaction Settings</h3>
        <button
          onClick={resetToDefaults}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Reset to defaults
        </button>
      </div>

      <PriorityFeeSelector />
      <SlippageSelector />

      {/* Advanced Settings Toggle */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Advanced Settings</span>
        <button
          onClick={() => setShowAdvancedSettings(!preferences.showAdvancedSettings)}
          className="text-sm text-blue-500"
        >
          {preferences.showAdvancedSettings ? 'Hide' : 'Show'}
        </button>
      </div>

      {preferences.showAdvancedSettings && (
        <div className="space-y-4 pt-2 border-t">
          {/* Commitment Level */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Confirmation Level</label>
            <select
              value={preferences.commitment}
              onChange={(e) => setCommitment(e.target.value as CommitmentLevel)}
              className="w-full px-3 py-2 border rounded-lg"
            >
              {commitments.map((c) => (
                <option key={c} value={c}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500">
              {preferences.commitment === 'processed' && 'Fastest but less certain'}
              {preferences.commitment === 'confirmed' && 'Balanced speed and certainty'}
              {preferences.commitment === 'finalized' && 'Slowest but most certain'}
            </p>
          </div>

          {/* Skip Preflight */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium">Skip Preflight</span>
              <p className="text-xs text-gray-500">
                Send without simulation (faster but riskier)
              </p>
            </div>
            <input
              type="checkbox"
              checked={preferences.skipPreflight}
              onChange={(e) => setSkipPreflight(e.target.checked)}
              className="w-5 h-5"
            />
          </div>

          {/* Explorer Preference */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Explorer</label>
            <select
              value={preferences.explorerPreference}
              onChange={(e) =>
                setExplorerPreference(e.target.value as ExplorerPreference)
              }
              className="w-full px-3 py-2 border rounded-lg"
            >
              {explorers.map((e) => (
                <option key={e} value={e}>
                  {e.charAt(0).toUpperCase() + e.slice(1).replace('-', ' ')}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## Persistence

### Zustand Store Alternative

```tsx
// stores/transactionPreferences.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TransactionPreferences, DEFAULT_PREFERENCES } from '@/types/preferences';

interface TransactionPreferencesStore extends TransactionPreferences {
  setPreference: <K extends keyof TransactionPreferences>(
    key: K,
    value: TransactionPreferences[K]
  ) => void;
  resetToDefaults: () => void;
}

export const useTransactionPreferencesStore = create<TransactionPreferencesStore>()(
  persist(
    (set) => ({
      ...DEFAULT_PREFERENCES,
      setPreference: (key, value) =>
        set((state) => ({ ...state, [key]: value })),
      resetToDefaults: () => set(DEFAULT_PREFERENCES),
    }),
    {
      name: 'solana-tx-preferences',
    }
  )
);
```

---

## Integration

### Using Preferences in Transactions

```tsx
// hooks/useTransaction.ts
import { useTransactionPreferences } from '@/contexts/TransactionPreferencesContext';
import { ComputeBudgetProgram } from '@solana/web3.js';

export function useTransaction() {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();
  const { preferences, effectivePriorityFee } = useTransactionPreferences();

  const execute = async (instructions: TransactionInstruction[]) => {
    if (!publicKey || !signTransaction) {
      throw new Error('Wallet not connected');
    }

    // Add priority fee from preferences
    if (effectivePriorityFee > 0) {
      instructions.unshift(
        ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: effectivePriorityFee,
        })
      );
    }

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash(
      preferences.commitment
    );

    const transaction = new Transaction();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = publicKey;
    transaction.add(...instructions);

    const signed = await signTransaction(transaction);

    const signature = await connection.sendRawTransaction(signed.serialize(), {
      skipPreflight: preferences.skipPreflight,
      preflightCommitment: preferences.commitment,
    });

    await connection.confirmTransaction(
      {
        signature,
        blockhash,
        lastValidBlockHeight,
      },
      preferences.commitment
    );

    return signature;
  };

  return { execute };
}
```

### Using Slippage in Swaps

```tsx
// hooks/useSwap.ts
import { useTransactionPreferences } from '@/contexts/TransactionPreferencesContext';

export function useSwap() {
  const { preferences } = useTransactionPreferences();

  const getQuote = async (inputMint: string, outputMint: string, amount: number) => {
    const response = await fetch(
      `https://quote-api.jup.ag/v6/quote?` +
        `inputMint=${inputMint}&` +
        `outputMint=${outputMint}&` +
        `amount=${amount}&` +
        `slippageBps=${preferences.slippageBps}`
    );
    return response.json();
  };

  return { getQuote };
}
```

---

## Best Practices

### 1. Provide Sensible Defaults

```tsx
// Don't make users configure everything
const DEFAULT_PREFERENCES: TransactionPreferences = {
  priorityLevel: 'medium', // Works for most cases
  slippageBps: 50, // 0.5% is safe for most swaps
  commitment: 'confirmed', // Good balance
};
```

### 2. Persist User Preferences

```tsx
// Users expect their settings to be remembered
useEffect(() => {
  localStorage.setItem('preferences', JSON.stringify(preferences));
}, [preferences]);
```

### 3. Show Estimated Costs

```tsx
// Help users understand the impact of their choices
<p>
  Estimated priority fee: ~{formatSol(estimatedFee)} SOL
</p>
```

### 4. Warn About Risky Settings

```tsx
{preferences.skipPreflight && (
  <div className="text-yellow-600">
    Skipping preflight may result in failed transactions
  </div>
)}

{preferences.slippageBps > 500 && (
  <div className="text-yellow-600">
    High slippage tolerance - you may receive significantly less
  </div>
)}
```

### 5. Context-Aware Defaults

```tsx
// Different defaults for different operations
const swapDefaults = { slippageBps: 50 };
const nftDefaults = { slippageBps: 0, priorityLevel: 'high' };
```

---

## External Resources

- [Solana Transaction Fees](https://solana.com/docs/core/fees)
- [Priority Fees Guide](https://solana.com/docs/more/exchange#prioritization-fees)
- [Commitment Levels](https://solana.com/docs/rpc#configuring-state-commitment)
