# Form Validation

Patterns for validating Solana transaction forms using on-chain state, providing real-time feedback, and enabling dynamic inputs.

## Table of Contents

1. [Validation Strategies](#validation-strategies)
2. [State-Based Validation](#state-based-validation)
3. [Form Setup](#form-setup)
4. [Dynamic Inputs](#dynamic-inputs)
5. [Real-Time Feedback](#real-time-feedback)
6. [Common Validation Patterns](#common-validation-patterns)

---

## Validation Strategies

### Three-Layer Validation

```
Layer 1: Client-Side (Immediate)
├── Format validation (valid address, positive numbers)
├── Required field checks
└── Basic constraints (min/max values)

Layer 2: State-Based (Fast, On-Chain Aware)
├── Balance checks (sufficient SOL/tokens)
├── Account existence
├── Authority validation
└── Program-specific constraints

Layer 3: Simulation (Pre-Submit)
├── Full transaction simulation
├── Compute unit estimation
├── Error prediction
└── Slippage/rate checks
```

### When to Use Each

| Layer | Timing | Use Case |
|-------|--------|----------|
| Client-Side | Every keystroke | Format validation, required fields |
| State-Based | On blur or debounced | Balance checks, account validation |
| Simulation | Pre-submit | Complex validations, error prediction |

---

## State-Based Validation

### Balance Validation Hook

```tsx
// hooks/useBalanceValidation.ts
import { useMemo } from 'react';
import { useSolBalance } from './useSolBalance';
import { useTokenBalance } from './useTokenBalance';
import { useWallet } from '@solana/wallet-adapter-react';

interface BalanceValidation {
  isValid: boolean;
  error: string | null;
  available: number;
  required: number;
}

export function useSolBalanceValidation(requiredAmount: number): BalanceValidation {
  const { publicKey } = useWallet();
  const { data: balance, isLoading } = useSolBalance();

  return useMemo(() => {
    if (!publicKey) {
      return { isValid: false, error: 'Connect wallet', available: 0, required: requiredAmount };
    }

    if (isLoading || balance === undefined) {
      return { isValid: true, error: null, available: 0, required: requiredAmount };
    }

    // Reserve for rent and fees
    const reserved = 0.01; // 0.01 SOL for fees
    const available = Math.max(0, balance - reserved);

    if (requiredAmount > available) {
      return {
        isValid: false,
        error: `Insufficient SOL. Available: ${available.toFixed(4)} SOL`,
        available,
        required: requiredAmount,
      };
    }

    return { isValid: true, error: null, available, required: requiredAmount };
  }, [publicKey, balance, isLoading, requiredAmount]);
}

export function useTokenBalanceValidation(
  mintAddress: string,
  requiredAmount: number
): BalanceValidation {
  const { publicKey } = useWallet();
  const { data: tokenData, isLoading } = useTokenBalance(mintAddress);

  return useMemo(() => {
    if (!publicKey) {
      return { isValid: false, error: 'Connect wallet', available: 0, required: requiredAmount };
    }

    if (isLoading || !tokenData) {
      return { isValid: true, error: null, available: 0, required: requiredAmount };
    }

    if (requiredAmount > tokenData.balance) {
      return {
        isValid: false,
        error: `Insufficient balance. Available: ${tokenData.uiBalance}`,
        available: tokenData.balance,
        required: requiredAmount,
      };
    }

    return { isValid: true, error: null, available: tokenData.balance, required: requiredAmount };
  }, [publicKey, tokenData, isLoading, requiredAmount]);
}
```

### Account Validation Hook

```tsx
// hooks/useAccountValidation.ts
import { useQuery } from '@tanstack/react-query';
import { useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { useMemo } from 'react';

interface AccountValidation {
  isValid: boolean;
  error: string | null;
  exists: boolean;
  owner?: string;
}

export function useAccountValidation(address: string | null): AccountValidation {
  const { connection } = useConnection();

  const { data, isLoading, error } = useQuery({
    queryKey: ['accountValidation', address],
    queryFn: async () => {
      if (!address) throw new Error('No address');

      try {
        const pubkey = new PublicKey(address);
        const info = await connection.getAccountInfo(pubkey);

        return {
          exists: info !== null,
          owner: info?.owner.toBase58(),
          lamports: info?.lamports,
        };
      } catch (e) {
        throw new Error('Invalid address format');
      }
    },
    enabled: !!address && address.length >= 32,
    staleTime: 1000 * 30,
  });

  return useMemo(() => {
    if (!address) {
      return { isValid: true, error: null, exists: false };
    }

    // Check address format
    try {
      new PublicKey(address);
    } catch {
      return { isValid: false, error: 'Invalid address format', exists: false };
    }

    if (isLoading) {
      return { isValid: true, error: null, exists: false };
    }

    if (error) {
      return { isValid: false, error: 'Failed to validate address', exists: false };
    }

    return {
      isValid: true,
      error: null,
      exists: data?.exists ?? false,
      owner: data?.owner,
    };
  }, [address, data, isLoading, error]);
}
```

---

## Form Setup

### Zod Schema with Solana Validation

```tsx
// lib/validation/schemas.ts
import { z } from 'zod';
import { PublicKey } from '@solana/web3.js';

// Solana address validator
export const solanaAddressSchema = z.string().refine(
  (value) => {
    try {
      new PublicKey(value);
      return true;
    } catch {
      return false;
    }
  },
  { message: 'Invalid Solana address' }
);

// Token amount validator
export const tokenAmountSchema = z
  .number()
  .positive('Amount must be positive')
  .refine((val) => val > 0, 'Amount must be greater than 0');

// Transfer form schema
export const transferFormSchema = z.object({
  recipient: solanaAddressSchema,
  amount: tokenAmountSchema,
  memo: z.string().max(100).optional(),
});

// Swap form schema
export const swapFormSchema = z.object({
  inputMint: solanaAddressSchema,
  outputMint: solanaAddressSchema,
  inputAmount: tokenAmountSchema,
  slippageBps: z.number().min(1).max(5000).default(50),
});

// Stake form schema
export const stakeFormSchema = z.object({
  validator: solanaAddressSchema,
  amount: z.number().min(0.01, 'Minimum stake is 0.01 SOL'),
});
```

### React Hook Form Integration

```tsx
// components/TransferForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useWallet } from '@solana/wallet-adapter-react';
import { useSolBalanceValidation } from '@/hooks/useBalanceValidation';
import { useAccountValidation } from '@/hooks/useAccountValidation';
import { useTransaction } from '@/hooks/useTransaction';
import { transferFormSchema } from '@/lib/validation/schemas';

type TransferFormData = z.infer<typeof transferFormSchema>;

export function TransferForm() {
  const { publicKey } = useWallet();
  const { mutate: sendTransaction, isPending } = useTransaction();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid: formIsValid },
  } = useForm<TransferFormData>({
    resolver: zodResolver(transferFormSchema),
    mode: 'onChange',
  });

  // Watch form values for state-based validation
  const amount = watch('amount') || 0;
  const recipient = watch('recipient');

  // State-based validations
  const balanceValidation = useSolBalanceValidation(amount);
  const recipientValidation = useAccountValidation(recipient);

  // Combined validation state
  const isFormValid =
    formIsValid &&
    balanceValidation.isValid &&
    recipientValidation.isValid;

  const onSubmit = (data: TransferFormData) => {
    if (!isFormValid) return;
    // Build and send transaction
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Recipient field */}
      <div>
        <label className="block text-sm text-gray-400 mb-1">Recipient</label>
        <input
          {...register('recipient')}
          placeholder="Recipient address"
          className={`w-full p-3 bg-gray-800 rounded border ${
            errors.recipient || recipientValidation.error
              ? 'border-red-500'
              : 'border-gray-700'
          }`}
          disabled={isPending}
        />
        {errors.recipient && (
          <p className="text-red-400 text-sm mt-1">{errors.recipient.message}</p>
        )}
        {recipientValidation.error && (
          <p className="text-red-400 text-sm mt-1">{recipientValidation.error}</p>
        )}
      </div>

      {/* Amount field */}
      <div>
        <label className="block text-sm text-gray-400 mb-1">
          Amount (SOL)
          <span className="float-right">
            Available: {balanceValidation.available.toFixed(4)} SOL
          </span>
        </label>
        <input
          {...register('amount', { valueAsNumber: true })}
          type="number"
          step="0.001"
          placeholder="0.00"
          className={`w-full p-3 bg-gray-800 rounded border ${
            errors.amount || balanceValidation.error
              ? 'border-red-500'
              : 'border-gray-700'
          }`}
          disabled={isPending}
        />
        {errors.amount && (
          <p className="text-red-400 text-sm mt-1">{errors.amount.message}</p>
        )}
        {balanceValidation.error && (
          <p className="text-red-400 text-sm mt-1">{balanceValidation.error}</p>
        )}
      </div>

      {/* Submit button */}
      <button
        type="submit"
        disabled={!isFormValid || isPending || !publicKey}
        className={`w-full p-3 rounded font-medium ${
          isFormValid && !isPending
            ? 'bg-purple-500 hover:bg-purple-600 text-white'
            : 'bg-gray-700 text-gray-400 cursor-not-allowed'
        }`}
      >
        {isPending ? 'Sending...' : 'Send SOL'}
      </button>
    </form>
  );
}
```

---

## Dynamic Inputs

### Max Button

```tsx
// components/MaxButton.tsx
interface MaxButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export function MaxButton({ onClick, disabled }: MaxButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="px-2 py-1 text-xs bg-purple-500/20 text-purple-400 rounded hover:bg-purple-500/30 disabled:opacity-50"
    >
      MAX
    </button>
  );
}

// Usage in form
function TokenInput() {
  const { data: balance } = useTokenBalance(mintAddress);
  const { setValue } = useFormContext();

  const handleMax = () => {
    if (balance) {
      setValue('amount', balance.balance, { shouldValidate: true });
    }
  };

  return (
    <div className="relative">
      <input {...register('amount')} />
      <MaxButton onClick={handleMax} />
    </div>
  );
}
```

### Percentage Buttons

```tsx
// components/PercentageButtons.tsx
interface PercentageButtonsProps {
  maxAmount: number;
  onSelect: (amount: number) => void;
  disabled?: boolean;
}

const PERCENTAGES = [25, 50, 75, 100];

export function PercentageButtons({
  maxAmount,
  onSelect,
  disabled,
}: PercentageButtonsProps) {
  return (
    <div className="flex gap-2">
      {PERCENTAGES.map((pct) => (
        <button
          key={pct}
          type="button"
          onClick={() => onSelect(maxAmount * (pct / 100))}
          disabled={disabled}
          className="px-3 py-1 text-xs bg-gray-700 rounded hover:bg-gray-600 disabled:opacity-50"
        >
          {pct}%
        </button>
      ))}
    </div>
  );
}
```

### Dynamic Token Selector

```tsx
// components/TokenSelector.tsx
import { useTokenBalances } from '@/hooks/useTokenBalances';

interface TokenSelectorProps {
  value: string;
  onChange: (mint: string) => void;
  excludeMints?: string[];
}

export function TokenSelector({ value, onChange, excludeMints = [] }: TokenSelectorProps) {
  const { data: tokens, isLoading } = useEnrichedTokenBalances();

  const availableTokens = tokens?.filter(
    (t) => !excludeMints.includes(t.mint)
  );

  if (isLoading) {
    return <div className="animate-pulse h-12 bg-gray-800 rounded" />;
  }

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full p-3 bg-gray-800 border border-gray-700 rounded"
    >
      <option value="">Select token</option>
      {availableTokens?.map((token) => (
        <option key={token.mint} value={token.mint}>
          {token.symbol} - {token.uiBalance}
        </option>
      ))}
    </select>
  );
}
```

---

## Real-Time Feedback

### Validation Status Indicator

```tsx
// components/ValidationStatus.tsx
interface ValidationStatusProps {
  isValid: boolean;
  isLoading?: boolean;
  error?: string | null;
  successMessage?: string;
}

export function ValidationStatus({
  isValid,
  isLoading,
  error,
  successMessage,
}: ValidationStatusProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-gray-400 text-sm">
        <Spinner className="w-3 h-3" />
        <span>Validating...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-red-400 text-sm">
        <span>✕</span>
        <span>{error}</span>
      </div>
    );
  }

  if (isValid && successMessage) {
    return (
      <div className="flex items-center gap-2 text-green-400 text-sm">
        <span>✓</span>
        <span>{successMessage}</span>
      </div>
    );
  }

  return null;
}
```

### Input with Validation

```tsx
// components/ValidatedInput.tsx
import { UseFormRegisterReturn } from 'react-hook-form';

interface ValidatedInputProps {
  label: string;
  registration: UseFormRegisterReturn;
  error?: string;
  stateError?: string;
  isValidating?: boolean;
  hint?: string;
  rightElement?: React.ReactNode;
  disabled?: boolean;
}

export function ValidatedInput({
  label,
  registration,
  error,
  stateError,
  isValidating,
  hint,
  rightElement,
  disabled,
}: ValidatedInputProps) {
  const hasError = error || stateError;

  return (
    <div className="space-y-1">
      <label className="block text-sm text-gray-400">{label}</label>

      <div className="relative">
        <input
          {...registration}
          disabled={disabled}
          className={`w-full p-3 bg-gray-800 rounded border transition-colors ${
            hasError
              ? 'border-red-500 focus:border-red-400'
              : 'border-gray-700 focus:border-purple-500'
          } ${rightElement ? 'pr-16' : ''}`}
        />

        {rightElement && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            {rightElement}
          </div>
        )}

        {isValidating && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Spinner className="w-4 h-4 text-gray-400" />
          </div>
        )}
      </div>

      {(error || stateError) && (
        <p className="text-red-400 text-sm">{error || stateError}</p>
      )}

      {hint && !hasError && (
        <p className="text-gray-500 text-sm">{hint}</p>
      )}
    </div>
  );
}
```

---

## Common Validation Patterns

### Slippage Validation

```tsx
// lib/validation/slippage.ts
export function validateSlippage(slippageBps: number): {
  isValid: boolean;
  warning?: string;
  error?: string;
} {
  if (slippageBps < 1) {
    return { isValid: false, error: 'Slippage too low' };
  }

  if (slippageBps > 5000) {
    return { isValid: false, error: 'Slippage too high (max 50%)' };
  }

  if (slippageBps < 10) {
    return {
      isValid: true,
      warning: 'Low slippage may cause transaction to fail',
    };
  }

  if (slippageBps > 500) {
    return {
      isValid: true,
      warning: 'High slippage may result in unfavorable rate',
    };
  }

  return { isValid: true };
}
```

### Stake Amount Validation

```tsx
// hooks/useStakeValidation.ts
export function useStakeValidation(amount: number) {
  const { data: solBalance } = useSolBalance();
  const { data: stakeAccounts } = useStakeAccounts();

  return useMemo(() => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Minimum stake requirement
    if (amount < 0.01) {
      errors.push('Minimum stake is 0.01 SOL');
    }

    // Balance check (keeping some for rent)
    const minReserve = 0.05;
    if (solBalance && amount > solBalance - minReserve) {
      errors.push(`Insufficient balance. Keep ${minReserve} SOL for rent/fees`);
    }

    // Too many stake accounts warning
    if (stakeAccounts && stakeAccounts.length >= 10) {
      warnings.push('You have many stake accounts. Consider consolidating');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }, [amount, solBalance, stakeAccounts]);
}
```

### Custom Program Validation

```tsx
// hooks/usePoolValidation.ts
export function usePoolValidation(
  poolAddress: string,
  depositAmount: number
) {
  const { data: pool } = usePoolData(poolAddress);
  const { data: userBalance } = useTokenBalance(pool?.tokenMint);

  return useMemo(() => {
    const errors: string[] = [];

    if (!pool) {
      return { isValid: false, errors: ['Pool not found'] };
    }

    // Pool is paused
    if (pool.isPaused) {
      errors.push('Pool is currently paused');
    }

    // Maximum deposit
    if (pool.maxDeposit && depositAmount > pool.maxDeposit) {
      errors.push(`Maximum deposit is ${pool.maxDeposit}`);
    }

    // Minimum deposit
    if (pool.minDeposit && depositAmount < pool.minDeposit) {
      errors.push(`Minimum deposit is ${pool.minDeposit}`);
    }

    // Capacity check
    if (pool.capacity && pool.totalDeposits + depositAmount > pool.capacity) {
      const remaining = pool.capacity - pool.totalDeposits;
      errors.push(`Pool capacity reached. Max available: ${remaining}`);
    }

    // Balance check
    if (userBalance && depositAmount > userBalance.balance) {
      errors.push('Insufficient token balance');
    }

    return {
      isValid: errors.length === 0,
      errors,
      pool,
    };
  }, [pool, depositAmount, userBalance]);
}
```

---

## Best Practices

### 1. Validate Early, Validate Often

```tsx
// Good: Immediate feedback on format issues
<input
  onChange={(e) => {
    // Check format immediately
    const isValid = isValidAddress(e.target.value);
    setAddressError(isValid ? null : 'Invalid format');
  }}
/>
```

### 2. Debounce State-Based Validation

```tsx
// Debounce balance checks to avoid excessive RPC calls
const debouncedAmount = useDebounce(amount, 300);
const balanceCheck = useSolBalanceValidation(debouncedAmount);
```

### 3. Show Available Amounts

```tsx
// Always show what's available
<label>
  Amount
  <span className="float-right text-gray-400">
    Available: {balance.toFixed(4)} SOL
  </span>
</label>
```

### 4. Disable Submit Until Valid

```tsx
<button
  disabled={!isFormValid || !balanceValid || isPending}
>
  Submit
</button>
```

### 5. Clear Error Messages

```tsx
// Good: Specific, actionable error
"Insufficient SOL. Need 0.5 SOL, have 0.3 SOL."

// Bad: Vague error
"Invalid amount"
```

---

## External Resources

- [React Hook Form](https://react-hook-form.com/)
- [Zod Validation](https://zod.dev/)
- [Form Best Practices](https://web.dev/learn/forms/)
