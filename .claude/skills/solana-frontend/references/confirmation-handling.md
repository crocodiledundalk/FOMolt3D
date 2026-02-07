# Transaction Confirmation Handling

Patterns for awaiting transaction confirmations, choosing commitment levels, and implementing reliable confirmation strategies.

## Table of Contents

1. [Commitment Levels](#commitment-levels)
2. [Confirmation Strategies](#confirmation-strategies)
3. [WebSocket Confirmations](#websocket-confirmations)
4. [Polling Confirmations](#polling-confirmations)
5. [Timeout Handling](#timeout-handling)
6. [Implementation Patterns](#implementation-patterns)

---

## Commitment Levels

### Understanding Commitments

| Level | Description | Time | Rollback Risk | Use Case |
|-------|-------------|------|---------------|----------|
| `processed` | Executed by leader | ~400ms | High | Fast UX, non-critical |
| `confirmed` | 66%+ stake voted | 1-2s | Very low | Most transactions |
| `finalized` | 31+ confirmations | 5-6s | None | High-value, critical |

### Choosing the Right Level

```tsx
// Decision matrix
function getRecommendedCommitment(transactionType: string): Commitment {
  switch (transactionType) {
    // Fast confirmation OK
    case 'view-only-action':
    case 'low-value-transfer':
    case 'game-action':
      return 'processed';

    // Standard - balance of speed and safety
    case 'token-transfer':
    case 'swap':
    case 'stake':
    case 'nft-purchase':
      return 'confirmed';

    // Maximum safety required
    case 'large-transfer':
    case 'program-upgrade':
    case 'authority-change':
    case 'multisig-execution':
      return 'finalized';

    default:
      return 'confirmed';
  }
}
```

---

## Confirmation Strategies

### Basic Confirmation

```tsx
import { Connection, Transaction, Commitment } from '@solana/web3.js';

async function confirmTransaction(
  connection: Connection,
  signature: string,
  blockhash: string,
  lastValidBlockHeight: number,
  commitment: Commitment = 'confirmed'
): Promise<void> {
  const confirmation = await connection.confirmTransaction(
    {
      signature,
      blockhash,
      lastValidBlockHeight,
    },
    commitment
  );

  if (confirmation.value.err) {
    throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
  }
}
```

### Confirmation with Status Updates

```tsx
interface ConfirmationProgress {
  status: 'pending' | 'processed' | 'confirmed' | 'finalized' | 'failed';
  confirmations?: number;
  error?: string;
}

async function confirmWithProgress(
  connection: Connection,
  signature: string,
  targetCommitment: Commitment,
  onProgress: (progress: ConfirmationProgress) => void
): Promise<void> {
  onProgress({ status: 'pending' });

  // Subscribe to signature status
  const subscriptionId = connection.onSignature(
    signature,
    (result, context) => {
      if (result.err) {
        onProgress({ status: 'failed', error: JSON.stringify(result.err) });
      } else {
        onProgress({ status: 'processed' });
      }
    },
    'processed'
  );

  try {
    // Wait for target commitment
    const status = await connection.getSignatureStatus(signature, {
      searchTransactionHistory: true,
    });

    if (status.value?.err) {
      onProgress({ status: 'failed', error: JSON.stringify(status.value.err) });
      throw new Error('Transaction failed');
    }

    // Poll until target commitment reached
    let attempts = 0;
    const maxAttempts = 60;

    while (attempts < maxAttempts) {
      const currentStatus = await connection.getSignatureStatus(signature);

      if (currentStatus.value?.confirmationStatus === targetCommitment) {
        onProgress({
          status: targetCommitment as any,
          confirmations: currentStatus.value.confirmations ?? 0,
        });
        return;
      }

      if (currentStatus.value?.confirmationStatus) {
        onProgress({
          status: currentStatus.value.confirmationStatus as any,
          confirmations: currentStatus.value.confirmations ?? 0,
        });
      }

      await new Promise((r) => setTimeout(r, 500));
      attempts++;
    }

    throw new Error('Confirmation timeout');
  } finally {
    connection.removeSignatureListener(subscriptionId);
  }
}
```

---

## WebSocket Confirmations

### Signature Subscription

```tsx
// hooks/useTransactionConfirmation.ts
import { useEffect, useState, useCallback } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { Commitment } from '@solana/web3.js';

interface ConfirmationState {
  status: 'pending' | 'processed' | 'confirmed' | 'finalized' | 'error';
  error?: string;
  slot?: number;
}

export function useTransactionConfirmation(
  signature: string | null,
  targetCommitment: Commitment = 'confirmed'
) {
  const { connection } = useConnection();
  const [state, setState] = useState<ConfirmationState>({ status: 'pending' });

  useEffect(() => {
    if (!signature) {
      setState({ status: 'pending' });
      return;
    }

    let subscriptionId: number | undefined;
    let timeoutId: NodeJS.Timeout | undefined;
    let isCancelled = false;

    const subscribe = async () => {
      // Set up WebSocket subscription
      subscriptionId = connection.onSignature(
        signature,
        (result, context) => {
          if (isCancelled) return;

          if (result.err) {
            setState({
              status: 'error',
              error: JSON.stringify(result.err),
              slot: context.slot,
            });
          } else {
            // Processed - continue waiting for target
            setState({ status: 'processed', slot: context.slot });

            // If target is processed, we're done
            if (targetCommitment === 'processed') {
              return;
            }

            // Otherwise poll for higher commitment
            pollForCommitment();
          }
        },
        targetCommitment
      );

      // Timeout after 2 minutes
      timeoutId = setTimeout(() => {
        if (!isCancelled) {
          setState({ status: 'error', error: 'Confirmation timeout' });
        }
      }, 120000);
    };

    const pollForCommitment = async () => {
      const maxPolls = 60;
      for (let i = 0; i < maxPolls; i++) {
        if (isCancelled) return;

        const status = await connection.getSignatureStatus(signature);

        if (status.value?.confirmationStatus === targetCommitment) {
          setState({
            status: targetCommitment as any,
            slot: status.context.slot,
          });
          return;
        }

        if (status.value?.err) {
          setState({
            status: 'error',
            error: JSON.stringify(status.value.err),
          });
          return;
        }

        await new Promise((r) => setTimeout(r, 1000));
      }
    };

    subscribe();

    return () => {
      isCancelled = true;
      if (subscriptionId !== undefined) {
        connection.removeSignatureListener(subscriptionId);
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [connection, signature, targetCommitment]);

  return state;
}
```

### Account Change Subscription for Confirmation

```tsx
// Alternative: Watch for account state change
export function useAccountChangeConfirmation(
  address: PublicKey | null,
  expectedChange: (data: AccountInfo<Buffer>) => boolean,
  timeout: number = 30000
): { isConfirmed: boolean; error: string | null } {
  const { connection } = useConnection();
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) return;

    let subscriptionId: number;
    let timeoutId: NodeJS.Timeout;

    subscriptionId = connection.onAccountChange(
      address,
      (accountInfo) => {
        if (expectedChange(accountInfo)) {
          setIsConfirmed(true);
          clearTimeout(timeoutId);
          connection.removeAccountChangeListener(subscriptionId);
        }
      },
      'confirmed'
    );

    timeoutId = setTimeout(() => {
      setError('Confirmation timeout');
      connection.removeAccountChangeListener(subscriptionId);
    }, timeout);

    return () => {
      connection.removeAccountChangeListener(subscriptionId);
      clearTimeout(timeoutId);
    };
  }, [connection, address, expectedChange, timeout]);

  return { isConfirmed, error };
}
```

---

## Polling Confirmations

### Status Polling Hook

```tsx
// hooks/usePollingConfirmation.ts
import { useQuery } from '@tanstack/react-query';
import { useConnection } from '@solana/wallet-adapter-react';
import { Commitment } from '@solana/web3.js';

export function usePollingConfirmation(
  signature: string | null,
  targetCommitment: Commitment = 'confirmed'
) {
  const { connection } = useConnection();

  return useQuery({
    queryKey: ['txConfirmation', signature],
    queryFn: async () => {
      if (!signature) throw new Error('No signature');

      const status = await connection.getSignatureStatus(signature, {
        searchTransactionHistory: true,
      });

      return {
        status: status.value?.confirmationStatus ?? 'pending',
        confirmations: status.value?.confirmations ?? 0,
        error: status.value?.err,
        slot: status.context.slot,
      };
    },
    enabled: !!signature,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 500;

      // Stop polling once target reached
      if (data.status === targetCommitment || data.status === 'finalized') {
        return false;
      }

      // Stop on error
      if (data.error) {
        return false;
      }

      // Continue polling
      return 1000;
    },
  });
}
```

### Batch Confirmation Polling

```tsx
// hooks/useBatchConfirmation.ts
export function useBatchConfirmation(
  signatures: string[],
  targetCommitment: Commitment = 'confirmed'
) {
  const { connection } = useConnection();

  return useQuery({
    queryKey: ['batchTxConfirmation', signatures],
    queryFn: async () => {
      const statuses = await connection.getSignatureStatuses(signatures);

      return signatures.map((sig, i) => ({
        signature: sig,
        status: statuses.value[i]?.confirmationStatus ?? 'pending',
        confirmations: statuses.value[i]?.confirmations ?? 0,
        error: statuses.value[i]?.err,
      }));
    },
    enabled: signatures.length > 0,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 500;

      // Check if all reached target
      const allConfirmed = data.every(
        (tx) =>
          tx.status === targetCommitment ||
          tx.status === 'finalized' ||
          tx.error
      );

      return allConfirmed ? false : 1000;
    },
  });
}
```

---

## Timeout Handling

### Configurable Timeout

```tsx
// lib/confirmation.ts
interface ConfirmationOptions {
  commitment?: Commitment;
  timeout?: number;
  onProgress?: (status: string) => void;
}

export async function confirmWithTimeout(
  connection: Connection,
  signature: string,
  blockhash: string,
  lastValidBlockHeight: number,
  options: ConfirmationOptions = {}
): Promise<void> {
  const { commitment = 'confirmed', timeout = 60000 } = options;

  const confirmPromise = connection.confirmTransaction(
    { signature, blockhash, lastValidBlockHeight },
    commitment
  );

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Confirmation timeout')), timeout);
  });

  const result = await Promise.race([confirmPromise, timeoutPromise]);

  if (result.value.err) {
    throw new Error(`Transaction failed: ${JSON.stringify(result.value.err)}`);
  }
}
```

### Block Height Based Timeout

```tsx
export async function confirmWithBlockHeightCheck(
  connection: Connection,
  signature: string,
  blockhash: string,
  lastValidBlockHeight: number,
  commitment: Commitment = 'confirmed'
): Promise<void> {
  const startTime = Date.now();
  const maxWaitTime = 90000; // 90 seconds max

  while (Date.now() - startTime < maxWaitTime) {
    // Check current block height
    const currentBlockHeight = await connection.getBlockHeight();

    if (currentBlockHeight > lastValidBlockHeight) {
      throw new Error('Transaction expired - block height exceeded');
    }

    // Check signature status
    const status = await connection.getSignatureStatus(signature);

    if (status.value?.err) {
      throw new Error(`Transaction failed: ${JSON.stringify(status.value.err)}`);
    }

    if (status.value?.confirmationStatus === commitment) {
      return;
    }

    if (commitment === 'confirmed' && status.value?.confirmationStatus === 'finalized') {
      return;
    }

    await new Promise((r) => setTimeout(r, 500));
  }

  throw new Error('Confirmation timeout');
}
```

---

## Implementation Patterns

### Complete Transaction Hook

```tsx
// hooks/useConfirmedTransaction.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Transaction, TransactionInstruction, Commitment } from '@solana/web3.js';
import { toast } from 'sonner';

interface ConfirmedTransactionOptions {
  commitment?: Commitment;
  onConfirming?: (signature: string) => void;
  onConfirmed?: (signature: string) => void;
  onError?: (error: Error) => void;
  invalidateKeys?: string[][];
  skipStateRefresh?: boolean;
}

export function useConfirmedTransaction(options: ConfirmedTransactionOptions = {}) {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();
  const queryClient = useQueryClient();

  const { commitment = 'confirmed' } = options;

  return useMutation({
    mutationFn: async (instructions: TransactionInstruction[]) => {
      if (!publicKey || !signTransaction) {
        throw new Error('Wallet not connected');
      }

      // Get blockhash
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash(commitment);

      // Build transaction
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
        preflightCommitment: commitment,
      });

      // Notify confirming
      options.onConfirming?.(signature);

      // Show pending toast
      const toastId = toast.loading('Transaction pending...', {
        description: `Waiting for ${commitment} confirmation`,
      });

      try {
        // Confirm with same commitment
        await connection.confirmTransaction(
          { signature, blockhash, lastValidBlockHeight },
          commitment
        );

        toast.success('Transaction confirmed', {
          id: toastId,
          action: {
            label: 'View',
            onClick: () => window.open(`https://solscan.io/tx/${signature}`, '_blank'),
          },
        });

        return signature;
      } catch (error) {
        toast.error('Transaction failed', { id: toastId });
        throw error;
      }
    },
    onSuccess: async (signature) => {
      options.onConfirmed?.(signature);

      // Invalidate queries after confirmation
      // Add small delay to ensure RPC reflects new state
      if (!options.skipStateRefresh) {
        await new Promise((r) => setTimeout(r, 500));

        options.invalidateKeys?.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: key });
        });
      }
    },
    onError: (error) => {
      options.onError?.(error as Error);
    },
  });
}
```

### Confirmation Status Component

```tsx
// components/ConfirmationStatus.tsx
import { useTransactionConfirmation } from '@/hooks/useTransactionConfirmation';

