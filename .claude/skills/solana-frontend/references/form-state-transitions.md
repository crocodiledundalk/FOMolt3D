# Form State Transitions

Patterns for managing UI states during the transaction lifecycle, from form input to confirmation.

## Table of Contents

1. [State Machine Pattern](#state-machine-pattern)
2. [Transaction State Hook](#transaction-state-hook)
3. [Form Integration](#form-integration)
4. [UI Components](#ui-components)
5. [Error Recovery](#error-recovery)

---

## State Machine Pattern

### Transaction States

```tsx
// types/transactionState.ts
export type TransactionState =
  | { status: 'idle' }
  | { status: 'validating' }
  | { status: 'simulating' }
  | { status: 'awaiting_signature' }
  | { status: 'signing' }
  | { status: 'sending' }
  | { status: 'confirming'; signature: string }
  | { status: 'success'; signature: string }
  | { status: 'error'; error: string; recoverable: boolean };

export type TransactionStatus = TransactionState['status'];

// State transitions
export const VALID_TRANSITIONS: Record<TransactionStatus, TransactionStatus[]> = {
  idle: ['validating', 'simulating', 'awaiting_signature'],
  validating: ['idle', 'simulating', 'error'],
  simulating: ['awaiting_signature', 'error', 'idle'],
  awaiting_signature: ['signing', 'idle'],
  signing: ['sending', 'error', 'idle'],
  sending: ['confirming', 'error'],
  confirming: ['success', 'error'],
  success: ['idle'],
  error: ['idle', 'validating'],
};
```

### State Machine Hook

```tsx
// hooks/useTransactionStateMachine.ts
import { useReducer, useCallback } from 'react';
import { TransactionState, TransactionStatus, VALID_TRANSITIONS } from '@/types/transactionState';

type Action =
  | { type: 'START_VALIDATION' }
  | { type: 'START_SIMULATION' }
  | { type: 'AWAIT_SIGNATURE' }
  | { type: 'START_SIGNING' }
  | { type: 'START_SENDING' }
  | { type: 'START_CONFIRMING'; signature: string }
  | { type: 'SUCCESS'; signature: string }
  | { type: 'ERROR'; error: string; recoverable?: boolean }
  | { type: 'RESET' };

function reducer(state: TransactionState, action: Action): TransactionState {
  const canTransition = (to: TransactionStatus) =>
    VALID_TRANSITIONS[state.status].includes(to);

  switch (action.type) {
    case 'START_VALIDATION':
      return canTransition('validating') ? { status: 'validating' } : state;
    case 'START_SIMULATION':
      return canTransition('simulating') ? { status: 'simulating' } : state;
    case 'AWAIT_SIGNATURE':
      return canTransition('awaiting_signature')
        ? { status: 'awaiting_signature' }
        : state;
    case 'START_SIGNING':
      return canTransition('signing') ? { status: 'signing' } : state;
    case 'START_SENDING':
      return canTransition('sending') ? { status: 'sending' } : state;
    case 'START_CONFIRMING':
      return canTransition('confirming')
        ? { status: 'confirming', signature: action.signature }
        : state;
    case 'SUCCESS':
      return canTransition('success')
        ? { status: 'success', signature: action.signature }
        : state;
    case 'ERROR':
      return {
        status: 'error',
        error: action.error,
        recoverable: action.recoverable ?? true,
      };
    case 'RESET':
      return { status: 'idle' };
    default:
      return state;
  }
}

export function useTransactionStateMachine() {
  const [state, dispatch] = useReducer(reducer, { status: 'idle' });

  const startValidation = useCallback(() => dispatch({ type: 'START_VALIDATION' }), []);
  const startSimulation = useCallback(() => dispatch({ type: 'START_SIMULATION' }), []);
  const awaitSignature = useCallback(() => dispatch({ type: 'AWAIT_SIGNATURE' }), []);
  const startSigning = useCallback(() => dispatch({ type: 'START_SIGNING' }), []);
  const startSending = useCallback(() => dispatch({ type: 'START_SENDING' }), []);
  const startConfirming = useCallback(
    (signature: string) => dispatch({ type: 'START_CONFIRMING', signature }),
    []
  );
  const success = useCallback(
    (signature: string) => dispatch({ type: 'SUCCESS', signature }),
    []
  );
  const error = useCallback(
    (err: string, recoverable = true) =>
      dispatch({ type: 'ERROR', error: err, recoverable }),
    []
  );
  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);

  return {
    state,
    isIdle: state.status === 'idle',
    isLoading: ['validating', 'simulating', 'signing', 'sending', 'confirming'].includes(
      state.status
    ),
    isAwaitingSignature: state.status === 'awaiting_signature',
    isSuccess: state.status === 'success',
    isError: state.status === 'error',
    startValidation,
    startSimulation,
    awaitSignature,
    startSigning,
    startSending,
    startConfirming,
    success,
    error,
    reset,
  };
}
```

---

## Transaction State Hook

### Complete Transaction Hook with State

```tsx
// hooks/useTransactionWithState.ts
import { useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import {
  Transaction,
  TransactionInstruction,
  VersionedTransaction,
  TransactionMessage,
  ComputeBudgetProgram,
} from '@solana/web3.js';
import { useTransactionStateMachine } from './useTransactionStateMachine';
import { simulateTransaction } from '@/lib/transaction/simulate';
import { parseTransactionError } from '@/lib/errors';

interface UseTransactionOptions {
  onSuccess?: (signature: string) => void;
  onError?: (error: string) => void;
  skipSimulation?: boolean;
}

export function useTransactionWithState(options: UseTransactionOptions = {}) {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();
  const stateMachine = useTransactionStateMachine();

  const execute = useCallback(
    async (instructions: TransactionInstruction[]) => {
      if (!publicKey || !signTransaction) {
        stateMachine.error('Wallet not connected', false);
        return null;
      }

      try {
        // Build transaction
        const { blockhash, lastValidBlockHeight } =
          await connection.getLatestBlockhash('confirmed');

        const messageV0 = new TransactionMessage({
          payerKey: publicKey,
          recentBlockhash: blockhash,
          instructions,
        }).compileToV0Message();

        const transaction = new VersionedTransaction(messageV0);

        // Simulation (optional)
        if (!options.skipSimulation) {
          stateMachine.startSimulation();
          const simulation = await simulateTransaction(connection, transaction);

          if (!simulation.success) {
            stateMachine.error(simulation.error || 'Simulation failed');
            return null;
          }
        }

        // Wait for user to sign
        stateMachine.awaitSignature();

        // Signing
        stateMachine.startSigning();
        // Note: For versioned transactions, need to use signTransaction differently
        const legacyTx = new Transaction();
        legacyTx.recentBlockhash = blockhash;
        legacyTx.feePayer = publicKey;
        legacyTx.add(...instructions);

        const signedTx = await signTransaction(legacyTx);

        // Sending
        stateMachine.startSending();
        const signature = await connection.sendRawTransaction(signedTx.serialize(), {
          skipPreflight: true, // We already simulated
        });

        // Confirming
        stateMachine.startConfirming(signature);
        await connection.confirmTransaction({
          signature,
          blockhash,
          lastValidBlockHeight,
        });

        // Success
        stateMachine.success(signature);
        options.onSuccess?.(signature);
        return signature;
      } catch (err: any) {
        const errorMessage = parseTransactionError(err);
        stateMachine.error(errorMessage);
        options.onError?.(errorMessage);
        return null;
      }
    },
    [connection, publicKey, signTransaction, stateMachine, options]
  );

  return {
    execute,
    ...stateMachine,
  };
}
```

---

## Form Integration

### Form with Transaction State

```tsx
// components/forms/TransferFormWithState.tsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { SystemProgram, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';
import { useTransactionWithState } from '@/hooks/useTransactionWithState';
import { TransactionStateOverlay } from '@/components/TransactionStateOverlay';

const schema = z.object({
  recipient: z.string().min(32, 'Invalid address').max(44, 'Invalid address'),
  amount: z.number().positive('Amount must be positive'),
});

type FormData = z.infer<typeof schema>;

export function TransferFormWithState() {
  const { publicKey } = useWallet();
  const {
    execute,
    state,
    isLoading,
    isAwaitingSignature,
    isSuccess,
    isError,
    reset,
  } = useTransactionWithState({
    onSuccess: () => {
      form.reset();
    },
  });

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      recipient: '',
      amount: 0,
    },
  });

  const onSubmit = async (data: FormData) => {
    if (!publicKey) return;

    const instruction = SystemProgram.transfer({
      fromPubkey: publicKey,
      toPubkey: new PublicKey(data.recipient),
      lamports: data.amount * LAMPORTS_PER_SOL,
    });

    await execute([instruction]);
  };

  // Disable form during transaction
  const isFormDisabled = isLoading || isAwaitingSignature;

  return (
    <div className="relative">
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Recipient</label>
          <input
            {...form.register('recipient')}
            disabled={isFormDisabled}
            className="w-full px-4 py-2 border rounded-lg disabled:opacity-50"
            placeholder="Wallet address"
          />
          {form.formState.errors.recipient && (
            <p className="text-red-500 text-sm mt-1">
              {form.formState.errors.recipient.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Amount (SOL)</label>
          <input
            type="number"
            step="0.001"
            {...form.register('amount', { valueAsNumber: true })}
            disabled={isFormDisabled}
            className="w-full px-4 py-2 border rounded-lg disabled:opacity-50"
            placeholder="0.00"
          />
          {form.formState.errors.amount && (
            <p className="text-red-500 text-sm mt-1">
              {form.formState.errors.amount.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isFormDisabled}
          className="w-full py-3 bg-blue-600 text-white rounded-lg disabled:opacity-50"
        >
          {getButtonText(state.status)}
        </button>
      </form>

      {/* Overlay for transaction states */}
      {state.status !== 'idle' && (
        <TransactionStateOverlay state={state} onReset={reset} />
      )}
    </div>
  );
}

function getButtonText(status: TransactionState['status']): string {
  switch (status) {
    case 'validating':
      return 'Validating...';
    case 'simulating':
      return 'Simulating...';
    case 'awaiting_signature':
      return 'Waiting for wallet...';
    case 'signing':
      return 'Signing...';
    case 'sending':
      return 'Sending...';
    case 'confirming':
      return 'Confirming...';
    default:
      return 'Send SOL';
  }
}
```

---

## UI Components

### Transaction State Overlay

```tsx
// components/TransactionStateOverlay.tsx
import { TransactionState } from '@/types/transactionState';
import { getExplorerUrl } from '@/lib/explorer';

interface TransactionStateOverlayProps {
  state: TransactionState;
  onReset: () => void;
}

export function TransactionStateOverlay({
  state,
  onReset,
}: TransactionStateOverlayProps) {
  const renderContent = () => {
    switch (state.status) {
      case 'simulating':
        return (
          <div className="text-center">
            <Spinner className="w-12 h-12 mx-auto mb-4" />
            <p className="font-medium">Simulating Transaction</p>
            <p className="text-sm text-gray-500">Checking if transaction will succeed...</p>
          </div>
        );

      case 'awaiting_signature':
        return (
          <div className="text-center">
            <WalletIcon className="w-12 h-12 mx-auto mb-4 text-blue-500" />
            <p className="font-medium">Approve in Wallet</p>
            <p className="text-sm text-gray-500">
              Please approve the transaction in your wallet
            </p>
            <button
              onClick={onReset}
              className="mt-4 text-sm text-gray-500 underline"
            >
              Cancel
            </button>
          </div>
        );

      case 'signing':
        return (
          <div className="text-center">
            <Spinner className="w-12 h-12 mx-auto mb-4" />
            <p className="font-medium">Signing Transaction</p>
          </div>
        );

      case 'sending':
        return (
          <div className="text-center">
            <Spinner className="w-12 h-12 mx-auto mb-4" />
            <p className="font-medium">Sending to Network</p>
          </div>
        );

      case 'confirming':
        return (
          <div className="text-center">
            <Spinner className="w-12 h-12 mx-auto mb-4" />
            <p className="font-medium">Confirming Transaction</p>
            <a
              href={getExplorerUrl('tx', state.signature)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-500 underline"
            >
              View on Explorer
            </a>
          </div>
        );

      case 'success':
        return (
          <div className="text-center">
            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
            <p className="font-medium text-green-600">Transaction Successful!</p>
            <a
              href={getExplorerUrl('tx', state.signature)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-500 underline"
            >
              View on Explorer
            </a>
            <button
              onClick={onReset}
              className="mt-4 block mx-auto px-4 py-2 bg-gray-100 rounded-lg"
            >
              Done
            </button>
          </div>
        );

      case 'error':
        return (
          <div className="text-center">
            <XCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
            <p className="font-medium text-red-600">Transaction Failed</p>
            <p className="text-sm text-gray-600 mt-2">{state.error}</p>
            {state.recoverable && (
              <button
                onClick={onReset}
                className="mt-4 px-4 py-2 bg-red-100 text-red-600 rounded-lg"
              >
                Try Again
              </button>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  if (state.status === 'idle' || state.status === 'validating') {
    return null;
  }

  return (
    <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center rounded-lg">
      {renderContent()}
    </div>
  );
}
```

### Progress Steps

```tsx
// components/TransactionProgress.tsx
import { TransactionState } from '@/types/transactionState';

const STEPS = [
  { key: 'simulating', label: 'Simulate' },
  { key: 'signing', label: 'Sign' },
  { key: 'sending', label: 'Send' },
  { key: 'confirming', label: 'Confirm' },
] as const;

interface TransactionProgressProps {
  state: TransactionState;
}

export function TransactionProgress({ state }: TransactionProgressProps) {
  const currentIndex = STEPS.findIndex((s) => s.key === state.status);

  return (
    <div className="flex items-center justify-between">
      {STEPS.map((step, index) => {
        const isComplete = currentIndex > index || state.status === 'success';
        const isCurrent = step.key === state.status;
        const isError = state.status === 'error';

        return (
          <div key={step.key} className="flex items-center">
            <div
              className={`
                w-8 h-8 rounded-full flex items-center justify-center
                ${isComplete ? 'bg-green-500 text-white' : ''}
                ${isCurrent && !isError ? 'bg-blue-500 text-white' : ''}
                ${isCurrent && isError ? 'bg-red-500 text-white' : ''}
                ${!isComplete && !isCurrent ? 'bg-gray-200 text-gray-500' : ''}
              `}
            >
              {isComplete ? (
                <Check className="w-4 h-4" />
              ) : isCurrent && isError ? (
                <X className="w-4 h-4" />
              ) : (
                index + 1
              )}
            </div>
            <span className="ml-2 text-sm">{step.label}</span>
            {index < STEPS.length - 1 && (
              <div
                className={`w-12 h-0.5 mx-2 ${
                  currentIndex > index ? 'bg-green-500' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
```

---

## Error Recovery

### Retry Logic

```tsx
// hooks/useTransactionWithRetry.ts
import { useState, useCallback } from 'react';
import { useTransactionWithState } from './useTransactionWithState';
import { TransactionInstruction } from '@solana/web3.js';

interface UseTransactionWithRetryOptions {
  maxRetries?: number;
  onSuccess?: (signature: string) => void;
}

export function useTransactionWithRetry(options: UseTransactionWithRetryOptions = {}) {
  const { maxRetries = 3 } = options;
  const [retryCount, setRetryCount] = useState(0);
  const [lastInstructions, setLastInstructions] = useState<TransactionInstruction[] | null>(
    null
  );

  const transaction = useTransactionWithState({
    onSuccess: (sig) => {
      setRetryCount(0);
      setLastInstructions(null);
      options.onSuccess?.(sig);
    },
  });

  const execute = useCallback(
    async (instructions: TransactionInstruction[]) => {
      setLastInstructions(instructions);
      setRetryCount(0);
      return transaction.execute(instructions);
    },
    [transaction]
  );

  const retry = useCallback(async () => {
    if (!lastInstructions) return null;
    if (retryCount >= maxRetries) {
      transaction.error('Maximum retries exceeded', false);
      return null;
    }

    setRetryCount((c) => c + 1);
    transaction.reset();
    return transaction.execute(lastInstructions);
  }, [lastInstructions, retryCount, maxRetries, transaction]);

  const canRetry =
    transaction.isError &&
    transaction.state.status === 'error' &&
    transaction.state.recoverable &&
    retryCount < maxRetries;

  return {
    ...transaction,
    execute,
    retry,
    canRetry,
    retryCount,
    maxRetries,
  };
}
```

### Error Recovery UI

```tsx
// components/TransactionErrorRecovery.tsx
interface TransactionErrorRecoveryProps {
  error: string;
  canRetry: boolean;
  retryCount: number;
  maxRetries: number;
  onRetry: () => void;
  onReset: () => void;
}

export function TransactionErrorRecovery({
  error,
  canRetry,
  retryCount,
  maxRetries,
  onRetry,
  onReset,
}: TransactionErrorRecoveryProps) {
  return (
    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
      <div className="flex items-start gap-3">
        <XCircle className="w-5 h-5 text-red-500 mt-0.5" />
        <div className="flex-1">
          <p className="font-medium text-red-800">Transaction Failed</p>
          <p className="text-sm text-red-600 mt-1">{error}</p>

          <div className="flex gap-2 mt-3">
            {canRetry && (
              <button
                onClick={onRetry}
                className="px-3 py-1.5 bg-red-100 text-red-700 rounded text-sm"
              >
                Retry ({retryCount}/{maxRetries})
              </button>
            )}
            <button
              onClick={onReset}
              className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-sm"
            >
              Start Over
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## Best Practices

### 1. Clear Visual Feedback

```tsx
// Always show what's happening
{state.status === 'awaiting_signature' && (
  <p>Check your wallet to approve the transaction</p>
)}
```

### 2. Allow Cancellation When Possible

```tsx
// Let users cancel during waiting states
{state.status === 'awaiting_signature' && (
  <button onClick={reset}>Cancel</button>
)}
```

### 3. Disable Form During Transaction

```tsx
// Prevent double-submissions
<input disabled={isLoading} />
<button disabled={isLoading}>Submit</button>
```

### 4. Provide Explorer Links Early

```tsx
// Show link as soon as signature is available
{state.status === 'confirming' && (
  <a href={getExplorerUrl('tx', state.signature)}>
    View transaction
  </a>
)}
```

### 5. Handle All Error Cases

```tsx
// Different errors need different handling
if (error.includes('User rejected')) {
  // User cancelled - just reset
  reset();
} else if (error.includes('insufficient funds')) {
  // Permanent error - show message
  showError('Not enough SOL');
} else {
  // Transient error - allow retry
  allowRetry();
}
```

---

## External Resources

- [XState for State Machines](https://xstate.js.org/)
- [React Hook Form](https://react-hook-form.com/)
- [Framer Motion for Animations](https://www.framer.com/motion/)
