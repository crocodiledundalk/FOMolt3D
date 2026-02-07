# Transaction Error Handling

Comprehensive patterns for parsing, handling, and displaying Solana transaction errors. Covers simulation errors, execution failures, and user-friendly messaging.

## Table of Contents

1. [Error Types](#error-types)
2. [Parsing Transaction Errors](#parsing-transaction-errors)
3. [Program Error Mapping](#program-error-mapping)
4. [User-Friendly Messages](#user-friendly-messages)
5. [Error Recovery Patterns](#error-recovery-patterns)
6. [Implementation](#implementation)

---

## Error Types

### Categories of Transaction Errors

| Category | When It Occurs | Example |
|----------|----------------|---------|
| Wallet Rejection | User declines signing | "User rejected the request" |
| Simulation Failure | Pre-flight check fails | InsufficientFunds, InvalidAccountData |
| Network Error | RPC/connection issues | Timeout, 429 rate limit |
| Execution Failure | Transaction fails on-chain | Custom program error |
| Confirmation Timeout | Transaction not confirmed | Block height exceeded |

### Error Structure

```tsx
// Solana transaction error structure
interface TransactionError {
  // Standard RPC error
  message?: string;
  code?: number;

  // Simulation result
  logs?: string[];
  unitsConsumed?: number;

  // Instruction-level error
  InstructionError?: [
    number, // Instruction index
    { Custom: number } | string // Error type
  ];
}
```

---

## Parsing Transaction Errors

### Comprehensive Error Parser

```tsx
// lib/errorParser.ts
import { PublicKey } from '@solana/web3.js';

export interface ParsedTransactionError {
  type: 'wallet' | 'simulation' | 'network' | 'execution' | 'timeout' | 'unknown';
  message: string;
  details?: string;
  programId?: string;
  errorCode?: number;
  logs?: string[];
  recoverable: boolean;
  suggestedAction?: string;
}

export function parseTransactionError(error: unknown): ParsedTransactionError {
  // Handle null/undefined
  if (!error) {
    return {
      type: 'unknown',
      message: 'An unknown error occurred',
      recoverable: true,
    };
  }

  const errorMessage = error instanceof Error
    ? error.message
    : typeof error === 'string'
      ? error
      : JSON.stringify(error);

  // Wallet rejection
  if (isWalletRejection(errorMessage)) {
    return {
      type: 'wallet',
      message: 'Transaction cancelled',
      details: 'You declined the transaction request',
      recoverable: true,
      suggestedAction: 'Try again when ready',
    };
  }

  // Network errors
  if (isNetworkError(errorMessage)) {
    return parseNetworkError(errorMessage);
  }

  // Timeout errors
  if (isTimeoutError(errorMessage)) {
    return {
      type: 'timeout',
      message: 'Transaction confirmation timeout',
      details: 'The transaction may have succeeded but confirmation took too long',
      recoverable: true,
      suggestedAction: 'Check your wallet or explorer for the transaction status',
    };
  }

  // Simulation/execution errors
  const parsedError = parseInstructionError(error);
  if (parsedError) {
    return parsedError;
  }

  // Fallback
  return {
    type: 'unknown',
    message: 'Transaction failed',
    details: errorMessage.slice(0, 200),
    recoverable: true,
  };
}

function isWalletRejection(message: string): boolean {
  const rejectionPhrases = [
    'user rejected',
    'user denied',
    'user cancelled',
    'user canceled',
    'rejected the request',
    'transaction was rejected',
    'declined',
  ];
  return rejectionPhrases.some((phrase) =>
    message.toLowerCase().includes(phrase)
  );
}

function isNetworkError(message: string): boolean {
  const networkPhrases = [
    '429',
    'rate limit',
    'timeout',
    'econnrefused',
    'network error',
    'failed to fetch',
    'connection refused',
    'socket hang up',
  ];
  return networkPhrases.some((phrase) =>
    message.toLowerCase().includes(phrase)
  );
}

function parseNetworkError(message: string): ParsedTransactionError {
  if (message.includes('429') || message.toLowerCase().includes('rate limit')) {
    return {
      type: 'network',
      message: 'RPC rate limit reached',
      details: 'Too many requests to the RPC endpoint',
      recoverable: true,
      suggestedAction: 'Please wait a moment and try again',
    };
  }

  return {
    type: 'network',
    message: 'Network error',
    details: 'Could not connect to the Solana network',
    recoverable: true,
    suggestedAction: 'Check your internet connection and try again',
  };
}

function isTimeoutError(message: string): boolean {
  return (
    message.toLowerCase().includes('timeout') ||
    message.includes('block height exceeded') ||
    message.includes('blockhash not found')
  );
}
```

### Instruction Error Parser

```tsx
// lib/instructionErrorParser.ts
interface InstructionErrorData {
  err: any;
  logs?: string[];
}

function parseInstructionError(error: unknown): ParsedTransactionError | null {
  const errorObj = error as any;

  // Extract error data from various sources
  let instructionError = null;
  let logs: string[] = [];

  // From simulation result
  if (errorObj?.value?.err) {
    instructionError = errorObj.value.err;
    logs = errorObj.value.logs || [];
  }

  // From SendTransactionError
  if (errorObj?.logs) {
    logs = errorObj.logs;
  }

  // From error.InstructionError
  if (errorObj?.InstructionError) {
    instructionError = { InstructionError: errorObj.InstructionError };
  }

  // Parse InstructionError format
  if (instructionError?.InstructionError) {
    const [instructionIndex, errorType] = instructionError.InstructionError;

    // Custom program error
    if (typeof errorType === 'object' && 'Custom' in errorType) {
      return parseCustomProgramError(errorType.Custom, logs, instructionIndex);
    }

    // Built-in error
    return parseBuiltInError(errorType, logs, instructionIndex);
  }

  // Parse from logs
  if (logs.length > 0) {
    return parseErrorFromLogs(logs);
  }

  return null;
}

function parseCustomProgramError(
  errorCode: number,
  logs: string[],
  instructionIndex: number
): ParsedTransactionError {
  // Extract program ID from logs
  const programId = extractProgramIdFromLogs(logs, instructionIndex);

  // Try to match against known programs
  const knownError = getKnownProgramError(programId, errorCode);

  if (knownError) {
    return {
      type: 'execution',
      message: knownError.message,
      details: knownError.details,
      programId,
      errorCode,
      logs,
      recoverable: knownError.recoverable,
      suggestedAction: knownError.suggestedAction,
    };
  }

  return {
    type: 'execution',
    message: `Program error (code: ${errorCode})`,
    details: `Instruction ${instructionIndex} failed with custom error ${errorCode}`,
    programId,
    errorCode,
    logs,
    recoverable: true,
  };
}

function extractProgramIdFromLogs(logs: string[], targetIndex: number): string | undefined {
  // Look for "Program <id> invoke [<depth>]" patterns
  let currentIndex = -1;

  for (const log of logs) {
    const invokeMatch = log.match(/Program (\w+) invoke \[1\]/);
    if (invokeMatch) {
      currentIndex++;
      if (currentIndex === targetIndex) {
        return invokeMatch[1];
      }
    }
  }

  return undefined;
}
```

---

## Program Error Mapping

### Known Program Errors

```tsx
// lib/programErrors.ts
interface KnownError {
  message: string;
  details?: string;
  recoverable: boolean;
  suggestedAction?: string;
}

// System Program errors
const SYSTEM_PROGRAM_ERRORS: Record<number, KnownError> = {
  0: {
    message: 'Account already in use',
    recoverable: false,
  },
  1: {
    message: 'Insufficient funds',
    details: 'Not enough SOL to complete this transaction',
    recoverable: true,
    suggestedAction: 'Add more SOL to your wallet',
  },
  2: {
    message: 'Invalid account data',
    recoverable: false,
  },
  3: {
    message: 'Account data too small',
    recoverable: false,
  },
  4: {
    message: 'Incorrect program ID',
    recoverable: false,
  },
  5: {
    message: 'Missing required signature',
    recoverable: true,
    suggestedAction: 'Ensure you signed the transaction correctly',
  },
};

// Token Program errors
const TOKEN_PROGRAM_ERRORS: Record<number, KnownError> = {
  0: {
    message: 'Token account not found',
    recoverable: true,
    suggestedAction: 'The token account may need to be created first',
  },
  1: {
    message: 'Insufficient token balance',
    details: 'You do not have enough tokens for this transfer',
    recoverable: true,
    suggestedAction: 'Reduce the amount or add more tokens',
  },
  2: {
    message: 'Invalid mint',
    recoverable: false,
  },
  3: {
    message: 'Account owner mismatch',
    recoverable: false,
  },
  4: {
    message: 'Invalid instruction',
    recoverable: false,
  },
  5: {
    message: 'Fixed supply',
    details: 'Cannot mint more tokens - supply is fixed',
    recoverable: false,
  },
  6: {
    message: 'Account already initialized',
    recoverable: false,
  },
  7: {
    message: 'Account frozen',
    details: 'This token account has been frozen',
    recoverable: false,
  },
};

// Anchor common errors (6000+)
const ANCHOR_ERRORS: Record<number, KnownError> = {
  6000: {
    message: 'Constraint violation',
    details: 'An account constraint was not satisfied',
    recoverable: false,
  },
  6001: {
    message: 'Unauthorized',
    details: 'You are not authorized to perform this action',
    recoverable: false,
  },
  6002: {
    message: 'Account not initialized',
    recoverable: true,
    suggestedAction: 'Initialize the account first',
  },
  6003: {
    message: 'Account already initialized',
    recoverable: false,
  },
  6004: {
    message: 'Invalid account',
    recoverable: false,
  },
  6005: {
    message: 'Invalid program ID',
    recoverable: false,
  },
  6006: {
    message: 'Overflow',
    details: 'A mathematical overflow occurred',
    recoverable: true,
    suggestedAction: 'Try with a smaller amount',
  },
};

// Program ID to error map lookup
const PROGRAM_ERRORS: Record<string, Record<number, KnownError>> = {
  '11111111111111111111111111111111': SYSTEM_PROGRAM_ERRORS,
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA': TOKEN_PROGRAM_ERRORS,
  'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb': TOKEN_PROGRAM_ERRORS,
};

export function getKnownProgramError(
  programId: string | undefined,
  errorCode: number
): KnownError | null {
  // Check Anchor range
  if (errorCode >= 6000 && errorCode < 7000) {
    return ANCHOR_ERRORS[errorCode] || null;
  }

  // Check program-specific errors
  if (programId && PROGRAM_ERRORS[programId]) {
    return PROGRAM_ERRORS[programId][errorCode] || null;
  }

  return null;
}
```

### Custom Program Error Registration

```tsx
// lib/customErrors.ts
interface CustomProgramErrors {
  programId: string;
  errors: Record<number, KnownError>;
}

const customProgramErrors: CustomProgramErrors[] = [];

export function registerProgramErrors(config: CustomProgramErrors) {
  customProgramErrors.push(config);
}

// Register your program's errors
registerProgramErrors({
  programId: 'YourProgram111111111111111111111111111111',
  errors: {
    6100: {
      message: 'Pool is paused',
      details: 'Trading is temporarily suspended',
      recoverable: false,
    },
    6101: {
      message: 'Slippage exceeded',
      details: 'Price moved too much during transaction',
      recoverable: true,
      suggestedAction: 'Increase slippage tolerance or try again',
    },
    6102: {
      message: 'Insufficient liquidity',
      details: 'Not enough liquidity for this trade size',
      recoverable: true,
      suggestedAction: 'Try a smaller amount',
    },
  },
});
```

---

## User-Friendly Messages

### Error Display Component

```tsx
// components/TransactionError.tsx
import { ParsedTransactionError } from '@/lib/errorParser';

interface TransactionErrorProps {
  error: ParsedTransactionError;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export function TransactionError({
  error,
  onRetry,
  onDismiss,
}: TransactionErrorProps) {
  const getIcon = () => {
    switch (error.type) {
      case 'wallet':
        return '🚫';
      case 'network':
        return '📡';
      case 'timeout':
        return '⏱️';
      case 'execution':
        return '❌';
      default:
        return '⚠️';
    }
  };

  const getColor = () => {
    switch (error.type) {
      case 'wallet':
        return 'bg-gray-100 border-gray-300';
      case 'network':
        return 'bg-yellow-50 border-yellow-300';
      case 'timeout':
        return 'bg-orange-50 border-orange-300';
      default:
        return 'bg-red-50 border-red-300';
    }
  };

  return (
    <div className={`rounded-lg border p-4 ${getColor()}`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl">{getIcon()}</span>

        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{error.message}</h3>

          {error.details && (
            <p className="mt-1 text-sm text-gray-600">{error.details}</p>
          )}

          {error.suggestedAction && (
            <p className="mt-2 text-sm font-medium text-blue-600">
              💡 {error.suggestedAction}
            </p>
          )}

          {error.errorCode !== undefined && (
            <p className="mt-2 text-xs text-gray-400">
              Error code: {error.errorCode}
            </p>
          )}
        </div>

        <button
          onClick={onDismiss}
          className="text-gray-400 hover:text-gray-600"
        >
          ×
        </button>
      </div>

      {error.recoverable && onRetry && (
        <div className="mt-3 flex justify-end">
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
```

### Toast Integration

```tsx
// lib/errorToast.ts
import { toast } from 'sonner';
import { parseTransactionError } from './errorParser';

export function showTransactionError(error: unknown, options?: { onRetry?: () => void }) {
  const parsed = parseTransactionError(error);

  if (parsed.type === 'wallet') {
    // User cancelled - just info, not error
    toast.info(parsed.message);
    return;
  }

  toast.error(parsed.message, {
    description: parsed.details,
    action: parsed.recoverable && options?.onRetry
      ? {
          label: 'Retry',
          onClick: options.onRetry,
        }
      : undefined,
    duration: parsed.type === 'network' ? 5000 : 8000,
  });
}
```

---

## Error Recovery Patterns

### Automatic Retry Hook

```tsx
// hooks/useTransactionWithRetry.ts
import { useMutation } from '@tanstack/react-query';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Transaction, TransactionInstruction } from '@solana/web3.js';
import { parseTransactionError } from '@/lib/errorParser';

interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  shouldRetry?: (error: ParsedTransactionError, attempt: number) => boolean;
}

export function useTransactionWithRetry(options: RetryOptions = {}) {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();

  const { maxRetries = 3, retryDelay = 1000 } = options;

  const defaultShouldRetry = (error: ParsedTransactionError, attempt: number) => {
    // Only retry network and timeout errors
    if (error.type === 'network' || error.type === 'timeout') {
      return attempt < maxRetries;
    }
    return false;
  };

  const shouldRetry = options.shouldRetry || defaultShouldRetry;

  return useMutation({
    mutationFn: async (instructions: TransactionInstruction[]) => {
      let lastError: Error | null = null;
      let attempt = 0;

      while (attempt <= maxRetries) {
        try {
          if (!publicKey || !signTransaction) {
            throw new Error('Wallet not connected');
          }

          const { blockhash, lastValidBlockHeight } =
            await connection.getLatestBlockhash('confirmed');

          const transaction = new Transaction({
            feePayer: publicKey,
            blockhash,
            lastValidBlockHeight,
          });
          instructions.forEach((ix) => transaction.add(ix));

          const signed = await signTransaction(transaction);
          const signature = await connection.sendRawTransaction(signed.serialize());

          await connection.confirmTransaction({
            signature,
            blockhash,
            lastValidBlockHeight,
          });

          return signature;
        } catch (error) {
          lastError = error as Error;
          const parsed = parseTransactionError(error);

          if (!shouldRetry(parsed, attempt)) {
            throw error;
          }

          attempt++;
          await new Promise((r) => setTimeout(r, retryDelay * attempt));
        }
      }

      throw lastError;
    },
  });
}
```

### Blockhash Refresh on Timeout

```tsx
// hooks/useTransactionWithBlockhashRefresh.ts
export function useTransactionWithBlockhashRefresh() {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();

  return useMutation({
    mutationFn: async (buildTransaction: (blockhash: string) => Transaction) => {
      const maxAttempts = 3;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          // Always get fresh blockhash
          const { blockhash, lastValidBlockHeight } =
            await connection.getLatestBlockhash('confirmed');

          // Build transaction with fresh blockhash
          const transaction = buildTransaction(blockhash);
          transaction.recentBlockhash = blockhash;
          transaction.lastValidBlockHeight = lastValidBlockHeight;

          const signed = await signTransaction(transaction);
          const signature = await connection.sendRawTransaction(signed.serialize());

          await connection.confirmTransaction({
            signature,
            blockhash,
            lastValidBlockHeight,
          });

          return signature;
        } catch (error) {
          const parsed = parseTransactionError(error);

          // Only retry on blockhash expired
          if (
            parsed.type === 'timeout' ||
            parsed.message.includes('blockhash')
          ) {
            if (attempt < maxAttempts - 1) {
              console.log('Blockhash expired, retrying with fresh blockhash...');
              continue;
            }
          }

          throw error;
        }
      }

      throw new Error('Transaction failed after max retries');
    },
  });
}
```

---

## Implementation

### Complete Error Handling Hook

```tsx
// hooks/useTransaction.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Transaction, TransactionInstruction } from '@solana/web3.js';
import { parseTransactionError, showTransactionError } from '@/lib/errorParser';
import { toast } from 'sonner';

interface UseTransactionOptions {
  onSuccess?: (signature: string) => void;
  onError?: (error: ParsedTransactionError) => void;
  invalidateKeys?: string[][];
  showErrorToast?: boolean;
}

export function useTransaction(options: UseTransactionOptions = {}) {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (instructions: TransactionInstruction[]) => {
      if (!publicKey || !signTransaction) {
        throw new Error('Wallet not connected');
      }

      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash('confirmed');

      const transaction = new Transaction({
        feePayer: publicKey,
        blockhash,
        lastValidBlockHeight,
      });
      instructions.forEach((ix) => transaction.add(ix));

      // Sign
      const signed = await signTransaction(transaction);

      // Send
      const signature = await connection.sendRawTransaction(signed.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });

      // Confirm
      await connection.confirmTransaction(
        { signature, blockhash, lastValidBlockHeight },
        'confirmed'
      );

      return signature;
    },
    onSuccess: (signature) => {
      toast.success('Transaction confirmed', {
        action: {
          label: 'View',
          onClick: () => window.open(`https://solscan.io/tx/${signature}`, '_blank'),
        },
      });

      options.invalidateKeys?.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });

      options.onSuccess?.(signature);
    },
    onError: (error) => {
      const parsed = parseTransactionError(error);

      if (options.showErrorToast !== false) {
        showTransactionError(error);
      }

      options.onError?.(parsed);
    },
  });
}
```

---

## Best Practices

1. **Parse all errors** - Never show raw error messages to users
2. **Provide context** - Explain what went wrong and why
3. **Suggest actions** - Tell users what they can do to fix it
4. **Handle wallet rejections gracefully** - It's not an error, just info
5. **Log details** - Keep full error info for debugging
6. **Retry automatically** - For transient network errors
7. **Register custom errors** - Map your program's error codes

---

## External Resources

- [Solana Error Codes](https://solana.com/docs/rpc/http#errors)
- [Anchor Error Types](https://www.anchor-lang.com/docs/errors)
- [Token Program Errors](https://spl.solana.com/token#errors)