interface ConfirmationStatusProps {
  signature: string;
  targetCommitment?: Commitment;
  onConfirmed?: () => void;
}

export function ConfirmationStatus({
  signature,
  targetCommitment = 'confirmed',
  onConfirmed,
}: ConfirmationStatusProps) {
  const { status, error, slot } = useTransactionConfirmation(
    signature,
    targetCommitment
  );

  useEffect(() => {
    if (status === targetCommitment || status === 'finalized') {
      onConfirmed?.();
    }
  }, [status, targetCommitment, onConfirmed]);

  const getStatusColor = () => {
    switch (status) {
      case 'pending':
        return 'text-gray-400';
      case 'processed':
        return 'text-yellow-500';
      case 'confirmed':
        return 'text-blue-500';
      case 'finalized':
        return 'text-green-500';
      case 'error':
        return 'text-red-500';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="flex items-center gap-2">
      {status === 'pending' && <Spinner className="w-4 h-4" />}

      <span className={getStatusColor()}>
        {status === 'pending' && 'Pending...'}
        {status === 'processed' && 'Processed'}
        {status === 'confirmed' && 'Confirmed'}
        {status === 'finalized' && 'Finalized'}
        {status === 'error' && `Failed: ${error}`}
      </span>

      {slot && <span className="text-xs text-gray-400">Slot: {slot}</span>}
    </div>
  );
}
```

---

## Best Practices

### 1. Match Commitment for Sending and State Refresh

```tsx
// If you send with 'processed', query state with 'processed'
const COMMITMENT: Commitment = 'confirmed';

// Send
await connection.confirmTransaction(sig, COMMITMENT);

// Refresh state with same commitment
const balance = await connection.getBalance(pk, COMMITMENT);
```

### 2. Use Block Height for Expiration

```tsx
// Always check lastValidBlockHeight
const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

// Confirm with height
await connection.confirmTransaction({
  signature,
  blockhash,
  lastValidBlockHeight, // Ensures proper expiration handling
});
```

### 3. Provide User Feedback

```tsx
// Always show status during confirmation
toast.loading('Confirming...');

// Update on success/failure
toast.success('Confirmed!');
// or
toast.error('Failed');
```

### 4. Handle Rollback Risk

```tsx
// For 'processed' commitment
if (commitment === 'processed') {
  toast.info('Transaction processed - may still be reverted', {
    description: 'Wait for confirmation for certainty',
  });
}
```

---

## External Resources

- [Solana Commitment Levels](https://solana.com/docs/rpc#configuring-state-commitment)
- [Transaction Confirmation](https://solana.com/docs/advanced/confirmation)
- [Signature Subscriptions](https://solana.com/docs/rpc/websocket/signaturesubscribe)
